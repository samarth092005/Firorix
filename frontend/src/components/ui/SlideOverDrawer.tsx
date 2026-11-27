import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import './SlideOverDrawer.css';

export interface SlideOverDrawerProps {
  open: boolean;
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
}

export const SlideOverDrawer: React.FC<SlideOverDrawerProps> = ({
  open,
  title,
  subtitle,
  onClose,
  children
}) => {
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fiorify-drawer-backdrop" onClick={onClose} role="presentation">
      <aside
        className="fiorify-drawer-panel"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="fiorify-drawer-header">
          <div>
            <h2 className="fiorify-drawer-title">{title}</h2>
            {subtitle && <p className="fiorify-drawer-subtitle">{subtitle}</p>}
          </div>
          <button
            type="button"
            className="fiorify-drawer-close"
            onClick={onClose}
            aria-label="Close panel"
          >
            <X size={16} />
          </button>
        </header>
        <div className="fiorify-drawer-body">{children}</div>
      </aside>
    </div>
  );
};
