'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { SettingsData, UpdateSettingFunction } from '../app/settings/types';

export type SidebarState = 'expanded' | 'collapsed' | 'hidden';

export interface UseSidebarOptions {
  readonly settings?: SettingsData['ui'] | null;
  readonly updateSetting?: UpdateSettingFunction;
  readonly defaultState?: SidebarState;
}

export interface UseSidebarReturn {
  readonly state: SidebarState;
  readonly isExpanded: boolean;
  readonly isCollapsed: boolean;
  readonly isHidden: boolean;
  readonly isReady: boolean;
  readonly toggleCollapsed: () => void;
  readonly setState: (nextState: SidebarState) => void;
  readonly setHidden: (hidden: boolean) => void;
}

export function useSidebar({
  settings,
  updateSetting,
  defaultState = 'expanded',
}: UseSidebarOptions = {}): UseSidebarReturn {
  const [state, setState] = useState<SidebarState>(defaultState);
  const [isReady, setIsReady] = useState<boolean>(false);
  const lastValue = useRef<SidebarState>(defaultState);

  useEffect(() => {
    // appSidebarCollapsed가 true면 'hidden', false면 'expanded' 또는 이전 상태 유지
    const isCollapsedSetting = settings?.appSidebarCollapsed ?? false;
    let nextState: SidebarState = isCollapsedSetting ? 'hidden' : 'expanded';
    
    if (nextState !== lastValue.current) {
      lastValue.current = nextState;
      setState(nextState);
    }
    setIsReady(true);
  }, [settings?.appSidebarCollapsed]);

  const persistState = useCallback(
    (nextState: SidebarState) => {
      setState(nextState);
      lastValue.current = nextState;
      if (updateSetting) {
        // 'hidden' 상태는 appSidebarCollapsed = true로 저장
        const isHidden = nextState === 'hidden';
        void updateSetting('ui', 'appSidebarCollapsed', isHidden);
      }
    },
    [updateSetting]
  );

  const toggleCollapsed = useCallback(() => {
    const current = lastValue.current;
    let nextState: SidebarState;
    
    if (current === 'expanded') {
      nextState = 'collapsed';
    } else if (current === 'collapsed') {
      nextState = 'expanded';
    } else {
      // hidden → expanded
      nextState = 'expanded';
    }
    
    persistState(nextState);
  }, [persistState]);

  const setStateCallback = useCallback(
    (nextState: SidebarState) => {
      persistState(nextState);
    },
    [persistState]
  );

  const setHidden = useCallback(
    (hidden: boolean) => {
      persistState(hidden ? 'hidden' : 'expanded');
    },
    [persistState]
  );

  return {
    state,
    isExpanded: state === 'expanded',
    isCollapsed: state === 'collapsed',
    isHidden: state === 'hidden',
    isReady,
    toggleCollapsed,
    setState: setStateCallback,
    setHidden,
  };
}
