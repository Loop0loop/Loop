import { Logger } from '../../../../shared/logger';
import { registerGetIdeasHandler } from './get';
import { registerCreateIdeaHandler } from './create';
import { registerUpdateIdeaHandler } from './update';
import { registerDeleteIdeaHandler } from './delete';

export function registerIdeaHandlers(): void {
    Logger.debug('IDEA_IPC', 'Registering idea IPC handlers');

    registerGetIdeasHandler();
    registerCreateIdeaHandler();
    registerUpdateIdeaHandler();
    registerDeleteIdeaHandler();

    Logger.info('IDEA_IPC', '✅ Idea IPC handlers registered');
}
