import React, { useState } from 'react';
import { DetailedEvidenceRecord } from '../../../services/contracts/types';
import { FileCheck, ChevronDown, ChevronRight, ShieldCheck, Database } from 'lucide-react';
import { StatusBadge } from '../../../components/status/StatusBadge';

export interface EvidenceTimelineProps {
  evidence: DetailedEvidenceRecord[];
}

export const EvidenceTimeline: React.FC<EvidenceTimelineProps> = ({ evidence }) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (!evidence || evidence.length === 0) {
    return (
      <div style={{ padding: '16px', color: '#64748B', fontSize: '13px' }}>
        No detailed evidence records captured.
      </div>
    );
  }

  const toggleExpand = (id: string) => {
    setExpandedId(prev => prev === id ? null : id);
  };

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
        <FileCheck size={16} color="var(--fiori-primary, #0A6ED1)" />
        <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: 'var(--fiori-navy, #102A43)' }}>
          Detailed Evidence Audit Trail ({evidence.length} events)
        </h4>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {evidence.map((item) => {
          const isExpanded = expandedId === item.id;
          return (
            <div
              key={item.id}
              style={{
                border: '1px solid #E2E8F0',
                borderRadius: '6px',
                backgroundColor: isExpanded ? '#F8FAFC' : '#FFFFFF',
                overflow: 'hidden'
              }}
            >
              <button
                type="button"
                onClick={() => toggleExpand(item.id)}
                style={{
                  width: '100%',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '10px 14px',
                  backgroundColor: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  textAlign: 'left',
                  fontSize: '12px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  {isExpanded ? <ChevronDown size={14} color="#64748B" /> : <ChevronRight size={14} color="#64748B" />}
                  <div>
                    <span style={{ fontWeight: 600, color: '#0F172A' }}>{item.title}</span>
                    <span style={{ marginLeft: '8px', fontSize: '11px', color: '#64748B' }}>
                      ({item.sourceTableOrService})
                    </span>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <StatusBadge status={item.verificationStatus} size="sm" />
                  <span style={{ fontSize: '10px', color: '#94A3B8' }}>{item.provenance}</span>
                </div>
              </button>

              {isExpanded && (
                <div style={{ padding: '10px 14px 14px 38px', borderTop: '1px solid #F1F5F9', fontSize: '12px', color: '#334155' }}>
                  <div style={{ marginBottom: '6px' }}>
                    <strong>Finding:</strong> {item.finding}
                  </div>
                  {item.explanation && (
                    <div style={{ color: '#64748B', lineHeight: 1.4 }}>
                      <strong>Audit Note:</strong> {item.explanation}
                    </div>
                  )}
                  <div style={{ fontSize: '11px', color: '#94A3B8', marginTop: '6px' }}>
                    System: {item.sourceSystem} | Event ID: {item.id}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
