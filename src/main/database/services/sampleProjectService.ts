import { Logger } from '../../../shared/logger';
import { createSuccess, createError } from '../../../shared/common';
import type { Project } from '../../../shared/types';
import { projectService } from './projectService';

export class SampleProjectService {
  private static instance: SampleProjectService | null = null;

  public static getInstance(): SampleProjectService {
    if (!SampleProjectService.instance) SampleProjectService.instance = new SampleProjectService();
    return SampleProjectService.instance;
  }

  private constructor() {}

  public async createSampleProject(): Promise<{ success: boolean; data?: Project; error?: string }> {
    try {
      Logger.debug('SAMPLE_PROJECT_SVC', 'Creating a sample project');

      const sample = {
        title: '나의 첫 번째 소설',
        description: '창작의 첫 걸음을 위한 소설 프로젝트입니다.',
        content: `제1장: 새로운 시작

오늘부터 내 인생의 새로운 챕터가 시작된다.\n키보드 위에서 춤추는 손가락들이 만들어내는 이야기.`,
        genre: '소설',
        progress: 15,
        wordCount: 450,
        author: '새로운 작가',
      } as any;

      const created = await projectService.createProject(sample);
      if (!created.success) return { success: false, error: created.error };

      return { success: true, data: created.data as Project };
    } catch (err) {
      Logger.error('SAMPLE_PROJECT_SVC', 'Failed to create sample project', err);
      return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
    }
  }
}

export const sampleProjectService = SampleProjectService.getInstance();
