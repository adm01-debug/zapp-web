# Changelog

All notable changes to ZAPP-WEB will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Dependabot configuration for automated dependency updates
- EditorConfig for consistent coding styles across editors
- Prettier configuration for code formatting
- MIT License
- Node.js version management via .nvmrc (v20 LTS)

### Changed
- Repository structure cleanup (removed 24+ redundant files)

### Removed
- All Lalamove-related files from repository root (~24.5MB freed)
- Redundant package-lock.json (project uses bun.lock)

### Security
- Enhanced .gitignore with credential pattern blocking
- CODEOWNERS for mandatory code review

---

## [1.0.0] - 2024-XX-XX

### Added
- Initial release of ZAPP-WEB
- Multi-channel WhatsApp CRM platform
- RBAC (Admin, Supervisor, Agent roles)
- WebAuthn/Passkeys authentication
- MFA/TOTP support
- Real-time messaging via Evolution API
- AI-powered sentiment analysis
- Gamification system
- CRM Intelligence (DISC profiling, RFM segmentation)
- PWA support
- 56 database tables with 181 RLS policies
- 20 Edge Functions
- 297 React components

### Technical Stack
- React 18.3.1 + Vite 5 + TypeScript
- Supabase (PostgreSQL + Realtime + Edge Functions)
- shadcn/ui + Tailwind CSS
- Evolution API for WhatsApp
- OpenAI + ElevenLabs for AI features

[Unreleased]: https://github.com/adm01-debug/zapp-web/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/adm01-debug/zapp-web/releases/tag/v1.0.0
