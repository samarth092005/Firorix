import React from 'react';
import {
  AssessmentRecord,
  AssessmentEvidenceScore,
  ReleaseCompatibilityRecord,
  SystemAvailabilityAudit,
  AssessmentRecommendation
} from '../../../services/contracts/types';
import { StatusBadge } from '../../../components/status/StatusBadge';
import {
  CheckCircle2,
  AlertTriangle,
  Layers,
  Cpu,
  ShieldCheck,
  Server,
  FileCheck,
  HelpCircle,
  ExternalLink
} from 'lucide-react';

export interface ExecutiveSummaryProps {
  assessment: AssessmentRecord;
  evidenceScore: AssessmentEvidenceScore;
  compatibility: ReleaseCompatibilityRecord;
  systemAvailability: SystemAvailabilityAudit;
  recommendation: AssessmentRecommendation;
}

export const ExecutiveSummary: React.FC<ExecutiveSummaryProps> = ({
  assessment,
  evidenceScore,
  compatibility,
  systemAvailability,
  recommendation
}) => {
  // Determine overall executive status
  const getOverallStatus = () => {
    if (assessment.assessmentResult === 'RELEASE_INCOMPATIBLE') return 'INCOMPATIBLE';
    if (assessment.assessmentResult === 'NO_VERIFIED_MATCH') return 'NO_VERIFIED_MATCH';
    if (assessment.assessmentResult === 'PENDING_VERIFICATION') return 'PENDING_VERIFICATION';
    if (evidenceScore.completenessLabel === 'COMPLETE') return 'VERIFIED';
    return 'PARTIALLY_VERIFIED';
  };

  const overallStatus = getOverallStatus();

  return (
    <div
      style={{
        backgroundColor: 'var(--fiori-surface, #FFFFFF)',
        border: '1px solid var(--fiori-border, #E2E8F0)',
        borderRadius: 'var(--radius-md, 6px)',
        padding: '24px',
        boxShadow: 'var(--fiori-shadow-sm, 0 1px 3px rgba(0,0,0,0.05))',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px'
      }}
    >
      <div>
        <h2
          style={{
            margin: '0 0 4px 0',
            fontSize: '16px',
            fontWeight: 700,
            color: 'var(--fiori-navy, #102A43)'
          }}
        >
          Executive Assessment Summary
        </h2>
        <p
          style={{
            margin: 0,
            fontSize: '12px',
            color: 'var(--fiori-text-secondary, #64748B)'
          }}
        >
          Consolidated technical audit, official Fiori catalogue matching, and release readiness determination.
        </p>
      </div>

      {/* 6 Key Architectural Assessment Pillars */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '12px'
        }}
      >
        {/* Pillar 1: Overall Status */}
        <div
          style={{
            padding: '14px',
            borderRadius: 'var(--radius-sm, 4px)',
            backgroundColor: 'var(--fiori-surface-subtle, #F8FAFC)',
            border: '1px solid var(--fiori-border, #E2E8F0)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            gap: '8px'
          }}
        >
          <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--fiori-text-secondary, #64748B)' }}>
            OVERALL STATUS
          </span>
          <StatusBadge status={overallStatus} size="md" />
          <span style={{ fontSize: '11px', color: 'var(--fiori-text-secondary, #64748B)' }}>
            {overallStatus === 'VERIFIED'
              ? 'Multi-evidence verification complete'
              : overallStatus === 'PENDING_VERIFICATION'
              ? 'Awaiting Basis S21 activation'
              : 'Evaluated with notes'}
          </span>
        </div>

        {/* Pillar 2: Transaction Classification */}
        <div
          style={{
            padding: '14px',
            borderRadius: 'var(--radius-sm, 4px)',
            backgroundColor: 'var(--fiori-surface-subtle, #F8FAFC)',
            border: '1px solid var(--fiori-border, #E2E8F0)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            gap: '8px'
          }}
        >
          <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--fiori-text-secondary, #64748B)' }}>
            T-CODE CLASSIFICATION
          </span>
          <StatusBadge status={assessment.classification} size="md" />
          <span style={{ fontSize: '11px', color: 'var(--fiori-text-secondary, #64748B)' }}>
            Package: <strong style={{ fontFamily: 'var(--font-mono)' }}>{assessment.packageName}</strong>
          </span>
        </div>

        {/* Pillar 3: Fiori Matching Result */}
        <div
          style={{
            padding: '14px',
            borderRadius: 'var(--radius-sm, 4px)',
            backgroundColor: 'var(--fiori-surface-subtle, #F8FAFC)',
            border: '1px solid var(--fiori-border, #E2E8F0)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            gap: '8px'
          }}
        >
          <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--fiori-text-secondary, #64748B)' }}>
            FIORI MATCH RESULT
          </span>
          <StatusBadge status={assessment.assessmentResult} size="md" />
          <span style={{ fontSize: '11px', color: 'var(--fiori-text-secondary, #64748B)' }}>
            {assessment.matchingFioriApp ? `App ${assessment.matchingFioriApp.appId}` : 'No Standard Match'}
          </span>
        </div>

        {/* Pillar 4: Release Compatibility */}
        <div
          style={{
            padding: '14px',
            borderRadius: 'var(--radius-sm, 4px)',
            backgroundColor: 'var(--fiori-surface-subtle, #F8FAFC)',
            border: '1px solid var(--fiori-border, #E2E8F0)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            gap: '8px'
          }}
        >
          <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--fiori-text-secondary, #64748B)' }}>
            RELEASE COMPATIBILITY
          </span>
          <StatusBadge status={compatibility.status} size="md" />
          <span style={{ fontSize: '11px', color: 'var(--fiori-text-secondary, #64748B)' }}>
            S4CORE 108 SP0003 verified
          </span>
        </div>

        {/* Pillar 5: S21 Target Availability */}
        <div
          style={{
            padding: '14px',
            borderRadius: 'var(--radius-sm, 4px)',
            backgroundColor: 'var(--fiori-surface-subtle, #F8FAFC)',
            border: '1px solid var(--fiori-border, #E2E8F0)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            gap: '8px'
          }}
        >
          <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--fiori-text-secondary, #64748B)' }}>
            S21 LIVE AVAILABILITY
          </span>
          <StatusBadge status={systemAvailability.overallS21Availability} size="md" />
          <span style={{ fontSize: '11px', color: 'var(--fiori-text-secondary, #64748B)' }}>
            Client 200 (Requires Basis activation)
          </span>
        </div>

        {/* Pillar 6: Evidence Completeness Score */}
        <div
          style={{
            padding: '14px',
            borderRadius: 'var(--radius-sm, 4px)',
            backgroundColor: 'var(--fiori-surface-subtle, #F8FAFC)',
            border: '1px solid var(--fiori-border, #E2E8F0)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            gap: '8px'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--fiori-text-secondary, #64748B)' }}>
              EVIDENCE SCORE
            </span>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 700,
                color: 'var(--fiori-primary, #0A6ED1)',
                fontFamily: 'var(--font-mono)'
              }}
            >
              {evidenceScore.totalScore}/100
            </span>
          </div>

          {/* Progress Bar */}
          <div
            style={{
              height: '6px',
              backgroundColor: '#E2E8F0',
              borderRadius: '3px',
              overflow: 'hidden'
            }}
          >
            <div
              style={{
                height: '100%',
                width: `${evidenceScore.totalScore}%`,
                backgroundColor:
                  evidenceScore.totalScore >= 80
                    ? 'var(--fiori-success, #188918)'
                    : evidenceScore.totalScore >= 60
                    ? 'var(--fiori-primary, #0A6ED1)'
                    : 'var(--fiori-warning, #E9730C)'
              }}
            />
          </div>

          <span style={{ fontSize: '11px', color: 'var(--fiori-text-secondary, #64748B)' }}>
            {evidenceScore.completenessLabel} Completeness
          </span>
        </div>
      </div>

      {/* Primary Recommendation Banner */}
      <div
        style={{
          padding: '16px 20px',
          borderRadius: 'var(--radius-sm, 4px)',
          backgroundColor: '#F0F7FD',
          border: '1px solid #B8D5F8',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <CheckCircle2 size={16} color="var(--fiori-primary, #0A6ED1)" />
          <strong style={{ fontSize: '13px', color: 'var(--fiori-navy, #102A43)' }}>
            Target Architectural Recommendation
          </strong>
        </div>

        <p style={{ margin: 0, fontSize: '13px', lineHeight: 1.5, color: 'var(--fiori-text-primary, #1B2838)' }}>
          {recommendation.recommendedAction}
        </p>

        <div style={{ fontSize: '11px', color: 'var(--fiori-text-secondary, #64748B)', marginTop: '4px' }}>
          <strong>Rationale: </strong>{assessment.rationale}
        </div>
      </div>

     
    </div>
  );
};
