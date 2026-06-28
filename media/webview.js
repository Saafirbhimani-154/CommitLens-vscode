const vscode = acquireVsCodeApi();
let stateData = { staged: [], unstaged: [] };
let currentReviewData = [];
let currentReviewIndex = 0;

// â”€â”€ Safe Event Listeners â”€â”€
document.getElementById('login-btn').addEventListener('click', () => vscode.postMessage({ command: 'login' }));
document.getElementById('refresh-btn').addEventListener('click', () => {
    const svg = document.querySelector('#refresh-btn svg');
    svg.classList.remove('spin-anim');
    void svg.offsetWidth; // force reflow to restart animation
    svg.classList.add('spin-anim');
    svg.addEventListener('animationend', () => svg.classList.remove('spin-anim'), { once: true });
    vscode.postMessage({ command: 'fetchGitState' });
});
document.getElementById('trigger-btn').addEventListener('click', () => triggerReview());
document.getElementById('api-key-btn').addEventListener('click', () => vscode.postMessage({ command: 'setApiKey' }));
document.getElementById('model-id-btn').addEventListener('click', () => vscode.postMessage({ command: 'setModelId' }));
document.getElementById('logout-btn').addEventListener('click', () => vscode.postMessage({ command: 'logout' }));
document.getElementById('profile-initial').addEventListener('click', () => toggleMenu());
document.getElementById('modal-backdrop').addEventListener('click', () => closeModal());
document.getElementById('review-staged-btn').addEventListener('click', () => executeReview('staged'));
document.getElementById('review-unstaged-btn').addEventListener('click', () => executeReview('unstaged'));
document.getElementById('staged-header').addEventListener('click', () => toggleAccordion('staged-list', 'staged-chevron'));
document.getElementById('unstaged-header').addEventListener('click', () => toggleAccordion('unstaged-list', 'unstaged-chevron'));

// Delegated click listener for dynamic review card buttons
document.getElementById('result').addEventListener('click', (e) => {
    const target = e.target.closest('[data-action]');
    if (!target) return;
    
    const action = target.getAttribute('data-action');
    if (action === 'jump') {
        jumpToReview(parseInt(target.getAttribute('data-index'), 10));
    } else if (action === 'nav') {
        navigateReview(parseInt(target.getAttribute('data-dir'), 10));
    }
});

// Trigger initial fetch if already logged in
if (IS_UNLOCKED_PLACEHOLDER) {
    vscode.postMessage({ command: 'fetchGitState' });
}

// â”€â”€ UI Functions â”€â”€
function toggleMenu() {
    document.getElementById('profile-menu').classList.toggle('show');
}

window.onclick = function(event) {
    if (!event.target.closest('.profile-container')) {
        document.getElementsByClassName('profile-menu')[0].classList.remove('show');
    }
};

function triggerReview() {
    if (stateData.staged.length > 0 && stateData.unstaged.length > 0) {
        document.getElementById('modal-backdrop').style.display = 'block';
        document.getElementById('choice-modal').style.display = 'flex';
    } else if (stateData.staged.length > 0) {
        executeReview('staged');
    } else if (stateData.unstaged.length > 0) {
        executeReview('unstaged');
    } else {
        const el = document.getElementById('result');
        el.style.display = 'block';
        el.innerText = 'No changes to review.';
        el.className = '';
    }
}

function closeModal() {
    document.getElementById('modal-backdrop').style.display = 'none';
    document.getElementById('choice-modal').style.display = 'none';
}

function toggleAccordion(listId, chevronId) {
    const list = document.getElementById(listId);
    const chevron = document.getElementById(chevronId);
    if (list.style.display === 'none') {
        list.style.display = 'flex';
        chevron.style.transform = 'rotate(0deg)';
    } else {
        list.style.display = 'none';
        chevron.style.transform = 'rotate(-90deg)';
    }
}

function executeReview(type) {
    closeModal();
    document.getElementById('result').style.display = 'block';
    vscode.postMessage({ command: type === 'staged' ? 'reviewStaged' : 'reviewUnstaged' });
}

function renderFileRow(file) {
    return `
        <div class="file-row">
            <div class="file-left">
                <span class="file-icon" style="display:flex;align-items:center;">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                        <polyline points="14 2 14 8 20 8"></polyline>
                        <line x1="16" y1="13" x2="8" y2="13"></line>
                        <line x1="16" y1="17" x2="8" y2="17"></line>
                    </svg>
                </span>
                <span class="file-name">${file.filename}</span>
                <span class="file-path">${file.directory}</span>
            </div>
            <div class="file-stats">
                ${(file.additions > 0 || file.additions === 'U') ? '<span class="stat-add">+' + (file.additions === 'U' ? 'New' : file.additions) + '</span>' : ''}
                ${file.deletions > 0 ? '<span class="stat-del">-' + file.deletions + '</span>' : ''}
            </div>
        </div>`;
}

// â”€â”€ Format Helpers â”€â”€
function formatInner(str) {
    return str
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/`([^`\n]+)`/g, '<code style="background:var(--vscode-textCodeBlock-background);padding:2px 4px;border-radius:3px;font-family:monospace;">$1</code>')
        .replace(/```([\s\S]*?)```/g, '<pre style="background:var(--vscode-textCodeBlock-background);padding:10px;border-radius:5px;overflow-x:auto;font-family:monospace;margin:10px 0;"><code>$1</code></pre>')
        .replace(/\n/g, '<br>');
}

// ── Render review card (spacious, animated) ──
function renderReviewCard(direction) {
    const item  = currentReviewData[currentReviewIndex];
    const total = currentReviewData.length;
    if (!item) { return; }

    const issueMatch = item.content.match(/The issue:\s*([\s\S]*?)(?=\nThe fix:|$)/);
    const fixMatch   = item.content.match(/The fix:\s*([\s\S]*?)$/);
    const issueText  = issueMatch ? issueMatch[1].trim() : '';
    const fixText    = fixMatch   ? fixMatch[1].trim()   : '';
    const bodyText   = (!issueText && !fixText) ? item.content : '';

    const progress = ((currentReviewIndex + 1) / total) * 100;
    const isFirst  = currentReviewIndex === 0;
    const isLast   = currentReviewIndex === total - 1;

    const fileIcon = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>`;

    const dotsHtml = currentReviewData.map((d, i) =>
        `<span class="nav-dot ${i === currentReviewIndex ? 'active' : ''}" 
              style="background:${i === currentReviewIndex ? d.color : ''}"
              data-action="jump" data-index="${i}" title="${d.tag.replace(/_/g, ' ')}"></span>`
    ).join('');

    const cardHtml = `
        <div class="review-wrapper">
            <div class="review-progress-bar">
                <div class="review-progress-fill" style="width:${progress}%;background:${item.color};"></div>
            </div>

            <div class="review-top-row">
                <span class="review-badge" style="color:${item.color}; border: 1px solid ${item.color};">${item.iconSvg} ${item.tag.replace(/_/g, ' ')}</span>
                <div style="display:flex;align-items:center;">
                    <span class="review-counter">${currentReviewIndex + 1} of ${total}</span>
                    <button class="nav-arrow-sm" data-action="nav" data-dir="-1" ${isFirst ? 'disabled' : ''}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 18l-6-6 6-6"/></svg>
                    </button>
                    <button class="nav-arrow-sm" data-action="nav" data-dir="1" ${isLast ? 'disabled' : ''}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18l6-6-6-6"/></svg>
                    </button>
                </div>
            </div>

            <div class="review-card ${direction === 1 ? 'slide-in-right' : direction === -1 ? 'slide-in-left' : ''}">
                <div class="review-card-inner">
                    ${issueText ? `<div class="review-section">
                        <div class="review-section-label">Issue</div>
                        <div class="review-section-body issue">${formatInner(issueText)}</div>
                    </div>` : ''}
                    ${fixText ? `<div class="review-section">
                        <div class="review-section-label">Fix</div>
                        <div class="review-section-body fix">${formatInner(fixText)}</div>
                    </div>` : ''}
                    ${bodyText ? `<div class="review-section-body issue">${formatInner(bodyText)}</div>` : ''}
                    <div class="review-section" style="margin-top: 10px;">
                        <div class="review-section-label">Affected Files (${item.fileLine.split(',').length})</div>
                        <div class="review-files-container">
                            ${item.fileLine.split(',').map(f => `<div class="review-file-chip" style="margin: 0; max-width: 100%;"><span style="flex-shrink:0;">${fileIcon}</span><span style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${f.trim()}</span></div>`).join('')}
                        </div>
                    </div>
                </div>
            </div>

            <div class="review-nav-dots">${dotsHtml}</div>
        </div>`;

    document.getElementById('result').innerHTML = cardHtml;
}

window.navigateReview = function(dir) {
    const next = currentReviewIndex + dir;
    if (next >= 0 && next < currentReviewData.length) {
        currentReviewIndex = next;
        renderReviewCard(dir);
    }
};

window.jumpToReview = function(index) {
    const dir = index > currentReviewIndex ? 1 : -1;
    currentReviewIndex = index;
    renderReviewCard(dir);
};

// Keyboard arrow navigation
document.addEventListener('keydown', (e) => {
    const resultEl = document.getElementById('result');
    if (!resultEl || resultEl.style.display === 'none') { return; }
    if (currentReviewData.length === 0) { return; }
    if (e.key === 'ArrowRight') { window.navigateReview(1); }
    if (e.key === 'ArrowLeft')  { window.navigateReview(-1); }
});

// â”€â”€ Markdown Parser â”€â”€
function parseMarkdown(text) {
    if (text.startsWith('Fetching') || text.startsWith('Analyzing') || text.startsWith('AI API Error')) { return text; }

    let raw = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    currentReviewData = [];

    const regex = /\[(MAJOR_BUG|MINOR_BUG|MAJOR_ISSUE|MINOR_ISSUE|MAJOR_IMPROVEMENT|MINOR_IMPROVEMENT|SECURITY|NITPICK|NO_ISSUES)\]\s*(.*?)\n([\s\S]*?)(?=(?:[\r\n]+\[(?:MAJOR_BUG|MINOR_BUG|MAJOR_ISSUE|MINOR_ISSUE|MAJOR_IMPROVEMENT|MINOR_IMPROVEMENT|SECURITY|NITPICK|NO_ISSUES)\]|$))/g;
    let match;
    while ((match = regex.exec(raw)) !== null) {
        const tag = match[1], fileLine = match[2].replace('-&gt;', '').trim(), content = match[3].trim();
        let color = 'var(--vscode-foreground)', iconSvg = '';

        if (tag.includes('BUG') || tag.includes('ISSUE')) {
            color = 'var(--vscode-testing-iconFailed)';
            iconSvg = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>';
        } else if (tag === 'SECURITY') {
            color = '#d16969';
            iconSvg = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>';
        } else if (tag.includes('IMPROVEMENT')) {
            color = 'var(--vscode-testing-iconPassed)';
            iconSvg = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 16 16 12 12 8"></polyline><line x1="8" y1="12" x2="16" y2="12"></line></svg>';
        } else {
            color = '#3794ff';
            iconSvg = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>';
        }
        currentReviewData.push({ tag, fileLine, content, color, iconSvg });
    }

    if (currentReviewData.length === 0) {
        let html = raw
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/`([^`\n]+)`/g, '<code style="background:var(--vscode-textCodeBlock-background);padding:2px 4px;border-radius:3px;font-family:monospace;">$1</code>')
            .replace(/\n\n/g, '</p><p>')
            .replace(/\n/g, '<br>');
        
        return `
        <div class="review-wrapper">
            <div class="review-card">
                <div class="review-card-inner">
                    <div class="review-section">
                        <div class="review-section-label">General Review (Conversational Mode)</div>
                        <div class="review-section-body" style="background: var(--vscode-editorWidget-background); border: 1px solid var(--vscode-widget-border); color: var(--vscode-foreground); font-size: 13px; line-height: 1.6; padding: 16px;">
                            <p>${html}</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>`;
    }

    // Render first card â€” subsequent navigation uses renderReviewCard()
    currentReviewIndex = 0;
    return ''; // result div will be filled by renderReviewCard()
}

// ── Toast Notification System ──
window.showToast = function(message, type = 'success') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    let icon = '';
    if (type === 'success') {
        icon = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--vscode-testing-iconPassed)" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>';
    } else if (type === 'error') {
        icon = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--vscode-testing-iconFailed)" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>';
    } else {
        icon = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>';
    }

    toast.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;flex-shrink:0;">${icon}</div><div>${message}</div>`;
    container.appendChild(toast);

    setTimeout(() => {
        toast.classList.add('fade-out');
        toast.addEventListener('animationend', () => toast.remove());
    }, 2000);
};

// â”€â”€ Message Handler â”€â”€
window.addEventListener('message', event => {
    const message = event.data;

    if (message.command === 'showToast') {
        window.showToast(message.text, message.type);
    }

    if (message.command === 'unlockUI') {
        document.getElementById('login-screen').style.display = 'none';
        document.getElementById('main-screen').style.display = 'flex';
        document.getElementById('profile').style.display = 'block';
        document.getElementById('profile-name').innerText = 'Connected as ' + message.username;
        vscode.postMessage({ command: 'fetchGitState' });
    }

    if (message.command === 'lockUI') {
        document.getElementById('login-screen').style.display = 'flex';
        document.getElementById('main-screen').style.display = 'none';
        document.getElementById('profile').style.display = 'none';
    }

    if (message.command === 'updateGitState') {
        stateData = message.state;
        document.getElementById('branch-name').innerText = stateData.branch;

        const stList      = document.getElementById('staged-list');
        const unList      = document.getElementById('unstaged-list');
        const stContainer = document.getElementById('staged-container');
        const unContainer = document.getElementById('unstaged-container');
        const emptyState  = document.getElementById('empty-state');

        stList.innerHTML = '';
        unList.innerHTML = '';

        if (stateData.staged.length > 0) {
            stContainer.style.display = 'block';
            document.getElementById('staged-count').innerText = stateData.staged.length;
            stList.innerHTML = stateData.staged.map(renderFileRow).join('');
        } else { stContainer.style.display = 'none'; }

        if (stateData.unstaged.length > 0) {
            unContainer.style.display = 'block';
            document.getElementById('unstaged-count').innerText = stateData.unstaged.length;
            unList.innerHTML = stateData.unstaged.map(renderFileRow).join('');
        } else { unContainer.style.display = 'none'; }

        const hasChanges = stateData.staged.length > 0 || stateData.unstaged.length > 0;
        emptyState.style.display = hasChanges ? 'none' : 'block';
        document.getElementById('trigger-btn').style.opacity = hasChanges ? '1' : '0.5';
        document.getElementById('trigger-btn').style.pointerEvents = hasChanges ? 'auto' : 'none';
    }

    if (message.command === 'updateResult') {
        const el = document.getElementById('result');
        el.style.display = 'block';

        if (message.isError || message.text.startsWith('Fetching') || message.text.startsWith('Analyzing')) {
            el.innerText = message.text;
            el.className = message.isError ? 'error' : '';
        } else {
            const fallbackHtml = parseMarkdown(message.text);
            if (currentReviewData.length > 0) {
                el.className = 'success';
                renderReviewCard();
            } else {
                el.innerHTML = fallbackHtml;
                el.className = 'success';
            }
        }
    }
});
