import { ipcMain } from 'electron';
import { Logger } from '../../../../shared/logger';
import { IpcResponse, Project } from '../../../../shared/types';
import { sampleProjectService } from '../../services/sampleProjectService';
import { projectImportService } from '../../services/projectImportService';

/**
 * Register non-core project tasks (sample creation, file import)
 */
export function registerProjectToolingHandlers(): void {
  Logger.debug('PROJECT_CRUD_IPC', 'Registering tooling handlers for projects');

  ipcMain.handle('projects:create-sample', async (): Promise<IpcResponse<Project>> => {
    try {
      const created = await sampleProjectService.createSampleProject();
      if (!created.success) return { success: false, error: created.error || 'Failed to create sample', timestamp: new Date() };
      Logger.info('PROJECT_CRUD_IPC', `샘플 프로젝트 생성됨: ${created.data?.title}`);
      return { success: true, data: created.data as Project, timestamp: new Date() };
    } catch (error) {
      Logger.error('PROJECT_CRUD_IPC', 'Failed to create sample project', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error', timestamp: new Date() };
    }
  });

  ipcMain.handle('projects:import-file', async (): Promise<IpcResponse<Project>> => {
    try {
      Logger.debug('PROJECT_CRUD_IPC', 'Starting file import process');

      const { dialog } = require('electron');
      const fs = require('fs').promises;
      const path = require('path');

      const dialogResult = await dialog.showOpenDialog({
        title: 'Loop 프로젝트로 가져올 파일 선택',
        filters: [
          { name: '텍스트 파일', extensions: ['txt', 'md', 'rtf'] },
          { name: 'Markdown 파일', extensions: ['md', 'markdown'] },
          { name: '모든 파일', extensions: ['*'] }
        ],
        properties: ['openFile']
      });

      if (dialogResult.canceled || !dialogResult.filePaths.length) {
        return { success: false, error: '파일이 선택되지 않았습니다.', timestamp: new Date() };
      }

      const filePath = dialogResult.filePaths[0];
      const fileContent = await fs.readFile(filePath, 'utf-8');
      const fileName = path.basename(filePath, path.extname(filePath));
      const fileExtension = path.extname(filePath).toLowerCase();

      const importResult = await projectImportService.importFromFile(filePath);
      if (!importResult.success) return { success: false, error: importResult.error || 'Import failed', timestamp: new Date() };

      Logger.info('PROJECT_CRUD_IPC', `파일 가져오기 완료: ${fileName}`, { filePath, wordCount: fileContent.split(/\s+/).filter((w: string) => w.length > 0).length, genre: importResult.data?.genre });
      return { success: true, data: importResult.data as Project, timestamp: new Date() };
    } catch (error) {
      Logger.error('PROJECT_CRUD_IPC', 'Failed to import project file', error);
      return { success: false, error: error instanceof Error ? error.message : '파일 가져오기 중 오류가 발생했습니다.', timestamp: new Date() };
    }
  });

  Logger.info('PROJECT_CRUD_IPC', '✅ Project tooling handlers registered');
}
