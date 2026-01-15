# Feature Architecture Template

This template provides guidance for implementing new features in Loop following the 3-layer architecture.

## Planning Phase

### 1. Define Requirements
- [ ] Feature specification and user stories
- [ ] Data model requirements (Prisma schema changes)
- [ ] Security considerations and access controls
- [ ] Performance requirements and constraints

### 2. Architecture Design
- [ ] Identify which layer(s) will be involved
- [ ] Define IPC contracts and data flow
- [ ] Plan database schema changes if needed
- [ ] Consider AI integration requirements

## Implementation Layers

### Main Process Layer
**Location**: `src/main/`

#### Services (`src/main/services/`)
- Business logic and external API integrations
- Database operations and data processing
- AI service integrations
- File system operations

#### Managers (`src/main/managers/`)
- State management and coordination
- System integration and lifecycle management
- Event handling and process coordination

#### Handlers (`src/main/handlers/`)
- IPC request processing
- Type validation and error handling
- Response formatting and security

### Renderer Process Layer
**Location**: `src/renderer/`

#### Components (`src/renderer/components/`)
- UI components following Loop's design system
- TailwindCSS v4 styling
- Accessibility considerations

#### Hooks (`src/renderer/hooks/`)
- State management and data fetching
- IPC communication abstraction
- Reusable business logic

#### Stores (`src/renderer/stores/`)
- Client-side state management with Zustand
- Caching and synchronization

### Shared Layer
**Location**: `src/shared/`

#### Types (`src/shared/types/`)
- Cross-process data types
- API contracts and DTOs
- Validation schemas

#### IPC Contracts (`src/shared/ipcTypes.ts`)
- Type-safe IPC channel definitions
- Request/response type pairs
- Error handling patterns

## Security Checklist

- [ ] No direct Node.js API access from renderer
- [ ] All IPC payloads validated with Zod
- [ ] Sensitive data kept in main process only
- [ ] CSP policies updated if needed
- [ ] User input sanitization implemented

## Testing Strategy

- [ ] Unit tests for services and utilities
- [ ] IPC communication tests
- [ ] Component testing with React Testing Library
- [ ] Integration tests for full workflows
- [ ] E2E tests for user scenarios

## Documentation Requirements

- [ ] Update relevant architecture documentation
- [ ] Add JSDoc comments for public APIs
- [ ] Update IPC contract documentation
- [ ] Create user-facing documentation if needed