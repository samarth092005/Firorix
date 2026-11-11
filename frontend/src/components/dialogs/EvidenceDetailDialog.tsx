import React from 'react';
import { Modal } from './Modal';
import { TechnicalEvidence } from '../../types';
import { StatusBadge } from '../status/StatusBadge';

export interface EvidenceDetailDialogProps {
  isOpen: boolean;
  onClose: () => void;
  objectName: string;
  evidence: TechnicalEvidence | null;
}

export const EvidenceDetailDialog: React.FC<EvidenceDetailDialogProps> = ({
  isOpen,
  onClose,
  objectName,
  evidence
}) => {
  if (!evidence) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Discovery Evidence: ${objectName}`}
      subtitle="Raw provenance extracted via SAP integration interface"
      maxWidth="620px"
      footer={
        <button type="button" className="fiori-btn fiori-btn-secondary" onClick={onClose}>
          Close
        </button>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: '8px', fontSize: '13px' }}>
          <span style={{ color: 'var(--fiori-text-secondary)', fontWeight: 500 }}>Confidence:</span>
          <div>
            <StatusBadge status={evidence.confidence} />
          </div>

          <span style={{ color: 'var(--fiori-text-secondary)', fontWeight: 500 }}>Source Interface:</span>
          <code>{evidence.sourceInterface}</code>

          <span style={{ color: 'var(--fiori-text-secondary)', fontWeight: 500 }}>Extracted Timestamp:</span>
          <span>{evidence.extractedTimestamp}</span>

          <span style={{ color: 'var(--fiori-text-secondary)', fontWeight: 500 }}>Discovery Scope:</span>
          <span>{evidence.details}</span>
        </div>

        <div>
          <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--fiori-text-secondary)', marginBottom: '6px' }}>
            Extracted ADT Payload Summary
          </div>
          <pre
            style={{
              padding: '10px 14px',
              backgroundColor: 'var(--fiori-surface-subtle)',
              border: '1px solid var(--fiori-border)',
              borderRadius: 'var(--radius-sm)',
              fontSize: '11px',
              overflowX: 'auto',
              maxHeight: '160px'
            }}
          >
{`{
  "uri": "${evidence.sourceInterface}",
  "type": "METADATA_RECORD",
  "status": "${evidence.confidence}",
  "system": "S4H_DEV_100",
  "timestamp": "${evidence.extractedTimestamp}",
  "evidence_id": "${evidence.id}"
}`}
          </pre>
        </div>
      </div>
    </Modal>
  );
};
