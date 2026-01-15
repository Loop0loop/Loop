/**
 * Integration Test Template for Loop
 * Tests full workflows across main and renderer processes
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { _electron as electron } from 'playwright';
import type { ElectronApplication, Page } from 'playwright';

describe('Loop Integration Tests', () => {
  let electronApp: ElectronApplication;
  let page: Page;

  beforeAll(async () => {
    // Launch the Electron app
    electronApp = await electron.launch({
      args: ['out/main/index.js'],
      env: {
        NODE_ENV: 'test',
        DISABLE_HARDWARE_ACCELERATION: 'true',
      },
    });
    
    // Get the first window
    page = await electronApp.firstWindow();
    
    // Wait for app to be ready
    await page.waitForLoadState('domcontentloaded');
  });

  afterAll(async () => {
    await electronApp.close();
  });

  beforeEach(async () => {
    // Reset to initial state if needed
    await page.reload();
    await page.waitForLoadState('domcontentloaded');
  });

  describe('Application Startup', () => {
    it('should initialize all managers successfully', async () => {
      // Test that the app window opens
      expect(await page.title()).toBeTruthy();
      
      // Test that main process is responsive
      const isReady = await page.evaluate(() => {
        return window.electronAPI !== undefined;
      });
      
      expect(isReady).toBe(true);
    });

    it('should load user settings', async () => {
      // Test settings loading workflow
      const settings = await page.evaluate(() => {
        return window.electronAPI.invoke('settings:get-all');
      });
      
      expect(settings).toBeDefined();
      expect(typeof settings).toBe('object');
    });
  });

  describe('Project Management Workflow', () => {
    it('should create a new project', async () => {
      const projectData = {
        name: 'Test Project',
        description: 'Integration test project',
        genre: 'fiction'
      };

      // Create project via IPC
      const project = await page.evaluate((data) => {
        return window.electronAPI.invoke('project:create', data);
      }, projectData);

      expect(project).toBeDefined();
      expect(project.id).toBeTruthy();
      expect(project.name).toBe(projectData.name);
    });

    it('should list projects', async () => {
      const projects = await page.evaluate(() => {
        return window.electronAPI.invoke('project:list');
      });

      expect(Array.isArray(projects)).toBe(true);
    });

    it('should update project settings', async () => {
      // First create a project
      const project = await page.evaluate(() => {
        return window.electronAPI.invoke('project:create', {
          name: 'Update Test Project',
          description: 'Test project for updates'
        });
      });

      // Then update it
      const updateData = { name: 'Updated Project Name' };
      const updatedProject = await page.evaluate((args) => {
        return window.electronAPI.invoke('project:update', {
          id: args.id,
          data: args.updateData
        });
      }, { id: project.id, updateData });

      expect(updatedProject.name).toBe(updateData.name);
    });
  });

  describe('AI Integration Workflow', () => {
    it('should connect to AI services', async () => {
      const aiStatus = await page.evaluate(() => {
        return window.electronAPI.invoke('ai:check-connection');
      });

      // Should have at least one AI service available
      expect(aiStatus.openai || aiStatus.gemini).toBe(true);
    });

    it('should handle AI writing assistance', async () => {
      const prompt = 'Write a short sentence about a cat.';
      
      const response = await page.evaluate((promptText) => {
        return window.electronAPI.invoke('ai:generate-text', {
          prompt: promptText,
          maxTokens: 50
        });
      }, prompt);

      expect(response).toBeDefined();
      expect(typeof response.text).toBe('string');
      expect(response.text.length).toBeGreaterThan(0);
    });
  });

  describe('Data Persistence', () => {
    it('should save and retrieve data', async () => {
      const testData = {
        key: 'integration-test',
        value: { timestamp: Date.now(), test: true }
      };

      // Save data
      await page.evaluate((data) => {
        return window.electronAPI.invoke('storage:set', data);
      }, testData);

      // Retrieve data
      const retrievedData = await page.evaluate((key) => {
        return window.electronAPI.invoke('storage:get', key);
      }, testData.key);

      expect(retrievedData).toEqual(testData.value);
    });

    it('should handle database operations', async () => {
      // Test database connectivity
      const dbStatus = await page.evaluate(() => {
        return window.electronAPI.invoke('database:health-check');
      });

      expect(dbStatus.connected).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid IPC calls gracefully', async () => {
      const result = await page.evaluate(() => {
        return window.electronAPI.invoke('invalid:channel', {})
          .catch(error => ({ error: error.message }));
      });

      expect(result.error).toBeTruthy();
      expect(typeof result.error).toBe('string');
    });

    it('should recover from service errors', async () => {
      // Simulate error condition and test recovery
      const recovery = await page.evaluate(() => {
        return window.electronAPI.invoke('system:recovery-test');
      });

      expect(recovery.recovered).toBe(true);
    });
  });

  describe('Performance Tests', () => {
    it('should handle multiple concurrent IPC calls', async () => {
      const promises = Array.from({ length: 10 }, (_, i) => 
        page.evaluate((index) => {
          return window.electronAPI.invoke('test:concurrent', { id: index });
        }, i)
      );

      const results = await Promise.all(promises);
      
      expect(results).toHaveLength(10);
      results.forEach((result, index) => {
        expect(result.id).toBe(index);
      });
    });

    it('should maintain responsive UI during heavy operations', async () => {
      // Start a heavy operation
      const operationPromise = page.evaluate(() => {
        return window.electronAPI.invoke('test:heavy-operation');
      });

      // Test that UI remains responsive
      await page.click('[data-testid="test-button"]', { timeout: 1000 });
      
      // Wait for operation to complete
      const result = await operationPromise;
      expect(result.completed).toBe(true);
    });
  });
});