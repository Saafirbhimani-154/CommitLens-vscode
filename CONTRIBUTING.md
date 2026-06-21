# Contributing to CommitLens

Thank you for your interest in contributing to CommitLens! 🚀

To ensure a smooth open-source experience and prevent unnecessary work, please adhere to the following guidelines.

## 🐛 Found a Bug?
- Check if the bug has already been reported in the Issues tab.
- If not, open a new issue using the **Bug Report** template. You MUST include reproduction steps. Vague issues like "it doesn't work" will be closed automatically.

## ✨ Have a Feature Request?
- Please open an issue using the **Feature Request** template BEFORE writing any code. We want to discuss the feature architecture before you spend time building it.

## 🛠️ Submitting a Pull Request
**CRITICAL: Branching Strategy**
This project uses a strict Git Flow architecture. The `main` branch is locked for production releases only. 
**You MUST open all Pull Requests against the `dev` branch. Any PR opened against `main` will be automatically rejected.**

1. Fork the repository.
2. Checkout the `dev` branch: `git checkout dev`
3. Create a feature branch from dev (`git checkout -b feature/amazing-feature`).
4. Commit your changes with a descriptive, conventional commit message.
5. Push to your branch and open a Pull Request targeting the **`dev`** branch.

**PR Requirements:**
- All TypeScript code must compile without errors (`npm run compile`). The CI pipeline will enforce this.
- Do not modify the core `Skill.md` AI prompt without a very strong, discussed reason. The strict nomenclature is essential for the UI parser to function.
- Do not commit your OpenRouter API keys or Supabase Anon keys.

By contributing, you agree that your contributions will be licensed under the MIT License.
