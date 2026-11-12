import React, { useState, useEffect, useMemo } from 'react';
import {
  Code2,
  FileCode2,
  Table,
  Layers,
  Database,
  Cpu,
  RefreshCw,
  Copy,
  Check,
  Save,
  RotateCcw,
  ArrowRight,
  ShieldCheck,
  AlertCircle
} from 'lucide-react';
import { GenerationProject, GeneratedArtifact, StudioInternalView } from '../types';
import { frontendGenerationProjectService } from '../services/generationProjectService';

interface AbapGeneratorProps {
  project: GenerationProject;
  onProjectUpdated: (updated: GenerationProject) => void;
  onNavigateView: (view: StudioInternalView) => void;
}

export const AbapGenerator: React.FC<AbapGeneratorProps> = ({
  project,
  onProjectUpdated,
  onNavigateView
}) => {
  const [artifacts, setArtifacts] = useState<GeneratedArtifact[]>([]);
  const [selectedArtifactId, setSelectedArtifactId] = useState<string | null>(null);
  const [editorContent, setEditorContent] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [isSavingEdit, setIsSavingEdit] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);

  useEffect(() => {
    loadArtifacts();
  }, [project.projectId]);

  const loadArtifacts = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await frontendGenerationProjectService.getArtifacts(project.projectId);
      const abapArts = (res.artifacts || []).filter(
        (a) => a.language === 'ABAP' || a.artifactType.startsWith('RAP_') || a.artifactType.startsWith('CDS_') || a.artifactType === 'DDL_SOURCE' || a.objectName === 'README_ABAP'
      );
      setArtifacts(abapArts);
      if (abapArts.length > 0 && !selectedArtifactId) {
        setSelectedArtifactId(abapArts[0].artifactId);
        setEditorContent(abapArts[0].content);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load ABAP artifacts');
    } finally {
      setIsLoading(false);
    }
  };

  const selectedArtifact = useMemo(() => {
    return artifacts.find((a) => a.artifactId === selectedArtifactId) || null;
  }, [artifacts, selectedArtifactId]);

  useEffect(() => {
    if (selectedArtifact) {
      setEditorContent(selectedArtifact.content);
    }
  }, [selectedArtifact]);

  const handleGenerateAll = async () => {
    setIsGenerating(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const res = await frontendGenerationProjectService.generateAbap(project.projectId, { forceOverwrite: true });
      setSuccessMsg(`Successfully generated ${res.totalGenerated} ABAP/RAP artifacts!`);
      await loadArtifacts();
      const updated = await frontendGenerationProjectService.getProject(project.projectId);
      onProjectUpdated(updated);
    } catch (err: any) {
      setError(err.message || 'ABAP generation failed');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!selectedArtifactId) return;
    setIsSavingEdit(true);
    setError(null);
    try {
      const res = await frontendGenerationProjectService.updateArtifact(project.projectId, selectedArtifactId, editorContent);
      setSuccessMsg('Manual edit saved and SHA-256 checksum recomputed.');
      await loadArtifacts();
    } catch (err: any) {
      setError(err.message || 'Failed to save manual edit');
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleRestoreTemplate = async () => {
    if (!selectedArtifactId) return;
    if (!window.confirm('Restore this artifact to its original generated template? Any custom modifications will be discarded.')) {
      return;
    }
    setIsSavingEdit(true);
    setError(null);
    try {
      const res = await frontendGenerationProjectService.restoreArtifact(project.projectId, selectedArtifactId);
      setEditorContent(res.artifact.content);
      setSuccessMsg('Restored to template version.');
      await loadArtifacts();
    } catch (err: any) {
      setError(err.message || 'Failed to restore template');
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(editorContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRegenerateSingle = async () => {
    if (!selectedArtifactId || !selectedArtifact) return;
    if (
      selectedArtifact.manualEditStatus === 'MODIFIED' &&
      !window.confirm(
        `Warning: "${selectedArtifact.objectName}" has custom manual modifications. Regenerating will overwrite this specific file with the latest RAP template. Continue?`
      )
    ) {
      return;
    }
    setIsSavingEdit(true);
    setError(null);
    try {
      await frontendGenerationProjectService.regenerateAbap(project.projectId, {
        artifactId: selectedArtifactId,
        forceOverwrite: true
      });
      setSuccessMsg(`Artifact "${selectedArtifact.objectName}" regenerated successfully.`);
      await loadArtifacts();
      const updated = await frontendGenerationProjectService.getProject(project.projectId);
      onProjectUpdated(updated);
    } catch (err: any) {
      setError(err.message || 'Failed to regenerate artifact');
    } finally {
      setIsSavingEdit(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header Bar */}
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
            <Code2 size={20} color="#0066FF" />
            <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#0F172A', margin: 0 }}>
              ABAP / RAP Artifact Generator
            </h2>
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748B' }}>
              ({artifacts.length} generated objects)
            </span>
          </div>
          <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#64748B' }}>
            ABAP Cloud View Entities, Behavior Definitions, Service Definitions & DDL.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            type="button"
            onClick={handleGenerateAll}
            disabled={isGenerating}
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
            <RefreshCw size={14} className={isGenerating ? 'animate-spin' : ''} />
            {isGenerating ? 'Synthesizing...' : 'Generate All ABAP Artifacts'}
          </button>
          <button
            type="button"
            onClick={() => onNavigateView('ui-generator')}
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
            Proceed to Fiori UI Generator <ArrowRight size={14} />
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

      {/* Editor & File Tree Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '20px', minHeight: '600px' }}>
        {/* Left: Artifact File Tree */}
        <div
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '8px',
            border: '1px solid #E2E8F0',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column'
          }}
        >
          <div style={{ padding: '12px 16px', borderBottom: '1px solid #E2E8F0', backgroundColor: '#F8FAFC', fontWeight: 700, fontSize: '13px', color: '#334155' }}>
            Repository Artifacts
          </div>
          <div style={{ overflowY: 'auto', flex: 1, padding: '8px' }}>
            {artifacts.length === 0 ? (
              <div style={{ padding: '20px', textAlign: 'center', color: '#94A3B8', fontSize: '13px' }}>
                No artifacts generated yet. Click "Generate All ABAP Artifacts" above.
              </div>
            ) : (
              artifacts.map((a) => {
                const isSelected = a.artifactId === selectedArtifactId;
                const isModified = a.manualEditStatus === 'MODIFIED';

                return (
                  <button
                    key={a.artifactId}
                    type="button"
                    onClick={() => {
                      setSelectedArtifactId(a.artifactId);
                      setEditorContent(a.content);
                    }}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      width: '100%',
                      textAlign: 'left',
                      padding: '10px 12px',
                      borderRadius: '6px',
                      border: 'none',
                      backgroundColor: isSelected ? '#EFF6FF' : 'transparent',
                      color: isSelected ? '#1E40AF' : '#334155',
                      cursor: 'pointer',
                      marginBottom: '4px',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: isSelected ? 700 : 600, fontSize: '13px' }}>
                        {a.objectName}
                      </span>
                      {isModified && (
                        <span style={{ fontSize: '10px', fontWeight: 700, padding: '1px 5px', borderRadius: '3px', backgroundColor: '#FEF3C7', color: '#92400E' }}>
                          MODIFIED
                        </span>
                      )}
                    </div>
                    <span style={{ fontSize: '11px', color: '#64748B', marginTop: '2px' }}>
                      {a.filePath}
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right: Code Viewer & Editor */}
        <div
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '8px',
            border: '1px solid #E2E8F0',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden'
          }}
        >
          {selectedArtifact ? (
            <>
              {/* Editor Action Bar */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '12px 18px',
                  borderBottom: '1px solid #E2E8F0',
                  backgroundColor: '#F8FAFC'
                }}
              >
                <div>
                  <div style={{ fontWeight: 700, fontSize: '14px', color: '#0F172A' }}>
                    {selectedArtifact.filePath}
                  </div>
                  <div style={{ fontSize: '11px', color: '#64748B', fontFamily: 'monospace' }}>
                    SHA-256: {selectedArtifact.checksum.slice(0, 16)}... | Type: {selectedArtifact.artifactType}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={handleCopy}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '6px 12px',
                      backgroundColor: '#FFFFFF',
                      border: '1px solid #CBD5E1',
                      borderRadius: '4px',
                      fontSize: '12px',
                      fontWeight: 600,
                      color: '#475569',
                      cursor: 'pointer'
                    }}
                  >
                    {copied ? <Check size={14} color="#059669" /> : <Copy size={14} />}
                    {copied ? 'Copied!' : 'Copy Source'}
                  </button>

                  <button
                    type="button"
                    onClick={handleRegenerateSingle}
                    disabled={isSavingEdit}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '6px 12px',
                      backgroundColor: '#FFFFFF',
                      border: '1px solid #CBD5E1',
                      borderRadius: '4px',
                      fontSize: '12px',
                      fontWeight: 600,
                      color: '#475569',
                      cursor: isSavingEdit ? 'not-allowed' : 'pointer'
                    }}
                    title="Regenerate only this artifact from current model without overwriting others"
                  >
                    <RefreshCw size={14} /> Regenerate Artifact
                  </button>

                  {selectedArtifact.manualEditStatus === 'MODIFIED' && (
                    <button
                      type="button"
                      onClick={handleRestoreTemplate}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '6px 12px',
                        backgroundColor: '#FFFBEB',
                        border: '1px solid #FCD34D',
                        borderRadius: '4px',
                        fontSize: '12px',
                        fontWeight: 600,
                        color: '#B45309',
                        cursor: 'pointer'
                      }}
                    >
                      <RotateCcw size={14} /> Restore Template
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={handleSaveEdit}
                    disabled={isSavingEdit}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '6px 12px',
                      backgroundColor: '#0066FF',
                      border: 'none',
                      borderRadius: '4px',
                      fontSize: '12px',
                      fontWeight: 600,
                      color: '#FFFFFF',
                      cursor: 'pointer'
                    }}
                  >
                    <Save size={14} /> Save Edit
                  </button>
                </div>
              </div>

              {/* Code TextArea */}
              <textarea
                value={editorContent}
                onChange={(e) => setEditorContent(e.target.value)}
                style={{
                  flex: 1,
                  padding: '16px',
                  fontFamily: 'Consolas, Monaco, "Courier New", monospace',
                  fontSize: '13px',
                  lineHeight: '1.5',
                  border: 'none',
                  outline: 'none',
                  backgroundColor: '#1E293B',
                  color: '#F8FAFC',
                  resize: 'none'
                }}
              />
            </>
          ) : (
            <div style={{ padding: '60px', textAlign: 'center', color: '#94A3B8' }}>
              Select an artifact from the repository tree to inspect or edit source code.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
