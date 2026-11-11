import React from 'react';
import { Library, CheckCircle2, AlertCircle, FileCheck, Shield, HelpCircle, Layers, Clock, AlertTriangle, ExternalLink } from 'lucide-react';
import {
  FioriCandidateResult,
  MatchType,
  SearchStatusCode,
  CatalogueVerificationStatus,
  DescriptorVerificationStatus,
  AccessVerificationStatus
} from '../types';

export interface FioriCandidatesListProps {
  candidates: FioriCandidateResult[];
  tcode: string;
  status?: SearchStatusCode;
}

export const FioriCandidatesList: React.FC<FioriCandidatesListProps> = ({
  candidates,
  tcode,
  status
}) => {
  const getMatchTypeBadge = (matchType: MatchType) => {
    switch (matchType) {
      case 'EXPLICIT_SUCCESSOR':
        return (
          <span
            className="fiori-badge"
            style={{
              fontWeight: 700,
              backgroundColor: '#E8F5E9',
              color: '#1B5E20',
              border: '1px solid #A5D6A7'
            }}
          >
            EXPLICIT SUCCESSOR
          </span>
        );
      case 'SAME_TRANSACTION_CLASSIC':
      case 'SAP_GUI_HTML':
        return (
          <span
            className="fiori-badge"
            style={{
              fontWeight: 700,
              backgroundColor: '#E3F2FD',
              color: '#0D47A1',
              border: '1px solid #90CAF9'
            }}
          >
            SAP GUI FOR HTML
          </span>
        );
      case 'FUNCTIONAL_ALTERNATIVE':
        return (
          <span
            className="fiori-badge"
            style={{
              fontWeight: 700,
              backgroundColor: '#EDE7F6',
              color: '#4A148C',
              border: '1px solid #D1C4E9'
            }}
          >
            FUNCTIONAL ALTERNATIVE
          </span>
        );
      case 'NO_STANDARD_APP_EXISTS':
        return (
          <span
            className="fiori-badge"
            style={{
              fontWeight: 700,
              backgroundColor: '#F5F5F5',
              color: '#616161',
              border: '1px solid #E0E0E0'
            }}
          >
            NO STANDARD APP EXISTS
          </span>
        );
      case 'DIRECT_MATCH':
        return (
          <span className="fiori-badge fiori-badge-success" style={{ fontWeight: 700 }}>
            DIRECT MATCH (Rule 1)
          </span>
        );
      case 'RELATED_MATCH':
        return (
          <span className="fiori-badge fiori-badge-warning" style={{ fontWeight: 700 }}>
            RELATED MATCH (Rule 2)
          </span>
        );
      case 'POSSIBLE_MATCH':
        return (
          <span className="fiori-badge fiori-badge-info" style={{ fontWeight: 700 }}>
            POSSIBLE MATCH (Rule 3)
          </span>
        );
      case 'CATALOGUE_PENDING_VERIFICATION':
        return (
          <span
            className="fiori-badge"
            style={{
              fontWeight: 700,
              backgroundColor: '#FFF3E0',
              color: '#E65100',
              border: '1px solid #FFE0B2'
            }}
          >
            PENDING VERIFICATION
          </span>
        );
      default:
        return (
          <span className="fiori-badge fiori-badge-neutral">
            NO VERIFIED MATCH
          </span>
        );
    }
  };

  const getUiTechnologyBadge = (uiTech?: string) => {
    const tech = uiTech || 'UNKNOWN';
    let bg = 'var(--fiori-bg)';
    let color = 'var(--fiori-text-secondary)';
    let border = 'var(--fiori-border)';

    if (tech === 'SAP Fiori elements') {
      bg = '#EDE7F6';
      color = '#4A148C';
      border = '#D1C4E9';
    } else if (tech === 'SAP GUI for HTML') {
      bg = '#FFF3E0';
      color = '#B26A00';
      border = '#FFE0B2';
    } else if (tech === 'SAPUI5 freestyle') {
      bg = '#E0F2F1';
      color = '#004D40';
      border = '#80CBC4';
    }

    return (
      <span
        className="fiori-badge"
        style={{
          fontWeight: 600,
          fontSize: '11px',
          backgroundColor: bg,
          color,
          border: `1px solid ${border}`
        }}
      >
        {tech}
      </span>
    );
  };

  const getCatalogueBadge = (catalogueStatus: CatalogueVerificationStatus) => {
    return catalogueStatus === 'CATALOGUE_FOUND' ? (
      <span className="fiori-badge fiori-badge-success">Catalogue: Found</span>
    ) : (
      <span className="fiori-badge fiori-badge-error">Catalogue: Missing</span>
    );
  };

  const getDescriptorBadge = (descriptorStatus: DescriptorVerificationStatus) => {
    switch (descriptorStatus) {
      case 'DESCRIPTOR_FOUND':
        return <span className="fiori-badge fiori-badge-success">Descriptor: Verified</span>;
      case 'NOT_CHECKED':
        return <span className="fiori-badge fiori-badge-neutral">Descriptor: Not Checked</span>;
      case 'NOT_FOUND':
        return <span className="fiori-badge fiori-badge-error">Descriptor: Not Found</span>;
    }
  };

  const getAccessBadge = (accessStatus: AccessVerificationStatus) => {
    switch (accessStatus) {
      case 'ACCESS_CONFIRMED':
        return <span className="fiori-badge fiori-badge-success">Access: Confirmed</span>;
      case 'NOT_CHECKED':
        return <span className="fiori-badge fiori-badge-neutral">Access: Not Checked</span>;
      case 'NOT_CONFIRMED':
        return <span className="fiori-badge fiori-badge-warning">Access: Unconfirmed</span>;
    }
  };

  if (candidates.length === 0) {
    if (status === 'NO_STANDARD_APP_EXISTS') {
      return (
        <div
          className="fiori-card"
          style={{
            marginBottom: '24px',
            borderLeft: '4px solid #757575',
            backgroundColor: 'var(--fiori-surface)'
          }}
        >
          <div className="fiori-card-header" style={{ backgroundColor: 'rgba(0, 0, 0, 0.04)' }}>
            <div className="fiori-card-title">
              <Layers size={16} color="#616161" />
              <span>Verified Absence: No Standard Fiori Application Exists</span>
            </div>
            <span
              className="fiori-badge"
              style={{
                backgroundColor: '#EEEEEE',
                color: '#424242',
                border: '1px solid #BDBDBD',
                fontWeight: 700
              }}
            >
              Verified Absence
            </span>
          </div>
          <div className="fiori-card-body" style={{ padding: '24px 20px' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
              <CheckCircle2 size={24} color="#616161" style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>
                <h3 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--fiori-text-primary)', marginBottom: '6px' }}>
                  No Standard SAP Fiori Application for Transaction {tcode}
                </h3>
                <p style={{ fontSize: '13px', color: 'var(--fiori-text-secondary)', lineHeight: 1.5, margin: 0 }}>
                  Curated official SAP Fiori Apps Reference Library audit confirms that <strong>no standard SAP Fiori application exists</strong> for this transaction in SAP S/4HANA 2023. This is a verified negative result based on catalog evidence, not an unknown or failed search.
                </p>
                <div
                  style={{
                    marginTop: '14px',
                    fontSize: '12px',
                    color: '#424242',
                    backgroundColor: '#F5F5F5',
                    border: '1px solid #E0E0E0',
                    borderRadius: 'var(--radius-xs)',
                    padding: '10px 14px'
                  }}
                >
                  <strong>Architectural Recommendation:</strong> For customer custom transactions (Z/Y) or legacy workflows without standard successors, consider building a custom SAP Fiori elements application using the ABAP RESTful Application Programming Model (RAP) or creating a classic SAP GUI transaction tile in the SAP Fiori Launchpad.
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    if (status === 'CATALOGUE_PENDING_VERIFICATION') {
      return (
        <div
          className="fiori-card"
          style={{
            marginBottom: '24px',
            borderLeft: '4px solid #E9730C',
            backgroundColor: 'var(--fiori-surface)'
          }}
        >
          <div className="fiori-card-header" style={{ backgroundColor: 'rgba(233, 115, 12, 0.08)' }}>
            <div className="fiori-card-title">
              <Clock size={16} color="#E9730C" />
              <span>Catalogue & TADIR Verification Pending</span>
            </div>
            <span
              className="fiori-badge"
              style={{
                backgroundColor: '#FFF3E0',
                color: '#C05C06',
                border: '1px solid #FFE082',
                fontWeight: 700
              }}
            >
              Verification In Progress
            </span>
          </div>
          <div className="fiori-card-body" style={{ padding: '24px 20px' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
              <AlertTriangle size={24} color="#E9730C" style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>
                <h3 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--fiori-text-primary)', marginBottom: '6px' }}>
                  Catalogue Investigation Incomplete for Transaction {tcode}
                </h3>
                <p style={{ fontSize: '13px', color: 'var(--fiori-text-secondary)', lineHeight: 1.5, margin: 0 }}>
                  Transaction <strong style={{ fontFamily: 'var(--font-mono)' }}>{tcode}</strong> exists in SAP Data Dictionary (<span style={{ fontFamily: 'var(--font-mono)' }}>TSTC / TSTCT</span> verified), but package ownership (<span style={{ fontFamily: 'var(--font-mono)' }}>TADIR</span>) and official SAP Fiori Apps Reference Library catalogue mapping remain pending technical verification.
                </p>
                <div
                  style={{
                    marginTop: '14px',
                    fontSize: '12px',
                    color: '#7A4100',
                    backgroundColor: '#FFF8E1',
                    border: '1px solid #FFE082',
                    borderRadius: 'var(--radius-xs)',
                    padding: '10px 14px'
                  }}
                >
                  <strong>Golden Invariant (BR-03):</strong> Unknown evidence must never be represented as a confirmed absence of an application. In accordance with architectural governance, this transaction remains in status <code>CATALOGUE_PENDING_VERIFICATION</code> until official repository evidence is verified.
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="fiori-card" style={{ marginBottom: '24px' }}>
        <div className="fiori-card-header">
          <div className="fiori-card-title">
            <Library size={16} color="var(--fiori-teal)" />
            <span>Standard SAP Fiori Application Candidates</span>
          </div>
          <span className="fiori-badge fiori-badge-neutral">0 Candidates</span>
        </div>
        <div className="fiori-card-body" style={{ textAlign: 'center', padding: '36px 20px' }}>
          <AlertCircle size={32} color="var(--fiori-text-muted)" style={{ margin: '0 auto 12px' }} />
          <h3 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--fiori-text-primary)', marginBottom: '6px' }}>
            No Verified Fiori Application Candidate
          </h3>
          <p style={{ fontSize: '13px', color: 'var(--fiori-text-secondary)', maxWidth: '580px', margin: '0 auto' }}>
            No curated standard SAP Fiori application mapping exists for transaction <strong>{tcode}</strong> in the synthetic demo catalogue. Phase 1 governance strictly forbids keyword-similarity guesses or probabilistic matches.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="fiori-card" style={{ marginBottom: '24px' }}>
      <div className="fiori-card-header">
        <div className="fiori-card-title">
          <Library size={16} color="var(--fiori-teal)" />
          <span>Standard SAP Fiori Application Candidates</span>
        </div>
        <span className="fiori-badge fiori-badge-success">{candidates.length} Candidate(s) Discovered</span>
      </div>

      <div className="fiori-card-body" style={{ padding: '16px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {candidates.map((cand) => (
            <div
              key={cand.appId}
              style={{
                border: '1px solid var(--fiori-border)',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: 'var(--fiori-surface)',
                overflow: 'hidden'
              }}
            >
              {/* Candidate Card Header */}
              <div
                style={{
                  padding: '12px 16px',
                  backgroundColor: 'var(--fiori-surface-subtle)',
                  borderBottom: '1px solid var(--fiori-border-light)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '8px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Layers size={18} color="var(--fiori-teal)" />
                  <div>
                    <span style={{ fontSize: '15px', fontWeight: 600, color: 'var(--fiori-text-primary)' }}>
                      {cand.appName}
                    </span>
                    <span
                      style={{
                        marginLeft: '8px',
                        fontSize: '11px',
                        fontFamily: 'var(--font-mono)',
                        color: 'var(--fiori-text-secondary)',
                        backgroundColor: 'var(--fiori-surface)',
                        padding: '2px 6px',
                        borderRadius: '3px',
                        border: '1px solid var(--fiori-border)'
                      }}
                    >
                      {cand.appId}
                    </span>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                  {getMatchTypeBadge(cand.matchType)}
                  {getUiTechnologyBadge(cand.uiTechnology)}
                  <span className="fiori-badge fiori-badge-neutral">{cand.appType}</span>
                </div>
              </div>

              {/* Candidate Card Body */}
              <div style={{ padding: '16px' }}>
                {/* Rationale & Equivalence Note */}
                <div style={{ marginBottom: '14px' }}>
                  <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--fiori-text-secondary)', marginBottom: '4px' }}>
                    Mapping Rationale & Evidence:
                  </div>
                  <div
                    style={{
                      fontSize: '13px',
                      color: 'var(--fiori-text-primary)',
                      padding: '8px 12px',
                      backgroundColor: 'var(--fiori-bg)',
                      borderRadius: 'var(--radius-xs)',
                      borderLeft: '3px solid var(--fiori-teal)'
                    }}
                  >
                    {cand.rationale}
                  </div>

                  {cand.matchType === 'EXPLICIT_SUCCESSOR' && (
                    <div
                      style={{
                        marginTop: '8px',
                        fontSize: '12px',
                        color: '#1B5E20',
                        backgroundColor: '#E8F5E9',
                        border: '1px solid #A5D6A7',
                        borderRadius: 'var(--radius-xs)',
                        padding: '8px 12px'
                      }}
                    >
                      <strong>SAP-Designated Successor:</strong> This application (<strong>{cand.appName}</strong> &bull; <span style={{ fontFamily: 'var(--font-mono)' }}>{cand.appId}</span>) is confirmed as the official SAP Fiori elements successor for legacy transaction <strong>{tcode}</strong>.
                    </div>
                  )}

                  {cand.matchType === 'SAP_GUI_HTML' && (
                    <div
                      style={{
                        marginTop: '8px',
                        fontSize: '12px',
                        color: '#0D47A1',
                        backgroundColor: '#E3F2FD',
                        border: '1px solid #90CAF9',
                        borderRadius: 'var(--radius-xs)',
                        padding: '8px 12px'
                      }}
                    >
                      <strong>Classic SAP GUI in Launchpad:</strong> This application executes the classic dynpro screen transaction in the browser via <strong>SAP GUI for HTML (WebGUI)</strong> inside the SAP Fiori Launchpad. It is <strong>NOT</strong> a native SAP Fiori elements or SAPUI5 application.
                    </div>
                  )}

                  {cand.matchType === 'DIRECT_MATCH' && (
                    <div
                      style={{
                        marginTop: '8px',
                        fontSize: '12px',
                        color: 'var(--fiori-teal)',
                        backgroundColor: 'var(--fiori-teal-light)',
                        border: '1px solid var(--fiori-teal)',
                        borderRadius: 'var(--radius-xs)',
                        padding: '6px 10px'
                      }}
                    >
                      <strong>Demo Notice:</strong> DIRECT MATCH represents an approved 1:1 association in the demo catalogue. In live environments, functional equivalence must be verified against product/release-specific implementation data in the SAP Fiori Apps Reference Library.
                    </div>
                  )}

                  {cand.matchType === 'RELATED_MATCH' && (
                    <div
                      style={{
                        marginTop: '8px',
                        fontSize: '12px',
                        color: '#7A4100',
                        backgroundColor: '#FFF8E1',
                        border: '1px solid #FFE082',
                        borderRadius: 'var(--radius-xs)',
                        padding: '6px 10px'
                      }}
                    >
                      <strong>Governance Rule:</strong> Curated demo mapping for an adjacent business workflow; functional equivalence is not established. Requires business validation prior to migration.
                    </div>
                  )}
                </div>

                {/* Verification Attributes */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                    gap: '12px',
                    padding: '12px',
                    backgroundColor: 'var(--fiori-surface-subtle)',
                    borderRadius: 'var(--radius-xs)',
                    border: '1px solid var(--fiori-border-light)'
                  }}
                >
                  <div>
                    <div style={{ fontSize: '11px', color: 'var(--fiori-text-muted)', marginBottom: '4px' }}>
                      UI Technology
                    </div>
                    {getUiTechnologyBadge(cand.uiTechnology)}
                  </div>

                  <div>
                    <div style={{ fontSize: '11px', color: 'var(--fiori-text-muted)', marginBottom: '4px' }}>
                      Catalogue Release
                    </div>
                    <span className="fiori-badge fiori-badge-neutral" style={{ fontSize: '11px' }}>
                      {cand.productVersion}
                    </span>
                  </div>

                  <div>
                    <div style={{ fontSize: '11px', color: 'var(--fiori-text-muted)', marginBottom: '4px' }}>
                      Catalogue Status
                    </div>
                    {getCatalogueBadge(cand.catalogueStatus)}
                  </div>

                  <div>
                    <div style={{ fontSize: '11px', color: 'var(--fiori-text-muted)', marginBottom: '4px' }}>
                      Backend Descriptor
                    </div>
                    {getDescriptorBadge(cand.descriptorStatus)}
                  </div>

                  <div>
                    <div style={{ fontSize: '11px', color: 'var(--fiori-text-muted)', marginBottom: '4px' }}>
                      User Authorization
                    </div>
                    {getAccessBadge(cand.accessStatus)}
                  </div>
                </div>

                {/* Provenance Footer */}
                <div
                  style={{
                    marginTop: '10px',
                    fontSize: '11px',
                    color: 'var(--fiori-text-muted)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <FileCheck size={12} color="var(--fiori-text-muted)" />
                  <span>Catalogue Source: {cand.sourceLabel}</span>
                  <span>&bull;</span>
                  <span>Release Compatibility: {cand.releaseCompatibility}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
