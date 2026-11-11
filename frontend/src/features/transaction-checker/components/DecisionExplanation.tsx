import React from 'react';
import { HelpCircle, CheckCircle, ShieldCheck } from 'lucide-react';

export interface DecisionExplanationProps {
  explanation: string;
  matchingRule: string;
}

export const DecisionExplanation: React.FC<DecisionExplanationProps> = ({
  explanation,
  matchingRule
}) => {
  return (
    <div
      className="fiori-card"
      style={{
        marginBottom: '24px',
        backgroundColor: 'var(--fiori-surface)',
        border: '1px solid var(--fiori-border)'
      }}
    >
      <div className="fiori-card-header" style={{ borderBottom: '1px solid var(--fiori-border-light)' }}>
        <div className="fiori-card-title">
          <HelpCircle size={16} color="var(--fiori-teal)" />
          <span>How This Result Was Determined</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: 'var(--fiori-text-secondary)' }}>
          <ShieldCheck size={14} color="var(--fiori-success)" />
          <span>Deterministic Audit Rule Enforced</span>
        </div>
      </div>

      <div className="fiori-card-body" style={{ padding: '16px 20px' }}>
        <p style={{ fontSize: '13px', lineHeight: 1.5, color: 'var(--fiori-text-primary)', margin: 0 }}>
          {explanation}
        </p>
        <div
          style={{
            marginTop: '12px',
            paddingTop: '10px',
            borderTop: '1px dashed var(--fiori-border-light)',
            fontSize: '11px',
            color: 'var(--fiori-text-muted)',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          <CheckCircle size={12} color="var(--fiori-teal)" />
          <span>Governance Guarantee: Matching is deterministic and based exclusively on approved demo fixture mappings. No AI or fuzzy matching is used.</span>
        </div>
      </div>
    </div>
  );
};
