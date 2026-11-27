import React, { useState, useEffect } from 'react';
import {
  Cpu,
  ShieldCheck,
  AlertTriangle,
  RefreshCw,
  Save,
  ArrowRight,
  Info,
  FileCode2,
  Database,
  Layers,
  CheckCircle2
} from 'lucide-react';
import { GenerationProject, ArchitectureSpec, StudioInternalView } from '../types';
import { frontendGenerationProjectService } from '../services/generationProjectService';

interface ArchitectureDesignerProps {
  project: GenerationProject;
  onProjectUpdated: (updated: GenerationProject) => void;
  onNavigateView: (view: StudioInternalView) => void;
}

const PROFILE_OPTIONS = [
  {
    id: 'MANAGED_RAP_DRAFT',
    title: 'Managed RAP with Draft',
    badge: 'Recommended',
    summary: 'Full Create, Edit & Delete with temporary Draft saving for Fiori Elements apps.'
  },
  {
    id: 'MANAGED_RAP_NON_DRAFT',
    title: 'Managed RAP (Direct Save)',
    badge: 'Lightweight',
    summary: 'Create, Edit & Delete with immediate save — no draft table overhead.'
  },
  {
    id: 'UNMANAGED_RAP',
    title: 'Unmanaged RAP (Legacy BAPI)',
    badge: 'Existing Logic',
    summary: 'Delegates save & buffer to an existing SAP BAPI or custom Function Module.'
  },
  {
    id: 'READ_ONLY_QUERY',
    title: 'Read-Only Query',
    badge: 'Analytics / List',
    summary: 'Display, filter & export data only. No editing, no locking, and no draft tables.'
  }
] as const;

function stripAbapPrefix(name: string): string {
  const clean = name.replace(/[^a-zA-Z0-9_]/g, '');
  return clean.replace(/^(Z_I_|Z_C_|ZI_|ZC_|ZBP_I_|ZUI_|Z_)/i, '') || clean;
}

function formatStrategyLabel(code?: string): { label: string; detail: string } {
  switch (code) {
    case 'LOCK_MASTER':
      return { label: 'Pessimistic Lock Master', detail: code };
    case 'NONE_READ_ONLY':
      return { label: 'No Locking (Read-Only)', detail: code };
    case 'ETAG_MASTER_LOCAL_LAST_CHANGED_AT':
      return { label: 'Optimistic Concurrency (ETag)', detail: code };
    case 'NONE':
      return { label: 'No ETag Required', detail: code };
    case 'CHECK_DCL_AND_RAP_MASTER':
      return { label: 'CDS DCL + RAP Action Auth', detail: code };
    case 'CHECK_DCL_ONLY':
      return { label: 'CDS Access Control (DCL)', detail: code };
    default:
      return { label: code || 'Standard', detail: code || '' };
  }
}

export const ArchitectureDesigner: React.FC<ArchitectureDesignerProps> = ({
  project,
  onProjectUpdated,
  onNavigateView
}) => {
  const [architecture, setArchitecture] = useState<ArchitectureSpec | null>(project.architectureSpec || null);
  const [isLoading, setIsLoading] = useState<boolean>(!project.architectureSpec || !project.architectureSpec.selectedProfile);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Form state synchronized with backend architecture
  const [profileOverride, setProfileOverride] = useState<string>('MANAGED_RAP_DRAFT');
  const [draftEnabled, setDraftEnabled] = useState<boolean>(true);
  const [rootTable, setRootTable] = useState<string>('');
  const [draftTable, setDraftTable] = useState<string>('');
  const [serviceProtocol, setServiceProtocol] = useState<string>('ODATA_V4_UI');
  const [legacyDelegate, setLegacyDelegate] = useState<string>('');
  const [isDirty, setIsDirty] = useState<boolean>(false);

  const syncFromArchitecture = (arch: ArchitectureSpec) => {
    setArchitecture(arch);
    setProfileOverride(arch.selectedProfile);
    setDraftEnabled(arch.draftDecision?.enabled ?? (arch.selectedProfile === 'MANAGED_RAP_DRAFT'));
    setRootTable(arch.rootEntity?.tableName || '');
    setDraftTable(arch.rootEntity?.draftTableName || '');
    setServiceProtocol(arch.serviceProtocol || 'ODATA_V4_UI');
    setLegacyDelegate(arch.legacyDelegate || '');
    setIsDirty(false);
  };

  useEffect(() => {
    loadArchitecture();
  }, [project.projectId]);

  const loadArchitecture = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await frontendGenerationProjectService.getArchitecture(project.projectId);
      syncFromArchitecture(res.architecture);
    } catch (err: any) {
      setError(err.message || 'Failed to evaluate architecture');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectProfile = (newProfile: string) => {
    setProfileOverride(newProfile);
    setIsDirty(true);
    setSuccessMsg(null);
    if (newProfile === 'READ_ONLY_QUERY' || newProfile === 'MANAGED_RAP_NON_DRAFT') {
      setDraftEnabled(false);
    } else if (newProfile === 'MANAGED_RAP_DRAFT') {
      setDraftEnabled(true);
      if (!draftTable && rootTable) {
        setDraftTable(`${rootTable.slice(0, 14)}_D`);
      }
    }
  };

  const handleReevaluate = async () => {
    setIsLoading(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const res = await frontendGenerationProjectService.evaluateArchitecture(project.projectId, {});
      syncFromArchitecture(res.architecture);
      setSuccessMsg('Rules re-evaluated from Stage 1 requirements & data model.');
      const updatedProject = await frontendGenerationProjectService.getProject(project.projectId);
      onProjectUpdated(updatedProject);
    } catch (err: any) {
      setError(err.message || 'Failed to re-evaluate architecture');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!architecture) return;
    setIsSaving(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const effectiveDraft = profileOverride === 'READ_ONLY_QUERY' ? false : draftEnabled;
      const patch: any = {
        selectedProfile: profileOverride,
        serviceProtocol,
        legacyDelegate: profileOverride === 'UNMANAGED_RAP' ? legacyDelegate : null,
        draftDecision: {
          ...architecture.draftDecision,
          enabled: effectiveDraft
        },
        rootEntity: architecture.rootEntity ? {
          ...architecture.rootEntity,
          tableName: rootTable || architecture.rootEntity.tableName,
          draftTableName: effectiveDraft ? (draftTable || `${(rootTable || architecture.rootEntity.tableName).slice(0, 14)}_D`) : null
        } : null
      };
      const res = await frontendGenerationProjectService.updateArchitecture(project.projectId, patch);
      syncFromArchitecture(res.architecture);
      setSuccessMsg('Architecture saved and runtime strategies synchronized.');
      const updatedProject = await frontendGenerationProjectService.getProject(project.projectId);
      onProjectUpdated(updatedProject);
    } catch (err: any) {
      setError(err.message || 'Failed to save architecture');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: '#64748B' }}>
        <RefreshCw className="animate-spin" size={24} style={{ margin: '0 auto 12px' }} />
        <p>Evaluating RAP architecture rules against your project specifications...</p>
      </div>
    );
  }

  const isReadOnly = profileOverride === 'READ_ONLY_QUERY';
  const isUnmanaged = profileOverride === 'UNMANAGED_RAP';
  const stem = stripAbapPrefix(architecture?.rootEntity?.name || project.sourceTransactionCode || 'CUSTOM').toUpperCase();
  const protocolSuffix = serviceProtocol === 'ODATA_V2_UI' ? 'O2' : 'O4';

  const naming = {
    interfaceView: architecture?.namingBlueprint?.interfaceView && !isDirty
      ? architecture.namingBlueprint.interfaceView
      : `ZI_${stem}`.slice(0, 30),
    projectionView: architecture?.namingBlueprint?.projectionView && !isDirty
      ? architecture.namingBlueprint.projectionView
      : `ZC_${stem}`.slice(0, 30),
    behaviorPool: isReadOnly
      ? null
      : (architecture?.namingBlueprint?.behaviorPool && !isDirty ? architecture.namingBlueprint.behaviorPool : `ZBP_I_${stem}`.slice(0, 30)),
    serviceBinding: `ZUI_${stem}_${protocolSuffix}`.slice(0, 30),
    persistenceTable: isReadOnly ? null : (rootTable || architecture?.rootEntity?.tableName || `Z${stem.slice(0, 10)}_ROOT`),
    draftTable: !isReadOnly && draftEnabled ? (draftTable || architecture?.rootEntity?.draftTableName || `Z${stem.slice(0, 13)}_D`) : null
  };

  const lockInfo = formatStrategyLabel(architecture?.lockStrategy);
  const etagInfo = formatStrategyLabel(architecture?.etagStrategy);
  const authInfo = formatStrategyLabel(architecture?.authorizationStrategy);
  const unresolved = architecture?.unresolvedDesignDecisions || [];

  const dmUpdated = (project.dataModelSpec as any)?.updatedAt ? new Date((project.dataModelSpec as any).updatedAt).getTime() : 0;
  const archEvaluated = (architecture as any)?.evaluatedAt
    ? new Date((architecture as any).evaluatedAt).getTime()
    : ((architecture as any)?.updatedAt ? new Date((architecture as any).updatedAt).getTime() : 0);
  const isStale = dmUpdated > 0 && archEvaluated > 0 && dmUpdated > archEvaluated;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
      {/* Header Banner */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
          backgroundColor: '#FFFFFF',
          padding: '18px 22px',
          borderRadius: '8px',
          border: '1px solid #E2E8F0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <Cpu size={20} color="#0066FF" />
            <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#0F172A', margin: 0 }}>
              RAP Architecture Designer
            </h2>
            <span
              style={{
                fontSize: '11px',
                padding: '2px 8px',
                borderRadius: '4px',
                fontWeight: 700,
                backgroundColor: architecture?.status === 'CONFIRMED' ? '#ECFDF5' : '#FFFBEB',
                color: architecture?.status === 'CONFIRMED' ? '#065F46' : '#B45309'
              }}
            >
              {architecture?.status || 'PENDING'}
            </span>
            {isDirty && (
              <span
                style={{
                  fontSize: '11px',
                  padding: '2px 8px',
                  borderRadius: '4px',
                  fontWeight: 600,
                  backgroundColor: '#FEF3C7',
                  color: '#92400E'
                }}
              >
                Unsaved Changes
              </span>
            )}
          </div>
          <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#64748B' }}>
            Pick how your S/4HANA 2023 app handles data, drafts, and OData services before generating code.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={handleReevaluate}
            title="Reset overrides and re-calculate from Stage 1 Requirements & Data Model"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              backgroundColor: '#F1F5F9',
              border: '1px solid #CBD5E1',
              borderRadius: '6px',
              fontSize: '13px',
              fontWeight: 600,
              color: '#334155',
              cursor: 'pointer'
            }}
          >
            <RefreshCw size={14} /> Auto-Detect from Rules
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              backgroundColor: isDirty ? '#D97706' : '#0066FF',
              border: 'none',
              borderRadius: '6px',
              fontSize: '13px',
              fontWeight: 600,
              color: '#FFFFFF',
              cursor: 'pointer'
            }}
          >
            <Save size={14} /> {isSaving ? 'Saving...' : (isDirty ? 'Save Changes' : 'Save Architecture')}
          </button>
          <button
            type="button"
            onClick={() => onNavigateView('spec-lifecycle')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 16px',
              backgroundColor: '#0F172A',
              border: 'none',
              borderRadius: '6px',
              fontSize: '13px',
              fontWeight: 600,
              color: '#FFFFFF',
              cursor: 'pointer'
            }}
          >
            Proceed to Readiness & Governance <ArrowRight size={14} />
          </button>
        </div>
      </div>

      {/* Stale Architecture Warning */}
      {isStale && (
        <div style={{ padding: '12px 16px', backgroundColor: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: '8px', color: '#92400E', fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertTriangle size={16} color="#D97706" />
            <span><strong>Data Model Updated:</strong> Re-evaluate to sync table names and entity structure.</span>
          </div>
          <button
            type="button"
            onClick={handleReevaluate}
            style={{ padding: '5px 12px', backgroundColor: '#F59E0B', color: '#FFFFFF', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
          >
            Sync Now
          </button>
        </div>
      )}

      {/* Unresolved Design Decisions / Warnings */}
      {unresolved.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {unresolved.map((dec) => {
            const isBlocking = dec.severity === 'BLOCKING';
            return (
              <div
                key={dec.id}
                style={{
                  padding: '12px 16px',
                  backgroundColor: isBlocking ? '#FEF2F2' : '#FFFBEB',
                  border: `1px solid ${isBlocking ? '#FECACA' : '#FDE68A'}`,
                  borderRadius: '8px',
                  color: isBlocking ? '#991B1B' : '#92400E',
                  fontSize: '13px',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '10px'
                }}
              >
                <AlertTriangle size={16} color={isBlocking ? '#DC2626' : '#D97706'} style={{ flexShrink: 0, marginTop: '2px' }} />
                <div>
                  <div style={{ fontWeight: 700 }}>{dec.description}</div>
                  <div style={{ fontSize: '12px', marginTop: '2px', opacity: 0.9 }}>{dec.resolution}</div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {error && (
        <div style={{ padding: '12px 16px', backgroundColor: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: '6px', color: '#991B1B', fontSize: '13px' }}>
          {error}
        </div>
      )}

      {successMsg && (
        <div style={{ padding: '12px 16px', backgroundColor: '#ECFDF5', border: '1px solid #6EE7B7', borderRadius: '6px', color: '#065F46', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <CheckCircle2 size={16} /> {successMsg}
        </div>
      )}

      {/* Main Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.25fr 0.75fr', gap: '20px', alignItems: 'start' }}>
        {/* Left Column: Pattern & Persistence */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* 1. Pattern Selector Card */}
          <div style={{ backgroundColor: '#FFFFFF', padding: '20px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#0F172A', margin: '0 0 4px' }}>
              1. Choose RAP Pattern
            </h3>
            <p style={{ fontSize: '12px', color: '#64748B', margin: '0 0 14px' }}>
              Select the behavior model for your Fiori application.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              {PROFILE_OPTIONS.map((opt) => {
                const selected = profileOverride === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => handleSelectProfile(opt.id)}
                    style={{
                      textAlign: 'left',
                      padding: '12px',
                      borderRadius: '8px',
                      border: selected ? '2px solid #0066FF' : '1px solid #CBD5E1',
                      backgroundColor: selected ? '#EFF6FF' : '#FFFFFF',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontSize: '13px', fontWeight: 700, color: selected ? '#1D4ED8' : '#0F172A' }}>
                        {opt.title}
                      </span>
                      <span
                        style={{
                          fontSize: '10px',
                          fontWeight: 700,
                          padding: '2px 6px',
                          borderRadius: '4px',
                          backgroundColor: selected ? '#DBEAFE' : '#F1F5F9',
                          color: selected ? '#1E40AF' : '#475569'
                        }}
                      >
                        {opt.badge}
                      </span>
                    </div>
                    <span style={{ fontSize: '11.5px', color: '#475569', lineHeight: 1.4 }}>
                      {opt.summary}
                    </span>
                  </button>
                );
              })}
            </div>

            {profileOverride === 'ARCHITECTURE_REVIEW_REQUIRED' && (
              <div style={{ marginTop: '10px', padding: '10px 12px', backgroundColor: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: '6px', fontSize: '12px', color: '#92400E' }}>
                <strong>Manual Review Required:</strong> Pick one of the 4 patterns above once your Data Model has a Root entity.
              </div>
            )}

            <div style={{ marginTop: '14px', padding: '12px', backgroundColor: '#F8FAFC', borderRadius: '6px', border: '1px solid #E2E8F0' }}>
              <div style={{ fontSize: '11.5px', fontWeight: 700, color: '#334155', marginBottom: '3px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Info size={14} color="#0066FF" /> Why this pattern:
              </div>
              <div style={{ fontSize: '12px', color: '#475569', lineHeight: 1.5 }}>
                {architecture?.rationale || 'Evaluating rationale...'}
              </div>
            </div>
          </div>

          {/* 2. Persistence & Tables Card */}
          <div style={{ backgroundColor: '#FFFFFF', padding: '20px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <Database size={16} color="#0284C7" />
              <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#0F172A', margin: 0 }}>
                2. Persistence & Database Tables
              </h3>
            </div>
            <p style={{ fontSize: '12px', color: '#64748B', margin: '0 0 14px' }}>
              SAP DDIC table names are limited to 16 uppercase characters.
            </p>

            {isReadOnly ? (
              <div style={{ padding: '14px', backgroundColor: '#F0F9FF', border: '1px solid #BAE6FD', borderRadius: '6px', fontSize: '12.5px', color: '#0369A1', lineHeight: 1.5 }}>
                <strong>No custom tables needed:</strong> Read-Only Query apps read directly through CDS View Entities without generating custom active or draft tables.
              </div>
            ) : (
              <>
                {isUnmanaged && (
                  <div style={{ marginBottom: '14px' }}>
                    <label style={{ fontSize: '12px', fontWeight: 600, color: '#475569' }}>
                      Legacy BAPI / Function Module / Wrapper API
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. BAPI_WORKCENTER_CREATE or ZCL_CR01_WRAPPER"
                      value={legacyDelegate}
                      onChange={(e) => {
                        setLegacyDelegate(e.target.value.toUpperCase());
                        setIsDirty(true);
                      }}
                      style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px', marginTop: '4px', boxSizing: 'border-box' }}
                    />
                  </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                  <div>
                    <label style={{ fontSize: '12px', fontWeight: 600, color: '#475569' }}>
                      Root Active Table <span style={{ fontWeight: 400, color: '#94A3B8' }}>({rootTable.length}/16)</span>
                    </label>
                    <input
                      type="text"
                      maxLength={16}
                      placeholder="e.g. ZCR01_ROOT"
                      value={rootTable}
                      onChange={(e) => {
                        setRootTable(e.target.value.toUpperCase().slice(0, 16));
                        setIsDirty(true);
                      }}
                      style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px', marginTop: '4px', boxSizing: 'border-box' }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '12px', fontWeight: 600, color: '#475569' }}>
                      Draft Table <span style={{ fontWeight: 400, color: '#94A3B8' }}>{draftEnabled ? `(${draftTable.length}/16)` : '(Disabled)'}</span>
                    </label>
                    <input
                      type="text"
                      maxLength={16}
                      disabled={!draftEnabled}
                      placeholder={draftEnabled ? 'e.g. ZCR01_D' : 'Not used'}
                      value={draftEnabled ? draftTable : ''}
                      onChange={(e) => {
                        setDraftTable(e.target.value.toUpperCase().slice(0, 16));
                        setIsDirty(true);
                      }}
                      style={{
                        width: '100%',
                        padding: '8px 10px',
                        borderRadius: '6px',
                        border: '1px solid #CBD5E1',
                        fontSize: '13px',
                        marginTop: '4px',
                        boxSizing: 'border-box',
                        backgroundColor: !draftEnabled ? '#F1F5F9' : '#FFFFFF',
                        color: !draftEnabled ? '#94A3B8' : '#0F172A'
                      }}
                    />
                  </div>
                </div>

                <div style={{ marginTop: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input
                    type="checkbox"
                    id="draftToggle"
                    checked={draftEnabled}
                    disabled={profileOverride === 'MANAGED_RAP_NON_DRAFT'}
                    onChange={(e) => {
                      setDraftEnabled(e.target.checked);
                      setIsDirty(true);
                    }}
                  />
                  <label
                    htmlFor="draftToggle"
                    style={{
                      fontSize: '12.5px',
                      fontWeight: 600,
                      color: profileOverride === 'MANAGED_RAP_NON_DRAFT' ? '#94A3B8' : '#334155',
                      cursor: profileOverride === 'MANAGED_RAP_NON_DRAFT' ? 'not-allowed' : 'pointer'
                    }}
                  >
                    Enable Draft Persistence (for unsaved Fiori Object Page edits)
                  </label>
                </div>

                {architecture?.childEntities && architecture.childEntities.length > 0 && (
                  <div style={{ marginTop: '14px', paddingTop: '12px', borderTop: '1px solid #E2E8F0' }}>
                    <div style={{ fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                      Child Entity Tables ({architecture.childEntities.length})
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '12px', color: '#475569' }}>
                      {architecture.childEntities.map((c) => (
                        <div key={c.entityId} style={{ display: 'flex', justifyContent: 'space-between', backgroundColor: '#F8FAFC', padding: '6px 10px', borderRadius: '4px' }}>
                          <span>{c.businessName || c.name}</span>
                          <span>
                            Active: <code>{c.tableName}</code>
                            {draftEnabled && c.draftTableName ? <> · Draft: <code>{c.draftTableName}</code></> : null}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Right Column: What Gets Built, Naming, Governance & Runtime */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          {/* Stage 3 Output Preview */}
          <div style={{ backgroundColor: '#FFFFFF', padding: '18px 20px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
              <Layers size={16} color="#0066FF" />
              <h3 style={{ fontSize: '14.5px', fontWeight: 700, color: '#0F172A', margin: 0 }}>
                What Stage 3 Will Generate
              </h3>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {[
                'CDS Interface & Projection Views',
                'Metadata Extension (.mde)',
                'DCL Access Control',
                ...(isReadOnly ? [] : ['Transparent Active Table', 'Behavior Definition (BDEF)', 'Behavior Pool Class']),
                ...(!isReadOnly && draftEnabled ? ['Draft Table'] : []),
                `${serviceProtocol === 'ODATA_V2_UI' ? 'OData V2' : 'OData V4'} Service & Fiori App`
              ].map((item) => (
                <span
                  key={item}
                  style={{
                    fontSize: '11.5px',
                    padding: '4px 8px',
                    borderRadius: '999px',
                    backgroundColor: '#F1F5F9',
                    color: '#334155',
                    fontWeight: 600
                  }}
                >
                  {item}
                </span>
              ))}
            </div>
          </div>

          {/* ABAP Cloud Naming Blueprint */}
          <div style={{ backgroundColor: '#FFFFFF', padding: '18px 20px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
              <FileCode2 size={16} color="#0284C7" />
              <h3 style={{ fontSize: '14.5px', fontWeight: 700, color: '#0F172A', margin: 0 }}>
                ABAP Cloud Naming Blueprint
              </h3>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '12px', color: '#475569' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <strong>Interface View:</strong> <code>{naming.interfaceView}</code>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <strong>Projection View:</strong> <code>{naming.projectionView}</code>
              </div>
              {naming.behaviorPool && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <strong>Behavior Pool:</strong> <code>{naming.behaviorPool}</code>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <strong>Service Binding:</strong> <code>{naming.serviceBinding}</code>
              </div>
              {naming.persistenceTable && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <strong>Active Table:</strong> <code>{naming.persistenceTable}</code>
                </div>
              )}
              {naming.draftTable && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <strong>Draft Table:</strong> <code>{naming.draftTable}</code>
                </div>
              )}
            </div>
          </div>

          {/* Runtime & Service Settings */}
          <div style={{ backgroundColor: '#FFFFFF', padding: '18px 20px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
            <h3 style={{ fontSize: '14.5px', fontWeight: 700, color: '#0F172A', margin: '0 0 10px' }}>
              Runtime & Service Settings
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '12px', color: '#475569' }}>
              <div>
                <label style={{ display: 'block', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                  OData Service Protocol
                </label>
                <select
                  value={serviceProtocol}
                  onChange={(e) => {
                    setServiceProtocol(e.target.value);
                    setIsDirty(true);
                  }}
                  style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '12.5px', backgroundColor: '#F8FAFC' }}
                >
                  <option value="ODATA_V4_UI">OData V4 UI (Recommended for S/4HANA 2023)</option>
                  <option value="ODATA_V2_UI">OData V2 UI (Legacy Fiori compatibility)</option>
                  <option value="ODATA_V4_WEB_API">OData V4 Web API (Headless / Integration)</option>
                </select>
              </div>

              <div><strong>Locking:</strong> {lockInfo.label} <code style={{ fontSize: '11px', color: '#64748B' }}>({lockInfo.detail})</code></div>
              <div><strong>Concurrency:</strong> {etagInfo.label} <code style={{ fontSize: '11px', color: '#64748B' }}>({etagInfo.detail})</code></div>
              <div><strong>Authorization:</strong> {authInfo.label}</div>
            </div>
          </div>

          {/* Clean Core Governance */}
          <div style={{ backgroundColor: '#FFFFFF', padding: '18px 20px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
              <ShieldCheck size={16} color="#059669" />
              <h3 style={{ fontSize: '14.5px', fontWeight: 700, color: '#0F172A', margin: 0 }}>
                Clean Core Governance
              </h3>
            </div>

            <div style={{ fontSize: '12px', color: '#475569', lineHeight: 1.55 }}>
              <div style={{ fontWeight: 700, color: '#065F46', marginBottom: '4px' }}>
                Tier 2 — On-Stack ABAP Cloud ({architecture?.cleanCoreImplications?.tier || 'TIER_2_DEV_EXT'})
              </div>
              <ul style={{ margin: '4px 0 0', paddingLeft: '18px' }}>
                {(architecture?.cleanCoreImplications?.notes || []).map((n, i) => (
                  <li key={i}>{n}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
