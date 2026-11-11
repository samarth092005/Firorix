import React from 'react';
import { AssessmentRecord } from '../../../services/contracts/types';
import { Database, Server, Tag, Layers, FileText } from 'lucide-react';

export interface TransactionProfileProps {
  assessment: AssessmentRecord;
}

export const TransactionProfile: React.FC<TransactionProfileProps> = ({ assessment }) => {
  const getApplicationComponent = () => {
    const pkg = (assessment.packageName || '').toUpperCase();
    const tc = (assessment.tcode || '').toUpperCase();
    if (tc === 'F-53' || pkg === 'FBAS' || pkg.includes('AP')) return 'FI-AP (Accounts Payable)';
    if (tc === 'F-28' || pkg.includes('AR')) return 'FI-AR (Accounts Receivable)';
    if (tc === 'FS00' || tc === 'OB08' || tc === 'FB03' || tc === 'FB01' || pkg.includes('GL') || pkg.includes('FIN')) return 'FI-GL (General Ledger)';
    if (tc === 'ME21N' || pkg === 'ME') return 'MM-PUR (Purchasing)';
    if (assessment.classification === 'CUSTOM') return 'CUSTOMER-CUSTOM (Proprietary)';
    return 'FI (Financial Accounting)';
  };

  const fields = [
    { label: 'Transaction Code', value: assessment.tcode, mono: true },
    { label: 'Description', value: assessment.description, mono: false },
    { label: 'Main Program', value: assessment.programName || 'N/A', mono: true },
    { label: 'ABAP Package', value: assessment.packageName || 'N/A', mono: true },
    { label: 'Software Component', value: assessment.softwareComponent || 'S4CORE 108', mono: true },
    { label: 'Application Area', value: getApplicationComponent(), mono: false },
    { label: 'Target Landscape', value: `${assessment.systemId} Client ${assessment.client}`, mono: false }
  ];

  return (
    <div
      style={{
        backgroundColor: 'var(--fiori-surface, #FFFFFF)',
        border: '1px solid var(--fiori-border, #E2E8F0)',
        borderRadius: 'var(--radius-md, 8px)',
        padding: '20px',
        boxShadow: 'var(--fiori-shadow-sm, 0 1px 3px rgba(0,0,0,0.05))',
        display: 'flex',
        flexDirection: 'column',
        gap: '14px'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <Database size={16} color="var(--fiori-primary, #0A6ED1)" />
        <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: 'var(--fiori-navy, #102A43)' }}>
          Transaction Profile
        </h3>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '12px'
        }}
      >
        {fields.map((f, idx) => (
          <div
            key={idx}
            style={{
              padding: '10px 12px',
              backgroundColor: 'var(--fiori-surface-subtle, #F8FAFC)',
              borderRadius: 'var(--radius-sm, 4px)',
              border: '1px solid var(--fiori-border, #E2E8F0)'
            }}
          >
            <div style={{ fontSize: '11px', color: 'var(--fiori-text-secondary, #64748B)', fontWeight: 600, textTransform: 'uppercase' }}>
              {f.label}
            </div>
            <div
              style={{
                fontSize: '13px',
                fontWeight: 600,
                color: 'var(--fiori-navy, #102A43)',
                fontFamily: f.mono ? 'var(--font-mono, monospace)' : 'inherit',
                marginTop: '4px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}
            >
              {f.value}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
