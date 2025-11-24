// Central re-export entry for `src/main/database`
// PR-01 scaffolding — this module exposes a stable surface for downstream code to
// import database-related functionality while we migrate implementations.

export * from './prisma/client';
export * from './services/service';
export * from './managers/lifecycleManager';
export * from './ipc/handlers';

// NOTE
// - This is intentionally lightweight: each file under this directory will
//   be gradually implemented or replaced with fully typed implementations.
// - During the migration we will keep compatibility re-exports in legacy
//   locations so existing imports do not break.
