---
applyTo: "src/main/**/*.ts"
description: Instructions for Loop's Electron main process development
---

# Main Process Development Guidelines

You are working on Loop's Electron main process layer. This is the backend of the application that handles system integration, database operations, AI services, and IPC communication.

## Architecture Context

The main process follows a 3-phase initialization pattern managed by `ApplicationBootstrapper`:
1. **Phase 1**: Core initialization (window, security, database)
2. **Phase 2**: Manager registration and startup (14 specialized managers)
3. **Phase 3**: IPC handler registration and service activation

## Manager Development

All managers must follow the singleton pattern and implement these lifecycle methods:
- `initialize()`: Setup resources, connections, and initial state
- `start()`: Begin active processes and event listeners
- `stop()`: Pause active processes, cleanup listeners
- `shutdown()`: Final cleanup, save state, release resources

When creating a new manager:
- Extend `BaseManager` if available or follow the existing manager pattern
- Register in `ApplicationBootstrapper` with proper phase sequencing
- Use dependency injection for service dependencies
- Implement proper error handling with detailed logging
- Never block the main thread with synchronous operations

## IPC Handler Guidelines

All IPC handlers must be:
- **Type-safe**: Define request/response types in `src/shared/ipcTypes.ts`
- **Validated**: Use Zod schemas for payload validation
- **Error-handled**: Wrap in try-catch with meaningful error messages
- **Logged**: Use the centralized logger for debugging
- **Registered**: Add to `HandlersManager` during initialization

IPC handler naming convention: `{domain}:{action}`
Examples: `project:create`, `settings:get`, `ai:generate-text`

## Security Requirements

- Never expose Node.js APIs directly to renderer
- Validate all inputs from renderer process
- Sanitize file paths and user-provided data
- Use `safeStorage` for sensitive data
- Follow principle of least privilege for IPC handlers

## Service Layer

Services should:
- Be singleton instances
- Handle external API integrations (OpenAI, Gemini, OAuth)
- Manage database operations through Prisma
- Implement retry logic and rate limiting
- Cache responses when appropriate
- Use environment variables for configuration

## Database Operations

- Use Prisma Client for all database operations
- Wrap transactions in try-catch blocks
- Use connection pooling efficiently
- Implement proper error handling for constraint violations
- Log slow queries (>100ms) for optimization
- Never expose raw SQL to renderer process

## Performance Considerations

- Lazy load heavy dependencies
- Use worker threads for CPU-intensive tasks
- Implement caching for frequently accessed data
- Monitor memory usage in long-running processes
- Profile and optimize hot paths

## Error Handling

Always implement comprehensive error handling:
```typescript
try {
  const result = await operation();
  return { success: true, data: result };
} catch (error) {
  logger.error('Operation failed:', error);
  return { 
    success: false, 
    error: error instanceof Error ? error.message : 'Unknown error' 
  };
}
```

## Logging Standards

Use the centralized logger with appropriate levels:
- `logger.debug()`: Development debugging information
- `logger.info()`: General operational information
- `logger.warn()`: Warning conditions that should be reviewed
- `logger.error()`: Error conditions requiring attention

Include context in logs:
```typescript
logger.info('Manager started', { 
  manager: 'SessionManager', 
  phase: 2, 
  duration: 145 
});
```

## Testing

- Write unit tests for all managers and services
- Mock external dependencies (database, APIs, file system)
- Test error scenarios and edge cases
- Ensure proper cleanup in afterEach hooks
- Test IPC handler contracts independently