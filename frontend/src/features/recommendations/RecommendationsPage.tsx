import React from 'react';
import { useNavigate } from 'react-router-dom';
import { localStore } from '../../services/mock/localStore';
import { StatusBadge } from '../../components/status/StatusBadge';
import { MessageStrip } from '../../components/status/MessageStrip';
import { Compass, ExternalLink, HelpCircle } from 'lucide-react';

export const RecommendationsPage: React.FC = () => {
  const navigate = useNavigate();
  const recommendations = localStore.getRecommendations();

  return (
    <div style={{ padding: '24px', maxWidth: '1440px', margin: '0 auto' }}>
      <div style={{ marginBottom: '20px' }}>
        <h1 className="fiori-page-title">Architectural Recommendations Workspace</h1>
        <p className="fiori-page-subtitle">
          Formal decision records evaluating whether to Add and Configure standard Fiori apps, Build custom RAP apps under Clean Core, or Review missing evidence.
        </p>
      </div>

      <MessageStrip type="info">
        <strong>Decision Policy Rule:</strong>
        <ul style={{ paddingLeft: '18px', marginTop: '4px' }}>
          <li><strong>ADD & CONFIGURE:</strong> Standard Fiori app satisfies business requirements through supported addition, configuration, or Clean Core adaptation.</li>
          <li><strong>BUILD:</strong> Material functional gaps confirmed; custom RAP / Fiori Elements build justified under Clean Core governance.</li>
          <li><strong>REVIEW:</strong> Missing evidence, conflicting matches, or unconfirmed requirements. Internal governance state — never default to BUILD on uncertainty.</li>
        </ul>
      </MessageStrip>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {recommendations.map((rec) => (
          <div key={rec.assessmentId} className="fiori-card">
            <div className="fiori-card-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <Compass size={18} color="var(--fiori-teal)" />
                <span style={{ fontWeight: 700, fontSize: '15px' }}>
                  Assessment {rec.assessmentId}
                </span>
                <StatusBadge status={rec.outcome || rec.governanceStatus || 'REVIEW'} size="md" />
                <span
                  style={{
                    fontSize: '11px',
                    padding: '2px 6px',
                    borderRadius: '2px',
                    backgroundColor: rec.approvalStatus === 'APPROVED' ? 'var(--fiori-success-bg)' : 'var(--fiori-warning-bg)',
                    color: rec.approvalStatus === 'APPROVED' ? 'var(--fiori-success)' : 'var(--fiori-warning)'
                  }}
                >
                  {rec.approvalStatus}
                </span>
              </div>
              <button
                type="button"
                className="fiori-btn fiori-btn-secondary"
                style={{ height: '28px', fontSize: '12px' }}
                onClick={() => navigate(`/assessments/${rec.assessmentId}`)}
              >
                <ExternalLink size={12} /> Open Assessment Workspace
              </button>
            </div>

            <div className="fiori-card-body" style={{ fontSize: '13px' }}>
              <div style={{ marginBottom: '14px' }}>
                <h4 style={{ fontSize: '13px', color: 'var(--fiori-text-secondary)', marginBottom: '4px' }}>
                  ARCHITECTURAL RATIONALE
                </h4>
                <p style={{ lineHeight: 1.5 }}>{rec.rationale}</p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '12px' }}>
                <div>
                  <h4 style={{ fontSize: '12px', color: 'var(--fiori-text-secondary)', marginBottom: '4px' }}>
                    UNRESOLVED GAPS & QUESTIONS ({rec.unresolvedQuestions.length})
                  </h4>
                  <ul style={{ paddingLeft: '16px', color: 'var(--fiori-text-primary)', fontSize: '12px' }}>
                    {rec.unresolvedQuestions.map((q, idx) => (
                      <li key={idx}>{q}</li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h4 style={{ fontSize: '12px', color: 'var(--fiori-text-secondary)', marginBottom: '4px' }}>
                    EVIDENCE CITATIONS
                  </h4>
                  <ul style={{ paddingLeft: '16px', color: 'var(--fiori-text-secondary)', fontSize: '12px' }}>
                    {rec.evidenceCitations.map((c, idx) => (
                      <li key={idx}><code>{c}</code></li>
                    ))}
                  </ul>
                </div>
              </div>

              <div style={{ borderTop: '1px solid var(--fiori-border-light)', paddingTop: '10px', fontSize: '11px', color: 'var(--fiori-text-secondary)' }}>
                Evaluated by <strong>{rec.reviewerName}</strong> on {rec.decidedTimestamp}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
