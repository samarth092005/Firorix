import React from 'react';

export interface KPICardProps {
  label: string;
  value: number | string;
  description: string;
  icon: React.ElementType;
  tone?: 'default' | 'success' | 'warning' | 'info' | 'purple';
  badgeText?: string;
  onClick?: () => void;
}

export const KPICard: React.FC<KPICardProps> = ({
  label,
  value,
  description,
  icon: Icon,
  tone = 'default',
  badgeText,
  onClick
}) => {
  const toneStyles: Record<
    string,
    { iconBg: string; iconColor: string; badgeBg: string; badgeColor: string }
  > = {
    default: {
      iconBg: '#F1F5F9',
      iconColor: '#475569',
      badgeBg: '#F1F5F9',
      badgeColor: '#475569'
    },
    success: {
      iconBg: '#DCFCE7',
      iconColor: '#16A34A',
      badgeBg: '#DCFCE7',
      badgeColor: '#15803D'
    },
    warning: {
      iconBg: '#FEF3C7',
      iconColor: '#D97706',
      badgeBg: '#FEF3C7',
      badgeColor: '#B45309'
    },
    info: {
      iconBg: '#EFF6FF',
      iconColor: '#0066FF',
      badgeBg: '#EFF6FF',
      badgeColor: '#0066FF'
    },
    purple: {
      iconBg: '#F3E8FF',
      iconColor: '#7E22CE',
      badgeBg: '#F3E8FF',
      badgeColor: '#7E22CE'
    }
  };

  const currentTone = toneStyles[tone] || toneStyles.default;

  return (
    <div
      onClick={onClick}
      style={{
        backgroundColor: '#FFFFFF',
        border: '1px solid var(--fiori-border, #E2E8F0)',
        borderRadius: 'var(--radius-md, 10px)',
        padding: '18px 20px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        boxShadow: 'var(--fiori-shadow-card, 0 1px 3px rgba(15, 23, 42, 0.04), 0 4px 12px rgba(15, 23, 42, 0.03))',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'all 0.18s cubic-bezier(0.4, 0, 0.2, 1)',
        minHeight: '136px'
      }}
      className={onClick ? 'fiori-kpi-clickable' : ''}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <span
          style={{
            fontSize: '13px',
            fontWeight: 500,
            color: 'var(--fiori-text-secondary, #64748B)',
            letterSpacing: '0.1px'
          }}
        >
          {label}
        </span>
        <div
          style={{
            width: '32px',
            height: '32px',
            borderRadius: '8px',
            backgroundColor: currentTone.iconBg,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}
        >
          <Icon size={17} color={currentTone.iconColor} />
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '8px' }}>
        <span
          style={{
            fontSize: '30px',
            fontWeight: 700,
            lineHeight: 1,
            color: 'var(--fiori-text-primary, #0F172A)',
            letterSpacing: '-0.5px',
            fontFeatureSettings: '"tnum"'
          }}
        >
          {value}
        </span>
        {badgeText && (
          <span
            style={{
              fontSize: '11px',
              padding: '2px 8px',
              borderRadius: '20px',
              backgroundColor: currentTone.badgeBg,
              color: currentTone.badgeColor,
              fontWeight: 600
            }}
          >
            {badgeText}
          </span>
        )}
      </div>

      <p
        style={{
          margin: 0,
          fontSize: '12px',
          color: 'var(--fiori-text-muted, #94A3B8)',
          lineHeight: 1.4
        }}
      >
        {description}
      </p>
    </div>
  );
};
