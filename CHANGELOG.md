# Changelog

All notable changes to the CommitLens extension will be documented in this file.

## [1.0.2] - 2026-06-27

### Added
- **Configurable Issue Limits**: Introduced a strict cap to prevent the AI from reporting more than 10 issues per review. This keeps code reviews highly focused on critical problems and conserves API tokens for the user.
- **Ecosystem Guardrails**: Hardcoded intelligence into the AI to recognize modern frontend/backend toolchains (e.g., Vite, Storybook 8). It will no longer erroneously suggest outdated boilerplate or manual configurations when native tooling handles it.
- **Anti-Pedantry Guardrails**: Instructed the AI to ignore harmless stylistic choices and valid ecosystem conventions (like standard SemVer shorthands, chained CI deployments, or inferred React return types). The bot now strictly prioritizes high-impact bugs over pedantic noise.
- **Toast Notifications**: Replaced the static, inline configuration messages with a sleek, animated toast notification system that gracefully overlays the Webview UI.

### Changed
- **Diff Context Engine**: Upgraded the core Git payload engine to utilize `git diff -U20 -W`. This extracts the full functional scope of the code being changed, completely eliminating the AI hallucination bug where it assumed variables were missing.

### Fixed
- **False Positives System**: Engineered a robust two-layer validation system. Issues flagged by the AI with a confidence score of `< 80%` are automatically filtered out and deleted, drastically reducing unactionable feedback.

---

## [1.0.1] - 2026-06-21

### Added
- **CI/CD Pipeline**: Introduced fully automated GitHub Actions workflows to handle build and type-checking across both `main` and `dev` branches.
- **Open Source Foundation**: Shipped official issue templates for bug reports and feature requests, alongside comprehensive `CONTRIBUTING.md` and `LICENSE` files.
- **Brand Assets**: Added the official CommitLens extension logo and updated the Webview UI to feature the new telescope branding instead of the generic sparkle icon.

### Changed
- **Marketplace Presentation**: Completely restructured and polished the `README.md` to provide a much better visual presentation and user guide on the VS Code Marketplace.
- **Core AI Prompts**: Refined the baseline `Skill.md` architecture and AI instructions to yield higher quality, more deterministic code reviews.
- **Webview Markdown**: Enhanced the underlying Markdown parsing logic inside the Webview to handle edge-cases more reliably.

---

## [1.0.0] - 2026-06-14

### Added
- **Initial Beta Launch**: The highly anticipated first beta release of the CommitLens (formerly OmniReview) AI Code Reviewer.
- **Interactive Webview UI**: Built a fully custom, sleek VS Code Webview featuring animated review cards, interactive navigation, and live Git branch state rendering.
- **Supabase Integration**: Seamless integration with a Supabase backend to handle real-time user authentication and secure code review logging.
- **GitHub Auth Flow**: Initialized a frictionless GitHub OAuth flow so users can authenticate directly inside VS Code without juggling API keys manually.
- **Intelligent Git State**: Engineered automated detection to easily differentiate and review both staged and unstaged code changes on the fly.
