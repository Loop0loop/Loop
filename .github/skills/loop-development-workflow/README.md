# Loop Development Workflow Skill

This Agent Skills directory contains specialized resources for developing Loop, an Electron-based desktop writing application for professional authors.

## Overview

Loop is built with a sophisticated 3-layer architecture:
- **Electron 38 LTS** main process with ApplicationBootstrapper
- **React 19** renderer process with TailwindCSS v4
- **Type-safe IPC** communication with 200+ handlers
- **Dual AI integration** (OpenAI and Gemini)
- **Prisma + SQLite** for local data persistence

## Skill Contents

### SKILL.md
The main skill definition that GitHub Copilot loads to understand Loop's development patterns and workflows.

### Templates (`/templates/`)
- `loop-component.tsx` - Standard React component template
- `ipc-hook.ts` - Hook template for type-safe IPC communication
- `manager-template.ts` - Manager class template following Loop's singleton pattern
- `feature-architecture.md` - Architecture planning template for new features
- `ipc-test.template.js` - Test utilities for IPC communication
- `integration-test.template.js` - Full workflow integration tests

### Scripts (`/scripts/`)
- `debug-ipc.js` - IPC communication analyzer and debugger
- `inspect-managers.js` - Manager system inspector and recommendations
- `profile-performance.js` - Performance profiler and optimization suggestions
- `analyze-logs.js` - Log file analyzer with pattern recognition

## Usage

When working on Loop, simply describe your task to GitHub Copilot. The skill will be automatically loaded when relevant, providing:

- Context-aware code suggestions
- Architecture-specific guidance
- Loop-specific patterns and best practices
- Reference to templates and debugging scripts

## Skill Activation

This skill activates automatically when:
- Working with Loop's main process managers
- Creating or debugging IPC handlers
- Implementing AI integrations
- Working with ApplicationBootstrapper
- Debugging performance or architectural issues

## Development Commands

Key commands when working with Loop:
- `pnpm dev` - Development server with hot reload
- `pnpm test` - Full test suite
- `pnpm lint:strict` - Zero-warning linting
- `pnpm db:studio` - Database management interface

## Architecture Principles

- Maintain strict type safety across IPC boundaries
- Follow singleton pattern for managers
- Use ApplicationBootstrapper for initialization
- Implement proper error handling and logging
- Maintain security isolation between processes