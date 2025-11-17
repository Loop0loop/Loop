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
import {
    SidebarHeader,
    SidebarNavigationList,
    SidebarFooterPanel,
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
    const isDashboardPage = pathname === '/' || pathname === '/dashboard';

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

    useEffect(() => {
        if (isDashboardPage && sidebarCollapsed) {
            setSidebarCollapsed(false);
        }
    }, [isDashboardPage, sidebarCollapsed]);

    const effectiveCollapsed = isDashboardPage ? false : sidebarCollapsed;

    return (
        <div className="flex h-screen w-screen overflow-hidden app-root">
            {!isFocusMode && !isProjectPage && (
                <aside className="flex-shrink-0 h-full">
                    <SidebarPanel
                        pathname={pathname}
                        forceExpanded={isDashboardPage}
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
    readonly forceExpanded?: boolean;
    readonly pathname: string;
    readonly onNavigate: (href: string) => void;
    readonly onToggleCollapse: () => void;
    readonly settings?: SettingsData | null;
    readonly settingsLoading: boolean;
}

function SidebarPanel({
    collapsed,
    forceExpanded = false,
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

    const isDashboardRoute = forceExpanded || pathname === '/' || pathname === '/dashboard';
    const effectiveCollapsed = isDashboardRoute ? false : collapsed;
    const hoverAreaClass = useMemo(() => (pathname.startsWith('/projects/') ? 'w-8' : 'w-12'), [pathname]);

    const fileInputRef = useRef<HTMLInputElement | null>(null);

    const visibleProfile: any = (authLoaded && googleUserInfo && googleUserInfo.isAuthenticated)
        ? googleUserInfo
        : accountProfile
            ? {
                isAuthenticated: !!(accountProfile.displayName || accountProfile.username || accountProfile.email),
                userName: accountProfile.displayName || accountProfile.username,
                userEmail: accountProfile.email,
                userPicture: accountProfile.avatar,
            }
            : null;

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

    const handleMouseEnter = useCallback(() => { if (effectiveCollapsed) setIsCollapsedHovering(true); }, [effectiveCollapsed]);
    const handleMouseLeave = useCallback(() => { if (effectiveCollapsed) setIsCollapsedHovering(false); }, [effectiveCollapsed]);

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

    const SidebarContent = ({ isExpanded }: { isExpanded: boolean }) => (
        <div className="flex flex-col h-full w-full bg-[hsl(var(--sidebar-background))] text-[hsl(var(--sidebar-foreground))]">
            <div className="px-3 py-4">
                <SidebarHeader
                    isExpanded={isExpanded}
                    avatarSrc={avatarSrc}
                    accountProfile={accountProfile}
                    googleUserInfo={googleUserInfo}
                    authLoaded={authLoaded}
                    settingsLoading={settingsLoading}
                    isOnline={isOnline}
                    visibleProfile={visibleProfile}
                    onAvatarClick={handleAvatarClick}
                    onProfileNavigate={handleProfileNavigate}
                    onToggleCollapse={onToggleCollapse}
                />
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden bg-[hsl(var(--sidebar-background))]">
                <nav className="px-3 py-4" aria-label="메인 메뉴">
                    <div className="space-y-1">
                        <SidebarNavigationList
                            items={SIDEBAR_NAVIGATION_ENTRIES}
                            isExpanded={isExpanded}
                            currentPath={pathname}
                            onSelect={handleNavigation}
                            onKeyDown={handleKeyDown}
                        />
                    </div>
                </nav>
            </div>

            <div className="flex-shrink-0">
                <SidebarFooterPanel
                    isExpanded={isExpanded}
                    footerItems={SIDEBAR_FOOTER_ENTRIES}
                    currentPath={pathname}
                    onNavigate={handleNavigation}
                    onKeyDown={handleKeyDown}
                />
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
                    className="fixed left-0 top-0 h-full w-64 bg-[hsl(var(--sidebar-background))] text-[hsl(var(--sidebar-foreground))] border-r border-[hsl(var(--sidebar-border))] shadow-xl transform transition-transform duration-300 ease-out animate-slide-in-left"
                    style={{ zIndex: 2147483646, transform: 'translateX(0)' }}
                    onMouseEnter={handleMouseEnter}
                    onMouseLeave={handleMouseLeave}
                    onMouseOver={handleMouseEnter}
                    onMouseOut={handleMouseLeave}
                    aria-label="사이드바 네비게이션 (Portal)"
                    role="navigation"
                >
                    <SidebarContent isExpanded />
                </div>,
                document.body
            )}
            {!effectiveCollapsed && (
                <aside className={SIDEBAR_STYLES.container} aria-label="사이드바 네비게이션" role="navigation">
                    <SidebarContent isExpanded />
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
