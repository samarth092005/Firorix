import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Terminal, Shield, AlertTriangle, FilterX } from 'lucide-react';
import { TechnicalDiagnostics } from '../types';

export interface TechnicalDetailsAccordionProps {
  diagnostics: TechnicalDiagnostics;
}

export const TechnicalDetailsAccordion: React.FC<TechnicalDetailsAccordionProps> = ({
  diagnostics
}) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="fiori-card" style={{ marginBottom: '24px' }}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        style={{
          width: '100%',
          padding: '14px 20px',
          background: 'transparent',
          border: 'none',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: 'pointer',
          textAlign: 'left'
        }}
        aria-expanded={isOpen}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Terminal size={16} color="var(--fiori-teal)" />
          <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--fiori-text-primary)' }}>
            Expandable Technical Details & Governance Diagnostics
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '12px', color: 'var(--fiori-text-secondary)' }}>
            {isOpen ? 'Collapse' : 'Expand Details'}
          </span>
          {isOpen ? <ChevronDown size={16} color="var(--fiori-teal)" /> : <ChevronRight size={16} color="var(--fiori-text-muted)" />}
        </div>
      </button>

      {isOpen && (
        <div
          style={{
            padding: '20px',
            borderTop: '1px solid var(--fiori-border-light)',
            backgroundColor: 'var(--fiori-surface-subtle)'
          }}
        >
          {/* Matching Rule & Provenance */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
              gap: '16px',
              marginBottom: '16px'
            }}
          >
            <div
              style={{
                backgroundColor: 'var(--fiori-surface)',
                border: '1px solid var(--fiori-border)',
                borderRadius: 'var(--radius-sm)',
                padding: '14px'
              }}
            >
              <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--fiori-text-secondary)', textTransform: 'uppercase', marginBottom: '6px' }}>
                Deterministic Matching Rule
              </div>
              <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--fiori-text-primary)' }}>
                {diagnostics.matchingRuleApplied}
              </div>
            </div>

            <div
              style={{
                backgroundColor: 'var(--fiori-surface)',
                border: '1px solid var(--fiori-border)',
                borderRadius: 'var(--radius-sm)',
                padding: '14px'
              }}
            >
              <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--fiori-text-secondary)', textTransform: 'uppercase', marginBottom: '6px' }}>
                Release Compatibility Evaluation
              </div>
              <div style={{ fontSize: '12px', color: 'var(--fiori-text-primary)' }}>
                Target Release: <strong>{diagnostics.releaseCompatibilityEvaluated.systemRelease}</strong>
                <br />
                Candidates Evaluated: {diagnostics.releaseCompatibilityEvaluated.evaluatedCandidates} (
                {diagnostics.releaseCompatibilityEvaluated.compatibleCount} Compatible,{' '}
                {diagnostics.releaseCompatibilityEvaluated.incompatibleCount} Excluded)
              </div>
            </div>
          </div>

          {/* Warnings & Incomplete Metadata */}
          {diagnostics.warnings && diagnostics.warnings.length > 0 && (
            <div
              style={{
                backgroundColor: 'var(--fiori-warning-bg)',
                border: '1px solid var(--fiori-warning-border)',
                borderRadius: 'var(--radius-sm)',
                padding: '12px 16px',
                marginBottom: '16px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                <AlertTriangle size={15} color="var(--fiori-warning)" />
                <span style={{ fontSize: '12px', fontWeight: 700, color: '#7A4100' }}>
                  Diagnostics Warnings:
                </span>
              </div>
              <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '12px', color: 'var(--fiori-text-primary)' }}>
                {diagnostics.warnings.map((w, idx) => (
                  <li key={idx} style={{ marginBottom: '2px' }}>{w}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Excluded Candidates Due to Incompatibility */}
          {diagnostics.excludedCandidates && diagnostics.excludedCandidates.length > 0 && (
            <div
              style={{
                backgroundColor: 'var(--fiori-surface)',
                border: '1px solid var(--fiori-border)',
                borderRadius: 'var(--radius-sm)',
                padding: '14px',
                marginBottom: '16px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                <FilterX size={15} color="var(--fiori-error)" />
                <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--fiori-text-primary)', textTransform: 'uppercase' }}>
                  Excluded Incompatible Candidates ({diagnostics.excludedCandidates.length})
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {diagnostics.excludedCandidates.map((exc) => (
                  <div
                    key={exc.appId}
                    style={{
                      padding: '8px 12px',
                      backgroundColor: 'var(--fiori-bg)',
                      borderRadius: 'var(--radius-xs)',
                      borderLeft: '3px solid var(--fiori-error)',
                      fontSize: '12px'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <strong style={{ color: 'var(--fiori-text-primary)' }}>
                        {exc.appName} ({exc.appId})
                      </strong>
                      <span className="fiori-badge fiori-badge-error">
                        {exc.releaseCompatibility}
                      </span>
                    </div>
                    <div style={{ color: 'var(--fiori-text-secondary)', marginTop: '4px' }}>
                      {exc.exclusionReason}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Fixture Provenance Trace */}
          <div
            style={{
              backgroundColor: 'var(--fiori-surface)',
              border: '1px solid var(--fiori-border)',
              borderRadius: 'var(--radius-sm)',
              padding: '14px'
            }}
          >
            <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--fiori-text-secondary)', textTransform: 'uppercase', marginBottom: '8px' }}>
              Mock Fixture Provenance Hierarchy
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '12px', color: 'var(--fiori-text-secondary)', fontFamily: 'var(--font-mono)' }}>
              {diagnostics.provenance.map((p, i) => (
                <div key={i}>• {p}</div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
