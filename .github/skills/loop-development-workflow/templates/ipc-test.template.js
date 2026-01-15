/**
 * IPC Test Helper Template for Loop
 * Provides utilities for testing type-safe IPC communication
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';

// Mock electron APIs
const mockElectronAPI = {
  invoke: vi.fn(),
  on: vi.fn(),
  removeAllListeners: vi.fn(),
};

// Setup global mocks
beforeEach(() => {
  global.window = {
    electronAPI: mockElectronAPI,
  } as any;
  
  vi.clearAllMocks();
});

afterEach(() => {
  vi.resetAllMocks();
});

/**
 * Test helper for IPC communication patterns
 */
export class IPCTestHelper {
  static async testChannel<TRequest, TResponse>(
    channel: string,
    request: TRequest,
    expectedResponse: TResponse
  ) {
    // Setup mock response
    mockElectronAPI.invoke.mockResolvedValueOnce(expectedResponse);
    
    // Make the call
    const result = await window.electronAPI.invoke(channel, request);
    
    // Assertions
    expect(mockElectronAPI.invoke).toHaveBeenCalledWith(channel, request);
    expect(result).toEqual(expectedResponse);
    
    return result;
  }

  static setupChannelListener<TData>(
    channel: string,
    testData: TData
  ) {
    const mockCallback = vi.fn();
    
    mockElectronAPI.on.mockImplementation((ch, callback) => {
      if (ch === channel) {
        // Simulate receiving data
        setTimeout(() => callback(testData), 0);
        return mockCallback;
      }
    });
    
    return mockCallback;
  }

  static expectChannelCall(channel: string, data?: any) {
    if (data !== undefined) {
      expect(mockElectronAPI.invoke).toHaveBeenCalledWith(channel, data);
    } else {
      expect(mockElectronAPI.invoke).toHaveBeenCalledWith(channel);
    }
  }

  static expectNoChannelCall(channel: string) {
    expect(mockElectronAPI.invoke).not.toHaveBeenCalledWith(
      expect.stringContaining(channel)
    );
  }
}

// Example usage:
describe('IPC Communication Tests', () => {
  it('should handle settings:get channel', async () => {
    const request = { key: 'theme' };
    const response = { theme: 'dark' };
    
    await IPCTestHelper.testChannel('settings:get', request, response);
  });

  it('should handle project:list channel', async () => {
    const projects = [
      { id: '1', name: 'My Novel' },
      { id: '2', name: 'Short Stories' }
    ];
    
    const result = await IPCTestHelper.testChannel('project:list', undefined, projects);
    
    expect(result).toHaveLength(2);
    expect(result[0]).toHaveProperty('id');
    expect(result[0]).toHaveProperty('name');
  });

  it('should handle real-time updates', () => {
    const updateData = { progress: 75 };
    
    const callback = IPCTestHelper.setupChannelListener('project:progress', updateData);
    
    // Test that the listener was set up
    expect(mockElectronAPI.on).toHaveBeenCalledWith('project:progress', expect.any(Function));
  });
});