// 🔥 useEditorState Hook - ProjectEditor 모든 상태를 통합 관리
// Step 1 리팩토링: useProjectEditorState, useUIState, useSettings 통합
// 책임: 에디터, UI, 모달, 설정 상태를 하나의 훅에서 관리

'use client';

import { useEffect } from 'react';
import { useProjectEditorState } from './useProjectEditorState';
import { useUIState } from '../../../hooks/useUIState';
import { useSettings } from '../../../../../app/settings/hooks/useSettings';
import { RendererLogger as Logger } from '../../../../../../shared/logger-renderer';
import { projectEditorStateService } from '../services/ProjectEditorStateService';

// 🔥 통합 Editor State 인터페이스
export interface EditorState {
  // ============ Tab & Editor 상태 ============
  tabs: any[]; // EditorTab[]
  activeTabId: string;
  tabHistory: string[];
  tabMetadataCache: Record<string, any>;
  nextTabOrder: number;

  // ============ View 상태 ============
  currentView: string;
  currentSubView: string;
  editingItemId: string;

  // ============ UI 상태 (Sidebar, Panel) ============
  collapsed: boolean; // 프로젝트 사이드바
  showRightSidebar: boolean;
  showLeftSidebar: boolean; // 앱 좌측 사이드바

  // ============ Modal 상태 (5개) ============
  showDeleteDialog: boolean;
  showShareDialog: boolean;
  showNewChapterModal: boolean;
  showNewCharacterModal: boolean;
  showNewNoteModal: boolean;
  showChapterDeleteDialog: boolean;
  chapterToDelete: { id: string; title: string } | null;

  // ============ Settings 상태 ============
  zenMode: boolean;
  sidebarCollapsed: boolean;
  isDarkMode: boolean;
  isFocusMode: boolean;
}

// 🔥 통합 Editor Actions 인터페이스
export interface EditorActions {
  // ============ Tab 액션 ============
  addTab: (tab: any) => void;
  removeTab: (tabId: string) => void;
  setActiveTab: (tabId: string) => void;
  updateTab: (tabId: string, updates: any) => void;
  markAllTabsAsSaved: () => void;
  loadCacheToState: (cache: any) => void;

  // ============ View 액션 ============
  setCurrentView: (view: string) => void;
  setCurrentSubView: (subView: string) => void;
  setEditingItemId: (id: string) => void;

  // ============ UI 액션 (Sidebar, Panel) ============
  toggleCollapsed: () => void;
  toggleRightSidebar: () => void;
  toggleLeftSidebar: () => void;

  // ============ Modal 액션 ============
  openDeleteDialog: () => void;
  closeDeleteDialog: () => void;
  openShareDialog: () => void;
  closeShareDialog: () => void;
  openNewChapterModal: () => void;
  closeNewChapterModal: () => void;
  openNewCharacterModal: () => void;
  closeNewCharacterModal: () => void;
  openNewNoteModal: () => void;
  closeNewNoteModal: () => void;
  openChapterDeleteDialog: (chapter: { id: string; title: string }) => void;
  closeChapterDeleteDialog: () => void;

  // ============ Settings 액션 ============
  toggleZenMode: () => void;
  toggleDarkMode: () => void;
  toggleFocusMode: () => void;
}

export interface UseEditorStateReturn {
  state: EditorState;
  actions: EditorActions;
  ui: {
    isZenMode: boolean;
    isSidebarCollapsed: boolean;
    isLeftSidebarOpen: boolean;
  };
}

/**
 * 🔥 통합 Editor State Hook
 * 
 * useProjectEditorState, useUIState, useSettings를 하나로 통합
 * 모든 에디터 관련 상태와 액션을 하나의 인터페이스에서 제공
 * 
 * @param projectId - 프로젝트 ID
 * @returns { state, actions, ui } - 통합 상태와 액션
 */
export function useEditorState(projectId: string): UseEditorStateReturn {
  // 1️⃣ 기존 훅들 호출
  // useProjectEditorState doesn't require a projectId; it returns the shared project-editor state/actions
  const { state: editorState, actions: editorActions } = useProjectEditorState();
  const uiState = useUIState();
  const { settings, updateSetting } = useSettings();

  // 🔥 캐시 변경 시 localStorage에 자동 저장
  useEffect(() => {
    if (projectId && editorState.tabMetadataCache && Object.keys(editorState.tabMetadataCache).length > 0) {
      projectEditorStateService.saveCacheToStorage(projectId, editorState.tabMetadataCache);
      Logger.debug('USE_EDITOR_STATE', 'Cache saved to localStorage', {
        projectId,
        cacheSize: Object.keys(editorState.tabMetadataCache).length
      });
    }
  }, [projectId, editorState.tabMetadataCache]);

  // 2️⃣ 통합 State 구성
  const state: EditorState = {
    // ============ Tab & Editor 상태 (ProjectEditorStateService에서) ============
    tabs: editorState.tabs || [],
    activeTabId: editorState.activeTabId || '',
    tabHistory: editorState.tabHistory || [],
    tabMetadataCache: editorState.tabMetadataCache || {},
    nextTabOrder: editorState.nextTabOrder || 0,

    // ============ View 상태 ============
    currentView: editorState.currentView || 'write',
    currentSubView: editorState.currentSubView || '',
    editingItemId: editorState.editingItemId || '',

    // ============ UI 상태 ============
    collapsed: editorState.collapsed || false,
    showRightSidebar: editorState.showRightSidebar || false,
    showLeftSidebar: uiState.showLeftSidebar ?? true,

    // ============ Modal 상태 ============
    showDeleteDialog: editorState.showDeleteDialog || false,
    showShareDialog: editorState.showShareDialog || false,
    showNewChapterModal: editorState.showNewChapterModal || false,
    showNewCharacterModal: editorState.showNewCharacterModal || false,
    showNewNoteModal: editorState.showNewNoteModal || false,
    showChapterDeleteDialog: editorState.showChapterDeleteDialog || false,
    chapterToDelete: editorState.chapterToDelete || null,

    // ============ Settings 상태 ============
    zenMode: settings?.ui?.zenMode ?? false,
    sidebarCollapsed: settings?.ui?.sidebarCollapsed ?? false,
    isDarkMode: uiState.isDarkMode ?? false,
    isFocusMode: uiState.isFocusMode ?? false,
  };

  // 3️⃣ 통합 Actions 구성
  const actions: EditorActions = {
    // ============ Tab 액션 (ProjectEditorStateService에서) ============
    addTab: (tab: any) => {
      editorActions.addTab(tab);
      Logger.debug('USE_EDITOR_STATE', 'Tab added', { tabId: tab.id });
    },

    removeTab: (tabId: string) => {
      editorActions.removeTab(tabId);
      Logger.debug('USE_EDITOR_STATE', 'Tab removed', { tabId });
    },

    setActiveTab: (tabId: string) => {
      editorActions.setActiveTab(tabId);
      Logger.debug('USE_EDITOR_STATE', 'Active tab changed', { tabId });
    },

    updateTab: (tabId: string, updates: any) => {
      editorActions.updateTab(tabId, updates);
      Logger.debug('USE_EDITOR_STATE', 'Tab updated', { tabId });
    },

    markAllTabsAsSaved: () => {
      editorActions.markAllTabsAsSaved();
      Logger.debug('USE_EDITOR_STATE', 'All tabs marked as saved');
    },

    loadCacheToState: (cache: any) => {
      editorActions.loadCacheToState(cache);
      Logger.debug('USE_EDITOR_STATE', 'Cache loaded to state');
    },

    // ============ View 액션 ============
    setCurrentView: (view: string) => {
      editorActions.setCurrentView(view);
      Logger.debug('USE_EDITOR_STATE', 'Current view changed', { view });
    },

    setCurrentSubView: (subView: string) => {
      editorActions.setCurrentSubView(subView);
      Logger.debug('USE_EDITOR_STATE', 'Current subview changed', { subView });
    },

    setEditingItemId: (id: string) => {
      editorActions.setEditingItemId(id);
      Logger.debug('USE_EDITOR_STATE', 'Editing item ID changed', { id });
    },

    // ============ UI 액션 ============
    toggleCollapsed: () => {
      editorActions.toggleCollapsed();
      Logger.debug('USE_EDITOR_STATE', 'Sidebar collapsed toggled');
    },

    toggleRightSidebar: () => {
      editorActions.toggleRightSidebar();
      Logger.debug('USE_EDITOR_STATE', 'Right sidebar toggled');
    },

    toggleLeftSidebar: () => {
      uiState.toggleLeftSidebar();
      Logger.debug('USE_EDITOR_STATE', 'Left sidebar toggled');
    },

    // ============ Modal 액션 ============
    openDeleteDialog: () => {
      editorActions.openDeleteDialog();
      Logger.debug('USE_EDITOR_STATE', 'Delete dialog opened');
    },

    closeDeleteDialog: () => {
      editorActions.closeDeleteDialog();
      Logger.debug('USE_EDITOR_STATE', 'Delete dialog closed');
    },

    openShareDialog: () => {
      editorActions.openShareDialog();
      Logger.debug('USE_EDITOR_STATE', 'Share dialog opened');
    },

    closeShareDialog: () => {
      editorActions.closeShareDialog();
      Logger.debug('USE_EDITOR_STATE', 'Share dialog closed');
    },

    openNewChapterModal: () => {
      editorActions.openNewChapterModal();
      Logger.debug('USE_EDITOR_STATE', 'New chapter modal opened');
    },

    closeNewChapterModal: () => {
      editorActions.closeNewChapterModal();
      Logger.debug('USE_EDITOR_STATE', 'New chapter modal closed');
    },

    openNewCharacterModal: () => {
      editorActions.openNewCharacterModal();
      Logger.debug('USE_EDITOR_STATE', 'New character modal opened');
    },

    closeNewCharacterModal: () => {
      editorActions.closeNewCharacterModal();
      Logger.debug('USE_EDITOR_STATE', 'New character modal closed');
    },

    openNewNoteModal: () => {
      editorActions.openNewNoteModal();
      Logger.debug('USE_EDITOR_STATE', 'New note modal opened');
    },

    closeNewNoteModal: () => {
      editorActions.closeNewNoteModal();
      Logger.debug('USE_EDITOR_STATE', 'New note modal closed');
    },

    openChapterDeleteDialog: (chapter: { id: string; title: string }) => {
      editorActions.openChapterDeleteDialog(chapter);
      Logger.debug('USE_EDITOR_STATE', 'Chapter delete dialog opened', { chapter });
    },

    closeChapterDeleteDialog: () => {
      editorActions.closeChapterDeleteDialog();
      Logger.debug('USE_EDITOR_STATE', 'Chapter delete dialog closed');
    },

    // ============ Settings 액션 ============
    toggleZenMode: () => {
      updateSetting('ui', 'zenMode', !settings?.ui?.zenMode);
      Logger.debug('USE_EDITOR_STATE', 'Zen mode toggled', {
        newValue: !settings?.ui?.zenMode
      });
    },

    toggleDarkMode: () => {
      uiState.toggleDarkMode();
      Logger.debug('USE_EDITOR_STATE', 'Dark mode toggled');
    },

    toggleFocusMode: () => {
      uiState.toggleFocusMode();
      Logger.debug('USE_EDITOR_STATE', 'Focus mode toggled');
    },
  };

  // 4️⃣ UI 상태 요약 (템플릿에서 쉽게 참조)
  const ui = {
    isZenMode: state.zenMode,
    isSidebarCollapsed: state.sidebarCollapsed,
    isLeftSidebarOpen: state.showLeftSidebar,
  };

  return {
    state,
    actions,
    ui,
  };
}

export default useEditorState;
