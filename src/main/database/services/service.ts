/*
 * Compatibility layer for DatabaseService under the new `src/main/database` tree.
 * PR-01: re-export the existing implementation so callers can migrate gradually.
 */

import databaseService from '../../services/databaseService';

export { databaseService };
export default databaseService;

// TODO: replace with strongly typed implementation in PR-03
