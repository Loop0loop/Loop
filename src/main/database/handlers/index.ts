// Handlers barrel file — 재수출(aggregate exports)
// 목적: 단일 import 진입점 제공, 모듈 응집도 향상 및 리팩토링 준비

export * from './projectCrudHandlers';
export * from './projectIpcHandlers';
export * from './characterHandlers';
export * from './dashboardIpcHandlers';
export * from './episodeIpcHandlers';
export * from './ideaHandlers';
export * from './noteHandlers';
export * from './synopsis-stats';
export * from './projects';

// NOTE: Some handlers live under other directories (e.g. structureHandlers/shellHandlers) and
// are intentionally not re-exported here to avoid circular dependencies. Add them later if
// we consolidate into a single handlers surface.
