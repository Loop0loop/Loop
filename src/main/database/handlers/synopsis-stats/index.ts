import { Logger } from '../../../../shared/logger';
import { registerSynopsisWritingHandlers } from './writingHandlers';
import { registerGetProgressTimelineHandler } from './timelineHandlers';
import { registerGetEpisodeStatsHandler } from './statsHandlers';
import { registerGetDashboardSummaryHandler } from './dashboardHandlers';

const SYNOPSIS_STATS_HANDLER = Symbol.for('SYNOPSIS_STATS_HANDLER');

export function registerSynopsisStatsHandlers() {
    registerSynopsisWritingHandlers();
    registerGetProgressTimelineHandler();
    registerGetEpisodeStatsHandler();
    registerGetDashboardSummaryHandler();

    Logger.info(SYNOPSIS_STATS_HANDLER, 'Synopsis Stats IPC handlers registered');
}
