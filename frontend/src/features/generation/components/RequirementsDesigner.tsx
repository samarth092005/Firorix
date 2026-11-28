import React, { useState, useEffect, useMemo } from 'react';
import {
  FileText,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  AlertCircle,
  XCircle,
  HelpCircle,
  DownloadCloud,
  Trash2,
  Save,
  Check,
  ChevronRight,
  ShieldCheck,
  Tag,
  ArrowRight,
  RefreshCw,
  LayoutTemplate,
  ChevronDown,
  Maximize2,
  Minimize2
} from 'lucide-react';
import {
  GenerationProject,
  GenerationRequirement,
  RequirementCategory,
  RequirementPriority,
  RequirementStatus,
  RequirementsSummary,
  StudioInternalView,
  FioriFloorplanType,
  RequirementsUiPreferences
} from '../types';
import { defaultFrontendGenerationProjectService } from '../services/generationProjectService';
import { CATEGORY_LABELS, PRIORITY_BADGES, STATUS_CONFIG } from './requirementConstants';

interface RequirementsDesignerProps {
  project: GenerationProject;
  onProjectUpdated: (updatedProject: GenerationProject) => void;
  onNavigateView: (view: StudioInternalView) => void;
}

export const RequirementsDesigner: React.FC<RequirementsDesignerProps> = ({
  project,
  onProjectUpdated,
  onNavigateView
}) => {
  const [requirements, setRequirements] = useState<GenerationRequirement[]>([]);
  const [summary, setSummary] = useState<RequirementsSummary | null>(null);
  const [selectedReqId, setSelectedReqId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [activeReqCard, setActiveReqCard] = useState<'functional' | 'ui' | null>(null);
  const [functionalApproved, setFunctionalApproved] = useState<boolean>(false);
  const [uiApproved, setUiApproved] = useState<boolean>(false);
  const [customActionInput, setCustomActionInput] = useState<string>('');

  useEffect(() => {
    if (!activeReqCard) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setActiveReqCard(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [activeReqCard]);

  useEffect(() => {
    if (!actionSuccess) return;
    const t = setTimeout(() => setActionSuccess(null), 3200);
    return () => clearTimeout(t);
  }, [actionSuccess]);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Modal / Prompt states for defer/reject reason
  const [actionDialog, setActionDialog] = useState<{
    open: boolean;
    action: 'CONFIRM' | 'DEFER' | 'REJECT' | 'REQUEST_CLARIFICATION';
    reqId: string;
    reason: string;
  }>({
    open: false,
    action: 'CONFIRM',
    reqId: '',
    reason: ''
  });

  // Selected requirement form edit buffer
  const [editBuffer, setEditBuffer] = useState<Partial<GenerationRequirement>>({});
  const [newCriterion, setNewCriterion] = useState('');

  // Load requirements on mount
  useEffect(() => {
    loadRequirements();
  }, [project.projectId]);

  const loadRequirements = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await defaultFrontendGenerationProjectService.listRequirements(project.projectId);
      setRequirements(res.requirements);
      setSummary(res.summary);
      if (res.requirements.length > 0 && !selectedReqId) {
        setSelectedReqId(res.requirements[0].requirementId);
        setEditBuffer(res.requirements[0]);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load requirements');
    } finally {
      setIsLoading(false);
    }
  };

  const selectedRequirement = useMemo(() => {
    return requirements.find((r) => r.requirementId === selectedReqId) || null;
  }, [requirements, selectedReqId]);

  useEffect(() => {
    if (selectedRequirement) {
      setEditBuffer({ ...selectedRequirement });
    }
  }, [selectedRequirement]);

  // Filtered requirements
  const filteredRequirements = useMemo(() => {
    return requirements.filter((r) => {
      const matchesSearch =
        searchQuery === '' ||
        r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (r.relatedGapReference && r.relatedGapReference.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesCat = categoryFilter === 'ALL' || r.category === categoryFilter;
      const matchesStatus = statusFilter === 'ALL' || r.status === statusFilter;

      return matchesSearch && matchesCat && matchesStatus;
    });
  }, [requirements, searchQuery, categoryFilter, statusFilter]);

  // Import from Discovery assessment
  const handleImportAssessment = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await defaultFrontendGenerationProjectService.importRequirementsFromAssessment(project.projectId);
      setActionSuccess(`Successfully imported ${res.importedCount} requirements from assessment!`);
      await loadRequirements();
      // Reload parent project
      const updated = await defaultFrontendGenerationProjectService.getProject(project.projectId);
      onProjectUpdated(updated);
    } catch (err: any) {
      setError(err.message || 'Failed to import requirements');
    } finally {
      setIsLoading(false);
    }
  };

  // Add new requirement
  const handleAddNewRequirement = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const payload: Partial<GenerationRequirement> = {
        title: 'New Functional Requirement',
        description: 'Provide detailed functional description and business requirements.',
        category: 'BUSINESS_RULE',
        priority: 'MUST_HAVE',
        acceptanceCriteria: ['Requirement behavior is verified in RAP unit tests.']
      };
      const res = await defaultFrontendGenerationProjectService.createRequirement(project.projectId, payload);
      await loadRequirements();
      setSelectedReqId(res.requirement.requirementId);
      setEditBuffer(res.requirement);
      setActionSuccess('New requirement created!');
    } catch (err: any) {
      setError(err.message || 'Failed to create requirement');
    } finally {
      setIsLoading(false);
    }
  };

  // Save changes to current requirement
  const handleSaveEdit = async () => {
    if (!selectedReqId) return;
    if (!editBuffer.acceptanceCriteria || editBuffer.acceptanceCriteria.length === 0) {
      setError('At least one acceptance criterion is required to ensure deterministic behavior verification.');
      return;
    }
    setIsSaving(true);
    setError(null);
    try {
      const patch = {
        title: editBuffer.title,
        description: editBuffer.description,
        category: editBuffer.category,
        priority: editBuffer.priority,
        cleanCoreImpact: editBuffer.cleanCoreImpact,
        acceptanceCriteria: editBuffer.acceptanceCriteria,
        developerNotes: editBuffer.developerNotes
      };
      const res = await defaultFrontendGenerationProjectService.updateRequirement(project.projectId, selectedReqId, patch);
      setRequirements((prev) => prev.map((r) => (r.requirementId === selectedReqId ? res.requirement : r)));
      setActionSuccess('Requirement updated successfully!');
    } catch (err: any) {
      setError(err.message || 'Failed to save requirement');
    } finally {
      setIsSaving(false);
    }
  };

  // Delete requirement
  const handleDelete = async (reqId: string) => {
    if (!window.confirm('Are you sure you want to delete this requirement?')) return;
    setIsLoading(true);
    setError(null);
    try {
      await defaultFrontendGenerationProjectService.deleteRequirement(project.projectId, reqId);
      const remaining = requirements.filter((r) => r.requirementId !== reqId);
      setRequirements(remaining);
      if (selectedReqId === reqId) {
        setSelectedReqId(remaining[0]?.requirementId || null);
      }
      setActionSuccess('Requirement deleted.');
      await loadRequirements();
    } catch (err: any) {
      setError(err.message || 'Failed to delete requirement');
    } finally {
      setIsLoading(false);
    }
  };

  // Execute confirmation action
  const handleExecuteAction = async () => {
    const { action, reqId, reason } = actionDialog;
    if ((action === 'DEFER' || action === 'REJECT') && !reason.trim()) {
      setError('A documented reason is mandatory when deferring or rejecting requirements.');
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const res = await defaultFrontendGenerationProjectService.confirmRequirement(
        project.projectId,
        reqId,
        action,
        reason
      );
      setActionDialog({ open: false, action: 'CONFIRM', reqId: '', reason: '' });
      await loadRequirements();
      setActionSuccess(`Requirement marked as ${res.requirement.status}!`);
      // Update parent project state in case lifecycle advanced
      const updated = await defaultFrontendGenerationProjectService.getProject(project.projectId);
      onProjectUpdated(updated);
    } catch (err: any) {
      setError(err.message || 'Action failed');
    } finally {
      setIsLoading(false);
    }
  };

  // Batch confirm all unconfirmed requirements
  const handleConfirmAllRequirements = async () => {
    const unconfirmed = requirements.filter((r) => r.status !== 'CONFIRMED');
    if (unconfirmed.length === 0) {
      setActionSuccess('All requirements are already confirmed!');
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      for (const req of unconfirmed) {
        await defaultFrontendGenerationProjectService.confirmRequirement(
          project.projectId,
          req.requirementId,
          'CONFIRM',
          'Batch confirmed for architecture and code generation.'
        );
      }
      await loadRequirements();
      setActionSuccess(`Successfully confirmed all ${unconfirmed.length} requirements!`);
      const updated = await defaultFrontendGenerationProjectService.getProject(project.projectId);
      onProjectUpdated(updated);
    } catch (err: any) {
      setError(err.message || 'Failed to confirm all requirements.');
    } finally {
      setIsLoading(false);
    }
  };

  // Acceptance criteria helpers
  const handleAddCriterion = () => {
    if (!newCriterion.trim()) return;
    const current = editBuffer.acceptanceCriteria || [];
    setEditBuffer({
      ...editBuffer,
      acceptanceCriteria: [...current, newCriterion.trim()]
    });
    setNewCriterion('');
  };

  const handleRemoveCriterion = (index: number) => {
    const current = [...(editBuffer.acceptanceCriteria || [])];
    current.splice(index, 1);
    setEditBuffer({ ...editBuffer, acceptanceCriteria: current });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '16px' }}>
      {/* Clean Overview Header (shown on 2-card overview, matching Architecture & Build) */}
      {activeReqCard === null && (
        <div
          style={{
            padding: '16px 20px',
            backgroundColor: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderRadius: '10px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '12px'
          }}
        >
          <div>
            <h2 style={{ margin: 0, fontSize: '17px', fontWeight: 700, color: '#0F172A' }}>
              Requirements &amp; UI Design
            </h2>
            <p style={{ margin: '3px 0 0', fontSize: '13px', color: '#64748B' }}>
              Click a card to review functional scope or design your Fiori UI layout, columns, and actions.
            </p>
          </div>

          <button
            type="button"
            disabled={isLoading}
            onClick={async () => {
              if (requirements.some((r) => r.status === 'DRAFT')) {
                await handleConfirmAllRequirements();
              }
              onNavigateView('data-model');
            }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '9px 16px',
              background: summary?.allConfirmedOrResolved
                ? 'linear-gradient(180deg, #1A75FF 0%, #005CE6 100%)'
                : '#0F172A',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: 600,
              cursor: isLoading ? 'wait' : 'pointer'
            }}
          >
            <span>Next: CDS Model</span> <ArrowRight size={14} />
          </button>
        </div>
      )}

      {/* Error & Success Alerts */}
      {error && (
        <div
          style={{
            padding: '12px 16px',
            background: '#fef2f2',
            border: '1px solid #fecaca',
            color: '#991b1b',
            borderRadius: '6px',
            fontSize: '13px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}
        >
          <span>{error}</span>
          <button onClick={() => setError(null)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
            ✕
          </button>
        </div>
      )}

      {actionSuccess && (
        <div className="studio-toast" role="status" aria-live="polite">
          <CheckCircle2 size={15} color="#4ADE80" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {/* 2-Card Overview Grid (when no card is zoomed out) */}
      {activeReqCard === null && (
        <div className="studio-zoom-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
          <div
            role="button"
            tabIndex={0}
            className="studio-zoom-card"
            onClick={() => setActiveReqCard('functional')}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') setActiveReqCard('functional');
            }}
            style={{
              padding: '22px',
              backgroundColor: '#FFFFFF',
              border: '1px solid #E2E8F0',
              borderRadius: '12px',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              gap: '16px',
              minHeight: '280px'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '10px', backgroundColor: '#EFF6FF', color: '#0066FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <FileText size={20} />
              </div>
              {(functionalApproved || summary?.allConfirmedOrResolved) && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '12px', fontWeight: 600, color: '#16A34A', backgroundColor: '#F0FDF4', padding: '3px 9px', borderRadius: '999px', border: '1px solid #BBF7D0' }}>
                  <CheckCircle2 size={13} /> Approved
                </span>
              )}
            </div>
            <div>
              <h3 style={{ margin: '0 0 6px', fontSize: '16px', fontWeight: 700, color: '#0F172A' }}>
                1. Functional &amp; Business Requirements
              </h3>
              <p style={{ margin: 0, fontSize: '13px', color: '#64748B', lineHeight: 1.5 }}>
                {requirements.length} requirement(s) · {requirements.filter((r) => r.status === 'CONFIRMED').length} confirmed. Review rules, actions, and validations.
              </p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 600, color: '#0066FF' }}>
              <Maximize2 size={14} />
              <span>Open &amp; Configure</span>
            </div>
          </div>

          <div
            role="button"
            tabIndex={0}
            className="studio-zoom-card"
            onClick={() => setActiveReqCard('ui')}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') setActiveReqCard('ui');
            }}
            style={{
              padding: '22px',
              backgroundColor: '#FFFFFF',
              border: '1px solid #E2E8F0',
              borderRadius: '12px',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              gap: '16px',
              minHeight: '280px'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '10px', backgroundColor: '#EFF6FF', color: '#0066FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <LayoutTemplate size={20} />
              </div>
              {uiApproved && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '12px', fontWeight: 600, color: '#16A34A', backgroundColor: '#F0FDF4', padding: '3px 9px', borderRadius: '999px', border: '1px solid #BBF7D0' }}>
                  <CheckCircle2 size={13} /> Approved
                </span>
              )}
            </div>
            <div>
              <h3 style={{ margin: '0 0 6px', fontSize: '16px', fontWeight: 700, color: '#0F172A' }}>
                2. UI &amp; Screen Design Requirements
              </h3>
              <p style={{ margin: 0, fontSize: '13px', color: '#64748B', lineHeight: 1.5 }}>
                Floorplan: <strong>{project.requirementsSpec?.uiPreferences?.floorplan || 'LIST_REPORT_OBJECT_PAGE'}</strong>. Pick wireframe layout, badges, and bulk actions.
              </p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 600, color: '#0066FF' }}>
              <Maximize2 size={14} />
              <span>Open &amp; Design UI</span>
            </div>
          </div>
        </div>
      )}

      {/* BOX 1: Functional & Business Requirements (Zoomed-Out Full Workspace) */}
      {activeReqCard === 'functional' && (
      <div
        className="studio-zoom-expanded"
        style={{
          backgroundColor: '#FFFFFF',
          border: '1.5px solid #0066FF',
          borderRadius: '10px',
          overflow: 'hidden'
        }}
      >
        <div
          style={{
            padding: '14px 18px',
            backgroundColor: '#F8FAFC',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <FileText size={17} color="#0066FF" />
            <div>
              <div style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A' }}>
                1. Functional &amp; Business Requirements
              </div>
              <div style={{ fontSize: '12px', color: '#64748B' }}>
                {requirements.length} requirement(s) · {requirements.filter((r) => r.status === 'CONFIRMED').length} confirmed
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              type="button"
              onClick={handleImportAssessment}
              disabled={isLoading}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                padding: '6px 11px',
                borderRadius: '6px',
                border: '1px solid #CBD5E1',
                backgroundColor: '#FFFFFF',
                color: '#334155',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              <DownloadCloud size={13} />
              <span>Import Gaps</span>
            </button>
            <button
              type="button"
              onClick={async () => {
                if (requirements.some((r) => r.status === 'DRAFT')) {
                  await handleConfirmAllRequirements();
                }
                setFunctionalApproved(true);
                setActiveReqCard(null);
              }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                padding: '6px 12px',
                borderRadius: '6px',
                border: 'none',
                backgroundColor: '#16A34A',
                color: '#FFFFFF',
                fontSize: '12.5px',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              <CheckCircle2 size={14} />
              <span>Approve &amp; Back</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveReqCard(null)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                padding: '6px 11px',
                borderRadius: '6px',
                border: '1px solid #CBD5E1',
                backgroundColor: '#FFFFFF',
                color: '#334155',
                fontSize: '12.5px',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              <Minimize2 size={13} />
              <span>Close</span>
            </button>
          </div>
        </div>

        <div style={{ padding: '14px 16px', borderTop: '1px solid #E2E8F0' }}>
          {/* Main Two-Column Layout */}
          <div className="studio-req-two-col">
        {/* Left Column: Requirements Backlog */}
        <div
          style={{
            background: '#fff',
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden'
          }}
        >
          {/* Backlog Header & Controls */}
          <div style={{ padding: '14px 16px', borderBottom: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontWeight: 600, fontSize: '14px', color: '#1e293b' }}>
                Requirements ({filteredRequirements.length})
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  onClick={handleAddNewRequirement}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '4px 10px',
                    background: '#0284c7',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '4px',
                    fontSize: '12px',
                    fontWeight: 500,
                    cursor: 'pointer'
                  }}
                >
                  <Plus size={14} /> New
                </button>
              </div>
            </div>

            {/* Search */}
            <div style={{ position: 'relative' }}>
              <Search size={14} color="#94a3b8" style={{ position: 'absolute', left: '10px', top: '10px' }} />
              <input
                type="text"
                placeholder="Search requirements or gaps..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  padding: '6px 10px 6px 30px',
                  border: '1px solid #cbd5e1',
                  borderRadius: '4px',
                  fontSize: '12px'
                }}
              />
            </div>

            {/* Status & Category Filters */}
            <div style={{ display: 'flex', gap: '8px' }}>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                style={{ flex: 1, padding: '4px 8px', fontSize: '11px', border: '1px solid #cbd5e1', borderRadius: '4px' }}
              >
                <option value="ALL">All Statuses</option>
                <option value="DRAFT">Pending Review</option>
                <option value="CONFIRMED">Confirmed</option>
                <option value="NEEDS_CLARIFICATION">Needs Clarification</option>
                <option value="DEFERRED">Deferred</option>
                <option value="REJECTED">Rejected</option>
              </select>

              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                style={{ flex: 1, padding: '4px 8px', fontSize: '11px', border: '1px solid #cbd5e1', borderRadius: '4px' }}
              >
                <option value="ALL">All Categories</option>
                {Object.keys(CATEGORY_LABELS).map((cat) => (
                  <option key={cat} value={cat}>
                    {CATEGORY_LABELS[cat as RequirementCategory]}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* List items */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '8px' }}>
            {filteredRequirements.length === 0 ? (
              <div style={{ padding: '32px 16px', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>
                No requirements match filter criteria.
              </div>
            ) : (
              filteredRequirements.map((req) => {
                const statusCfg = STATUS_CONFIG[req.status] || STATUS_CONFIG.DRAFT;
                const priorityCfg = PRIORITY_BADGES[req.priority] || PRIORITY_BADGES.MUST_HAVE;
                const isSelected = req.requirementId === selectedReqId;

                return (
                  <div
                    key={req.requirementId}
                    onClick={() => {
                      setSelectedReqId(req.requirementId);
                      setEditBuffer(req);
                    }}
                    style={{
                      padding: '12px',
                      marginBottom: '6px',
                      borderRadius: '6px',
                      border: `1px solid ${isSelected ? '#0284c7' : '#e2e8f0'}`,
                      background: isSelected ? '#f0f9ff' : '#fff',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                      <div style={{ fontWeight: 600, fontSize: '13px', color: '#1e293b', flex: 1 }}>
                        {req.title}
                      </div>
                      <span
                        style={{
                          fontSize: '10px',
                          fontWeight: 600,
                          padding: '2px 6px',
                          borderRadius: '10px',
                          background: statusCfg.bg,
                          color: statusCfg.text
                        }}
                      >
                        {statusCfg.label}
                      </span>
                    </div>

                    <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px', lineClamp: 2, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {req.description}
                    </div>

                    <div style={{ display: 'flex', gap: '6px', marginTop: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                      <span
                        style={{
                          fontSize: '10px',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          background: priorityCfg.bg,
                          color: priorityCfg.text
                        }}
                      >
                        {priorityCfg.label}
                      </span>
                      <span
                        style={{
                          fontSize: '10px',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          background: '#f1f5f9',
                          color: '#475569'
                        }}
                      >
                        {CATEGORY_LABELS[req.category] || req.category}
                      </span>
                      {req.relatedGapReference && (
                        <span
                          style={{
                            fontSize: '10px',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            background: '#eff6ff',
                            color: '#1d4ed8'
                          }}
                        >
                          {req.relatedGapReference}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Requirement Detail & Action Panel */}
        <div
          style={{
            background: '#fff',
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            display: 'flex',
            flexDirection: 'column',
            overflowY: 'auto'
          }}
        >
          {selectedRequirement ? (
            <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Header & Status Actions */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '12px',
                  paddingBottom: '16px',
                  borderBottom: '1px solid #e2e8f0'
                }}
              >
                <div>
                  <div style={{ fontSize: '12px', color: '#64748b', fontFamily: 'monospace' }}>
                    {selectedRequirement.requirementId}
                  </div>
                  <div style={{ fontSize: '16px', fontWeight: 600, color: '#1e293b' }}>
                    {selectedRequirement.title}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <button
                    onClick={() =>
                      setActionDialog({
                        open: true,
                        action: 'CONFIRM',
                        reqId: selectedRequirement.requirementId,
                        reason: ''
                      })
                    }
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '6px 12px',
                      background: '#16a34a',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    <Check size={14} /> Confirm
                  </button>

                  <button
                    onClick={() =>
                      setActionDialog({
                        open: true,
                        action: 'DEFER',
                        reqId: selectedRequirement.requirementId,
                        reason: ''
                      })
                    }
                    style={{
                      padding: '6px 12px',
                      background: '#fff',
                      border: '1px solid #cbd5e1',
                      color: '#64748b',
                      borderRadius: '6px',
                      fontSize: '12px',
                      cursor: 'pointer'
                    }}
                  >
                    Defer
                  </button>

                  <button
                    onClick={() =>
                      setActionDialog({
                        open: true,
                        action: 'REJECT',
                        reqId: selectedRequirement.requirementId,
                        reason: ''
                      })
                    }
                    style={{
                      padding: '6px 12px',
                      background: '#fff',
                      border: '1px solid #fca5a5',
                      color: '#dc2626',
                      borderRadius: '6px',
                      fontSize: '12px',
                      cursor: 'pointer'
                    }}
                  >
                    Reject
                  </button>

                  <button
                    onClick={() => handleDelete(selectedRequirement.requirementId)}
                    style={{
                      padding: '6px 10px',
                      background: '#fff',
                      border: '1px solid #e2e8f0',
                      color: '#dc2626',
                      borderRadius: '6px',
                      cursor: 'pointer'
                    }}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              {/* Form Fields */}
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '16px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: '#475569' }}>Requirement Title</label>
                  <input
                    type="text"
                    value={editBuffer.title || ''}
                    onChange={(e) => setEditBuffer({ ...editBuffer, title: e.target.value })}
                    style={{ padding: '8px 10px', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '13px' }}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: '#475569' }}>Priority</label>
                  <select
                    value={editBuffer.priority || 'MUST_HAVE'}
                    onChange={(e) => setEditBuffer({ ...editBuffer, priority: e.target.value as RequirementPriority })}
                    style={{ padding: '8px 10px', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '13px' }}
                  >
                    <option value="MUST_HAVE">Must Have</option>
                    <option value="SHOULD_HAVE">Should Have</option>
                    <option value="NICE_TO_HAVE">Nice to Have</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: '#475569' }}>Category</label>
                  <select
                    value={editBuffer.category || 'BUSINESS_RULE'}
                    onChange={(e) => setEditBuffer({ ...editBuffer, category: e.target.value as RequirementCategory })}
                    style={{ padding: '8px 10px', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '13px' }}
                  >
                    {Object.keys(CATEGORY_LABELS).map((cat) => (
                      <option key={cat} value={cat}>
                        {CATEGORY_LABELS[cat as RequirementCategory]}
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: '#475569' }}>Clean Core Impact</label>
                  <select
                    value={editBuffer.cleanCoreImpact || 'TIER_2_CLOUD_DEVELOPMENT'}
                    onChange={(e) => setEditBuffer({ ...editBuffer, cleanCoreImpact: e.target.value })}
                    style={{ padding: '8px 10px', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '13px' }}
                  >
                    <option value="TIER_1_STANDARD">Tier 1: Standard CDS/RAP Extension</option>
                    <option value="TIER_2_CLOUD_DEVELOPMENT">Tier 2: Clean Core RAP Application</option>
                    <option value="TIER_3_CLASSIC_LEGACY">Tier 3: Classic Custom Code (Requires Exemption)</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#475569' }}>Functional Description</label>
                <textarea
                  rows={4}
                  value={editBuffer.description || ''}
                  onChange={(e) => setEditBuffer({ ...editBuffer, description: e.target.value })}
                  style={{ padding: '8px 10px', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '13px', lineHeight: '1.4' }}
                />
              </div>

              {/* Acceptance Criteria */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#475569' }}>
                  Verifiable Acceptance Criteria (Mandatory for Confirmation)
                </label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {(editBuffer.acceptanceCriteria || []).map((crit, idx) => (
                    <div
                      key={idx}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '6px 10px',
                        background: '#f8fafc',
                        border: '1px solid #e2e8f0',
                        borderRadius: '4px',
                        fontSize: '12px'
                      }}
                    >
                      <span>✓ {crit}</span>
                      <button
                        onClick={() => handleRemoveCriterion(idx)}
                        style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>

                <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                  <input
                    type="text"
                    placeholder="Add explicit acceptance criterion..."
                    value={newCriterion}
                    onChange={(e) => setNewCriterion(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddCriterion()}
                    style={{ flex: 1, padding: '6px 10px', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '12px' }}
                  />
                  <button
                    onClick={handleAddCriterion}
                    style={{ padding: '6px 12px', background: '#0284c7', color: '#fff', border: 'none', borderRadius: '4px', fontSize: '12px', cursor: 'pointer' }}
                  >
                    Add
                  </button>
                </div>
              </div>

              {/* Provenance Metadata */}
              <div
                style={{
                  padding: '12px',
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '6px',
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: '8px',
                  fontSize: '11px',
                  color: '#64748b'
                }}
              >
                <div>
                  <span style={{ fontWeight: 600 }}>Source Type: </span>
                  {selectedRequirement.sourceType}
                </div>
                <div>
                  <span style={{ fontWeight: 600 }}>Assessment ID: </span>
                  {selectedRequirement.sourceAssessmentReference || 'None'}
                </div>
                <div>
                  <span style={{ fontWeight: 600 }}>Gap Ref: </span>
                  {selectedRequirement.relatedGapReference || 'Manual'}
                </div>
                {selectedRequirement.confirmedBy && (
                  <div>
                    <span style={{ fontWeight: 600 }}>Confirmed By: </span>
                    {selectedRequirement.confirmedBy}
                  </div>
                )}
                {selectedRequirement.deferralOrRejectionReason && (
                  <div style={{ gridColumn: 'span 2', color: '#dc2626' }}>
                    <span style={{ fontWeight: 600 }}>Reason: </span>
                    {selectedRequirement.deferralOrRejectionReason}
                  </div>
                )}
              </div>

              {/* Save Button */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  onClick={handleSaveEdit}
                  disabled={isSaving}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 16px',
                    background: '#0284c7',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  <Save size={15} /> {isSaving ? 'Saving...' : 'Save Requirement'}
                </button>
              </div>
            </div>
          ) : (
            <div style={{ padding: '48px 24px', textAlign: 'center', color: '#94a3b8' }}>
              Select a requirement from the backlog to view and edit details.
            </div>
          )}
            </div>
          </div>
        </div>
      </div>
      )}

      {/* BOX 2: Visual UI & Screen Design Requirements (Zoomed-Out Full Workspace) */}
      {activeReqCard === 'ui' && (
      <div
        className="studio-zoom-expanded"
        style={{
          backgroundColor: '#FFFFFF',
          border: '1.5px solid #0066FF',
          borderRadius: '10px',
          overflow: 'hidden'
        }}
      >
        <div
          style={{
            padding: '14px 18px',
            backgroundColor: '#F8FAFC',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <LayoutTemplate size={17} color="#0066FF" />
            <div>
              <div style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A' }}>
                2. UI &amp; Screen Design Requirements
              </div>
              <div style={{ fontSize: '12px', color: '#64748B' }}>
                Floorplan: {project.requirementsSpec?.uiPreferences?.floorplan || 'LIST_REPORT_OBJECT_PAGE'} · Customize layout, actions &amp; badges
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              type="button"
              onClick={() => {
                setUiApproved(true);
                setActiveReqCard(null);
              }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                padding: '6px 12px',
                borderRadius: '6px',
                border: 'none',
                backgroundColor: '#16A34A',
                color: '#FFFFFF',
                fontSize: '12.5px',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              <CheckCircle2 size={14} />
              <span>Approve &amp; Back</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveReqCard(null)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                padding: '6px 11px',
                borderRadius: '6px',
                border: '1px solid #CBD5E1',
                backgroundColor: '#FFFFFF',
                color: '#334155',
                fontSize: '12.5px',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              <Minimize2 size={13} />
              <span>Close</span>
            </button>
          </div>
        </div>

        <div style={{ padding: '18px', borderTop: '1px solid #E2E8F0', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Live Mini UI Preview Mockup */}
            {(() => {
              const p = project.requirementsSpec?.uiPreferences || {};
              const fp = p.floorplan || 'LIST_REPORT_OBJECT_PAGE';
              const rootEnt = project.dataModelSpec?.entities?.find((e) => e.entityType === 'ROOT' || e.isRoot) || project.dataModelSpec?.entities?.[0];
              const cols = Array.isArray(p.visibleColumns) && p.visibleColumns.length > 0
                ? p.visibleColumns.slice(0, 5)
                : (rootEnt?.fields || []).slice(0, 5).map((f) => f.label || f.name);
              const acts = Array.isArray(p.customActions) ? p.customActions : [];
              return (
                <div style={{ padding: '12px 14px', borderRadius: '8px', backgroundColor: '#F8FAFC', border: '1px solid #CBD5E1' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ fontSize: '12px', fontWeight: 700, color: '#0F172A' }}>
                      Live Layout Preview: {p.pageTitle || project.projectName}
                    </span>
                    <span style={{ fontSize: '11px', fontWeight: 600, color: '#0066FF', backgroundColor: '#EFF6FF', padding: '2px 8px', borderRadius: '999px' }}>
                      {fp.replace(/_/g, ' ')} · {p.uiDensity || 'COMPACT'}
                    </span>
                  </div>
                  <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '6px', padding: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {(p.kpiHeader || fp === 'ANALYTICAL_LIST_PAGE' || fp === 'OVERVIEW_PAGE') && (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
                        {['Total Items: 4', 'Pending: 2', 'Compliance: 96%'].map((kpi) => (
                          <div key={kpi} style={{ padding: '6px 8px', borderRadius: '4px', backgroundColor: '#F0F9FF', border: '1px solid #BAE6FD', fontSize: '11px', fontWeight: 700, color: '#0369A1' }}>
                            {kpi}
                          </div>
                        ))}
                      </div>
                    )}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '6px', borderBottom: '1px solid #F1F5F9', paddingBottom: '6px' }}>
                      <span style={{ fontSize: '11.5px', fontWeight: 600, color: '#334155' }}>
                        {fp === 'WORKLIST' ? 'All (4) · Pending (2) · Processed (2)' : fp === 'FREESTYLE_WIZARD' ? 'Step 1: Details → Step 2: Review' : 'Filter Bar + Results'}
                      </span>
                      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                        {p.bulkActions && <span style={{ fontSize: '10.5px', padding: '2px 6px', borderRadius: '4px', backgroundColor: '#EFF6FF', color: '#0066FF', fontWeight: 600 }}>Bulk Select</span>}
                        {acts.map((a, i) => (
                          <span key={i} style={{ fontSize: '10.5px', padding: '2px 6px', borderRadius: '4px', backgroundColor: '#DCFCE7', color: '#15803D', fontWeight: 600 }}>{a.label}</span>
                        ))}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', fontSize: '11px', color: '#475569' }}>
                      {(cols.length > 0 ? cols : ['ID', 'Status', 'Amount']).map((c) => (
                        <span key={c} style={{ padding: '3px 8px', backgroundColor: '#F1F5F9', borderRadius: '4px', fontWeight: 600 }}>{c}</span>
                      ))}
                      {p.statusBadge && <span style={{ padding: '3px 8px', backgroundColor: '#DCFCE7', color: '#166534', borderRadius: '999px', fontWeight: 700 }}>● Released</span>}
                    </div>
                  </div>
                </div>
              );
            })()}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(185px, 1fr))', gap: '12px' }}>
              {([
                {
                  id: 'LIST_REPORT_OBJECT_PAGE',
                  label: 'List Report & Object Page',
                  desc: 'Filter bar + table + detail tabs',
                  sketch: (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', padding: '6px', backgroundColor: '#F1F5F9', borderRadius: '4px', height: '48px' }}>
                      <div style={{ height: '8px', backgroundColor: '#CBD5E1', borderRadius: '2px', width: '100%' }} />
                      <div style={{ flex: 1, backgroundColor: '#FFFFFF', border: '1px solid #CBD5E1', borderRadius: '2px', display: 'flex', flexDirection: 'column', justifyContent: 'space-around', padding: '2px 4px' }}>
                        <div style={{ height: '3px', backgroundColor: '#94A3B8', width: '85%' }} />
                        <div style={{ height: '3px', backgroundColor: '#CBD5E1', width: '70%' }} />
                      </div>
                    </div>
                  )
                },
                {
                  id: 'WORKLIST',
                  label: 'Action Worklist Queue',
                  desc: 'Status tabs + row Approve/Reject',
                  sketch: (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', padding: '6px', backgroundColor: '#F1F5F9', borderRadius: '4px', height: '48px' }}>
                      <div style={{ display: 'flex', gap: '4px' }}>
                        <div style={{ height: '6px', width: '26%', backgroundColor: '#0066FF', borderRadius: '2px' }} />
                        <div style={{ height: '6px', width: '26%', backgroundColor: '#CBD5E1', borderRadius: '2px' }} />
                      </div>
                      <div style={{ flex: 1, backgroundColor: '#FFFFFF', border: '1px solid #CBD5E1', borderRadius: '2px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 6px' }}>
                        <div style={{ height: '4px', width: '55%', backgroundColor: '#94A3B8' }} />
                        <div style={{ height: '8px', width: '18px', backgroundColor: '#16A34A', borderRadius: '2px' }} />
                      </div>
                    </div>
                  )
                },
                {
                  id: 'ANALYTICAL_LIST_PAGE',
                  label: 'KPI & Analytics Cockpit',
                  desc: 'KPI tiles + distribution bars + table',
                  sketch: (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', padding: '6px', backgroundColor: '#F1F5F9', borderRadius: '4px', height: '48px' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '3px' }}>
                        <div style={{ height: '12px', backgroundColor: '#DBEAFE', borderRadius: '2px' }} />
                        <div style={{ height: '12px', backgroundColor: '#DCFCE7', borderRadius: '2px' }} />
                        <div style={{ height: '12px', backgroundColor: '#FEF3C7', borderRadius: '2px' }} />
                      </div>
                      <div style={{ flex: 1, backgroundColor: '#FFFFFF', border: '1px solid #CBD5E1', borderRadius: '2px', display: 'flex', alignItems: 'flex-end', gap: '3px', padding: '3px 6px' }}>
                        <div style={{ height: '10px', width: '20%', backgroundColor: '#0066FF' }} />
                        <div style={{ height: '16px', width: '20%', backgroundColor: '#10B981' }} />
                        <div style={{ height: '7px', width: '20%', backgroundColor: '#F59E0B' }} />
                      </div>
                    </div>
                  )
                },
                {
                  id: 'OVERVIEW_PAGE',
                  label: 'Executive Overview Cards',
                  desc: 'Multi-card cockpit + quick queue',
                  sketch: (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px', padding: '6px', backgroundColor: '#F1F5F9', borderRadius: '4px', height: '48px' }}>
                      <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #CBD5E1', borderRadius: '2px' }} />
                      <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #CBD5E1', borderRadius: '2px' }} />
                      <div style={{ gridColumn: 'span 2', backgroundColor: '#FFFFFF', border: '1px solid #CBD5E1', borderRadius: '2px' }} />
                    </div>
                  )
                },
                {
                  id: 'FREESTYLE_WIZARD',
                  label: 'Step-by-Step Guided Wizard',
                  desc: 'Wizard form + review summary',
                  sketch: (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', padding: '6px', backgroundColor: '#F1F5F9', borderRadius: '4px', height: '48px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'center' }}>
                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#0066FF' }} />
                        <div style={{ height: '2px', width: '16px', backgroundColor: '#94A3B8' }} />
                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#CBD5E1' }} />
                      </div>
                      <div style={{ flex: 1, backgroundColor: '#FFFFFF', border: '1px solid #CBD5E1', borderRadius: '2px', padding: '3px 6px' }}>
                        <div style={{ height: '4px', width: '60%', backgroundColor: '#CBD5E1', marginBottom: '3px' }} />
                        <div style={{ height: '6px', width: '90%', backgroundColor: '#E2E8F0' }} />
                      </div>
                    </div>
                  )
                }
              ] as Array<{ id: FioriFloorplanType; label: string; desc: string; sketch: React.ReactNode }>).map((fp) => {
                const currentFloorplan = project.requirementsSpec?.uiPreferences?.floorplan || 'LIST_REPORT_OBJECT_PAGE';
                const isSelected = currentFloorplan === fp.id;
                return (
                  <button
                    key={fp.id}
                    type="button"
                    onClick={async () => {
                      const nextPrefs: RequirementsUiPreferences = {
                        ...(project.requirementsSpec?.uiPreferences || {}),
                        floorplan: fp.id
                      };
                      try {
                        const updated = await defaultFrontendGenerationProjectService.updateProject(project.projectId, {
                          requirementsSpec: { ...project.requirementsSpec, uiPreferences: nextPrefs }
                        });
                        onProjectUpdated(updated);
                        setActionSuccess(`UI Floorplan updated to ${fp.label}`);
                      } catch (err: any) {
                        setError(err?.message || 'Failed to update floorplan');
                      }
                    }}
                    style={{
                      textAlign: 'left',
                      padding: '10px',
                      borderRadius: '8px',
                      border: isSelected ? '2px solid #0066FF' : '1px solid #E2E8F0',
                      backgroundColor: isSelected ? '#EFF6FF' : '#FFFFFF',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px'
                    }}
                  >
                    {fp.sketch}
                    <div>
                      <div style={{ fontSize: '12.5px', fontWeight: 700, color: isSelected ? '#0066FF' : '#0F172A' }}>
                        {fp.label}
                      </div>
                      <div style={{ fontSize: '11px', color: '#64748B', marginTop: '2px' }}>
                        {fp.desc}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap', paddingTop: '8px', borderTop: '1px solid #F1F5F9', fontSize: '12.5px', color: '#334155' }}>
              <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontWeight: 600 }}>
                <input
                  type="checkbox"
                  checked={Boolean(project.requirementsSpec?.uiPreferences?.bulkActions)}
                  onChange={async (e) => {
                    const nextPrefs: RequirementsUiPreferences = {
                      ...(project.requirementsSpec?.uiPreferences || {}),
                      bulkActions: e.target.checked
                    };
                    try {
                      const updated = await defaultFrontendGenerationProjectService.updateProject(project.projectId, {
                        requirementsSpec: { ...project.requirementsSpec, uiPreferences: nextPrefs }
                      });
                      onProjectUpdated(updated);
                    } catch (err: any) {
                      setError(err?.message || 'Failed to update UI preference');
                    }
                  }}
                />
                Enable Bulk Actions
              </label>
              <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontWeight: 600 }}>
                <input
                  type="checkbox"
                  checked={Boolean(project.requirementsSpec?.uiPreferences?.statusBadge)}
                  onChange={async (e) => {
                    const nextPrefs: RequirementsUiPreferences = {
                      ...(project.requirementsSpec?.uiPreferences || {}),
                      statusBadge: e.target.checked
                    };
                    try {
                      const updated = await defaultFrontendGenerationProjectService.updateProject(project.projectId, {
                        requirementsSpec: { ...project.requirementsSpec, uiPreferences: nextPrefs }
                      });
                      onProjectUpdated(updated);
                    } catch (err: any) {
                      setError(err?.message || 'Failed to update UI preference');
                    }
                  }}
                />
                Semantic Status Badges
              </label>
              <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontWeight: 600 }}>
                <input
                  type="checkbox"
                  checked={Boolean(project.requirementsSpec?.uiPreferences?.kpiHeader)}
                  onChange={async (e) => {
                    const nextPrefs: RequirementsUiPreferences = {
                      ...(project.requirementsSpec?.uiPreferences || {}),
                      kpiHeader: e.target.checked
                    };
                    try {
                      const updated = await defaultFrontendGenerationProjectService.updateProject(project.projectId, {
                        requirementsSpec: { ...project.requirementsSpec, uiPreferences: nextPrefs }
                      });
                      onProjectUpdated(updated);
                    } catch (err: any) {
                      setError(err?.message || 'Failed to update UI preference');
                    }
                  }}
                />
                KPI Summary Header
              </label>
            </div>

            {/* Extended UI Customization Controls */}
            {(() => {
              const prefs: RequirementsUiPreferences = project.requirementsSpec?.uiPreferences || {};
              const rootEntity = project.dataModelSpec?.entities?.find((e) => e.entityType === 'ROOT' || e.isRoot) || project.dataModelSpec?.entities?.[0];
              const entityFields = rootEntity?.fields || [];
              const selectedCols = Array.isArray(prefs.visibleColumns) && prefs.visibleColumns.length > 0
                ? prefs.visibleColumns
                : entityFields.slice(0, 6).map((f) => f.name);
              const customActions = Array.isArray(prefs.customActions) ? prefs.customActions : [];

              const savePrefs = async (patch: Partial<RequirementsUiPreferences>) => {
                const nextPrefs: RequirementsUiPreferences = { ...prefs, ...patch };
                try {
                  const updated = await defaultFrontendGenerationProjectService.updateProject(project.projectId, {
                    requirementsSpec: { ...project.requirementsSpec, uiPreferences: nextPrefs }
                  });
                  onProjectUpdated(updated);
                } catch (err: any) {
                  setError(err?.message || 'Failed to update UI preferences');
                }
              };

              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', paddingTop: '10px', borderTop: '1px solid #E2E8F0' }}>
                  {/* Row 1: App Title & Density */}
                  <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '12px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                        App Page Title
                      </label>
                      <input
                        type="text"
                        defaultValue={prefs.pageTitle || project.projectName}
                        onBlur={(e) => savePrefs({ pageTitle: e.target.value })}
                        placeholder="e.g. Purchase Order Release Cockpit"
                        style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '12.5px', boxSizing: 'border-box' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                        UI Density
                      </label>
                      <select
                        value={prefs.uiDensity || 'COMPACT'}
                        onChange={(e) => savePrefs({ uiDensity: e.target.value as 'COMPACT' | 'COZY' })}
                        style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '12.5px', backgroundColor: '#F8FAFC' }}
                      >
                        <option value="COMPACT">Compact (Desktop Enterprise)</option>
                        <option value="COZY">Cozy (Touch / Tablet Friendly)</option>
                      </select>
                    </div>
                  </div>

                  {/* Row 2: Visible Columns Picker */}
                  {entityFields.length > 0 && (
                    <div>
                      <div style={{ fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                        Visible Table / Card Columns ({selectedCols.length} selected)
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                        {entityFields.map((f) => {
                          const active = selectedCols.includes(f.name);
                          return (
                            <button
                              key={f.name}
                              type="button"
                              onClick={() => {
                                const nextCols = active
                                  ? selectedCols.filter((c) => c !== f.name)
                                  : [...selectedCols, f.name];
                                if (nextCols.length > 0) savePrefs({ visibleColumns: nextCols });
                              }}
                              style={{
                                padding: '4px 10px',
                                borderRadius: '999px',
                                border: active ? '1px solid #0066FF' : '1px solid #CBD5E1',
                                backgroundColor: active ? '#EFF6FF' : '#F8FAFC',
                                color: active ? '#0066FF' : '#475569',
                                fontSize: '11.5px',
                                fontWeight: 600,
                                cursor: 'pointer'
                              }}
                            >
                              {active ? '✓ ' : '+ '}{f.label || f.name}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Row 3: Custom Toolbar / Row Actions */}
                  <div>
                    <div style={{ fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                      Custom UI Action Buttons
                    </div>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                      {customActions.map((act, idx) => (
                        <span
                          key={`${act.label}-${idx}`}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '4px 10px',
                            borderRadius: '999px',
                            backgroundColor: '#ECFDF5',
                            border: '1px solid #A7F3D0',
                            color: '#065F46',
                            fontSize: '12px',
                            fontWeight: 600
                          }}
                        >
                          {act.label}
                          <button
                            type="button"
                            onClick={() => savePrefs({ customActions: customActions.filter((_, i) => i !== idx) })}
                            style={{ border: 'none', background: 'transparent', color: '#065F46', cursor: 'pointer', padding: 0, fontWeight: 700 }}
                          >
                            ×
                          </button>
                        </span>
                      ))}
                      <input
                        type="text"
                        value={customActionInput}
                        onChange={(e) => setCustomActionInput(e.target.value)}
                        placeholder="Add button (e.g. Release PO)"
                        style={{ padding: '5px 10px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '12px', width: '200px' }}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const label = customActionInput.trim();
                          if (!label) return;
                          savePrefs({ customActions: [...customActions, { label }] });
                          setCustomActionInput('');
                        }}
                        style={{ padding: '5px 12px', borderRadius: '6px', border: 'none', backgroundColor: '#0066FF', color: '#FFFFFF', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
                      >
                        + Add Action
                      </button>
                    </div>
                  </div>

                  {/* Row 4: Custom UI Instructions */}
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                      Additional UI / Layout Instructions
                    </label>
                    <textarea
                      rows={2}
                      defaultValue={prefs.customUiNotes || ''}
                      onBlur={(e) => savePrefs({ customUiNotes: e.target.value })}
                      placeholder="e.g. Highlight overdue items in red, group line items by vendor..."
                      style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '12.5px', boxSizing: 'border-box' }}
                    />
                  </div>
                </div>
              );
            })()}
          </div>
      </div>
      )}

      {/* Action Dialog (Confirm with comment / Defer with reason / Reject with reason) */}
      {actionDialog.open && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}
        >
          <div
            style={{
              background: '#fff',
              borderRadius: '8px',
              padding: '24px',
              width: '460px',
              maxWidth: '90%',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px'
            }}
          >
            <div style={{ fontWeight: 600, fontSize: '16px', color: '#1e293b' }}>
              {actionDialog.action === 'CONFIRM' && 'Confirm Requirement'}
              {actionDialog.action === 'DEFER' && 'Defer Requirement to Later Phase'}
              {actionDialog.action === 'REJECT' && 'Reject Requirement'}
            </div>

            <div style={{ fontSize: '13px', color: '#64748b' }}>
              {actionDialog.action === 'CONFIRM'
                ? 'Optional architect sign-off comment for this confirmation.'
                : 'A documented architectural reason is mandatory for governance compliance.'}
            </div>

            <textarea
              rows={3}
              placeholder={actionDialog.action === 'CONFIRM' ? 'Optional comment...' : 'Documented reason (mandatory)...'}
              value={actionDialog.reason}
              onChange={(e) => setActionDialog({ ...actionDialog, reason: e.target.value })}
              style={{ padding: '8px 10px', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '13px' }}
            />

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                onClick={() => setActionDialog({ open: false, action: 'CONFIRM', reqId: '', reason: '' })}
                style={{ padding: '6px 12px', background: '#fff', border: '1px solid #cbd5e1', borderRadius: '4px', cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                onClick={handleExecuteAction}
                style={{
                  padding: '6px 14px',
                  background: actionDialog.action === 'CONFIRM' ? '#16a34a' : '#0284c7',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '4px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Submit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
