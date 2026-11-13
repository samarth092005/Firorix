import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  SearchCode,
  BookOpen,
  History,
  Sparkles,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

export interface SidebarProps {
  isCollapsed: boolean;
  onToggleCollapse?: () => void;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export interface NavItemConfig {
  to: string;
  label: string;
  icon: React.ElementType;
  badge?: string;
}

export const FIORIFY_NAV_ITEMS: NavItemConfig[] = [
  {
    to: '/overview',
    label: 'Overview',
    icon: LayoutDashboard
  },
  {
    to: '/transaction-discovery',
    label: 'Transaction Discovery',
    icon: SearchCode,
    badge: 'Core'
  },
  {
    to: '/catalogue',
    label: 'Fiori Catalogue',
    icon: BookOpen
  },
  {
    to: '/assessment-history',
    label: 'Assessment History',
    icon: History
  },
  {
    to: '/generation-studio',
    label: 'Generation Studio',
    icon: Sparkles,
    badge: 'Studio'
  }
];

export const Sidebar: React.FC<SidebarProps> = ({
  isCollapsed,
  onToggleCollapse,
  isMobileOpen = false,
  onCloseMobile
}) => {
  const location = useLocation();

  return (
    <>
      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <div
          onClick={onCloseMobile}
          style={{
            position: 'fixed',
            top: '48px',
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.3)',
            zIndex: 90
          }}
        />
      )}

      <aside
        className={`fiori-sidebar ${isCollapsed ? 'collapsed' : ''} ${isMobileOpen ? 'mobile-open' : ''}`}
        style={{
          width: isCollapsed ? '60px' : '230px',
          backgroundColor: '#FFFFFF',
          borderRight: '1px solid var(--fiori-border, #E2E8F0)',
          height: 'calc(100vh - 48px)',
          position: 'sticky',
          top: '48px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          transition: 'width 0.18s cubic-bezier(0.4, 0, 0.2, 1)',
          zIndex: 95,
          flexShrink: 0
        }}
        aria-label="Application navigation"
      >
        {/* Navigation List */}
        <div style={{ padding: '14px 10px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <nav style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
            {FIORIFY_NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive =
                location.pathname === item.to ||
                (item.to === '/transaction-discovery' && (location.pathname === '/transaction-checker' || location.pathname.startsWith('/assessment-results'))) ||
                (item.to === '/catalogue' && location.pathname.startsWith('/catalogue')) ||
                (item.to === '/generation-studio' && (location.pathname.startsWith('/generation-studio') || location.pathname.startsWith('/generation'))) ||
                (item.to === '/assessment-history' && location.pathname.startsWith('/assessment-history'));

              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={() => onCloseMobile && onCloseMobile()}
                  title={isCollapsed ? item.label : undefined}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: isCollapsed ? '0' : '10px',
                    justifyContent: isCollapsed ? 'center' : 'flex-start',
                    padding: isCollapsed ? '9px 0' : '8px 12px',
                    borderRadius: '8px',
                    textDecoration: 'none',
                    fontSize: '13px',
                    fontWeight: isActive ? 600 : 500,
                    color: isActive
                      ? 'var(--fiori-primary, #0066FF)'
                      : 'var(--fiori-text-secondary, #475569)',
                    backgroundColor: isActive
                      ? 'var(--fiori-primary-light, #EFF6FF)'
                      : 'transparent',
                    transition: 'all 0.15s ease',
                    position: 'relative'
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.backgroundColor = '#F8FAFC';
                      e.currentTarget.style.color = '#0F172A';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.backgroundColor = 'transparent';
                      e.currentTarget.style.color = 'var(--fiori-text-secondary, #475569)';
                    }
                  }}
                >
                  <Icon
                    size={17}
                    color={isActive ? 'var(--fiori-primary, #0066FF)' : '#64748B'}
                    style={{ flexShrink: 0 }}
                  />

                  {!isCollapsed && (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flex: 1, minWidth: 0 }}>
                      <span
                        style={{
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis'
                        }}
                      >
                        {item.label}
                      </span>
                      {item.badge && (
                        <span
                          style={{
                            fontSize: '10px',
                            fontWeight: 600,
                            padding: '1px 6px',
                            borderRadius: '10px',
                            backgroundColor: isActive ? 'rgba(0, 102, 255, 0.12)' : '#F1F5F9',
                            color: isActive ? 'var(--fiori-primary, #0066FF)' : '#64748B'
                          }}
                        >
                          {item.badge}
                        </span>
                      )}
                    </div>
                  )}
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* Sidebar Footer: Collapse Toggle */}
        {onToggleCollapse && (
          <div
            style={{
              padding: '10px',
              borderTop: '1px solid var(--fiori-border-light, #F1F5F9)'
            }}
          >
            <button
              type="button"
              onClick={onToggleCollapse}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: isCollapsed ? 'center' : 'flex-start',
                gap: '8px',
                width: '100%',
                padding: '8px 10px',
                background: 'none',
                border: 'none',
                borderRadius: '6px',
                fontSize: '12px',
                color: 'var(--fiori-text-muted, #94A3B8)',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#F8FAFC';
                e.currentTarget.style.color = '#0F172A';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.color = 'var(--fiori-text-muted, #94A3B8)';
              }}
              title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
              {!isCollapsed && <span>Collapse Sidebar</span>}
            </button>
          </div>
        )}
      </aside>
    </>
  );
};
