import React from 'react';
import { Info, AlertTriangle, AlertCircle, CheckCircle2 } from 'lucide-react';

export interface MessageStripProps {
  type?: 'info' | 'warning' | 'error' | 'success';
  title?: string;
  children: React.ReactNode;
  className?: string;
}

export const MessageStrip: React.FC<MessageStripProps> = ({
  type = 'info',
  title,
  children,
  className = ''
}) => {
  const getIcon = () => {
    switch (type) {
      case 'warning':
        return <AlertTriangle size={16} color="var(--fiori-warning)" style={{ flexShrink: 0, marginTop: '2px' }} />;
      case 'error':
        return <AlertCircle size={16} color="var(--fiori-error)" style={{ flexShrink: 0, marginTop: '2px' }} />;
      case 'success':
        return <CheckCircle2 size={16} color="var(--fiori-success)" style={{ flexShrink: 0, marginTop: '2px' }} />;
      case 'info':
      default:
        return <Info size={16} color="var(--fiori-info)" style={{ flexShrink: 0, marginTop: '2px' }} />;
    }
  };

  return (
    <div className={`fiori-message-strip fiori-message-strip-${type} ${className}`}>
      {getIcon()}
      <div style={{ flex: 1, fontSize: '13px', lineHeight: 1.4 }}>
        {title && <div style={{ fontWeight: 600, marginBottom: '2px' }}>{title}</div>}
        <div>{children}</div>
      </div>
    </div>
  );
};
