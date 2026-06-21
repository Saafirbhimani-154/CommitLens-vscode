import * as vscode from 'vscode';
import { supabase } from './supabaseClient';
import { exec } from 'child_process';
import * as util from 'util';

const execAsync = util.promisify(exec);

export function activate(context: vscode.ExtensionContext) {
    console.log('CommitLens is active!');

    let openUiDisposable = vscode.commands.registerCommand('commitlens.openUI', async () => {
        const panel = vscode.window.createWebviewPanel(
            'codeReviewUI',
            'CommitLens, AI Code Reviewer',
            vscode.ViewColumn.Two,
            { 
                enableScripts: true,
                retainContextWhenHidden: true,
                localResourceRoots: [vscode.Uri.joinPath(context.extensionUri, 'media')]
            }
        );

        let initialUsername: string | null = null;
        try {
            const session = await vscode.authentication.getSession('github', ['read:user'], { createIfNone: false });
            if (session) {
                initialUsername = session.account.label;
                await supabase.from('users').upsert({
                    github_id: session.account.id,
                    username: session.account.label,
                    last_login_at: new Date().toISOString()
                }, { onConflict: 'github_id' });
            }
        } catch (e) {}

        panel.webview.html = await getWebviewContent(context, panel.webview, initialUsername);

        panel.webview.onDidReceiveMessage(async (message) => {
            switch (message.command) {
                case 'login':
                    try {
                        const session = await vscode.authentication.getSession('github', ['read:user'], { createIfNone: true });
                        if (session) {
                            await supabase.from('users').upsert({
                                github_id: session.account.id,
                                username: session.account.label,
                                last_login_at: new Date().toISOString()
                            }, { onConflict: 'github_id' });
                            panel.webview.postMessage({ command: 'unlockUI', username: session.account.label });
                        }
                    } catch (err) {
                        panel.webview.postMessage({ command: 'updateResult', text: 'Login Failed.', isError: true });
                    }
                    break;
                case 'logout':
                    panel.webview.postMessage({ command: 'lockUI' });
                    break;
                case 'setApiKey':
                    const apiKey = await vscode.window.showInputBox({
                        prompt: 'Enter your API Key',
                        password: true,
                        ignoreFocusOut: true
                    });
                    if (apiKey) {
                        await context.secrets.store('commitlens.apiKey', apiKey);
                        panel.webview.postMessage({ command: 'updateResult', text: '✅ API Key Saved!', isError: false });
                    }
                    break;
                case 'setModelId':
                    const config = vscode.workspace.getConfiguration('commitlens');
                    const currentModel = config.get<string>('modelId') || 'anthropic/claude-3-haiku';
                    const newModel = await vscode.window.showInputBox({
                        prompt: 'Enter your preferred OpenRouter Model ID',
                        value: currentModel,
                        ignoreFocusOut: true
                    });
                    if (newModel && newModel.trim() !== '') {
                        await config.update('modelId', newModel.trim(), vscode.ConfigurationTarget.Global);
                        panel.webview.postMessage({ command: 'updateResult', text: `✅ Model ID successfully saved as: ${newModel.trim()}`, isError: false });
                    }
                    break;
                case 'fetchGitState':
                    const workspaceFolders = vscode.workspace.workspaceFolders;
                    if (workspaceFolders) {
                        let finalState: any = { branch: 'unknown', staged: [], unstaged: [] };
                        for (const folder of workspaceFolders) {
                            const cwd = folder.uri.fsPath;
                            const state = await getGitState(cwd);
                            if (state.staged.length > 0 || state.unstaged.length > 0) {
                                finalState = state;
                                break;
                            }
                            if (finalState.branch === 'unknown' && state.branch !== 'unknown') {
                                finalState = state;
                            }
                        }
                        panel.webview.postMessage({ command: 'updateGitState', state: finalState });
                    }
                    break;
                case 'reviewStaged':
                    await runReview(context, panel, 'staged');
                    break;
                case 'reviewUnstaged':
                    await runReview(context, panel, 'unstaged');
                    break;
            }
        });
    });

    context.subscriptions.push(openUiDisposable);
}



async function getGitState(cwd: string) {
    let branch = 'unknown';
    let staged: any[] = [];
    let unstaged: any[] = [];
    
    try {
        const branchResult = await execAsync('git branch --show-current', { cwd });
        branch = branchResult.stdout.trim();
        
        const parseNumstat = (output: string) => {
            if (!output) return [];
            let files = output.trim().split('\n').map(line => {
                const parts = line.split('\t');
                if (parts.length >= 3) {
                    const additions = parts[0] === '-' ? 0 : parseInt(parts[0], 10);
                    const deletions = parts[1] === '-' ? 0 : parseInt(parts[1], 10);
                    const fullPath = parts[2];
                    const filename = fullPath.split('/').pop() || fullPath;
                    const directory = fullPath.substring(0, fullPath.length - filename.length);
                    return { filename, directory, additions, deletions, fullPath };
                }
                return null;
            }).filter(Boolean) as any[];

            files.sort((a, b) => {
                const dirA = a.directory || '';
                const dirB = b.directory || '';
                if (dirA === dirB) {
                    return a.filename.localeCompare(b.filename);
                }
                if (dirA === '') return -1;
                if (dirB === '') return 1;
                return dirA.localeCompare(dirB);
            });
            return files;
        };
        
        const stagedResult = await execAsync('git diff --cached --numstat', { cwd });
        staged = parseNumstat(stagedResult.stdout);
        
        const unstagedResult = await execAsync('git diff --numstat', { cwd });
        unstaged = parseNumstat(unstagedResult.stdout);
        
        const untrackedResult = await execAsync('git ls-files --others --exclude-standard', { cwd });
        const untrackedFiles = untrackedResult.stdout.trim().split('\n').filter(Boolean);
        for (const file of untrackedFiles) {
            const filename = file.split('/').pop() || file;
            const directory = file.substring(0, file.length - filename.length);
            unstaged.push({ filename, directory, additions: 'U', deletions: 0, fullPath: file });
        }
        
        unstaged.sort((a, b) => {
            const dirA = a.directory || '';
            const dirB = b.directory || '';
            if (dirA === dirB) {
                return a.filename.localeCompare(b.filename);
            }
            if (dirA === '') return -1;
            if (dirB === '') return 1;
            return dirA.localeCompare(dirB);
        });
        
    } catch (e) {
        console.error('Git stat error', e);
    }
    
    return { branch, staged, unstaged };
}

async function runReview(context: vscode.ExtensionContext, panel: vscode.WebviewPanel, type: 'staged' | 'unstaged') {
    const skillFilename = 'Skill.md';
    const apiKey = await context.secrets.get('commitlens.apiKey');
    if (!apiKey) {
        panel.webview.postMessage({ command: 'updateResult', text: 'Error: API Key not set. Please set it first.', isError: true });
        return;
    }

    const config = vscode.workspace.getConfiguration('commitlens');
    let modelId = config.get<string>('modelId') || 'anthropic/claude-3-haiku';

    panel.webview.postMessage({ command: 'updateResult', text: `Fetching ${type} changes...`, isError: false });

    try {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders) {
            panel.webview.postMessage({ command: 'updateResult', text: 'Error: No workspace folder open.', isError: true });
            return;
        }
        let cwd = workspaceFolders[0].uri.fsPath;
        for (const folder of workspaceFolders) {
            const state = await getGitState(folder.uri.fsPath);
            if ((type === 'staged' && state.staged.length > 0) || (type === 'unstaged' && state.unstaged.length > 0)) {
                cwd = folder.uri.fsPath;
                break;
            }
        }
        const gitCmd = type === 'staged' ? 'git diff --cached' : 'git diff';
        
        const { stdout, stderr } = await execAsync(gitCmd, { cwd });
        
        let diffText = stdout.split('\n').filter((line: string) => !line.startsWith('-') || line.startsWith('---')).join('\n');
        
        if (type === 'unstaged') {
            const untrackedResult = await execAsync('git ls-files --others --exclude-standard', { cwd });
            const untrackedFiles = untrackedResult.stdout.trim().split('\n').filter(Boolean);
            for (const file of untrackedFiles) {
                try {
                    const fileUri = vscode.Uri.joinPath(workspaceFolders[0].uri, file);
                    const content = await vscode.workspace.fs.readFile(fileUri);
                    const fileStr = Buffer.from(content).toString('utf8');
                    diffText += `\n\n--- /dev/null\n+++ b/${file}\n@@ -0,0 +1,${fileStr.split('\n').length} @@\n`;
                    diffText += fileStr.split('\n').map(l => '+' + l).join('\n');
                } catch (e) {}
            }
        }

        if (!diffText || diffText.trim() === '') {
            panel.webview.postMessage({ command: 'updateResult', text: `No ${type} changes found to review.`, isError: false });
            return;
        }

        panel.webview.postMessage({ command: 'updateResult', text: `Analyzing code using model '${modelId}'...\n\nWaiting for AI response...`, isError: false });

        let reviewResult = '';
        try {
            let systemPrompt = "You are an expert Code Reviewer. Review the provided git diff.";
            try {
                const skillUri = vscode.Uri.joinPath(context.extensionUri, 'docs', skillFilename);
                const skillBytes = await vscode.workspace.fs.readFile(skillUri);
                systemPrompt = Buffer.from(skillBytes).toString('utf8');
            } catch (fsError) {
                console.log(`${skillFilename} not found in docs folder, using default prompt.`);
            }

            const payload = {
                model: modelId,
                max_tokens: 4000,
                temperature: 0,
                top_p: 0.1,
                seed: 42,
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: `Review the following git diff:\n\n${
                        diffText.length > 25000 
                            ? diffText.substring(0, diffText.lastIndexOf('\n', 25000)) + '\n\n...[DIFF TRUNCATED TO PREVENT TOKEN BLOWOUT]...' 
                            : diffText
                    }` }
                ]
            };

            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 60000);

            const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`,
                    'HTTP-Referer': 'https://github.com/code-review-bot', 
                    'X-Title': 'CommitLens'
                },
                body: JSON.stringify(payload),
                signal: controller.signal as any
            });
            clearTimeout(timeoutId);

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`OpenRouter returned ${response.status}: ${errorText}`);
            }

            const data = await response.json() as any;
            if (data.choices && data.choices.length > 0) {
                reviewResult = data.choices[0].message.content;
                if (!reviewResult || reviewResult.trim() === '') {
                    reviewResult = "✅ No issues found! Your code looks perfectly fine.";
                }
            } else {
                reviewResult = "AI returned an empty response. Check your Model ID.";
            }
            
            panel.webview.postMessage({ command: 'updateResult', text: reviewResult, isError: false });
        } catch (apiError: any) {
            panel.webview.postMessage({ command: 'updateResult', text: `AI API Error: ${apiError.message}`, isError: true });
            return;
        }

        const session = await vscode.authentication.getSession('github', ['read:user'], { createIfNone: false });
        if (session) {
            const { data: existing } = await supabase
                .from('review_logs')
                .select('review_count')
                .eq('github_id', session.account.id)
                .eq('review_type', type)
                .single();

            await supabase.from('review_logs').upsert({
                github_id: session.account.id,
                review_type: type,
                review_count: (existing?.review_count ?? 0) + 1,
                last_reviewed_at: new Date().toISOString()
            }, { onConflict: 'github_id,review_type' });
        }

    } catch (err: any) {
        panel.webview.postMessage({ command: 'updateResult', text: `Error during review process: ${err.message}`, isError: true });
    }
}

function generateNonce(): string {
    const crypto = require('crypto');
    return crypto.randomBytes(16).toString('hex');
}

async function getWebviewContent(context: vscode.ExtensionContext, _webview: vscode.Webview, initialUsername: string | null = null) {
    const isUnlocked = initialUsername !== null;
    const nonce = generateNonce();

    const mediaDir = vscode.Uri.joinPath(context.extensionUri, 'media');
    
    const htmlBytes = await vscode.workspace.fs.readFile(vscode.Uri.joinPath(mediaDir, 'webview.html'));
    const cssBytes  = await vscode.workspace.fs.readFile(vscode.Uri.joinPath(mediaDir, 'webview.css'));
    const jsBytes   = await vscode.workspace.fs.readFile(vscode.Uri.joinPath(mediaDir, 'webview.js'));

    let html = Buffer.from(htmlBytes).toString('utf8');
    const css = Buffer.from(cssBytes).toString('utf8');
    const js  = Buffer.from(jsBytes).toString('utf8');

    html = html.replace('{{CSS_CONTENT}}',       css);
    html = html.replace('{{JS_CONTENT}}',        js);
    html = html.replace(/\{\{NONCE\}\}/g,        nonce);
    html = html.replace('{{DISPLAY_PROFILE}}',   isUnlocked ? 'block' : 'none');
    html = html.replace('{{DISPLAY_LOGIN}}',     isUnlocked ? 'none'  : 'flex');
    html = html.replace('{{DISPLAY_MAIN}}',      isUnlocked ? 'flex'  : 'none');
    
    const safeUsername = (initialUsername || 'User').replace(/</g, "&lt;").replace(/>/g, "&gt;");
    html = html.replace('{{INITIAL_USERNAME}}',  safeUsername);
    html = html.replace('IS_UNLOCKED_PLACEHOLDER', isUnlocked ? 'true' : 'false');

    return html;
}
