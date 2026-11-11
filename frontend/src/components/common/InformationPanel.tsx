import React from 'react';
import { Info, AlertCircle, CheckCircle, HelpCircle } from 'lucide-react';

export interface InformationPanelProps {
  title?: string;
  variant?: 'info' | 'warning' | 'success' | 'neutral';
  children: React.ReactNode;
  icon?: React.ElementType;
  action?: React.ReactNode;
}

export const InformationPanel: React.FC<InformationPanelProps> = ({
  title,
  variant = 'info',
  children,
  icon,
  action
}) => {
  const configs = {
    info: {
      bg: '#EFF6FF',
      border: '#DBEAFE',
      text: 'var(--fiori-text-primary, #0F172A)',
      iconColor: 'var(--fiori-primary, #0066FF)',
      defaultIcon: Info
    },
    warning: {
      bg: '#FFFBEB',
      border: '#FDE68A',
      text: 'var(--fiori-text-primary, #0F172A)',
      iconColor: '#D97706',
      defaultIcon: AlertCircle
    },
    success: {
      bg: '#DCFCE7',
      border: '#BBF7D0',
      text: 'var(--fiori-text-primary, #0F172A)',
      iconColor: '#16A34A',
      defaultIcon: CheckCircle
    },
    neutral: {
      bg: '#F8FAFC',
      border: 'var(--fiori-border, #E2E8F0)',
      text: 'var(--fiori-text-primary, #0F172A)',
      iconColor: '#64748B',
      defaultIcon: HelpCircle
    }
  };

  const current = configs[variant];
  const IconComponent = icon || current.defaultIcon;

  return (
    <div
      style={{
        backgroundColor: current.bg,
        border: `1px solid ${current.border}`,
        borderRadius: 'var(--radius-sm, 8px)',
        padding: '12px 16px',
        display: 'flex',
        alignItems: 'flex-start',
        gap: '12px',
        fontSize: '13px',
        color: current.text,
        lineHeight: 1.45
      }}
    >
      <div style={{ flexShrink: 0, marginTop: '2px' }}>
        <IconComponent size={16} color={current.iconColor} />
      </div>

      <div style={{ flex: 1 }}>
        {title && (
          <div
            style={{
              fontWeight: 600,
              fontSize: '13px',
              marginBottom: '3px',
              color: current.text
            }}
          >
            {title}
          </div>
        )}
        <div style={{ color: 'var(--fiori-text-secondary, #475569)' }}>{children}</div>
      </div>

      {action && <div style={{ flexShrink: 0 }}>{action}</div>}
    </div>
  );
};
