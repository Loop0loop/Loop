'use client';

import { useCallback, useEffect, useState } from 'react';
import type { SettingsData, UpdateSettingFunction } from '../app/settings/types';

export type SidebarState = 'expanded' | 'collapsed';
export interface UseSidebarOptions {
  readonly settings?: SettingsData['ui'] | null;
  readonly updateSetting?: UpdateSettingFunction;
  readonly defaultState?: SidebarState;
}

export interface UseSidebarReturn {
  readonly baseState: SidebarState;
  readonly isHidden: boolean;
  readonly isReady: boolean;
  readonly toggleCollapsed: () => void;
  readonly setBaseState: (nextState: SidebarState) => void;
  readonly setHidden: (hidden: boolean) => void;
}
export function useSidebar({
  settings,
  updateSetting,
  defaultState = 'expanded',
}: UseSidebarOptions = {}): UseSidebarReturn {
  const [baseState, setBaseState] = useState<SidebarState>(defaultState);
  const [isHidden, setIsHidden] = useState<boolean>(settings?.appSidebarCollapsed ?? false);
  const [isReady, setIsReady] = useState<boolean>(false);

  useEffect(() => {
    const animation = requestAnimationFrame(() => {
      setIsHidden(settings?.appSidebarCollapsed ?? false);
      setIsReady(true);
    });
    return () => {
      cancelAnimationFrame(animation);
    };
  }, [settings?.appSidebarCollapsed]);

  const persistHidden = useCallback(
    (hidden: boolean) => {
      setIsHidden(hidden);
      if (!updateSetting) {
        return;
      }

      void updateSetting('ui', 'appSidebarCollapsed', hidden);
    },
    [updateSetting]
  );

  const toggleCollapsed = useCallback(() => {
    setBaseState((current) => (current === 'expanded' ? 'collapsed' : 'expanded'));
  }, []);

  const setBaseStateCallback = useCallback((nextState: SidebarState) => {
    setBaseState(nextState);
  }, []);

  const setHidden = useCallback(
    (hidden: boolean) => {
      persistHidden(hidden);
    },
    [persistHidden]
  );

  return {
    baseState,
    isHidden,
    isReady,
    toggleCollapsed,
    setBaseState: setBaseStateCallback,
    setHidden,
  };
}
