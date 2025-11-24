import { ipcMain, IpcMainInvokeEvent } from 'electron';
import { Logger } from '../../../../shared/logger';
import { IpcResponse, ProjectNote } from '../../../../shared/types';
import { prismaService } from '../../services/PrismaService';
import { databaseMutex } from '../../services/DatabaseMutexService';

export function registerUpsertNoteHandler(): void {
    ipcMain.handle('projects:upsert-note', async (_event: IpcMainInvokeEvent, note: Partial<ProjectNote>): Promise<IpcResponse<ProjectNote>> => {
        try {
            const upsertedNote = await databaseMutex.acquireWriteLock(async () => {
                const prisma = await prismaService.getClient();

                return await prisma.projectNote.upsert({
                    where: { id: note.id || '' },
                    update: {
                        title: note.title,
                        content: note.content,
                        type: note.type,
                        tags: note.tags || [],
                        color: note.color,
                        isPinned: note.isPinned,
                        isArchived: note.isArchived,
                        sortOrder: note.sortOrder,
                        updatedAt: new Date(),
                    },
                    create: {
                        id: note.id || '',
                        projectId: note.projectId || '',
                        title: note.title || '',
                        content: note.content || '',
                        type: note.type,
                        tags: note.tags || [],
                        color: note.color,
                        isPinned: note.isPinned || false,
                        isArchived: note.isArchived || false,
                        sortOrder: note.sortOrder || 0,
                        createdAt: note.createdAt || new Date(),
                        updatedAt: new Date(),
                    },
                });
            });

            // ProjectNote 타입으로 변환
            const convertedNote: ProjectNote = {
                id: upsertedNote.id,
                projectId: upsertedNote.projectId,
                title: upsertedNote.title,
                content: upsertedNote.content,
                type: upsertedNote.type || undefined,
                tags: Array.isArray(upsertedNote.tags) ? upsertedNote.tags as string[] : undefined,
                color: upsertedNote.color || undefined,
                isPinned: upsertedNote.isPinned || false,
                isArchived: upsertedNote.isArchived || false,
                sortOrder: upsertedNote.sortOrder || 0,
                createdAt: upsertedNote.createdAt,
                updatedAt: upsertedNote.updatedAt,
            };

            Logger.info('NOTE_IPC', '✅ Note upserted successfully', { id: convertedNote.id });

            return {
                success: true,
                data: convertedNote,
                timestamp: new Date(),
            };
        } catch (error) {
            Logger.error('NOTE_IPC', 'Failed to upsert note', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
                timestamp: new Date(),
            };
        }
    });
}
