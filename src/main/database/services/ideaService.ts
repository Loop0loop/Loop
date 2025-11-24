// 🔥 아이디어 서비스 - Prisma 데이터 연동
import type { IdeaItem } from '../../types/project';
import { Logger } from '../../../shared/logger';
import { createSuccess, createError, type Result } from '../../../shared/common';
import { prismaService } from './PrismaService';
import {
    extractIdeaTags,
    ideaCreateInput,
    ideaUpdateInput,
    projectNoteToIdeaItem,
} from '../mappers/projectNoteMapper';

// 🔥 아이디어 서비스
export class IdeaService {
    // 🔥 프로젝트의 모든 아이디어 조회
    static async getIdeasByProject(projectId: string): Promise<Result<IdeaItem[]>> {
        try {
            const client = await prismaService.getClient();
            const ideas = await client.projectNote.findMany({  
                where: {
                    projectId,
                    type: 'idea'
                },
                orderBy: [
                    { sortOrder: 'asc' },
                    { createdAt: 'desc' }
                ]
            });

            const mappedIdeas = ideas.map(projectNoteToIdeaItem);

            Logger.info('IDEA_SERVICE', `프로젝트 아이디어 조회 완료: ${mappedIdeas.length}개`, { projectId });
            return createSuccess(mappedIdeas);
        } catch (error) {
            Logger.error('IDEA_SERVICE', '아이디어 조회 실패', error);
            return createError('아이디어를 불러오는데 실패했습니다.');
        }
    }

    // 🔥 새 아이디어 생성
    static async createIdea(projectId: string, idea: Omit<IdeaItem, 'id' | 'createdAt' | 'updatedAt'>): Promise<Result<IdeaItem>> {
        try {
            const client = await prismaService.getClient();
            
            // IdeaItem을 ProjectNote 모델에 맞게 변환
            const newNote = await client.projectNote.create({
                data: ideaCreateInput(projectId, idea)
            });

            // ProjectNote를 IdeaItem으로 매핑
            const mappedIdea = projectNoteToIdeaItem(newNote);

            Logger.info('IDEA_SERVICE', '아이디어 생성 완료', { id: mappedIdea.id, title: mappedIdea.title });
            return createSuccess(mappedIdea);
        } catch (error) {
            Logger.error('IDEA_SERVICE', '아이디어 생성 실패', error);
            return createError('아이디어를 생성하는데 실패했습니다.');
        }
    }

    // 🔥 아이디어 업데이트
    static async updateIdea(id: string, updates: Partial<Omit<IdeaItem, 'id' | 'createdAt'>>): Promise<Result<IdeaItem>> {
        try {
            const client = await prismaService.getClient();
            
            // 기존 노트 데이터 가져오기
            const existingNote = await client.projectNote.findUnique({
                where: { id }
            });
            
            if (!existingNote) {
                return createError('아이디어를 찾을 수 없습니다.');
            }

            const updateData = ideaUpdateInput(updates, extractIdeaTags(existingNote));
            const updatedNote = await client.projectNote.update({
                where: { id },
                data: updateData,
            });

            const mappedIdea = projectNoteToIdeaItem(updatedNote);
            Logger.info('IDEA_SERVICE', '아이디어 업데이트 완료', { id });
            return createSuccess(mappedIdea);
        } catch (error) {
            Logger.error('IDEA_SERVICE', '아이디어 업데이트 실패', error);
            return createError('아이디어를 수정하는데 실패했습니다.');
        }
    }

    // 🔥 아이디어 삭제
    static async deleteIdea(id: string): Promise<Result<void>> {
        try {
            const client = await prismaService.getClient();
            await client.projectNote.delete({
                where: { id }
            });

            Logger.info('IDEA_SERVICE', '아이디어 삭제 완료', { id });
            return createSuccess(undefined);
        } catch (error) {
            Logger.error('IDEA_SERVICE', '아이디어 삭제 실패', error);
            return createError('아이디어를 삭제하는데 실패했습니다.');
        }
    }

    // 🔥 즐겨찾기 토글
    static async toggleFavorite(id: string): Promise<Result<IdeaItem>> {
        try {
            const client = await prismaService.getClient();
            const note = await client.projectNote.findUnique({ where: { id } });
            if (!note) {
                Logger.error('IDEA_SERVICE', '아이디어를 찾을 수 없음', { id });
                return createError('아이디어를 찾을 수 없습니다.');
            }

            const tagsData = extractIdeaTags(note);
            const currentFavorite = tagsData.isFavorite ?? false;
            
            return this.updateIdea(id, { isFavorite: !currentFavorite });
        } catch (error) {
            Logger.error('IDEA_SERVICE', '즐겨찾기 토글 실패', error);
            return createError('즐겨찾기를 변경하는데 실패했습니다.');
        }
    }
}
