'use client';

import React, { ReactNode, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
// AppHeader 제거됨 - DashboardMain에서 자체 헤더로 관리
// MonitoringProvider 제거됨 - 기획 변경으로 불필요
import { AuthProvider } from '../contexts/AuthContext';
import { ThemeProvider } from '../providers/ThemeProvider';
import { useSettings } from './settings/hooks/useSettings';
import { Logger } from '../../shared/logger';
import '../styles/index.css';
import { SidebarShell } from '../components/layout/sidebar';

interface ClientLayoutProps {
    readonly children: ReactNode;
    readonly initialAuth?: any;
}

function ClientLayoutInner({ children }: { children: ReactNode }): React.ReactElement {
    const location = useLocation();
    const navigate = useNavigate();
    const { settings, loading: settingsLoading, updateSetting } = useSettings();
    const pathname = location.pathname;

    const isFocusMode = settings?.ui?.focusMode ?? false;
    const isProjectPage = pathname.startsWith('/projects/');

    const handleNavigate = useCallback((href: string): void => {
        try {
            if (typeof window === 'undefined') return;

            let url: URL | null = null;
            try {
                url = new URL(href, window.location.href);
            } catch (e) {
                Logger.warn('LAYOUT', 'Blocked malformed navigation URL', { href });
                return;
            }

            const isSameOrigin = url.origin === window.location.origin;
            const isRelative = href.startsWith('/');

            if (isRelative || isSameOrigin) {
                Logger.debug('LAYOUT', 'Client-side navigation', { href });
                navigate(href);
            } else {
                Logger.debug('LAYOUT', 'External navigation', { href });
                window.open(url.toString(), '_blank', 'noopener,noreferrer');
            }
        } catch (e) {
            Logger.warn('LAYOUT', 'Blocked unsafe navigation attempt', { href, error: e });
        }
    }, [navigate]);

    return (
        <div className="flex h-screen w-screen overflow-hidden app-root">
            {!isFocusMode && !isProjectPage && (
                <aside className="flex-shrink-0 h-full">
                    <SidebarShell
                        pathname={pathname}
                        settings={settings}
                        settingsLoading={settingsLoading}
                        updateSetting={updateSetting}
                        onNavigate={handleNavigate}
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
