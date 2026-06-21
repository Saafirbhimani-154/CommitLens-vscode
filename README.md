# CommitLens: AI-Powered Code Review Agent 🚀

**CommitLens** is a next-generation, AI-driven code review assistant built directly into your VS Code environment. It seamlessly analyzes your staged and unstaged Git changes, catches bugs before you commit, and provides actionable, deterministic fixes right inside your editor.

---

## ✨ Key Features

- **Bring Your Own Model (BYOM):** Connect to OpenRouter and use any top-tier LLM you prefer—from `anthropic/claude-3-opus` and `openai/gpt-4o` to free open-source models like `qwen/qwen-2.5-coder-32b-instruct:free`.
- **Master-Detail Review Panel:** A beautiful, responsive VS Code Webview. Instantly visualize your issues in a clickable sidebar, with detailed bug explanations and fixes on the right.
- **Git-Aware:** Automatically detects your active workspace, current branch, staged files, and unstaged changes. Review exactly what you are about to commit.
- **Strictly Deterministic:** The AI is locked to `temperature: 0` and `top_p: 0.1` to ensure rigorously consistent, noise-free bug finding.
- **Cloud History:** Automatically connects to Supabase to store a permanent cloud history of your reviews and usage analytics.
- **Absolute Privacy:** Your OpenRouter API keys are never stored in plain text. They are encrypted and stored safely inside VS Code's native `SecretStorage` vault.

## 🚀 Getting Started

1. **Install the Extension:** Download and install CommitLens from the VS Code Marketplace.
2. **Open the Review Panel:** Hit `Ctrl+Shift+P` (or `Cmd+Shift+P` on Mac) and run **`CommitLens: Open Review Panel`**.
3. **Configure Your Keys:** Click the profile icon in the top right corner of the panel and select **Update API Key** to securely input your OpenRouter Key.
4. **Select Your Model:** Click **Update Model ID** in the profile dropdown to choose your preferred AI model.
5. **Trigger a Review:** Make some code changes, click **Trigger Review**, and watch the AI catch your bugs!

## ⚙️ Extension Settings

You can customize CommitLens through standard VS Code settings (`settings.json`):

* `commitlens.modelId`: Set your default OpenRouter Model ID. (Default: `anthropic/claude-3-haiku`)

## 🛠️ Modifying the AI's Brain

Want the AI to focus specifically on Security? Or maybe React performance? You have full control. Simply modify the core instruction set located at:
`docs/UNIVERSAL_REVIEWING_SKILL.md`

The AI will dynamically adapt to the exact architectural guidelines you write in this markdown file.

## 🔒 Security & Privacy

* **API Keys:** Your OpenRouter API key is stored securely in your machine's native keychain via VS Code. It is never transmitted anywhere except directly to OpenRouter.
* **Usage Analytics:** CommitLens logs basic review metadata to a dedicated Supabase instance to help you track your coding velocity and catch rates.

---
*Built with ❤️ for developers who care about flawless code quality.*
