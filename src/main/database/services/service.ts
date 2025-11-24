/*
 * Compatibility layer for DatabaseService under the new `src/main/database` tree.
 * PR-01: re-export the existing implementation so callers can migrate gradually.
 */

import * as typedService from './typedService';

export * from './typedService';
export default typedService;

// TODO (PR-03): fully migrate implementation to this directory and remove legacy file
