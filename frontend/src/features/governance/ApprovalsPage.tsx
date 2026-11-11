import React, { useState } from 'react';
import { localStore } from '../../services/mock/localStore';
import { StatusBadge } from '../../components/status/StatusBadge';
import { MessageStrip } from '../../components/status/MessageStrip';
import { ConfirmDialog } from '../../components/dialogs/ConfirmDialog';
import { UserCheck, CheckCircle2, XCircle } from 'lucide-react';

export const ApprovalsPage: React.FC = () => {
  const recommendations = localStore.getRecommendations();
  const [items, setItems] = useState(recommendations);
  const [selectedApprove, setSelectedApprove] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const handleApprove = (assessmentId: string) => {
    const updated = items.map(i => {
      if (i.assessmentId === assessmentId) {
        return { ...i, approvalStatus: 'APPROVED' as const, reviewerName: 'Elena Rostova (Lead Consultant)' };
      }
      return i;
    });
    setItems(updated);
    localStore.saveRecommendations(updated);
    setNotice(`Assessment ${assessmentId} formally approved.`);
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1440px', margin: '0 auto' }}>
      <div style={{ marginBottom: '20px' }}>
        <h1 className="fiori-page-title">Stakeholder Approvals & Governance Gate</h1>
        <p className="fiori-page-subtitle">
          Mandatory architectural and functional sign-off gate required before draft blueprints can be scheduled for developer import.
        </p>
      </div>

      <MessageStrip type="info">
        <strong>Governance Policy:</strong> Only certified Solution Architects and Lead Functional Consultants can transition recommendations from <code>PENDING_REVIEW</code> to <code>APPROVED</code>.
      </MessageStrip>

      {notice && <MessageStrip type="success">{notice}</MessageStrip>}

      <div className="fiori-table-container">
        <table className="fiori-table">
          <thead>
            <tr>
              <th>Assessment ID</th>
              <th>Recommended Outcome</th>
              <th>Architectural Rationale</th>
              <th>Approval State</th>
              <th>Designated Signatory</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.assessmentId}>
                <td>
                  <code style={{ fontSize: '13px', fontWeight: 700 }}>{item.assessmentId}</code>
                </td>
                <td>
                  <StatusBadge status={item.outcome} size="md" />
                </td>
                <td style={{ fontSize: '12px', maxWidth: '420px', lineHeight: 1.4 }}>
                  {item.rationale}
                </td>
                <td>
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 700,
                      padding: '2px 8px',
                      borderRadius: '2px',
                      backgroundColor: item.approvalStatus === 'APPROVED' ? 'var(--fiori-success-bg)' : 'var(--fiori-warning-bg)',
                      color: item.approvalStatus === 'APPROVED' ? 'var(--fiori-success)' : 'var(--fiori-warning)'
                    }}
                  >
                    {item.approvalStatus}
                  </span>
                </td>
                <td style={{ fontSize: '12px' }}>
                  {item.reviewerName}
                </td>
                <td style={{ textAlign: 'right' }}>
                  {item.approvalStatus === 'PENDING_REVIEW' ? (
                    <button
                      type="button"
                      className="fiori-btn fiori-btn-primary"
                      style={{ height: '26px', fontSize: '11px' }}
                      onClick={() => setSelectedApprove(item.assessmentId)}
                    >
                      <CheckCircle2 size={12} /> Sign Off
                    </button>
                  ) : (
                    <span style={{ fontSize: '11px', color: 'var(--fiori-success)', fontWeight: 600 }}>
                      ✓ Signed Off
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ConfirmDialog
        isOpen={!!selectedApprove}
        onClose={() => setSelectedApprove(null)}
        onConfirm={() => {
          if (selectedApprove) handleApprove(selectedApprove);
        }}
        title="Record Formal Architectural Approval"
        message={`Do you confirm that all critical business requirements and SAP Clean Core constraints have been verified for Assessment ${selectedApprove}?`}
        confirmLabel="Approve Decision"
      />
    </div>
  );
};
