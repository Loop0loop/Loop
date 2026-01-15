---
applyTo: "src/shared/**/*.ts"
description: Instructions for Loop's shared code between main and renderer processes
---

# Shared Code Development Guidelines

You are working on code shared between Loop's main and renderer processes. This code must work in both Node.js and browser environments.

## Purpose and Scope

The shared layer contains:
- **Type definitions**: Interfaces, types, and DTOs used across processes
- **IPC contracts**: Type-safe channel definitions and payload types
- **Validation schemas**: Zod schemas for runtime type checking
- **Constants**: Shared configuration values and enums
- **Pure utilities**: Functions with no environment-specific dependencies

## Critical Constraints

Code in this directory must:
- **Not** use Node.js-specific APIs (fs, path, crypto, etc.)
- **Not** use browser-specific APIs (window, document, localStorage, etc.)
- **Not** have side effects or maintain state
- Work identically in both environments

If you need environment-specific code, implement it in main or renderer and expose through IPC.

## IPC Type Contracts

All IPC communication must be type-safe. Define contracts in `ipcTypes.ts`:

```typescript
// Define the contract
export interface ProjectCreateRequest {
  name: string;
  description?: string;
  genre: string;
}

export interface ProjectCreateResponse {
  id: string;
  name: string;
  createdAt: Date;
}

// Add to IPC channels map
export interface IPCChannels {
  'project:create': {
    request: ProjectCreateRequest;
    response: ProjectCreateResponse;
  };
  // ... other channels
}
```

Channel naming convention: `{domain}:{action}`
- Use lowercase with hyphens
- Group related operations by domain
- Use clear action verbs: create, get, update, delete, list

## Validation Schemas

Use Zod for runtime validation of IPC payloads:

```typescript
import { z } from 'zod';

export const ProjectCreateSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  genre: z.enum(['fiction', 'non-fiction', 'poetry', 'other']),
});

export type ProjectCreateData = z.infer<typeof ProjectCreateSchema>;
```

Validate in IPC handlers:
```typescript
const result = ProjectCreateSchema.safeParse(payload);
if (!result.success) {
  throw new Error(`Validation failed: ${result.error.message}`);
}
```

## Type Definitions

Keep types focused and well-documented:

```typescript
/**
 * Represents a project in the Loop application
 */
export interface Project {
  /** Unique identifier */
  id: string;
  
  /** Project name (1-100 characters) */
  name: string;
  
  /** Optional description */
  description?: string;
  
  /** Project creation timestamp */
  createdAt: Date;
  
  /** Last modification timestamp */
  updatedAt: Date;
}
```

Use TypeScript utility types:
- `Partial<T>` for update payloads
- `Pick<T, K>` for selecting specific fields
- `Omit<T, K>` for excluding fields
- `Required<T>` for making all fields required

## Constants and Enums

Define shared constants:

```typescript
export const APP_CONSTANTS = {
  MAX_PROJECT_NAME_LENGTH: 100,
  MAX_DESCRIPTION_LENGTH: 500,
  DEFAULT_THEME: 'dark',
  SUPPORTED_FILE_TYPES: ['.md', '.txt', '.loop'],
} as const;

export enum ProjectStatus {
  ACTIVE = 'active',
  ARCHIVED = 'archived',
  DELETED = 'deleted',
}
```

## Pure Utility Functions

Shared utilities must be pure functions with no side effects:

```typescript
/**
 * Truncates text to specified length with ellipsis
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + '...';
}

/**
 * Formats file size in human-readable format
 */
export function formatFileSize(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;
  
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  
  return `${size.toFixed(2)} ${units[unitIndex]}`;
}
```

## Error Types

Define custom error types for better error handling:

```typescript
export class IPCError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = 'IPCError';
  }
}

export class ValidationError extends Error {
  constructor(
    message: string,
    public readonly field: string,
    public readonly value: unknown
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}
```

## AI Integration Types

When defining types for AI features:

```typescript
export interface AIGenerationRequest {
  prompt: string;
  maxTokens?: number;
  temperature?: number;
  context?: string;
}

export interface AIGenerationResponse {
  text: string;
  tokensUsed: number;
  model: string;
  finishReason: 'stop' | 'length' | 'error';
}
```

## Narrative Structure Types

Loop has specialized types for narrative elements:

```typescript
export interface Character {
  id: string;
  name: string;
  description?: string;
  traits: string[];
  relationships: CharacterRelationship[];
}

export interface PlotPoint {
  id: string;
  title: string;
  description: string;
  order: number;
  chapterId?: string;
}
```

## Testing

- Test utility functions with various inputs including edge cases
- Verify Zod schemas with valid and invalid data
- Ensure no environment-specific dependencies are used
- Test type contracts match actual usage in main and renderer