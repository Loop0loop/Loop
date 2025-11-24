import type { Prisma } from '@prisma/client';
import type { IdeaItem, PlotPoint } from '../../types/project';
import type { ProjectNote } from '../../../shared/types';

type JsonValue = Prisma.JsonValue;
type JsonObject = Prisma.JsonObject;

const ideaCategories: IdeaItem['category'][] = ['character', 'setting', 'plot', 'dialogue', 'theme', 'other'];
const ideaStages: IdeaItem['stage'][] = ['initial', 'developing', 'concrete', 'applied'];
const ideaPriorities: IdeaItem['priority'][] = ['low', 'medium', 'high'];
const plotTypes: PlotPoint['type'][] = ['setup', 'conflict', 'resolution', 'twist', 'climax'];
const plotActs: PlotPoint['act'][] = [1, 2, 3];
const plotImportance: PlotPoint['importance'][] = ['low', 'medium', 'high'];

const isJsonObject = (value: unknown): value is JsonObject =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

const toString = (value: unknown): string | undefined => (typeof value === 'string' ? value : undefined);
const toNumber = (value: unknown): number | undefined => (typeof value === 'number' ? value : undefined);
const toBoolean = (value: unknown): boolean | undefined => (typeof value === 'boolean' ? value : undefined);
const toStringArray = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];

const resolveIdeaCategory = (value: unknown): IdeaItem['category'] | undefined =>
  ideaCategories.includes(value as IdeaItem['category']) ? (value as IdeaItem['category']) : undefined;
const resolveIdeaStage = (value: unknown): IdeaItem['stage'] | undefined =>
  ideaStages.includes(value as IdeaItem['stage']) ? (value as IdeaItem['stage']) : undefined;
const resolveIdeaPriority = (value: unknown): IdeaItem['priority'] | undefined =>
  ideaPriorities.includes(value as IdeaItem['priority']) ? (value as IdeaItem['priority']) : undefined;
const resolvePlotType = (value: unknown): PlotPoint['type'] | undefined =>
  plotTypes.includes(value as PlotPoint['type']) ? (value as PlotPoint['type']) : undefined;
const resolvePlotAct = (value: unknown): PlotPoint['act'] | undefined =>
  plotActs.includes(value as PlotPoint['act']) ? (value as PlotPoint['act']) : undefined;
const resolvePlotImportance = (value: unknown): PlotPoint['importance'] | undefined =>
  plotImportance.includes(value as PlotPoint['importance']) ? (value as PlotPoint['importance']) : undefined;

interface IdeaTags extends JsonObject {
  category?: IdeaItem['category'];
  stage?: IdeaItem['stage'];
  tags?: string[];
  priority?: IdeaItem['priority'];
  connections?: string[];
  attachments?: string[];
  notes?: string;
  isFavorite?: boolean;
}

interface PlotPointTags extends JsonObject {
  act?: PlotPoint['act'];
  type?: PlotPoint['type'];
  characters?: string[];
  location?: string;
  notes?: string;
  order?: number;
  duration?: number;
  importance?: PlotPoint['importance'];
}

const normalizeIdeaTags = (value?: unknown): IdeaTags => {
  if (!isJsonObject(value)) return {};
  const obj = value as JsonObject;
  return {
    category: resolveIdeaCategory(obj.category),
    stage: resolveIdeaStage(obj.stage),
    tags: toStringArray(obj.tags),
    priority: resolveIdeaPriority(obj.priority),
    connections: toStringArray(obj.connections),
    attachments: toStringArray(obj.attachments),
    notes: toString(obj.notes),
    isFavorite: toBoolean(obj.isFavorite),
  };
};

const normalizePlotTags = (value?: unknown): PlotPointTags => {
  if (!isJsonObject(value)) return {};
  const obj = value as JsonObject;
  return {
    act: resolvePlotAct(obj.act),
    type: resolvePlotType(obj.type),
    characters: toStringArray(obj.characters),
    location: toString(obj.location),
    notes: toString(obj.notes),
    order: toNumber(obj.order),
    duration: toNumber(obj.duration),
    importance: resolvePlotImportance(obj.importance),
  };
};

const ideaTagsFromItem = (idea: Omit<IdeaItem, 'id' | 'createdAt' | 'updatedAt'>): IdeaTags => ({
  category: idea.category,
  stage: idea.stage,
  tags: idea.tags,
  priority: idea.priority,
  connections: idea.connections,
  attachments: idea.attachments,
  notes: idea.notes,
  isFavorite: idea.isFavorite,
});

const plotPointTagsFromItem = (plot: Omit<PlotPoint, 'id' | 'createdAt' | 'updatedAt'>): PlotPointTags => ({
  act: plot.act,
  type: plot.type,
  characters: plot.characters,
  location: plot.location,
  notes: plot.notes,
  order: plot.order,
  duration: plot.duration,
  importance: plot.importance,
});

export const projectNoteToIdeaItem = (note: ProjectNote): IdeaItem => {
  const tags = normalizeIdeaTags(note.tags);
  return {
    id: note.id,
    title: note.title,
    content: note.content ?? '',
    category: tags.category ?? 'other',
    stage: tags.stage ?? 'initial',
    tags: tags.tags ?? [],
    priority: tags.priority ?? 'medium',
    connections: tags.connections ?? [],
    attachments: tags.attachments ?? [],
    notes: tags.notes ?? '',
    isFavorite: tags.isFavorite ?? false,
    createdAt: note.createdAt,
    updatedAt: note.updatedAt,
  };
};

export const projectNoteToPlotPoint = (note: ProjectNote): PlotPoint => {
  const tags = normalizePlotTags(note.tags);
  return {
    id: note.id,
    act: tags.act ?? 1,
    title: note.title,
    description: note.content ?? '',
    type: tags.type ?? 'setup',
    characters: tags.characters ?? [],
    location: tags.location,
    notes: tags.notes,
    order: tags.order ?? 0,
    duration: tags.duration,
    importance: tags.importance ?? 'medium',
    createdAt: note.createdAt,
    updatedAt: note.updatedAt,
  };
};

export const ideaCreateInput = (
  projectId: string,
  idea: Omit<IdeaItem, 'id' | 'createdAt' | 'updatedAt'>
): Prisma.ProjectNoteUncheckedCreateInput => ({
  projectId,
  title: idea.title,
  content: idea.content,
  type: 'idea',
  tags: ideaTagsFromItem(idea),
  isPinned: idea.isFavorite,
  sortOrder: 0,
});

export const ideaUpdateInput = (
  updates: Partial<Omit<IdeaItem, 'id' | 'createdAt' | 'updatedAt'>>,
  existingTags: IdeaTags
): Prisma.ProjectNoteUncheckedUpdateInput => {
  const mergedTags: IdeaTags = { ...existingTags };
  if (updates.category) mergedTags.category = updates.category;
  if (updates.stage) mergedTags.stage = updates.stage;
  if (updates.priority) mergedTags.priority = updates.priority;
  if (updates.tags) mergedTags.tags = updates.tags;
  if (updates.connections) mergedTags.connections = updates.connections;
  if (updates.attachments) mergedTags.attachments = updates.attachments;
  if (updates.notes) mergedTags.notes = updates.notes;
  if (updates.isFavorite !== undefined) mergedTags.isFavorite = updates.isFavorite;

  const data: Prisma.ProjectNoteUpdateInput = {
    type: 'idea',
    updatedAt: new Date(),
    tags: mergedTags,
  };

  if (updates.title !== undefined) data.title = updates.title;
  if (updates.content !== undefined) data.content = updates.content;

  return data;
};

export const plotPointCreateInput = (
  projectId: string,
  plot: Omit<PlotPoint, 'id' | 'createdAt' | 'updatedAt'>
): Prisma.ProjectNoteUncheckedCreateInput => ({
  projectId,
  title: plot.title,
  content: plot.description,
  type: 'plot',
  tags: plotPointTagsFromItem(plot),
});

export const plotPointUpdateInput = (
  updates: Partial<Omit<PlotPoint, 'id' | 'createdAt' | 'updatedAt'>>,
  existingTags: PlotPointTags
): Prisma.ProjectNoteUncheckedUpdateInput => {
  const mergedTags: PlotPointTags = { ...existingTags };
  if (updates.act !== undefined) mergedTags.act = updates.act;
  if (updates.type) mergedTags.type = updates.type;
  if (updates.characters) mergedTags.characters = updates.characters;
  if (updates.location) mergedTags.location = updates.location;
  if (updates.notes) mergedTags.notes = updates.notes;
  if (updates.order !== undefined) mergedTags.order = updates.order;
  if (updates.duration !== undefined) mergedTags.duration = updates.duration;
  if (updates.importance) mergedTags.importance = updates.importance;

  const data: Prisma.ProjectNoteUpdateInput = {
    type: 'plot',
    updatedAt: new Date(),
    tags: mergedTags,
  };

  if (updates.title !== undefined) data.title = updates.title;
  if (updates.description !== undefined) data.content = updates.description;

  return data;
};

export const extractIdeaTags = (note: ProjectNote): IdeaTags => normalizeIdeaTags(note.tags);
export const extractPlotPointTags = (note: ProjectNote): PlotPointTags => normalizePlotTags(note.tags);