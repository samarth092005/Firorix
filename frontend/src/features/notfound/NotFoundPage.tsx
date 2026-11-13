import React from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, ArrowLeft } from 'lucide-react';

export const NotFoundPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div style={{ padding: '64px 24px', textAlign: 'center', maxWidth: '600px', margin: '0 auto' }}>
      <div style={{ display: 'inline-flex', padding: '16px', backgroundColor: 'var(--fiori-error-bg)', borderRadius: '50%', marginBottom: '16px' }}>
        <AlertCircle size={36} color="var(--fiori-error)" />
      </div>
      <h1 style={{ fontSize: '24px', fontWeight: 700, marginBottom: '8px' }}>404 — Page Not Found</h1>
      <p style={{ color: 'var(--fiori-text-secondary)', fontSize: '14px', marginBottom: '24px', lineHeight: 1.5 }}>
        The requested navigation endpoint does not exist in the Fiorify platform or the resource has been relocated.
      </p>
      <button
        type="button"
        className="fiori-btn fiori-btn-primary"
        onClick={() => navigate('/dashboard')}
      >
        <ArrowLeft size={14} /> Return to Dashboard
      </button>
    </div>
  );
};
