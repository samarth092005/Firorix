import React, { useState } from 'react';
import { BucketizedEvidenceItem, EvidenceBucketCategory } from '../../../services/contracts/types';
import {
  Server,
  BookOpen,
  UserCheck,
  Cpu,
  Clock,
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  ExternalLink,
  ShieldAlert,
  Layers
} from 'lucide-react';

interface BucketizedEvidenceViewerProps {
  evidence: BucketizedEvidenceItem[];
}

export const BucketizedEvidenceViewer: React.FC<BucketizedEvidenceViewerProps> = ({ evidence }) => {
  const [selectedBucket, setSelectedBucket] = useState<EvidenceBucketCategory | 'ALL'>('ALL');

  const buckets: { key: EvidenceBucketCategory; label: string; shortLabel: string; desc: string; icon: any; color: string; count: number }[] = [
    {
      key: 'A_S21_LIVE',
      label: 'Bucket A: S21 Live Evidence',
      shortLabel: 'Bucket A: S21 Live',
      desc: 'Authoritative data verified directly against SAP system dictionary tables (TSTC, TSTCT, TADIR, CVERS).',
      icon: Server,
      color: '#059669',
      count: evidence.filter(e => e.bucket === 'A_S21_LIVE').length
    },
    {
      key: 'B_OFFICIAL_CATALOGUE',
      label: 'Bucket B: Official SAP Catalogue Evidence',
      shortLabel: 'Bucket B: Catalogue',
      desc: 'Standard successor mapping, leading business roles, and OData services documented in SAP Fiori Apps Reference Library.',
      icon: BookOpen,
      color: '#0284C7',
      count: evidence.filter(e => e.bucket === 'B_OFFICIAL_CATALOGUE').length
    },
    {
      key: 'C_USER_PROVIDED',
      label: 'Bucket C: User-Provided Evidence',
      shortLabel: 'Bucket C: User Intake',
      desc: 'Business requirements, requested roles, and service aliases provided during discovery intake (unverified against live DDIC).',
      icon: UserCheck,
      color: '#7C3AED',
      count: evidence.filter(e => e.bucket === 'C_USER_PROVIDED').length
    },
    {
      key: 'D_INFERRED',
      label: 'Bucket D: Inferred Evidence',
      shortLabel: 'Bucket D: Inferred',
      desc: 'Clean Core tiering heuristics and architectural recommendations deduced by Fiorify rule engine.',
      icon: Cpu,
      color: '#4F46E5',
      count: evidence.filter(e => e.bucket === 'D_INFERRED').length
    },
    {
      key: 'E_PENDING_VERIFICATION',
      label: 'Bucket E: Pending Verification',
      shortLabel: 'Bucket E: Pending Basis',
      desc: 'Mandatory technical prerequisites (live Gateway service registration, ICF node, user PFCG roles) awaiting Basis confirmation.',
      icon: Clock,
      color: '#D97706',
      count: evidence.filter(e => e.bucket === 'E_PENDING_VERIFICATION').length
    }
  ];

  const filteredEvidence = selectedBucket === 'ALL'
    ? evidence
    : evidence.filter(e => e.bucket === selectedBucket);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'VERIFIED':
        return (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              padding: '3px 8px',
              borderRadius: '4px',
              fontSize: '11px',
              fontWeight: 700,
              backgroundColor: '#DCFCE7',
              color: '#15803D',
              border: '1px solid #BBF7D0'
            }}
          >
            <CheckCircle2 size={12} color="#16A34A" /> VERIFIED
          </span>
        );
      case 'PARTIALLY_VERIFIED':
        return (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              padding: '3px 8px',
              borderRadius: '4px',
              fontSize: '11px',
              fontWeight: 700,
              backgroundColor: '#EFF6FF',
              color: '#1D4ED8',
              border: '1px solid #BFDBFE'
            }}
          >
            <HelpCircle size={12} color="#2563EB" /> PARTIAL
          </span>
        );
      case 'PENDING_VERIFICATION':
      case 'PENDING_BASIS':
        return (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              padding: '3px 8px',
              borderRadius: '4px',
              fontSize: '11px',
              fontWeight: 700,
              backgroundColor: '#FEF3C7',
              color: '#B45309',
              border: '1px solid #FDE68A'
            }}
          >
            <Clock size={12} color="#D97706" /> PENDING BASIS
          </span>
        );
      default:
        return (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              padding: '3px 8px',
              borderRadius: '4px',
              fontSize: '11px',
              fontWeight: 600,
              backgroundColor: '#F1F5F9',
              color: '#475569',
              border: '1px solid #E2E8F0'
            }}
          >
            {status}
          </span>
        );
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {/* Bucket Filter Pills */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
        <button
          type="button"
          onClick={() => setSelectedBucket('ALL')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '6px 14px',
            borderRadius: '6px',
            fontSize: '12px',
            fontWeight: 700,
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            backgroundColor: selectedBucket === 'ALL' ? '#0F172A' : '#FFFFFF',
            color: selectedBucket === 'ALL' ? '#FFFFFF' : '#475569',
            border: selectedBucket === 'ALL' ? '1px solid #0F172A' : '1px solid #E2E8F0',
            boxShadow: '0 1px 2px rgba(0,0,0,0.04)'
          }}
        >
          <span>All Buckets</span>
          <span
            style={{
              padding: '1px 6px',
              borderRadius: '10px',
              fontSize: '10px',
              backgroundColor: selectedBucket === 'ALL' ? '#334155' : '#F1F5F9',
              color: selectedBucket === 'ALL' ? '#FFFFFF' : '#475569'
            }}
          >
            {evidence.length}
          </span>
        </button>

        {buckets.map((b) => {
          const Icon = b.icon;
          const isSelected = selectedBucket === b.key;
          return (
            <button
              key={b.key}
              type="button"
              onClick={() => setSelectedBucket(b.key)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                backgroundColor: isSelected ? '#0066FF' : '#FFFFFF',
                color: isSelected ? '#FFFFFF' : '#334155',
                border: isSelected ? '1px solid #0066FF' : '1px solid #E2E8F0',
                boxShadow: '0 1px 2px rgba(0,0,0,0.04)'
              }}
            >
              <Icon size={14} color={isSelected ? '#FFFFFF' : b.color} />
              <span>{b.shortLabel}</span>
              <span
                style={{
                  padding: '1px 6px',
                  borderRadius: '10px',
                  fontSize: '10px',
                  fontWeight: 700,
                  backgroundColor: isSelected ? 'rgba(255,255,255,0.25)' : '#F1F5F9',
                  color: isSelected ? '#FFFFFF' : '#475569'
                }}
              >
                {b.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Selected Bucket Header Description */}
      {selectedBucket !== 'ALL' && (
        <div
          style={{
            padding: '10px 14px',
            backgroundColor: '#F8FAFC',
            borderRadius: '6px',
            border: '1px solid #E2E8F0',
            fontSize: '12px',
            color: '#334155',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <ShieldAlert size={16} color="#0066FF" style={{ flexShrink: 0 }} />
          <div>
            <strong>{buckets.find((b) => b.key === selectedBucket)?.label}:</strong>{' '}
            {buckets.find((b) => b.key === selectedBucket)?.desc}
          </div>
        </div>
      )}

      {/* Evidence Cards List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {filteredEvidence.map((item) => (
          <div
            key={item.id}
            style={{
              backgroundColor: '#FFFFFF',
              border: '1px solid var(--fiori-border, #E2E8F0)',
              borderRadius: '8px',
              padding: '16px',
              boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              transition: 'border-color 0.15s ease'
            }}
          >
            {/* Top Bar */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '8px',
                borderBottom: '1px solid #F1F5F9',
                paddingBottom: '10px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span
                  style={{
                    fontFamily: 'var(--font-mono, monospace)',
                    fontSize: '11px',
                    fontWeight: 700,
                    color: '#475569',
                    backgroundColor: '#F1F5F9',
                    padding: '2px 8px',
                    borderRadius: '4px',
                    border: '1px solid #E2E8F0'
                  }}
                >
                  {item.id}
                </span>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    color: '#0066FF'
                  }}
                >
                  {item.category.replace(/_/g, ' ')}
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '11px', color: '#94A3B8', fontFamily: 'var(--font-mono, monospace)' }}>
                  {item.timestamp}
                </span>
                {getStatusBadge(item.verificationStatus)}
              </div>
            </div>

            {/* Title & Finding */}
            <div>
              <h4 style={{ margin: '0 0 6px 0', fontSize: '14px', fontWeight: 700, color: '#0F172A' }}>
                {item.title}
              </h4>
              <p style={{ margin: 0, fontSize: '12.5px', color: '#334155', lineHeight: 1.55 }}>
                {item.finding}
              </p>
            </div>

            {/* Traceability Metadata Grid Box */}
            <div
              style={{
                backgroundColor: '#F8FAFC',
                border: '1px solid #E2E8F0',
                borderRadius: '6px',
                padding: '10px 14px',
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '12px',
                fontSize: '11px'
              }}
            >
              <div>
                <span style={{ color: '#64748B', display: 'block', textTransform: 'uppercase', fontWeight: 700, fontSize: '10px', letterSpacing: '0.3px', marginBottom: '2px' }}>
                  Source System / Table
                </span>
                <strong style={{ color: '#0F172A', fontFamily: 'var(--font-mono, monospace)' }}>
                  {item.source}
                </strong>
              </div>

              <div>
                <span style={{ color: '#64748B', display: 'block', textTransform: 'uppercase', fontWeight: 700, fontSize: '10px', letterSpacing: '0.3px', marginBottom: '2px' }}>
                  Reference / Object Key
                </span>
                <span style={{ color: '#0066FF', fontFamily: 'var(--font-mono, monospace)', fontWeight: 600, wordBreak: 'break-all' }}>
                  {item.reference}
                </span>
              </div>

              <div>
                <span style={{ color: '#64748B', display: 'block', textTransform: 'uppercase', fontWeight: 700, fontSize: '10px', letterSpacing: '0.3px', marginBottom: '2px' }}>
                  Target Landscape
                </span>
                <strong style={{ color: '#0F172A' }}>
                  {item.systemClient}
                </strong>
              </div>
            </div>

            {/* Audit Boundary / Limitation Alert Box */}
            {item.limitation && (
              <div
                style={{
                  fontSize: '11.5px',
                  color: '#92400E',
                  backgroundColor: '#FFFBEB',
                  border: '1px solid #FDE68A',
                  borderRadius: '6px',
                  padding: '8px 12px',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '8px',
                  lineHeight: 1.45
                }}
              >
                <AlertTriangle size={14} color="#D97706" style={{ flexShrink: 0, marginTop: '2px' }} />
                <div>
                  <strong style={{ fontWeight: 700 }}>Audit Boundary / Limitation:</strong> {item.limitation}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
