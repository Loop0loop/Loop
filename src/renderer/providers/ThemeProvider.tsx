/**
 * 🎨 기가차드 테마 프로바이더 - 리팩토링 버전
 * 
 * Root Class + CSS Variables 아키텍처
 * - DOM 조작은 themeManager가 담당
 * - React Context는 상태 관리만 담당
 * - preload API를 통한 안전한 IPC 통신
 */

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { Logger } from '../../shared/logger';
import { isValidTheme, type Theme } from '../../shared/types/theme';
import { themeManager, type ThemeMode } from '../utils/themeManager';

interface ThemeContextType {
  theme: Theme;
  resolvedTheme: ThemeMode; // 실제 적용된 테마 (system 해결됨)
  setTheme: (theme: Theme) => Promise<void>;
  toggleTheme: () => void;
}

// 🔥 Context 생성
const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: React.ReactNode;
  defaultTheme?: Theme;
}

export function ThemeProvider({ children, defaultTheme = 'system' }: ThemeProviderProps): React.ReactElement {
  const [theme, setThemeState] = useState<Theme>(defaultTheme);
  const [resolvedTheme, setResolvedTheme] = useState<ThemeMode>('light');
  const lastThemeSaveTime = React.useRef<number>(0);
  const THROTTLE_DELAY = 5000; // 5초 이내에는 설정 저장 안 함

  /**
   * 🎯 테마 설정 (설정 저장 포함) - Throttled
   */
  const setTheme = useCallback(async (newTheme: Theme): Promise<void> => {
    try {
      Logger.debug('THEME_PROVIDER', 'Setting theme', { newTheme });
      
      setThemeState(newTheme);
      
      if (window.electronAPI?.theme) {
        // Throttle: 너무 빈번한 설정 저장 방지
        const now = Date.now();
        if (now - lastThemeSaveTime.current < THROTTLE_DELAY) {
          Logger.debug('THEME_PROVIDER', 'Theme save throttled', { 
            timeSinceLastSave: now - lastThemeSaveTime.current 
          });
        } else {
          // Electron 환경: preload API 사용
          const response = await window.electronAPI.theme.set(newTheme);
          if (!response.success) {
            Logger.error('THEME_PROVIDER', 'Failed to save theme:', response.error);
          } else {
            lastThemeSaveTime.current = now;
          }
        }
      } else {
        // 웹 환경: localStorage 유지
        try {
          localStorage.setItem('loop-theme', newTheme);
        } catch (storageError) {
          Logger.warn('THEME_PROVIDER', 'Unable to persist theme to localStorage', storageError);
        }
      }
      
      // DOM 업데이트는 themeManager가 담당
      themeManager.applyTheme(newTheme);
      const resolved = themeManager.getResolvedThemeMode();
      setResolvedTheme(resolved);
      
      Logger.info('THEME_PROVIDER', 'Theme updated', { theme: newTheme, resolved });
    } catch (error) {
      Logger.error('THEME_PROVIDER', 'Error setting theme', error);
    }
  }, []);

  /**
   * 🎯 테마 토글
   */
  const toggleTheme = useCallback((): void => {
    const newTheme = resolvedTheme === 'light' ? 'dark' : 'light';
    void setTheme(newTheme);
  }, [resolvedTheme, setTheme]);

  /**
   * 🎯 초기 테마 로드 및 리스너 설정
   */
  useEffect(() => {
    const initializeTheme = async (): Promise<void> => {
      try {
        let initialTheme: Theme = defaultTheme;
        
        if (window.electronAPI) {
          // Electron 환경: 저장된 설정 로드
          const response = await window.electronAPI.theme.get();
          if (response.success && isValidTheme(response.data)) {
            initialTheme = response.data;
          }
        } else {
          // 웹 환경: localStorage 사용
          const saved = localStorage.getItem('loop-theme');
          if (isValidTheme(saved)) {
            initialTheme = saved;
          }
        }
        
        // 테마 적용
        await setTheme(initialTheme);
        
        Logger.info('THEME_PROVIDER', 'Theme initialized', { initialTheme });
      } catch (error) {
        Logger.error('THEME_PROVIDER', 'Failed to initialize theme', error);
        await setTheme('light'); // 기본값
      }
    };

    initializeTheme();
  }, [defaultTheme, setTheme]);

  /**
   * 🎯 시스템 테마 변경 및 설정 변경 리스너 설정
   */
  useEffect(() => {
    if (!window.electronAPI?.theme) {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleSystemThemeChange = (event: MediaQueryListEvent) => {
        if (theme === 'system') {
          themeManager.applyTheme('system', event.matches);
          const resolved = themeManager.getResolvedThemeMode();
          setResolvedTheme(resolved);
          Logger.debug('THEME_PROVIDER', 'System theme changed (web)', { resolved });
        }
      };

      mediaQuery.addEventListener('change', handleSystemThemeChange);
      return () => mediaQuery.removeEventListener('change', handleSystemThemeChange);
    }

    const { theme: themeApi } = window.electronAPI;
    const cleanupFns: Array<() => void> = [];

    if (typeof themeApi.onChange === 'function') {
      try {
        const unsubscribe = themeApi.onChange((nextTheme: Theme) => {
          if (!isValidTheme(nextTheme)) {
            return;
          }

          setThemeState(nextTheme);
          themeManager.applyTheme(nextTheme);
          const resolved = themeManager.getResolvedThemeMode();
          setResolvedTheme(resolved);
          Logger.debug('THEME_PROVIDER', 'Theme changed via IPC', { nextTheme, resolved });
        });

        if (typeof unsubscribe === 'function') {
          cleanupFns.push(unsubscribe);
        }
      } catch (error) {
        Logger.error('THEME_PROVIDER', 'Failed to subscribe to theme changes', error);
      }
    } else {
      Logger.error('THEME_PROVIDER', 'electronAPI.theme.onChange is missing or invalid', themeApi);
    }

    if (typeof themeApi.onSystemChange === 'function') {
      try {
        const unsubscribe = themeApi.onSystemChange((shouldUseDarkColors: boolean) => {
          if (theme === 'system') {
            themeManager.applyTheme('system', shouldUseDarkColors);
            const resolved = themeManager.getResolvedThemeMode();
            setResolvedTheme(resolved);
            Logger.debug('THEME_PROVIDER', 'System theme changed', { resolved });
          }
        });

        if (typeof unsubscribe === 'function') {
          cleanupFns.push(unsubscribe);
        }
      } catch (error) {
        Logger.error('THEME_PROVIDER', 'Failed to subscribe to system theme changes', error);
      }
    } else {
      Logger.error('THEME_PROVIDER', 'electronAPI.theme.onSystemChange is missing or invalid', themeApi);
    }

    return () => {
      cleanupFns.forEach((cleanup) => {
        try {
          cleanup();
        } catch (error) {
          Logger.warn('THEME_PROVIDER', 'Failed to cleanup theme listener', error);
        }
      });
    };
  }, [theme]);

  const value: ThemeContextType = {
    theme,
    resolvedTheme,
    setTheme,
    toggleTheme,
  };

  return (
    <ThemeContext.Provider value={value}>
      <div className="transition-colors duration-200" suppressHydrationWarning>
        {children}
      </div>
    </ThemeContext.Provider>
  );
}

/**
 * 🔥 테마 컨텍스트 훅
 */
export function useTheme(): ThemeContextType {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

// 편의성을 위한 추가 훅들
export function useResolvedTheme(): ThemeMode {
  const { resolvedTheme } = useTheme();
  return resolvedTheme;
}

export function useThemeToggle(): () => void {
  const { toggleTheme } = useTheme();
  return toggleTheme;
}
