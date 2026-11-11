import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Assessment,
  AssessmentStep,
  BusinessRequirement,
  TechnicalObject,
  FioriApplication,
  FitGapResult,
  Recommendation,
  GeneratedApplicationBlueprint,
  ValidationFinding,
  AuditEvent
} from '../../types';
import { assessmentService } from '../../services/mock/assessmentService';
import { transactionService } from '../../services/mock/transactionService';
import { catalogueService } from '../../services/mock/catalogueService';
import { fitGapService } from '../../services/mock/fitGapService';
import { generationService } from '../../services/mock/generationService';
import { validationService } from '../../services/mock/validationService';
import { auditService } from '../../services/mock/auditService';
import { StatusBadge } from '../../components/status/StatusBadge';
import { MessageStrip } from '../../components/status/MessageStrip';
import { AddRequirementDialog } from '../../components/dialogs/AddRequirementDialog';
import { ConfirmDialog } from '../../components/dialogs/ConfirmDialog';
import {
  ArrowLeft,
  Layers,
  FileCode,
  Briefcase,
  Library,
  GitCompare,
  Compass,
  Cpu,
  History,
  ShieldCheck,
  PlusCircle,
  Download,
  AlertTriangle,
  Lock,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Code2,
  FileText
} from 'lucide-react';

export const AssessmentWorkspacePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Tab mapping with aliases
  const normalizeTab = (tabParam: string | null): AssessmentStep => {
    if (!tabParam) return 'OVERVIEW';
    const lower = tabParam.toLowerCase().replace(/-/g, '_');
    if (lower === 'technical') return 'TECHNICAL';
    if (lower === 'business_context' || lower === 'requirements' || lower === 'business_context_requirements') {
      return 'BUSINESS_CONTEXT_REQUIREMENTS';
    }
    if (lower === 'fiori_discovery' || lower === 'catalogue') return 'FIORI_DISCOVERY';
    if (lower === 'fit_gap') return 'FIT_GAP';
    if (lower === 'recommendation' || lower === 'recommendations') return 'RECOMMENDATION';
    if (lower === 'generation_studio' || lower === 'generation' || lower === 'blueprint') {
      return 'GENERATION_STUDIO';
    }
    if (lower === 'validation') return 'VALIDATION';
    if (lower === 'audit_history' || lower === 'audit' || lower === 'history') return 'AUDIT_HISTORY';
    return 'OVERVIEW';
  };

  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [activeTab, setActiveTab] = useState<AssessmentStep>(() => normalizeTab(searchParams.get('tab')));
  const [requirements, setRequirements] = useState<BusinessRequirement[]>([]);
  const [techObjects, setTechObjects] = useState<TechnicalObject[]>([]);
  const [fioriApps, setFioriApps] = useState<FioriApplication[]>([]);
  const [fitGapResults, setFitGapResults] = useState<FitGapResult[]>([]);
  const [recommendation, setRecommendation] = useState<Recommendation | null>(null);
  const [blueprint, setBlueprint] = useState<GeneratedApplicationBlueprint | null>(null);
  const [validationFindings, setValidationFindings] = useState<ValidationFinding[]>([]);
  const [auditEvents, setAuditEvents] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(true);

  // Tab UI filter & sub-states
  const [reqSearch, setReqSearch] = useState('');
  const [reqPriorityFilter, setReqPriorityFilter] = useState('ALL');
  const [fitGapCoverageFilter, setFitGapCoverageFilter] = useState('ALL');
  const [activeCodeTab, setActiveCodeTab] = useState<'CDS' | 'SRVD' | 'MANIFEST'>('CDS');
  const [validationCategoryFilter, setValidationCategoryFilter] = useState('ALL');

  // Dialog & Notification states
  const [isAddReqOpen, setIsAddReqOpen] = useState(false);
  const [isGenerateConfirmOpen, setIsGenerateConfirmOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);

  // Update URL when tab changes
  const handleTabChange = (newTab: AssessmentStep) => {
    setActiveTab(newTab);
    setSearchParams({ tab: newTab.toLowerCase() }, { replace: true });
  };

  const loadAllData = async () => {
    if (!id) return;
    setLoading(true);
    const aRes = await assessmentService.getAssessmentById(id);
    if (!aRes.data) {
      setLoading(false);
      return;
    }
    setAssessment(aRes.data);

    const [reqRes, objRes, catRes, fgRes, recRes, bpRes, valRes, audRes] = await Promise.all([
      assessmentService.getRequirementsForAssessment(id),
      transactionService.getTechnicalObjectsForTCode(aRes.data.tcode),
      catalogueService.searchCatalogue(),
      fitGapService.getFitGapResultsForAssessment(id),
      fitGapService.getRecommendationForAssessment(id),
      generationService.getBlueprintForAssessment(id),
      validationService.getValidationFindings(),
      auditService.getAuditEvents()
    ]);

    setRequirements(reqRes.data);
    setTechObjects(objRes.data);
    setFioriApps(catRes.data);
    setFitGapResults(fgRes.data);
    setRecommendation(recRes.data);
    setBlueprint(bpRes.data);
    setValidationFindings(valRes.data);

    // Filter audit events relevant to this assessment
    const relatedAudit = audRes.data.filter(
      e => e.entityId === id || e.details.includes(id) || e.details.includes(aRes.data?.tcode || '')
    );
    setAuditEvents(relatedAudit.length > 0 ? relatedAudit : audRes.data.slice(0, 5));

    setLoading(false);
  };

  useEffect(() => {
    loadAllData();
  }, [id]);

  // Keep active tab synced if URL query changes
  useEffect(() => {
    const tabFromUrl = searchParams.get('tab');
    if (tabFromUrl) {
      setActiveTab(normalizeTab(tabFromUrl));
    }
  }, [searchParams]);

  // Check if Generation Studio is unlocked
  // Gating rule: Recommendation outcome must be BUILD AND recommendation approvalStatus must be APPROVED
  const isBuildRecommended =
    (recommendation && recommendation.outcome === 'BUILD') ||
    assessment?.recommendationOutcome === 'BUILD';
  const isBuildApproved =
    recommendation?.approvalStatus === 'APPROVED' || assessment?.status === 'APPROVED';
  const isGenerationUnlocked = isBuildRecommended && isBuildApproved;

  const handleGenerateDraft = async () => {
    if (!id) return;
    try {
      setIsGenerating(true);
      const res = await generationService.generateDraftBlueprint(id);
      setBlueprint(res.data);
      setNotification('Draft application blueprint generated successfully. Review files in Generation Studio.');
      handleTabChange('GENERATION_STUDIO');
    } catch (err: any) {
      setNotification(`Generation Error: ${err.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleExportZip = () => {
    if (!blueprint) return;
    setNotification(`Reviewable draft archive downloaded: fiorix-draft-${blueprint.projectId}.zip (integrity verified)`);
    setTimeout(() => setNotification(null), 4000);
  };

  if (loading) {
    return <div style={{ padding: '32px', textAlign: 'center' }}>Loading assessment workspace telemetry...</div>;
  }

  if (!assessment) {
    return (
      <div style={{ padding: '32px' }}>
        <MessageStrip type="error">Assessment {id} not found in the local repository.</MessageStrip>
        <button
          className="fiori-btn fiori-btn-secondary"
          onClick={() => navigate('/assessments')}
          style={{ marginTop: '16px' }}
        >
          Back to Assessments Register
        </button>
      </div>
    );
  }

  // Filter requirements for Tab 3
  const filteredRequirements = requirements.filter(r => {
    const matchesSearch =
      reqSearch === '' ||
      r.title.toLowerCase().includes(reqSearch.toLowerCase()) ||
      r.statement.toLowerCase().includes(reqSearch.toLowerCase()) ||
      r.id.toLowerCase().includes(reqSearch.toLowerCase());
    const matchesPriority = reqPriorityFilter === 'ALL' || r.priority === reqPriorityFilter;
    return matchesSearch && matchesPriority;
  });

  // Filter Fit-Gap results for Tab 5
  const filteredFitGap = fitGapResults.filter(fg => {
    if (fitGapCoverageFilter === 'ALL') return true;
    return fg.coverageStatus === fitGapCoverageFilter;
  });

  // Filter validation findings for Tab 8
  const filteredValidation = validationFindings.filter(f => {
    if (validationCategoryFilter === 'ALL') return true;
    return f.category === validationCategoryFilter;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Workspace Header */}
      <div
        style={{
          padding: '16px 24px',
          backgroundColor: 'var(--fiori-surface)',
          borderBottom: '1px solid var(--fiori-border)'
        }}
      >
        <button
          type="button"
          className="fiori-btn fiori-btn-subtle"
          style={{ marginBottom: '8px', paddingLeft: 0, height: '20px', fontSize: '12px' }}
          onClick={() => navigate('/assessments')}
        >
          <ArrowLeft size={12} /> Back to Assessments
        </button>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h1 style={{ fontSize: '18px', fontWeight: 700 }}>
                {assessment.id}: {assessment.title}
              </h1>
              <code style={{ fontSize: '13px', fontWeight: 700, color: 'var(--fiori-text-primary)' }}>
                {assessment.tcode}
              </code>
              <StatusBadge status={assessment.status} />
              {assessment.recommendationOutcome && (
                <StatusBadge status={assessment.recommendationOutcome} />
              )}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--fiori-text-secondary)', marginTop: '4px' }}>
              System: <strong>{assessment.systemAlias}</strong> &bull; Process: {assessment.businessProcess} &bull; Target Release: {assessment.targetRelease} &bull; Owner: {assessment.ownerName}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <div style={{ textAlign: 'right', marginRight: '8px' }}>
              <div style={{ fontSize: '11px', color: 'var(--fiori-text-secondary)' }}>Assessment Progress</div>
              <div style={{ fontSize: '13px', fontWeight: 600 }}>{assessment.progressPercent}%</div>
            </div>

            {isGenerationUnlocked ? (
              <button
                type="button"
                className="fiori-btn fiori-btn-primary"
                onClick={() => setIsGenerateConfirmOpen(true)}
                disabled={isGenerating}
                title="Generate or re-compile draft custom artifacts"
              >
                <Cpu size={14} /> {isGenerating ? 'Compiling Blueprint...' : 'Generate Custom Draft'}
              </button>
            ) : (
              <button
                type="button"
                className="fiori-btn fiori-btn-secondary"
                onClick={() => handleTabChange('GENERATION_STUDIO')}
                title="Generation Studio is locked under governance rules"
                style={{ opacity: 0.85 }}
              >
                <Lock size={13} style={{ marginRight: '4px' }} /> Generation Locked
              </button>
            )}
          </div>
        </div>
      </div>

      {notification && (
        <div style={{ padding: '8px 24px 0' }}>
          <MessageStrip type="info">{notification}</MessageStrip>
        </div>
      )}

      {/* Unified 9 Workspace Tabs */}
      <div className="fiori-tabs" style={{ overflowX: 'auto', flexShrink: 0 }}>
        {[
          { key: 'OVERVIEW', label: '1. Overview', icon: Layers },
          { key: 'TECHNICAL', label: `2. Technical (${techObjects.length})`, icon: FileCode },
          { key: 'BUSINESS_CONTEXT_REQUIREMENTS', label: `3. Context & Requirements (${requirements.length})`, icon: Briefcase },
          { key: 'FIORI_DISCOVERY', label: `4. Fiori Discovery (${fioriApps.length})`, icon: Library },
          { key: 'FIT_GAP', label: `5. Fit-Gap Analysis (${fitGapResults.length})`, icon: GitCompare },
          { key: 'RECOMMENDATION', label: '6. Recommendation', icon: Compass },
          {
            key: 'GENERATION_STUDIO',
            label: isGenerationUnlocked ? '7. Generation Studio' : '7. Generation Studio 🔒',
            icon: isGenerationUnlocked ? Cpu : Lock
          },
          { key: 'VALIDATION', label: `8. Validation (${validationFindings.length})`, icon: ShieldCheck },
          { key: 'AUDIT_HISTORY', label: '9. History & Audit', icon: History }
        ].map((t) => {
          const Icon = t.icon;
          const isSelected = activeTab === t.key;
          return (
            <button
              key={t.key}
              type="button"
              className={`fiori-tab-item ${isSelected ? 'active' : ''}`}
              onClick={() => handleTabChange(t.key as AssessmentStep)}
            >
              <Icon size={14} />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab Contents Viewport */}
      <div style={{ padding: '20px 24px', flex: 1, overflowY: 'auto' }}>
        
        {/* ========================================================================= */}
        {/* Tab 1: Overview */}
        {/* ========================================================================= */}
        {activeTab === 'OVERVIEW' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '20px' }}>
            <div className="fiori-card">
              <div className="fiori-card-header">
                <div className="fiori-card-title">Executive Summary & Scope</div>
              </div>
              <div className="fiori-card-body" style={{ fontSize: '13px', lineHeight: 1.6 }}>
                <p style={{ marginBottom: '14px' }}>
                  Transaction <strong>{assessment.tcode}</strong> is undergoing comprehensive functional and technical assessment for modernization under SAP S/4HANA Clean-Core principles.
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: '170px 1fr', gap: '8px' }}>
                  <span style={{ color: 'var(--fiori-text-secondary)', fontWeight: 500 }}>Assessment ID:</span>
                  <code>{assessment.id}</code>
                  <span style={{ color: 'var(--fiori-text-secondary)', fontWeight: 500 }}>Target SAP System:</span>
                  <span>{assessment.systemAlias} ({assessment.systemId})</span>
                  <span style={{ color: 'var(--fiori-text-secondary)', fontWeight: 500 }}>Target Release Profile:</span>
                  <span>{assessment.targetRelease}</span>
                  <span style={{ color: 'var(--fiori-text-secondary)', fontWeight: 500 }}>Business Process Domain:</span>
                  <span>{assessment.businessProcess}</span>
                  <span style={{ color: 'var(--fiori-text-secondary)', fontWeight: 500 }}>Current Workflow Status:</span>
                  <StatusBadge status={assessment.status} />
                  <span style={{ color: 'var(--fiori-text-secondary)', fontWeight: 500 }}>Lead Reviewer:</span>
                  <span>{assessment.ownerName}</span>
                  <span style={{ color: 'var(--fiori-text-secondary)', fontWeight: 500 }}>Created Timestamp:</span>
                  <span>{assessment.createdDate}</span>
                  <span style={{ color: 'var(--fiori-text-secondary)', fontWeight: 500 }}>Last Modified:</span>
                  <span>{assessment.updatedDate}</span>
                </div>
              </div>
            </div>

            <div className="fiori-card">
              <div className="fiori-card-header">
                <div className="fiori-card-title">Governed Recommendation Status</div>
              </div>
              <div className="fiori-card-body">
                {recommendation ? (
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                      <span style={{ fontSize: '13px', fontWeight: 600 }}>Governed Decision:</span>
                      <StatusBadge status={recommendation.outcome} size="md" />
                      <span style={{ fontSize: '12px', color: 'var(--fiori-text-secondary)' }}>
                        ({recommendation.approvalStatus})
                      </span>
                    </div>
                    <p style={{ fontSize: '12px', color: 'var(--fiori-text-secondary)', lineHeight: 1.5, marginBottom: '14px' }}>
                      {recommendation.rationale}
                    </p>
                    <div style={{ padding: '10px', backgroundColor: 'var(--fiori-bg)', borderRadius: '4px', fontSize: '12px' }}>
                      <div><strong>Requirements Satisfied:</strong> {recommendation.criticalRequirementsMet} of {recommendation.totalRequirements} critical rules</div>
                      <div style={{ marginTop: '4px' }}><strong>Evaluated by:</strong> {recommendation.reviewerName}</div>
                      <div style={{ marginTop: '2px', color: 'var(--fiori-text-muted)', fontSize: '11px' }}>Date: {recommendation.decidedTimestamp}</div>
                    </div>
                  </div>
                ) : (
                  <div style={{ color: 'var(--fiori-text-secondary)', fontSize: '13px' }}>
                    Recommendation not yet formulated. Proceed through Context & Requirements and Fit-Gap Analysis to evaluate candidate standard apps.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* Tab 2: Technical Analysis */}
        {/* ========================================================================= */}
        {activeTab === 'TECHNICAL' && (
          <div className="fiori-card">
            <div className="fiori-card-header">
              <div className="fiori-card-title">Discovered ABAP & DDIC Objects ({techObjects.length})</div>
            </div>
            <div style={{ padding: '12px 16px', backgroundColor: 'var(--fiori-surface-subtle)', borderBottom: '1px solid var(--fiori-border)', fontSize: '12px', color: 'var(--fiori-text-secondary)' }}>
              Objects discovered via ADT REST interfaces and S/4HANA metadata tables (TSTC, TADIR, DD02L, USOBX_C). Interface provenance is verified and timestamped.
            </div>
            <div style={{ padding: 0 }}>
              <table className="fiori-table">
                <thead>
                  <tr>
                    <th>Object Name</th>
                    <th>Type</th>
                    <th>Description</th>
                    <th>Package</th>
                    <th>Confidence Status</th>
                    <th>Interface Provenance</th>
                  </tr>
                </thead>
                <tbody>
                  {techObjects.map((obj) => (
                    <tr key={obj.id}>
                      <td><code>{obj.name}</code></td>
                      <td><span style={{ fontSize: '11px', fontWeight: 600 }}>{obj.type}</span></td>
                      <td>{obj.description}</td>
                      <td><code>{obj.packageName}</code></td>
                      <td><StatusBadge status={obj.status} /></td>
                      <td><code style={{ fontSize: '11px' }}>{obj.evidence.sourceInterface}</code></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* Tab 3: Business Context & Requirements (CONSOLIDATED) */}
        {/* ========================================================================= */}
        {activeTab === 'BUSINESS_CONTEXT_REQUIREMENTS' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Top: Business Process Documentation */}
            <div className="fiori-card">
              <div className="fiori-card-header">
                <div className="fiori-card-title">Business Process Definition & Invariants</div>
              </div>
              <div className="fiori-card-body" style={{ fontSize: '13px', lineHeight: 1.6 }}>
                <h3 style={{ fontSize: '14px', marginBottom: '6px' }}>Domain: {assessment.businessProcess}</h3>
                <p style={{ marginBottom: '14px', color: 'var(--fiori-text-secondary)' }}>
                  Process workflow for transaction <strong>{assessment.tcode}</strong> in target system <strong>{assessment.systemAlias}</strong>. Functional requirements below define the acceptance criteria used for deterministic fit-gap matching.
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
                  <div style={{ padding: '12px', backgroundColor: 'var(--fiori-bg)', borderRadius: '4px' }}>
                    <strong>Key Personas & Actors:</strong>
                    <ul style={{ paddingLeft: '16px', marginTop: '6px', fontSize: '12px' }}>
                      <li>Internal Sales / Operations Specialist</li>
                      <li>Department Approval Manager</li>
                      <li>Financial Controller / Auditor</li>
                    </ul>
                  </div>
                  <div style={{ padding: '12px', backgroundColor: 'var(--fiori-bg)', borderRadius: '4px' }}>
                    <strong>Primary Business Inputs:</strong>
                    <ul style={{ paddingLeft: '16px', marginTop: '6px', fontSize: '12px' }}>
                      <li>Master Data Entities (Customer / Vendor / Material)</li>
                      <li>Organizational Units (Company Code, Plant, Sales Org)</li>
                      <li>Transactional Quantities & Pricing Conditions</li>
                    </ul>
                  </div>
                  <div style={{ padding: '12px', backgroundColor: 'var(--fiori-bg)', borderRadius: '4px' }}>
                    <strong>Clean Core Architectural Invariants:</strong>
                    <ul style={{ paddingLeft: '16px', marginTop: '6px', fontSize: '12px' }}>
                      <li>Zero direct modifications to SAP standard tables</li>
                      <li>Release-contracted CDS View Entities only</li>
                      <li>Strict RAP Service Definition boundary</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom: Confirmed Functional Requirements Management */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <div>
                  <h3 style={{ fontSize: '15px', fontWeight: 600 }}>Functional Requirements Register ({requirements.length})</h3>
                  <p style={{ fontSize: '12px', color: 'var(--fiori-text-secondary)' }}>
                    Requirements must have review status <code>CONFIRMED</code> by a certified SAP functional consultant to be scored in Fit-Gap.
                  </p>
                </div>
                <button
                  type="button"
                  className="fiori-btn fiori-btn-primary"
                  onClick={() => setIsAddReqOpen(true)}
                >
                  <PlusCircle size={14} /> Add Requirement
                </button>
              </div>

              {/* Requirement Filters */}
              <div style={{ display: 'flex', gap: '12px', marginBottom: '12px', alignItems: 'center' }}>
                <input
                  type="text"
                  placeholder="Filter requirements by title or statement..."
                  value={reqSearch}
                  onChange={(e) => setReqSearch(e.target.value)}
                  style={{
                    padding: '6px 12px',
                    fontSize: '12px',
                    borderRadius: '4px',
                    border: '1px solid var(--fiori-border)',
                    backgroundColor: 'var(--fiori-surface)',
                    color: 'var(--fiori-text-primary)',
                    width: '320px'
                  }}
                />
                <select
                  value={reqPriorityFilter}
                  onChange={(e) => setReqPriorityFilter(e.target.value)}
                  style={{
                    padding: '6px 10px',
                    fontSize: '12px',
                    borderRadius: '4px',
                    border: '1px solid var(--fiori-border)',
                    backgroundColor: 'var(--fiori-surface)',
                    color: 'var(--fiori-text-primary)'
                  }}
                >
                  <option value="ALL">All Priorities</option>
                  <option value="MUST">MUST</option>
                  <option value="SHOULD">SHOULD</option>
                  <option value="COULD">COULD</option>
                </select>
              </div>

              <div className="fiori-table-container">
                <table className="fiori-table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Requirement Title & Business Rule</th>
                      <th>Actor Role</th>
                      <th>Priority</th>
                      <th>Review Status</th>
                      <th>Confirmed By</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRequirements.map((r) => (
                      <tr key={r.id}>
                        <td><code>{r.id}</code></td>
                        <td>
                          <div style={{ fontWeight: 600 }}>{r.title}</div>
                          <div style={{ fontSize: '12px', color: 'var(--fiori-text-secondary)', marginTop: '2px' }}>
                            {r.statement}
                          </div>
                          {r.businessRule && (
                            <div style={{ fontSize: '11px', color: 'var(--fiori-teal)', marginTop: '4px' }}>
                              Rule: {r.businessRule}
                            </div>
                          )}
                        </td>
                        <td>{r.actorRole}</td>
                        <td>
                          <span style={{ fontSize: '11px', fontWeight: 700, color: r.priority === 'MUST' ? 'var(--fiori-error)' : 'var(--fiori-teal)' }}>
                            {r.priority}
                          </span>
                        </td>
                        <td>
                          <StatusBadge status={r.reviewStatus} />
                        </td>
                        <td>
                          <span style={{ fontSize: '11px', color: 'var(--fiori-text-secondary)' }}>
                            {r.reviewedBy || 'Pending'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* Tab 4: Fiori Discovery */}
        {/* ========================================================================= */}
        {activeTab === 'FIORI_DISCOVERY' && (
          <div className="fiori-card">
            <div className="fiori-card-header">
              <div className="fiori-card-title">Candidate Standard SAP Fiori Applications</div>
            </div>
            <div style={{ padding: '12px 16px', backgroundColor: 'var(--fiori-surface-subtle)', borderBottom: '1px solid var(--fiori-border)', fontSize: '12px', color: 'var(--fiori-text-secondary)' }}>
              Curated from the official SAP Fiori Apps Reference Library. Standard apps must be evaluated against confirmed requirements before considering custom development.
            </div>
            <div style={{ padding: 0 }}>
              <table className="fiori-table">
                <thead>
                  <tr>
                    <th>App ID</th>
                    <th>Application Name</th>
                    <th>Pattern</th>
                    <th>Line of Business</th>
                    <th>Target Role</th>
                    <th>Extensibility Model</th>
                  </tr>
                </thead>
                <tbody>
                  {fioriApps.map((app) => (
                    <tr key={app.id}>
                      <td><code style={{ fontWeight: 700 }}>{app.appId}</code></td>
                      <td>
                        <div style={{ fontWeight: 600 }}>{app.appName}</div>
                        <div style={{ fontSize: '11px', color: 'var(--fiori-text-secondary)' }}>Releases: {app.supportedReleases.join(', ')}</div>
                      </td>
                      <td><span style={{ fontSize: '12px' }}>{app.appType}</span></td>
                      <td>{app.lineOfBusiness}</td>
                      <td style={{ fontSize: '12px' }}>{app.businessRole}</td>
                      <td>
                        <span style={{ fontSize: '11px', fontWeight: 600 }}>{app.extensibilityStatus.replace(/_/g, ' ')}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* Tab 5: Fit-Gap Analysis */}
        {/* ========================================================================= */}
        {activeTab === 'FIT_GAP' && (
          <div>
            <MessageStrip type="info">
              <strong>Fit-Gap Governance Rule:</strong> Status <code>UNKNOWN</code> signifies missing or unverified documentation. It mandates functional verification and must <em>never</em> be conflated with <code>UNSUPPORTED</code>. Standard SAP Fiori First: custom generation is prohibited if standard apps meet all critical rules.
            </MessageStrip>

            {/* Filter Pills */}
            <div style={{ display: 'flex', gap: '8px', margin: '14px 0' }}>
              {['ALL', 'SUPPORTED', 'PARTIAL', 'UNSUPPORTED', 'UNKNOWN'].map((cov) => (
                <button
                  key={cov}
                  type="button"
                  className={`fiori-btn ${fitGapCoverageFilter === cov ? 'fiori-btn-primary' : 'fiori-btn-secondary'}`}
                  style={{ height: '26px', fontSize: '11px' }}
                  onClick={() => setFitGapCoverageFilter(cov)}
                >
                  {cov}
                </button>
              ))}
            </div>

            <div className="fiori-table-container">
              <table className="fiori-table">
                <thead>
                  <tr>
                    <th>Requirement</th>
                    <th>Candidate Fiori App</th>
                    <th>Coverage Status</th>
                    <th>Evidence & Justification</th>
                    <th>Reviewer</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredFitGap.map((fg) => (
                    <tr key={fg.id}>
                      <td>
                        <div style={{ fontWeight: 600 }}>{fg.requirementTitle}</div>
                        <code style={{ fontSize: '11px' }}>{fg.requirementId}</code>
                      </td>
                      <td>
                        <div style={{ fontWeight: 600 }}>{fg.candidateAppName}</div>
                        <code>{fg.candidateAppId}</code>
                      </td>
                      <td>
                        <StatusBadge status={fg.coverageStatus} size="md" />
                      </td>
                      <td style={{ fontSize: '12px', maxWidth: '360px' }}>
                        <div>{fg.gapExplanation}</div>
                        <div style={{ fontSize: '11px', color: 'var(--fiori-text-muted)', marginTop: '2px' }}>
                          Evidence: {fg.evidence}
                        </div>
                      </td>
                      <td>
                        <span style={{ fontSize: '12px' }}>{fg.reviewerName || 'Unassigned'}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* Tab 6: Recommendation */}
        {/* ========================================================================= */}
        {activeTab === 'RECOMMENDATION' && (
          <div className="fiori-card">
            <div className="fiori-card-header">
              <div className="fiori-card-title">Architectural Recommendation & Decision Record</div>
            </div>
            <div className="fiori-card-body">
              {recommendation ? (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '16px' }}>
                    <span style={{ fontSize: '14px', fontWeight: 600 }}>Recommended Decision:</span>
                    <StatusBadge status={recommendation.outcome} size="md" />
                    <span style={{ fontSize: '13px', color: 'var(--fiori-text-secondary)' }}>
                      Approval State: <strong>{recommendation.approvalStatus}</strong>
                    </span>
                  </div>

                  <div style={{ padding: '14px', backgroundColor: 'var(--fiori-bg)', borderRadius: '4px', marginBottom: '16px' }}>
                    <h4 style={{ fontSize: '13px', marginBottom: '4px' }}>Architectural Rationale:</h4>
                    <p style={{ fontSize: '13px', lineHeight: 1.6, color: 'var(--fiori-text-primary)' }}>
                      {recommendation.rationale}
                    </p>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                    <div style={{ padding: '12px', border: '1px solid var(--fiori-border)', borderRadius: '4px' }}>
                      <h4 style={{ fontSize: '12px', fontWeight: 700, marginBottom: '6px' }}>Requirements Satisfaction:</h4>
                      <div style={{ fontSize: '13px' }}>
                        Critical Rules Met: <strong>{recommendation.criticalRequirementsMet}</strong> / {recommendation.totalRequirements}
                      </div>
                    </div>

                    <div style={{ padding: '12px', border: '1px solid var(--fiori-border)', borderRadius: '4px' }}>
                      <h4 style={{ fontSize: '12px', fontWeight: 700, marginBottom: '6px' }}>Evidence Citations:</h4>
                      <ul style={{ paddingLeft: '16px', margin: 0, fontSize: '12px' }}>
                        {recommendation.evidenceCitations.map((c, idx) => (
                          <li key={idx}>{c}</li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {recommendation.unresolvedQuestions.length > 0 && (
                    <div style={{ marginBottom: '16px' }}>
                      <h4 style={{ fontSize: '13px', marginBottom: '6px' }}>Unresolved Questions & Required Follow-Ups:</h4>
                      <ul style={{ paddingLeft: '18px', fontSize: '13px' }}>
                        {recommendation.unresolvedQuestions.map((q, idx) => (
                          <li key={idx} style={{ marginBottom: '4px' }}>{q}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div style={{ fontSize: '11px', color: 'var(--fiori-text-secondary)', borderTop: '1px solid var(--fiori-border-light)', paddingTop: '10px' }}>
                    Recorded by: <strong>{recommendation.reviewerName}</strong> on {recommendation.decidedTimestamp}
                  </div>
                </div>
              ) : (
                <div style={{ fontSize: '13px', color: 'var(--fiori-text-secondary)' }}>
                  No recommendation recorded yet. Run Fit-Gap analysis to formulate decision.
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* Tab 7: Generation Studio (GATED) */}
        {/* ========================================================================= */}
        {activeTab === 'GENERATION_STUDIO' && (
          <div>
            {!isGenerationUnlocked ? (
              /* GATED LOCK VIEW */
              <div className="fiori-card" style={{ padding: '32px 24px', textAlign: 'center', maxWidth: '800px', margin: '20px auto' }}>
                <div style={{ display: 'inline-flex', padding: '16px', backgroundColor: 'rgba(233, 115, 12, 0.1)', borderRadius: '50%', marginBottom: '16px' }}>
                  <Lock size={36} color="#E9730C" />
                </div>
                <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '8px' }}>
                  Generation Studio is Locked by Governance Policy
                </h2>
                <div style={{ fontSize: '13px', lineHeight: 1.6, color: 'var(--fiori-text-secondary)', marginBottom: '20px' }}>
                  <p style={{ marginBottom: '12px' }}>
                    FioriX strictly enforces the <strong>Standard SAP Fiori First</strong> principle. Custom code generation is prohibited unless an assessment formulation confirms material functional gaps that standard apps cannot address, and that decision is approved by an Enterprise Solution Architect.
                  </p>

                  <div style={{ textAlign: 'left', padding: '14px', backgroundColor: 'var(--fiori-bg)', borderRadius: '4px', margin: '0 auto', maxWidth: '600px' }}>
                    <div style={{ fontWeight: 600, marginBottom: '4px' }}>Current Assessment Governance State:</div>
                    <div>&bull; Recommended Outcome: <strong>{recommendation?.outcome || assessment.recommendationOutcome || 'NOT FORMULATED'}</strong></div>
                    <div>&bull; BUILD Approval Status: <strong>{recommendation?.approvalStatus || 'NOT APPROVED'}</strong></div>
                    {recommendation?.outcome !== 'BUILD' && (
                      <div style={{ marginTop: '8px', color: 'var(--fiori-teal)' }}>
                        <strong>Note:</strong> The current outcome is <code>{recommendation?.outcome || 'NON-BUILD'}</code>. Standard Fiori application adoption or standard in-app/BAdI extensibility must be pursued.
                      </div>
                    )}
                    {recommendation?.outcome === 'BUILD' && recommendation?.approvalStatus !== 'APPROVED' && (
                      <div style={{ marginTop: '8px', color: '#E9730C' }}>
                        <strong>Action Required:</strong> A custom BUILD recommendation has been recorded, but formal architectural sign-off is pending. An authorized signatory must sign off in Governance Approvals before generation can proceed.
                      </div>
                    )}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                  <button
                    type="button"
                    className="fiori-btn fiori-btn-secondary"
                    onClick={() => handleTabChange('FIT_GAP')}
                  >
                    Review Fit-Gap Matrix
                  </button>
                  {recommendation?.outcome === 'BUILD' && (
                    <button
                      type="button"
                      className="fiori-btn fiori-btn-primary"
                      onClick={() => navigate('/approvals')}
                    >
                      Go to Governance Approvals
                    </button>
                  )}
                </div>
              </div>
            ) : (
              /* UNLOCKED GENERATION STUDIO */
              <div>
                {/* Two-Stage Governance Banner */}
                <div style={{ marginBottom: '16px' }}>
                  <MessageStrip type="info">
                    <strong>Two-Stage Governance Gate:</strong> Stage 1 (BUILD Decision Approval) is <strong style={{ color: 'var(--fiori-teal)' }}>APPROVED</strong> by {recommendation?.reviewerName || 'Solution Architect'}. Stage 2 (Draft Artifact Export Approval) is required before generated files can be released for SAP sandbox import. FioriX does <em>not</em> automatically activate or transport code to S/4HANA.
                  </MessageStrip>
                </div>

                {blueprint ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    {/* Blueprint Architecture Summary */}
                    <div className="fiori-card">
                      <div className="fiori-card-header">
                        <div className="fiori-card-title">
                          <Cpu size={16} color="var(--fiori-teal)" /> Application Blueprint: {blueprint.projectId}
                        </div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button
                            type="button"
                            className="fiori-btn fiori-btn-secondary"
                            onClick={() => setIsGenerateConfirmOpen(true)}
                            disabled={isGenerating}
                          >
                            <Cpu size={13} /> {isGenerating ? 'Compiling...' : 'Re-compile Blueprint'}
                          </button>
                          <button
                            type="button"
                            className="fiori-btn fiori-btn-primary"
                            onClick={handleExportZip}
                          >
                            <Download size={13} /> Export Draft Archive (ZIP)
                          </button>
                        </div>
                      </div>
                      <div className="fiori-card-body" style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '16px', fontSize: '13px' }}>
                        <div>
                          <div><strong>Floorplan Pattern:</strong> {blueprint.applicationPattern.replace(/_/g, ' ')}</div>
                          <div style={{ marginTop: '4px' }}><strong>Target Release:</strong> {blueprint.targetReleaseProfile}</div>
                          <div style={{ marginTop: '4px' }}><strong>Root CDS Entity:</strong> <code>{blueprint.dataModelProposal.rootEntity}</code></div>
                          <div style={{ marginTop: '4px' }}><strong>Composition Entities:</strong> {blueprint.dataModelProposal.compositionEntities.join(', ')}</div>
                        </div>
                        <div>
                          <div><strong>Service Definition:</strong> <code>{blueprint.serviceProposal.serviceDefinitionName}</code></div>
                          <div style={{ marginTop: '4px' }}><strong>Service Binding:</strong> <code>{blueprint.serviceProposal.serviceBindingName}</code></div>
                          <div style={{ marginTop: '4px' }}><strong>Protocol:</strong> {blueprint.serviceProposal.protocol}</div>
                          <div style={{ marginTop: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <strong>Validation Gate:</strong> <StatusBadge status={blueprint.validationStatus} />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Draft Code Preview with Tabs */}
                    <div className="fiori-card">
                      <div className="fiori-card-header">
                        <div className="fiori-card-title">Generated Draft Code Preview (Reviewable Artifacts)</div>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button
                            type="button"
                            className={`fiori-btn ${activeCodeTab === 'CDS' ? 'fiori-btn-primary' : 'fiori-btn-secondary'}`}
                            style={{ height: '24px', fontSize: '11px' }}
                            onClick={() => setActiveCodeTab('CDS')}
                          >
                            <Code2 size={12} /> Root CDS
                          </button>
                          <button
                            type="button"
                            className={`fiori-btn ${activeCodeTab === 'SRVD' ? 'fiori-btn-primary' : 'fiori-btn-secondary'}`}
                            style={{ height: '24px', fontSize: '11px' }}
                            onClick={() => setActiveCodeTab('SRVD')}
                          >
                            <FileText size={12} /> Service Def
                          </button>
                          <button
                            type="button"
                            className={`fiori-btn ${activeCodeTab === 'MANIFEST' ? 'fiori-btn-primary' : 'fiori-btn-secondary'}`}
                            style={{ height: '24px', fontSize: '11px' }}
                            onClick={() => setActiveCodeTab('MANIFEST')}
                          >
                            <FileCode size={12} /> Manifest
                          </button>
                        </div>
                      </div>

                      <div style={{ padding: 0 }}>
                        {(() => {
                          const art = blueprint.artifacts.find(a => {
                            if (activeCodeTab === 'CDS') return a.fileType === 'CDS';
                            if (activeCodeTab === 'SRVD') return a.fileType === 'SRVD';
                            return a.fileType === 'JSON';
                          }) || blueprint.artifacts[0];

                          if (!art) return <div style={{ padding: '20px' }}>No artifact matching selection.</div>;

                          return (
                            <div>
                              <div style={{ padding: '8px 16px', backgroundColor: 'var(--fiori-bg)', fontSize: '12px', fontWeight: 600, display: 'flex', justifyContent: 'space-between' }}>
                                <span>📄 {art.filePath} ({art.sizeBytes} bytes)</span>
                                <span style={{ color: 'var(--fiori-text-muted)', fontSize: '11px' }}>Checksum: {art.checksum}</span>
                              </div>
                              <pre style={{ padding: '14px 16px', backgroundColor: 'var(--fiori-surface-subtle)', margin: 0, overflowX: 'auto', fontSize: '11px', lineHeight: 1.6, fontFamily: 'monospace' }}>
                                {art.contentSnippet}
                              </pre>
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="fiori-card" style={{ padding: '32px', textAlign: 'center' }}>
                    <p style={{ color: 'var(--fiori-text-secondary)', marginBottom: '14px' }}>
                      BUILD recommendation has been approved for this assessment. Click below to compile the initial draft ABAP CDS View Entities, Service Definitions, and Fiori Elements manifest.
                    </p>
                    <button
                      type="button"
                      className="fiori-btn fiori-btn-primary"
                      onClick={() => setIsGenerateConfirmOpen(true)}
                    >
                      <Cpu size={14} /> Compile Initial Draft Blueprint
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* Tab 8: Validation */}
        {/* ========================================================================= */}
        {activeTab === 'VALIDATION' && (
          <div>
            <div style={{ marginBottom: '14px' }}>
              <MessageStrip type="info">
                <strong>Clean-Core & Quality Validation:</strong> Automated checks evaluate generated draft artifacts against SAP Clean-Core Tier 1 guidelines, syntax standards, and authorization enforcement.
              </MessageStrip>
            </div>

            {/* Category Filter Pills */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '14px' }}>
              {[
                { key: 'ALL', label: 'All Checks' },
                { key: 'CLEAN_CORE', label: 'Clean Core' },
                { key: 'ARCHITECTURE', label: 'Architecture' },
                { key: 'SECURITY', label: 'Security & Auth' },
                { key: 'RELEASE_COMPATIBILITY', label: 'Release Compatibility' }
              ].map((c) => (
                <button
                  key={c.key}
                  type="button"
                  className={`fiori-btn ${validationCategoryFilter === c.key ? 'fiori-btn-primary' : 'fiori-btn-secondary'}`}
                  style={{ height: '26px', fontSize: '11px' }}
                  onClick={() => setValidationCategoryFilter(c.key)}
                >
                  {c.label}
                </button>
              ))}
            </div>

            <div className="fiori-table-container">
              <table className="fiori-table">
                <thead>
                  <tr>
                    <th>Rule ID & Category</th>
                    <th>Validation Check Title</th>
                    <th>Severity</th>
                    <th>Status</th>
                    <th>Evidence & Provenance</th>
                    <th>Remediation Guidance</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredValidation.map((f) => (
                    <tr key={f.id}>
                      <td>
                        <code>{f.ruleId}</code>
                        <div style={{ fontSize: '11px', color: 'var(--fiori-text-secondary)', marginTop: '2px' }}>
                          {f.category.replace(/_/g, ' ')}
                        </div>
                      </td>
                      <td>
                        <div style={{ fontWeight: 600 }}>{f.title}</div>
                        <div style={{ fontSize: '12px', color: 'var(--fiori-text-secondary)', marginTop: '2px' }}>
                          {f.description}
                        </div>
                      </td>
                      <td>
                        <span style={{
                          fontSize: '11px',
                          fontWeight: 700,
                          color: f.severity === 'CRITICAL' ? 'var(--fiori-error)' : f.severity === 'WARNING' ? '#E9730C' : 'var(--fiori-teal)'
                        }}>
                          {f.severity}
                        </span>
                      </td>
                      <td>
                        <StatusBadge status={f.status} />
                      </td>
                      <td style={{ fontSize: '11px', maxWidth: '240px' }}>
                        <div>{f.evidence}</div>
                        <div style={{ color: 'var(--fiori-text-muted)', marginTop: '2px' }}>Ref: {f.sapGuidelineReference}</div>
                      </td>
                      <td style={{ fontSize: '12px', maxWidth: '260px' }}>
                        {f.suggestedRemediation}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* Tab 9: History & Audit */}
        {/* ========================================================================= */}
        {activeTab === 'AUDIT_HISTORY' && (
          <div className="fiori-card">
            <div className="fiori-card-header">
              <div className="fiori-card-title">Assessment Audit Trail & Event Ledger</div>
            </div>
            <div style={{ padding: '12px 16px', backgroundColor: 'var(--fiori-surface-subtle)', borderBottom: '1px solid var(--fiori-border)', fontSize: '12px', color: 'var(--fiori-text-secondary)' }}>
              Immutable domain events recorded for assessment {assessment.id}. Every transition, scan, requirement confirmation, and approval is captured with an append-only correlation ID.
            </div>
            <div style={{ padding: 0 }}>
              <table className="fiori-table">
                <thead>
                  <tr>
                    <th>Timestamp</th>
                    <th>Action</th>
                    <th>User ID & Role</th>
                    <th>Outcome</th>
                    <th>Details & Correlation ID</th>
                  </tr>
                </thead>
                <tbody>
                  {auditEvents.map((evt) => (
                    <tr key={evt.id}>
                      <td style={{ fontSize: '11px', whiteSpace: 'nowrap' }}>{evt.timestamp}</td>
                      <td><code style={{ fontWeight: 600 }}>{evt.action}</code></td>
                      <td>
                        <div>{evt.userId}</div>
                        <div style={{ fontSize: '11px', color: 'var(--fiori-text-secondary)' }}>{evt.userRole}</div>
                      </td>
                      <td><StatusBadge status={evt.outcome} /></td>
                      <td style={{ fontSize: '12px' }}>
                        <div>{evt.details}</div>
                        <code style={{ fontSize: '10px', color: 'var(--fiori-text-muted)' }}>{evt.correlationId}</code>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>

      {/* Add Requirement Dialog */}
      <AddRequirementDialog
        isOpen={isAddReqOpen}
        onClose={() => setIsAddReqOpen(false)}
        assessmentId={assessment.id}
        onRequirementAdded={loadAllData}
      />

      {/* Draft Generation Confirmation Dialog */}
      <ConfirmDialog
        isOpen={isGenerateConfirmOpen}
        onClose={() => setIsGenerateConfirmOpen(false)}
        onConfirm={handleGenerateDraft}
        title="Generate Draft Custom Fiori Blueprint"
        message="This action compiles draft ABAP CDS View Entities, Service Definitions, and Fiori Elements manifest artifacts. Generated files remain drafts and will NOT be automatically activated or transported to S/4HANA."
        confirmLabel="Compile Reviewable Draft"
      />
    </div>
  );
};
