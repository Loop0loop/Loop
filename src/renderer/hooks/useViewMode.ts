'use client';

import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'loop-view-mode';

type ViewMode = 'grid' | 'list';

/**
 * 🔥 View Mode 관리 Hook
 * localStorage에 사용자 선호도 저장
 */
export function useViewMode(defaultMode: ViewMode = 'grid') {
  const [viewMode, setViewModeState] = useState<ViewMode>(defaultMode);
  const [isLoaded, setIsLoaded] = useState(false);

  // 초기 로드 - localStorage에서 저장된 값 복원
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === 'grid' || saved === 'list') {
        setViewModeState(saved);
      }
      setIsLoaded(true);
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  // View Mode 변경 - localStorage에 저장
  const setViewMode = useCallback((mode: ViewMode) => {
    setViewModeState(mode);
    localStorage.setItem(STORAGE_KEY, mode);
  }, []);

  return {
    viewMode,
    setViewMode,
    isLoaded,
  };
}
