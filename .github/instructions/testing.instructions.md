---
applyTo: "test/**/*.ts,test/**/*.spec.ts,**/*.test.ts,**/*.spec.ts"
description: Instructions for Loop's testing practices and standards
---

# Testing Guidelines

You are writing tests for Loop. Follow these standards to ensure comprehensive, maintainable test coverage.

## Testing Framework

Loop uses **Vitest** for unit and integration tests, and **Playwright** for E2E tests.

## Test Organization

```
test/
├── unit/           # Unit tests for individual functions/classes
├── integration/    # Integration tests across modules
├── e2e/           # End-to-end tests with Playwright
├── fixtures/      # Test data and fixtures
├── mocks/         # Mock implementations
└── setup.ts       # Global test setup
```

## Unit Testing

**Purpose**: Test individual functions, classes, or components in isolation.

**Structure**:
```typescript
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

describe('FeatureName', () => {
  describe('functionName', () => {
    it('should handle normal case', () => {
      const result = functionName(input);
      expect(result).toBe(expected);
    });

    it('should handle edge case', () => {
      const result = functionName(edgeInput);
      expect(result).toBe(edgeExpected);
    });

    it('should throw error for invalid input', () => {
      expect(() => functionName(invalid)).toThrow('Error message');
    });
  });
});
```

**Best Practices**:
- One assertion concept per test
- Test behavior, not implementation
- Use descriptive test names
- Test edge cases and error conditions
- Keep tests independent and isolated

## Main Process Testing

Mock Node.js APIs and Electron modules:

```typescript
import { vi } from 'vitest';

// Mock Electron
vi.mock('electron', () => ({
  app: {
    getPath: vi.fn(() => '/mock/path'),
    on: vi.fn(),
  },
  BrowserWindow: vi.fn(),
  ipcMain: {
    handle: vi.fn(),
    on: vi.fn(),
  },
}));

// Test manager
describe('SessionManager', () => {
  let manager: SessionManager;

  beforeEach(() => {
    manager = SessionManager.getInstance();
  });

  afterEach(async () => {
    await manager.shutdown();
    vi.clearAllMocks();
  });

  it('should initialize successfully', async () => {
    await manager.initialize();
    expect(manager.isInitialized()).toBe(true);
  });

  it('should handle session creation', async () => {
    const session = await manager.createSession(userId);
    expect(session).toHaveProperty('id');
    expect(session.userId).toBe(userId);
  });
});
```

## Renderer Testing

Use React Testing Library for component tests:

```typescript
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

// Mock IPC
const mockInvoke = vi.fn();
window.electronAPI = {
  invoke: mockInvoke,
  on: vi.fn(),
  removeAllListeners: vi.fn(),
};

describe('ProjectList', () => {
  it('should render projects', async () => {
    mockInvoke.mockResolvedValue([
      { id: '1', name: 'Project 1' },
      { id: '2', name: 'Project 2' },
    ]);

    render(<ProjectList />);

    await waitFor(() => {
      expect(screen.getByText('Project 1')).toBeInTheDocument();
      expect(screen.getByText('Project 2')).toBeInTheDocument();
    });
  });

  it('should handle project creation', async () => {
    mockInvoke.mockResolvedValue({ id: '3', name: 'New Project' });

    render(<ProjectList />);
    
    const input = screen.getByPlaceholderText('Project name');
    const button = screen.getByRole('button', { name: /create/i });

    fireEvent.change(input, { target: { value: 'New Project' } });
    fireEvent.click(button);

    await waitFor(() => {
      expect(mockInvoke).toHaveBeenCalledWith('project:create', {
        name: 'New Project',
      });
    });
  });

  it('should display error on failure', async () => {
    mockInvoke.mockRejectedValue(new Error('Creation failed'));

    render(<ProjectList />);
    
    const button = screen.getByRole('button', { name: /create/i });
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText(/creation failed/i)).toBeInTheDocument();
    });
  });
});
```

## IPC Testing

Test IPC communication contracts:

```typescript
describe('IPC: project:create', () => {
  it('should validate request payload', async () => {
    const invalidPayload = { name: '' }; // Empty name
    
    await expect(
      handleProjectCreate(invalidPayload)
    ).rejects.toThrow('Validation failed');
  });

  it('should create project and return response', async () => {
    const payload = {
      name: 'Test Project',
      description: 'Test description',
    };

    const response = await handleProjectCreate(payload);

    expect(response).toMatchObject({
      id: expect.any(String),
      name: payload.name,
      description: payload.description,
      createdAt: expect.any(Date),
    });
  });

  it('should handle database errors', async () => {
    // Mock database failure
    vi.spyOn(prisma.project, 'create').mockRejectedValue(
      new Error('Database error')
    );

    await expect(
      handleProjectCreate({ name: 'Test' })
    ).rejects.toThrow('Database error');
  });
});
```

## Database Testing

Use in-memory SQLite for tests:

```typescript
import { PrismaClient } from '@prisma/client';
import { beforeEach, afterEach } from 'vitest';

let prisma: PrismaClient;

beforeEach(async () => {
  prisma = new PrismaClient({
    datasources: { db: { url: 'file::memory:?cache=shared' } },
  });
  
  // Run migrations
  await prisma.$executeRawUnsafe('PRAGMA foreign_keys = ON');
});

afterEach(async () => {
  await prisma.$disconnect();
});

describe('Database Operations', () => {
  it('should create project with chapters', async () => {
    const project = await prisma.project.create({
      data: {
        name: 'Test Project',
        chapters: {
          create: [
            { title: 'Chapter 1', order: 1 },
            { title: 'Chapter 2', order: 2 },
          ],
        },
      },
      include: { chapters: true },
    });

    expect(project.chapters).toHaveLength(2);
  });

  it('should cascade delete chapters', async () => {
    const project = await prisma.project.create({
      data: {
        name: 'Test Project',
        chapters: { create: [{ title: 'Chapter 1', order: 1 }] },
      },
    });

    await prisma.project.delete({ where: { id: project.id } });

    const chapters = await prisma.chapter.findMany({
      where: { projectId: project.id },
    });

    expect(chapters).toHaveLength(0);
  });
});
```

## Integration Testing

Test workflows across multiple components:

```typescript
describe('Project Creation Workflow', () => {
  it('should create project, add chapters, and update metadata', async () => {
    // Create project
    const project = await projectService.create({
      name: 'Integration Test Project',
    });

    // Add chapters
    const chapter1 = await chapterService.create({
      projectId: project.id,
      title: 'Chapter 1',
      order: 1,
    });

    // Update metadata
    const updated = await projectService.update(project.id, {
      description: 'Added chapters',
    });

    // Verify final state
    const final = await projectService.getWithChapters(project.id);
    expect(final.chapters).toHaveLength(1);
    expect(final.description).toBe('Added chapters');
  });
});
```

## E2E Testing

Use Playwright for full application tests:

```typescript
import { test, expect, _electron as electron } from '@playwright/test';

test.describe('Loop E2E', () => {
  test('should create and open project', async () => {
    const app = await electron.launch({ args: ['out/main/index.js'] });
    const page = await app.firstWindow();

    // Create project
    await page.click('[data-testid="new-project-button"]');
    await page.fill('[data-testid="project-name-input"]', 'E2E Test');
    await page.click('[data-testid="create-button"]');

    // Verify project appears
    await expect(page.locator('text=E2E Test')).toBeVisible();

    // Open project
    await page.click('text=E2E Test');
    await expect(page.locator('[data-testid="project-editor"]')).toBeVisible();

    await app.close();
  });
});
```

## Coverage Goals

Aim for:
- **Unit tests**: 80%+ coverage
- **Integration tests**: Critical workflows
- **E2E tests**: Major user journeys

Run coverage:
```bash
pnpm test:coverage
```

## Test Data

Use fixtures for consistent test data:

```typescript
// test/fixtures/projects.ts
export const mockProject = {
  id: 'test-project-1',
  name: 'Test Project',
  description: 'Test description',
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};

export const mockProjects = [mockProject, /* ... */];
```

## Continuous Integration

Tests run automatically on:
- Every commit
- Pull requests
- Before deployment

Failed tests block merging.