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
  RefreshCw
} from 'lucide-react';
import {
  GenerationProject,
  GenerationRequirement,
  RequirementCategory,
  RequirementPriority,
  RequirementStatus,
  RequirementsSummary,
  StudioInternalView
} from '../types';
import { defaultFrontendGenerationProjectService } from '../services/generationProjectService';

interface RequirementsDesignerProps {
  project: GenerationProject;
  onProjectUpdated: (updatedProject: GenerationProject) => void;
  onNavigateView: (view: StudioInternalView) => void;
}

const CATEGORY_LABELS: Record<RequirementCategory, string> = {
  BUSINESS: 'Business Requirement',
  FUNCTIONAL: 'Functional Requirement',
  TECHNICAL: 'Technical / Architecture',
  NON_FUNCTIONAL: 'Non-Functional (Security/Perf)',
  DATA_READ: 'Data Read / Query',
  DATA_CREATE: 'Data Create / Insert',
  DATA_UPDATE: 'Data Update / Change',
  DATA_DELETE: 'Data Deletion',
  BUSINESS_RULE: 'Business Rule',
  VALIDATION: 'Field & Entity Validation',
  DETERMINATION: 'Field Determination',
  ACTION: 'Custom Business Action',
  UI_INTERACTION: 'UI & Interaction',
  AUTHORIZATION: 'Authorization & Security',
  REPORTING: 'Reporting & Analytics',
  INTEGRATION: 'Integration & API',
  OTHER: 'General / Other'
};

const PRIORITY_BADGES: Record<RequirementPriority, { label: string; bg: string; text: string }> = {
  MUST_HAVE: { label: 'Must Have', bg: '#fee2e2', text: '#991b1b' },
  SHOULD_HAVE: { label: 'Should Have', bg: '#fef3c7', text: '#92400e' },
  NICE_TO_HAVE: { label: 'Nice to Have', bg: '#f1f5f9', text: '#475569' }
};

const STATUS_CONFIG: Record<RequirementStatus, { label: string; bg: string; text: string; icon: any }> = {
  CONFIRMED: { label: 'Confirmed', bg: '#ecfdf5', text: '#065f46', icon: CheckCircle2 },
  DRAFT: { label: 'Pending Review', bg: '#f8fafc', text: '#475569', icon: Clock },
  NEEDS_CLARIFICATION: { label: 'Needs Clarification', bg: '#fffbeb', text: '#b45309', icon: HelpCircle },
  DEFERRED: { label: 'Deferred', bg: '#f1f5f9', text: '#64748b', icon: AlertCircle },
  REJECTED: { label: 'Rejected', bg: '#fef2f2', text: '#991b1b', icon: XCircle }
};

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
      alert('A documented reason is mandatory when deferring or rejecting requirements.');
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
      {/* Top Lifecycle Gate Banner */}
      <div
        style={{
          padding: '16px 20px',
          background: summary?.allConfirmedOrResolved ? '#f0fdf4' : '#fffbeb',
          border: `1px solid ${summary?.allConfirmedOrResolved ? '#bbf7d0' : '#fde68a'}`,
          borderRadius: '8px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {summary?.allConfirmedOrResolved ? (
            <CheckCircle2 size={24} color="#16a34a" />
          ) : (
            <Clock size={24} color="#d97706" />
          )}
          <div>
            <div style={{ fontWeight: 600, color: '#1e293b' }}>
              {summary?.allConfirmedOrResolved
                ? 'Requirements Gate Confirmed — Ready for Data Model'
                : 'Requirements Review In Progress'}
            </div>
            <div style={{ fontSize: '12px', color: '#64748b' }}>
              {summary?.allConfirmedOrResolved
                ? 'All mandatory requirements have been confirmed or deferred with documented rationale. You can now design the CDS data model.'
                : `${summary?.pendingCount || 0} requirement(s) pending review. Confirm or defer each requirement to satisfy the governance gate.`}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          {summary?.allConfirmedOrResolved && (
            <button
              onClick={() => onNavigateView('data-model')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 16px',
                background: '#0284c7',
                color: '#fff',
                border: 'none',
                borderRadius: '6px',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Open Data Model Designer <ArrowRight size={16} />
            </button>
          )}

          <button
            onClick={handleImportAssessment}
            disabled={isLoading}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              background: '#fff',
              border: '1px solid #cbd5e1',
              borderRadius: '6px',
              color: '#334155',
              fontSize: '13px',
              fontWeight: 500,
              cursor: 'pointer'
            }}
          >
            <DownloadCloud size={15} /> Import Discovery Gaps
          </button>
        </div>
      </div>

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
        <div
          style={{
            padding: '12px 16px',
            background: '#ecfdf5',
            border: '1px solid #a7f3d0',
            color: '#065f46',
            borderRadius: '6px',
            fontSize: '13px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}
        >
          <span>{actionSuccess}</span>
          <button onClick={() => setActionSuccess(null)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
            ✕
          </button>
        </div>
      )}

      {/* Main Two-Column Layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '380px 1fr', gap: '16px', flex: 1, minHeight: '520px' }}>
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
                {requirements.some((r) => r.status !== 'CONFIRMED') && (
                  <button
                    onClick={handleConfirmAllRequirements}
                    disabled={isLoading}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '4px 10px',
                      background: '#10b981',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '4px',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                    title="Confirm all unconfirmed requirements for code generation"
                  >
                    <CheckCircle2 size={13} /> Confirm All ({requirements.filter((r) => r.status !== 'CONFIRMED').length})
                  </button>
                )}
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
