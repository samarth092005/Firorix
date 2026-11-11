import React, { useState } from 'react';
import { Modal } from './Modal';
import { BusinessRequirement, RequirementPriority, RequirementReviewStatus } from '../../types';
import { assessmentService } from '../../services/mock/assessmentService';

export interface AddRequirementDialogProps {
  isOpen: boolean;
  onClose: () => void;
  assessmentId: string;
  onRequirementAdded: () => void;
}

export const AddRequirementDialog: React.FC<AddRequirementDialogProps> = ({
  isOpen,
  onClose,
  assessmentId,
  onRequirementAdded
}) => {
  const [title, setTitle] = useState('');
  const [statement, setStatement] = useState('');
  const [businessRule, setBusinessRule] = useState('');
  const [actorRole, setActorRole] = useState('Internal Sales Representative');
  const [priority, setPriority] = useState<RequirementPriority>('MUST');
  const [reviewStatus, setReviewStatus] = useState<RequirementReviewStatus>('CONFIRMED');
  const [acceptanceCriteria, setAcceptanceCriteria] = useState('');
  const [evidenceSource, setEvidenceSource] = useState('Functional Interview / Legacy Code');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !statement.trim()) return;

    try {
      setIsSubmitting(true);
      await assessmentService.addRequirement({
        assessmentId,
        title: title.trim(),
        statement: statement.trim(),
        businessRule: businessRule.trim() || 'Standard S/4HANA validation applies.',
        actorRole: actorRole.trim(),
        inputOutput: 'Input parameters mapped to primary entity fields.',
        validationLogic: 'Standard business logic validation.',
        exceptionHandling: 'Display error message in message manager.',
        priority,
        acceptanceCriteria: acceptanceCriteria.trim() || 'Functional scenario verified in test system.',
        evidenceSource: evidenceSource.trim(),
        reviewStatus,
        reviewedBy: 'Elena Rostova (Lead Consultant)',
        reviewedDate: new Date().toISOString().replace('T', ' ').substring(0, 19)
      });
      onRequirementAdded();
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Capture Business Requirement"
      subtitle={`Link confirmed process rule to Assessment ${assessmentId}`}
      maxWidth="640px"
      footer={
        <>
          <button type="button" className="fiori-btn fiori-btn-secondary" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </button>
          <button type="button" className="fiori-btn fiori-btn-primary" onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? 'Saving...' : 'Confirm & Save Requirement'}
          </button>
        </>
      }
    >
      <form onSubmit={handleSubmit}>
        <div className="fiori-form-group">
          <label className="fiori-label fiori-label-required">Requirement Title</label>
          <input
            type="text"
            className="fiori-input"
            placeholder="e.g. Mandatory Dispute Reason Code on Line Item"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
        </div>

        <div className="fiori-form-group">
          <label className="fiori-label fiori-label-required">Functional Statement</label>
          <textarea
            className="fiori-textarea"
            placeholder="Describe the business scenario and required system behavior..."
            value={statement}
            onChange={(e) => setStatement(e.target.value)}
            required
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div className="fiori-form-group">
            <label className="fiori-label">Actor / Business Role</label>
            <input
              type="text"
              className="fiori-input"
              value={actorRole}
              onChange={(e) => setActorRole(e.target.value)}
            />
          </div>

          <div className="fiori-form-group">
            <label className="fiori-label">Priority</label>
            <select
              className="fiori-select"
              value={priority}
              onChange={(e) => setPriority(e.target.value as RequirementPriority)}
            >
              <option value="MUST">MUST (Core Requirement)</option>
              <option value="SHOULD">SHOULD (Important)</option>
              <option value="COULD">COULD (Nice to have)</option>
            </select>
          </div>
        </div>

        <div className="fiori-form-group">
          <label className="fiori-label">Business Rule / Invariant</label>
          <input
            type="text"
            className="fiori-input"
            placeholder="e.g. Field ZZ_DISPUTE must not be empty if claim active"
            value={businessRule}
            onChange={(e) => setBusinessRule(e.target.value)}
          />
        </div>

        <div className="fiori-form-group">
          <label className="fiori-label">Acceptance Criteria</label>
          <input
            type="text"
            className="fiori-input"
            placeholder="e.g. Verified in S/4HANA test case TC-O2C-401"
            value={acceptanceCriteria}
            onChange={(e) => setAcceptanceCriteria(e.target.value)}
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div className="fiori-form-group">
            <label className="fiori-label">Evidence / Source</label>
            <input
              type="text"
              className="fiori-input"
              value={evidenceSource}
              onChange={(e) => setEvidenceSource(e.target.value)}
            />
          </div>

          <div className="fiori-form-group">
            <label className="fiori-label">Review Status</label>
            <select
              className="fiori-select"
              value={reviewStatus}
              onChange={(e) => setReviewStatus(e.target.value as RequirementReviewStatus)}
            >
              <option value="CONFIRMED">CONFIRMED (Approved by Consultant)</option>
              <option value="DRAFT">DRAFT (Pending Review)</option>
            </select>
          </div>
        </div>
      </form>
    </Modal>
  );
};
