import React, { useEffect } from 'react';
import { X } from 'lucide-react';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidth?: string;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  footer,
  maxWidth = '580px'
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(20, 44, 64, 0.45)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '20px'
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="fiori-card"
        style={{
          width: '100%',
          maxWidth,
          maxHeight: '85vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: 'var(--fiori-shadow-lg)',
          border: '1px solid var(--fiori-border)'
        }}
      >
        {/* Header */}
        <div className="fiori-card-header" style={{ padding: '14px 18px' }}>
          <div>
            <div className="fiori-card-title">{title}</div>
            {subtitle && (
              <div style={{ fontSize: '12px', color: 'var(--fiori-text-secondary)', marginTop: '2px' }}>
                {subtitle}
              </div>
            )}
          </div>
          <button
            onClick={onClose}
            className="fiori-btn fiori-btn-subtle"
            style={{ width: '28px', height: '28px', padding: 0 }}
            aria-label="Close dialog"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '18px', overflowY: 'auto', flex: 1 }}>
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div
            style={{
              padding: '12px 18px',
              borderTop: '1px solid var(--fiori-border-light)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: '8px',
              backgroundColor: 'var(--fiori-surface-subtle)'
            }}
          >
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};
