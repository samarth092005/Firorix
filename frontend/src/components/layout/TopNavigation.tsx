import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Menu,
  Bell,
  Layers,
  CheckCircle2,
  AlertCircle,
  ChevronDown,
  Server,
  Sparkles,
  ExternalLink,
  LogOut,
  User,
  Clock,
  Settings,
  ShieldCheck,
  Scale
} from 'lucide-react';
import { authService } from '../../services/authService';
import { SystemStatusIndicator } from '../common/SystemStatusIndicator';
import { SystemConnectionState } from '../../services/contracts/types';

export interface TopNavigationProps {
  onToggleSidebar: () => void;
  isSidebarCollapsed: boolean;
  systemConnectionState?: SystemConnectionState;
}

export const TopNavigation: React.FC<TopNavigationProps> = ({
  onToggleSidebar,
  systemConnectionState = 'DEMO_MODE'
}) => {
  const navigate = useNavigate();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [unreadNotifications, setUnreadNotifications] = useState(2);

  const notifRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotifications(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header
      style={{
        height: '48px',
        backgroundColor: '#FFFFFF',
        color: 'var(--fiori-text-primary, #0F172A)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 20px',
        borderBottom: '1px solid var(--fiori-border, #E2E8F0)',
        position: 'sticky',
        top: 0,
        zIndex: 100,
        boxShadow: '0 1px 2px rgba(15, 23, 42, 0.04)'
      }}
    >
      {/* Left: Sidebar Toggle & Modern Brand Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <button
          type="button"
          onClick={onToggleSidebar}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--fiori-text-secondary, #475569)',
            cursor: 'pointer',
            padding: '6px',
            borderRadius: 'var(--radius-sm, 6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.15s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#F1F5F9';
            e.currentTarget.style.color = '#0F172A';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
            e.currentTarget.style.color = '#475569';
          }}
          aria-label="Toggle navigation sidebar"
          title="Toggle Navigation Sidebar"
        >
          <Menu size={18} />
        </button>

        <div
          onClick={() => navigate('/overview')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            cursor: 'pointer',
            userSelect: 'none'
          }}
        >
          <div
            style={{
              width: '28px',
              height: '28px',
              borderRadius: '7px',
              backgroundColor: 'var(--fiori-primary, #0066FF)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 4px rgba(0, 102, 255, 0.25)'
            }}
          >
            <Layers size={16} color="#FFFFFF" />
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
            <span style={{ fontWeight: 700, fontSize: '17px', letterSpacing: '-0.3px', color: '#0F172A' }}>
              Fiori<span style={{ color: 'var(--fiori-primary, #0066FF)' }}>X</span>
            </span>
          </div>
        </div>
      </div>

      {/* Center: Clean & Uncluttered Workspace Context */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          fontSize: '13px',
          color: 'var(--fiori-text-secondary, #64748B)',
          fontWeight: 500
        }}
        className="fiori-topbar-context"
      >
        <span>Modernization Workspace</span>
      </div>

      {/* Right: Actions, Notifications & User Persona */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        {/* Notifications Popover */}
        <div ref={notifRef} style={{ position: 'relative' }}>
          <button
            type="button"
            onClick={() => {
              setShowNotifications(!showNotifications);
              setShowUserMenu(false);
            }}
            style={{
              background: showNotifications ? '#F1F5F9' : 'transparent',
              border: 'none',
              color: 'var(--fiori-text-secondary, #475569)',
              cursor: 'pointer',
              padding: '7px',
              borderRadius: 'var(--radius-sm, 6px)',
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.15s ease'
            }}
            onMouseEnter={(e) => {
              if (!showNotifications) e.currentTarget.style.backgroundColor = '#F1F5F9';
            }}
            onMouseLeave={(e) => {
              if (!showNotifications) e.currentTarget.style.backgroundColor = 'transparent';
            }}
            aria-label="System notifications"
          >
            <Bell size={17} />
            {unreadNotifications > 0 && (
              <span
                style={{
                  position: 'absolute',
                  top: '6px',
                  right: '6px',
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  backgroundColor: '#EA580C'
                }}
              />
            )}
          </button>

          {showNotifications && (
            <div
              style={{
                position: 'absolute',
                right: 0,
                top: '40px',
                width: '320px',
                backgroundColor: '#FFFFFF',
                borderRadius: 'var(--radius-md, 10px)',
                boxShadow: 'var(--fiori-shadow-lg)',
                border: '1px solid var(--fiori-border, #E2E8F0)',
                color: 'var(--fiori-text-primary, #0F172A)',
                zIndex: 200,
                overflow: 'hidden'
              }}
            >
              <div
                style={{
                  padding: '12px 16px',
                  backgroundColor: '#F8FAFC',
                  borderBottom: '1px solid var(--fiori-border, #E2E8F0)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <span style={{ fontWeight: 600, fontSize: '13px', color: '#0F172A' }}>
                  System Notifications
                </span>
                {unreadNotifications > 0 && (
                  <button
                    type="button"
                    onClick={() => setUnreadNotifications(0)}
                    style={{
                      background: 'none',
                      border: 'none',
                      fontSize: '11px',
                      color: 'var(--fiori-primary, #0066FF)',
                      cursor: 'pointer',
                      fontWeight: 600
                    }}
                  >
                    Mark read
                  </button>
                )}
              </div>

              <div style={{ maxHeight: '260px', overflowY: 'auto' }}>
                <div
                  style={{
                    padding: '12px 16px',
                    borderBottom: '1px solid var(--fiori-border-light, #F1F5F9)',
                    display: 'flex',
                    gap: '10px'
                  }}
                >
                  <CheckCircle2 size={16} color="#16A34A" style={{ marginTop: '2px', flexShrink: 0 }} />
                  <div>
                    <div style={{ fontSize: '12px', fontWeight: 600, color: '#0F172A' }}>Assessment Completed: F-53</div>
                    <div style={{ fontSize: '11px', color: 'var(--fiori-text-secondary, #475569)', marginTop: '2px' }}>
                      Explicit successor F0773 verified for Outgoing Payments in S21.
                    </div>
                    <div style={{ fontSize: '10px', color: 'var(--fiori-text-muted, #94A3B8)', marginTop: '4px' }}>
                      2 hours ago
                    </div>
                  </div>
                </div>

                <div
                  style={{
                    padding: '12px 16px',
                    borderBottom: '1px solid var(--fiori-border-light, #F1F5F9)',
                    display: 'flex',
                    gap: '10px'
                  }}
                >
                  <AlertCircle size={16} color="#D97706" style={{ marginTop: '2px', flexShrink: 0 }} />
                  <div>
                    <div style={{ fontSize: '12px', fontWeight: 600, color: '#0F172A' }}>Catalogue Cached</div>
                    <div style={{ fontSize: '11px', color: 'var(--fiori-text-secondary, #475569)', marginTop: '2px' }}>
                      S/4HANA 2023 FPS02 catalogue snapshot active.
                    </div>
                    <div style={{ fontSize: '10px', color: 'var(--fiori-text-muted, #94A3B8)', marginTop: '4px' }}>
                      Today at 08:00
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* User Profile Menu */}
        <div ref={userMenuRef} style={{ position: 'relative' }}>
          <button
            type="button"
            onClick={() => {
              setShowUserMenu(!showUserMenu);
              setShowNotifications(false);
            }}
            style={{
              background: showUserMenu ? '#F1F5F9' : 'transparent',
              border: 'none',
              borderRadius: 'var(--radius-sm, 6px)',
              padding: '4px 8px',
              color: 'var(--fiori-text-primary, #0F172A)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.15s ease'
            }}
            onMouseEnter={(e) => {
              if (!showUserMenu) e.currentTarget.style.backgroundColor = '#F1F5F9';
            }}
            onMouseLeave={(e) => {
              if (!showUserMenu) e.currentTarget.style.backgroundColor = 'transparent';
            }}
            aria-label="User profile and settings"
          >
            <div
              style={{
                width: '26px',
                height: '26px',
                borderRadius: '50%',
                backgroundColor: 'var(--fiori-primary-light, #EFF6FF)',
                color: 'var(--fiori-primary, #0066FF)',
                border: '1px solid #BFDBFE',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '11px',
                fontWeight: 700
              }}
            >
              SC
            </div>
            <span style={{ fontSize: '13px', fontWeight: 500, color: '#0F172A' }}>
              SAP Consultant
            </span>
            <ChevronDown size={13} color="#64748B" />
          </button>

          {showUserMenu && (
            <div
              style={{
                position: 'absolute',
                right: 0,
                top: '40px',
                width: '220px',
                backgroundColor: '#FFFFFF',
                borderRadius: 'var(--radius-md, 10px)',
                boxShadow: 'var(--fiori-shadow-lg)',
                border: '1px solid var(--fiori-border, #E2E8F0)',
                color: 'var(--fiori-text-primary, #0F172A)',
                zIndex: 200,
                overflow: 'hidden'
              }}
            >
              <div
                style={{
                  padding: '12px 14px',
                  borderBottom: '1px solid var(--fiori-border, #E2E8F0)',
                  backgroundColor: '#F8FAFC'
                }}
              >
                <div style={{ fontSize: '13px', fontWeight: 600, color: '#0F172A' }}>
                  {authService.getUser()?.name || 'SAP Lead Consultant'}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--fiori-text-secondary, #475569)', marginTop: '2px' }}>
                  {authService.getUser()?.email || 'consultant@fiorix.corp'}
                </div>
              </div>

              <div style={{ padding: '4px 0' }}>
                <button
                  type="button"
                  onClick={() => {
                    setShowUserMenu(false);
                    navigate('/settings');
                  }}
                  style={{
                    width: '100%',
                    padding: '8px 14px',
                    textAlign: 'left',
                    background: 'none',
                    border: 'none',
                    fontSize: '12px',
                    color: 'var(--fiori-text-primary, #0F172A)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#F1F5F9')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                  <User size={14} color="#64748B" />
                  My Profile
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setShowUserMenu(false);
                    navigate('/assessment-history');
                  }}
                  style={{
                    width: '100%',
                    padding: '8px 14px',
                    textAlign: 'left',
                    background: 'none',
                    border: 'none',
                    fontSize: '12px',
                    color: 'var(--fiori-text-primary, #0F172A)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#F1F5F9')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                  <Clock size={14} color="#16A34A" />
                  Recent Activity
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setShowUserMenu(false);
                    navigate('/settings');
                  }}
                  style={{
                    width: '100%',
                    padding: '8px 14px',
                    textAlign: 'left',
                    background: 'none',
                    border: 'none',
                    fontSize: '12px',
                    color: 'var(--fiori-text-primary, #0F172A)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#F1F5F9')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                  <Settings size={14} color="#475569" />
                  Preferences
                </button>

                <div style={{ height: '1px', backgroundColor: 'var(--fiori-border, #E2E8F0)', margin: '4px 0' }} />

                <button
                  type="button"
                  onClick={() => {
                    setShowUserMenu(false);
                    navigate('/system-configuration');
                  }}
                  style={{
                    width: '100%',
                    padding: '8px 14px',
                    textAlign: 'left',
                    background: 'none',
                    border: 'none',
                    fontSize: '12px',
                    color: 'var(--fiori-text-primary, #0F172A)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#F1F5F9')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                  <ShieldCheck size={14} color="var(--fiori-primary, #0066FF)" />
                  Authorized System Configuration
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setShowUserMenu(false);
                    navigate('/approvals');
                  }}
                  style={{
                    width: '100%',
                    padding: '8px 14px',
                    textAlign: 'left',
                    background: 'none',
                    border: 'none',
                    fontSize: '12px',
                    color: 'var(--fiori-text-primary, #0F172A)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#F1F5F9')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                  <Scale size={14} color="#D97706" />
                  Governance &amp; Approvals
                </button>

                <div style={{ height: '1px', backgroundColor: 'var(--fiori-border, #E2E8F0)', margin: '4px 0' }} />

                <button
                  type="button"
                  onClick={() => {
                    setShowUserMenu(false);
                    authService.logout();
                    navigate('/login');
                  }}
                  style={{
                    width: '100%',
                    padding: '8px 14px',
                    textAlign: 'left',
                    background: 'none',
                    border: 'none',
                    fontSize: '12px',
                    color: '#B91C1C',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#FEE2E2')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                  <LogOut size={14} color="#B91C1C" />
                  Sign Out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
