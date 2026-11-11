import React from 'react';

export interface PageHeaderAction {
  label: string;
  onClick: () => void;
  icon?: React.ElementType;
  variant?: 'primary' | 'secondary' | 'subtle';
  disabled?: boolean;
}

export interface PageHeaderProps {
  title: string;
  subtitle?: string;
  breadcrumbs?: React.ReactNode;
  systemContextBadge?: React.ReactNode;
  actions?: PageHeaderAction[];
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  subtitle,
  breadcrumbs,
  systemContextBadge,
  actions
}) => {
  return (
    <div
      style={{
        marginBottom: '20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '6px'
      }}
    >
      {breadcrumbs}

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '14px'
        }}
      >
        <div style={{ maxWidth: '850px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <h1
              style={{
                fontSize: '21px',
                fontWeight: 700,
                color: 'var(--fiori-text-primary, #0F172A)',
                margin: 0,
                letterSpacing: '-0.3px'
              }}
            >
              {title}
            </h1>
            {systemContextBadge}
          </div>

          {subtitle && (
            <p
              style={{
                fontSize: '13px',
                color: 'var(--fiori-text-secondary, #64748B)',
                margin: '3px 0 0',
                lineHeight: 1.45
              }}
            >
              {subtitle}
            </p>
          )}
        </div>

        {actions && actions.length > 0 && (
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {actions.map((act, idx) => {
              const Icon = act.icon;
              const isPrimary = act.variant === 'primary' || (!act.variant && idx === 0);
              return (
                <button
                  key={act.label}
                  type="button"
                  onClick={act.onClick}
                  disabled={act.disabled}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    height: '34px',
                    padding: '0 14px',
                    fontSize: '13px',
                    fontWeight: 500,
                    borderRadius: '8px',
                    cursor: act.disabled ? 'not-allowed' : 'pointer',
                    transition: 'all 0.15s ease',
                    opacity: act.disabled ? 0.5 : 1,
                    backgroundColor: isPrimary
                      ? 'var(--fiori-primary, #0066FF)'
                      : '#FFFFFF',
                    color: isPrimary
                      ? '#FFFFFF'
                      : 'var(--fiori-text-primary, #0F172A)',
                    border: isPrimary
                      ? '1px solid var(--fiori-primary, #0066FF)'
                      : '1px solid var(--fiori-border, #E2E8F0)',
                    boxShadow: isPrimary
                      ? '0 1px 3px rgba(0, 102, 255, 0.25)'
                      : '0 1px 2px rgba(0, 0, 0, 0.04)'
                  }}
                  onMouseEnter={(e) => {
                    if (!act.disabled) {
                      e.currentTarget.style.backgroundColor = isPrimary
                        ? 'var(--fiori-primary-hover, #0052CC)'
                        : '#F8FAFC';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!act.disabled) {
                      e.currentTarget.style.backgroundColor = isPrimary
                        ? 'var(--fiori-primary, #0066FF)'
                        : '#FFFFFF';
                    }
                  }}
                >
                  {Icon && <Icon size={14} />}
                  {act.label}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
