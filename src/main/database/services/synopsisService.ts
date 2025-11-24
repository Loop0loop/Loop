// 🔥 시놉시스 서비스 - Prisma 데이터 연동
import type { PlotPoint } from '../../types/project';
import { Logger } from '../../../shared/logger';
import { createSuccess, createError, type Result } from '../../../shared/common';
import { prismaService } from './PrismaService';
import {
  extractPlotPointTags,
  plotPointCreateInput,
  plotPointUpdateInput,
  projectNoteToPlotPoint,
} from '../mappers/projectNoteMapper';

// 🔥 시놉시스 서비스
export class SynopsisService {
  // 🔥 프로젝트의 모든 플롯 포인트 조회
  static async getPlotPointsByProject(projectId: string): Promise<Result<PlotPoint[]>> {
    try {
      const client = await prismaService.getClient();
      const plotNotes = await client.projectNote.findMany({
        where: {
          projectId,
          type: 'plot'
        },
        orderBy: [
          { createdAt: 'desc' }
        ]
      });

      const mappedPlots = plotNotes.map(projectNoteToPlotPoint);

      mappedPlots.sort((a, b) => {
        if (a.act !== b.act) return a.act - b.act;
        return a.order - b.order;
      });

      Logger.info('SYNOPSIS_SERVICE', `프로젝트 플롯 포인트 조회 완료: ${mappedPlots.length}개`, { projectId });
      return createSuccess(mappedPlots);
    } catch (error) {
      Logger.error('SYNOPSIS_SERVICE', '플롯 포인트 조회 실패', error);
      return createError('시놉시스를 불러오는데 실패했습니다.');
    }
  }

  // 🔥 특정 막의 플롯 포인트 조회
  static async getPlotPointsByAct(projectId: string, act: 1 | 2 | 3): Promise<Result<PlotPoint[]>> {
    try {
      const client = await prismaService.getClient();
      const plotNotes = await client.projectNote.findMany({
        where: {
          projectId,
          type: 'plot'
        },
        orderBy: [
          { createdAt: 'desc' }
        ]
      });

      const mappedPlots = plotNotes.map(projectNoteToPlotPoint)
        .filter((plot) => plot.act === act)
        .sort((a, b) => a.order - b.order);

      Logger.info('SYNOPSIS_SERVICE', `${act}막 플롯 포인트 조회 완료: ${mappedPlots.length}개`, { projectId, act });
      return createSuccess(mappedPlots);
    } catch (error) {
      Logger.error('SYNOPSIS_SERVICE', '막별 플롯 포인트 조회 실패', error);
      return createError('시놉시스를 불러오는데 실패했습니다.');
    }
  }

  // 🔥 새 플롯 포인트 생성
  static async createPlotPoint(projectId: string, plot: Omit<PlotPoint, 'id' | 'createdAt' | 'updatedAt'>): Promise<Result<PlotPoint>> {
    try {
      const client = await prismaService.getClient();
      
      // PlotPoint를 ProjectNote 모델에 맞게 변환
      const newNote = await client.projectNote.create({
        data: plotPointCreateInput(projectId, plot)
      });

      const mappedPlot = projectNoteToPlotPoint(newNote);

      Logger.info('SYNOPSIS_SERVICE', '플롯 포인트 생성 완료', { id: mappedPlot.id, title: mappedPlot.title });
      return createSuccess(mappedPlot);
    } catch (error) {
      Logger.error('SYNOPSIS_SERVICE', '플롯 포인트 생성 실패', error);
      return createError('플롯 포인트를 생성하는데 실패했습니다.');
    }
  }

  // 🔥 플롯 포인트 업데이트
  static async updatePlotPoint(id: string, updates: Partial<Omit<PlotPoint, 'id' | 'createdAt'>>): Promise<Result<PlotPoint>> {
    try {
      const client = await prismaService.getClient();
      
      // 기존 노트 데이터 가져오기
      const existingNote = await client.projectNote.findUnique({
        where: { id }
      });
      
      if (!existingNote) {
        return createError('플롯 포인트를 찾을 수 없습니다.');
      }

      // 기존 tags 데이터 파싱
      const updateData = plotPointUpdateInput(updates, extractPlotPointTags(existingNote));
      const updatedNote = await client.projectNote.update({
        where: { id },
        data: updateData
      });

      const mappedPlot = projectNoteToPlotPoint(updatedNote);

      Logger.info('SYNOPSIS_SERVICE', '플롯 포인트 업데이트 완료', { id });
      return createSuccess(mappedPlot);
    } catch (error) {
      Logger.error('SYNOPSIS_SERVICE', '플롯 포인트 업데이트 실패', error);
      return createError('플롯 포인트를 수정하는데 실패했습니다.');
    }
  }

  // 🔥 플롯 포인트 삭제
  static async deletePlotPoint(id: string): Promise<Result<void>> {
    try {
      const client = await prismaService.getClient();
      await client.projectNote.delete({
        where: { id }
      });

      Logger.info('SYNOPSIS_SERVICE', '플롯 포인트 삭제 완료', { id });
      return createSuccess(undefined);
    } catch (error) {
      Logger.error('SYNOPSIS_SERVICE', '플롯 포인트 삭제 실패', error);
      return createError('플롯 포인트를 삭제하는데 실패했습니다.');
    }
  }
}
