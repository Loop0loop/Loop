export * from './projectCrudHandlers';
export * from './projectIpcHandlers';
export * from './characterHandlers';
export * from './characters';
export * from './dashboardIpcHandlers';
export * from './dashboard';
export * from './episodes';
export * from './episodeIpcHandlers';
export * from './ideas';
export * from './notes';
export * from './synopsis-stats';
export * from './projects';

// NOTE: Some handlers live under other directories (e.g. structureHandlers/shellHandlers) and
// are intentionally not re-exported here to avoid circular dependencies. Add them later if
// we consolidate into a single handlers surface.
