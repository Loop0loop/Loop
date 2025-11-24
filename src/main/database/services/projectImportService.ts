import { Logger } from '../../../shared/logger';
import { createSuccess, createError } from '../../../shared/common';
import type { Project } from '../../../shared/types';
import path from 'path';
import { projectService } from './projectService';

export class ProjectImportService {
  private static instance: ProjectImportService | null = null;

  public static getInstance(): ProjectImportService {
    if (!ProjectImportService.instance) ProjectImportService.instance = new ProjectImportService();
    return ProjectImportService.instance;
  }

  private constructor() {}

  public async importFromFile(filePath: string): Promise<{ success: boolean; data?: Project; error?: string }> {
    try {
      Logger.debug('PROJECT_IMPORT_SVC', 'Importing project from file', { filePath });

      const fs = await import('fs/promises');
      const content = await fs.readFile(filePath, 'utf8');
      const fileName = path.basename(filePath, path.extname(filePath));

      const wordCount = content.split(/\s+/).filter(Boolean).length;

      let estimatedGenre = '일반';
      const ext = path.extname(filePath).toLowerCase();
      if (ext === '.md' || ext === '.markdown') estimatedGenre = '기술문서';
      if (fileName.includes('소설') || fileName.includes('novel')) estimatedGenre = '소설';
      if (fileName.includes('블로그') || fileName.includes('blog')) estimatedGenre = '블로그';

      const toCreate = {
        title: fileName,
        description: `가져온 파일: ${path.basename(filePath)} (${wordCount}단어)`,
        content,
        progress: 100,
        wordCount,
        genre: estimatedGenre,
        status: 'completed',
        author: '가져온 파일',
      } as any;

      const created = await projectService.createProject(toCreate);
      if (!created.success) return { success: false, error: created.error };

      return { success: true, data: created.data as Project };
    } catch (err) {
      Logger.error('PROJECT_IMPORT_SVC', 'Failed to import project file', err);
      return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
    }
  }
}

export const projectImportService = ProjectImportService.getInstance();
