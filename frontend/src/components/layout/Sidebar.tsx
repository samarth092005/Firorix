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
import './Sidebar.css';

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
    icon: SearchCode
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
    icon: Sparkles
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
      {isMobileOpen && (
        <div
          className="fiori-sidebar-backdrop"
          onClick={onCloseMobile}
        />
      )}

      <aside
        className={`fiori-sidebar ${isCollapsed ? 'collapsed' : ''} ${isMobileOpen ? 'mobile-open' : ''}`}
        aria-label="Application navigation"
      >
        <div className="fiori-sidebar-nav-wrap">
          <nav className="fiori-sidebar-nav">
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
                  className={`fiori-sidebar-link ${isActive ? 'active' : ''}`}
                >
                  <Icon size={17} className="fiori-sidebar-icon" />

                  {!isCollapsed && (
                    <div className="fiori-sidebar-label-wrap">
                      <span className="fiori-sidebar-label">{item.label}</span>
                      {item.badge && (
                        <span className="fiori-sidebar-badge">{item.badge}</span>
                      )}
                    </div>
                  )}
                </NavLink>
              );
            })}
          </nav>
        </div>

        {onToggleCollapse && (
          <div className="fiori-sidebar-footer">
            <button
              type="button"
              onClick={onToggleCollapse}
              className="fiori-sidebar-collapse-btn"
              aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {isCollapsed ? <ChevronRight size={16} /> : (
                <>
                  <ChevronLeft size={16} />
                  <span>Collapse</span>
                </>
              )}
            </button>
          </div>
        )}
      </aside>
    </>
  );
};
