import React, { useState, useEffect } from 'react';
import {
  X,
  Plus,
  ShieldCheck,
  HardDrive,
  AlertCircle,
  CheckCircle2,
  FolderPlus,
  Layers,
  ArrowRight
} from 'lucide-react';
import { assessmentService } from '../../../services/assessmentService';
import { AssessmentRecord } from '../../../services/contracts/types';
import { CreateProjectPayload, ProjectOrigin } from '../types';

interface CreateProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (payload: CreateProjectPayload) => Promise<void>;
  initialAssessmentId?: string | null;
}

export const CreateProjectModal: React.FC<CreateProjectModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  initialAssessmentId
}) => {
  const [activeTab, setActiveTab] = useState<'STANDALONE' | 'DISCOVERY_BUILD'>(
    initialAssessmentId ? 'DISCOVERY_BUILD' : 'STANDALONE'
  );

  // Standalone fields
  const [standaloneName, setStandaloneName] = useState('');
  const [standaloneDesc, setStandaloneDesc] = useState('');
  const [standaloneRelease, setStandaloneRelease] = useState('SAP S/4HANA 2023 On-Premise');
  const [standalonePackage, setStandalonePackage] = useState('ZCUSTOM_CORE');

  // Discovery handoff fields
  const [assessments, setAssessments] = useState<AssessmentRecord[]>([]);
  const [selectedAssessmentId, setSelectedAssessmentId] = useState<string>(initialAssessmentId || '');
  const [loadingAssessments, setLoadingAssessments] = useState<boolean>(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleQuickApprove = async (id: string) => {
    setIsApproving(true);
    setErrorMessage(null);
    try {
      await assessmentService.updateAssessment(id, {
        status: 'APPROVED',
        lifecycleStatus: 'APPROVED',
        leadArchitectApproval: {
          approved: true,
          approvedBy: 'USR-ADMIN-01',
          approvedAt: new Date().toISOString(),
          decision: 'APPROVED',
          comments: 'Approved for Generation Studio custom RAP modernization testing.'
        }
      });
      // Update local state
      setAssessments((prev) =>
        prev.map((a) =>
          a.id === id
            ? {
                ...a,
                status: 'APPROVED',
                lifecycleStatus: 'APPROVED',
                leadArchitectApproval: {
                  approved: true,
                  approvedBy: 'USR-ADMIN-01',
                  approvedAt: new Date().toISOString()
                }
              }
            : a
        )
      );
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to approve assessment.');
    } finally {
      setIsApproving(false);
    }
  };

  // Load assessments when modal opens
  useEffect(() => {
    if (!isOpen) return;

    async function loadAssessments() {
      setLoadingAssessments(true);
      try {
        const list = await assessmentService.getAssessments();
        setAssessments(list);
        if (initialAssessmentId) {
          setSelectedAssessmentId(initialAssessmentId);
          setActiveTab('DISCOVERY_BUILD');
        } else {
          // If there is an approved build assessment, select it by default in that tab
          const firstBuild = list.find((a) => a.recommendation?.outcome === 'BUILD' || a.status === 'APPROVED');
          if (firstBuild) {
            setSelectedAssessmentId(firstBuild.id);
          }
        }
      } catch (err) {
        console.warn('Failed to load assessments for project handoff picker:', err);
      } finally {
        setLoadingAssessments(false);
      }
    }

    loadAssessments();
  }, [isOpen, initialAssessmentId]);

  if (!isOpen) return null;

  const selectedAssessment = assessments.find((a) => a.id === selectedAssessmentId);
  const isSelectedBuildOutcome = selectedAssessment?.recommendation?.outcome === 'BUILD' || selectedAssessment?.assessmentResult === 'CUSTOM_RAP_REQUIRED';
  const isSelectedApproved = selectedAssessment?.status === 'APPROVED' || selectedAssessment?.lifecycleStatus === 'APPROVED' || selectedAssessment?.leadArchitectApproval?.approved;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      if (activeTab === 'STANDALONE') {
        if (!standaloneName.trim()) {
          setErrorMessage('Project Name is required for standalone generation projects.');
          setIsSubmitting(false);
          return;
        }

        await onSubmit({
          projectName: standaloneName.trim(),
          description: standaloneDesc.trim(),
          origin: 'STANDALONE',
          targetRelease: standaloneRelease,
          targetDeploymentModel: 'ON_PREMISE',
          targetPackage: standalonePackage.trim() || 'ZCUSTOM_CORE'
        });
      } else {
        if (!selectedAssessmentId) {
          setErrorMessage('Please select an assessment to initiate handoff.');
          setIsSubmitting(false);
          return;
        }

        if (!isSelectedBuildOutcome) {
          setErrorMessage(`Assessment "${selectedAssessmentId}" does not have an approved BUILD recommendation. Only genuine functional gaps requiring custom applications can be handed off.`);
          setIsSubmitting(false);
          return;
        }

        if (!isSelectedApproved) {
          setErrorMessage(`Assessment "${selectedAssessmentId}" has not completed Lead Architect approval under Clean Core governance.`);
          setIsSubmitting(false);
          return;
        }

        await onSubmit({
          sourceAssessmentId: selectedAssessmentId,
          origin: 'DISCOVERY_BUILD',
          targetRelease: selectedAssessment?.targetRelease || 'SAP S/4HANA 2023 On-Premise',
          targetDeploymentModel: 'ON_PREMISE',
          projectName: `${selectedAssessment?.tcode || 'CUSTOM'} — ${selectedAssessment?.description || 'Custom RAP Modernization'}`
        });
      }

      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to create project.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(3px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px'
      }}
    >
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '10px',
          width: '100%',
          maxWidth: '620px',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '16px 22px',
            borderBottom: '1px solid #E2E8F0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            backgroundColor: '#F8FAFC'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FolderPlus size={18} color="#0066FF" />
            <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#0F172A' }}>
              Create Generation Studio Project
            </h2>
          </div>
          <button
            type="button"
            className="fiori-btn fiori-btn-subtle"
            style={{ padding: '4px', height: '28px', width: '28px', borderRadius: '4px' }}
            onClick={onClose}
          >
            <X size={16} />
          </button>
        </div>

        {/* Origin Selector Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid #E2E8F0', backgroundColor: '#FFFFFF' }}>
          <button
            type="button"
            onClick={() => setActiveTab('STANDALONE')}
            style={{
              flex: 1,
              padding: '12px 16px',
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              borderBottom: activeTab === 'STANDALONE' ? '3px solid #0066FF' : '3px solid transparent',
              color: activeTab === 'STANDALONE' ? '#0066FF' : '#64748B',
              fontWeight: activeTab === 'STANDALONE' ? 700 : 500,
              fontSize: '13px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px'
            }}
          >
            <HardDrive size={15} />
            <span>Standalone Project</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('DISCOVERY_BUILD')}
            style={{
              flex: 1,
              padding: '12px 16px',
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              borderBottom: activeTab === 'DISCOVERY_BUILD' ? '3px solid #0066FF' : '3px solid transparent',
              color: activeTab === 'DISCOVERY_BUILD' ? '#0066FF' : '#64748B',
              fontWeight: activeTab === 'DISCOVERY_BUILD' ? 700 : 500,
              fontSize: '13px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px'
            }}
          >
            <ShieldCheck size={15} />
            <span>From Approved Assessment (Handoff)</span>
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} style={{ padding: '22px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {errorMessage && (
            <div
              style={{
                padding: '10px 14px',
                backgroundColor: '#FEF2F2',
                border: '1px solid #F87171',
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '12px',
                color: '#991B1B'
              }}
            >
              <AlertCircle size={15} color="#DC2626" style={{ flexShrink: 0 }} />
              <span>{errorMessage}</span>
            </div>
          )}

          {activeTab === 'STANDALONE' && (
            <>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                  Project Name <span style={{ color: '#DC2626' }}>*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Sales Order Expedited Processing App"
                  className="fiori-input"
                  value={standaloneName}
                  onChange={(e) => setStandaloneName(e.target.value)}
                  style={{ width: '100%', height: '36px', fontSize: '13px' }}
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                  Description
                </label>
                <textarea
                  placeholder="Describe the application scope, target persona, and Clean Core purpose..."
                  className="fiori-input"
                  value={standaloneDesc}
                  onChange={(e) => setStandaloneDesc(e.target.value)}
                  style={{ width: '100%', height: '70px', fontSize: '13px', padding: '8px' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                    Target Release
                  </label>
                  <select
                    className="fiori-select"
                    value={standaloneRelease}
                    onChange={(e) => setStandaloneRelease(e.target.value)}
                    style={{ width: '100%', height: '36px', fontSize: '13px' }}
                  >
                    <option value="SAP S/4HANA 2023 On-Premise">SAP S/4HANA 2023 On-Premise</option>
                    <option value="SAP S/4HANA 2023 Private Edition">SAP S/4HANA 2023 Private Edition</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                    ABAP Development Package
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. ZCUSTOM_CORE"
                    className="fiori-input"
                    value={standalonePackage}
                    onChange={(e) => setStandalonePackage(e.target.value)}
                    style={{ width: '100%', height: '36px', fontSize: '13px' }}
                  />
                </div>
              </div>

              <div
                style={{
                  padding: '10px 14px',
                  backgroundColor: '#F8FAFC',
                  borderRadius: '6px',
                  border: '1px solid #E2E8F0',
                  fontSize: '12px',
                  color: '#475569'
                }}
              >
                <strong>Origin: STANDALONE.</strong> Operates in local review-only mode. Does not invent remote SAP system connections.
              </div>
            </>
          )}

          {activeTab === 'DISCOVERY_BUILD' && (
            <>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                  Select Approved Assessment for Handoff <span style={{ color: '#DC2626' }}>*</span>
                </label>
                {loadingAssessments ? (
                  <div style={{ fontSize: '13px', color: '#64748B', padding: '8px 0' }}>Loading assessments...</div>
                ) : (
                  <select
                    className="fiori-select"
                    value={selectedAssessmentId}
                    onChange={(e) => setSelectedAssessmentId(e.target.value)}
                    style={{ width: '100%', height: '36px', fontSize: '13px' }}
                  >
                    <option value="">-- Choose an assessment --</option>
                    {assessments.map((asm) => (
                      <option key={asm.id} value={asm.id}>
                        {asm.id} — {asm.tcode} ({asm.recommendation?.outcome || asm.status})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {selectedAssessment && (
                <div
                  style={{
                    padding: '14px',
                    backgroundColor: '#F8FAFC',
                    border: '1px solid #E2E8F0',
                    borderRadius: '6px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                    fontSize: '12px'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <strong>Transaction: {selectedAssessment.tcode}</strong>
                    <span
                      style={{
                        padding: '1px 6px',
                        borderRadius: '3px',
                        fontSize: '11px',
                        fontWeight: 700,
                        backgroundColor: isSelectedBuildOutcome ? '#DCFCE7' : '#FEF3C7',
                        color: isSelectedBuildOutcome ? '#166534' : '#92400E'
                      }}
                    >
                      Outcome: {selectedAssessment.recommendation?.outcome || 'NONE'}
                    </span>
                  </div>

                  <div>
                    <strong>Description:</strong> {selectedAssessment.description || 'N/A'}
                  </div>

                  <div>
                    <strong>Target Release:</strong> {selectedAssessment.targetRelease || 'SAP S/4HANA 2023 On-Premise'}
                  </div>

                  <div>
                    <strong>Approval Status:</strong>{' '}
                    <span style={{ color: isSelectedApproved ? '#16A34A' : '#DC2626', fontWeight: 700 }}>
                      {isSelectedApproved ? 'Approved by Enterprise Architect' : 'Unapproved / Pending Architect Review'}
                    </span>
                  </div>

                  {!isSelectedBuildOutcome && (
                    <div style={{ color: '#DC2626', fontWeight: 600, marginTop: '4px' }}>
                      Clean Core Guardrail: Only assessments with BUILD outcome can initiate custom Generation Studio development.
                    </div>
                  )}

                  {!isSelectedApproved && isSelectedBuildOutcome && (
                    <div
                      style={{
                        marginTop: '8px',
                        padding: '10px 12px',
                        backgroundColor: '#FEF3C7',
                        border: '1px solid #FDE68A',
                        borderRadius: '6px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: '8px'
                      }}
                    >
                      <div style={{ color: '#92400E', fontWeight: 600, fontSize: '11px' }}>
                        Formal Lead Architect approval is required before initiating project handoff.
                      </div>
                      <button
                        type="button"
                        className="fiori-btn"
                        disabled={isApproving}
                        onClick={() => handleQuickApprove(selectedAssessment.id)}
                        style={{
                          height: '28px',
                          padding: '0 12px',
                          fontSize: '11px',
                          fontWeight: 700,
                          backgroundColor: '#D97706',
                          color: '#FFFFFF',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: isApproving ? 'wait' : 'pointer'
                        }}
                      >
                        {isApproving ? 'Approving...' : '✓ Quick Approve for Testing'}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {/* Footer Actions */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '10px',
              marginTop: '10px',
              paddingTop: '14px',
              borderTop: '1px solid #E2E8F0'
            }}
          >
            <button
              type="button"
              className="fiori-btn fiori-btn-subtle"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="fiori-btn fiori-btn-primary"
              disabled={isSubmitting || (activeTab === 'DISCOVERY_BUILD' && (!isSelectedBuildOutcome || !isSelectedApproved))}
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <Plus size={15} />
              <span>{isSubmitting ? 'Creating Project...' : 'Create Project'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
