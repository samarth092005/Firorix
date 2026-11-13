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
  Library,
  AlertCircle,
  XCircle,
  Wrench,
  HelpCircle
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
  onProceedToAssessment?: (targetTab?: string) => void;
  onResetSearch?: () => void;
}

export const DiscoveryVerificationModal: React.FC<DiscoveryVerificationModalProps> = ({
  isOpen,
  onClose,
  metadata,
  candidates,
  systemId,
  client,
  targetRelease,
  onProceedToAssessment,
  onResetSearch
}) => {
  const navigate = useNavigate();

  if (!isOpen || !metadata) return null;

  const tcode = metadata.tcode || 'TRANSACTION';
  const primaryCandidate = candidates[0] || null;
  const isCustom = tcode.startsWith('Z') || tcode.startsWith('Y') || metadata.classification === 'CUSTOM';
  const tcodeExists = metadata.exists !== false && metadata.verificationStatus !== 'NOT_FOUND';
  const hasStandardApp = tcodeExists && Boolean(primaryCandidate);

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.7)',
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
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
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
        {/* ===================================================================== */}
        {/* CASE 1: T-CODE DOES NOT EXIST IN SAP DDIC                             */}
        {/* ===================================================================== */}
        {!tcodeExists && (
          <>
            {/* Header: Red Error */}
            <div
              style={{
                padding: '20px 24px',
                backgroundColor: '#FEF2F2',
                borderBottom: '1px solid #FECACA',
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
                    backgroundColor: '#FEE2E2',
                    color: '#DC2626',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    border: '1px solid #FCA5A5'
                  }}
                >
                  <XCircle size={26} />
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span
                      style={{
                        fontFamily: 'monospace',
                        fontWeight: 800,
                        fontSize: '17px',
                        color: '#991B1B',
                        backgroundColor: '#FFFFFF',
                        padding: '2px 8px',
                        borderRadius: '4px',
                        border: '1px solid #FCA5A5'
                      }}
                    >
                      {tcode}
                    </span>
                    <span style={{ fontSize: '15px', fontWeight: 700, color: '#991B1B' }}>
                      Transaction Code Does Not Exist
                    </span>
                  </div>
                  <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#B91C1C' }}>
                    SAP Data Dictionary (DDIC) Verification Failed
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#991B1B',
                  cursor: 'pointer',
                  padding: '6px',
                  borderRadius: '6px'
                }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Body */}
            <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div
                style={{
                  backgroundColor: '#FFF5F5',
                  border: '1px solid #FED7D7',
                  borderRadius: '8px',
                  padding: '16px 18px',
                  display: 'flex',
                  gap: '12px'
                }}
              >
                <AlertCircle size={20} color="#E53E3E" style={{ flexShrink: 0, marginTop: '2px' }} />
                <div style={{ fontSize: '13px', color: '#742A2A', lineHeight: 1.5 }}>
                  <div style={{ fontWeight: 700, marginBottom: '4px' }}>
                    No record found in SAP S/4HANA System {systemId} (Client {client})
                  </div>
                  <div>
                    Kernel inspection queried table <code>TSTC</code> (Transaction Codes) and table <code>TADIR</code> (R/3 Repository Directory) for object <code>TRAN {tcode}</code>, returning <strong>0 records</strong>.
                  </div>
                </div>
              </div>

              <div style={{ backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '16px' }}>
                <div style={{ fontSize: '12.5px', fontWeight: 700, color: '#1E293B', marginBottom: '8px' }}>
                  What you can do:
                </div>
                <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '12.5px', color: '#475569', lineHeight: 1.6 }}>
                  <li>Check for typographical errors in the transaction code.</li>
                  <li>Try standard SAP codes like <strong>ME21N</strong> (Procurement), <strong>F-53</strong> / <strong>FB50</strong> (Financials), or <strong>VA01</strong> (Sales).</li>
                  <li>Or try custom demonstration transaction <strong>ZPURCHASE</strong>.</li>
                  <li>Verify that the transaction exists in client {client} of target system {systemId}.</li>
                </ul>
              </div>
            </div>

            {/* Footer */}
            <div
              style={{
                padding: '16px 24px',
                backgroundColor: '#F8FAFC',
                borderTop: '1px solid #E2E8F0',
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '10px'
              }}
            >
              <button
                type="button"
                onClick={() => {
                  onClose();
                  if (onResetSearch) onResetSearch();
                }}
                style={{
                  padding: '8px 18px',
                  borderRadius: '6px',
                  border: '1px solid #CBD5E1',
                  backgroundColor: '#FFFFFF',
                  color: '#334155',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Close &amp; Try Another T-Code
              </button>
            </div>
          </>
        )}

        {/* ===================================================================== */}
        {/* CASE 2 & 3: T-CODE EXISTS (Standard App Found OR 100% Custom Gap)    */}
        {/* ===================================================================== */}
        {tcodeExists && (
          <>
            {/* Header: Verified */}
            <div
              style={{
                padding: '20px 24px',
                backgroundColor: hasStandardApp ? '#F0FDF4' : '#EFF6FF',
                borderBottom: `1px solid ${hasStandardApp ? '#BBF7D0' : '#BFDBFE'}`,
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
                    backgroundColor: hasStandardApp ? '#DCFCE7' : '#DBEAFE',
                    color: hasStandardApp ? '#16A34A' : '#0066FF',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    border: `1px solid ${hasStandardApp ? '#86EFAC' : '#93C5FD'}`
                  }}
                >
                  {hasStandardApp ? <ShieldCheck size={26} /> : <Code2 size={26} />}
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span
                      style={{
                        fontFamily: 'monospace',
                        fontWeight: 800,
                        fontSize: '17px',
                        color: '#0F172A',
                        backgroundColor: '#FFFFFF',
                        padding: '2px 8px',
                        borderRadius: '4px',
                        border: '1px solid #CBD5E1'
                      }}
                    >
                      {tcode}
                    </span>
                    <span style={{ fontSize: '15px', fontWeight: 700, color: '#1E293B' }}>
                      {metadata.description || 'SAP Transaction'}
                    </span>
                  </div>
                  <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: hasStandardApp ? '#15803D' : '#1E40AF' }}>
                    {hasStandardApp
                      ? '✓ Verified in SAP DDIC & Official Standard Fiori Application Found'
                      : '✓ Verified in SAP DDIC • ⚠️ No Standard Fiori App (100% Functional Gap)'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#64748B',
                  cursor: 'pointer',
                  padding: '6px',
                  borderRadius: '6px'
                }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Body */}
            <div style={{ padding: '24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>

              {/* Step 1 Box: SAP DDIC Verification */}
              <div
                style={{
                  border: '1px solid #E2E8F0',
                  borderRadius: '8px',
                  padding: '14px 16px',
                  backgroundColor: '#FFFFFF'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Server size={16} color="#0066FF" />
                    <span style={{ fontSize: '12.5px', fontWeight: 700, color: '#1E293B', textTransform: 'uppercase' }}>
                      1. SAP S/4HANA DDIC Inspection
                    </span>
                  </div>
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      backgroundColor: '#ECFDF5',
                      color: '#047857',
                      border: '1px solid #A7F3D0',
                      borderRadius: '12px',
                      padding: '2px 8px',
                      fontSize: '11px',
                      fontWeight: 700
                    }}
                  >
                    <CheckCircle2 size={12} />
                    <span>ACTIVE IN {systemId} ({client})</span>
                  </span>
                </div>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                    gap: '10px',
                    backgroundColor: '#F8FAFC',
                    padding: '10px 12px',
                    borderRadius: '6px',
                    border: '1px solid #EDF2F7',
                    fontSize: '12px'
                  }}
                >
                  <div>
                    <span style={{ color: '#64748B', display: 'block', fontSize: '11px' }}>ABAP Program</span>
                    <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#0F172A' }}>
                      {metadata.programName || 'N/A'}
                    </span>
                  </div>
                  <div>
                    <span style={{ color: '#64748B', display: 'block', fontSize: '11px' }}>Package</span>
                    <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#0F172A' }}>
                      {metadata.packageName || (isCustom ? '$TMP' : 'BASIS')}
                    </span>
                  </div>
                  <div>
                    <span style={{ color: '#64748B', display: 'block', fontSize: '11px' }}>Component</span>
                    <span style={{ fontWeight: 600, color: '#0F172A' }}>
                      {metadata.softwareComponent || 'S4CORE 108'}
                    </span>
                  </div>
                  <div>
                    <span style={{ color: '#64748B', display: 'block', fontSize: '11px' }}>Classification</span>
                    <span style={{ fontWeight: 700, color: isCustom ? '#D97706' : '#2563EB' }}>
                      {isCustom ? 'CUSTOM DYNPRO' : 'STANDARD SAP'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Step 2 Box: Fiori Apps Catalogue Discovery */}
              <div
                style={{
                  border: '1px solid #E2E8F0',
                  borderRadius: '8px',
                  padding: '14px 16px',
                  backgroundColor: '#FFFFFF'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Library size={16} color={hasStandardApp ? '#7C3AED' : '#D97706'} />
                    <span style={{ fontSize: '12.5px', fontWeight: 700, color: '#1E293B', textTransform: 'uppercase' }}>
                      2. SAP Fiori Apps Reference Library
                    </span>
                  </div>
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      backgroundColor: hasStandardApp ? '#F3E8FF' : '#FEF3C7',
                      color: hasStandardApp ? '#6B21A8' : '#92400E',
                      border: `1px solid ${hasStandardApp ? '#E9D5FF' : '#FDE68A'}`,
                      borderRadius: '12px',
                      padding: '2px 8px',
                      fontSize: '11px',
                      fontWeight: 700
                    }}
                  >
                    {hasStandardApp ? (
                      <>
                        <Sparkles size={12} />
                        <span>STANDARD APP MATCH FOUND</span>
                      </>
                    ) : (
                      <>
                        <AlertCircle size={12} />
                        <span>NO STANDARD APP (GAP)</span>
                      </>
                    )}
                  </span>
                </div>

                {/* Sub-scenario A: Standard Fiori App exists */}
                {hasStandardApp && primaryCandidate && (
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
                        {primaryCandidate.uiTechnology || 'Fiori Elements'}
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
                        fontSize: '11.5px',
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
                )}

                {/* Sub-scenario B: No Standard Fiori App exists (Gap!) */}
                {!hasStandardApp && (
                  <div
                    style={{
                      backgroundColor: '#FFFBEB',
                      border: '1px solid #FDE68A',
                      borderRadius: '6px',
                      padding: '14px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px'
                    }}
                  >
                    <div style={{ fontSize: '13px', fontWeight: 700, color: '#92400E' }}>
                      Why Custom Fiori Generation is Required:
                    </div>
                    <p style={{ margin: 0, fontSize: '12px', color: '#78350F', lineHeight: 1.5 }}>
                      Transaction <strong>{tcode}</strong> is registered in your SAP system, but SAP has no standard Fiori application in the official catalogue.
                      To enable modern browser access for users, a custom Fiori Elements application must be synthesized.
                    </p>
                    <div
                      style={{
                        backgroundColor: '#FFFFFF',
                        border: '1px solid #FCD34D',
                        borderRadius: '4px',
                        padding: '10px 12px',
                        fontSize: '11.5px',
                        color: '#451A03'
                      }}
                    >
                      <strong>Clean Core Architecture:</strong> FioriX will formulate CDS View Entities, RAP Managed Behavior with Draft, and Fiori Elements List Report / Object Page in Generation Studio.
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
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
              {hasStandardApp ? (
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
                    padding: '8px 14px',
                    borderRadius: '6px',
                    border: '1px solid #CBD5E1',
                    backgroundColor: '#FFFFFF',
                    color: '#334155',
                    fontSize: '12.5px',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  <Library size={14} />
                  <span>View in Fiori Catalogue</span>
                </button>
              ) : (
                <div style={{ fontSize: '12px', color: '#64748B' }}>
                  Target: Clean Core RAP Modernization
                </div>
              )}

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

                {hasStandardApp ? (
                  /* Standard App Exists -> Proceed to Assessment (Adopt / Configure) */
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      if (onProceedToAssessment) {
                        onProceedToAssessment('VERDICT');
                      } else {
                        navigate(`/assessment-results?tcode=${encodeURIComponent(tcode)}&tab=VERDICT`);
                      }
                    }}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '8px 18px',
                      borderRadius: '6px',
                      border: 'none',
                      backgroundColor: '#16A34A',
                      color: '#FFFFFF',
                      fontSize: '13px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      boxShadow: '0 2px 4px rgba(22, 163, 74, 0.25)'
                    }}
                  >
                    <span>Proceed to Assessment (Adopt / Configure)</span>
                    <ArrowRight size={15} />
                  </button>
                ) : (
                  /* No Standard App -> Proceed to Modernization & Custom Build */
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      if (onProceedToAssessment) {
                        onProceedToAssessment('MODERNIZATION_DECISION');
                      } else {
                        navigate(`/assessment-results?tcode=${encodeURIComponent(tcode)}&tab=MODERNIZATION_DECISION`);
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
                      fontWeight: 700,
                      cursor: 'pointer',
                      boxShadow: '0 2px 4px rgba(0, 102, 255, 0.25)'
                    }}
                  >
                    <span>Proceed to Modernization &amp; Build</span>
                    <ArrowRight size={15} />
                  </button>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
