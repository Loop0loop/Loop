# Loop

<div align="center">

**A powerful desktop writing application built for professional authors**

[![Version](https://img.shields.io/badge/version-1.1.6-blue.svg)](https://github.com/maildan/loop/releases)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Platform](https://img.shields.io/badge/platform-macOS%20%7C%20Windows-lightgrey.svg)]()

[Download](https://github.com/maildan/loop/releases) • [Documentation](docs/README.md) • [Contributing](docs/guides/contributing.md)

</div>

---

## ✨ Features

- **🤖 AI-Powered Writing**: Integrated OpenAI and Gemini for real-time writing assistance and deep project analysis
- **📚 Project Management**: Organize novels, characters, plot structures, and notes in one place
- **✍️ Multi-Editor Support**: Rich text editing with Tiptap and code/markdown with CodeMirror
- **🎨 Beautiful UI**: Modern, distraction-free interface built with React 19 and TailwindCSS
- **🔒 Privacy-First**: All data stored locally with SQLite, no telemetry or tracking
- **⚡ High Performance**: Optimized memory management and 6-level hardware acceleration
- **🔐 Security-Focused**: Multi-layer security with CSP, contextBridge isolation, and secure IPC

---

## 📥 Download

Get the latest version from [GitHub Releases](https://github.com/maildan/loop/releases):

- **macOS**: 
  - `Loop-{version}-arm64.dmg` (Apple Silicon M1/M2/M3)
  - `Loop-{version}.dmg` (Intel)
- **Windows**: 
  - `Loop Setup {version}.exe`

### ⚠️ macOS Security Warning

If you see **"Loop is damaged and can't be opened"**, this is due to macOS Gatekeeper. Run this command in Terminal:

```bash
xattr -cr /Applications/Loop.app
```

Then restart the app. [More troubleshooting tips →](docs/troubleshooting.md)

---

## 🏗️ Architecture

Loop is built on a modern **3-layer Electron architecture**:

```
┌─────────────────────────────────────────────────┐
│  Renderer Process (React 19 + React Router 7)   │
│  - UI Components, State Management, Editors     │
└─────────────────┬───────────────────────────────┘
                  │ IPC (Type-Safe)
┌─────────────────▼───────────────────────────────┐
│  Preload (contextBridge)                        │
│  - Secure API Exposure, Node.js Isolation       │
└─────────────────┬───────────────────────────────┘
                  │ IPC
┌─────────────────▼───────────────────────────────┐
│  Main Process (Electron + Node.js)              │
│  - 16 Managers, IPC Handlers, Security, DB      │
└─────────────────────────────────────────────────┘
```

[Learn more about the architecture →](docs/architecture/README.md)

---

## 🛠 Tech Stack

| Category | Technology |
|----------|------------|
| **Desktop Framework** | Electron 38.1.2 LTS |
| **UI Library** | React 19 |
| **Routing** | React Router DOM 7 |
| **Language** | TypeScript 5 (strict mode) |
| **Build Tool** | Vite + electron-vite 4.0 |
| **Database** | Prisma 6 + SQLite |
| **Editors** | Tiptap 2.24+, CodeMirror 6 |
| **Styling** | TailwindCSS 3.4 |
| **State** | Zustand 5 (minimal), useState, Prisma |
| **AI** | OpenAI API, Google Gemini SDK |
| **Cloud** | Firebase 12.3 (Auth, Firestore) |
| **Package Manager** | pnpm 10.17+ |

---

## 🚀 Development

### Prerequisites

- **Node.js**: 20+ (LTS recommended)
- **pnpm**: 9+ (required, do not use npm/yarn)
- **Git**: Latest version

### Quick Start

1. **Clone the repository**
   ```bash
   git clone https://github.com/maildan/loop.git
   cd loop
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Setup environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your API keys (OpenAI, Gemini, Firebase)
   ```

4. **Initialize database**
   ```bash
   pnpm prisma generate
   pnpm prisma migrate dev
   ```

5. **Run development server**
   ```bash
   pnpm dev
   ```

   This will start both the Electron app and Vite dev server.

### Available Scripts

```bash
pnpm dev          # Start development server
pnpm build        # Build for production
pnpm preview      # Preview production build
pnpm lint         # Run ESLint
pnpm test         # Run tests (Vitest)
pnpm test:e2e     # Run E2E tests (Playwright)
```

[Full development guide →](docs/development/setup.md)

---

## 📁 Project Structure

```
loop/
├── src/
│   ├── main/              # Electron main process
│   │   ├── core/          # ApplicationBootstrapper, ManagerCoordinator
│   │   ├── handlers/      # IPC handlers (32 total)
│   │   ├── managers/      # 16 managers (Memory, Security, etc.)
│   │   └── services/      # Business logic (Prisma, AI, etc.)
│   ├── preload/           # contextBridge security layer
│   │   └── index.ts       # API exposure (10 categories)
│   ├── renderer/          # React application
│   │   ├── src/
│   │   │   ├── routes/    # 7 routes (Dashboard, Projects, etc.)
│   │   │   ├── components/
│   │   │   ├── hooks/
│   │   │   ├── stores/    # Zustand (minimal, 1 store)
│   │   │   └── contexts/  # React contexts
│   │   └── main.tsx       # React entry point
│   └── shared/            # Shared types, DTOs, utilities
│       ├── types/
│       ├── services/      # AI services (Gemini, OpenAI)
│       └── ipc/           # IPC contracts
├── prisma/
│   └── schema.prisma      # Database schema (17 models)
├── docs/                  # Documentation
├── test/                  # Tests
└── scripts/               # Build and utility scripts
```

[Detailed architecture docs →](docs/architecture/README.md)

---

## 📚 Documentation

- **[Architecture Overview](docs/architecture/README.md)** - System design and patterns
- **[Development Guide](docs/development/setup.md)** - Setup and debugging
- **[Database Schema](docs/database/schema.md)** - Prisma models and optimization
- **[Contributing Guide](docs/guides/contributing.md)** - How to contribute
- **[Troubleshooting](docs/troubleshooting.md)** - Common issues and solutions

---

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](docs/guides/contributing.md) for details.

### Key Guidelines

- Use **pnpm** exclusively (not npm/yarn)
- Follow **TypeScript strict mode**
- Write tests for new features
- Follow **Conventional Commits**
- Ensure all checks pass before submitting PR

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

Built with:
- [Electron](https://www.electronjs.org/)
- [React](https://react.dev/)
- [Vite](https://vitejs.dev/)
- [Prisma](https://www.prisma.io/)
- [Tiptap](https://tiptap.dev/)
- [CodeMirror](https://codemirror.net/)
- [TailwindCSS](https://tailwindcss.com/)

---

<div align="center">

**Made with ❤️ for writers**

[⭐ Star this repo](https://github.com/maildan/loop) • [🐛 Report a bug](https://github.com/maildan/loop/issues)

</div>
# loop
# Loop
