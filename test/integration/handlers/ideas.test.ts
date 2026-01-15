import { describe, it, expect, vi, beforeEach } from 'vitest';
import { registerGetIdeasHandler } from '@main/database/handlers/ideas/get';
import { registerCreateIdeaHandler } from '@main/database/handlers/ideas/create';
import { registerUpdateIdeaHandler } from '@main/database/handlers/ideas/update';
import { registerDeleteIdeaHandler } from '@main/database/handlers/ideas/delete';
import { IdeaService } from '@main/database/services/ideaService';
import { ipcMain } from 'electron';

// Mock dependencies
vi.mock('electron', () => ({
    ipcMain: {
        handle: vi.fn(),
    },
}));

vi.mock('@main/database/services/ideaService', () => ({
    IdeaService: {
        getIdeasByProject: vi.fn(),
        createIdea: vi.fn(),
        updateIdea: vi.fn(),
        deleteIdea: vi.fn(),
    },
}));

describe('Idea Handlers Integration', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('getIdeas', () => {
        it('should register handler and return ideas', async () => {
            registerGetIdeasHandler();
            expect(ipcMain.handle).toHaveBeenCalledWith('projects:get-ideas', expect.any(Function));

            const handler = (ipcMain.handle as any).mock.calls.find((call: any) => call[0] === 'projects:get-ideas')[1];
            const mockIdeas = [{ id: '1', title: 'Test Idea' }];
            (IdeaService.getIdeasByProject as any).mockResolvedValue({ success: true, data: mockIdeas });

            const result = await handler({}, 'project-1');
            expect(result).toEqual({
                success: true,
                data: mockIdeas,
                timestamp: expect.any(Date),
            });
        });
    });

    describe('createIdea', () => {
        it('should register handler and create idea', async () => {
            registerCreateIdeaHandler();
            expect(ipcMain.handle).toHaveBeenCalledWith('projects:create-idea', expect.any(Function));

            const handler = (ipcMain.handle as any).mock.calls.find((call: any) => call[0] === 'projects:create-idea')[1];
            const mockIdea = { title: 'New Idea' };
            const createdIdea = { id: '1', ...mockIdea };
            (IdeaService.createIdea as any).mockResolvedValue({ success: true, data: createdIdea });

            const result = await handler({}, 'project-1', mockIdea);
            expect(result.success).toBe(true);
            expect(result.data).toEqual(createdIdea);
        });
    });

    describe('updateIdea', () => {
        it('should register handler and update idea', async () => {
            registerUpdateIdeaHandler();
            expect(ipcMain.handle).toHaveBeenCalledWith('projects:update-idea', expect.any(Function));

            const handler = (ipcMain.handle as any).mock.calls.find((call: any) => call[0] === 'projects:update-idea')[1];
            const updates = { title: 'Updated Idea' };
            const updatedIdea = { id: '1', ...updates };
            (IdeaService.updateIdea as any).mockResolvedValue({ success: true, data: updatedIdea });

            const result = await handler({}, '1', updates);
            expect(result.success).toBe(true);
            expect(result.data).toEqual(updatedIdea);
        });
    });

    describe('deleteIdea', () => {
        it('should register handler and delete idea', async () => {
            registerDeleteIdeaHandler();
            expect(ipcMain.handle).toHaveBeenCalledWith('projects:delete-idea', expect.any(Function));

            const handler = (ipcMain.handle as any).mock.calls.find((call: any) => call[0] === 'projects:delete-idea')[1];
            (IdeaService.deleteIdea as any).mockResolvedValue({ success: true });

            const result = await handler({}, '1');
            expect(result.success).toBe(true);
        });
    });
});
