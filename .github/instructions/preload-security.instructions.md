---
applyTo: "src/preload/**/*.ts"
description: Instructions for Loop's preload security layer
---

# Preload Security Layer Guidelines

You are working on Loop's preload script - the critical security boundary between main and renderer processes.

## Security Purpose

The preload layer:
- **Exposes** safe APIs to renderer through contextBridge
- **Prevents** direct Node.js/Electron API access from renderer
- **Validates** communication between processes
- **Enforces** the principle of least privilege

## Critical Security Rules

**Never expose**:
- Direct Node.js APIs (fs, path, child_process, etc.)
- Electron APIs (remote, desktopCapturer, etc.)
- Database connections or credentials
- File system access without validation
- System-level operations

**Always expose through contextBridge**:
```typescript
import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  // Safe, type-safe IPC communication only
  invoke: (channel: string, data?: unknown) => 
    ipcRenderer.invoke(channel, data),
  
  on: (channel: string, callback: (...args: unknown[]) => void) =>
    ipcRenderer.on(channel, (_, ...args) => callback(...args)),
  
  removeAllListeners: (channel: string) =>
    ipcRenderer.removeAllListeners(channel),
});
```

## Type Safety

Define types for exposed APIs:

```typescript
// In src/preload/index.ts
export interface ElectronAPI {
  invoke<T = unknown>(channel: string, data?: unknown): Promise<T>;
  on(channel: string, callback: (...args: unknown[]) => void): void;
  removeAllListeners(channel: string): void;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
```

## Channel Whitelisting

Consider implementing channel validation:

```typescript
const ALLOWED_CHANNELS = [
  'project:create',
  'project:list',
  'project:update',
  // ... all valid channels
] as const;

contextBridge.exposeInMainWorld('electronAPI', {
  invoke: (channel: string, data?: unknown) => {
    if (!ALLOWED_CHANNELS.includes(channel as any)) {
      throw new Error(`Invalid channel: ${channel}`);
    }
    return ipcRenderer.invoke(channel, data);
  },
});
```

## Data Sanitization

Sanitize data passing between processes:

```typescript
contextBridge.exposeInMainWorld('electronAPI', {
  invoke: async (channel: string, data?: unknown) => {
    // Sanitize input
    const sanitizedData = sanitizeData(data);
    
    // Invoke IPC
    const result = await ipcRenderer.invoke(channel, sanitizedData);
    
    // Sanitize output if needed
    return sanitizeData(result);
  },
});

function sanitizeData(data: unknown): unknown {
  if (data === null || data === undefined) return data;
  
  // Remove functions, symbols, etc.
  return JSON.parse(JSON.stringify(data));
}
```

## Event Listeners

Handle event listeners safely:

```typescript
const listeners = new Map<string, Set<Function>>();

contextBridge.exposeInMainWorld('electronAPI', {
  on: (channel: string, callback: Function) => {
    if (!listeners.has(channel)) {
      listeners.set(channel, new Set());
      
      ipcRenderer.on(channel, (_, ...args) => {
        listeners.get(channel)?.forEach(cb => cb(...args));
      });
    }
    
    listeners.get(channel)?.add(callback);
  },
  
  off: (channel: string, callback: Function) => {
    listeners.get(channel)?.delete(callback);
    
    if (listeners.get(channel)?.size === 0) {
      ipcRenderer.removeAllListeners(channel);
      listeners.delete(channel);
    }
  },
});
```

## Error Handling

Never expose stack traces or system information:

```typescript
contextBridge.exposeInMainWorld('electronAPI', {
  invoke: async (channel: string, data?: unknown) => {
    try {
      return await ipcRenderer.invoke(channel, data);
    } catch (error) {
      // Don't expose internal error details
      throw new Error('Operation failed');
    }
  },
});
```

## Testing Preload Security

Test that renderer cannot access restricted APIs:

```typescript
describe('Preload Security', () => {
  it('should not expose Node.js APIs', () => {
    expect(window.require).toBeUndefined();
    expect(window.process).toBeUndefined();
    expect(window.Buffer).toBeUndefined();
  });
  
  it('should not expose Electron APIs', () => {
    expect(window.electron).toBeUndefined();
    expect(window.ipcRenderer).toBeUndefined();
  });
  
  it('should only expose electronAPI', () => {
    expect(window.electronAPI).toBeDefined();
    expect(window.electronAPI.invoke).toBeDefined();
    expect(window.electronAPI.on).toBeDefined();
  });
});
```

## Performance Considerations

- Minimize synchronous operations
- Avoid blocking the renderer process
- Use buffering for high-frequency events
- Implement debouncing for user input events

## Documentation

Document all exposed APIs:

```typescript
/**
 * Secure API bridge between renderer and main process.
 * All communication must go through these type-safe methods.
 */
export interface ElectronAPI {
  /**
   * Invokes an IPC handler in the main process.
   * @param channel - IPC channel name (e.g., 'project:create')
   * @param data - Optional payload data
   * @returns Promise resolving to handler response
   */
  invoke<T = unknown>(channel: string, data?: unknown): Promise<T>;
  
  /**
   * Registers a listener for IPC events from main process.
   * @param channel - IPC channel name
   * @param callback - Function to call when event is received
   */
  on(channel: string, callback: (...args: unknown[]) => void): void;
  
  /**
   * Removes all listeners for a specific channel.
   * @param channel - IPC channel name
   */
  removeAllListeners(channel: string): void;
}
```

## Best Practices

1. **Minimize exposed surface area** - Only expose what's absolutely necessary
2. **Use type-safe contracts** - Define interfaces for all exposed APIs
3. **Validate all inputs** - Never trust data from renderer
4. **Log security events** - Track unusual access patterns
5. **Review regularly** - Audit preload code for security issues
6. **Follow Electron security guidelines** - Stay updated with best practices