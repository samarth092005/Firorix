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
  Scale,
  X,
  Trash2,
  Inbox,
  FileText,
  Zap
} from 'lucide-react';
import { authService } from '../../services/authService';
import { notificationService, AppNotification } from '../../services/notificationService';
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
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [notifFilter, setNotifFilter] = useState<'ALL' | 'UNREAD'>('ALL');

  // Subscribe to live notifications & initialize store
  useEffect(() => {
    const unsubscribe = notificationService.subscribe((items) => {
      setNotifications(items);
    });
    notificationService.initialize();
    return () => unsubscribe();
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;

  // Format relative timestamp
  const formatRelativeTime = (isoString: string): string => {
    try {
      const now = Date.now();
      const past = new Date(isoString).getTime();
      const diffMs = now - past;
      const diffMins = Math.floor(diffMs / 60000);
      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `${diffHours}h ago`;
      const diffDays = Math.floor(diffHours / 24);
      if (diffDays === 1) return 'Yesterday';
      return `${diffDays}d ago`;
    } catch {
      return 'Recent';
    }
  };

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
            {unreadCount > 0 && (
              <span
                style={{
                  position: 'absolute',
                  top: '4px',
                  right: '4px',
                  minWidth: '15px',
                  height: '15px',
                  borderRadius: '10px',
                  backgroundColor: '#EA580C',
                  color: '#FFFFFF',
                  fontSize: '9px',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '0 3px',
                  boxShadow: '0 1px 3px rgba(234, 88, 12, 0.4)'
                }}
              >
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {showNotifications && (
            <div
              style={{
                position: 'absolute',
                right: 0,
                top: '42px',
                width: '380px',
                backgroundColor: '#FFFFFF',
                borderRadius: '12px',
                boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.12), 0 8px 10px -6px rgba(0, 0, 0, 0.08)',
                border: '1px solid var(--fiori-border, #E2E8F0)',
                color: 'var(--fiori-text-primary, #0F172A)',
                zIndex: 200,
                overflow: 'hidden'
              }}
            >
              {/* Header */}
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
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontWeight: 700, fontSize: '13px', color: '#0F172A' }}>
                    Notifications
                  </span>
                  {unreadCount > 0 && (
                    <span
                      style={{
                        fontSize: '11px',
                        padding: '1px 6px',
                        borderRadius: '10px',
                        backgroundColor: '#EFF6FF',
                        color: 'var(--fiori-primary, #0066FF)',
                        fontWeight: 600
                      }}
                    >
                      {unreadCount} new
                    </span>
                  )}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  {unreadCount > 0 && (
                    <button
                      type="button"
                      onClick={() => notificationService.markAllAsRead()}
                      style={{
                        background: 'none',
                        border: 'none',
                        fontSize: '11px',
                        color: 'var(--fiori-primary, #0066FF)',
                        cursor: 'pointer',
                        fontWeight: 600,
                        padding: '2px 4px'
                      }}
                      title="Mark all as read"
                    >
                      Mark all read
                    </button>
                  )}
                  {notifications.length > 0 && (
                    <button
                      type="button"
                      onClick={() => notificationService.clearAll()}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#94A3B8',
                        cursor: 'pointer',
                        padding: '2px',
                        display: 'flex',
                        alignItems: 'center'
                      }}
                      title="Clear all notifications"
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              </div>

              {/* Filter Tabs */}
              <div
                style={{
                  display: 'flex',
                  gap: '8px',
                  padding: '8px 16px',
                  backgroundColor: '#FFFFFF',
                  borderBottom: '1px solid #F1F5F9'
                }}
              >
                <button
                  type="button"
                  onClick={() => setNotifFilter('ALL')}
                  style={{
                    padding: '4px 10px',
                    borderRadius: '14px',
                    fontSize: '11px',
                    fontWeight: 600,
                    border: 'none',
                    cursor: 'pointer',
                    backgroundColor: notifFilter === 'ALL' ? '#0F172A' : '#F1F5F9',
                    color: notifFilter === 'ALL' ? '#FFFFFF' : '#64748B'
                  }}
                >
                  All ({notifications.length})
                </button>
                <button
                  type="button"
                  onClick={() => setNotifFilter('UNREAD')}
                  style={{
                    padding: '4px 10px',
                    borderRadius: '14px',
                    fontSize: '11px',
                    fontWeight: 600,
                    border: 'none',
                    cursor: 'pointer',
                    backgroundColor: notifFilter === 'UNREAD' ? '#0F172A' : '#F1F5F9',
                    color: notifFilter === 'UNREAD' ? '#FFFFFF' : '#64748B'
                  }}
                >
                  Unread ({unreadCount})
                </button>
              </div>

              {/* List */}
              <div style={{ maxHeight: '340px', overflowY: 'auto' }}>
                {notifications.filter((n) => (notifFilter === 'UNREAD' ? !n.read : true)).length === 0 ? (
                  <div
                    style={{
                      padding: '36px 20px',
                      textAlign: 'center',
                      color: '#94A3B8',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '8px'
                    }}
                  >
                    <Inbox size={28} color="#CBD5E1" />
                    <div style={{ fontSize: '13px', fontWeight: 600, color: '#475569' }}>
                      {notifFilter === 'UNREAD' ? 'No unread notifications' : 'No notifications'}
                    </div>
                    <div style={{ fontSize: '11px', color: '#94A3B8' }}>
                      You are all caught up with your workspace activities.
                    </div>
                  </div>
                ) : (
                  notifications
                    .filter((n) => (notifFilter === 'UNREAD' ? !n.read : true))
                    .map((item) => {
                      const getIcon = () => {
                        switch (item.category) {
                          case 'GENERATION':
                            return <Sparkles size={15} color="#0284C7" />;
                          case 'ASSESSMENT':
                            return item.type === 'SUCCESS' ? (
                              <CheckCircle2 size={15} color="#16A34A" />
                            ) : (
                              <FileText size={15} color="#0066FF" />
                            );
                          case 'DISCOVERY':
                            return <Zap size={15} color="#EA580C" />;
                          case 'SYSTEM':
                          default:
                            return <Server size={15} color="#6366F1" />;
                        }
                      };

                      return (
                        <div
                          key={item.id}
                          style={{
                            padding: '12px 16px',
                            borderBottom: '1px solid #F1F5F9',
                            display: 'flex',
                            gap: '12px',
                            backgroundColor: item.read ? '#FFFFFF' : '#F8FAFC',
                            cursor: item.actionUrl ? 'pointer' : 'default',
                            transition: 'background-color 0.15s ease',
                            position: 'relative'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = item.read ? '#F8FAFC' : '#F1F5F9';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = item.read ? '#FFFFFF' : '#F8FAFC';
                          }}
                          onClick={() => {
                            notificationService.markAsRead(item.id);
                            if (item.actionUrl) {
                              navigate(item.actionUrl);
                              setShowNotifications(false);
                            }
                          }}
                        >
                          <div style={{ marginTop: '2px', flexShrink: 0 }}>{getIcon()}</div>
                          <div style={{ flex: 1, minWidth: 0, paddingRight: '16px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                              <span
                                style={{
                                  fontSize: '12px',
                                  fontWeight: item.read ? 600 : 700,
                                  color: '#0F172A'
                                }}
                              >
                                {item.title}
                              </span>
                              {!item.read && (
                                <span
                                  style={{
                                    width: '6px',
                                    height: '6px',
                                    borderRadius: '50%',
                                    backgroundColor: 'var(--fiori-primary, #0066FF)'
                                  }}
                                />
                              )}
                            </div>
                            <div
                              style={{
                                fontSize: '11px',
                                color: '#475569',
                                lineHeight: '1.4',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis'
                              }}
                            >
                              {item.message}
                            </div>
                            <div
                              style={{
                                fontSize: '10px',
                                color: '#94A3B8',
                                marginTop: '4px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px'
                              }}
                            >
                              <span>{formatRelativeTime(item.timestamp)}</span>
                              {item.actionLabel && (
                                <span style={{ color: 'var(--fiori-primary, #0066FF)', fontWeight: 600 }}>
                                  {item.actionLabel} →
                                </span>
                              )}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              notificationService.dismiss(item.id);
                            }}
                            style={{
                              position: 'absolute',
                              top: '10px',
                              right: '10px',
                              background: 'transparent',
                              border: 'none',
                              color: '#94A3B8',
                              cursor: 'pointer',
                              padding: '2px',
                              borderRadius: '4px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}
                            title="Dismiss notification"
                          >
                            <X size={13} />
                          </button>
                        </div>
                      );
                    })
                )}
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
