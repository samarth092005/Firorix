import React, { useState } from 'react';
import {
  Sparkles,
  X,
  Check,
  RotateCcw,
  FileCode2,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { PreviewCopilotProposal } from '../types';
import { frontendGenerationProjectService } from '../services/generationProjectService';

interface PreviewCopilotDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  onAppliedAndRefresh: (summary: string) => Promise<void> | void;
}

const QUICK_CHIPS = [
  { label: 'Switch to Worklist', prompt: 'Switch floorplan to Worklist with bulk actions' },
  { label: 'Enable KPI & Chart (ALP)', prompt: 'Switch floorplan to Analytical List Page with KPI & Chart' },
  { label: 'Overview Cockpit', prompt: 'Switch floorplan to Overview Cockpit' },
  { label: 'Guided Wizard', prompt: 'Switch floorplan to Guided Wizard' },
  { label: 'Add Status Badge', prompt: 'Add semantic criticality badge on status' },
  { label: 'Add Action Button', prompt: 'Add action Approve' },
  { label: 'Add Column', prompt: 'Add column Priority' }
];

export const PreviewCopilotDrawer: React.FC<PreviewCopilotDrawerProps> = ({
  isOpen,
  onClose,
  projectId,
  onAppliedAndRefresh
}) => {
  const [instruction, setInstruction] = useState<string>('');
  const [proposal, setProposal] = useState<PreviewCopilotProposal | null>(null);
  const [isProposing, setIsProposing] = useState<boolean>(false);
  const [isApplying, setIsApplying] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handlePropose = async (promptOverride?: string) => {
    const text = (promptOverride ?? instruction).trim();
    if (!text) return;
    if (promptOverride) setInstruction(promptOverride);

    setIsProposing(true);
    setError(null);
    try {
      const res = await frontendGenerationProjectService.proposePreviewCopilot(projectId, text);
      setProposal(res.proposal);
    } catch (err: any) {
      setError(err?.message || 'Failed to generate change proposal.');
    } finally {
      setIsProposing(false);
    }
  };

  const handleApply = async () => {
    if (!proposal) return;
    setIsApplying(true);
    setError(null);
    try {
      const res = await frontendGenerationProjectService.applyPreviewCopilot(
        projectId,
        proposal.proposalId,
        proposal.proposedPatch
      );
      setProposal(null);
      setInstruction('');
      await onAppliedAndRefresh(res.summary || proposal.summary);
    } catch (err: any) {
      setError(err?.message || 'Failed to apply Copilot changes.');
    } finally {
      setIsApplying(false);
    }
  };

  return (
    <aside
      aria-label="Request Changes and Review Diff Copilot"
      style={{
        width: '420px',
        maxWidth: '100%',
        borderLeft: '1px solid #E2E8F0',
        backgroundColor: '#FFFFFF',
        display: 'flex',
        flexDirection: 'column',
        borderRadius: '8px',
        border: '1px solid #E2E8F0',
        boxShadow: '0 4px 16px rgba(15, 23, 42, 0.08)',
        overflow: 'hidden'
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '14px 16px',
          borderBottom: '1px solid #E2E8F0',
          backgroundColor: '#F8FAFC',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Sparkles size={16} color="#0066FF" />
          <div>
            <div style={{ fontSize: '13.5px', fontWeight: 700, color: '#0F172A' }}>
              Request Changes &amp; Review Diff
            </div>
            <div style={{ fontSize: '11.5px', color: '#64748B' }}>
              Preview Copilot · Inspect diff before applying
            </div>
          </div>
        </div>
        <button
          type="button"
          aria-label="Close Copilot"
          onClick={onClose}
          style={{ border: 'none', background: 'transparent', color: '#64748B', cursor: 'pointer', padding: '4px' }}
        >
          <X size={16} />
        </button>
      </div>

      {/* Body */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div>
          <label htmlFor="copilot-instruction-input" style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
            Describe the UI or floorplan change
          </label>
          <textarea
            id="copilot-instruction-input"
            rows={3}
            value={instruction}
            onChange={(e) => setInstruction(e.target.value)}
            placeholder="e.g. Switch to Worklist, add column Priority, add status badge, or add action Approve..."
            style={{
              width: '100%',
              padding: '8px 10px',
              borderRadius: '6px',
              border: '1px solid #CBD5E1',
              fontSize: '12.5px',
              boxSizing: 'border-box',
              resize: 'vertical'
            }}
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
            <button
              type="button"
              disabled={isProposing || !instruction.trim()}
              onClick={() => handlePropose()}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '7px 14px',
                borderRadius: '6px',
                border: 'none',
                backgroundColor: !instruction.trim() || isProposing ? '#94A3B8' : '#0066FF',
                color: '#FFFFFF',
                fontSize: '12.5px',
                fontWeight: 600,
                cursor: !instruction.trim() || isProposing ? 'not-allowed' : 'pointer'
              }}
            >
              {isProposing ? <Loader2 size={14} className="spin" /> : <Sparkles size={14} />}
              <span>{isProposing ? 'Generating Diff...' : 'Generate Diff'}</span>
            </button>
          </div>
        </div>

        {/* Quick Chips */}
        <div>
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', marginBottom: '6px' }}>
            Quick Refinements
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {QUICK_CHIPS.map((chip) => (
              <button
                key={chip.label}
                type="button"
                disabled={isProposing}
                onClick={() => handlePropose(chip.prompt)}
                style={{
                  padding: '4px 9px',
                  borderRadius: '999px',
                  border: '1px solid #CBD5E1',
                  backgroundColor: '#F8FAFC',
                  color: '#334155',
                  fontSize: '11.5px',
                  fontWeight: 500,
                  cursor: 'pointer'
                }}
              >
                + {chip.label}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div style={{ padding: '10px 12px', borderRadius: '6px', backgroundColor: '#FEF2F2', border: '1px solid #FECACA', color: '#991B1B', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertCircle size={14} />
            <span>{error}</span>
          </div>
        )}

        {/* Diff Preview */}
        {proposal && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', borderTop: '1px solid #E2E8F0', paddingTop: '12px' }}>
            <div>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#0066FF', textTransform: 'uppercase' }}>
                Proposed Change ({proposal.proposalId})
              </div>
              <div style={{ fontSize: '13px', fontWeight: 600, color: '#0F172A', marginTop: '2px' }}>
                {proposal.summary}
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '6px' }}>
                {proposal.impactedLayers.map((layer) => (
                  <span
                    key={layer}
                    style={{
                      fontSize: '11px',
                      fontWeight: 600,
                      padding: '2px 7px',
                      borderRadius: '4px',
                      backgroundColor: '#EFF6FF',
                      color: '#1D4ED8'
                    }}
                  >
                    {layer}
                  </span>
                ))}
              </div>
            </div>

            {proposal.diffs.length === 0 ? (
              <div style={{ fontSize: '12px', color: '#64748B', padding: '10px', backgroundColor: '#F8FAFC', borderRadius: '6px' }}>
                No textual file changes required (configuration already matches).
              </div>
            ) : (
              proposal.diffs.map((d) => (
                <div key={d.filePath} style={{ border: '1px solid #E2E8F0', borderRadius: '6px', overflow: 'hidden' }}>
                  <div
                    style={{
                      padding: '6px 10px',
                      backgroundColor: '#F1F5F9',
                      borderBottom: '1px solid #E2E8F0',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      fontSize: '11.5px',
                      fontFamily: 'monospace'
                    }}
                  >
                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#0F172A', fontWeight: 600 }}>
                      <FileCode2 size={13} />
                      {d.filePath}
                    </span>
                    <span>
                      <span style={{ color: '#16A34A', marginRight: '6px' }}>+{d.additions}</span>
                      <span style={{ color: '#DC2626' }}>-{d.deletions}</span>
                    </span>
                  </div>
                  <pre
                    style={{
                      margin: 0,
                      padding: '8px 10px',
                      fontSize: '11px',
                      lineHeight: 1.45,
                      maxHeight: '210px',
                      overflow: 'auto',
                      backgroundColor: '#0F172A',
                      color: '#E2E8F0'
                    }}
                  >
                    {d.unifiedDiff.split('\n').map((line, i) => {
                      const color = line.startsWith('+') && !line.startsWith('+++')
                        ? '#4ADE80'
                        : line.startsWith('-') && !line.startsWith('---')
                          ? '#F87171'
                          : '#94A3B8';
                      return (
                        <div key={i} style={{ color, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                          {line}
                        </div>
                      );
                    })}
                  </pre>
                </div>
              ))
            )}

            <div style={{ display: 'flex', gap: '8px', paddingTop: '4px' }}>
              <button
                type="button"
                onClick={() => setProposal(null)}
                disabled={isApplying}
                style={{
                  flex: 1,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '5px',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: '1px solid #CBD5E1',
                  backgroundColor: '#FFFFFF',
                  color: '#334155',
                  fontSize: '12.5px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                <RotateCcw size={13} />
                <span>Discard</span>
              </button>
              <button
                type="button"
                onClick={handleApply}
                disabled={isApplying}
                style={{
                  flex: 2,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '5px',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: isApplying ? '#94A3B8' : '#16A34A',
                  color: '#FFFFFF',
                  fontSize: '12.5px',
                  fontWeight: 600,
                  cursor: isApplying ? 'not-allowed' : 'pointer'
                }}
              >
                {isApplying ? <Loader2 size={13} className="spin" /> : <Check size={13} />}
                <span>{isApplying ? 'Applying...' : 'Apply & Refresh Preview'}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};
