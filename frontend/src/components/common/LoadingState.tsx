import React from 'react';
import { Loader2 } from 'lucide-react';

export interface LoadingStateProps {
  message?: string;
  subMessage?: string;
  height?: string;
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  message = 'Loading data...',
  subMessage,
  height = '240px'
}) => {
  return (
    <div
      style={{
        height,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '12px',
        color: 'var(--fiori-text-secondary, #64748B)'
      }}
    >
      <Loader2
        size={28}
        color="var(--fiori-primary, #0A6ED1)"
        style={{ animation: 'spin 1s linear infinite' }}
      />
      <div style={{ textAlign: 'center' }}>
        <p style={{ margin: 0, fontSize: '13px', fontWeight: 600, color: 'var(--fiori-navy, #102A43)' }}>
          {message}
        </p>
        {subMessage && (
          <p style={{ margin: '4px 0 0', fontSize: '12px', color: 'var(--fiori-text-secondary, #64748B)' }}>
            {subMessage}
          </p>
        )}
      </div>
    </div>
  );
};
