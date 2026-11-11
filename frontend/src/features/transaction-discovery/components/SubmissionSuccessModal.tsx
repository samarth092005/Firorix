import React from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, ArrowRight, History, SearchCode, ExternalLink } from 'lucide-react';
import { StatusBadge } from '../../../components/common';

export interface SubmissionSuccessModalProps {
  isOpen: boolean;
  tcode: string;
  systemId: string;
  client: string;
  assessmentId: string;
  requestId: string;
  assessmentResult: string;
  onReset: () => void;
}

export const SubmissionSuccessModal: React.FC<SubmissionSuccessModalProps> = ({
  isOpen,
  tcode,
  systemId,
  client,
  assessmentId,
  requestId,
  assessmentResult,
  onReset
}) => {
  const navigate = useNavigate();

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(16, 42, 67, 0.55)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '16px'
      }}
    >
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: 'var(--radius-md, 6px)',
          boxShadow: 'var(--fiori-shadow-lg)',
          width: '100%',
          maxWidth: '540px',
          overflow: 'hidden',
          border: '1px solid var(--fiori-border, #E2E8F0)'
        }}
      >
        {/* Modal Header */}
        <div
          style={{
            padding: '20px 24px',
            backgroundColor: 'var(--fiori-success-bg, #EDF7ED)',
            borderBottom: '1px solid var(--fiori-success-border, #A3D9A3)',
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}
        >
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              backgroundColor: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}
          >
            <CheckCircle2 size={24} color="var(--fiori-success, #188918)" />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: 'var(--fiori-navy, #102A43)' }}>
              Transaction Assessment Successfully Registered
            </h3>
            <span style={{ fontSize: '12px', color: 'var(--fiori-success, #188918)', fontWeight: 600 }}>
              Audit &amp; Discovery Request Logged in S21 Ledger
            </span>
          </div>
        </div>

        {/* Modal Body */}
        <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '13px' }}>
          <p style={{ margin: 0, color: 'var(--fiori-text-primary, #1B2838)', lineHeight: 1.5 }}>
            Discovery parameters and business context for <strong>{tcode}</strong> have been evaluated
            against the target S21 S/4HANA 2023 release profile and indexed in the persistent ledger.
          </p>

          <div
            style={{
              padding: '14px 16px',
              backgroundColor: 'var(--fiori-bg, #F5F7FA)',
              borderRadius: 'var(--radius-sm, 4px)',
              border: '1px solid var(--fiori-border, #E2E8F0)',
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: '10px',
              fontSize: '12px'
            }}
          >
            <div>
              <span style={{ color: 'var(--fiori-text-secondary, #64748B)' }}>Assessment ID:</span>
              <div style={{ fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--fiori-navy, #102A43)', marginTop: '2px' }}>
                {assessmentId}
              </div>
            </div>



            <div>
              <span style={{ color: 'var(--fiori-text-secondary, #64748B)' }}>Target Landscape:</span>
              <div style={{ fontWeight: 600, marginTop: '2px' }}>
                {systemId} / Client {client}
              </div>
            </div>

            <div>
              <span style={{ color: 'var(--fiori-text-secondary, #64748B)' }}>Initial Determination:</span>
              <div style={{ marginTop: '2px' }}>
                <StatusBadge status={assessmentResult} size="sm" />
              </div>
            </div>
          </div>
        </div>

        {/* Modal Actions */}
        <div
          style={{
            padding: '14px 24px',
            backgroundColor: 'var(--fiori-bg, #F5F7FA)',
            borderTop: '1px solid var(--fiori-border, #E2E8F0)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '10px'
          }}
        >
          <button
            type="button"
            onClick={onReset}
            className="fiori-btn fiori-btn-secondary"
            style={{ fontSize: '12px' }}
          >
            <SearchCode size={13} /> Discover Another T-Code
          </button>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              onClick={() => navigate('/assessment-history')}
              className="fiori-btn fiori-btn-secondary"
              style={{ fontSize: '12px' }}
            >
              <History size={13} /> View in Ledger
            </button>

            <button
              type="button"
              onClick={() => navigate(`/assessment-results?id=${assessmentId}`)}
              className="fiori-btn fiori-btn-primary"
              style={{ fontSize: '12px', fontWeight: 700 }}
            >
              Open Assessment Workspace <ArrowRight size={13} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
