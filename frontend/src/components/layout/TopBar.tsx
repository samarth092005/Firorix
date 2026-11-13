import React from 'react';
import { Menu, Search, Bell, User, Layers, Settings } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export interface TopBarProps {
  onToggleSidebar: () => void;
  isSidebarCollapsed: boolean;
}

export const TopBar: React.FC<TopBarProps> = ({ onToggleSidebar }) => {
  const navigate = useNavigate();

  return (
    <header
      style={{
        height: '48px',
        backgroundColor: 'var(--fiori-navy)',
        color: '#FFFFFF',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 16px',
        borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
        zIndex: 50,
        position: 'sticky',
        top: 0
      }}
    >
      {/* Left: Hamburger & Brand */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        <button
          type="button"
          onClick={onToggleSidebar}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#FFFFFF',
            cursor: 'pointer',
            padding: '4px',
            display: 'flex',
            alignItems: 'center'
          }}
          aria-label="Toggle navigation menu"
        >
          <Menu size={18} />
        </button>

        <div
          onClick={() => navigate('/transaction-checker')}
          style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}
        >
          <Layers size={20} color="#58B8D4" />
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontWeight: 700, fontSize: '15px', letterSpacing: '0.5px', lineHeight: 1.1 }}>
              Fiori<span style={{ color: '#58B8D4' }}>X</span>
            </span>
            <span style={{ fontSize: '10px', color: 'rgba(255, 255, 255, 0.65)', fontWeight: 400 }}>
              SAP Transaction &amp; Fiori Application Discovery
            </span>
          </div>
        </div>
      </div>

      {/* Middle: Clean Context & System Badge */}
      <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.8)', display: 'flex', alignItems: 'center', gap: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span>Workspace:</span>
          <strong style={{ color: '#58B8D4' }}>Finance &amp; Operations Transformation</strong>
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '2px 8px',
            borderRadius: '12px',
            backgroundColor: 'rgba(88, 184, 212, 0.15)',
            border: '1px solid rgba(88, 184, 212, 0.3)',
            fontSize: '11px',
            fontWeight: 600,
            color: '#58B8D4'
          }}
          title="Target SAP S/4HANA System: S21 Client 200"
        >
          <span
            style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              backgroundColor: '#107E3E'
            }}
          />
          <span>SAP S21:200</span>
        </div>
      </div>

      {/* Right: Actions & User Persona */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <button
          type="button"
          onClick={() => navigate('/transaction-discovery')}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'rgba(255, 255, 255, 0.8)',
            cursor: 'pointer',
            padding: '6px',
            display: 'flex',
            alignItems: 'center'
          }}
          title="Transaction Checker"
          aria-label="Transaction Checker"
        >
          <Search size={16} />
        </button>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '4px 10px',
            backgroundColor: 'rgba(255, 255, 255, 0.08)',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid rgba(255, 255, 255, 0.12)'
          }}
          title="Demo User Persona"
        >
          <User size={14} color="#FFFFFF" />
          <span style={{ fontSize: '12px', fontWeight: 500, color: '#FFFFFF' }}>
            Demo User
          </span>
        </div>
      </div>
    </header>
  );
};
