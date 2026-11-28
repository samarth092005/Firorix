import React, { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { TopNavigation } from './TopNavigation';
import { Sidebar } from './Sidebar';
import { systemHealthService } from '../../services/systemHealthService';
import { SystemConnectionState } from '../../services/contracts/types';

export const AppShell: React.FC = () => {
  const location = useLocation();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [systemConnectionState, setSystemConnectionState] = useState<SystemConnectionState>('DEMO_MODE');

  useEffect(() => {
    if (location.pathname.startsWith('/generation-studio')) {
      setIsSidebarCollapsed(true);
    }
  }, [location.pathname]);

  useEffect(() => {
    let active = true;
    systemHealthService
      .getSystemHealth()
      .then((health) => {
        if (active && health?.connectionState) {
          setSystemConnectionState(health.connectionState);
        }
      })
      .catch(() => {
        // Keep safe DEMO_MODE fallback if backend health probe is unreachable
      });
    return () => {
      active = false;
    };
  }, []);

  const handleToggleSidebar = () => {
    // If mobile width, toggle drawer; otherwise toggle collapsed
    if (window.innerWidth <= 768) {
      setIsMobileOpen(!isMobileOpen);
    } else {
      setIsSidebarCollapsed(!isSidebarCollapsed);
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
        height: '100vh',
        overflow: 'hidden',
        backgroundColor: 'var(--fiori-bg, #F8FAFC)'
      }}
    >
      <TopNavigation
        onToggleSidebar={handleToggleSidebar}
        isSidebarCollapsed={isSidebarCollapsed}
        systemConnectionState={systemConnectionState}
      />

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden', position: 'relative' }}>
        <Sidebar
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          isMobileOpen={isMobileOpen}
          onCloseMobile={() => setIsMobileOpen(false)}
        />

        <main
          id="fiorify-main-content"
          style={{
            flex: 1,
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            backgroundColor: 'var(--fiori-bg, #F8FAFC)',
            minWidth: 0
          }}
        >
          <div
            style={{
              flex: 1,
              padding: 'clamp(18px, 2vw, 28px) clamp(20px, 2.5vw, 36px)',
              maxWidth: '1720px',
              width: '100%',
              margin: '0 auto',
              boxSizing: 'border-box'
            }}
          >
            <React.Suspense
              fallback={
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minHeight: '360px',
                    gap: '12px'
                  }}
                >
                  <div
                    style={{
                      width: '32px',
                      height: '32px',
                      border: '3px solid #0070F2',
                      borderTopColor: 'transparent',
                      borderRadius: '50%',
                      animation: 'spin 1s linear infinite'
                    }}
                  />
                  <span style={{ fontSize: '14px', fontWeight: 500, color: '#64748B' }}>Loading view...</span>
                </div>
              }
            >
              <Outlet />
            </React.Suspense>
          </div>
        </main>
      </div>
    </div>
  );
};
