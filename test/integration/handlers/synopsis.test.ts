import { describe, it, expect, vi, beforeEach } from 'vitest';
import { registerGetProgressTimelineHandler } from '@main/database/handlers/synopsis-stats/timelineHandlers';
import { registerGetEpisodeStatsHandler } from '@main/database/handlers/synopsis-stats/statsHandlers';
import { registerGetDashboardSummaryHandler } from '@main/database/handlers/synopsis-stats/dashboardHandlers';
import { prismaService } from '@main/database/services/PrismaService';
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

describe('Synopsis Stats Handlers Integration', () => {
    const mockPrisma = {
        writingActivity: {
            findMany: vi.fn(),
        },
        projectStructure: {
            findMany: vi.fn(),
        },
        episode: {
            findMany: vi.fn(),
        },
        projectCharacter: {
            count: vi.fn(),
        },
        projectNote: {
            findMany: vi.fn(),
        },
    };

    beforeEach(() => {
        vi.clearAllMocks();
        (prismaService.getClient as any).mockResolvedValue(mockPrisma);
    });

    describe('getProgressTimeline', () => {
        it('should register handler and return timeline', async () => {
            registerGetProgressTimelineHandler();
            expect(ipcMain.handle).toHaveBeenCalledWith('synopsis:getProgressTimeline', expect.any(Function));

            const handler = (ipcMain.handle as any).mock.calls.find((call: any) => call[0] === 'synopsis:getProgressTimeline')[1];
            mockPrisma.writingActivity.findMany.mockResolvedValue([
                { date: new Date('2023-01-01'), wordCount: 100 },
                { date: new Date('2023-01-02'), wordCount: 200 },
            ]);

            const result = await handler({}, 'project-1', 7);
            expect(result).toHaveLength(7); // Default 7 days + padding logic
            // Note: Exact validation depends on date utils, but we check structure
            expect(result[0]).toHaveProperty('date');
            expect(result[0]).toHaveProperty('words');
        });
    });

    describe('getEpisodeStats', () => {
        it('should register handler and return stats', async () => {
            registerGetEpisodeStatsHandler();
            expect(ipcMain.handle).toHaveBeenCalledWith('synopsis:getEpisodeStats', expect.any(Function));

            const handler = (ipcMain.handle as any).mock.calls.find((call: any) => call[0] === 'synopsis:getEpisodeStats')[1];
            mockPrisma.projectStructure.findMany.mockResolvedValue([
                { status: 'planned', wordCount: 1000 },
            ]);

            const result = await handler({}, 'project-1');
            expect(result).toHaveLength(5); // 5 acts
            expect(result[0].act).toBe('도입');
        });
    });

    describe('getDashboardSummary', () => {
        it('should register handler and return summary', async () => {
            registerGetDashboardSummaryHandler();
            expect(ipcMain.handle).toHaveBeenCalledWith('synopsis:getDashboardSummary', expect.any(Function));

            const handler = (ipcMain.handle as any).mock.calls.find((call: any) => call[0] === 'synopsis:getDashboardSummary')[1];

            mockPrisma.projectStructure.findMany.mockResolvedValue([]);
            mockPrisma.episode.findMany.mockResolvedValue([]);
            mockPrisma.projectCharacter.count.mockResolvedValue(5);
            mockPrisma.projectNote.findMany.mockResolvedValue([]);

            const result = await handler({}, 'project-1');
            expect(result).toHaveProperty('projectId', 'project-1');
            expect(result).toHaveProperty('characterCount', 5);
        });
    });
});
