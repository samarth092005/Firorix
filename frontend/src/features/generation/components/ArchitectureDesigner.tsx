import React, { useState, useEffect } from 'react';
import {
  Cpu,
  Layers,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  HardDrive,
  RefreshCw,
  Save,
  ArrowRight,
  Info,
  Check,
  FileCode2
} from 'lucide-react';
import { GenerationProject, ArchitectureSpec, StudioInternalView } from '../types';
import { frontendGenerationProjectService } from '../services/generationProjectService';

interface ArchitectureDesignerProps {
  project: GenerationProject;
  onProjectUpdated: (updated: GenerationProject) => void;
  onNavigateView: (view: StudioInternalView) => void;
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

  // Edit state overrides
  const [profileOverride, setProfileOverride] = useState<string>('');
  const [draftEnabled, setDraftEnabled] = useState<boolean>(true);
  const [rootTable, setRootTable] = useState<string>('');
  const [draftTable, setDraftTable] = useState<string>('');

  useEffect(() => {
    loadArchitecture();
  }, [project.projectId]);

  const loadArchitecture = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await frontendGenerationProjectService.getArchitecture(project.projectId);
      setArchitecture(res.architecture);
      setProfileOverride(res.architecture.selectedProfile);
      setDraftEnabled(res.architecture.draftDecision?.enabled ?? true);
      setRootTable(res.architecture.rootEntity?.tableName || '');
      setDraftTable(res.architecture.rootEntity?.draftTableName || '');
    } catch (err: any) {
      setError(err.message || 'Failed to evaluate architecture');
    } finally {
      setIsLoading(false);
    }
  };

  const handleReevaluate = async () => {
    setIsLoading(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const res = await frontendGenerationProjectService.evaluateArchitecture(project.projectId, {
        rapProfile: profileOverride || undefined,
        draftEnabled,
        rootPersistenceTable: rootTable || undefined,
        draftPersistenceTable: draftTable || undefined
      });
      setArchitecture(res.architecture);
      setSuccessMsg('Architecture re-evaluated successfully.');
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
    try {
      const patch = {
        selectedProfile: profileOverride,
        draftDecision: {
          ...architecture.draftDecision,
          enabled: draftEnabled
        },
        rootEntity: architecture.rootEntity ? {
          ...architecture.rootEntity,
          tableName: rootTable,
          draftTableName: draftEnabled ? draftTable : null
        } : null
      };
      const res = await frontendGenerationProjectService.updateArchitecture(project.projectId, patch);
      setArchitecture(res.architecture);
      setSuccessMsg('Architecture specifications updated.');
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
        <p>Evaluating RAP architecture rules against confirmed project specifications...</p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header Banner */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: '#FFFFFF',
          padding: '20px 24px',
          borderRadius: '8px',
          border: '1px solid #E2E8F0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
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
          </div>
          <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#64748B' }}>
            Deterministic SAP S/4HANA 2023 Clean Core RAP pattern formulation.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            type="button"
            onClick={handleReevaluate}
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
            <RefreshCw size={14} /> Re-evaluate Rules
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
              backgroundColor: '#0066FF',
              border: 'none',
              borderRadius: '6px',
              fontSize: '13px',
              fontWeight: 600,
              color: '#FFFFFF',
              cursor: 'pointer'
            }}
          >
            <Save size={14} /> {isSaving ? 'Saving...' : 'Save Architecture'}
          </button>
          <button
            type="button"
            onClick={() => onNavigateView('abap-generator')}
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
            Proceed to ABAP Generator <ArrowRight size={14} />
          </button>
        </div>
      </div>

      {error && (
        <div style={{ padding: '12px 16px', backgroundColor: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: '6px', color: '#991B1B', fontSize: '13px' }}>
          {error}
        </div>
      )}

      {successMsg && (
        <div style={{ padding: '12px 16px', backgroundColor: '#ECFDF5', border: '1px solid #6EE7B7', borderRadius: '6px', color: '#065F46', fontSize: '13px' }}>
          {successMsg}
        </div>
      )}

      {/* Main Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '20px' }}>
        {/* Left Column: Pattern & Decisions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Profile Card */}
          <div style={{ backgroundColor: '#FFFFFF', padding: '20px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#0F172A', margin: '0 0 12px' }}>
              1. Selected RAP Architectural Profile
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#475569' }}>
                RAP Architecture Profile
              </label>
              <select
                value={profileOverride}
                onChange={(e) => setProfileOverride(e.target.value)}
                style={{
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: '1px solid #CBD5E1',
                  fontSize: '13px',
                  fontWeight: 600,
                  backgroundColor: '#F8FAFC'
                }}
              >
                <option value="MANAGED_RAP_DRAFT">MANAGED_RAP_DRAFT (Managed with Draft — Recommended for S/4HANA 2023)</option>
                <option value="MANAGED_RAP_NON_DRAFT">MANAGED_RAP_NON_DRAFT (Direct Transactional Save)</option>
                <option value="UNMANAGED_RAP">UNMANAGED_RAP (Legacy BAPI / Existing Persistence Delegate)</option>
                <option value="READ_ONLY_QUERY">READ_ONLY_QUERY (Analytical / Reporting Only)</option>
                <option value="ARCHITECTURE_REVIEW_REQUIRED">ARCHITECTURE_REVIEW_REQUIRED (Manual Review)</option>
              </select>

              <div style={{ marginTop: '10px', padding: '12px', backgroundColor: '#EFF6FF', borderRadius: '6px', border: '1px solid #BFDBFE' }}>
                <div style={{ fontSize: '12px', fontWeight: 700, color: '#1E40AF', marginBottom: '4px' }}>
                  Architecture Rationale:
                </div>
                <div style={{ fontSize: '12px', color: '#1E3A8A', lineHeight: 1.5 }}>
                  {architecture?.rationale || 'Evaluating rationale...'}
                </div>
              </div>
            </div>
          </div>

          {/* Persistence Model Card */}
          <div style={{ backgroundColor: '#FFFFFF', padding: '20px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#0F172A', margin: '0 0 12px' }}>
              2. Persistence Model & Tables
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#475569' }}>
                  Root Active Table (Transparent)
                </label>
                <input
                  type="text"
                  value={rootTable}
                  onChange={(e) => setRootTable(e.target.value.toUpperCase())}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px', marginTop: '4px' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#475569' }}>
                  Draft Table Name
                </label>
                <input
                  type="text"
                  disabled={!draftEnabled}
                  value={draftTable}
                  onChange={(e) => setDraftTable(e.target.value.toUpperCase())}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px', marginTop: '4px', backgroundColor: !draftEnabled ? '#F1F5F9' : '#FFFFFF' }}
                />
              </div>
            </div>

            <div style={{ marginTop: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input
                type="checkbox"
                id="draftToggle"
                checked={draftEnabled}
                onChange={(e) => setDraftEnabled(e.target.checked)}
              />
              <label htmlFor="draftToggle" style={{ fontSize: '13px', fontWeight: 600, color: '#334155', cursor: 'pointer' }}>
                Enable Draft Persistence for Fiori Elements List Report & Object Page editing
              </label>
            </div>
          </div>
        </div>

        {/* Right Column: Governance & Standards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Clean Core Card */}
          <div style={{ backgroundColor: '#FFFFFF', padding: '20px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <ShieldCheck size={18} color="#059669" />
              <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#0F172A', margin: 0 }}>
                Clean Core Governance
              </h3>
            </div>

            <div style={{ fontSize: '12px', color: '#475569', lineHeight: 1.6 }}>
              <div style={{ fontWeight: 700, color: '#0F172A', marginBottom: '4px' }}>
                Tier: {architecture?.cleanCoreImplications?.tier || 'TIER_2_DEV_EXT'}
              </div>
              <ul style={{ margin: '4px 0 0', paddingLeft: '18px' }}>
                {(architecture?.cleanCoreImplications?.notes || []).map((n, i) => (
                  <li key={i}>{n}</li>
                ))}
              </ul>
            </div>
          </div>

          {/* Runtime Strategies */}
          <div style={{ backgroundColor: '#FFFFFF', padding: '20px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#0F172A', margin: '0 0 12px' }}>
              Runtime Strategies
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12px', color: '#475569' }}>
              <div><strong>Lock Strategy:</strong> <code>{architecture?.lockStrategy || 'LOCK_MASTER'}</code></div>
              <div><strong>ETag Strategy:</strong> <code>{architecture?.etagStrategy || 'ETAG_MASTER_LOCAL_LAST_CHANGED_AT'}</code></div>
              <div><strong>Authorization:</strong> <code>{architecture?.authorizationStrategy || 'CHECK_DCL_AND_RAP_MASTER'}</code></div>
              <div><strong>Service Protocol:</strong> <code>{architecture?.serviceProtocol || 'ODATA_V4_UI'}</code></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
