import { ipcMain, IpcMainInvokeEvent } from 'electron';
import { Logger } from '../../../../shared/logger';
import { IpcResponse, ProjectNote } from '../../../../shared/types';
import { prismaService } from '../../services/PrismaService';
import { databaseMutex } from '../../services/DatabaseMutexService';

export function registerUpdateNotesHandler(): void {
    ipcMain.handle('projects:update-notes', async (_event: IpcMainInvokeEvent, projectId: string, notes: ProjectNote[]): Promise<IpcResponse<ProjectNote[]>> => {
        try {
            Logger.debug('NOTE_IPC', 'Updating project notes', { projectId, count: notes.length });

            const convertedNotes = await databaseMutex.acquireWriteLock(async () => {
                const prisma = await prismaService.getClient();

                // 🔥 트랜잭션: 삭제 + 생성을 원자성으로 보장
                return await prisma.$transaction(async (tx: any) => {
                    // Step 1: 기존 노트들 삭제
                    await tx.projectNote.deleteMany({
                        where: { projectId }
                    });

                    // Step 2: 새 노트들 생성 (순차 처리로 안정성 보장)
                    const createdNotes = [];
                    for (const note of notes) {
                        const created = await tx.projectNote.create({
                            data: {
                                id: note.id,
                                projectId: note.projectId,
                                title: note.title || '',
                                content: note.content || '',
                                type: note.type,
                                tags: Array.isArray(note.tags) ? note.tags : note.tags || [],
                                color: note.color,
                                isPinned: note.isPinned ?? false,
                                isArchived: note.isArchived ?? false,
                                sortOrder: note.sortOrder || 0,
                                createdAt: note.createdAt || new Date(),
                                updatedAt: new Date(),
                            }
                        });
                        createdNotes.push(created);
                    }

                    return createdNotes.map(note => ({
                        id: note.id,
                        projectId: note.projectId,
                        title: note.title,
                        content: note.content || '',
                        type: note.type || undefined,
                        tags: Array.isArray(note.tags)
                            ? (note.tags as string[])
                            : (typeof note.tags === 'string' ? note.tags.split(',').map((t: string) => t.trim()) : undefined),
                        color: note.color || undefined,
                        isPinned: typeof note.isPinned === 'boolean' ? note.isPinned : false,
                        isArchived: typeof note.isArchived === 'boolean' ? note.isArchived : false,
                        sortOrder: note.sortOrder || 0,
                        createdAt: note.createdAt,
                        updatedAt: note.updatedAt,
                    }));
                });
            });

            Logger.info('NOTE_IPC', `✅ Notes updated successfully`, { count: convertedNotes.length });

            return {
                success: true,
                data: convertedNotes,
                timestamp: new Date(),
            };
        } catch (error) {
            Logger.error('NOTE_IPC', 'Failed to update notes', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
                timestamp: new Date(),
            };
        }
    });
}
