import React from 'react';
import { Modal } from './Modal';
import { AlertTriangle } from 'lucide-react';

export interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isDestructive?: boolean;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  isDestructive = false
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      maxWidth="460px"
      footer={
        <>
          <button type="button" className="fiori-btn fiori-btn-secondary" onClick={onClose}>
            {cancelLabel}
          </button>
          <button
            type="button"
            className={`fiori-btn ${isDestructive ? 'fiori-btn-danger' : 'fiori-btn-primary'}`}
            onClick={() => {
              onConfirm();
              onClose();
            }}
          >
            {confirmLabel}
          </button>
        </>
      }
    >
      <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
        <AlertTriangle size={24} color={isDestructive ? 'var(--fiori-error)' : 'var(--fiori-warning)'} style={{ flexShrink: 0 }} />
        <p style={{ fontSize: '13px', lineHeight: 1.5 }}>{message}</p>
      </div>
    </Modal>
  );
};
