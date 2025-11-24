'use strict';

// 🔥 MIGRATION SHIM: Re-export 도메인별 핸들러
// 기존 import 경로 유지를 위한 임시 shim 파일
// TODO: 모든 코드베이스가 새 경로로 마이그레이션되면 이 파일 삭제

import { registerProjectCrudHandlers } from './projectCrudHandlers';
import { registerCharacterHandlers } from './characterHandlers';
import { registerStructureHandlers } from '../../handlers/structureHandlers';
import { registerNoteHandlers } from './noteHandlers';
import { registerIdeaHandlers } from './ideaHandlers';
import { registerShellHandlers } from '../../handlers/shellHandlers';
import { Logger } from '../../../shared/logger';

/**
 * 🔥 프로젝트 IPC 핸들러 설정 - 도메인별 분리
 * 
 * 이 함수는 6개 도메인 핸들러를 모두 등록합니다:
 * - projectCrudHandlers (7 handlers)
 * - characterHandlers (4 handlers)
 * - structureHandlers (3 handlers)
 * - noteHandlers (3 handlers)
 * - ideaHandlers (4 handlers)
 * - shellHandlers (1 handler)
 * 
 * Total: 22 IPC handlers
 */
export function setupProjectIpcHandlers(): void {
  Logger.debug('PROJECT_IPC_SHIM', 'Setting up all project IPC handlers via domain modules');

  registerProjectCrudHandlers();
  registerCharacterHandlers();
  registerStructureHandlers();
  registerNoteHandlers();
  registerIdeaHandlers();
  registerShellHandlers();

  Logger.info('PROJECT_IPC_SHIM', '✅ All 22 project IPC handlers registered via domain modules');
}
