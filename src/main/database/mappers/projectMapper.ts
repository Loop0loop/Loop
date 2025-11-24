import type { Project, ProjectCharacter, ProjectNote, ProjectStructure } from '../../../shared/types';

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
