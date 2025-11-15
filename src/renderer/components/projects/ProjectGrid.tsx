'use client';

// 프로젝트 검색 및 관리 컴포넌트}|

import React, { useState, useMemo } from 'react';
import { Search, Plus, Filter, SortAsc, SortDesc, Upload, FileText } from 'lucide-react';
import { ProjectCard, type ProjectData } from './ProjectCard';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Badge } from '../ui/Badge';
import { Logger } from '../../../shared/logger';

const PROJECT_GRID_STYLES = {
  container: 'space-y-8',
  grid: 'grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',
  emptyState: 'col-span-full text-center py-16',
  emptyStateIcon: 'w-20 h-20 mx-auto text-foreground/30 mb-6',
  emptyStateTitle: 'text-2xl font-bold text-foreground mb-2',
  emptyStateDescription: 'text-foreground/60 mb-8 text-lg',
} as const;

// 🔥 기가차드 규칙: 명시적 타입 정의
type SortField = 'title' | 'createdAt' | 'updatedAt' | 'progress';
type SortOrder = 'asc' | 'desc';
type StatusFilter = 'all' | ProjectData['status'];

export interface ProjectGridProps {
  readonly projects: readonly ProjectData[];
  readonly loading?: boolean;
  readonly onViewProject?: (project: ProjectData) => void;
  readonly onEditProject?: (project: ProjectData) => void;
  readonly onShareProject?: (project: ProjectData) => void;
  readonly onDeleteProject?: (project: ProjectData) => void;
  readonly showCreateButton?: boolean;
}

export function ProjectGrid({
  projects,
  loading = false,
  onViewProject,
  onEditProject,
  onShareProject,
  onDeleteProject,
  showCreateButton = true,
}: ProjectGridProps): React.ReactElement {

  // 🔥 기가차드 규칙: 메모화로 성능 최적화
  const filteredAndSortedProjects = useMemo(() => {
    return [...projects].sort((a, b) => {
      return b.updatedAt.getTime() - a.updatedAt.getTime();
    });
  }, [projects]);

  const projectStats = useMemo(() => {
    const total = projects.length;
    const active = projects.filter(p => p.status === 'active').length;
    const completed = projects.filter(p => p.status === 'completed').length;
    const paused = projects.filter(p => p.status === 'paused').length;

    return { total, active, completed, paused };
  }, [projects]);

  if (loading) {
    return (
      <div className={PROJECT_GRID_STYLES.container}>
        <div className={PROJECT_GRID_STYLES.emptyState}>
          <div className={PROJECT_GRID_STYLES.emptyStateTitle}>로딩 중...</div>
        </div>
      </div>
    );
  }

  return (
    <div className={PROJECT_GRID_STYLES.container} role="main" aria-label="프로젝트 목록" data-tour="projects-container">

      {/* 프로젝트 그리드 */}
      {filteredAndSortedProjects.length > 0 ? (
        <div
          className={PROJECT_GRID_STYLES.grid}
          role="grid"
          aria-label={`${filteredAndSortedProjects.length}개의 프로젝트`}
        >
          {filteredAndSortedProjects.map((project) => (
            <div key={project.id} role="gridcell">
              <ProjectCard
                project={project}
                onView={onViewProject}
                onEdit={onEditProject}
                onShare={onShareProject}
                onDelete={onDeleteProject}
              />
            </div>
          ))}
        </div>
      ) : (
        <div className={PROJECT_GRID_STYLES.emptyState}>
          <div className={PROJECT_GRID_STYLES.emptyStateIcon}>
            <Plus />
          </div>
          <h3 className={PROJECT_GRID_STYLES.emptyStateTitle}>
            아직 프로젝트가 없습니다
          </h3>
          <p className={PROJECT_GRID_STYLES.emptyStateDescription}>
            새 프로젝트를 만들어서 시작해보세요.
          </p>
        </div>
      )}
    </div>
  );
}
