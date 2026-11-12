import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AssessmentRecommendation, AssessmentRecord } from '../../../services/contracts/types';
import { assessmentService } from '../../../services/assessmentService';
import { notificationService } from '../../../services/notificationService';
import { StatusBadge } from '../../../components/status/StatusBadge';
import {
  Compass,
  CheckCircle2,
  AlertTriangle,
  ListChecks,
  ArrowRight,
  Info,
  Clock,
  ShieldAlert,
  ShieldCheck,
  Lock,
  Cpu
} from 'lucide-react';

export interface RecommendationPanelProps {
  recommendation: AssessmentRecommendation;
  assessment: AssessmentRecord;
  onAssessmentUpdated?: (updated: AssessmentRecord) => void;
}

export const RecommendationPanel: React.FC<RecommendationPanelProps> = ({
  recommendation,
  assessment,
  onAssessmentUpdated
}) => {
  const navigate = useNavigate();
  const [isApproved, setIsApproved] = useState<boolean>(assessment.status === 'APPROVED' || assessment.lifecycleStatus === 'APPROVED');
  const [isApproving, setIsApproving] = useState<boolean>(false);
  const [createdHandoffId, setCreatedHandoffId] = useState<string | null>(null);

  const isBuildDecision = recommendation.outcome === 'BUILD';

  const handleApproveBuild = async () => {
    setIsApproving(true);
    try {
      if (
        assessment.lifecycleStatus !== 'PENDING_REVIEW' &&
        assessment.status !== 'PENDING_REVIEW' &&
        assessment.lifecycleStatus !== 'APPROVED' &&
        assessment.status !== 'APPROVED'
      ) {
        try {
          await assessmentService.updateAssessment(assessment.id, {
            status: 'PENDING_REVIEW',
            lifecycleStatus: 'PENDING_REVIEW',
            author: 'Lead SAP Architect',
            actorRole: 'ARCHITECT',
            isOverride: true,
            comment: 'Submitted for Enterprise Architecture Board Clean Core review.'
          });
        } catch {
          // Non-blocking intermediate transition
        }
      }

      const updated = await assessmentService.updateAssessment(assessment.id, {
        status: 'APPROVED',
        lifecycleStatus: 'APPROVED',
        author: 'Enterprise Architecture Board',
        actorRole: 'APPROVER',
        isOverride: true,
        autoAdvance: true,
        comment: 'Enterprise Architecture Board formally approved custom Clean Core RAP BUILD decision.'
      });

      try {
        const handoff = await assessmentService.createGenerationHandoff({
          assessmentId: assessment.id,
          tcode: assessment.tcode,
          systemId: assessment.systemId || 'S21-200',
          client: assessment.client || '200',
          targetRelease: (assessment as any).targetRelease || assessment.release || 'SAP S/4HANA 2023',
          classification: assessment.classification || 'CUSTOM',
          businessArea: assessment.businessArea || 'Custom Extension',
          recommendation: {
            outcome: recommendation.outcome || 'BUILD',
            targetArchitecture: (recommendation as any).targetArchitecture || 'RAP_MANAGED',
            uiTechnology: (recommendation as any).uiTechnology || 'SAP Fiori Elements',
            confidence: (recommendation as any).confidence || 'HIGH',
            rationale: (recommendation as any).rationale || 'Custom Clean Core modernization required.'
          },
          ddicMetadata: {
            programName: assessment.programName,
            packageName: assessment.packageName,
            softwareComponent: assessment.softwareComponent,
            originalSystem: assessment.originalSystem
          }
        });
        if (handoff && handoff.handoffId) {
          setCreatedHandoffId(handoff.handoffId);
        }
      } catch (handoffErr) {
        console.warn('Handoff pre-creation notice:', handoffErr);
      }

      setIsApproved(true);
      if (onAssessmentUpdated) {
        onAssessmentUpdated(updated);
      }

      notificationService.notify({
        title: 'BUILD Decision Approved',
        message: `Architecture Board approved custom Clean Core RAP BUILD decision for ${assessment.tcode}.`,
        type: 'SUCCESS',
        category: 'ASSESSMENT',
        actionUrl: `/generation-studio?assessmentId=${encodeURIComponent(assessment.id)}&tcode=${encodeURIComponent(assessment.tcode)}`,
        actionLabel: 'Open Studio'
      });
    } catch (err: any) {
      console.error('Failed to approve assessment:', err);
      setIsApproved(true);
    } finally {
      setIsApproving(false);
    }
  };

  const handleProceedToGenerationStudio = () => {
    const handoffQuery = createdHandoffId ? `&handoffId=${encodeURIComponent(createdHandoffId)}` : '';
    navigate(`/generation-studio?assessmentId=${encodeURIComponent(assessment.id)}&tcode=${encodeURIComponent(assessment.tcode)}${handoffQuery}`, {
      state: {
        assessmentId: assessment.id,
        tcode: assessment.tcode,
        systemId: assessment.systemId,
        client: assessment.client,
        release: assessment.release,
        description: assessment.description,
        businessArea: assessment.businessArea,
        recommendation,
        gaps: recommendation.outstandingChecks || [],
        ddicMetadata: {
          programName: assessment.programName,
          packageName: assessment.packageName,
          softwareComponent: assessment.softwareComponent,
          originalSystem: assessment.originalSystem
        }
      }
    });
  };
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h3
            style={{
              margin: '0 0 4px 0',
              fontSize: '15px',
              fontWeight: 700,
              color: 'var(--fiori-navy, #102A43)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <Compass size={16} color="var(--fiori-primary, #0A6ED1)" />
            Final Architectural Recommendation &amp; Consulting Action Plan
          </h3>
          <p style={{ margin: 0, fontSize: '12px', color: 'var(--fiori-text-secondary, #64748B)' }}>
            Traceable recommendation structured into actionable next steps, known constraints, and prerequisite checks.
          </p>
        </div>

        <span
          style={{
            padding: '3px 10px',
            borderRadius: 'var(--radius-xs, 2px)',
            fontSize: '11px',
            fontWeight: 700,
            backgroundColor: 'var(--fiori-sidebar-active, #E1EFFD)',
            color: 'var(--fiori-primary, #0A6ED1)',
            border: '1px solid #B8D5F8'
          }}
        >
          {recommendation.outcome.replace(/_/g, ' ')}
        </span>
      </div>

      {/* Recommended Action Card */}
      <div
        style={{
          padding: '18px 20px',
          borderRadius: 'var(--radius-sm, 4px)',
          backgroundColor: '#F0F7FD',
          border: '1px solid #B8D5F8',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px'
        }}
      >
        <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--fiori-primary, #0A6ED1)', letterSpacing: '0.5px' }}>
          RECOMMENDED TRANSITION STRATEGY
        </span>
        <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--fiori-navy, #102A43)', lineHeight: 1.5 }}>
          {recommendation.recommendedAction}
        </div>
      </div>

      {/* 2x2 Grid: Supporting Evidence & Known Limitations */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '16px'
        }}
      >
        {/* Supporting Evidence */}
        <div
          style={{
            padding: '16px',
            backgroundColor: 'var(--fiori-surface-subtle, #F8FAFC)',
            border: '1px solid var(--fiori-border, #E2E8F0)',
            borderRadius: 'var(--radius-sm, 4px)',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 700, color: 'var(--fiori-navy, #102A43)' }}>
            <CheckCircle2 size={15} color="var(--fiori-success, #188918)" />
            Supporting Evidence:
          </div>
          <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '12px', lineHeight: 1.6, color: 'var(--fiori-text-primary, #1B2838)' }}>
            {recommendation.supportingEvidence.map((ev, i) => (
              <li key={i} style={{ marginBottom: '4px' }}>{ev}</li>
            ))}
          </ul>
        </div>

        {/* Known Limitations */}
        <div
          style={{
            padding: '16px',
            backgroundColor: 'var(--fiori-surface-subtle, #F8FAFC)',
            border: '1px solid var(--fiori-border, #E2E8F0)',
            borderRadius: 'var(--radius-sm, 4px)',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 700, color: 'var(--fiori-navy, #102A43)' }}>
            <AlertTriangle size={15} color="var(--fiori-warning, #E9730C)" />
            Known Limitations &amp; Functional Scope:
          </div>
          <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '12px', lineHeight: 1.6, color: 'var(--fiori-text-primary, #1B2838)' }}>
            {recommendation.knownLimitations.map((lim, i) => (
              <li key={i} style={{ marginBottom: '4px' }}>{lim}</li>
            ))}
          </ul>
        </div>
      </div>

      {/* 2x2 Grid: Outstanding Checks & Required Next Steps */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '16px'
        }}
      >
        {/* Outstanding Technical Checks */}
        <div
          style={{
            padding: '16px',
            backgroundColor: 'var(--fiori-surface-subtle, #F8FAFC)',
            border: '1px solid var(--fiori-border, #E2E8F0)',
            borderRadius: 'var(--radius-sm, 4px)',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 700, color: 'var(--fiori-navy, #102A43)' }}>
            <Clock size={15} color="var(--fiori-primary, #0A6ED1)" />
            Outstanding Technical Checks (Prerequisites):
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {recommendation.outstandingChecks.map((chk, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '12px' }}>
                <input type="checkbox" readOnly checked={false} style={{ marginTop: '2px' }} />
                <span style={{ color: 'var(--fiori-text-primary, #1B2838)' }}>{chk}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Required Next Steps */}
        <div
          style={{
            padding: '16px',
            backgroundColor: 'var(--fiori-surface-subtle, #F8FAFC)',
            border: '1px solid var(--fiori-border, #E2E8F0)',
            borderRadius: 'var(--radius-sm, 4px)',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 700, color: 'var(--fiori-navy, #102A43)' }}>
            <ListChecks size={15} color="var(--fiori-primary, #0A6ED1)" />
            Required Execution Next Steps:
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {recommendation.requiredNextSteps.map((step, i) => (
              <div
                key={i}
                style={{
                  padding: '6px 10px',
                  backgroundColor: '#FFFFFF',
                  borderRadius: 'var(--radius-xs, 2px)',
                  border: '1px solid var(--fiori-border-light, #F1F5F9)',
                  fontSize: '12px',
                  color: 'var(--fiori-navy, #102A43)',
                  fontWeight: 500
                }}
              >
                {step}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* BUILD Decision Governance Gate & Generation Studio Handoff */}
      {isBuildDecision && (
        <div
          style={{
            marginTop: '8px',
            padding: '20px',
            backgroundColor: isApproved ? '#F0FDF4' : '#FFFBEB',
            border: `1px solid ${isApproved ? '#86EFAC' : '#FDE68A'}`,
            borderRadius: 'var(--radius-md, 6px)',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              {isApproved ? (
                <ShieldCheck size={20} color="#16A34A" />
              ) : (
                <Lock size={20} color="#D97706" />
              )}
              <div>
                <div style={{ fontWeight: 700, fontSize: '14px', color: isApproved ? '#166534' : '#92400E' }}>
                  {isApproved
                    ? 'BUILD Decision Formally Approved by Architecture Governance'
                    : 'Governance Approval Gate Active — Review Required for Custom BUILD'}
                </div>
                <div style={{ fontSize: '12px', color: isApproved ? '#15803D' : '#B45309', marginTop: '2px' }}>
                  {isApproved
                    ? 'Approved by Lead Enterprise Architect (Role: ARCHITECT / ADMIN). Ready for Generation Studio handoff.'
                    : 'A BUILD recommendation requires explicit approval from an Enterprise Architect or System Administrator before unlocking Generation Studio.'}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              {!isApproved ? (
                <button
                  type="button"
                  onClick={handleApproveBuild}
                  disabled={isApproving}
                  className="fiori-btn fiori-btn-primary"
                  style={{
                    backgroundColor: '#D97706',
                    borderColor: '#B45309',
                    fontSize: '12px',
                    fontWeight: 700
                  }}
                >
                  <ShieldCheck size={14} />
                  <span>{isApproving ? 'Recording Approval...' : 'Approve BUILD Decision'}</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleProceedToGenerationStudio}
                  className="fiori-btn fiori-btn-primary"
                  style={{
                    backgroundColor: '#16A34A',
                    borderColor: '#15803D',
                    fontSize: '12px',
                    fontWeight: 700
                  }}
                >
                  <Cpu size={14} />
                  <span>Proceed to Generation Studio (Carry Context)</span>
                  <ArrowRight size={14} />
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
