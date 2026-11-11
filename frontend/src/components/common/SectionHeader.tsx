import React from 'react';

export interface SectionHeaderProps {
  title: string;
  description?: string;
  badge?: React.ReactNode;
  action?: React.ReactNode;
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({
  title,
  description,
  badge,
  action
}) => {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '14px',
        paddingBottom: '10px',
        borderBottom: '1px solid var(--fiori-border-light, #F1F5F9)'
      }}
    >
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <h2
            style={{
              fontSize: '15px',
              fontWeight: 600,
              color: 'var(--fiori-text-primary, #0F172A)',
              margin: 0
            }}
          >
            {title}
          </h2>
          {badge}
        </div>
        {description && (
          <p
            style={{
              fontSize: '12px',
              color: 'var(--fiori-text-secondary, #64748B)',
              margin: '2px 0 0'
            }}
          >
            {description}
          </p>
        )}
      </div>

      {action && <div>{action}</div>}
    </div>
  );
};
