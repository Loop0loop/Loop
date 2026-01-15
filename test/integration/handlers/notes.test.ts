import { describe, it, expect, vi, beforeEach } from 'vitest';
import { registerGetNotesHandler } from '@main/database/handlers/notes/get';
import { registerUpsertNoteHandler } from '@main/database/handlers/notes/upsert';
import { registerUpdateNotesHandler } from '@main/database/handlers/notes/update';
import { prismaService } from '@main/database/services/PrismaService';
import { databaseMutex } from '@main/database/services/DatabaseMutexService';
import { ipcMain } from 'electron';

// Mock dependencies
vi.mock('electron', () => ({
    ipcMain: {
        handle: vi.fn(),
    },
}));

vi.mock('@main/database/services/PrismaService', () => ({
    prismaService: {
        getClient: vi.fn(),
    },
}));

vi.mock('@main/database/services/DatabaseMutexService', () => ({
    databaseMutex: {
        acquireWriteLock: vi.fn((fn) => fn()),
    },
}));

describe('Note Handlers Integration', () => {
    const mockPrisma = {
        projectNote: {
            findMany: vi.fn(),
            upsert: vi.fn(),
            deleteMany: vi.fn(),
            create: vi.fn(),
        },
        $transaction: vi.fn((fn) => fn(mockPrisma)),
    };

    beforeEach(() => {
        vi.clearAllMocks();
        (prismaService.getClient as any).mockResolvedValue(mockPrisma);
    });

    describe('getNotes', () => {
        it('should register handler and return notes', async () => {
            registerGetNotesHandler();
            expect(ipcMain.handle).toHaveBeenCalledWith('projects:get-notes', expect.any(Function));

            const handler = (ipcMain.handle as any).mock.calls.find((call: any) => call[0] === 'projects:get-notes')[1];
            const mockNotes = [{ id: '1', title: 'Test Note' }];
            mockPrisma.projectNote.findMany.mockResolvedValue(mockNotes);

            const result = await handler({}, 'project-1');
            expect(result).toEqual({
                success: true,
                data: mockNotes,
                timestamp: expect.any(Date),
            });
            expect(mockPrisma.projectNote.findMany).toHaveBeenCalledWith({
                where: { projectId: 'project-1' },
                orderBy: { createdAt: 'desc' },
            });
        });
    });

    describe('upsertNote', () => {
        it('should register handler and upsert note', async () => {
            registerUpsertNoteHandler();
            expect(ipcMain.handle).toHaveBeenCalledWith('projects:upsert-note', expect.any(Function));

            const handler = (ipcMain.handle as any).mock.calls.find((call: any) => call[0] === 'projects:upsert-note')[1];
            const mockNote = { id: '1', title: 'Updated Note' };
            mockPrisma.projectNote.upsert.mockResolvedValue(mockNote);

            const result = await handler({}, mockNote);
            expect(result.success).toBe(true);
            expect(result.data).toEqual(expect.objectContaining(mockNote));
        });
    });

    describe('updateNotes', () => {
        it('should register handler and batch update notes', async () => {
            registerUpdateNotesHandler();
            expect(ipcMain.handle).toHaveBeenCalledWith('projects:update-notes', expect.any(Function));

            const handler = (ipcMain.handle as any).mock.calls.find((call: any) => call[0] === 'projects:update-notes')[1];
            const mockNotes = [{ id: '1', title: 'Note 1' }, { id: '2', title: 'Note 2' }];

            mockPrisma.projectNote.create.mockImplementation((args: any) => Promise.resolve(args.data));

            const result = await handler({}, 'project-1', mockNotes);
            expect(result.success).toBe(true);
            expect(mockPrisma.$transaction).toHaveBeenCalled();
            expect(mockPrisma.projectNote.deleteMany).toHaveBeenCalledWith({ where: { projectId: 'project-1' } });
            expect(mockPrisma.projectNote.create).toHaveBeenCalledTimes(2);
        });
    });
});
