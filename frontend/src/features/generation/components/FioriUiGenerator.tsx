import React, { useState, useEffect, useMemo } from 'react';
import {
  LayoutTemplate,
  FileCode2,
  FolderKanban,
  RefreshCw,
  Copy,
  Check,
  Save,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ExternalLink,
  Layers
} from 'lucide-react';
import { GenerationProject, GeneratedArtifact, StudioInternalView, StaticValidationReport } from '../types';
import { frontendGenerationProjectService } from '../services/generationProjectService';

interface FioriUiGeneratorProps {
  project: GenerationProject;
  onProjectUpdated: (updated: GenerationProject) => void;
  onNavigateView: (view: StudioInternalView) => void;
}

export const FioriUiGenerator: React.FC<FioriUiGeneratorProps> = ({
  project,
  onProjectUpdated,
  onNavigateView
}) => {
  const [artifacts, setArtifacts] = useState<GeneratedArtifact[]>([]);
  const [selectedArtifactId, setSelectedArtifactId] = useState<string | null>(null);
  const [editorContent, setEditorContent] = useState<string>('');
  const [validationReport, setValidationReport] = useState<StaticValidationReport | null>(null);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [isValidating, setIsValidating] = useState<boolean>(false);
  const [isSavingEdit, setIsSavingEdit] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);

  // App Config
  const [appId, setAppId] = useState<string>(`com.fiorix.custom.${project.projectId.toLowerCase().replace(/[^a-z0-9]/g, '')}`);
  const [appTitle, setAppTitle] = useState<string>(project.projectName);

  useEffect(() => {
    loadArtifacts();
  }, [project.projectId]);

  const loadArtifacts = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await frontendGenerationProjectService.getArtifacts(project.projectId);
      const uiArts = (res.artifacts || []).filter(
        (a) => a.filePath.startsWith('webapp/') || a.filePath.includes('ui5.yaml') || a.objectName === 'README_FIORI' || a.filePath === 'package.json'
      );
      setArtifacts(uiArts);
      if (uiArts.length > 0 && !selectedArtifactId) {
        setSelectedArtifactId(uiArts[0].artifactId);
        setEditorContent(uiArts[0].content);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load UI artifacts');
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

  const handleGenerateFiori = async () => {
    setIsGenerating(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const res = await frontendGenerationProjectService.generateFiori(project.projectId, {
        appId,
        pageTitle: appTitle,
        forceOverwrite: true
      });
      setSuccessMsg(`Successfully generated ${res.totalGenerated} Fiori Elements project files!`);
      await loadArtifacts();
      const updated = await frontendGenerationProjectService.getProject(project.projectId);
      onProjectUpdated(updated);
    } catch (err: any) {
      setError(err.message || 'Fiori generation failed');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRunValidation = async () => {
    setIsValidating(true);
    setError(null);
    try {
      const res = await frontendGenerationProjectService.validateGeneration(project.projectId);
      setValidationReport(res.validationReport);
      setSuccessMsg(`Static validation executed: Status is ${res.validationReport.status}.`);
    } catch (err: any) {
      setError(err.message || 'Validation execution failed');
    } finally {
      setIsValidating(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!selectedArtifactId) return;
    setIsSavingEdit(true);
    setError(null);
    try {
      const res = await frontendGenerationProjectService.updateArtifact(project.projectId, selectedArtifactId, editorContent);
      setSuccessMsg('Manual edit saved and SHA-256 checksum updated.');
      await loadArtifacts();
    } catch (err: any) {
      setError(err.message || 'Failed to save manual edit');
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(editorContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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
            <LayoutTemplate size={20} color="#0066FF" />
            <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#0F172A', margin: 0 }}>
              SAP Fiori Elements Application Generator
            </h2>
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748B' }}>
              ({artifacts.length} application files)
            </span>
          </div>
          <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#64748B' }}>
            Floorplan: OData V4 List Report + Object Page for S/4HANA 2023.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            type="button"
            onClick={handleRunValidation}
            disabled={isValidating}
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
            <CheckCircle2 size={14} color="#059669" />
            {isValidating ? 'Validating...' : 'Run Static Validation'}
          </button>
          <button
            type="button"
            onClick={handleGenerateFiori}
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
            {isGenerating ? 'Synthesizing...' : 'Generate Fiori Application'}
          </button>
          {artifacts.length > 0 && (
            <button
              type="button"
              onClick={() => onNavigateView('preview-validation')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 14px',
                backgroundColor: '#10B981',
                border: 'none',
                borderRadius: '6px',
                fontSize: '13px',
                fontWeight: 600,
                color: '#FFFFFF',
                cursor: 'pointer'
              }}
              title="Proceed to local mock server and preview"
            >
              <span>Next: Preview &amp; Validation</span>
              <ArrowRight size={14} />
            </button>
          )}
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

      {/* Validation Summary Panel if run */}
      {validationReport && (
        <div
          style={{
            padding: '16px 20px',
            borderRadius: '8px',
            backgroundColor: validationReport.isValid ? '#ECFDF5' : '#FEF2F2',
            border: `1px solid ${validationReport.isValid ? '#A7F3D0' : '#FECACA'}`,
            display: 'flex',
            flexDirection: 'column',
            gap: '8px'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontWeight: 700, fontSize: '14px', color: validationReport.isValid ? '#065F46' : '#991B1B' }}>
              Validation Status: {validationReport.status} ({validationReport.errorsCount} Errors, {validationReport.warningsCount} Warnings)
            </div>
            <span style={{ fontSize: '11px', color: '#64748B' }}>
              Evaluated at: {new Date(validationReport.evaluatedAt).toLocaleTimeString()}
            </span>
          </div>
          {validationReport.findings.length > 0 && (
            <div style={{ maxHeight: '140px', overflowY: 'auto', fontSize: '12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {validationReport.findings.map((f, i) => (
                <div key={i} style={{ color: f.severity === 'ERROR' ? '#991B1B' : '#92400E' }}>
                  <strong>[{f.severity}]</strong> {f.message} ({f.ruleId})
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Grid: File Tree & Editor */}
      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '20px', minHeight: '600px' }}>
        {/* Left: UI Files */}
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
            Application Project Files
          </div>
          <div style={{ overflowY: 'auto', flex: 1, padding: '8px' }}>
            {artifacts.length === 0 ? (
              <div style={{ padding: '20px', textAlign: 'center', color: '#94A3B8', fontSize: '13px' }}>
                No UI files generated yet. Click "Generate Fiori Application" above.
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
              {/* Editor Bar */}
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
                    SHA-256: {selectedArtifact.checksum.slice(0, 16)}... | Language: {selectedArtifact.language}
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
                    {copied ? 'Copied!' : 'Copy'}
                  </button>

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
                  backgroundColor: '#0F172A',
                  color: '#F8FAFC',
                  resize: 'none'
                }}
              />
            </>
          ) : (
            <div style={{ padding: '60px', textAlign: 'center', color: '#94A3B8' }}>
              Select a file from the tree to inspect or edit application code.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
