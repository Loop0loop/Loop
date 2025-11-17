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
  readonly toggleCollapsed: () => void;
  readonly setCollapsed: (nextState: boolean) => void;
}

export function useSidebar({
  settings,
  updateSetting,
  defaultCollapsed = false,
}: UseSidebarOptions = {}): UseSidebarReturn {
  const [isCollapsed, setIsCollapsed] = useState<boolean>(defaultCollapsed);
  const [isReady, setIsReady] = useState<boolean>(false);
  const lastValue = useRef<boolean>(defaultCollapsed);

  useEffect(() => {
    const nextValue = settings?.appSidebarCollapsed ?? defaultCollapsed;
    if (nextValue !== lastValue.current) {
      lastValue.current = nextValue;
      setIsCollapsed(nextValue);
    }
    setIsReady(true);
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

  const toggleCollapsed = useCallback(() => {
    const nextState = !lastValue.current;
    persistCollapse(nextState);
  }, [persistCollapse]);

  const setCollapsed = useCallback(
    (nextState: boolean) => {
      persistCollapse(nextState);
    },
    [persistCollapse]
  );

  return {
    isCollapsed,
    isReady,
    toggleCollapsed,
    setCollapsed,
  };
}
