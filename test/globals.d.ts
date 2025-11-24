// Global type augmentations used by tests
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeValidSettingsSchema(): R;
      toBeValidIpcChannel(): R;
    }
  }
}

export {};
