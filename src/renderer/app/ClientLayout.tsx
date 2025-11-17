'use client';

import React, { ReactNode, useState, useLayoutEffect, useEffect, useCallback, useMemo, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
// AppHeader 제거됨 - DashboardMain에서 자체 헤더로 관리
// MonitoringProvider 제거됨 - 기획 변경으로 불필요
import { AuthProvider, useAuth } from '../contexts/AuthContext';
import { ThemeProvider } from '../providers/ThemeProvider';
import { useSettings } from './settings/hooks/useSettings';
import { Logger } from '../../shared/logger';
import '../styles/index.css';
import { Avatar } from '../components/ui/Avatar';
import { ChevronLeft, ChevronRight, Settings as SettingsIcon } from 'lucide-react';
import {
    SidebarNavigationList,
    SIDEBAR_STYLES,
    SIDEBAR_NAVIGATION_ENTRIES,
    SIDEBAR_FOOTER_ENTRIES,
    type SidebarNavigationEntry,
} from '../components/layout/sidebar';
import type { SettingsData } from './settings/types';
import { createPortal } from 'react-dom';

interface ClientLayoutProps {
    readonly children: ReactNode;
    readonly initialAuth?: any;
}

function ClientLayoutInner({ children }: { children: ReactNode }): React.ReactElement {
    const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(false);
    const location = useLocation();
    const navigate = useNavigate();
    const pathname = location.pathname;
    const { settings, loading: settingsLoading, updateSetting } = useSettings();

    // Focus 모드 상태
    const isFocusMode = settings?.ui?.focusMode ?? false;

    // 프로젝트 페이지 확인
    const isProjectPage = pathname.startsWith('/projects/');

    // restore sidebar state before paint
    useLayoutEffect(() => {
        if (typeof window !== 'undefined') {
            try {
                const savedState = localStorage.getItem('sidebar-collapsed');
                if (savedState === 'true') {
                    setSidebarCollapsed(true);
                }
                Logger.debug('LAYOUT', 'Sidebar state restored immediately', { collapsed: savedState === 'true' });
            } catch (error) {
                Logger.error('LAYOUT', 'Failed to restore sidebar state', error);
            }
        }
    }, []);

    const handleNavigate = (href: string): void => {
        try {
            if (typeof window === 'undefined') return;

            // Parse the URL to validate it
            let url: URL | null = null;
            try {
                url = new URL(href, window.location.href);
            } catch (e) {
                // malformed URL - block navigation
                Logger.warn('LAYOUT', 'Blocked malformed navigation URL', { href });
                return;
            }

            const isSameOrigin = url.origin === window.location.origin;
            const isRelative = href.startsWith('/');

            if (isRelative || isSameOrigin) {
                // Use Next.js router for internal navigation (client-side routing)
                Logger.debug('LAYOUT', 'Client-side navigation', { href });
                navigate(href);
            } else {
                // treat as external - open in new tab/window safely
                Logger.debug('LAYOUT', 'External navigation', { href });
                window.open(url.toString(), '_blank', 'noopener,noreferrer');
            }
        } catch (e) {
            Logger.warn('LAYOUT', 'Blocked unsafe navigation attempt', { href, error: e });
        }
    };

    const handleToggleSidebar = (): void => {
        const newState = !sidebarCollapsed;
        setSidebarCollapsed(newState);

        if (typeof window !== 'undefined') {
            try {
                localStorage.setItem('sidebar-collapsed', newState.toString());
                Logger.debug('LAYOUT', 'Sidebar state saved', { collapsed: newState });
            } catch (error) {
                Logger.error('LAYOUT', 'Failed to save sidebar state', error);
            }
        }
        updateSetting('ui', 'appSidebarCollapsed', newState);
    };

    const effectiveCollapsed = sidebarCollapsed;

    return (
        <div className="flex h-screen w-screen overflow-hidden app-root">
            {!isFocusMode && !isProjectPage && (
                <aside className="flex-shrink-0 h-full">
                    <SidebarPanel
                        pathname={pathname}
                        collapsed={effectiveCollapsed}
                        onNavigate={handleNavigate}
                        onToggleCollapse={handleToggleSidebar}
                        settings={settings}
                        settingsLoading={settingsLoading}
                    />
                </aside>
            )}

            <main className="flex-1 h-full flex flex-col overflow-hidden">
                <div className="flex-1 overflow-y-auto p-0 no-scrollbar">
                    {children}
                </div>
            </main>
        </div>
    );
}

interface SidebarPanelProps {
    readonly collapsed: boolean;
    readonly pathname: string;
    readonly onNavigate: (href: string) => void;
    readonly onToggleCollapse: () => void;
    readonly settings?: SettingsData | null;
    readonly settingsLoading: boolean;
}

function SidebarPanel({
    collapsed,
    pathname,
    onNavigate,
    onToggleCollapse,
    settings,
    settingsLoading,
}: SidebarPanelProps): React.ReactElement {
    const authCtx = useAuth() as any;
    const { auth: googleUserInfo, loaded: authLoaded } = authCtx;

    const accountProfile = settings?.account;
    const [avatarSrc, setAvatarSrc] = useState<string | null>(null);
    const [isOnline, setIsOnline] = useState<boolean>(true);
    const [isClient, setIsClient] = useState<boolean>(false);
    const [canRenderPortal, setCanRenderPortal] = useState<boolean>(false);

    const hoverAreaClass = useMemo(() => (pathname.startsWith('/projects/') ? 'w-8' : 'w-12'), [pathname]);

    const fileInputRef = useRef<HTMLInputElement | null>(null);

    const effectiveCollapsed = collapsed;

    const displayName = (accountProfile?.displayName
        || accountProfile?.username
        || accountProfile?.email
        || (googleUserInfo?.isAuthenticated ? (googleUserInfo.userName || googleUserInfo.userEmail) : null)
        || 'Loop 사용자');

    const renderStatusText = (): string => {
        if (!authLoaded) return '상태 확인 중...';
        if (googleUserInfo?.isAuthenticated) return 'Google 계정';
        if (accountProfile?.displayName || accountProfile?.username || accountProfile?.email) return '로컬 계정';
        return isOnline ? '온라인' : '오프라인';
    };

    useEffect(() => {
        if (accountProfile?.avatar) {
            const avatarValue = accountProfile.avatar as string;
            if (avatarValue.startsWith('file://')) {
                const path = avatarValue.replace(/^file:\/\//, '');
                ((window as any).electronAPI as any).files?.readFileAsDataUrl(path)
                    .then((r: { success: boolean; data?: string }) => {
                        if (r?.success && r.data) setAvatarSrc(r.data as string);
                        else setAvatarSrc(null);
                    })
                    .catch(() => setAvatarSrc(null));
            } else if (avatarValue.startsWith('loop-avatar://') || avatarValue.startsWith('data:')) {
                setAvatarSrc(avatarValue);
            } else {
                setAvatarSrc(avatarValue);
            }
            return;
        }

        if (authLoaded && googleUserInfo && googleUserInfo.isAuthenticated) {
            const picture = googleUserInfo.userPicture || (googleUserInfo.userEmail
                ? `https://ui-avatars.com/api/?name=${encodeURIComponent(googleUserInfo.userEmail)}&background=4f46e5&color=fff&size=64`
                : undefined);
            setAvatarSrc(picture || null);
            return;
        }

        if (accountProfile && (accountProfile.displayName || accountProfile.username || accountProfile.email)) {
            const name = String(accountProfile.displayName || accountProfile.username || accountProfile.email || '');
            const fallbackUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=4f46e5&color=fff&size=64`;
            setAvatarSrc(fallbackUrl);
        } else {
            setAvatarSrc(null);
        }
    }, [authLoaded, googleUserInfo, accountProfile]);

    useEffect(() => {
        try {
            const unsub = ((window as any).electronAPI as any).settings.onDidChange?.((payload: { keyPath: string; value: any }) => {
                if (!payload || !payload.keyPath) return;
                if (payload.keyPath === 'account.avatar' || payload.keyPath === 'account.avatarThumb') {
                    const val = payload.value as string | null;
                    if (!val) { setAvatarSrc(null); return; }
                    if (val.startsWith('file://')) {
                        const p = val.replace(/^file:\/\//, '');
                        (((window as any).electronAPI as any).files)?.readFileAsDataUrl(p)
                            .then((r: { success: boolean; data?: string }) => { if (r?.success && r.data) setAvatarSrc(r.data as string); })
                            .catch(() => {});
                    } else {
                        setAvatarSrc(val);
                    }
                }
            });
            return () => { if (typeof unsub === 'function') unsub(); };
        } catch (e) { return; }
    }, []);

    const handleAvatarClick = (): void => {
        if (authLoaded && googleUserInfo && googleUserInfo.isAuthenticated) {
            onNavigate('/settings');
            return;
        }
        fileInputRef.current?.click();
    };

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;
        const maxSize = 5 * 1024 * 1024;
        if (file.size > maxSize) {
            alert('파일 크기가 5MB를 초과합니다. 더 작은 파일을 선택해주세요.');
            return;
        }
        const reader = new FileReader();
        reader.onload = async () => {
            const dataUrl = reader.result as string;
            try {
                const res = await (((window as any).electronAPI as any).settings).set('account.avatar', dataUrl);
                if (res && res.success) {
                    Logger.info('SIDEBAR', 'Avatar uploaded successfully');
                } else {
                    throw new Error(res?.error || 'save failed');
                }
            } catch (error) {
                console.error('Failed to save avatar to settings', error);
                alert('프로필 저장에 실패했습니다');
            }
        };
        reader.readAsDataURL(file);
    };

    useLayoutEffect(() => {
        if (typeof window !== 'undefined') {
            try {
                const snap = (window as any).loopSnapshot && typeof (window as any).loopSnapshot.get === 'function'
                    ? (window as any).loopSnapshot.get()
                    : null;
                if (snap && typeof snap.online === 'boolean') {
                    setIsOnline(snap.online);
                } else {
                    setIsOnline(navigator.onLine);
                }
            } catch (error) {
                setIsOnline(navigator.onLine);
            }
        }
        setIsClient(true);
    }, []);

    useEffect(() => { if (isClient) setCanRenderPortal(true); }, [isClient]);

    useEffect(() => {
        if (!isClient) return;
        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);
        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);
        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, [isClient]);

    const [isCollapsedHovering, setIsCollapsedHovering] = useState(false);

    const handleMouseEnter = useCallback(() => { if (collapsed) setIsCollapsedHovering(true); }, [collapsed]);
    const handleMouseLeave = useCallback(() => { if (collapsed) setIsCollapsedHovering(false); }, [collapsed]);

    const handleNavigation = useCallback((item: SidebarNavigationEntry) => {
        try {
            onNavigate(item.href);
        } catch (error) {
            Logger.error('SIDEBAR', 'Navigation failed', { href: item.href, error });
        }
    }, [onNavigate]);

    const handleKeyDown = useCallback((event: React.KeyboardEvent, item: SidebarNavigationEntry) => {
        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            handleNavigation(item);
        }
    }, [handleNavigation]);

    const handleProfileNavigate = useCallback(() => onNavigate('/settings'), [onNavigate]);
    const settingsEntry = SIDEBAR_FOOTER_ENTRIES[0];
    const sidebarContentIsExpanded = !effectiveCollapsed || isCollapsedHovering;

    const SidebarContent = ({ isExpanded }: { isExpanded: boolean }) => (
        <div className={SIDEBAR_STYLES.container}>
            {/* 헤더 - 로고 및 토글 버튼 */}
            <div className={SIDEBAR_STYLES.logoSection}>
                <h1 className={SIDEBAR_STYLES.logoText}>Loop</h1>
                <button
                    type="button"
                    className="p-1.5 rounded-lg hover:bg-sidebar-accent/60 transition-colors duration-150"
                    onClick={onToggleCollapse}
                    aria-label={isExpanded ? '사이드바 축소' : '사이드바 확장'}
                    title={isExpanded ? '축소' : '확장'}
                >
                    {isExpanded ? <ChevronLeft className="w-5 h-5 text-sidebar-foreground" /> : <ChevronRight className="w-5 h-5 text-sidebar-foreground" />}
                </button>
            </div>

            {/* 네비게이션 */}
            <nav className={SIDEBAR_STYLES.navSection} aria-label="메인 메뉴">
                <SidebarNavigationList
                    items={SIDEBAR_NAVIGATION_ENTRIES}
                    isExpanded={isExpanded}
                    currentPath={pathname}
                    onSelect={handleNavigation}
                    onKeyDown={handleKeyDown}
                />
            </nav>

            {/* 하단 섹션 - 프로필 및 설정 */}
            <div className={SIDEBAR_STYLES.bottomSection}>
                {/* 프로필 버튼 */}
                <button
                    type="button"
                    className={SIDEBAR_STYLES.profileButton}
                    onClick={handleProfileNavigate}
                    title={displayName}
                >
                    <Avatar
                        size="md"
                        src={avatarSrc || undefined}
                        aria-label={displayName}
                        className="border border-sidebar-border/40 flex-shrink-0"
                    >
                        <span className="font-medium text-sidebar-foreground">{displayName.charAt(0).toUpperCase()}</span>
                    </Avatar>
                    <div className={SIDEBAR_STYLES.profileInfo}>
                        <div className={SIDEBAR_STYLES.profileName}>{displayName}</div>
                        <div className={SIDEBAR_STYLES.profileStatus}>
                            <span className={`${SIDEBAR_STYLES.statusDot} ${isOnline ? 'bg-emerald-500' : 'bg-sidebar-foreground/40'}`} />
                            <span className={SIDEBAR_STYLES.statusText}>{renderStatusText()}</span>
                        </div>
                    </div>
                </button>

                {/* 설정 버튼 */}
                {settingsEntry && (
                    <button
                        type="button"
                        className={SIDEBAR_STYLES.settingsButton}
                        onClick={() => handleNavigation(settingsEntry)}
                        title="설정"
                    >
                        <SettingsIcon className="w-4 h-4 flex-shrink-0" />
                        <span>설정</span>
                    </button>
                )}
            </div>
        </div>
    );

    return (
        <div className="relative h-screen max-h-screen">
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} aria-hidden="true" />
            {effectiveCollapsed && canRenderPortal && createPortal(
                <div
                    className={`fixed left-0 top-0 h-full hover:cursor-pointer bg-transparent ${hoverAreaClass}`}
                    style={{ zIndex: 2147483647, pointerEvents: 'auto' }}
                    onMouseEnter={handleMouseEnter}
                    onMouseLeave={handleMouseLeave}
                    onMouseOver={handleMouseEnter}
                    onMouseOut={handleMouseLeave}
                    aria-label="앱 사이드바 펼치기"
                />,
                document.body
            )}
            {effectiveCollapsed && isCollapsedHovering && canRenderPortal && createPortal(
                <div
                    className={SIDEBAR_STYLES.hoverContent}
                    onMouseEnter={handleMouseEnter}
                    onMouseLeave={handleMouseLeave}
                    onMouseOver={handleMouseEnter}
                    onMouseOut={handleMouseLeave}
                    aria-label="사이드바 네비게이션"
                    role="navigation"
                >
                    <SidebarContent isExpanded={sidebarContentIsExpanded} />
                </div>,
                document.body
            )}
            {!effectiveCollapsed && (
                <aside className={SIDEBAR_STYLES.container} aria-label="사이드바 네비게이션" role="navigation">
                    <SidebarContent isExpanded={sidebarContentIsExpanded} />
                </aside>
            )}
        </div>
    );
}

export default function ClientLayout({ children, initialAuth }: ClientLayoutProps): React.ReactElement {
    return (
        <ThemeProvider defaultTheme="system">
            <AuthProvider initialAuth={initialAuth}>
                {/* MonitoringProvider 제거됨 - 기획 변경으로 불필요 */}
                <ClientLayoutInner>
                    {children}
                </ClientLayoutInner>
            </AuthProvider>
        </ThemeProvider>
    );
}
