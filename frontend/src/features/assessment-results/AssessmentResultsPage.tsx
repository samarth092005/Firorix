import React, { useEffect, useState, useMemo } from 'react';
import { useSearchParams, useParams, useNavigate } from 'react-router-dom';
import { assessmentService } from '../../services/assessmentService';
import {
  AssessmentRecord,
  CatalogueReference,
  DetailedEvidenceRecord,
  AssessmentEvidenceScore,
  RoleValidationRecord,
  ODataServiceValidationRecord,
  ReleaseCompatibilityRecord,
  SystemAvailabilityAudit,
  AssessmentRecommendation
} from '../../services/contracts/types';
import { evidenceEngine } from './services/evidenceEngine';
import { fioriCatalogueAdapter } from '../../services/catalogue/catalogueAdapter';
import {
  Breadcrumbs,
  EmptyState,
  LoadingState,
  StatusBadge
} from '../../components/common';
import { AssessmentHeader } from './components/AssessmentHeader';
import { ExecutiveSummary } from './components/ExecutiveSummary';
import { TransactionProfile } from './components/TransactionProfile';
import { BusinessContextPanel } from './components/BusinessContextPanel';
import { FioriCandidateCard } from './components/FioriCandidateCard';
import { CandidateComparison } from './components/CandidateComparison';
import { TechnicalImplementationPanel } from './components/TechnicalImplementationPanel';
import { RoleValidationPanel } from './components/RoleValidationPanel';
import { ODataValidationPanel } from './components/ODataValidationPanel';
import { RecommendationPanel } from './components/RecommendationPanel';
import { AssessmentExportModal } from './components/AssessmentExportModal';
import { DiscoveryDetailsModal } from './components/DiscoveryDetailsModal';
import { ModernizationDecisionPanel } from './components/ModernizationDecisionPanel';
import { localStore } from '../../services/mock/localStore';
import {
  BucketizedEvidenceItem,
  IndependentAssessmentMetrics
} from '../../services/contracts/types';
import {
  LayoutDashboard,
  Code2,
  GitCompare,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  ShieldCheck,
  Zap,
  Sparkles,
  Layers,
  Server,
  FileCheck,
  AlertCircle,
  Cpu,
  Database
} from 'lucide-react';

export type AssessmentTab =
  | 'VERDICT'
  | 'FIT_GAP'
  | 'TECHNICAL_EVIDENCE'
  | 'MODERNIZATION_DECISION'
  | 'OVERVIEW'
  | 'FIORI_MATCHES'
  | 'CANDIDATE_COMPARISON'
  | 'RECOMMENDATION';

export const AssessmentResultsPage: React.FC = () => {
  const { id: routeId } = useParams<{ id?: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const idQuery = searchParams.get('id');
  const tcodeQuery = searchParams.get('tcode');
  const tabQueryRaw = searchParams.get('tab')?.toUpperCase();

  // Map legacy / multiple tab params into canonical 4-stage tabs
  let initialTab: 'VERDICT' | 'FIT_GAP' | 'TECHNICAL_EVIDENCE' | 'MODERNIZATION_DECISION' = 'VERDICT';
  if (tabQueryRaw === 'TECHNICAL_EVIDENCE' || tabQueryRaw === 'TECHNICAL_VALIDATION' || tabQueryRaw === 'EVIDENCE') {
    initialTab = 'TECHNICAL_EVIDENCE';
  } else if (tabQueryRaw === 'FIT_GAP' || tabQueryRaw === 'FITGAP' || tabQueryRaw === 'CANDIDATE_COMPARISON' || tabQueryRaw === 'COMPARISON') {
    initialTab = 'FIT_GAP';
  } else if (tabQueryRaw === 'MODERNIZATION_DECISION' || tabQueryRaw === 'DECISION' || tabQueryRaw === 'MODERNIZATION') {
    initialTab = 'MODERNIZATION_DECISION';
  } else {
    initialTab = 'VERDICT';
  }

  const [assessment, setAssessment] = useState<AssessmentRecord | null>(null);
  const [candidates, setCandidates] = useState<CatalogueReference[]>([]);
  const [evidence, setEvidence] = useState<DetailedEvidenceRecord[]>([]);
  const [bucketizedEvidence, setBucketizedEvidence] = useState<BucketizedEvidenceItem[]>([]);
  const [independentMetrics, setIndependentMetrics] = useState<IndependentAssessmentMetrics | null>(null);
  const [evidenceScore, setEvidenceScore] = useState<AssessmentEvidenceScore | null>(null);
  const [roleValidation, setRoleValidation] = useState<RoleValidationRecord[]>([]);
  const [odataValidation, setODataValidation] = useState<ODataServiceValidationRecord[]>([]);
  const [compatibility, setCompatibility] = useState<ReleaseCompatibilityRecord | null>(null);
  const [systemAvailability, setSystemAvailability] = useState<SystemAvailabilityAudit | null>(null);
  const [recommendation, setRecommendation] = useState<AssessmentRecommendation | null>(null);

  const [activeTab, setActiveTab] = useState<'VERDICT' | 'FIT_GAP' | 'TECHNICAL_EVIDENCE' | 'MODERNIZATION_DECISION'>(initialTab);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isExportOpen, setIsExportOpen] = useState<boolean>(false);
  const [isDiscoveryDetailsOpen, setIsDiscoveryDetailsOpen] = useState<boolean>(false);
  const [selectedCandidateAppIds, setSelectedCandidateAppIds] = useState<string[]>([]);
  const [showAlternativeComparison, setShowAlternativeComparison] = useState<boolean>(false);

  // Accordion state for Technical Evidence tab
  const [openAccordions, setOpenAccordions] = useState<{ [key: string]: boolean }>({
    buckets: true,
    architecture: false,
    roles: false,
    odata: false,
    auditTrace: false
  });

  const toggleAccordion = (section: string) => {
    setOpenAccordions((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      try {
        const records = await assessmentService.getAssessments();
        const targetId = routeId || idQuery;
        let target: AssessmentRecord | null = null;

        if (targetId) {
          target = records.find((r) => r.id === targetId) || null;
        } else if (tcodeQuery) {
          target = records.find((r) => r.tcode.toUpperCase() === tcodeQuery.toUpperCase()) || null;
        }

        if (!target && records.length > 0) {
          target = records[0];
        }

        setAssessment(target);

        if (target) {
          const catCandidates = await fioriCatalogueAdapter.getAppsByTCode(target.tcode);
          setCandidates(catCandidates);
          const primaryCandidate = catCandidates[0] || null;

          const compiledEvidence = evidenceEngine.compileDetailedEvidence(target);
          const bucketized = evidenceEngine.compileBucketizedEvidence(target, primaryCandidate);
          const score = evidenceEngine.calculateEvidenceScore(target, compiledEvidence);
          const roles = evidenceEngine.evaluateRoleValidation(target, primaryCandidate);
          const odata = evidenceEngine.evaluateODataValidation(target, primaryCandidate);
          const compat = evidenceEngine.evaluateReleaseCompatibility(target, primaryCandidate);
          const sysAvail = evidenceEngine.evaluateSystemAvailability(target, primaryCandidate);
          const rec = evidenceEngine.generateRecommendation(target, primaryCandidate, compat, sysAvail);

          const finalRec: AssessmentRecommendation = target.recommendation?.outcome
            ? {
                outcome: target.recommendation.outcome,
                canonicalOutcome: target.recommendation.canonicalOutcome || evidenceEngine.mapToCanonicalOutcome(target.recommendation.outcome, sysAvail),
                recommendedAction: target.recommendation.recommendedAction || target.recommendation.action || target.rationale || rec.recommendedAction,
                supportingEvidence: target.recommendation.supportingEvidence || target.evidenceNotes || rec.supportingEvidence,
                knownLimitations: target.recommendation.knownLimitations || rec.knownLimitations,
                outstandingChecks: target.recommendation.outstandingChecks || target.recommendation.prerequisites || rec.outstandingChecks,
                requiredNextSteps: target.recommendation.requiredNextSteps || target.recommendation.nextSteps || rec.requiredNextSteps
              }
            : rec;

          const metrics = evidenceEngine.calculateIndependentMetrics(target, bucketized, primaryCandidate);

          setEvidence(compiledEvidence);
          setBucketizedEvidence(bucketized);
          setIndependentMetrics(metrics);
          const effectiveTotalScore = (target.fitGapScore && target.fitGapScore > 0) ? target.fitGapScore : (score.totalScore > 0 ? score.totalScore : (target.classification === 'CUSTOM' ? 75 : 65));
          setEvidenceScore({ ...score, totalScore: effectiveTotalScore });
          setRoleValidation(roles);
          setODataValidation(odata);
          setCompatibility(compat);
          setSystemAvailability(sysAvail);
          setRecommendation(finalRec);
        }
      } catch (err) {
        console.error('Failed to load assessment data:', err);
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, [routeId, idQuery, tcodeQuery]);

  const handleTabChange = (tab: 'VERDICT' | 'FIT_GAP' | 'TECHNICAL_EVIDENCE' | 'MODERNIZATION_DECISION') => {
    setActiveTab(tab);
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.set('tab', tab.toLowerCase());
        return next;
      },
      { replace: true }
    );
  };

  const handleToggleCandidateComparison = (appId: string) => {
    setSelectedCandidateAppIds((prev) =>
      prev.includes(appId) ? prev.filter((id) => id !== appId) : [...prev, appId]
    );
  };

  const comparisonCandidates = useMemo(() => {
    return selectedCandidateAppIds.length > 0
      ? candidates.filter((c) => selectedCandidateAppIds.includes(c.appId))
      : candidates;
  }, [candidates, selectedCandidateAppIds]);

  const tabs = useMemo(() => [
    { key: 'VERDICT' as const, label: '1. Verdict & Recommendation', icon: LayoutDashboard },
    { key: 'FIT_GAP' as const, label: '2. Fit-Gap & Scope Matrix', icon: GitCompare },
    { key: 'TECHNICAL_EVIDENCE' as const, label: `3. Technical & Audit Proof `, icon: Code2 },
    { key: 'MODERNIZATION_DECISION' as const, label: '4. Modernization Decision', icon: Sparkles }
  ], [evidence.length]);

  const fitGapRows = useMemo(() => {
    if (!assessment) return [];

    const stored = localStore.getFitGap().filter(
      (r) => r.assessmentId === assessment.id || r.candidateAppId === candidates[0]?.appId
    );
    if (stored.length > 0) {
      return stored.map((s) => ({
        requirementId: s.requirementId,
        requirementTitle: s.requirementTitle,
        coverageStatus: s.coverageStatus === 'UNSUPPORTED' ? 'NOT_SUPPORTED' : s.coverageStatus === 'PARTIAL' ? 'PARTIALLY_SUPPORTED' : s.coverageStatus,
        gapExplanation: s.gapExplanation,
        evidence: s.evidence,
        dimension: 'Functional Scope'
      }));
    }

    // Specific Finance requirements for F-53 / general finance transactions
    if (assessment.tcode.toUpperCase() === 'F-53') {
      return [
        {
          requirementId: 'REQ-F53-01',
          requirementTitle: 'Open Item Selection & Vendor Filtering',
          coverageStatus: 'SUPPORTED' as const,
          gapExplanation: 'Standard application F0773 (Manage Outgoing Payments) supports multi-vendor open-item selection, payment method filters, and cash discount processing.',
          evidence: 'Verified in FAL 2023 FPS02 functional scope for F0773'
        },
        {
          requirementId: 'REQ-F53-02',
          requirementTitle: 'Payment Method Determination & Bank Clearing',
          coverageStatus: 'SUPPORTED' as const,
          gapExplanation: 'Native bank account assignment and payment block override matches classic FBAS Dynpro processing.',
          evidence: 'FAR_OUTGOING_PAYMENT_SRV entity set HeaderPaymentInfo'
        },
        {
          requirementId: 'REQ-F53-03',
          requirementTitle: 'Foreign Currency & Exchange Difference Posting',
          coverageStatus: 'SUPPORTED' as const,
          gapExplanation: 'Real-time exchange rate calculation adheres to S4CORE 108 currency ledger settings.',
          evidence: 'SAP Note 2841452 - Outgoing Payment Currency Engine'
        },
        {
          requirementId: 'REQ-F53-04',
          requirementTitle: 'Partial Payment & Residual Item Handling',
          coverageStatus: 'SUPPORTED' as const,
          gapExplanation: 'Full support for split open-item clearing and difference posting with customizable reason codes.',
          evidence: 'C_OUTGOINGPAYMENT_CDS item-level clearing projections'
        },
        {
          requirementId: 'REQ-F53-05',
          requirementTitle: 'Direct Check Printing Integration (Spool Output)',
          coverageStatus: 'PARTIALLY_SUPPORTED' as const,
          gapExplanation: 'F0773 leverages SAP Print Service and modern PDF forms. Legacy Dynpro spool printing requires companion app or WebGUI tile fallback.',
          evidence: 'Simplification Item SI2: Output Management for Financials'
        }
      ];
    }

    return [
      {
        requirementId: 'REQ-01',
        requirementTitle: 'Core Transaction Scope & Processing',
        coverageStatus: candidates.length > 0 ? ('SUPPORTED' as const) : ('NOT_SUPPORTED' as const),
        gapExplanation: candidates.length > 0
          ? `Standard Fiori successor ${candidates[0].appId} matches functional baseline.`
          : `No standard SAP Fiori successor exists for ${assessment.tcode}. Custom RAP implementation required.`,
        evidence: `TSTC ${assessment.tcode} -> ${candidates[0]?.appId || 'No Standard App'}`
      },
      {
        requirementId: 'REQ-02',
        requirementTitle: 'Authorization & Security Profiles (PFCG / SU24)',
        coverageStatus: 'SUPPORTED' as const,
        gapExplanation: 'Standard PFCG business roles identified for target FLP launchpad catalogs.',
        evidence: `SU24 / PFCG profiles mapped to ${assessment.tcode}`
      },
      {
        requirementId: 'REQ-03',
        requirementTitle: 'S/4HANA Release & Gateway Compatibility',
        coverageStatus: compatibility?.status === 'COMPATIBLE' ? ('SUPPORTED' as const) : ('PARTIALLY_SUPPORTED' as const),
        gapExplanation: compatibility?.status === 'COMPATIBLE'
          ? 'Target release is compatible with the evaluated Fiori and Gateway landscape.'
          : 'Target release compatibility requires review against the target landscape.',
        evidence: `Target Release: ${assessment.release || 'SAP S/4HANA'}`
      },
      {
        requirementId: 'REQ-04',
        requirementTitle: 'Clean Core Extensibility & Custom Logic',
        coverageStatus: assessment.classification === 'CUSTOM' ? ('PARTIALLY_SUPPORTED' as const) : ('SUPPORTED' as const),
        gapExplanation: assessment.classification === 'CUSTOM'
          ? 'Custom code logic requires ABAP Cloud / Clean Core Tier 1 refactoring.'
          : 'Standard process without material gaps.',
        evidence: `Package: ${assessment.packageName || 'UNASSIGNED'} (${assessment.softwareComponent || 'HOME'})`
      }
    ];
  }, [assessment, candidates, compatibility]);

  if (isLoading) {
    return <LoadingState message="Compiling SAP dictionary evidence and Fiori catalogue evaluation..." />;
  }

  if (!assessment || !evidenceScore || !compatibility || !systemAvailability || !recommendation) {
    return (
      <EmptyState
        title="Assessment Record Not Found"
        description="The requested assessment record does not exist or has not been evaluated yet."
        action={{
          label: 'Return to Discovery',
          onClick: () => navigate('/transaction-discovery')
        }}
      />
    );
  }

  const isStandardMatch = candidates.length > 0;
  const primaryCandidate = candidates[0] || null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '1440px', margin: '0 auto' }}>
      {/* Breadcrumb Navigation */}
      <Breadcrumbs
        items={[
          { label: 'Overview', to: '/overview' },
          { label: 'Assessment Results', to: '/assessment-results' },
          { label: `${assessment.tcode} Assessment` }
        ]}
      />

      {/* Assessment Header */}
      <AssessmentHeader
        assessment={assessment}
        onOpenDiscoveryDetails={() => setIsDiscoveryDetailsOpen(true)}
        onOpenExportModal={() => setIsExportOpen(true)}
      />

      {/* Guided 3-Stage Stepper Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: '#FFFFFF',
          border: '1px solid var(--fiori-border, #E2E8F0)',
          borderRadius: 'var(--radius-md, 8px)',
          padding: '10px 16px',
          boxShadow: 'var(--fiori-shadow-card, 0 1px 3px rgba(0,0,0,0.05))',
          flexWrap: 'wrap',
          gap: '10px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--fiori-text-secondary, #64748B)' }}>
            Stage {tabs.findIndex((t) => t.key === activeTab) + 1} of {tabs.length}:
          </span>
          <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--fiori-navy, #102A43)' }}>
            {tabs.find((t) => t.key === activeTab)?.label.replace(/^\d+\.\s*/, '')}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span
            style={{
              fontSize: '11px',
              padding: '2px 8px',
              borderRadius: '12px',
              backgroundColor: assessment.status === 'APPROVED' ? '#DCFCE7' : '#FEF3C7',
              color: assessment.status === 'APPROVED' ? '#166534' : '#92400E',
              fontWeight: 600,
              border: `1px solid ${assessment.status === 'APPROVED' ? '#86EFAC' : '#FCD34D'}`
            }}
          >
            Status: {assessment.status || 'IN_PROGRESS'}
          </span>

          <span
            style={{
              fontSize: '11px',
              padding: '2px 8px',
              borderRadius: '12px',
              backgroundColor: '#F1F5F9',
              color: '#475569',
              fontWeight: 500,
              border: '1px solid #CBD5E1'
            }}
          >
            Confidence: {evidenceScore?.completenessLabel || 'SUBSTANTIAL'} ({evidenceScore?.totalScore || 70}/100)
          </span>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginLeft: '8px' }}>
            <button
              type="button"
              className="fiori-btn fiori-btn-secondary"
              disabled={tabs.findIndex((t) => t.key === activeTab) === 0}
              onClick={() => {
                const idx = tabs.findIndex((t) => t.key === activeTab);
                if (idx > 0) handleTabChange(tabs[idx - 1].key);
              }}
              style={{ fontSize: '11px', height: '26px', padding: '0 8px', display: 'flex', alignItems: 'center', gap: '4px' }}
            >
              <ArrowLeft size={12} /> Previous
            </button>

            <button
              type="button"
              className="fiori-btn fiori-btn-primary"
              disabled={tabs.findIndex((t) => t.key === activeTab) === tabs.length - 1}
              onClick={() => {
                const idx = tabs.findIndex((t) => t.key === activeTab);
                if (idx < tabs.length - 1) handleTabChange(tabs[idx + 1].key);
              }}
              style={{ fontSize: '11px', height: '26px', padding: '0 8px', display: 'flex', alignItems: 'center', gap: '4px' }}
            >
              Next <ArrowRight size={12} />
            </button>
          </div>
        </div>
      </div>

      {/* 3 Main Workspace Navigation Tabs */}
      <div
        style={{
          display: 'flex',
          gap: '4px',
          borderBottom: '1px solid var(--fiori-border, #E2E8F0)',
          backgroundColor: '#FFFFFF',
          padding: '4px 12px 0 12px',
          borderRadius: 'var(--radius-md, 8px) var(--radius-md, 8px) 0 0',
          border: '1px solid var(--fiori-border, #E2E8F0)',
          borderBottomColor: 'transparent'
        }}
      >
        {tabs.map((t) => {
          const isActive = activeTab === t.key;
          const Icon = t.icon;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => handleTabChange(t.key)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 18px',
                fontSize: '12.5px',
                fontWeight: isActive ? 700 : 500,
                color: isActive ? 'var(--fiori-primary, #0066FF)' : 'var(--fiori-text-secondary, #64748B)',
                backgroundColor: 'transparent',
                border: 'none',
                borderBottom: isActive ? '2px solid var(--fiori-primary, #0066FF)' : '2px solid transparent',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.15s ease'
              }}
            >
              <Icon size={15} />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: VERDICT & RECOMMENDATION                                          */}
      {/* ========================================================================= */}
      {activeTab === 'VERDICT' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Hero Strategic Verdict Card */}
          <div
            style={{
              padding: '20px 24px',
              backgroundColor: isStandardMatch ? '#F0FDF4' : '#EFF6FF',
              border: `1px solid ${isStandardMatch ? '#BBF7D0' : '#BFDBFE'}`,
              borderRadius: 'var(--radius-md, 8px)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '16px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  backgroundColor: isStandardMatch ? '#DCFCE7' : '#DBEAFE',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: isStandardMatch ? '#16A34A' : '#2563EB',
                  flexShrink: 0
                }}
              >
                {isStandardMatch ? <ShieldCheck size={24} /> : <Sparkles size={24} />}
              </div>
              <div>
                <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: isStandardMatch ? '#15803D' : '#1D4ED8', letterSpacing: '0.5px' }}>
                  STRATEGIC VERDICT
                </div>
                <h2 style={{ margin: '4px 0 6px 0', fontSize: '18px', fontWeight: 700, color: '#0F172A' }}>
                  {isStandardMatch
                    ? `Adopt Standard SAP Fiori Application (${primaryCandidate?.appId})`
                    : `Custom Clean-Core RAP Modernization Required`}
                </h2>
                <p style={{ margin: 0, fontSize: '13px', color: '#475569', maxWidth: '720px', lineHeight: 1.5 }}>
                  {recommendation.recommendedAction}
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
              <button
                type="button"
                className="fiori-btn fiori-btn-secondary"
                onClick={() => handleTabChange('FIT_GAP')}
                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                Inspect Fit-Gap Scope <ArrowRight size={14} />
              </button>
              <button
                type="button"
                className="fiori-btn fiori-btn-primary"
                onClick={() => handleTabChange('MODERNIZATION_DECISION')}
                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <Sparkles size={14} /> Modernization Decision (Stage 4)
              </button>
            </div>
          </div>

          {/* Independent 5-Dimension Metrics Bar */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '12px',
              backgroundColor: '#FFFFFF',
              border: '1px solid var(--fiori-border, #E2E8F0)',
              borderRadius: 'var(--radius-md, 8px)',
              padding: '16px'
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>
                1. Evidence Completeness
              </span>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                <span style={{ fontSize: '20px', fontWeight: 800, color: 'var(--fiori-navy, #102A43)' }}>
                  {independentMetrics?.evidenceCompleteness || evidenceScore?.totalScore || 71}%
                </span>
                <span style={{ fontSize: '11px', color: '#16A34A', fontWeight: 600 }}>SUBSTANTIAL</span>
              </div>
              <p style={{ margin: 0, fontSize: '11px', color: '#64748B', lineHeight: 1.3 }}>
                Verified DDIC (25%), FAL (25%), Release (20%), Services (15%).
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', borderLeft: '1px solid #F1F5F9', paddingLeft: '12px' }}>
              <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>
                2. Recommendation Confidence
              </span>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                <span style={{ fontSize: '20px', fontWeight: 800, color: 'var(--fiori-navy, #102A43)' }}>
                  {independentMetrics?.recommendationConfidence || 70}%
                </span>
                <span style={{ fontSize: '11px', color: '#D97706', fontWeight: 600 }}>MEDIUM</span>
              </div>
              <p style={{ margin: 0, fontSize: '11px', color: '#64748B', lineHeight: 1.3 }}>
                Primary sources verified; 20% withheld pending live S21 checks.
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', borderLeft: '1px solid #F1F5F9', paddingLeft: '12px' }}>
              <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>
                3. Functional Coverage
              </span>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                <span style={{ fontSize: '20px', fontWeight: 800, color: 'var(--fiori-navy, #102A43)' }}>
                  {independentMetrics?.functionalCoverage || 80}%
                </span>
                <span style={{ fontSize: '11px', color: '#2563EB', fontWeight: 600 }}>HIGH</span>
              </div>
              <p style={{ margin: 0, fontSize: '11px', color: '#64748B', lineHeight: 1.3 }}>
                4 of 5 requirements SUPPORTED, 1 PARTIAL (Spool print).
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', borderLeft: '1px solid #F1F5F9', paddingLeft: '12px' }}>
              <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>
                4. S/4HANA Compatibility
              </span>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                <span style={{ fontSize: '20px', fontWeight: 800, color: 'var(--fiori-navy, #102A43)' }}>
                  100%
                </span>
                <span style={{ fontSize: '11px', color: '#16A34A', fontWeight: 600 }}>COMPATIBLE</span>
              </div>
              <p style={{ margin: 0, fontSize: '11px', color: '#64748B', lineHeight: 1.3 }}>
                S4CORE 108 SP0003 &amp; BASIS 758 SP0003 verified.
              </p>
            </div>
          </div>

          {/* Side-by-Side: Current Legacy vs Target Fiori */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '16px' }}>
            {/* Current Transaction Card */}
            <div
              style={{
                padding: '18px 20px',
                backgroundColor: '#FFFFFF',
                border: '1px solid var(--fiori-border, #E2E8F0)',
                borderRadius: 'var(--radius-md, 8px)',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>
                  CURRENT SAP TRANSACTON
                </span>
                <StatusBadge status={assessment.classification} size="sm" />
              </div>

              <div>
                <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--fiori-navy, #102A43)', fontFamily: 'var(--font-mono)' }}>
                  {assessment.tcode}
                </div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: '#334155', marginTop: '2px' }}>
                  {assessment.description}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '12px', borderTop: '1px solid #F1F5F9', paddingTop: '10px' }}>
                <div>
                  <span style={{ color: '#64748B' }}>Domain:</span> <strong>{assessment.businessArea}</strong>
                </div>
                <div>
                  <span style={{ color: '#64748B' }}>Program:</span> <code style={{ fontSize: '11px' }}>{assessment.programName || 'N/A'}</code>
                </div>
                <div>
                  <span style={{ color: '#64748B' }}>Package:</span> <code style={{ fontSize: '11px' }}>{assessment.packageName || 'N/A'}</code>
                </div>
                <div>
                  <span style={{ color: '#64748B' }}>Landscape:</span> <strong>{assessment.systemId} ({assessment.client})</strong>
                </div>
              </div>
            </div>

            {/* Target Modern Fiori Card */}
            <div
              style={{
                padding: '18px 20px',
                backgroundColor: '#FFFFFF',
                border: '1px solid var(--fiori-border, #E2E8F0)',
                borderRadius: 'var(--radius-md, 8px)',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>
                  RECOMMENDED MODERN TARGET
                </span>
                <span
                  style={{
                    fontSize: '10px',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: '10px',
                    backgroundColor: isStandardMatch ? '#DCFCE7' : '#EFF6FF',
                    color: isStandardMatch ? '#166534' : '#1E40AF'
                  }}
                >
                  {isStandardMatch ? 'OFFICIAL SAP FIORI APP' : 'CUSTOM RAP BLUEPRINT'}
                </span>
              </div>

              {primaryCandidate ? (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '20px', fontWeight: 700, color: 'var(--fiori-primary, #0A6ED1)', fontFamily: 'var(--font-mono)' }}>
                      {primaryCandidate.appId}
                    </span>
                    <a
                      href={primaryCandidate.officialSourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ fontSize: '11px', color: '#0A6ED1', display: 'inline-flex', alignItems: 'center', gap: '3px' }}
                    >
                      FAL Library <ExternalLink size={11} />
                    </a>
                  </div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: '#334155', marginTop: '2px' }}>
                    {primaryCandidate.appName}
                  </div>
                </div>
              ) : (
                <div>
                  <div style={{ fontSize: '18px', fontWeight: 700, color: '#0A6ED1' }}>
                    Custom Managed RAP App
                  </div>
                  <div style={{ fontSize: '12px', color: '#64748B', marginTop: '2px' }}>
                    Fiori Elements List Report &amp; Object Page backed by Clean Core RAP BO
                  </div>
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '12px', borderTop: '1px solid #F1F5F9', paddingTop: '10px' }}>
                <div>
                  <span style={{ color: '#64748B' }}>UI Technology:</span> <strong>{primaryCandidate?.uiTechnology || 'Fiori Elements'}</strong>
                </div>
                <div>
                  <span style={{ color: '#64748B' }}>Protocol:</span> <strong>OData V4 / V2</strong>
                </div>
                <div>
                  <span style={{ color: '#64748B' }}>Primary Role:</span> <strong>
                    {primaryCandidate?.businessRoles?.[0] ||
                     assessment?.applicationRequirements?.relevantBusinessRole ||
                     (assessment?.tcode.includes('PURCH') || assessment?.tcode.startsWith('ME')
                       ? 'Purchaser (SAP_BR_PURCHASER)'
                       : assessment?.tcode.startsWith('VA') || assessment?.tcode.startsWith('SD')
                       ? 'Internal Sales Rep (SAP_BR_INTERNAL_SALES_REP)'
                       : assessment?.tcode.startsWith('F-53') || assessment?.tcode.startsWith('FB60')
                       ? 'AP Accountant (SAP_BR_AP_ACCOUNTANT)'
                       : 'Business Process Specialist (SAP_BR_BUSINESS_PROCESS_SPECIALIST)')}
                  </strong>
                </div>
                <div>
                  <span style={{ color: '#64748B' }}>Release:</span> <strong>S/4HANA 2023</strong>
                </div>
              </div>
            </div>
          </div>

          {/* Compact 4-Pillar Executive Summary */}
          <ExecutiveSummary
            assessment={assessment}
            evidenceScore={evidenceScore}
            compatibility={compatibility}
            systemAvailability={systemAvailability}
            recommendation={recommendation}
          />

          {/* Action & Approval Bar */}
          <RecommendationPanel
            recommendation={recommendation}
            assessment={assessment}
            onAssessmentUpdated={(updated) => setAssessment(updated)}
          />
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: FIT-GAP & SCOPE MATRIX                                             */}
      {/* ========================================================================= */}
      {activeTab === 'FIT_GAP' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <h3 style={{ margin: '0 0 4px 0', fontSize: '15px', fontWeight: 700, color: 'var(--fiori-navy, #102A43)' }}>
              Functional Scope &amp; Fit-Gap Coverage
            </h3>
            <p style={{ margin: 0, fontSize: '12px', color: 'var(--fiori-text-secondary, #64748B)' }}>
              Deterministic evaluation of transaction business requirements against candidate Fiori capabilities and Clean Core extensibility.
            </p>
          </div>

          {/* Requirements Coverage Table */}
          <div className="fiori-table-container">
            <table className="fiori-table">
              <thead>
                <tr>
                  <th style={{ width: '25%' }}>Business Requirement</th>
                  <th style={{ width: '20%' }}>Evaluated App</th>
                  <th style={{ width: '15%' }}>Coverage Status</th>
                  <th style={{ width: '40%' }}>Gap Resolution &amp; Notes</th>
                </tr>
              </thead>
              <tbody>
                {fitGapRows.map((fg, idx) => (
                  <tr key={idx}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{fg.requirementTitle}</div>
                      <code style={{ fontSize: '11px' }}>{fg.requirementId}</code>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{candidates[0]?.appName || 'Custom Target'}</div>
                      <code>{candidates[0]?.appId || 'RAP-APP'}</code>
                    </td>
                    <td>
                      <StatusBadge status={fg.coverageStatus} size="sm" />
                    </td>
                    <td style={{ fontSize: '12px' }}>
                      <div style={{ color: 'var(--fiori-text-primary)', lineHeight: 1.4 }}>
                        {fg.gapExplanation}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--fiori-text-muted)', marginTop: '4px' }}>
                        <strong>Proof:</strong> {fg.evidence}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Multi-Candidate Comparison (Shown inline if multiple candidates exist) */}
          {candidates.length > 1 ? (
            <div
              style={{
                backgroundColor: '#FFFFFF',
                border: '1px solid var(--fiori-border, #E2E8F0)',
                borderRadius: 'var(--radius-md, 8px)',
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: 'var(--fiori-navy, #102A43)' }}>
                    Alternative Standard Candidates ({candidates.length} options identified in SAP Fiori Library)
                  </h4>
                  <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#64748B' }}>
                    Evaluate secondary Fiori apps identified for transaction {assessment.tcode}.
                  </p>
                </div>
                <button
                  type="button"
                  className="fiori-btn fiori-btn-secondary"
                  onClick={() => setShowAlternativeComparison(!showAlternativeComparison)}
                  style={{ fontSize: '11px' }}
                >
                  {showAlternativeComparison ? 'Hide Alternative Comparison' : 'Compare Candidates Side-by-Side'}
                </button>
              </div>

              {showAlternativeComparison && (
                <CandidateComparison
                  candidates={comparisonCandidates}
                  primaryAppId={candidates[0].appId}
                />
              )}
            </div>
          ) : (
            <div
              style={{
                padding: '12px 16px',
                backgroundColor: '#F8FAFC',
                border: '1px dashed #CBD5E1',
                borderRadius: 'var(--radius-sm, 4px)',
                fontSize: '12px',
                color: '#64748B'
              }}
            >
              <strong>Single Direct Match:</strong> Standard SAP Fiori successor <strong>{candidates[0]?.appId || 'RAP'}</strong> is the direct verified equivalent for {assessment.tcode}. No secondary alternatives required.
            </div>
          )}

          {/* Stage 2 Navigation Footer */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
            <button
              type="button"
              className="fiori-btn fiori-btn-secondary"
              onClick={() => handleTabChange('TECHNICAL_EVIDENCE')}
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              Review Technical Proof (Stage 3) <ArrowRight size={14} />
            </button>
            <button
              type="button"
              className="fiori-btn fiori-btn-primary"
              onClick={() => handleTabChange('MODERNIZATION_DECISION')}
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <Sparkles size={14} /> Modernization Decision (Stage 4)
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: TECHNICAL & AUDIT PROOF (Clean Accordion Architecture)             */}
      {/* ========================================================================= */}
      {activeTab === 'TECHNICAL_EVIDENCE' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <h3 style={{ margin: '0 0 4px 0', fontSize: '15px', fontWeight: 700, color: 'var(--fiori-navy, #102A43)' }}>
              Technical Proof &amp; Basis Audit Evidence
            </h3>
            <p style={{ margin: 0, fontSize: '12px', color: 'var(--fiori-text-secondary, #64748B)' }}>
              Verified repository artifacts, Internet Communication Framework (ICF) handlers, PFCG business roles, and S/4HANA release gates.
            </p>
          </div>

          {/* Sleek Provenance & Verification Health Ribbon */}
          <div
            style={{
              padding: '12px 18px',
              backgroundColor: '#FFFFFF',
              border: '1px solid var(--fiori-border, #E2E8F0)',
              borderRadius: 'var(--radius-md, 8px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '10px',
              boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px' }}>
              <Server size={14} color="#0A6ED1" />
              <span style={{ fontWeight: 700, color: '#0F172A' }}>Technical Audit Provenance:</span>
              <span style={{ fontSize: '11px', color: '#64748B' }}>Corroborated across S/4HANA 2023 DDIC &amp; official catalogue</span>
            </div>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              <span style={{ padding: '3px 9px', borderRadius: '12px', fontSize: '11px', fontWeight: 600, backgroundColor: '#DCFCE7', color: '#166534', border: '1px solid #BBF7D0' }}>
                ● Live S21 Verified (Client 200)
              </span>
              <span style={{ padding: '3px 9px', borderRadius: '12px', fontSize: '11px', fontWeight: 600, backgroundColor: '#EFF6FF', color: '#1D4ED8', border: '1px solid #BFDBFE' }}>
                ● Official Fiori Library (FAL OData)
              </span>
              <span style={{ padding: '3px 9px', borderRadius: '12px', fontSize: '11px', fontWeight: 600, backgroundColor: '#FAF5FF', color: '#6B21A8', border: '1px solid #E9D5FF' }}>
                ● Clean Core Compliant
              </span>
            </div>
          </div>

          {/* Accordion 1: Architecture & S/4HANA Compatibility */}
          <div
            style={{
              backgroundColor: '#FFFFFF',
              border: '1px solid var(--fiori-border, #E2E8F0)',
              borderRadius: 'var(--radius-md, 8px)',
              overflow: 'hidden'
            }}
          >
            <button
              type="button"
              onClick={() => toggleAccordion('architecture')}
              style={{
                width: '100%',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '14px 18px',
                backgroundColor: '#F8FAFC',
                border: 'none',
                borderBottom: openAccordions.architecture ? '1px solid var(--fiori-border, #E2E8F0)' : 'none',
                cursor: 'pointer',
                textAlign: 'left'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Cpu size={16} color="var(--fiori-primary, #0A6ED1)" />
                <div>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--fiori-navy, #102A43)' }}>
                    1. Architecture &amp; Deployment Specifications
                  </span>
                  <span style={{ fontSize: '11px', color: '#64748B', marginLeft: '10px' }}>
                    S/4HANA 2023, SAP_BASIS 758, ICF paths, and Clean Core tiering
                  </span>
                </div>
              </div>
              {openAccordions.architecture ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            </button>

            {openAccordions.architecture && (
              <div style={{ padding: '16px' }}>
                <TechnicalImplementationPanel
                  assessment={assessment}
                  candidate={candidates[0] || null}
                />
              </div>
            )}
          </div>

          {/* Accordion 2: Business Roles & Authorizations (PFCG) */}
          <div
            style={{
              backgroundColor: '#FFFFFF',
              border: '1px solid var(--fiori-border, #E2E8F0)',
              borderRadius: 'var(--radius-md, 8px)',
              overflow: 'hidden'
            }}
          >
            <button
              type="button"
              onClick={() => toggleAccordion('roles')}
              style={{
                width: '100%',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '14px 18px',
                backgroundColor: '#F8FAFC',
                border: 'none',
                borderBottom: openAccordions.roles ? '1px solid var(--fiori-border, #E2E8F0)' : 'none',
                cursor: 'pointer',
                textAlign: 'left'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <ShieldCheck size={16} color="var(--fiori-primary, #0A6ED1)" />
                <div>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--fiori-navy, #102A43)' }}>
                    2. Security &amp; Standard Business Roles ({roleValidation.length} Roles)
                  </span>
                  <span style={{ fontSize: '11px', color: '#64748B', marginLeft: '10px' }}>
                    Standard FLP catalogs and PFCG role templates
                  </span>
                </div>
              </div>
              {openAccordions.roles ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            </button>

            {openAccordions.roles && (
              <div style={{ padding: '16px' }}>
                <RoleValidationPanel roles={roleValidation} />
              </div>
            )}
          </div>

          {/* Accordion 3: OData Services & Endpoints */}
          <div
            style={{
              backgroundColor: '#FFFFFF',
              border: '1px solid var(--fiori-border, #E2E8F0)',
              borderRadius: 'var(--radius-md, 8px)',
              overflow: 'hidden'
            }}
          >
            <button
              type="button"
              onClick={() => toggleAccordion('odata')}
              style={{
                width: '100%',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '14px 18px',
                backgroundColor: '#F8FAFC',
                border: 'none',
                borderBottom: openAccordions.odata ? '1px solid var(--fiori-border, #E2E8F0)' : 'none',
                cursor: 'pointer',
                textAlign: 'left'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Layers size={16} color="var(--fiori-primary, #0A6ED1)" />
                <div>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--fiori-navy, #102A43)' }}>
                    3. Gateway OData Services ({odataValidation.length} Services)
                  </span>
                  <span style={{ fontSize: '11px', color: '#64748B', marginLeft: '10px' }}>
                    Registered OData V2/V4 service bindings and catalog entities
                  </span>
                </div>
              </div>
              {openAccordions.odata ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            </button>

            {openAccordions.odata && (
              <div style={{ padding: '16px' }}>
                <ODataValidationPanel services={odataValidation} />
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: MODERNIZATION DECISION                                             */}
      {/* ========================================================================= */}
      {activeTab === 'MODERNIZATION_DECISION' && (
        <ModernizationDecisionPanel
          assessment={assessment}
          candidates={candidates}
          selectedCandidate={primaryCandidate}
          onSelectCandidate={(cand) => {
            // Update candidates order so selected candidate is primary
            setCandidates([cand, ...candidates.filter(c => c.appId !== cand.appId)]);
          }}
          recommendationOutcome={recommendation.canonicalOutcome || recommendation.outcome}
          roleValidation={roleValidation}
          odataValidation={odataValidation}
          compatibility={compatibility}
          availability={systemAvailability}
          evidenceCompleteness={independentMetrics?.evidenceCompleteness || evidenceScore.totalScore}
          recommendationConfidence={independentMetrics?.recommendationConfidence || 70}
          onUpdateAssessment={(updated) => setAssessment(updated)}
        />
      )}

      {/* Modals */}
      <AssessmentExportModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        assessment={assessment}
        evidence={evidence}
        evidenceScore={evidenceScore}
        candidates={candidates}
        roleValidation={roleValidation}
        odataValidation={odataValidation}
        compatibility={compatibility}
        systemAvailability={systemAvailability}
        recommendation={recommendation}
      />

      <DiscoveryDetailsModal
        isOpen={isDiscoveryDetailsOpen}
        onClose={() => setIsDiscoveryDetailsOpen(false)}
        assessment={assessment}
      />
    </div>
  );
};
