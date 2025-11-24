import type { Project, ProjectCharacter, ProjectNote, ProjectStructure } from '../../../shared/types';
import {
  isValidGenre,
  isValidProjectStatus,
  isValidStructureStatus,
} from '../../../shared/constants/enums';

// helpers for converting prisma results -> domain types
export function normalizeGenre(value?: string | null) {
  if (typeof value === 'string' && isValidGenre(value)) return value;
  return 'unknown';
}

export function normalizeStatus(value?: string | null) {
  if (typeof value === 'string' && isValidProjectStatus(value)) return value;
  return 'active';
}

export function normalizeStructureStatus(value?: string | null) {
  if (typeof value === 'string' && isValidStructureStatus(value)) return value;
  return 'draft';
}

export function toProjectStructure(structure: any): ProjectStructure {
  return {
    id: structure.id,
    projectId: structure.projectId,
    type: structure.type,
    title: structure.title,
    description: structure.description ?? undefined,
    content: structure.content ?? undefined,
    status: normalizeStructureStatus(structure.status),
    wordCount: structure.wordCount ?? 0,
    sortOrder: structure.sortOrder ?? 0,
    parentId: structure.parentId ?? undefined,
    depth: structure.depth ?? 0,
    color: structure.color ?? '#6b7280',
    isActive: structure.isActive ?? true,
    createdAt: structure.createdAt,
    updatedAt: structure.updatedAt,
  };
}

export function mapProjectStructures(structures?: any[]): ProjectStructure[] {
  return (structures ?? []).map(toProjectStructure);
}

export function mapPrismaProjectToDomain(project: any): Project {
  return {
    id: project.id,
    title: project.title,
    description: project.description || '',
    content: project.content || '',
    chapters: project.chapters ?? undefined,
    progress: project.progress || 0,
    wordCount: project.wordCount || 0,
    lastModified: project.lastModified,
    createdAt: project.createdAt,
    updatedAt: project.lastModified,
    genre: normalizeGenre(project.genre),
    status: normalizeStatus(project.status),
    author: project.author || '사용자',
    characters: project.characters ?? [],
    structure: mapProjectStructures(project.structure),
    notes: project.notes ?? [],
  } as Project;
}

/** Map domain Project -> Prisma create/update shapes (runtime objects) */
export function mapProjectBase(project: Project) {
  return {
    id: project.id,
    title: project.title,
    content: project.content ?? null,
    wordCount: project.wordCount ?? 0,
    progress: project.progress ?? 0,
    lastModified: project.lastModified ? new Date(project.lastModified) : new Date(),
    // preserve any other basic fields if present
  } as const;
}

export function mapCharacterCreate(character: ProjectCharacter, projectId: string) {
  return {
    id: character.id,
    name: character.name,
    description: character.description ?? null,
    role: character.role ?? '',
    projectId,
  };
}

export function mapStructureCreate(item: ProjectStructure, projectId: string) {
  return {
    id: item.id,
    projectId,
    type: item.type,
    title: item.title,
    description: item.description ?? null,
    content: item.content ?? null,
    status: item.status ?? 'draft',
    wordCount: item.wordCount ?? 0,
    sortOrder: item.sortOrder ?? 0,
    parentId: item.parentId ?? null,
    depth: item.depth ?? 0,
  };
}

export function mapNoteCreate(note: ProjectNote, projectId: string) {
  return {
    id: note.id,
    projectId,
    title: note.title,
    content: note.content ?? '',
    type: note.type ?? 'note',
    tags: (note as any).tags ?? null,
  };
}

export default {
  mapProjectBase,
  mapCharacterCreate,
  mapStructureCreate,
  mapNoteCreate,
};
