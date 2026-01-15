---
name: loop-development-workflow
description: Specialized development workflow for Loop, an Electron-based desktop writing application for professional authors. Use when developing Loop's 3-layer architecture, managing 200+ type-safe IPC handlers, implementing AI integrations, or working with the ApplicationBootstrapper system.
---

# Skill Instructions

This skill provides specialized guidance for developing Loop, a desktop writing application built with Electron 38 LTS, React 19, and a sophisticated 3-layer architecture. Loop serves professional authors with AI-powered writing assistance, project management, and privacy-first local data storage.

## When to use this skill

Use this skill when you need to:
- Develop or debug Loop's main process (Electron) components
- Create or modify type-safe IPC handlers between main and renderer processes
- Implement features using Loop's ApplicationBootstrapper and manager coordination system
- Work with Loop's dual AI integration (OpenAI and Gemini)
- Add new functionality to the 14 specialized managers
- Debug issues related to the 3-phase initialization process
- Create or modify React components in the renderer process
- Work with Loop's Prisma-based SQLite database schema
- Implement security features following Loop's 5-layer security architecture

## Core Concepts

### Architecture Overview
Loop follows a strict 3-layer Electron architecture:
- **Main Process**: ApplicationBootstrapper, 14 managers, services, and IPC handlers
- **Renderer Process**: React 19 application with TailwindCSS v4
- **Preload Layer**: Secure contextBridge for main-renderer communication

### Key Components
1. **ApplicationBootstrapper**: Central initialization system managing 3-phase startup
2. **Manager Coordination**: 14 specialized managers handling app lifecycle, memory, sessions, etc.
3. **Type-Safe IPC**: 200+ handlers defined in `/shared/ipcTypes.ts`
4. **AI Services**: Dual integration with OpenAI and Gemini for writing assistance
5. **Security**: Multi-layer security with CSP, sandbox isolation, and secure IPC

### Project Structure
- `src/main/`: Electron main process with core/, managers/, services/, handlers/
- `src/renderer/`: React application with app/, components/, hooks/, stores/
- `src/shared/`: Cross-process types, IPC definitions, and utilities
- `src/preload/`: Security layer with contextBridge definitions

## Workflow Steps

### Adding New Features

1. **Define IPC Contract**: Start by defining type-safe IPC contracts in `src/shared/ipcTypes.ts`
2. **Review Architecture**: Check the [architecture template](./templates/feature-architecture.md) for proper layer separation
3. **Main Process Implementation**:
   - Add handlers to appropriate manager or create new service
   - Follow singleton pattern for shared state
   - Use the [manager template](./templates/manager-template.ts) for new managers
4. **Renderer Implementation**:
   - Create React components following Loop's component structure
   - Use the [component template](./templates/loop-component.tsx) as starting point
   - Implement hooks for IPC communication using the [hook template](./templates/ipc-hook.ts)

### Debugging Workflow

1. **Check Logs**: Run the [log analyzer](./scripts/analyze-logs.js) to identify issues
2. **IPC Issues**: Use the [IPC debugger](./scripts/debug-ipc.js) to trace communication
3. **Manager State**: Run the [manager inspector](./scripts/inspect-managers.js) to check manager states
4. **Performance**: Use the [performance profiler](./scripts/profile-performance.js) for optimization

### Development Commands
- `pnpm dev`: Start development server with hot reload
- `pnpm test`: Run full test suite with coverage
- `pnpm lint:strict`: Run strict linting with zero warnings
- `pnpm db:studio`: Open Prisma Studio for database inspection

### AI Integration Workflow

1. **Context Collection**: Implement context gathering in main process services
2. **Service Integration**: Add AI calls to `OpenAIService.ts` or create Gemini integration
3. **Session Management**: Use existing session patterns for conversation history
4. **Error Handling**: Follow Loop's error handling patterns with proper logging

### Security Considerations

- Never expose Node.js APIs directly to renderer
- Use contextBridge for all main-renderer communication
- Validate all IPC payloads using Zod schemas
- Follow CSP policies defined in security configuration
- Test with sandbox mode enabled

### Testing Strategy

1. **Unit Tests**: Test individual managers and services in isolation
2. **IPC Tests**: Use the [IPC test helper](./templates/ipc-test.template.js) for communication testing
3. **Integration Tests**: Test full workflows using the [integration template](./templates/integration-test.template.js)
4. **E2E Tests**: Use Playwright for end-to-end user scenarios

### Common Patterns

- **Manager Creation**: Follow the singleton pattern with proper initialization in ApplicationBootstrapper
- **IPC Handler Registration**: Register all handlers in HandlersManager following type-safe patterns
- **Error Handling**: Use Loop's centralized error handling with proper logging and user feedback
- **State Management**: Use Zustand for renderer state, Prisma for persistent data
- **Component Structure**: Follow Loop's component organization with proper separation of concerns

## Best Practices

- Always maintain type safety across IPC boundaries
- Use the ApplicationBootstrapper for proper initialization order
- Follow Loop's security guidelines for renderer isolation
- Implement proper error handling and logging
- Test IPC communication thoroughly
- Document new IPC contracts and manager responsibilities
- Follow Loop's performance optimization guidelines
- Maintain consistency with existing code patterns and architecture