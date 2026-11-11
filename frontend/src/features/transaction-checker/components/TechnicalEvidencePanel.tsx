import React, { useState } from 'react';
import { TechnicalEvidenceRecord } from '../../../services/api/apiClient';
import { ShieldCheck, AlertCircle, FileText, ChevronDown, ChevronRight, Lock, CheckCircle2, Clock } from 'lucide-react';

export interface TechnicalEvidencePanelProps {
  evidence: TechnicalEvidenceRecord[];
  missingEvidence?: string[];
  warnings?: string[];
  tcode: string;
}

export const TechnicalEvidencePanel: React.FC<TechnicalEvidencePanelProps> = ({
  evidence,
  missingEvidence = [],
  warnings = [],
  tcode
}) => {
  const [isOpen, setIsOpen] = useState<boolean>(true);

  if (!evidence || evidence.length === 0) {
    return null;
  }

  const getConfidenceBadge = (confidence: string) => {
    switch (confidence) {
      case 'VERIFIED':
        return (
          <span className="fiori-badge" style={{ backgroundColor: '#E8F5E9', color: '#1B5E20', border: '1px solid #A5D6A7', fontSize: '10px', fontWeight: 700 }}>
            VERIFIED
          </span>
        );
      case 'HIGH':
        return (
          <span className="fiori-badge" style={{ backgroundColor: '#E3F2FD', color: '#0D47A1', border: '1px solid #90CAF9', fontSize: '10px', fontWeight: 700 }}>
            HIGH CONFIDENCE
          </span>
        );
      case 'MEDIUM':
        return (
          <span className="fiori-badge" style={{ backgroundColor: '#FFF8E1', color: '#B78103', border: '1px solid #FFE082', fontSize: '10px', fontWeight: 700 }}>
            MEDIUM CONFIDENCE
          </span>
        );
      case 'LOW':
      case 'UNKNOWN':
      default:
        return (
          <span className="fiori-badge fiori-badge-neutral" style={{ fontSize: '10px', fontWeight: 700 }}>
            {confidence || 'UNKNOWN'}
          </span>
        );
    }
  };

  const getProvenanceBadge = (provenance: any) => {
    const provStr = typeof provenance === 'object' && provenance !== null
      ? (provenance.sourceType || provenance.sourceTool || 'MCP EVIDENCE')
      : String(provenance || '');
    const isLive = provStr === 'LIVE_SAP' || provStr === 'OFFICIAL_CATALOGUE_LIVE';
    const isMcp = provStr.startsWith('MCP') || (typeof provenance === 'object' && provenance?.serverPackage);
    const bgColor = isLive ? 'rgba(0, 128, 128, 0.1)' : (isMcp ? 'rgba(63, 81, 181, 0.1)' : 'rgba(233, 115, 12, 0.1)');
    const textColor = isLive ? '#008080' : (isMcp ? '#3F51B5' : '#E9730C');
    const borderColor = isLive ? 'rgba(0, 128, 128, 0.3)' : (isMcp ? 'rgba(63, 81, 181, 0.3)' : 'rgba(233, 115, 12, 0.3)');

    return (
      <span
        style={{
          display: 'inline-block',
          fontSize: '10px',
          fontWeight: 600,
          padding: '2px 6px',
          borderRadius: 'var(--radius-xs)',
          backgroundColor: bgColor,
          color: textColor,
          border: `1px solid ${borderColor}`
        }}
      >
        {provStr.replace(/_/g, ' ')}
      </span>
    );
  };

  const formatRetrievedValue = (val: any) => {
    if (val === null || val === undefined) return <span style={{ color: 'var(--fiori-text-muted)' }}>N/A</span>;
    if (typeof val === 'object') {
      const entries = Object.entries(val);
      if (entries.length === 0) return <span>Empty</span>;
      return (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
          {entries.map(([k, v]) => (
            <span
              key={k}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                padding: '2px 6px',
                backgroundColor: 'var(--fiori-surface-subtle, #F1F5F9)',
                borderRadius: '3px',
                fontSize: '11px',
                fontFamily: 'var(--font-mono)'
              }}
            >
              <strong style={{ color: 'var(--fiori-text-secondary, #475569)' }}>{k}:</strong>
              <span style={{ color: 'var(--fiori-text-primary, #0F172A)' }}>{typeof v === 'object' ? JSON.stringify(v) : String(v)}</span>
            </span>
          ))}
        </div>
      );
    }
    return <span>{String(val)}</span>;
  };

  return (
    <div className="fiori-card" style={{ marginBottom: '20px', padding: 0, overflow: 'hidden' }}>
      {/* Header Accordion Toggle */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 20px',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          textAlign: 'left'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <ShieldCheck size={18} color="var(--fiori-teal)" />
          <div>
            <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: 'var(--fiori-text-primary)' }}>
              Multi-Source Technical Evidence ({evidence.length} Records)
            </h3>
            <p style={{ margin: 0, fontSize: '12px', color: 'var(--fiori-text-secondary)' }}>
              Authoritative evidence collected across SAP dictionary tables, Gateway catalogue, and FAL
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '12px', color: 'var(--fiori-text-muted)' }}>
            {isOpen ? 'Collapse' : 'Expand'}
          </span>
          {isOpen ? <ChevronDown size={18} color="var(--fiori-text-muted)" /> : <ChevronRight size={18} color="var(--fiori-text-muted)" />}
        </div>
      </button>

      {isOpen && (
        <div style={{ padding: '0 20px 20px', borderTop: '1px solid var(--fiori-border-light)' }}>
          {/* Warnings Bar if any */}
          {warnings.length > 0 && (
            <div style={{ marginTop: '14px', marginBottom: '14px', padding: '10px 14px', backgroundColor: '#FFF8E1', borderRadius: 'var(--radius-xs)', border: '1px solid #FFE082', fontSize: '12px', color: '#7A5200' }}>
              <strong>Verification Warnings:</strong>
              <ul style={{ margin: '4px 0 0 16px', padding: 0 }}>
                {warnings.map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Evidence Table */}
          <div style={{ overflowX: 'auto', marginTop: '12px' }}>
            <table className="fiori-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
              <thead>
                <tr style={{ backgroundColor: 'var(--fiori-surface-subtle)', borderBottom: '2px solid var(--fiori-border)' }}>
                  <th style={{ padding: '8px 10px', textAlign: 'left', width: '150px' }}>Category</th>
                  <th style={{ padding: '8px 10px', textAlign: 'left', width: '180px' }}>Source / System</th>
                  <th style={{ padding: '8px 10px', textAlign: 'left' }}>Retrieved Value</th>
                  <th style={{ padding: '8px 10px', textAlign: 'center', width: '120px' }}>Provenance</th>
                  <th style={{ padding: '8px 10px', textAlign: 'center', width: '130px' }}>Confidence</th>
                  <th style={{ padding: '8px 10px', textAlign: 'left', width: '180px' }}>Limitations / Requirements</th>
                </tr>
              </thead>
              <tbody>
                {evidence.map((item, idx) => (
                  <tr key={item.evidenceId || idx} style={{ borderBottom: '1px solid var(--fiori-border-light)' }}>
                    <td style={{ padding: '10px', fontWeight: 600, color: 'var(--fiori-text-primary)' }}>
                      <div style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--fiori-text-muted)' }}>
                        {item.evidenceId}
                      </div>
                      <div>{item.category.replace(/_/g, ' ')}</div>
                    </td>
                    <td style={{ padding: '10px', color: 'var(--fiori-text-secondary)', fontFamily: 'var(--font-mono)', fontSize: '11px' }}>
                      {item.source}
                    </td>
                    <td style={{ padding: '10px' }}>
                      <div style={{ fontSize: '11px', color: 'var(--fiori-text-primary)', wordBreak: 'break-word' }}>
                        {formatRetrievedValue(item.retrievedValue)}
                      </div>
                    </td>
                    <td style={{ padding: '10px', textAlign: 'center' }}>
                      {getProvenanceBadge(item.provenance)}
                    </td>
                    <td style={{ padding: '10px', textAlign: 'center' }}>
                      {getConfidenceBadge(item.confidence)}
                    </td>
                    <td style={{ padding: '10px', fontSize: '11px', color: 'var(--fiori-text-muted)' }}>
                      {item.limitations && item.limitations.length > 0 ? (
                        <div style={{ color: '#C62828' }}>{item.limitations.join('; ')}</div>
                      ) : (
                        <div style={{ color: '#1B5E20' }}>Fully accessible</div>
                      )}
                      {item.verificationRequirements && item.verificationRequirements.length > 0 && (
                        <div style={{ marginTop: '2px', color: '#B78103' }}>
                          Requires: {item.verificationRequirements.join('; ')}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Missing Evidence Indicators */}
          {missingEvidence.length > 0 && (
            <div style={{ marginTop: '16px', padding: '10px 14px', backgroundColor: 'var(--fiori-surface-subtle)', borderRadius: 'var(--radius-xs)', border: '1px solid var(--fiori-border-light)' }}>
              <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--fiori-text-secondary)', marginBottom: '4px' }}>
                Missing Evidence Noted for Downstream Assessment:
              </div>
              <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '11px', color: 'var(--fiori-text-muted)' }}>
                {missingEvidence.map((m, i) => (
                  <li key={i}>{m}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
