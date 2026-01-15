---
description: Root index for AI operation protocols
applyTo: '**'
---

# Instructions Index

This file acts as the **entry point** for all AI behavioral instructions.  
Each module below defines a **self-contained rule set**. Think of it like `index.js` that imports/export all configs.

## Architecture Overview

Loop is an Electron-based desktop writing application built with:
- **Electron 38 LTS** with 3-layer architecture (main, renderer, preload)
- **React 19** with TailwindCSS v4 for UI
- **Prisma + SQLite** for local-first data storage
- **Dual AI integration** (OpenAI GPT-4 + Google Gemini)
- **200+ type-safe IPC handlers** for process communication

## Path-Specific Instructions

Loop uses path-specific custom instructions to provide context-aware guidance based on the files you're working with. These instructions are automatically loaded when relevant:

### Core Process Layers
- **[Main Process](./instructions/main-process.instructions.md)** (`src/main/**/*.ts`)
  - Electron backend with ApplicationBootstrapper
  - 14 specialized managers (Session, Memory, Power, etc.)
  - IPC handlers and service layer
  - Database operations and AI services

- **[Renderer Process](./instructions/renderer-process.instructions.md)** (`src/renderer/**/*.{ts,tsx}`)
  - React 19 frontend with hooks and components
  - Zustand state management
  - TailwindCSS v4 styling
  - IPC communication patterns

- **[Preload Security](./instructions/preload-security.instructions.md)** (`src/preload/**/*.ts`)
  - Security boundary between main and renderer
  - contextBridge API exposure
  - Input/output sanitization

- **[Shared Code](./instructions/shared-code.instructions.md)** (`src/shared/**/*.ts`)
  - Cross-process type definitions
  - IPC contracts and validation schemas
  - Pure utility functions
  - Constants and enums

### Data & AI
- **[Database](./instructions/database.instructions.md)** (`prisma/**/*.prisma`, `src/main/database/**/*.ts`)
  - Prisma schema design (17 models across 4 domains)
  - Migration strategies
  - Query optimization
  - Transaction patterns

- **[AI Integration](./instructions/ai-integration.instructions.md)** (AI-related files)
  - OpenAI and Gemini service implementation
  - Context building and conversation management
  - Rate limiting and token tracking
  - Security and error handling

### Development
- **[Testing](./instructions/testing.instructions.md)** (`test/**/*`, `**/*.{test,spec}.ts`)
  - Vitest for unit/integration tests
  - Playwright for E2E tests
  - Mock strategies and fixtures
  - Coverage requirements

- **[Configuration](./instructions/configuration.instructions.md)** (Config files)
  - TypeScript configuration hierarchy
  - Vite and Electron builder setup
  - Environment variables
  - ESLint and Tailwind config

- **[Documentation](./instructions/documentation.instructions.md)** (`**/*.md`, `docs/**/*`)
  - Writing style and templates
  - Code examples and diagrams
  - API documentation standards
  - Version and changelog format

## Development Principles

1. **Type Safety First**: Strict TypeScript across all layers, explicit IPC contracts
2. **Security by Design**: Renderer sandbox isolation, no direct Node.js API access
3. **Performance Aware**: Lazy loading, connection pooling, caching strategies
4. **Privacy First**: Local-only data storage, no telemetry or tracking
5. **Test Coverage**: Unit tests for logic, integration for workflows, E2E for user journeys

## Project Commands

```bash
pnpm dev              # Development server with hot reload
pnpm build           # Production build
pnpm test            # Run all tests
pnpm lint:strict     # Zero-warning linting
pnpm db:studio       # Open Prisma Studio
```

## Additional Resources

- **[Agent Skill](skills/loop-development-workflow/SKILL.md)**: Specialized GitHub Copilot skill for Loop development
> All instructions in this folder are **mandatory** and have equal priority unless explicitly overridden.
