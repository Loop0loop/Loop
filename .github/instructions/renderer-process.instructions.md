---
applyTo: "src/renderer/**/*.tsx,src/renderer/**/*.ts"
description: Instructions for Loop's React renderer process development
---

# Renderer Process Development Guidelines

You are working on Loop's React 19 frontend with TailwindCSS v4. This is the UI layer that users interact with, isolated from Node.js for security.

## Architecture Context

The renderer is completely sandboxed and communicates with the main process only through:
- **IPC calls**: Via `window.electronAPI.invoke(channel, payload)`
- **IPC listeners**: Via `window.electronAPI.on(channel, callback)`
- **Preload bridge**: All APIs are exposed through secure contextBridge

Never attempt to use Node.js APIs directly in renderer code.

## Component Structure

Follow Loop's component organization:
```
src/renderer/
├── components/
│   ├── ui/           # Reusable UI components
│   ├── common/       # Shared business components
│   ├── pages/        # Full page components
│   └── [feature]/    # Feature-specific components
├── hooks/            # Custom React hooks
├── stores/           # Zustand state management
└── utils/            # Helper functions
```

## Component Development

Components should:
- Use TypeScript with explicit prop types
- Follow functional component pattern with hooks
- Implement proper error boundaries
- Use React.memo for expensive components
- Follow accessibility best practices (ARIA attributes, keyboard navigation)

Component template:
```typescript
interface ComponentProps {
  className?: string;
  children?: React.ReactNode;
  // ... other props
}

export const Component: React.FC<ComponentProps> = ({ 
  className, 
  children 
}) => {
  return (
    <div className={cn("base-classes", className)}>
      {children}
    </div>
  );
};
```

## Styling with TailwindCSS v4

- Use Tailwind utility classes for styling
- Use `cn()` helper from `@/lib/utils` for conditional classes
- Follow Loop's design system conventions
- Use semantic color names: `bg-background`, `text-foreground`
- Implement responsive design: `md:`, `lg:` breakpoints
- Use dark mode classes when appropriate

## State Management

Loop uses a hybrid state management approach:

**Zustand stores** for client-side state:
- UI state (modals, tabs, selections)
- Temporary data (form inputs, drafts)
- Cache for IPC responses

**Prisma/IPC** for persistent state:
- User settings and preferences
- Project data and content
- Application configuration

Create Zustand stores:
```typescript
import { create } from 'zustand';

interface StoreState {
  value: string;
  setValue: (value: string) => void;
}

export const useStore = create<StoreState>((set) => ({
  value: '',
  setValue: (value) => set({ value }),
}));
```

## IPC Communication

Always use custom hooks for IPC:
```typescript
import { useCallback, useState } from 'react';

export function useProjectData() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchProjects = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const projects = await window.electronAPI.invoke('project:list');
      return projects;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch');
    } finally {
      setLoading(false);
    }
  }, []);

  return { fetchProjects, loading, error };
}
```

## Performance Optimization

- Use `React.memo` for components that receive stable props
- Implement `useMemo` and `useCallback` for expensive computations
- Lazy load routes and heavy components with `React.lazy`
- Debounce user input handlers
- Virtualize long lists with `react-window` or similar
- Optimize images and assets

## Error Handling

Implement error boundaries:
```typescript
class ErrorBoundary extends React.Component<Props, State> {
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    logger.error('React error boundary caught:', { error, errorInfo });
    // Optionally send to error tracking service
  }
  
  render() {
    if (this.state.hasError) {
      return <ErrorFallback />;
    }
    return this.props.children;
  }
}
```

Handle async errors in components:
```typescript
const handleAction = async () => {
  try {
    await window.electronAPI.invoke('action:perform', data);
  } catch (error) {
    toast.error('Action failed');
    console.error('Action error:', error);
  }
};
```

## Form Handling

Use controlled components with proper validation:
```typescript
const [formData, setFormData] = useState({ name: '', email: '' });
const [errors, setErrors] = useState<Record<string, string>>({});

const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  
  // Validate
  const newErrors = validateForm(formData);
  if (Object.keys(newErrors).length > 0) {
    setErrors(newErrors);
    return;
  }
  
  // Submit
  try {
    await window.electronAPI.invoke('form:submit', formData);
  } catch (error) {
    // Handle error
  }
};
```

## Accessibility

- Use semantic HTML elements
- Provide ARIA labels for interactive elements
- Ensure keyboard navigation works properly
- Test with screen readers
- Maintain sufficient color contrast
- Provide focus indicators

## Testing

- Write component tests with React Testing Library
- Test user interactions, not implementation details
- Mock IPC calls in tests
- Test accessibility with axe or similar tools
- Test error states and loading states

## Tiptap Editor Integration

When working with the Tiptap rich text editor:
- Use Loop's custom extensions from `@/components/markdownEditor`
- Follow existing editor configuration patterns
- Implement proper command handlers
- Handle editor state updates efficiently
- Test with various content scenarios