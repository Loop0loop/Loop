import { useCallback, useEffect, useState } from 'react';

/**
 * Template for IPC communication hooks in Loop renderer process
 * Provides type-safe communication with main process
 */
export function useLoopIPC<T, R = void>(
  channel: string,
  initialData?: T
) {
  const [data, setData] = useState<T | undefined>(initialData);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const invoke = useCallback(async (payload?: R): Promise<T | undefined> => {
    try {
      setLoading(true);
      setError(null);
      
      // Type-safe IPC call through preload
      const result = await window.electronAPI?.invoke(channel, payload);
      setData(result);
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      console.error(`IPC Error on channel ${channel}:`, err);
    } finally {
      setLoading(false);
    }
  }, [channel]);

  const listen = useCallback((callback: (data: T) => void) => {
    return window.electronAPI?.on(channel, callback);
  }, [channel]);

  const removeListener = useCallback(() => {
    window.electronAPI?.removeAllListeners(channel);
  }, [channel]);

  useEffect(() => {
    return () => {
      removeListener();
    };
  }, [removeListener]);

  return {
    data,
    loading,
    error,
    invoke,
    listen,
    removeListener
  };
}

// Usage example:
// const { data, loading, error, invoke } = useLoopIPC<UserSettings, { key: string }>('settings:get');
//
// const handleGetSettings = async () => {
//   await invoke({ key: 'theme' });
// };