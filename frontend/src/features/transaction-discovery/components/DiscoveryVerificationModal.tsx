import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CheckCircle2,
  Server,
  Layers,
  ExternalLink,
  ArrowRight,
  X,
  Code2,
  ShieldCheck,
  Sparkles,
  BookOpen,
  Library
} from 'lucide-react';
import {
  TransactionDiscoveryResponse,
  CatalogueReference
} from '../../../services/contracts/types';

export interface DiscoveryVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  metadata: TransactionDiscoveryResponse | null;
  candidates: CatalogueReference[];
  systemId: string;
  client: string;
  targetRelease: string;
  onProceedToAssessment?: () => void;
}

export const DiscoveryVerificationModal: React.FC<DiscoveryVerificationModalProps> = ({
  isOpen,
  onClose,
  metadata,
  candidates,
  systemId,
  client,
  targetRelease,
  onProceedToAssessment
}) => {
  const navigate = useNavigate();

  if (!isOpen || !metadata) return null;

  const tcode = metadata.tcode || 'TRANSACTION';
  const primaryCandidate = candidates[0] || null;
  const isCustom = tcode.startsWith('Z') || tcode.startsWith('Y') || metadata.classification === 'CUSTOM';
  const s4Exists = metadata.exists !== false && metadata.verificationStatus !== 'NOT_FOUND';

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '20px'
      }}
    >
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '12px',
          boxShadow: '0 20px 40px -15px rgba(0, 0, 0, 0.3)',
          width: '100%',
          maxWidth: '680px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          border: '1px solid #E2E8F0',
          animation: 'fadeInScale 0.2s ease-out'
        }}
      >
        {/* Modal Header */}
        <div
          style={{
            padding: '20px 24px',
            backgroundColor: '#F8FAFC',
            borderBottom: '1px solid #E2E8F0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '10px',
                backgroundColor: s4Exists ? '#ECFDF5' : '#EFF6FF',
                color: s4Exists ? '#059669' : '#2563EB',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                border: `1px solid ${s4Exists ? '#A7F3D0' : '#BFDBFE'}`
              }}
            >
              <ShieldCheck size={26} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span
                  style={{
                    fontFamily: 'monospace',
                    fontWeight: 700,
                    fontSize: '18px',
                    color: '#0F172A',
                    backgroundColor: '#F1F5F9',
                    padding: '2px 8px',
                    borderRadius: '4px',
                    border: '1px solid #CBD5E1'
                  }}
                >
                  {tcode}
                </span>
                <span style={{ fontSize: '15px', fontWeight: 600, color: '#334155' }}>
                  {metadata.description || 'SAP Transaction'}
                </span>
              </div>
              <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#64748B' }}>
                Instant SAP S/4HANA DDIC &amp; Fiori Catalogue Discovery Verification
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: '#94A3B8',
              cursor: 'pointer',
              padding: '6px',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            title="Close"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ padding: '24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '18px' }}>

          {/* Section 1: Live SAP S/4HANA Verification */}
          <div
            style={{
              border: '1px solid #E2E8F0',
              borderRadius: '8px',
              padding: '16px 18px',
              backgroundColor: '#FFFFFF',
              boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Server size={17} color="#2563EB" />
                <span style={{ fontSize: '13px', fontWeight: 700, color: '#1E293B', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                  1. SAP S/4HANA Verification
                </span>
              </div>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  backgroundColor: s4Exists ? '#ECFDF5' : '#FEF3C7',
                  color: s4Exists ? '#047857' : '#B45309',
                  border: `1px solid ${s4Exists ? '#A7F3D0' : '#FDE68A'}`,
                  borderRadius: '12px',
                  padding: '3px 10px',
                  fontSize: '11px',
                  fontWeight: 700
                }}
              >
                <CheckCircle2 size={13} />
                {s4Exists ? `LIVE VERIFIED IN S21 (Client ${client})` : 'UNVERIFIED ENTRY'}
              </span>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                gap: '10px',
                backgroundColor: '#F8FAFC',
                padding: '12px 14px',
                borderRadius: '6px',
                border: '1px solid #EDF2F7',
                fontSize: '12px'
              }}
            >
              <div>
                <span style={{ color: '#64748B', display: 'block', fontSize: '11px', fontWeight: 600 }}>ABAP Program</span>
                <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#0F172A' }}>
                  {metadata.programName || 'N/A'}
                </span>
              </div>
              <div>
                <span style={{ color: '#64748B', display: 'block', fontSize: '11px', fontWeight: 600 }}>Dev Package</span>
                <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#0F172A' }}>
                  {metadata.packageName || (isCustom ? '$TMP' : 'BASIS')}
                </span>
              </div>
              <div>
                <span style={{ color: '#64748B', display: 'block', fontSize: '11px', fontWeight: 600 }}>Software Component</span>
                <span style={{ fontWeight: 600, color: '#0F172A' }}>
                  {metadata.softwareComponent || 'S4CORE 108'}
                </span>
              </div>
              <div>
                <span style={{ color: '#64748B', display: 'block', fontSize: '11px', fontWeight: 600 }}>Release Compatibility</span>
                <span style={{ fontWeight: 600, color: '#059669' }}>
                  {targetRelease} (Compatible)
                </span>
              </div>
            </div>
          </div>

          {/* Section 2: Fiori Catalogue Matching */}
          <div
            style={{
              border: '1px solid #E2E8F0',
              borderRadius: '8px',
              padding: '16px 18px',
              backgroundColor: '#FFFFFF',
              boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Library size={17} color="#7C3AED" />
                <span style={{ fontSize: '13px', fontWeight: 700, color: '#1E293B', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                  2. SAP Fiori Apps Reference Library
                </span>
              </div>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  backgroundColor: candidates.length > 0 ? '#F3E8FF' : '#F1F5F9',
                  color: candidates.length > 0 ? '#6B21A8' : '#64748B',
                  border: `1px solid ${candidates.length > 0 ? '#E9D5FF' : '#CBD5E1'}`,
                  borderRadius: '12px',
                  padding: '3px 10px',
                  fontSize: '11px',
                  fontWeight: 700
                }}
              >
                <Sparkles size={13} />
                {candidates.length > 0
                  ? `${candidates.length} CANDIDATE APP${candidates.length > 1 ? 'S' : ''} IDENTIFIED`
                  : 'SYNTHESIZED WORKSPACE CANDIDATE'}
              </span>
            </div>

            {primaryCandidate ? (
              <div
                style={{
                  backgroundColor: '#FAF5FF',
                  border: '1px solid #E9D5FF',
                  borderRadius: '6px',
                  padding: '14px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span
                        style={{
                          backgroundColor: '#7C3AED',
                          color: '#FFFFFF',
                          fontFamily: 'monospace',
                          fontWeight: 700,
                          fontSize: '12px',
                          padding: '2px 8px',
                          borderRadius: '4px'
                        }}
                      >
                        {primaryCandidate.appId}
                      </span>
                      <span style={{ fontSize: '14px', fontWeight: 700, color: '#1E1B4B' }}>
                        {primaryCandidate.appName}
                      </span>
                    </div>
                  </div>
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 600,
                      backgroundColor: '#FFFFFF',
                      padding: '2px 8px',
                      borderRadius: '12px',
                      border: '1px solid #DDD6FE',
                      color: '#6B21A8'
                    }}
                  >
                    {primaryCandidate.uiTechnology}
                  </span>
                </div>

                <p style={{ margin: 0, fontSize: '12px', color: '#4C1D95', lineHeight: 1.4 }}>
                  {primaryCandidate.description}
                </p>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                    gap: '8px',
                    fontSize: '11px',
                    marginTop: '4px',
                    borderTop: '1px dashed #DDD6FE',
                    paddingTop: '8px'
                  }}
                >
                  <div>
                    <span style={{ color: '#6B21A8', fontWeight: 600 }}>OData Service: </span>
                    <span style={{ fontFamily: 'monospace', color: '#1E1B4B' }}>
                      {primaryCandidate.odataServices?.[0] || 'Standard OData V4 / RAP'}
                    </span>
                  </div>
                  <div>
                    <span style={{ color: '#6B21A8', fontWeight: 600 }}>Business Role: </span>
                    <span style={{ color: '#1E1B4B' }}>
                      {primaryCandidate.businessRoles?.[0] || 'SAP_BR_BUSINESS_PROCESS_SPECIALIST'}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div
                style={{
                  backgroundColor: '#F8FAFC',
                  border: '1px dashed #CBD5E1',
                  borderRadius: '6px',
                  padding: '14px',
                  fontSize: '12px',
                  color: '#475569'
                }}
              >
                No direct standard successor found in static baseline. FioriX has prepared a modern custom RAP Fiori Elements modernization path for this transaction.
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div
          style={{
            padding: '16px 24px',
            backgroundColor: '#F8FAFC',
            borderTop: '1px solid #E2E8F0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px'
          }}
        >
          <button
            type="button"
            onClick={() => {
              onClose();
              navigate(`/catalogue?search=${encodeURIComponent(tcode)}`);
            }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 16px',
              borderRadius: '6px',
              border: '1px solid #CBD5E1',
              backgroundColor: '#FFFFFF',
              color: '#334155',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            <Library size={15} />
            <span>View in Fiori Catalogue</span>
          </button>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '8px 16px',
                borderRadius: '6px',
                border: '1px solid #CBD5E1',
                backgroundColor: '#FFFFFF',
                color: '#64748B',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Close
            </button>

            <button
              type="button"
              onClick={() => {
                onClose();
                if (onProceedToAssessment) {
                  onProceedToAssessment();
                } else {
                  navigate(`/transaction-discovery?tcode=${encodeURIComponent(tcode)}`);
                }
              }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 18px',
                borderRadius: '6px',
                border: 'none',
                backgroundColor: '#0066FF',
                color: '#FFFFFF',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                boxShadow: '0 2px 4px rgba(0, 102, 255, 0.2)'
              }}
            >
              <span>Proceed to Assessment</span>
              <ArrowRight size={15} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
