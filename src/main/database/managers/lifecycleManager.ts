/*
 * Compatibility layer for DatabaseManager under the new `src/main/database` tree.
 * PR-01: re-export the existing manager until we replace it with a clearer lifecycle
 * manager implementation.
 */

import { databaseManager } from '../../managers/DatabaseManager';

export { databaseManager };
export default databaseManager;

// TODO: implement a dedicated lifecycle manager in later PRs (PR-04)
