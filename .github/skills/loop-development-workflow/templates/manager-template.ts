/**
 * Template for creating new managers in Loop's main process
 * Follows Loop's singleton pattern and ApplicationBootstrapper integration
 */

export abstract class BaseManager {
  protected initialized: boolean = false;
  protected active: boolean = false;

  abstract getName(): string;

  async initialize(): Promise<void> {
    if (this.initialized) return;
    
    try {
      await this.onInitialize();
      this.initialized = true;
      console.log(`${this.getName()} initialized successfully`);
    } catch (error) {
      console.error(`Failed to initialize ${this.getName()}:`, error);
      throw error;
    }
  }

  async start(): Promise<void> {
    if (!this.initialized) {
      throw new Error(`${this.getName()} must be initialized before starting`);
    }
    
    if (this.active) return;
    
    try {
      await this.onStart();
      this.active = true;
      console.log(`${this.getName()} started successfully`);
    } catch (error) {
      console.error(`Failed to start ${this.getName()}:`, error);
      throw error;
    }
  }

  async stop(): Promise<void> {
    if (!this.active) return;
    
    try {
      await this.onStop();
      this.active = false;
      console.log(`${this.getName()} stopped successfully`);
    } catch (error) {
      console.error(`Failed to stop ${this.getName()}:`, error);
      throw error;
    }
  }

  async shutdown(): Promise<void> {
    try {
      await this.stop();
      await this.onShutdown();
      this.initialized = false;
      console.log(`${this.getName()} shutdown completed`);
    } catch (error) {
      console.error(`Failed to shutdown ${this.getName()}:`, error);
      throw error;
    }
  }

  isInitialized(): boolean {
    return this.initialized;
  }

  isActive(): boolean {
    return this.active;
  }

  protected abstract onInitialize(): Promise<void>;
  protected abstract onStart(): Promise<void>;
  protected abstract onStop(): Promise<void>;
  protected abstract onShutdown(): Promise<void>;
}

// Example implementation:
export class ExampleManager extends BaseManager {
  private static instance: ExampleManager;
  
  private constructor() {
    super();
  }

  static getInstance(): ExampleManager {
    if (!ExampleManager.instance) {
      ExampleManager.instance = new ExampleManager();
    }
    return ExampleManager.instance;
  }

  getName(): string {
    return 'ExampleManager';
  }

  protected async onInitialize(): Promise<void> {
    // Initialize resources, connections, etc.
  }

  protected async onStart(): Promise<void> {
    // Start active processes, listeners, etc.
  }

  protected async onStop(): Promise<void> {
    // Stop active processes, clean up listeners
  }

  protected async onShutdown(): Promise<void> {
    // Final cleanup, save state, etc.
  }
}

// Register in ApplicationBootstrapper:
// const exampleManager = ExampleManager.getInstance();
// await this.managerCoordinator.registerManager(exampleManager);