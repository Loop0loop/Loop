import { Logger } from '../../../../shared/logger';
import { registerGetNotesHandler } from './get';
import { registerUpsertNoteHandler } from './upsert';
import { registerUpdateNotesHandler } from './update';

export function registerNoteHandlers(): void {
    Logger.debug('NOTE_IPC', 'Registering note IPC handlers');

    registerGetNotesHandler();
    registerUpsertNoteHandler();
    registerUpdateNotesHandler();

    Logger.info('NOTE_IPC', '✅ Note IPC handlers registered');
}
