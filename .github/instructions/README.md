# Loop Custom Instructions

This directory contains path-specific custom instructions for GitHub Copilot to provide context-aware guidance when working on different parts of the Loop application.

## Overview

Custom instructions automatically load based on the files you're editing, providing:
- Architecture-specific guidelines
- Security best practices
- Performance considerations
- Testing strategies
- Code examples and patterns

## Instruction Files

### Core Process Layers

#### [main-process.instructions.md](./main-process.instructions.md)
**Applies to**: `src/main/**/*.ts`

Covers Electron main process development including:
- ApplicationBootstrapper 3-phase initialization
- Manager development (14 specialized managers)
- IPC handler implementation
- Service layer architecture
- Database operations
- Security requirements
- Performance optimization

#### [renderer-process.instructions.md](./renderer-process.instructions.md)
**Applies to**: `src/renderer/**/*.tsx`, `src/renderer/**/*.ts`

Covers React frontend development including:
- Component structure and patterns
- TailwindCSS v4 styling
- Zustand state management
- IPC communication from renderer
- Performance optimization
- Accessibility guidelines
- Tiptap editor integration

#### [preload-security.instructions.md](./preload-security.instructions.md)
**Applies to**: `src/preload/**/*.ts`

Covers security layer including:
- contextBridge API exposure
- Security rules and constraints
- Type-safe API definitions
- Channel whitelisting
- Data sanitization
- Event listener management

#### [shared-code.instructions.md](./shared-code.instructions.md)
**Applies to**: `src/shared/**/*.ts`

Covers cross-process code including:
- IPC type contracts
- Validation schemas with Zod
- Pure utility functions
- Constants and enums
- Error types
- Environment constraints

### Data & AI

#### [database.instructions.md](./database.instructions.md)
**Applies to**: `prisma/**/*.prisma`, `src/main/database/**/*.ts`

Covers database development including:
- Prisma schema design principles
- Migration guidelines
- Query optimization patterns
- Transaction handling
- Performance considerations
- Seeding and backup

#### [ai-integration.instructions.md](./ai-integration.instructions.md)
**Applies to**: `src/main/services/OpenAIService.ts`, `src/main/services/**/*AI*.ts`, `src/shared/ai/**/*.ts`

Covers AI features including:
- OpenAI and Gemini service implementation
- Security (API key management)
- Context building from project data
- Conversation history management
- Rate limiting and token tracking
- Error handling and retries

### Development

#### [testing.instructions.md](./testing.instructions.md)
**Applies to**: `test/**/*.ts`, `**/*.test.ts`, `**/*.spec.ts`

Covers testing practices including:
- Vitest unit and integration tests
- Playwright E2E tests
- Mock strategies
- IPC testing patterns
- Database testing
- Coverage requirements

#### [configuration.instructions.md](./configuration.instructions.md)
**Applies to**: `*.config.ts`, `*.config.js`, `tsconfig*.json`, `electron-builder.json`, `.env*`

Covers configuration including:
- Environment variables
- TypeScript configuration hierarchy
- Vite and Electron builder setup
- ESLint and Tailwind config
- Security best practices

#### [documentation.instructions.md](./documentation.instructions.md)
**Applies to**: `**/*.md`, `docs/**/*`
**Excludes**: Copilot coding agent (documentation only)

Covers documentation writing including:
- Writing style and structure
- Document templates
- Code examples
- Diagrams and visual aids
- API documentation
- Changelog format

## How Instructions Work

### Progressive Loading

Custom instructions use a 3-level loading system:

1. **Discovery**: Copilot reads `applyTo` patterns to find relevant instructions
2. **Loading**: When pattern matches, full instructions load into context
3. **Application**: Copilot applies guidelines to suggestions and responses

### Pattern Matching

Instructions use glob patterns to match files:
- `**/*.ts` - All TypeScript files recursively
- `src/main/**/*.ts` - All TypeScript files under src/main
- `*.config.js` - All config files in root
- Multiple patterns: `**/*.ts,**/*.tsx` - TypeScript and TSX files

### Priority

When multiple instructions apply:
- All matching instructions are combined
- More specific patterns take precedence
- Repository-wide instructions always apply

## Usage

No manual action needed! Simply:
1. Open a file in VS Code
2. Start coding or ask Copilot a question
3. Relevant instructions automatically load
4. Copilot provides context-aware assistance

You can verify loaded instructions by checking the References list in Copilot Chat responses.

## Enabling Custom Instructions

Custom instructions are enabled by default. To verify or toggle:

1. Open VS Code Settings (Cmd+, / Ctrl+,)
2. Search for "instruction files"
3. Ensure "Code Generation: Use Instruction Files" is checked

## Creating New Instructions

To add new path-specific instructions:

1. Create `name.instructions.md` in this directory
2. Add frontmatter with `applyTo` pattern:
   ```markdown
   ---
   applyTo: "path/pattern/**/*.ext"
   description: Brief description of what this covers
   ---
   
   # Your Instructions
   ```
3. Write guidelines in Markdown format
4. Save and Copilot will automatically discover it

## Best Practices

- **Be specific**: Target narrow file patterns for focused guidance
- **Be concise**: Copilot has context limits
- **Use examples**: Show don't just tell
- **Reference templates**: Link to example code in skills
- **Update regularly**: Keep instructions current with codebase changes

## Related Resources

- [Agent Skills](../skills/loop-development-workflow/) - Reusable templates and scripts
- [Root Instructions](../copilot-instructions.md) - Repository-wide guidelines
- [AGENTS.md](../../AGENTS.md) - AI agent operational guidelines
- [Architecture Docs](../../docs/architecture/) - System design documentation