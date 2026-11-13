import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AssessmentRecord,
  CatalogueReference,
  RecommendationOutcome,
  GenerationHandoffPayload,
  RoleValidationRecord,
  ODataServiceValidationRecord,
  ReleaseCompatibilityRecord,
  SystemAvailabilityAudit,
  ModernizationDecisionRecord
} from '../../../services/contracts/types';
import { assessmentService } from '../../../services/assessmentService';
import {
  BookmarkCheck,
  Sliders,
  Layers,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ShieldAlert,
  ExternalLink,
  Save,
  CheckSquare,
  FileCode2,
  Cpu,
  Copy,
  Check,
  Clock,
  ShieldCheck,
  Server,
  Network,
  KeyRound,
  LayoutGrid
} from 'lucide-react';
import { ArchitectSignOffSection } from './ArchitectSignOffSection';

interface ModernizationDecisionPanelProps {
  assessment: AssessmentRecord;
  candidates: CatalogueReference[];
  selectedCandidate: CatalogueReference | null;
  onSelectCandidate: (candidate: CatalogueReference) => void;
  recommendationOutcome: RecommendationOutcome;
  roleValidation: RoleValidationRecord[];
  odataValidation: ODataServiceValidationRecord[];
  compatibility: ReleaseCompatibilityRecord;
  availability: SystemAvailabilityAudit;
  evidenceCompleteness: number;
  recommendationConfidence: number;
  onUpdateAssessment?: (updated: AssessmentRecord) => void;
}

export const ModernizationDecisionPanel: React.FC<ModernizationDecisionPanelProps> = ({
  assessment,
  candidates,
  selectedCandidate,
  onSelectCandidate,
  recommendationOutcome,
  roleValidation,
  odataValidation,
  compatibility,
  availability,
  evidenceCompleteness,
  recommendationConfidence,
  onUpdateAssessment
}) => {
  const navigate = useNavigate();

  // Normalize outcome to canonical values
  const canonicalOutcome: 'ADOPT' | 'CONFIGURE' | 'EXTEND' | 'BUILD' | 'INSUFFICIENT_EVIDENCE' | 'PENDING_VERIFICATION' =
    recommendationOutcome === 'ADOPT' || recommendationOutcome === 'USE_STANDARD_FIORI_SUCCESSOR'
      ? (availability?.serviceRegistrationStatus === 'PENDING_BASIS_CHECK' || availability?.roleAssignmentStatus === 'PENDING_VERIFICATION' ? 'CONFIGURE' : 'ADOPT')
      : recommendationOutcome === 'CONFIGURE' || recommendationOutcome === 'USE_CLASSIC_TRANSACTION_LAUNCHPAD'
      ? 'CONFIGURE'
      : recommendationOutcome === 'EXTEND' || recommendationOutcome === 'EVALUATE_FUNCTIONAL_ALTERNATIVE'
      ? 'EXTEND'
      : recommendationOutcome === 'BUILD' || recommendationOutcome === 'TECHNICAL_ANALYSIS_REQUIRED'
      ? 'BUILD'
      : recommendationOutcome === 'PENDING_VERIFICATION' || recommendationOutcome === 'INVESTIGATE_CATALOGUE_INFO'
      ? 'PENDING_VERIFICATION'
      : 'INSUFFICIENT_EVIDENCE';

  // Sub-tabs in Modernization Workspace
  const [activeTab, setActiveTab] = useState<'ADD_FOUND' | 'CONFIGURE_ADOPT' | 'EXTEND' | 'BUILD_STUDIO'>(
    canonicalOutcome === 'BUILD'
      ? 'BUILD_STUDIO'
      : canonicalOutcome === 'EXTEND'
      ? 'EXTEND'
      : canonicalOutcome === 'CONFIGURE'
      ? 'CONFIGURE_ADOPT'
      : 'ADD_FOUND'
  );

  // Dynamic Resolution of Target Artifacts for the Current Transaction
  const resolvedRole =
    roleValidation?.[0]?.roleName ||
    selectedCandidate?.businessRoles?.[0] ||
    assessment.matchingFioriApp?.businessRoles?.[0] ||
    (assessment.tcode === 'ME21N' ? 'SAP_BR_PURCHASER' :
     assessment.tcode === 'VA01' ? 'SAP_BR_INTERNAL_SALES_REP' :
     assessment.tcode === 'FB03' ? 'SAP_BR_GL_ACCOUNTANT' :
     assessment.tcode === 'FB50' ? 'SAP_BR_GL_ACCOUNTANT' :
     assessment.tcode === 'F-28' ? 'SAP_BR_AR_ACCOUNTANT' :
     'SAP_BR_AP_ACCOUNTANT');

  const resolvedRoleStatus =
    roleValidation?.[0]?.roleAvailabilityStatus ||
    (availability?.roleAssignmentStatus === 'ASSIGNED' ? 'READY_FOR_USE' : 'REQUIRES_PFCG_ROLE_ASSIGNMENT');

  const resolvedODataService =
    odataValidation?.[0]?.serviceName ||
    selectedCandidate?.odataServices?.[0] ||
    assessment.matchingFioriApp?.odataServices?.[0] ||
    (assessment.tcode === 'ME21N' ? 'MM_PURCHASE_ORDER_PROCESS_SRV' :
     assessment.tcode === 'VA01' ? 'SD_F1873_SO_MANAGE_SRV' :
     assessment.tcode === 'FB03' ? 'FAR_MANAGE_JOURNAL_ENTRIES_SRV' :
     assessment.tcode === 'FB50' ? 'FAR_MANAGE_JOURNAL_ENTRIES_SRV' :
     assessment.tcode === 'F-28' ? 'FAP_POST_INCOMING_PAYMENTS_SRV' :
     'FAR_OUTGOING_PAYMENT_SRV');

  const resolvedODataStatus =
    odataValidation?.[0]?.registrationStatus ||
    (availability?.serviceRegistrationStatus === 'REGISTERED' ? 'REGISTERED_ACTIVE' : 'PENDING_BASIS_CHECK');

  const resolvedCatalog =
    assessment.tcode === 'ME21N' ? 'SAP_MM_BC_PO_PROC_PC' :
    assessment.tcode === 'VA01' ? 'SAP_SD_BC_SO_PROC_PC' :
    assessment.tcode === 'FB03' ? 'SAP_S4FIN_BC_GL_DOC_PC' :
    assessment.tcode === 'FB50' ? 'SAP_S4FIN_BC_GL_DOC_PC' :
    assessment.tcode === 'F-28' ? 'SAP_S4FIN_BC_AR_PAYMENTS_PC' :
    'SAP_S4FIN_BC_AP_PAYMENTS_PC';

  const resolvedIcfPath =
    odataValidation?.[0]?.icfPath ||
    `/sap/opu/odata/sap/${resolvedODataService}`;

  const currentSystemId = assessment.systemId || 'S21';
  const currentClient = assessment.client || '200';
  const activeCandidate = selectedCandidate || candidates[0] || assessment.matchingFioriApp;

  // Copy Feedback State
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const handleCopy = (key: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  // TAB 1: ADD FOUND State
  const [selectedCandidateId, setSelectedCandidateId] = useState<string>(
    selectedCandidate?.appId || candidates[0]?.appId || assessment.matchingFioriApp?.appId || ''
  );
  const [candidateSaveStatus, setCandidateSaveStatus] = useState<'IDLE' | 'SAVING' | 'SUCCESS' | 'ERROR'>('IDLE');
  const [candidateSaveMsg, setCandidateSaveMsg] = useState<string>('');

  // TAB 2: CONFIGURE / ADOPT State
  const [checklistAck, setChecklistAck] = useState<Record<string, boolean>>({
    pfcgRole: false,
    flpCatalog: false,
    odataMaint: false,
    sicfNode: false
  });
  const [readinessSaveStatus, setReadinessSaveStatus] = useState<'IDLE' | 'SAVING' | 'SUCCESS' | 'ERROR'>('IDLE');
  const [readinessSaveMsg, setReadinessSaveMsg] = useState<string>('');

  // Count acknowledged steps
  const acknowledgedCount = Object.values(checklistAck).filter(Boolean).length;
  const acknowledgedPercent = Math.round((acknowledgedCount / 4) * 100);

  // TAB 3: EXTEND State
  const [extensionTier, setExtensionTier] = useState<'TIER_1_KEY_USER' | 'TIER_2_CLOUD_DEVELOPER' | 'TIER_3_BTP_SIDE_BY_SIDE'>('TIER_1_KEY_USER');
  const [customExtensionNotes, setCustomExtensionNotes] = useState<string>(
    `Key User Custom Field extension proposed for additional ${assessment.tcode} fields. Standard ${resolvedODataService} service handles core transactional processing.`
  );
  const [extensionSaveStatus, setExtensionSaveStatus] = useState<'IDLE' | 'SAVING' | 'SUCCESS' | 'ERROR'>('IDLE');
  const [extensionSaveMsg, setExtensionSaveMsg] = useState<string>('');

  // TAB 4: BUILD State
  const [architectApproved, setArchitectApproved] = useState<boolean>(canonicalOutcome === 'BUILD' || !assessment.matchingFioriApp);
  const [architectName, setArchitectName] = useState<string>('Lead SAP Enterprise Architect');
  const [architectJustification, setArchitectJustification] = useState<string>(
    canonicalOutcome === 'BUILD'
      ? `Proprietary transaction ${assessment.tcode} with 0 standard Fiori successor coverage. Custom RAP List Report required.`
      : ''
  );
  const [buildSaveStatus, setBuildSaveStatus] = useState<'IDLE' | 'SAVING' | 'SUCCESS' | 'ERROR'>('IDLE');
  const [buildError, setBuildError] = useState<string | null>(null);

  // Modernization Decisions Audit History
  const [recordedDecisions, setRecordedDecisions] = useState<ModernizationDecisionRecord[]>([]);

  const loadDecisionHistory = async () => {
    if (assessment.id) {
      try {
        const decisions = await assessmentService.getModernizationDecisions(assessment.id);
        if (Array.isArray(decisions)) {
          setRecordedDecisions(decisions);
        }
      } catch (e) {
        console.warn('Could not load modernization decisions history:', e);
      }
    }
  };

  useEffect(() => {
    loadDecisionHistory();
  }, [assessment.id]);

  // Handler 1: ADD FOUND CANDIDATE
  const handleSaveFoundCandidate = async () => {
    const candidateObj = candidates.find(c => c.appId === selectedCandidateId) || selectedCandidate || candidates[0];
    if (!candidateObj) return;

    onSelectCandidate(candidateObj);
    setCandidateSaveStatus('SAVING');
    setCandidateSaveMsg('');

    try {
      const result = await assessmentService.recordModernizationAction(assessment.id, {
        actionType: 'ADD_FOUND',
        details: {
          appId: candidateObj.appId,
          appName: candidateObj.appName,
          appType: candidateObj.uiTechnology,
          uiTechnology: candidateObj.uiTechnology,
          supportedRelease: candidateObj.supportedProductRelease,
          provenance: 'Official SAP Fiori Apps Reference Library',
          officialSourceUrl: candidateObj.officialSourceUrl,
          businessRoles: candidateObj.businessRoles,
          odataServices: candidateObj.odataServices
        },
        author: 'Lead SAP Consultant',
        comment: `Modernization Decision Stage 4: Associated official candidate ${candidateObj.appId} ("${candidateObj.appName}") to assessment.`
      });

      if (result && result.assessment && onUpdateAssessment) {
        onUpdateAssessment(result.assessment);
      }
      setCandidateSaveStatus('SUCCESS');
      setCandidateSaveMsg(`Standard SAP Fiori application ${candidateObj.appId} successfully bound to assessment.`);
      await loadDecisionHistory();
    } catch (err: any) {
      setCandidateSaveStatus('ERROR');
      setCandidateSaveMsg(err.message || 'Failed to save found candidate.');
    }
  };

  // Handler 2: RECORD ADOPTION READINESS
  const handleRecordAdoptionReadiness = async () => {
    setReadinessSaveStatus('SAVING');
    setReadinessSaveMsg('');

    try {
      const result = await assessmentService.recordModernizationAction(assessment.id, {
        actionType: 'CONFIGURE_ADOPT_READINESS',
        details: {
          checklist: {
            pfcgRole: checklistAck.pfcgRole ? 'VERIFIED' : 'PENDING',
            flpCatalog: checklistAck.flpCatalog ? 'VERIFIED' : 'PENDING',
            odataMaint: checklistAck.odataMaint ? 'VERIFIED' : 'PENDING',
            sicfNode: checklistAck.sicfNode ? 'VERIFIED' : 'PENDING'
          },
          tcode: assessment.tcode,
          appId: activeCandidate?.appId || 'F0842A',
          systemId: currentSystemId,
          client: currentClient,
          role: resolvedRole,
          odataService: resolvedODataService,
          acknowledgedCount,
          totalSteps: 4
        },
        author: 'SAP Security & Basis Consultant',
        comment: `Modernization Decision Stage 4: Recorded adoption readiness checklist (${acknowledgedCount}/4 prerequisites acknowledged) for ${currentSystemId} client ${currentClient}.`
      });

      if (result && result.assessment && onUpdateAssessment) {
        onUpdateAssessment(result.assessment);
      }
      setReadinessSaveStatus('SUCCESS');
      setReadinessSaveMsg('Adoption readiness checklist successfully recorded in audit trail.');
      await loadDecisionHistory();
    } catch (err: any) {
      setReadinessSaveStatus('ERROR');
      setReadinessSaveMsg(err.message || 'Failed to record adoption readiness.');
    }
  };

  // Handler 3: SAVE EXTENSION SPECIFICATION
  const handleSaveExtensionPlan = async () => {
    setExtensionSaveStatus('SAVING');
    setExtensionSaveMsg('');

    try {
      const result = await assessmentService.recordModernizationAction(assessment.id, {
        actionType: 'EXTEND_PLAN',
        details: {
          targetApp: activeCandidate?.appId || 'F0842A',
          tier: extensionTier,
          cleanCoreTier: extensionTier,
          notes: customExtensionNotes,
          missingCapabilities: assessment.missingCapabilities || [],
          gaps: assessment.identifiedGaps?.map((g: any) => g.gapTitle || g.description) || []
        },
        author: 'Clean Core Technical Lead',
        comment: `Modernization Decision Stage 4: Saved Clean Core extension plan (${extensionTier}).`
      });

      if (result && result.assessment && onUpdateAssessment) {
        onUpdateAssessment(result.assessment);
      }
      setExtensionSaveStatus('SUCCESS');
      setExtensionSaveMsg('Clean Core extension specification successfully documented for architecture review.');
      await loadDecisionHistory();
    } catch (err: any) {
      setExtensionSaveStatus('ERROR');
      setExtensionSaveMsg(err.message || 'Failed to save extension plan.');
    }
  };

  // Handler 4: TRANSFER TO GENERATION STUDIO
  const handleTransferToGenerationStudio = async () => {
    setBuildError(null);
    setBuildSaveStatus('SAVING');

    if (evidenceCompleteness < 50) {
      setBuildError(`Evidence completeness is ${evidenceCompleteness}% (below 50% threshold). Additional discovery required before initiating generation.`);
      setBuildSaveStatus('ERROR');
      return;
    }

    const hasStandardMatch = Boolean(assessment.matchingFioriApp?.appId || candidates.length > 0 || (assessment.fitGapScore && assessment.fitGapScore >= 50));
    if (hasStandardMatch && !architectApproved) {
      setBuildError('Clean Core Guardrail: Standard SAP Fiori candidates exist. Initiating custom Generation Studio build requires documented justification and Lead Enterprise Architect sign-off.');
      setBuildSaveStatus('ERROR');
      return;
    }

    if (!architectApproved) {
      setBuildError('Lead Architect approval confirmation is required to commission custom generation in Generation Studio.');
      setBuildSaveStatus('ERROR');
      return;
    }

    const handoffPayload: Partial<GenerationHandoffPayload> = {
      sourceAssessmentId: assessment.id,
      tcode: assessment.tcode,
      transactionDescription: assessment.description || `Transaction ${assessment.tcode}`,
      targetRelease: assessment.release || assessment.targetRelease || 'SAP S/4HANA 2023 Private Edition',
      systemId: currentSystemId,
      client: currentClient,
      programName: assessment.programName || 'SAPMF05A',
      packageName: assessment.packageName || 'FBAS',
      classification: assessment.classification || 'STANDARD',
      recommendationOutcome,
      architectApproved: true,
      architectName,
      architectSignOffTimestamp: new Date().toISOString(),
      verifiedMetadata: {
        programName: assessment.programName || 'SAPMF05A',
        screenNumber: assessment.screenNumber || '0100',
        packageName: assessment.packageName || 'FBAS',
        softwareComponent: assessment.softwareComponent || 'S4CORE 108 SP0003'
      },
      businessRequirements: {
        process: assessment.businessArea || 'Financial Accounting',
        scenario: assessment.subArea || 'Core Operations',
        criticality: 'HIGH',
        requiredCapabilities: assessment.verifiedCapabilities || [
          'List Report Display',
          'Object Page Navigation',
          'Direct Processing'
        ]
      },
      fitGapSummary: {
        identifiedGaps: assessment.identifiedGaps?.map((g: any) => g.gapTitle || g.description) || [
          'Custom enterprise logic requires RAP managed framework.'
        ],
        missingCapabilities: assessment.missingCapabilities || [],
        justification: architectJustification || 'Architect-approved custom RAP development under Clean Core Tier 2.'
      },
      architectureBaseline: {
        backendModel: 'RAP_MANAGED',
        cdsViewType: 'VIEW_ENTITY',
        odataVersion: 'ODATA_V4',
        uiPattern: 'FIORI_ELEMENTS_LIST_REPORT_OBJECT_PAGE',
        cleanCoreTier: 'TIER_2_CLOUD_DEVELOPER'
      }
    };

    try {
      const createdHandoff = await assessmentService.createGenerationHandoff(handoffPayload);
      const handoffId = createdHandoff?.handoffId || `HND-${Date.now()}`;

      try {
        localStorage.setItem(`fiorix_handoff_${handoffId}`, JSON.stringify(createdHandoff));
        sessionStorage.setItem('fiorix_current_handoff_id', handoffId);
      } catch {
        // non-fatal
      }

      setBuildSaveStatus('SUCCESS');
      navigate(`/generation-studio?handoffId=${handoffId}`);
    } catch (err: any) {
      setBuildSaveStatus('ERROR');
      setBuildError(err.message || 'Failed to persist generation project handoff.');
    }
  };

  const isBuildRecommended = canonicalOutcome === 'BUILD';
  const hasStandardMatch = Boolean(assessment.matchingFioriApp?.appId || candidates.length > 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', color: '#1D2D3E' }}>
      {/* 1. Header Banner & Recommendation Ribbon */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          border: '1px solid #DDE2E5',
          borderRadius: '8px',
          padding: '20px 24px',
          boxShadow: '0 1px 3px rgba(29, 45, 62, 0.05)',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: 'linear-gradient(90deg, #0070F2 0%, #107E3E 50%, #E9730C 100%)' }} />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '3px 8px', backgroundColor: '#EAF3FE', color: '#0070F2', border: '1px solid #C2DCFF', borderRadius: '4px', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>
              Stage 4 of 4 • Modernization Decision & Transition
            </div>
            <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#0F233A', margin: '0 0 4px 0' }}>
              Modernization Decision & Enablement Workbench
            </h2>
            <p style={{ fontSize: '13px', color: '#556B82', margin: 0, lineHeight: 1.4 }}>
              Select and execute authoritative architectural modernization actions governed by verified S21 evidence and Clean Core rules.
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
            <span style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', color: '#64748B', letterSpacing: '0.5px' }}>
              Current Recommendation
            </span>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 14px',
                borderRadius: '6px',
                fontSize: '13px',
                fontWeight: 700,
                boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                backgroundColor:
                  canonicalOutcome === 'ADOPT' ? '#EDF9F0' :
                  canonicalOutcome === 'CONFIGURE' ? '#EAF3FE' :
                  canonicalOutcome === 'EXTEND' ? '#FEF4E8' :
                  canonicalOutcome === 'BUILD' ? '#F7EDFD' : '#F1F5F9',
                color:
                  canonicalOutcome === 'ADOPT' ? '#107E3E' :
                  canonicalOutcome === 'CONFIGURE' ? '#0070F2' :
                  canonicalOutcome === 'EXTEND' ? '#C25E00' :
                  canonicalOutcome === 'BUILD' ? '#8C19C5' : '#475569',
                border: `1px solid ${
                  canonicalOutcome === 'ADOPT' ? '#BCE6C6' :
                  canonicalOutcome === 'CONFIGURE' ? '#B8D7FF' :
                  canonicalOutcome === 'EXTEND' ? '#FFDCB0' :
                  canonicalOutcome === 'BUILD' ? '#E3BFFF' : '#CBD5E1'
                }`
              }}
            >
              {canonicalOutcome}
            </span>
          </div>
        </div>

        {/* Metadata Ribbon */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '10px', paddingTop: '14px', borderTop: '1px solid #EDF0F2' }}>
          <div style={{ backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '6px', padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <span style={{ fontSize: '10.5px', fontWeight: 600, textTransform: 'uppercase', color: '#64748B' }}>Transaction</span>
            <span style={{ fontSize: '12.5px', fontWeight: 700, fontFamily: 'monospace', color: '#0070F2' }}>{assessment.tcode}</span>
          </div>
          <div style={{ backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '6px', padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <span style={{ fontSize: '10.5px', fontWeight: 600, textTransform: 'uppercase', color: '#64748B' }}>Target Landscape</span>
            <span style={{ fontSize: '12.5px', fontWeight: 600, color: '#0F172A' }}>{currentSystemId} (Client {currentClient})</span>
          </div>
          <div style={{ backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '6px', padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <span style={{ fontSize: '10.5px', fontWeight: 600, textTransform: 'uppercase', color: '#64748B' }}>Business Area</span>
            <span style={{ fontSize: '12.5px', fontWeight: 600, color: '#0F172A', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {assessment.businessArea || 'Core Operations'}
            </span>
          </div>
          <div style={{ backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '6px', padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <span style={{ fontSize: '10.5px', fontWeight: 600, textTransform: 'uppercase', color: '#64748B' }}>Evidence Completeness</span>
            <span style={{ fontSize: '12.5px', fontWeight: 700, color: '#0F172A' }}>{evidenceCompleteness}%</span>
          </div>
          <div style={{ backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '6px', padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <span style={{ fontSize: '10.5px', fontWeight: 600, textTransform: 'uppercase', color: '#64748B' }}>Confidence Score</span>
            <span style={{ fontSize: '12.5px', fontWeight: 700, color: '#0F172A' }}>{recommendationConfidence}%</span>
          </div>
          <div style={{ backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '6px', padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <span style={{ fontSize: '10.5px', fontWeight: 600, textTransform: 'uppercase', color: '#64748B' }}>Lifecycle Status</span>
            <span style={{ fontSize: '12.5px', fontWeight: 700, color: '#0070F2' }}>
              {assessment.lifecycleStatus || assessment.status || 'IN_PROGRESS'}
            </span>
          </div>
        </div>
      </div>

      {/* 2. Sub-Tabs Selector (Workbench Navigation) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
        {/* Tab 1 */}
        <button
          type="button"
          onClick={() => setActiveTab('ADD_FOUND')}
          style={{
            backgroundColor: activeTab === 'ADD_FOUND' ? '#F4F8FE' : '#FFFFFF',
            border: activeTab === 'ADD_FOUND' ? '1.5px solid #0070F2' : '1px solid #DDE2E5',
            borderRadius: '8px',
            padding: '14px 16px',
            cursor: 'pointer',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            textAlign: 'left',
            position: 'relative',
            boxShadow: activeTab === 'ADD_FOUND' ? '0 0 0 1px #0070F2, 0 3px 8px rgba(0, 112, 242, 0.12)' : '0 1px 2px rgba(29, 45, 62, 0.03)',
            transition: 'all 0.2s ease'
          }}
        >
          {canonicalOutcome === 'ADOPT' && (
            <span style={{ position: 'absolute', top: '-8px', right: '12px', background: '#107E3E', color: '#FFFFFF', fontSize: '10px', fontWeight: 700, padding: '1px 7px', borderRadius: '10px', textTransform: 'uppercase' }}>
              Recommended
            </span>
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: activeTab === 'ADD_FOUND' ? '#0070F2' : '#F1F5F9', color: activeTab === 'ADD_FOUND' ? '#FFFFFF' : '#475569' }}>
              <BookmarkCheck size={18} />
            </div>
            <span style={{ fontSize: '11px', fontWeight: 700, color: activeTab === 'ADD_FOUND' ? '#0070F2' : '#94A3B8' }}>01</span>
          </div>
          <div>
            <div style={{ fontSize: '13.5px', fontWeight: 700, color: activeTab === 'ADD_FOUND' ? '#0050B3' : '#1E293B' }}>
              1. Add Found Candidate
            </div>
            <div style={{ fontSize: '11.5px', color: '#64748B', marginTop: '2px' }}>
              Bind official Fiori candidate from Reference Library
            </div>
          </div>
        </button>

        {/* Tab 2 */}
        <button
          type="button"
          onClick={() => setActiveTab('CONFIGURE_ADOPT')}
          style={{
            backgroundColor: activeTab === 'CONFIGURE_ADOPT' ? '#F4F8FE' : '#FFFFFF',
            border: activeTab === 'CONFIGURE_ADOPT' ? '1.5px solid #0070F2' : '1px solid #DDE2E5',
            borderRadius: '8px',
            padding: '14px 16px',
            cursor: 'pointer',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            textAlign: 'left',
            position: 'relative',
            boxShadow: activeTab === 'CONFIGURE_ADOPT' ? '0 0 0 1px #0070F2, 0 3px 8px rgba(0, 112, 242, 0.12)' : '0 1px 2px rgba(29, 45, 62, 0.03)',
            transition: 'all 0.2s ease'
          }}
        >
          {(canonicalOutcome === 'CONFIGURE' || canonicalOutcome === 'ADOPT') && (
            <span style={{ position: 'absolute', top: '-8px', right: '12px', background: '#0070F2', color: '#FFFFFF', fontSize: '10px', fontWeight: 700, padding: '1px 7px', borderRadius: '10px', textTransform: 'uppercase' }}>
              Recommended
            </span>
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: activeTab === 'CONFIGURE_ADOPT' ? '#0070F2' : '#F1F5F9', color: activeTab === 'CONFIGURE_ADOPT' ? '#FFFFFF' : '#475569' }}>
              <Sliders size={18} />
            </div>
            <span style={{ fontSize: '11px', fontWeight: 700, color: activeTab === 'CONFIGURE_ADOPT' ? '#0070F2' : '#94A3B8' }}>02</span>
          </div>
          <div>
            <div style={{ fontSize: '13.5px', fontWeight: 700, color: activeTab === 'CONFIGURE_ADOPT' ? '#0050B3' : '#1E293B' }}>
              2. Configure / Adopt Readiness
            </div>
            <div style={{ fontSize: '11.5px', color: '#64748B', marginTop: '2px' }}>
              Basis & Security administrative prerequisites
            </div>
          </div>
        </button>

        {/* Tab 3 */}
        <button
          type="button"
          onClick={() => setActiveTab('EXTEND')}
          style={{
            backgroundColor: activeTab === 'EXTEND' ? '#F4F8FE' : '#FFFFFF',
            border: activeTab === 'EXTEND' ? '1.5px solid #0070F2' : '1px solid #DDE2E5',
            borderRadius: '8px',
            padding: '14px 16px',
            cursor: 'pointer',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            textAlign: 'left',
            position: 'relative',
            boxShadow: activeTab === 'EXTEND' ? '0 0 0 1px #0070F2, 0 3px 8px rgba(0, 112, 242, 0.12)' : '0 1px 2px rgba(29, 45, 62, 0.03)',
            transition: 'all 0.2s ease'
          }}
        >
          {canonicalOutcome === 'EXTEND' && (
            <span style={{ position: 'absolute', top: '-8px', right: '12px', background: '#C25E00', color: '#FFFFFF', fontSize: '10px', fontWeight: 700, padding: '1px 7px', borderRadius: '10px', textTransform: 'uppercase' }}>
              Recommended
            </span>
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: activeTab === 'EXTEND' ? '#0070F2' : '#F1F5F9', color: activeTab === 'EXTEND' ? '#FFFFFF' : '#475569' }}>
              <Layers size={18} />
            </div>
            <span style={{ fontSize: '11px', fontWeight: 700, color: activeTab === 'EXTEND' ? '#0070F2' : '#94A3B8' }}>03</span>
          </div>
          <div>
            <div style={{ fontSize: '13.5px', fontWeight: 700, color: activeTab === 'EXTEND' ? '#0050B3' : '#1E293B' }}>
              3. Extensibility Plan
            </div>
            <div style={{ fontSize: '11.5px', color: '#64748B', marginTop: '2px' }}>
              Clean Core Tier 1-3 adaptation blueprint
            </div>
          </div>
        </button>

        {/* Tab 4 */}
        <button
          type="button"
          onClick={() => setActiveTab('BUILD_STUDIO')}
          style={{
            backgroundColor: activeTab === 'BUILD_STUDIO' ? '#F4F8FE' : '#FFFFFF',
            border: activeTab === 'BUILD_STUDIO' ? '1.5px solid #0070F2' : '1px solid #DDE2E5',
            borderRadius: '8px',
            padding: '14px 16px',
            cursor: 'pointer',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            textAlign: 'left',
            position: 'relative',
            boxShadow: activeTab === 'BUILD_STUDIO' ? '0 0 0 1px #0070F2, 0 3px 8px rgba(0, 112, 242, 0.12)' : '0 1px 2px rgba(29, 45, 62, 0.03)',
            transition: 'all 0.2s ease'
          }}
        >
          {canonicalOutcome === 'BUILD' && (
            <span style={{ position: 'absolute', top: '-8px', right: '12px', background: '#8C19C5', color: '#FFFFFF', fontSize: '10px', fontWeight: 700, padding: '1px 7px', borderRadius: '10px', textTransform: 'uppercase' }}>
              Recommended
            </span>
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: activeTab === 'BUILD_STUDIO' ? '#0070F2' : '#F1F5F9', color: activeTab === 'BUILD_STUDIO' ? '#FFFFFF' : '#475569' }}>
              <Sparkles size={18} />
            </div>
            <span style={{ fontSize: '11px', fontWeight: 700, color: activeTab === 'BUILD_STUDIO' ? '#0070F2' : '#94A3B8' }}>04</span>
          </div>
          <div>
            <div style={{ fontSize: '13.5px', fontWeight: 700, color: activeTab === 'BUILD_STUDIO' ? '#0050B3' : '#1E293B' }}>
              4. Generation Studio
            </div>
            <div style={{ fontSize: '11.5px', color: '#64748B', marginTop: '2px' }}>
              Custom RAP application handoff & build
            </div>
          </div>
        </button>
      </div>

      {/* 3. Sub-Tab 1: Candidate Association */}
      {activeTab === 'ADD_FOUND' && (
        <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #DDE2E5', borderRadius: '8px', padding: '22px 24px', boxShadow: '0 1px 3px rgba(29, 45, 62, 0.05)', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', paddingBottom: '14px', borderBottom: '1px solid #EDF0F2', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#0F233A', margin: '0 0 4px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <BookmarkCheck size={20} color="#0070F2" />
                Official Catalogue Candidate Association
              </h3>
              <p style={{ fontSize: '13px', color: '#556B82', margin: 0 }}>
                Select and associate a verified official SAP Fiori standard candidate with this assessment record.
              </p>
            </div>
            {canonicalOutcome === 'ADOPT' && (
              <span style={{ padding: '4px 10px', borderRadius: '4px', backgroundColor: '#EDF9F0', color: '#107E3E', border: '1px solid #BCE6C6', fontSize: '12px', fontWeight: 700 }}>
                Assessment Recommended Path
              </span>
            )}
          </div>

          {candidateSaveMsg && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 16px', borderRadius: '6px', backgroundColor: candidateSaveStatus === 'SUCCESS' ? '#EDF9F0' : '#FEF0F0', border: `1px solid ${candidateSaveStatus === 'SUCCESS' ? '#BCE6C6' : '#FECACA'}`, color: candidateSaveStatus === 'SUCCESS' ? '#107E3E' : '#B91C1C', fontSize: '13px' }}>
              {candidateSaveStatus === 'SUCCESS' ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
              <span>{candidateSaveMsg}</span>
            </div>
          )}

          {candidates.length > 0 ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '16px' }}>
              {candidates.map(candidate => {
                const isSelected = selectedCandidateId === candidate.appId;
                return (
                  <div
                    key={candidate.appId}
                    onClick={() => setSelectedCandidateId(candidate.appId)}
                    style={{
                      backgroundColor: isSelected ? '#F8FBFF' : '#FFFFFF',
                      border: isSelected ? '1.5px solid #0070F2' : '1px solid #E2E8F0',
                      borderRadius: '8px',
                      padding: '16px 18px',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '10px',
                      boxShadow: isSelected ? '0 0 0 1px #0070F2, 0 3px 8px rgba(0, 112, 242, 0.12)' : 'none',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontFamily: 'monospace', fontSize: '13px', fontWeight: 700, padding: '2px 8px', backgroundColor: '#EAF3FE', color: '#0070F2', borderRadius: '4px', border: '1px solid #C2DCFF' }}>
                        {candidate.appId}
                      </span>
                      <span style={{ fontSize: '11px', fontWeight: 600, padding: '2px 8px', backgroundColor: '#F1F5F9', color: '#475569', borderRadius: '4px' }}>
                        {candidate.uiTechnology}
                      </span>
                    </div>
                    <h4 style={{ fontSize: '14.5px', fontWeight: 700, color: '#0F172A', margin: 0 }}>
                      {candidate.appName}
                    </h4>
                    <p style={{ fontSize: '12px', color: '#64748B', lineHeight: 1.4, margin: 0, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {candidate.description}
                    </p>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '8px', borderTop: '1px solid #F1F5F9', fontSize: '11.5px', color: '#64748B' }}>
                      <span>Release: {candidate.supportedProductRelease}</span>
                      <a
                        href={candidate.officialSourceUrl}
                        target="_blank"
                        rel="noreferrer"
                        onClick={e => e.stopPropagation()}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#0070F2', textDecoration: 'none', fontWeight: 600 }}
                      >
                        FAL Reference <ExternalLink size={13} />
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={{ padding: '32px 24px', textAlign: 'center', backgroundColor: '#F8FAFC', borderRadius: '8px', border: '1px solid #E2E8F0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
              <BookmarkCheck size={28} color="#64748B" />
              <div>
                <div style={{ fontSize: '15px', fontWeight: 700, color: '#0F172A', marginBottom: '4px' }}>
                  No Official Standard Fiori Candidate for {assessment.tcode}
                </div>
                <div style={{ fontSize: '12.5px', color: '#64748B', maxWidth: '540px', lineHeight: 1.5 }}>
                  The SAP Fiori Apps Reference Library contains no standard replacement application for transaction <strong>{assessment.tcode}</strong>.
                  Under Clean Core governance, this requirement should be commissioned as a custom RAP application in <strong>Generation Studio</strong>.
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab('BUILD_STUDIO')}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  backgroundColor: '#8C19C5',
                  color: '#FFFFFF',
                  padding: '9px 18px',
                  borderRadius: '6px',
                  border: 'none',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  boxShadow: '0 2px 5px rgba(140, 25, 197, 0.25)'
                }}
              >
                <Sparkles size={16} /> Proceed to Tab 4: Generation Studio BUILD
              </button>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '16px', borderTop: '1px solid #EDF0F2', flexWrap: 'wrap', gap: '12px' }}>
            <div style={{ fontSize: '12px', color: '#64748B' }}>
              Selected App: <strong style={{ color: '#0F172A' }}>{selectedCandidateId || 'None'}</strong>
            </div>
            <button
              type="button"
              onClick={handleSaveFoundCandidate}
              disabled={candidateSaveStatus === 'SAVING' || candidates.length === 0}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                height: '38px',
                padding: '0 20px',
                fontSize: '13.5px',
                fontWeight: 600,
                borderRadius: '6px',
                border: 'none',
                cursor: candidateSaveStatus === 'SAVING' ? 'not-allowed' : 'pointer',
                backgroundColor: '#0070F2',
                color: '#FFFFFF',
                boxShadow: '0 1px 2px rgba(0, 112, 242, 0.2)'
              }}
            >
              <Save size={16} />
              {candidateSaveStatus === 'SAVING' ? 'Saving Candidate...' : 'Save Selected Candidate to Assessment'}
            </button>
          </div>
        </div>
      )}

      {/* 4. Sub-Tab 2: Configure / Adopt Readiness Checklist */}
      {activeTab === 'CONFIGURE_ADOPT' && (
        <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #DDE2E5', borderRadius: '8px', padding: '22px 24px', boxShadow: '0 1px 3px rgba(29, 45, 62, 0.05)', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', paddingBottom: '14px', borderBottom: '1px solid #EDF0F2', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#0F233A', margin: '0 0 4px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Sliders size={20} color="#0070F2" />
                Administrative Adoption & Configuration Checklist
              </h3>
              <p style={{ fontSize: '13px', color: '#556B82', margin: 0 }}>
                Standard application fulfills business requirements. Verify Basis and Security prerequisites in {currentSystemId} client {currentClient} before user deployment.
              </p>
            </div>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '4px 10px', borderRadius: '4px', backgroundColor: '#FEF9F1', border: '1px solid #FFDCB0', color: '#A04E00', fontSize: '11.5px', fontWeight: 600 }}>
              <ShieldAlert size={14} />
              No SAP Writes Performed by FioriX
            </span>
          </div>

          {readinessSaveMsg && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 16px', borderRadius: '6px', backgroundColor: readinessSaveStatus === 'SUCCESS' ? '#EDF9F0' : '#FEF0F0', border: `1px solid ${readinessSaveStatus === 'SUCCESS' ? '#BCE6C6' : '#FECACA'}`, color: readinessSaveStatus === 'SUCCESS' ? '#107E3E' : '#B91C1C', fontSize: '13px' }}>
              {readinessSaveStatus === 'SUCCESS' ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
              <span>{readinessSaveMsg}</span>
            </div>
          )}

          {/* Progress Header */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', backgroundColor: '#F8FAFC', padding: '14px 18px', borderRadius: '6px', border: '1px solid #E2E8F0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12.5px' }}>
              <span style={{ fontWeight: 700, color: '#1E293B' }}>Enablement Progress ({acknowledgedCount} of 4 Prerequisites Acknowledged)</span>
              <span style={{ fontWeight: 700, color: '#0070F2' }}>{acknowledgedPercent}%</span>
            </div>
            <div style={{ width: '100%', height: '8px', backgroundColor: '#E2E8F0', borderRadius: '4px', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${acknowledgedPercent}%`, background: 'linear-gradient(90deg, #0070F2 0%, #107E3E 100%)', borderRadius: '4px', transition: 'width 0.3s ease' }} />
            </div>
          </div>

          {/* 4 Detailed Enablement Step Cards */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {/* Step 1: Security PFCG Role */}
            <div style={{ backgroundColor: checklistAck.pfcgRole ? '#FBFDFC' : '#FFFFFF', border: `1px solid ${checklistAck.pfcgRole ? '#BCE6C6' : '#E2E8F0'}`, borderRadius: '8px', padding: '16px 18px', display: 'flex', gap: '16px', alignItems: 'flex-start', transition: 'all 0.2s ease' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: checklistAck.pfcgRole ? '#EDF9F0' : '#EAF3FE', color: checklistAck.pfcgRole ? '#107E3E' : '#0070F2', border: `1px solid ${checklistAck.pfcgRole ? '#BCE6C6' : '#C2DCFF'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <KeyRound size={16} />
              </div>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                  <h4 style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A', margin: 0 }}>1. PFCG Business Role Assignment (Security Team)</h4>
                  <span style={{ fontSize: '11px', fontWeight: 600, padding: '2px 8px', borderRadius: '4px', backgroundColor: '#F1F5F9', color: '#475569', border: '1px solid #E2E8F0' }}>Security & Basis</span>
                </div>
                <p style={{ fontSize: '12.5px', color: '#475569', lineHeight: 1.45, margin: 0 }}>
                  Assign business role template to end users in client {currentClient} using transaction <code style={{ color: '#0070F2', fontWeight: 600 }}>PFCG</code> / <code style={{ color: '#0070F2', fontWeight: 600 }}>SU01</code>.
                </p>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '6px', padding: '6px 12px', fontFamily: 'monospace', fontSize: '12px', color: '#0050B3' }}>
                  <span>Role: <strong>{resolvedRole}</strong></span>
                  <button
                    type="button"
                    onClick={() => handleCopy('role', resolvedRole)}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '3px 8px', borderRadius: '4px', border: '1px solid #CBD5E1', backgroundColor: '#FFFFFF', color: '#475569', fontSize: '11px', cursor: 'pointer' }}
                  >
                    {copiedKey === 'role' ? <Check size={12} color="#107E3E" /> : <Copy size={12} />}
                    {copiedKey === 'role' ? 'Copied!' : 'Copy'}
                  </button>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '4px', paddingTop: '8px', borderTop: '1px dashed #E2E8F0', flexWrap: 'wrap', gap: '8px' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '11.5px', fontWeight: 600, padding: '3px 8px', borderRadius: '4px', backgroundColor: '#FEF4E8', color: '#C25E00', border: '1px solid #FFDCB0' }}>
                    <AlertTriangle size={13} />
                    Status: {resolvedRoleStatus} in {currentSystemId} client {currentClient}
                  </span>

                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '12.5px', fontWeight: 600, color: '#1E293B' }}>
                    <input
                      type="checkbox"
                      checked={checklistAck.pfcgRole}
                      onChange={e => setChecklistAck({ ...checklistAck, pfcgRole: e.target.checked })}
                      style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: '#0070F2' }}
                    />
                    <span>Acknowledge Role Requirement</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Step 2: Fiori Launchpad Catalog */}
            <div style={{ backgroundColor: checklistAck.flpCatalog ? '#FBFDFC' : '#FFFFFF', border: `1px solid ${checklistAck.flpCatalog ? '#BCE6C6' : '#E2E8F0'}`, borderRadius: '8px', padding: '16px 18px', display: 'flex', gap: '16px', alignItems: 'flex-start', transition: 'all 0.2s ease' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: checklistAck.flpCatalog ? '#EDF9F0' : '#EAF3FE', color: checklistAck.flpCatalog ? '#107E3E' : '#0070F2', border: `1px solid ${checklistAck.flpCatalog ? '#BCE6C6' : '#C2DCFF'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <LayoutGrid size={16} />
              </div>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                  <h4 style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A', margin: 0 }}>2. Fiori Launchpad Catalog & Space Mapping (Fiori Admin)</h4>
                  <span style={{ fontSize: '11px', fontWeight: 600, padding: '2px 8px', borderRadius: '4px', backgroundColor: '#F1F5F9', color: '#475569', border: '1px solid #E2E8F0' }}>Fiori Admin</span>
                </div>
                <p style={{ fontSize: '12.5px', color: '#475569', lineHeight: 1.45, margin: 0 }}>
                  Confirm business catalog is mapped in Launchpad Content Manager (<code style={{ color: '#0070F2', fontWeight: 600 }}>/UI2/FLPCM_CUST</code>) and assigned to spaces/pages.
                </p>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '6px', padding: '6px 12px', fontFamily: 'monospace', fontSize: '12px', color: '#0050B3' }}>
                  <span>Catalog: <strong>{resolvedCatalog}</strong></span>
                  <button
                    type="button"
                    onClick={() => handleCopy('catalog', resolvedCatalog)}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '3px 8px', borderRadius: '4px', border: '1px solid #CBD5E1', backgroundColor: '#FFFFFF', color: '#475569', fontSize: '11px', cursor: 'pointer' }}
                  >
                    {copiedKey === 'catalog' ? <Check size={12} color="#107E3E" /> : <Copy size={12} />}
                    {copiedKey === 'catalog' ? 'Copied!' : 'Copy'}
                  </button>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '4px', paddingTop: '8px', borderTop: '1px dashed #E2E8F0', flexWrap: 'wrap', gap: '8px' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '11.5px', fontWeight: 600, padding: '3px 8px', borderRadius: '4px', backgroundColor: '#FEF4E8', color: '#C25E00', border: '1px solid #FFDCB0' }}>
                    <AlertTriangle size={13} />
                    Status: PENDING_CATALOG_CONFIRMATION in {currentSystemId}
                  </span>

                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '12.5px', fontWeight: 600, color: '#1E293B' }}>
                    <input
                      type="checkbox"
                      checked={checklistAck.flpCatalog}
                      onChange={e => setChecklistAck({ ...checklistAck, flpCatalog: e.target.checked })}
                      style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: '#0070F2' }}
                    />
                    <span>Acknowledge Catalog Mapping</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Step 3: SAP Gateway Service Registration */}
            <div style={{ backgroundColor: checklistAck.odataMaint ? '#FBFDFC' : '#FFFFFF', border: `1px solid ${checklistAck.odataMaint ? '#BCE6C6' : '#E2E8F0'}`, borderRadius: '8px', padding: '16px 18px', display: 'flex', gap: '16px', alignItems: 'flex-start', transition: 'all 0.2s ease' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: checklistAck.odataMaint ? '#EDF9F0' : '#EAF3FE', color: checklistAck.odataMaint ? '#107E3E' : '#0070F2', border: `1px solid ${checklistAck.odataMaint ? '#BCE6C6' : '#C2DCFF'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Server size={16} />
              </div>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                  <h4 style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A', margin: 0 }}>3. SAP Gateway Service Registration (Basis Team)</h4>
                  <span style={{ fontSize: '11px', fontWeight: 600, padding: '2px 8px', borderRadius: '4px', backgroundColor: '#F1F5F9', color: '#475569', border: '1px solid #E2E8F0' }}>Basis & Gateway</span>
                </div>
                <p style={{ fontSize: '12.5px', color: '#475569', lineHeight: 1.45, margin: 0 }}>
                  Activate OData service in transaction <code style={{ color: '#0070F2', fontWeight: 600 }}>/IWFND/MAINT_SERVICE</code> with system alias <code style={{ color: '#0070F2', fontWeight: 600 }}>LOCAL</code>.
                </p>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '6px', padding: '6px 12px', fontFamily: 'monospace', fontSize: '12px', color: '#0050B3' }}>
                  <span>OData Service: <strong>{resolvedODataService}</strong></span>
                  <button
                    type="button"
                    onClick={() => handleCopy('service', resolvedODataService)}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '3px 8px', borderRadius: '4px', border: '1px solid #CBD5E1', backgroundColor: '#FFFFFF', color: '#475569', fontSize: '11px', cursor: 'pointer' }}
                  >
                    {copiedKey === 'service' ? <Check size={12} color="#107E3E" /> : <Copy size={12} />}
                    {copiedKey === 'service' ? 'Copied!' : 'Copy'}
                  </button>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '4px', paddingTop: '8px', borderTop: '1px dashed #E2E8F0', flexWrap: 'wrap', gap: '8px' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '11.5px', fontWeight: 600, padding: '3px 8px', borderRadius: '4px', backgroundColor: '#FEF4E8', color: '#C25E00', border: '1px solid #FFDCB0' }}>
                    <AlertTriangle size={13} />
                    Status: {resolvedODataStatus} on system {currentSystemId}
                  </span>

                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '12.5px', fontWeight: 600, color: '#1E293B' }}>
                    <input
                      type="checkbox"
                      checked={checklistAck.odataMaint}
                      onChange={e => setChecklistAck({ ...checklistAck, odataMaint: e.target.checked })}
                      style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: '#0070F2' }}
                    />
                    <span>Acknowledge Service Registration</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Step 4: ICF Node Activation in SICF */}
            <div style={{ backgroundColor: checklistAck.sicfNode ? '#FBFDFC' : '#FFFFFF', border: `1px solid ${checklistAck.sicfNode ? '#BCE6C6' : '#E2E8F0'}`, borderRadius: '8px', padding: '16px 18px', display: 'flex', gap: '16px', alignItems: 'flex-start', transition: 'all 0.2s ease' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: checklistAck.sicfNode ? '#EDF9F0' : '#EAF3FE', color: checklistAck.sicfNode ? '#107E3E' : '#0070F2', border: `1px solid ${checklistAck.sicfNode ? '#BCE6C6' : '#C2DCFF'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Network size={16} />
              </div>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                  <h4 style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A', margin: 0 }}>4. ICF Node Activation in SICF (Basis Team)</h4>
                  <span style={{ fontSize: '11px', fontWeight: 600, padding: '2px 8px', borderRadius: '4px', backgroundColor: '#F1F5F9', color: '#475569', border: '1px solid #E2E8F0' }}>Basis Team</span>
                </div>
                <p style={{ fontSize: '12.5px', color: '#475569', lineHeight: 1.45, margin: 0 }}>
                  Verify ICF tree path is active without 403/404 restrictions in transaction <code style={{ color: '#0070F2', fontWeight: 600 }}>SICF</code>.
                </p>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '6px', padding: '6px 12px', fontFamily: 'monospace', fontSize: '12px', color: '#0050B3' }}>
                  <span>ICF Tree: <strong>{resolvedIcfPath}</strong></span>
                  <button
                    type="button"
                    onClick={() => handleCopy('icf', resolvedIcfPath)}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '3px 8px', borderRadius: '4px', border: '1px solid #CBD5E1', backgroundColor: '#FFFFFF', color: '#475569', fontSize: '11px', cursor: 'pointer' }}
                  >
                    {copiedKey === 'icf' ? <Check size={12} color="#107E3E" /> : <Copy size={12} />}
                    {copiedKey === 'icf' ? 'Copied!' : 'Copy'}
                  </button>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '4px', paddingTop: '8px', borderTop: '1px dashed #E2E8F0', flexWrap: 'wrap', gap: '8px' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '11.5px', fontWeight: 600, padding: '3px 8px', borderRadius: '4px', backgroundColor: '#FEF4E8', color: '#C25E00', border: '1px solid #FFDCB0' }}>
                    <AlertTriangle size={13} />
                    Status: PENDING_SICF_ACTIVATION on system {currentSystemId}
                  </span>

                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '12.5px', fontWeight: 600, color: '#1E293B' }}>
                    <input
                      type="checkbox"
                      checked={checklistAck.sicfNode}
                      onChange={e => setChecklistAck({ ...checklistAck, sicfNode: e.target.checked })}
                      style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: '#0070F2' }}
                    />
                    <span>Acknowledge ICF Node Active</span>
                  </label>
                </div>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '16px', borderTop: '1px solid #EDF0F2', flexWrap: 'wrap', gap: '12px' }}>
            <div style={{ fontSize: '12px', color: '#64748B' }}>
              System: <strong style={{ color: '#0F172A' }}>{currentSystemId} (Client {currentClient})</strong> • Prerequisites Acknowledged: <strong style={{ color: '#0070F2' }}>{acknowledgedCount}/4</strong>
            </div>
            <button
              type="button"
              onClick={handleRecordAdoptionReadiness}
              disabled={readinessSaveStatus === 'SAVING'}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                height: '38px',
                padding: '0 20px',
                fontSize: '13.5px',
                fontWeight: 600,
                borderRadius: '6px',
                border: 'none',
                cursor: readinessSaveStatus === 'SAVING' ? 'not-allowed' : 'pointer',
                backgroundColor: '#0070F2',
                color: '#FFFFFF',
                boxShadow: '0 1px 2px rgba(0, 112, 242, 0.2)'
              }}
            >
              <CheckSquare size={16} />
              {readinessSaveStatus === 'SAVING' ? 'Recording Readiness...' : 'Record Adoption Readiness in Audit Trail'}
            </button>
          </div>
        </div>
      )}

      {/* 5. Sub-Tab 3: Extensibility Blueprint */}
      {activeTab === 'EXTEND' && (
        <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #DDE2E5', borderRadius: '8px', padding: '22px 24px', boxShadow: '0 1px 3px rgba(29, 45, 62, 0.05)', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', paddingBottom: '14px', borderBottom: '1px solid #EDF0F2', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#0F233A', margin: '0 0 4px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Layers size={20} color="#E9730C" />
                Clean Core Extensibility Blueprint
              </h3>
              <p style={{ fontSize: '13px', color: '#556B82', margin: 0 }}>
                Standard application covers core flows but requires adaptation for custom fields or business logic. Strictly follow SAP Clean Core extensibility hierarchy.
              </p>
            </div>
            {canonicalOutcome === 'EXTEND' && (
              <span style={{ padding: '4px 10px', borderRadius: '4px', backgroundColor: '#FEF4E8', color: '#C25E00', border: '1px solid #FFDCB0', fontSize: '12px', fontWeight: 700 }}>
                Assessment Recommended Path
              </span>
            )}
          </div>

          {extensionSaveMsg && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 16px', borderRadius: '6px', backgroundColor: extensionSaveStatus === 'SUCCESS' ? '#EDF9F0' : '#FEF0F0', border: `1px solid ${extensionSaveStatus === 'SUCCESS' ? '#BCE6C6' : '#FECACA'}`, color: extensionSaveStatus === 'SUCCESS' ? '#107E3E' : '#B91C1C', fontSize: '13px' }}>
              {extensionSaveStatus === 'SUCCESS' ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
              <span>{extensionSaveMsg}</span>
            </div>
          )}

          {/* Clean Core Guardrail Notice */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '14px 16px', borderRadius: '6px', backgroundColor: '#FEF9F1', border: '1px solid #FFDCB0', color: '#8A4300', fontSize: '12.5px', lineHeight: 1.45 }}>
            <ShieldAlert size={18} style={{ flexShrink: 0, marginTop: '2px', color: '#C25E00' }} />
            <div>
              <strong>Clean Core Extension Point Integrity:</strong> FioriX strictly adheres to SAP Clean Core rules and does not invent unverified BAdIs.
              Tier 2 developer extensibility requires discovering SAP-released extension points directly via ADT or official SAP API Business Hub documentation.
            </div>
          </div>

          {/* Extensibility Tiers */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px' }}>
            <div
              onClick={() => setExtensionTier('TIER_1_KEY_USER')}
              style={{
                backgroundColor: extensionTier === 'TIER_1_KEY_USER' ? '#F8FBFF' : '#FFFFFF',
                border: extensionTier === 'TIER_1_KEY_USER' ? '1.5px solid #0070F2' : '1px solid #E2E8F0',
                borderRadius: '8px',
                padding: '16px',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                boxShadow: extensionTier === 'TIER_1_KEY_USER' ? '0 0 0 1px #0070F2' : 'none',
                transition: 'all 0.2s ease'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 7px', borderRadius: '4px', backgroundColor: '#EDF9F0', color: '#107E3E' }}>Tier 1</span>
                <span style={{ fontSize: '11px', fontWeight: 600, color: '#107E3E' }}>Clean Core</span>
              </div>
              <h4 style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A', margin: 0 }}>Key User Extensibility</h4>
              <p style={{ fontSize: '12px', color: '#64748B', lineHeight: 1.4, margin: 0 }}>
                Custom Fields and Logic app, UI adaptation in Launchpad without code modification. Upgrade safe and zero developer coding.
              </p>
            </div>

            <div
              onClick={() => setExtensionTier('TIER_2_CLOUD_DEVELOPER')}
              style={{
                backgroundColor: extensionTier === 'TIER_2_CLOUD_DEVELOPER' ? '#F8FBFF' : '#FFFFFF',
                border: extensionTier === 'TIER_2_CLOUD_DEVELOPER' ? '1.5px solid #0070F2' : '1px solid #E2E8F0',
                borderRadius: '8px',
                padding: '16px',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                boxShadow: extensionTier === 'TIER_2_CLOUD_DEVELOPER' ? '0 0 0 1px #0070F2' : 'none',
                transition: 'all 0.2s ease'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 7px', borderRadius: '4px', backgroundColor: '#EAF3FE', color: '#0070F2' }}>Tier 2</span>
                <span style={{ fontSize: '11px', fontWeight: 600, color: '#0070F2' }}>Developer Cloud</span>
              </div>
              <h4 style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A', margin: 0 }}>On-Stack Developer Extensibility</h4>
              <p style={{ fontSize: '12px', color: '#64748B', lineHeight: 1.4, margin: 0 }}>
                ABAP Cloud in ADT, released BAdIs, and RAP behavior extensions. Strictly subject to verified released extension points.
              </p>
            </div>

            <div
              onClick={() => setExtensionTier('TIER_3_BTP_SIDE_BY_SIDE')}
              style={{
                backgroundColor: extensionTier === 'TIER_3_BTP_SIDE_BY_SIDE' ? '#F8FBFF' : '#FFFFFF',
                border: extensionTier === 'TIER_3_BTP_SIDE_BY_SIDE' ? '1.5px solid #0070F2' : '1px solid #E2E8F0',
                borderRadius: '8px',
                padding: '16px',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                boxShadow: extensionTier === 'TIER_3_BTP_SIDE_BY_SIDE' ? '0 0 0 1px #0070F2' : 'none',
                transition: 'all 0.2s ease'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 7px', borderRadius: '4px', backgroundColor: '#F7EDFD', color: '#8C19C5' }}>Tier 3</span>
                <span style={{ fontSize: '11px', fontWeight: 600, color: '#8C19C5' }}>Decoupled</span>
              </div>
              <h4 style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A', margin: 0 }}>Side-by-Side SAP BTP</h4>
              <p style={{ fontSize: '12px', color: '#64748B', lineHeight: 1.4, margin: 0 }}>
                Decoupled CAP/Node/Java applications running on SAP BTP consuming released OData V4 services via SAP Cloud Connector.
              </p>
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', textTransform: 'uppercase', marginBottom: '6px' }}>
              Extension Specification Notes
            </label>
            <textarea
              rows={3}
              value={customExtensionNotes}
              onChange={e => setCustomExtensionNotes(e.target.value)}
              style={{ width: '100%', boxSizing: 'border-box', padding: '10px 14px', border: '1px solid #CBD5E1', borderRadius: '6px', fontFamily: 'monospace', fontSize: '12px', color: '#1E293B', outline: 'none' }}
              placeholder="Describe required custom fields, validation exits, or UI adjustments..."
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '16px', borderTop: '1px solid #EDF0F2', flexWrap: 'wrap', gap: '12px' }}>
            <div style={{ fontSize: '12px', color: '#64748B' }}>
              Selected Approach: <strong style={{ color: '#0F172A' }}>{extensionTier}</strong>
            </div>
            <button
              type="button"
              onClick={handleSaveExtensionPlan}
              disabled={extensionSaveStatus === 'SAVING'}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                height: '38px',
                padding: '0 20px',
                fontSize: '13.5px',
                fontWeight: 600,
                borderRadius: '6px',
                border: 'none',
                cursor: extensionSaveStatus === 'SAVING' ? 'not-allowed' : 'pointer',
                backgroundColor: '#D97706',
                color: '#FFFFFF'
              }}
            >
              <Save size={16} />
              {extensionSaveStatus === 'SAVING' ? 'Saving Plan...' : 'Save Reviewable Extensibility Plan'}
            </button>
          </div>
        </div>
      )}

      {/* 6. Sub-Tab 4: Generation Studio Handoff */}
      {activeTab === 'BUILD_STUDIO' && (
        <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #DDE2E5', borderRadius: '8px', padding: '22px 24px', boxShadow: '0 1px 3px rgba(29, 45, 62, 0.05)', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', paddingBottom: '14px', borderBottom: '1px solid #EDF0F2', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#0F233A', margin: '0 0 4px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Sparkles size={20} color="#8C19C5" />
                Handoff to Generation Studio (Custom RAP Modernization)
              </h3>
              <p style={{ fontSize: '13px', color: '#556B82', margin: 0 }}>
                Commission custom ABAP CDS / RAP application generation. Requires verified preconditions, architect sign-off, and clean core compliance.
              </p>
            </div>
            <span style={{ padding: '4px 10px', borderRadius: '4px', backgroundColor: isBuildRecommended ? '#F7EDFD' : '#FEF4E8', color: isBuildRecommended ? '#8C19C5' : '#C25E00', border: `1px solid ${isBuildRecommended ? '#E3BFFF' : '#FFDCB0'}`, fontSize: '12px', fontWeight: 700 }}>
              {isBuildRecommended ? 'BUILD Justified' : 'Clean Core Gate Active'}
            </span>
          </div>

          {/* Clean Core Guardrail Notice / Custom Build Justification */}
          {!hasStandardMatch ? (
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '14px 16px', borderRadius: '6px', backgroundColor: '#F0FDF4', border: '1px solid #BBF7D0', color: '#166534', fontSize: '12.5px', lineHeight: 1.45 }}>
              <CheckCircle2 size={18} style={{ flexShrink: 0, marginTop: '2px', color: '#16A34A' }} />
              <div>
                <strong>Clean Core Custom Build Formally Justified:</strong> No standard SAP Fiori successor exists for <strong>{assessment.tcode}</strong>.
                Commissioning a custom SAP Fiori Elements / ABAP RESTful Application Programming Model (RAP) application under Clean Core Tier 2 (Cloud Developer Extensibility) is the recommended modernization path.
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '14px 16px', borderRadius: '6px', backgroundColor: '#FEF9F1', border: '1px solid #FFDCB0', color: '#8A4300', fontSize: '12.5px', lineHeight: 1.45 }}>
              <ShieldAlert size={18} style={{ flexShrink: 0, marginTop: '2px', color: '#C25E00' }} />
              <div>
                <strong>Clean Core Standard-First Policy Active:</strong> Official standard SAP Fiori candidates exist for transaction <strong>{assessment.tcode}</strong>.
                FioriX Clean Core governance strictly mandates adopting or extending standard applications before custom code is justified.
                Building a custom application is restricted and requires an explicit Lead Enterprise Architect override with signed justification.
              </div>
            </div>
          )}

          {buildError && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '12px 16px', borderRadius: '6px', backgroundColor: '#FEF0F0', border: '1px solid #FECACA', color: '#B91C1C', fontSize: '13px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <AlertTriangle size={18} />
                <span>{buildError}</span>
              </div>
              <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
                <button
                  type="button"
                  onClick={handleTransferToGenerationStudio}
                  style={{
                    backgroundColor: '#B91C1C',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: '4px',
                    padding: '5px 12px',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Retry BUILD Commissioning
                </button>
              </div>
            </div>
          )}

          {/* Target Architecture Baseline */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', backgroundColor: '#F8FAFC', padding: '14px 18px', borderRadius: '6px', border: '1px solid #E2E8F0' }}>
            <h4 style={{ fontSize: '11.5px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Cpu size={14} /> Target Architecture Baseline (SAP S/4HANA 2023)
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px' }}>
              <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '6px', padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <span style={{ fontSize: '10.5px', fontWeight: 600, textTransform: 'uppercase', color: '#64748B' }}>Backend Model</span>
                <span style={{ fontFamily: 'monospace', fontSize: '12.5px', fontWeight: 700, color: '#0F172A' }}>RAP Managed</span>
              </div>
              <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '6px', padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <span style={{ fontSize: '10.5px', fontWeight: 600, textTransform: 'uppercase', color: '#64748B' }}>CDS View Type</span>
                <span style={{ fontFamily: 'monospace', fontSize: '12.5px', fontWeight: 700, color: '#0F172A' }}>View Entity (v2)</span>
              </div>
              <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '6px', padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <span style={{ fontSize: '10.5px', fontWeight: 600, textTransform: 'uppercase', color: '#64748B' }}>Protocol</span>
                <span style={{ fontFamily: 'monospace', fontSize: '12.5px', fontWeight: 700, color: '#0F172A' }}>OData V4</span>
              </div>
              <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '6px', padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <span style={{ fontSize: '10.5px', fontWeight: 600, textTransform: 'uppercase', color: '#64748B' }}>Frontend UI</span>
                <span style={{ fontFamily: 'monospace', fontSize: '12.5px', fontWeight: 700, color: '#0F172A' }}>Fiori Elements LR/OP</span>
              </div>
            </div>
          </div>

          {/* Architect Sign-Off Inputs (Decomposed Sub-Component) */}
          <ArchitectSignOffSection
            architectName={architectName}
            setArchitectName={setArchitectName}
            architectJustification={architectJustification}
            setArchitectJustification={setArchitectJustification}
            architectApproved={architectApproved}
            setArchitectApproved={setArchitectApproved}
            evidenceCompleteness={evidenceCompleteness}
            buildSaveStatus={buildSaveStatus}
            onTransferToGenerationStudio={handleTransferToGenerationStudio}
          />
        </div>
      )}

      {/* 7. Action Summary & Audit History */}
      <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #DDE2E5', borderRadius: '8px', padding: '18px 22px', boxShadow: '0 1px 3px rgba(29, 45, 62, 0.05)', display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #EDF0F2', paddingBottom: '10px' }}>
          <h3 style={{ fontSize: '13.5px', fontWeight: 700, color: '#0F233A', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Clock size={16} color="#0070F2" />
            Modernization Action Summary & Governance Audit Trail
          </h3>
          <span style={{ fontSize: '11px', fontFamily: 'monospace', fontWeight: 700, color: '#107E3E', backgroundColor: '#EDF9F0', border: '1px solid #BCE6C6', padding: '2px 8px', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <ShieldCheck size={13} /> SHA-256 Chained
          </span>
        </div>

        {recordedDecisions.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', border: '1px solid #E2E8F0', borderRadius: '6px', overflow: 'hidden', maxHeight: '220px', overflowY: 'auto' }}>
            {recordedDecisions.map((dec, idx) => (
              <div key={dec.actionId || idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', backgroundColor: '#FFFFFF', borderBottom: idx < recordedDecisions.length - 1 ? '1px solid #EDF0F2' : 'none', fontSize: '12px', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
                  <span style={{ fontFamily: 'monospace', fontSize: '10.5px', fontWeight: 700, padding: '2px 6px', borderRadius: '4px', backgroundColor: '#EAF3FE', color: '#0070F2', whiteSpace: 'nowrap' }}>
                    {dec.actionType}
                  </span>
                  <span style={{ color: '#334155', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {dec.comment}
                  </span>
                </div>
                <span style={{ color: '#94A3B8', fontSize: '11px', whiteSpace: 'nowrap' }}>
                  {dec.author} • {new Date(dec.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ padding: '16px', textAlign: 'center', color: '#64748B', fontSize: '12.5px', backgroundColor: '#F8FAFC', borderRadius: '6px' }}>
            No modernization decisions have been recorded for this assessment yet. Choose an action above to commit a decision.
          </div>
        )}
      </div>
    </div>
  );
};
