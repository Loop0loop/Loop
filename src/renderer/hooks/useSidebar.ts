'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { SettingsData, UpdateSettingFunction } from '../app/settings/types';

export interface UseSidebarOptions {
  readonly settings?: SettingsData['ui'] | null;
  readonly updateSetting?: UpdateSettingFunction;
  readonly defaultCollapsed?: boolean;
}

export interface UseSidebarReturn {
  readonly isCollapsed: boolean;
  readonly isReady: boolean;
  readonly toggleCollapsed: (nextState?: boolean) => void;
  readonly setCollapsed: (nextState: boolean) => void;
}

export function useSidebar({
  settings,
  updateSetting,
  defaultCollapsed = false,
}: UseSidebarOptions = {}): UseSidebarReturn {
  const [isCollapsed, setIsCollapsed] = useState<boolean>(defaultCollapsed);
  const lastValue = useRef<boolean>(defaultCollapsed);

  useEffect(() => {
    const nextValue = settings?.appSidebarCollapsed ?? settings?.sidebarCollapsed ?? defaultCollapsed;
    if (nextValue !== lastValue.current) {
      lastValue.current = nextValue;
      setIsCollapsed(nextValue);
    }
  }, [settings?.appSidebarCollapsed, defaultCollapsed]);

  const persistCollapse = useCallback(
    (nextState: boolean) => {
      setIsCollapsed(nextState);
      lastValue.current = nextState;
      if (updateSetting) {
        void updateSetting('ui', 'appSidebarCollapsed', nextState);
      }
    },
    [updateSetting]
  );

  const setCollapsed = useCallback(
    (nextState: boolean) => {
      persistCollapse(nextState);
    },
    [persistCollapse]
  );

  const toggleCollapsed = useCallback(
    (nextState?: boolean) => {
      const target = typeof nextState === 'boolean' ? nextState : !isCollapsed;
      persistCollapse(target);
    },
    [isCollapsed, persistCollapse]
  );

  return {
    isCollapsed,
    isReady: typeof settings !== 'undefined',
    toggleCollapsed,
    setCollapsed,
  };
}