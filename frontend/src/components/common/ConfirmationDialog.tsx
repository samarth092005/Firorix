import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

export interface ConfirmationDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'primary';
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmationDialog: React.FC<ConfirmationDialogProps> = ({
  isOpen,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'primary',
  onConfirm,
  onCancel
}) => {
  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(16, 42, 67, 0.45)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '16px'
      }}
      onClick={onCancel}
    >
      <div
        style={{
          backgroundColor: 'var(--fiori-surface, #FFFFFF)',
          borderRadius: 'var(--radius-md, 6px)',
          boxShadow: 'var(--fiori-shadow-lg)',
          width: '100%',
          maxWidth: '480px',
          overflow: 'hidden'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid var(--fiori-border, #E2E8F0)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {variant === 'danger' && (
              <AlertTriangle size={18} color="var(--fiori-error, #BB0000)" />
            )}
            <h3
              style={{
                fontSize: '15px',
                fontWeight: 600,
                color: 'var(--fiori-navy, #102A43)',
                margin: 0
              }}
            >
              {title}
            </h3>
          </div>
          <button
            type="button"
            onClick={onCancel}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--fiori-text-secondary, #64748B)',
              padding: '4px'
            }}
          >
            <X size={16} />
          </button>
        </div>

        <div style={{ padding: '20px', fontSize: '13px', color: 'var(--fiori-text-primary, #1B2838)', lineHeight: 1.5 }}>
          {message}
        </div>

        <div
          style={{
            padding: '12px 20px',
            backgroundColor: 'var(--fiori-bg, #F5F7FA)',
            borderTop: '1px solid var(--fiori-border, #E2E8F0)',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '10px'
          }}
        >
          <button
            type="button"
            onClick={onCancel}
            className="fiori-btn fiori-btn-secondary"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`fiori-btn ${variant === 'danger' ? 'fiori-btn-danger' : 'fiori-btn-primary'}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};
