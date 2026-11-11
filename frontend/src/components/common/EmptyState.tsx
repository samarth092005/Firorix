import React from 'react';
import { Inbox } from 'lucide-react';

export interface EmptyStateProps {
  title: string;
  description: string;
  icon?: React.ElementType;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  icon: Icon = Inbox,
  action
}) => {
  return (
    <div
      style={{
        padding: '48px 24px',
        textAlign: 'center',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'var(--fiori-surface, #FFFFFF)',
        borderRadius: 'var(--radius-md, 6px)',
        border: '1px dashed var(--fiori-border, #E2E8F0)'
      }}
    >
      <div
        style={{
          width: '48px',
          height: '48px',
          borderRadius: '50%',
          backgroundColor: 'var(--fiori-bg, #F5F7FA)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--fiori-text-secondary, #64748B)',
          marginBottom: '16px'
        }}
      >
        <Icon size={24} />
      </div>

      <h3
        style={{
          fontSize: '15px',
          fontWeight: 600,
          color: 'var(--fiori-navy, #102A43)',
          margin: '0 0 6px'
        }}
      >
        {title}
      </h3>

      <p
        style={{
          fontSize: '13px',
          color: 'var(--fiori-text-secondary, #64748B)',
          maxWidth: '420px',
          margin: '0 0 16px',
          lineHeight: 1.5
        }}
      >
        {description}
      </p>

      {action && (
        <button
          type="button"
          onClick={action.onClick}
          className="fiori-btn fiori-btn-primary"
        >
          {action.label}
        </button>
      )}
    </div>
  );
};
