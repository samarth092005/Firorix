import React from 'react';
import { CandidateComparisonRow } from '../../../services/api/apiClient';
import { Layers, CheckCircle2, AlertTriangle, AlertCircle, HelpCircle, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export interface CandidateComparisonMatrixProps {
  candidates: CandidateComparisonRow[];
  tcode: string;
  onSelectCandidate?: (candidate: CandidateComparisonRow) => void;
  assessmentHandoff?: {
    requirement: Record<string, any>;
    candidate: Record<string, any>;
    context: Record<string, any>;
  } | null;
}

export const CandidateComparisonMatrix: React.FC<CandidateComparisonMatrixProps> = ({
  candidates,
  tcode,
  onSelectCandidate,
  assessmentHandoff
}) => {
  const navigate = useNavigate();

  if (!candidates || candidates.length === 0) {
    return null;
  }

  const getClassificationBadge = (classification: string) => {
    switch (classification) {
      case 'VERIFIED_MATCH':
        return (
          <span
            className="fiori-badge"
            style={{
              backgroundColor: '#E8F5E9',
              color: '#1B5E20',
              border: '1px solid #A5D6A7',
              fontWeight: 700,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            <CheckCircle2 size={12} />
            VERIFIED MATCH
          </span>
        );
      case 'STRONG_CANDIDATE':
        return (
          <span
            className="fiori-badge"
            style={{
              backgroundColor: '#E3F2FD',
              color: '#0D47A1',
              border: '1px solid #90CAF9',
              fontWeight: 700,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            <CheckCircle2 size={12} />
            STRONG CANDIDATE
          </span>
        );
      case 'PARTIAL_MATCH':
      case 'PARTIAL_FIT':
        return (
          <span
            className="fiori-badge"
            style={{
              backgroundColor: '#FFF8E1',
              color: '#B78103',
              border: '1px solid #FFE082',
              fontWeight: 700,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            <AlertTriangle size={12} />
            {classification === 'PARTIAL_FIT' ? 'PARTIAL FIT' : 'PARTIAL MATCH'}
          </span>
        );
      case 'ALTERNATIVE_APPROACH':
        return (
          <span
            className="fiori-badge"
            style={{
              backgroundColor: '#EDE7F6',
              color: '#4A148C',
              border: '1px solid #D1C4E9',
              fontWeight: 700,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            <HelpCircle size={12} />
            ALTERNATIVE APPROACH
          </span>
        );
      case 'INCOMPATIBLE':
        return (
          <span
            className="fiori-badge"
            style={{
              backgroundColor: '#FFEBEE',
              color: '#B71C1C',
              border: '1px solid #EF9A9A',
              fontWeight: 700,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            <AlertCircle size={12} />
            INCOMPATIBLE
          </span>
        );
      case 'WEAK_CANDIDATE':
        return (
          <span
            className="fiori-badge"
            style={{
              backgroundColor: '#FFEBEE',
              color: '#C62828',
              border: '1px solid #FFCDD2',
              fontWeight: 700,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            <AlertCircle size={12} />
            WEAK CANDIDATE
          </span>
        );
      default:
        return (
          <span
            className="fiori-badge fiori-badge-neutral"
            style={{
              fontWeight: 700,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            <HelpCircle size={12} />
            {classification.replace(/_/g, ' ')}
          </span>
        );
    }
  };

  const handleLaunchAssessment = () => {
    if (assessmentHandoff) {
      // Store in session storage so Assessment page / wizard can pick it up directly
      sessionStorage.setItem('fiorix_pending_assessment_handoff', JSON.stringify(assessmentHandoff));
    }
    navigate(`/discovery?tcode=${encodeURIComponent(tcode)}&mode=wizard`);
  };

  return (
    <div className="fiori-card" style={{ marginBottom: '20px', padding: '20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: 'var(--radius-xs)',
              backgroundColor: 'rgba(0, 128, 128, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--fiori-teal)'
            }}
          >
            <Layers size={18} />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: 'var(--fiori-text-primary)' }}>
              Candidate Comparison Matrix
            </h3>
            <p style={{ margin: 0, fontSize: '12px', color: 'var(--fiori-text-secondary)' }}>
              Multi-dimensional evaluation for transaction <strong>{tcode}</strong> against canonical Fiori catalogue
            </p>
          </div>
        </div>

        {assessmentHandoff && (
          <button
            onClick={handleLaunchAssessment}
            className="fiori-btn fiori-btn-primary"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 14px',
              fontSize: '12px',
              fontWeight: 600
            }}
          >
            <span>Proceed to Fit-Gap Assessment</span>
            <ArrowRight size={14} />
          </button>
        )}
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table className="fiori-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
          <thead>
            <tr style={{ backgroundColor: 'var(--fiori-surface-subtle)', borderBottom: '2px solid var(--fiori-border)' }}>
              <th style={{ padding: '8px 10px', textAlign: 'center', width: '50px' }}>Rank</th>
              <th style={{ padding: '8px 10px', textAlign: 'left' }}>App ID &amp; Name</th>
              <th style={{ padding: '8px 10px', textAlign: 'left' }}>Type</th>
              <th style={{ padding: '8px 10px', textAlign: 'left' }}>T-Code Relation</th>
              <th style={{ padding: '8px 10px', textAlign: 'center' }}>Functional Fit</th>
              <th style={{ padding: '8px 10px', textAlign: 'center' }}>Technical Fit</th>
              <th style={{ padding: '8px 10px', textAlign: 'center' }}>Release</th>
              <th style={{ padding: '8px 10px', textAlign: 'center' }}>Overall Score</th>
              <th style={{ padding: '8px 10px', textAlign: 'left' }}>Classification</th>
              {onSelectCandidate && <th style={{ padding: '8px 10px', textAlign: 'center' }}>Action</th>}
            </tr>
          </thead>
          <tbody>
            {candidates.map((c) => (
              <tr
                key={c.appId}
                style={{
                  borderBottom: '1px solid var(--fiori-border-light)',
                  backgroundColor: c.rank === 1 ? 'rgba(0, 128, 128, 0.03)' : 'transparent'
                }}
              >
                <td style={{ padding: '10px', textAlign: 'center', fontWeight: 700 }}>
                  <span
                    style={{
                      display: 'inline-block',
                      width: '22px',
                      height: '22px',
                      lineHeight: '22px',
                      borderRadius: '50%',
                      backgroundColor: c.rank === 1 ? 'var(--fiori-teal)' : 'var(--fiori-surface-subtle)',
                      color: c.rank === 1 ? '#ffffff' : 'var(--fiori-text-secondary)',
                      fontSize: '11px',
                      fontWeight: 700
                    }}
                  >
                    #{c.rank}
                  </span>
                </td>
                <td style={{ padding: '10px' }}>
                  <div style={{ fontWeight: 600, color: 'var(--fiori-text-primary)' }}>{c.appName}</div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--fiori-text-muted)' }}>
                    {c.appId} &bull; <span style={{ textTransform: 'capitalize' }}>{c.provenance.toLowerCase().replace(/_/g, ' ')}</span>
                    {c.isExternalMcpDiscovered && (
                      <span
                        className="fiori-badge"
                        style={{
                          marginLeft: '6px',
                          fontSize: '10px',
                          backgroundColor: '#E8EAF6',
                          color: '#283593',
                          border: '1px solid #C5CAE9'
                        }}
                      >
                        MCP DISCOVERED
                      </span>
                    )}
                    {c.inLocalCatalogue && c.sources && c.sources.length > 1 && (
                      <span
                        className="fiori-badge"
                        style={{
                          marginLeft: '6px',
                          fontSize: '10px',
                          backgroundColor: '#E0F2F1',
                          color: '#004D40',
                          border: '1px solid #B2DFDB'
                        }}
                      >
                        ENRICHED
                      </span>
                    )}
                  </div>
                </td>
                <td style={{ padding: '10px' }}>
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 600,
                      padding: '2px 6px',
                      borderRadius: '3px',
                      backgroundColor: c.appType === 'SAP GUI' ? 'rgba(233, 115, 12, 0.12)' : 'rgba(0, 128, 128, 0.12)',
                      color: c.appType === 'SAP GUI' ? '#B05708' : '#006666',
                      border: `1px solid ${c.appType === 'SAP GUI' ? 'rgba(233, 115, 12, 0.3)' : 'rgba(0, 128, 128, 0.3)'}`
                    }}
                  >
                    {c.appType === 'SAP GUI' ? 'SAP GUI (WebGUI)' : (c.appType || 'Native Fiori')}
                  </span>
                </td>
                <td style={{ padding: '10px' }}>
                  <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--fiori-text-primary)' }}>
                    {c.tcodeRelationship.replace(/_/g, ' ')}
                  </span>
                </td>
                <td style={{ padding: '10px', textAlign: 'center' }}>
                  <div style={{ display: 'inline-block', minWidth: '45px', fontWeight: 600, color: c.functionalFitPercent >= 70 ? '#1B5E20' : '#B78103' }}>
                    {c.functionalFitPercent}%
                  </div>
                </td>
                <td style={{ padding: '10px', textAlign: 'center' }}>
                  <div style={{ display: 'inline-block', minWidth: '45px', fontWeight: 600, color: c.technicalFitPercent >= 70 ? '#1B5E20' : '#B78103' }}>
                    {c.technicalFitPercent}%
                  </div>
                </td>
                <td style={{ padding: '10px', textAlign: 'center' }}>
                  <span
                    className="fiori-badge"
                    style={{
                      fontSize: '10px',
                      backgroundColor: c.releaseCompatibility === 'COMPATIBLE' ? '#E8F5E9' : '#FFF8E1',
                      color: c.releaseCompatibility === 'COMPATIBLE' ? '#1B5E20' : '#B78103'
                    }}
                  >
                    {c.releaseCompatibility}
                  </span>
                </td>
                <td style={{ padding: '10px', textAlign: 'center' }}>
                  <strong style={{ fontSize: '13px', color: 'var(--fiori-teal)' }}>
                    {c.overallScore.toFixed(1)}
                  </strong>
                  <span style={{ fontSize: '10px', color: 'var(--fiori-text-muted)' }}>/100</span>
                </td>
                <td style={{ padding: '10px' }}>{getClassificationBadge(c.matchClassification)}</td>
                {onSelectCandidate && (
                  <td style={{ padding: '10px', textAlign: 'center' }}>
                    <button
                      onClick={() => onSelectCandidate(c)}
                      className="fiori-btn fiori-btn-ghost"
                      style={{ fontSize: '11px', padding: '3px 8px' }}
                    >
                      Inspect
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
