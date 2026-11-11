import React from 'react';
import { Database, AlertTriangle, CheckCircle2, XCircle, Info, ShieldAlert, AlertOctagon, Cpu, Workflow, ShieldCheck } from 'lucide-react';
import {
  TransactionClassification,
  MetadataCompletenessStatus,
  TadirEvidence,
  ClassificationEvidenceDetails
} from '../types';
import { TransactionDiscoveryResult } from '../../../services/api/apiClient';

export interface TransactionVerificationCardProps {
  transaction: {
    tcode: string;
    exists: boolean;
    classification: TransactionClassification;
    description?: string;
    program?: string;
    screenNumber?: string;
    packageName?: string;
    originalSystem?: string;
    softwareComponent?: string;
    metadataStatus: MetadataCompletenessStatus;
    evidence: string[];
    tadir?: TadirEvidence;
    classificationDetails?: ClassificationEvidenceDetails;
  };
  transactionIdentity?: TransactionDiscoveryResult['transactionIdentity'];
  isLiveSap?: boolean;
}

export const TransactionVerificationCard: React.FC<TransactionVerificationCardProps> = ({
  transaction,
  transactionIdentity,
  isLiveSap = false
}) => {
  const getClassificationBadge = (classification: TransactionClassification) => {
    switch (classification) {
      case 'STANDARD':
        return <span className="fiori-badge fiori-badge-info">SAP Standard</span>;
      case 'CUSTOM':
        return <span className="fiori-badge fiori-badge-warning">Customer Custom (Z/Y)</span>;
      case 'PARTNER':
        return <span className="fiori-badge fiori-badge-neutral">Partner Add-on</span>;
      default:
        return <span className="fiori-badge fiori-badge-neutral">Unknown</span>;
    }
  };

  const getMetadataBadge = (status: MetadataCompletenessStatus) => {
    switch (status) {
      case 'COMPLETE':
        return <span className="fiori-badge fiori-badge-success">Metadata Complete</span>;
      case 'INCOMPLETE':
        return <span className="fiori-badge fiori-badge-warning">Metadata Incomplete</span>;
      default:
        return <span className="fiori-badge fiori-badge-neutral">Not Available</span>;
    }
  };

  const getEvidenceClassificationBadge = (classification?: string) => {
    switch (classification) {
      case 'LIVE_SAP_VERIFIED':
        return (
          <span className="fiori-badge" style={{ backgroundColor: '#E8F5E9', color: '#1B5E20', border: '1px solid #A5D6A7', fontSize: '10px', fontWeight: 700 }}>
            LIVE SAP VERIFIED
          </span>
        );
      case 'CURATED_FIXTURE':
        return (
          <span className="fiori-badge" style={{ backgroundColor: '#FFF3E0', color: '#E65100', border: '1px solid #FFCC80', fontSize: '10px', fontWeight: 700 }}>
            CURATED FIXTURE
          </span>
        );
      case 'FORMAT_VALIDATED':
        return (
          <span className="fiori-badge" style={{ backgroundColor: '#E3F2FD', color: '#0D47A1', border: '1px solid #90CAF9', fontSize: '10px', fontWeight: 700 }}>
            FORMAT VALIDATED
          </span>
        );
      case 'USER_PROVIDED':
        return (
          <span className="fiori-badge fiori-badge-neutral" style={{ fontSize: '10px', fontWeight: 700 }}>
            USER PROVIDED
          </span>
        );
      case 'BLOCKED_BY_AUTHORIZATION':
        return (
          <span className="fiori-badge" style={{ backgroundColor: '#FFEBEE', color: '#C62828', border: '1px solid #FFCDD2', fontSize: '10px', fontWeight: 700 }}>
            AUTH BLOCKED
          </span>
        );
      case 'PENDING_VERIFICATION':
        return (
          <span className="fiori-badge" style={{ backgroundColor: '#FFFDE7', color: '#F57F17', border: '1px solid #FFF59D', fontSize: '10px', fontWeight: 700 }}>
            PENDING VERIFICATION
          </span>
        );
      case 'UNAVAILABLE':
      default:
        return (
          <span className="fiori-badge fiori-badge-neutral" style={{ fontSize: '10px', fontWeight: 700 }}>
            {classification || 'UNAVAILABLE'}
          </span>
        );
    }
  };

  return (
    <div className="fiori-card" style={{ marginBottom: '24px' }}>
      <div className="fiori-card-header">
        <div className="fiori-card-title">
          <Database size={16} color="var(--fiori-teal)" />
          <span>SAP Transaction Verification &amp; Technical Evidence Breakdown</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {getClassificationBadge(transaction.classification)}
          {getMetadataBadge(transaction.metadataStatus)}
        </div>
      </div>

      <div className="fiori-card-body">
        {/* Transaction Identity & Governance Bar */}
        {transactionIdentity && (
          <div
            style={{
              padding: '12px 16px',
              backgroundColor: 'var(--fiori-surface-subtle)',
              border: '1px solid var(--fiori-border)',
              borderRadius: 'var(--radius-sm)',
              marginBottom: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ShieldCheck size={16} color="var(--fiori-teal)" />
                <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--fiori-text-primary)' }}>
                  User-Supplied Input: <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}>{transactionIdentity.userSuppliedTCode}</span>
                </span>
                {getEvidenceClassificationBadge(transactionIdentity.formatValidation.classification)}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '12px', color: 'var(--fiori-text-secondary)' }}>SAP Existence Status:</span>
                {getEvidenceClassificationBadge(transactionIdentity.sapExistenceVerification.classification)}
              </div>
            </div>
            {transactionIdentity.sapExistenceVerification.details && (
              <div style={{ fontSize: '11px', color: 'var(--fiori-text-secondary)', paddingLeft: '24px' }}>
                &bull; {transactionIdentity.sapExistenceVerification.details}
              </div>
            )}
          </div>
        )}

        {/* Existence status banner */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 16px',
            backgroundColor: transaction.exists ? 'var(--fiori-surface-subtle)' : 'var(--fiori-error-bg)',
            border: `1px solid ${transaction.exists ? 'var(--fiori-border)' : 'var(--fiori-error-border)'}`,
            borderRadius: 'var(--radius-sm)',
            marginBottom: '16px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {transaction.exists ? (
              <CheckCircle2 size={18} color="var(--fiori-success)" />
            ) : (
              <XCircle size={18} color="var(--fiori-error)" />
            )}
            <div>
              <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--fiori-text-primary)' }}>
                T-Code: <span style={{ fontFamily: 'var(--font-mono)' }}>{transaction.tcode}</span>
              </div>
              <div style={{ fontSize: '12px', color: 'var(--fiori-text-secondary)' }}>
                {transaction.exists
                  ? (isLiveSap ? 'Transaction confirmed on live SAP Gateway/ADT host.' : 'Transaction found in synthetic TSTC fixture.')
                  : 'Transaction not found in target SAP repository.'}
              </div>
            </div>
          </div>
          <span
            className={`fiori-badge ${
              transaction.exists ? 'fiori-badge-success' : 'fiori-badge-error'
            }`}
          >
            {transaction.exists ? 'EXISTS' : 'NOT FOUND'}
          </span>
        </div>

        {/* Dual Dimension Notice: Technical Readiness vs Functional Suitability */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '12px',
            marginBottom: '16px'
          }}
        >
          <div
            style={{
              padding: '10px 14px',
              backgroundColor: 'rgba(0, 128, 128, 0.05)',
              border: '1px solid rgba(0, 128, 128, 0.2)',
              borderRadius: 'var(--radius-sm)',
              fontSize: '11px',
              lineHeight: 1.4
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, color: '#005f5f', marginBottom: '4px' }}>
              <Cpu size={14} />
              <span>Dimension A: Technical Readiness</span>
            </div>
            <div style={{ color: 'var(--fiori-text-secondary)' }}>
              Evaluates dictionary existence, ADT package mapping, active Gateway OData services, and S/4HANA release compatibility.
            </div>
          </div>

          <div
            style={{
              padding: '10px 14px',
              backgroundColor: 'rgba(233, 115, 12, 0.05)',
              border: '1px solid rgba(233, 115, 12, 0.2)',
              borderRadius: 'var(--radius-sm)',
              fontSize: '11px',
              lineHeight: 1.4
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, color: '#C05C06', marginBottom: '4px' }}>
              <Workflow size={14} />
              <span>Dimension B: Functional Suitability</span>
            </div>
            <div style={{ color: 'var(--fiori-text-secondary)' }}>
              Evaluates business process alignment, user intent, workflow equivalence, and operational fit against user requirements.
            </div>
          </div>
        </div>

        {/* Conflict Warning Banner if multi-evidence conflict detected */}
        {transaction.classificationDetails?.conflictsDetected &&
          transaction.classificationDetails.conflictsDetected.length > 0 && (
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '10px',
                padding: '12px 14px',
                backgroundColor: '#FFF4E5',
                border: '1px solid #FFA726',
                borderRadius: 'var(--radius-sm)',
                marginBottom: '16px',
                fontSize: '12px',
                color: '#663C00'
              }}
            >
              <AlertOctagon size={18} color="#E65100" style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>
                <strong>Repository Evidence Conflict Detected (Reclassified to UNKNOWN):</strong>
                <ul style={{ margin: '6px 0 0 16px', padding: 0 }}>
                  {transaction.classificationDetails.conflictsDetected.map((c, i) => (
                    <li key={i}>{c}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}

        {/* Warning if metadata is incomplete */}
        {transaction.exists && transaction.metadataStatus === 'INCOMPLETE' && (
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '10px',
              padding: '10px 14px',
              backgroundColor: 'var(--fiori-warning-bg)',
              border: '1px solid var(--fiori-warning-border)',
              borderRadius: 'var(--radius-sm)',
              marginBottom: '16px',
              fontSize: '12px',
              color: 'var(--fiori-text-primary)'
            }}
          >
            <AlertTriangle size={16} color="var(--fiori-warning)" style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>
              <strong>Metadata Incomplete Warning:</strong> This transaction exists in the repository, but optional technical metadata (such as functional description or linked program executable) is missing.
            </div>
          </div>
        )}

        {/* Metadata Details Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '14px',
            backgroundColor: 'var(--fiori-surface)',
            border: '1px solid var(--fiori-border-light)',
            padding: '16px',
            borderRadius: 'var(--radius-sm)'
          }}
        >
          <div>
            <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--fiori-text-muted)', textTransform: 'uppercase' }}>
              Functional Description
            </div>
            <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--fiori-text-primary)', marginTop: '4px' }}>
              {transaction.description || <span style={{ color: 'var(--fiori-text-muted)', fontStyle: 'italic' }}>[Not specified in fixture]</span>}
            </div>
          </div>

          <div>
            <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--fiori-text-muted)', textTransform: 'uppercase' }}>
              Linked ABAP Program
            </div>
            <div style={{ fontSize: '13px', fontFamily: 'var(--font-mono)', color: 'var(--fiori-text-primary)', marginTop: '4px' }}>
              {transaction.program || <span style={{ color: 'var(--fiori-text-muted)', fontStyle: 'italic', fontFamily: 'var(--font-sans)' }}>[Not specified in fixture]</span>}
            </div>
          </div>

          <div>
            <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--fiori-text-muted)', textTransform: 'uppercase' }}>
              Initial Screen Number
            </div>
            <div style={{ fontSize: '13px', fontFamily: 'var(--font-mono)', color: 'var(--fiori-text-primary)', marginTop: '4px' }}>
              {transaction.screenNumber || <span style={{ color: 'var(--fiori-text-muted)', fontStyle: 'italic', fontFamily: 'var(--font-sans)' }}>---</span>}
            </div>
          </div>

          <div>
            <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--fiori-text-muted)', textTransform: 'uppercase' }}>
              Development Package (TADIR)
            </div>
            <div style={{ fontSize: '13px', fontFamily: 'var(--font-mono)', color: 'var(--fiori-text-primary)', marginTop: '4px' }}>
              {transaction.packageName || transaction.tadir?.devclass || <span style={{ color: 'var(--fiori-text-muted)', fontStyle: 'italic', fontFamily: 'var(--font-sans)' }}>---</span>}
            </div>
          </div>

          <div>
            <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--fiori-text-muted)', textTransform: 'uppercase' }}>
              Original System (TADIR SRCSYSTEM)
            </div>
            <div style={{ fontSize: '13px', fontFamily: 'var(--font-mono)', color: 'var(--fiori-text-primary)', marginTop: '4px' }}>
              {transaction.originalSystem || transaction.tadir?.srcsystem || <span style={{ color: 'var(--fiori-text-muted)', fontStyle: 'italic', fontFamily: 'var(--font-sans)' }}>---</span>}
            </div>
          </div>

          <div>
            <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--fiori-text-muted)', textTransform: 'uppercase' }}>
              Software Component
            </div>
            <div style={{ fontSize: '13px', fontFamily: 'var(--font-mono)', color: 'var(--fiori-text-primary)', marginTop: '4px' }}>
              {transaction.softwareComponent || transaction.tadir?.softwareComponent || <span style={{ color: 'var(--fiori-text-muted)', fontStyle: 'italic', fontFamily: 'var(--font-sans)' }}>---</span>}
            </div>
          </div>
        </div>

        {/* Evidence Chips */}
        {transaction.evidence && transaction.evidence.length > 0 && (
          <div style={{ marginTop: '14px' }}>
            <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--fiori-text-secondary)', marginBottom: '6px' }}>
              Repository Provenance Evidence:
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {transaction.evidence.map((ev, i) => (
                <span
                  key={i}
                  style={{
                    fontSize: '11px',
                    padding: '2px 8px',
                    backgroundColor: 'var(--fiori-surface-subtle)',
                    border: '1px solid var(--fiori-border)',
                    borderRadius: 'var(--radius-xs)',
                    color: 'var(--fiori-text-secondary)'
                  }}
                >
                  ✓ {ev}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
