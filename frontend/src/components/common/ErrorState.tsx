import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export interface ErrorStateProps {
  title?: string;
  message: string;
  details?: string;
  onRetry?: () => void;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'Assessment Operation Failed',
  message,
  details,
  onRetry
}) => {
  return (
    <div
      style={{
        padding: '32px 24px',
        backgroundColor: 'var(--fiori-error-bg, #FDF2F2)',
        border: '1px solid var(--fiori-error-border, #F8B4B4)',
        borderRadius: 'var(--radius-md, 6px)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        textAlign: 'center',
        maxWidth: '560px',
        margin: '24px auto'
      }}
    >
      <div
        style={{
          width: '40px',
          height: '40px',
          borderRadius: '50%',
          backgroundColor: '#FDE8E8',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '12px'
        }}
      >
        <AlertTriangle size={22} color="var(--fiori-error, #BB0000)" />
      </div>

      <h3
        style={{
          fontSize: '15px',
          fontWeight: 600,
          color: 'var(--fiori-error, #BB0000)',
          margin: '0 0 6px'
        }}
      >
        {title}
      </h3>

      <p
        style={{
          fontSize: '13px',
          color: 'var(--fiori-text-primary, #1B2838)',
          margin: '0 0 8px',
          lineHeight: 1.4
        }}
      >
        {message}
      </p>

      {details && (
        <pre
          style={{
            fontSize: '11px',
            backgroundColor: '#FFFFFF',
            padding: '8px 12px',
            borderRadius: 'var(--radius-xs, 2px)',
            border: '1px solid var(--fiori-border, #E2E8F0)',
            maxWidth: '100%',
            overflowX: 'auto',
            color: 'var(--fiori-text-secondary, #64748B)',
            margin: '8px 0 16px',
            textAlign: 'left'
          }}
        >
          {details}
        </pre>
      )}

      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="fiori-btn fiori-btn-secondary"
          style={{ marginTop: '8px' }}
        >
          <RefreshCw size={13} /> Retry Operation
        </button>
      )}
    </div>
  );
};
