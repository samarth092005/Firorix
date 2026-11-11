import React, { useState } from 'react';
import { localStore } from '../../services/mock/localStore';
import { StatusBadge } from '../../components/status/StatusBadge';
import { FilterBar } from '../../components/tables/FilterBar';
import { MessageStrip } from '../../components/status/MessageStrip';
import { GitCompare, HelpCircle } from 'lucide-react';

export const FitGapPage: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  let results = localStore.getFitGap();

  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    results = results.filter(
      (r) =>
        r.requirementTitle.toLowerCase().includes(q) ||
        r.candidateAppName.toLowerCase().includes(q) ||
        r.candidateAppId.toLowerCase().includes(q)
    );
  }

  if (statusFilter !== 'ALL') {
    results = results.filter((r) => r.coverageStatus === statusFilter);
  }

  return (
    <div style={{ padding: '24px', maxWidth: '1440px', margin: '0 auto' }}>
      <div style={{ marginBottom: '20px' }}>
        <h1 className="fiori-page-title">Requirement-to-App Fit-Gap Matrix</h1>
        <p className="fiori-page-subtitle">
          Side-by-side comparison of confirmed business requirements against standard SAP Fiori catalog capabilities.
        </p>
      </div>

      <MessageStrip type="info">
        <strong>Axiomatic Rule:</strong> <code>UNKNOWN</code> must NEVER be treated as <code>UNSUPPORTED</code>. Missing documentation requires targeted sandbox verification, not automatic custom code generation.
      </MessageStrip>

      <FilterBar
        searchPlaceholder="Filter by requirement, candidate app, or explanation..."
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        filters={[
          {
            key: 'cov',
            label: 'Coverage Status',
            value: statusFilter,
            onChange: setStatusFilter,
            options: [
              { label: 'All Coverage Statuses', value: 'ALL' },
              { label: 'SUPPORTED (Standard match)', value: 'SUPPORTED' },
              { label: 'PARTIAL (Extensible via BAdI)', value: 'PARTIAL' },
              { label: 'UNSUPPORTED (Material gap)', value: 'UNSUPPORTED' },
              { label: 'UNKNOWN (Unverified)', value: 'UNKNOWN' }
            ]
          }
        ]}
        onReset={() => {
          setSearchQuery('');
          setStatusFilter('ALL');
        }}
      />

      <div className="fiori-table-container">
        <table className="fiori-table">
          <thead>
            <tr>
              <th>Requirement</th>
              <th>Candidate Fiori Application</th>
              <th>Coverage Status</th>
              <th>Gap Explanation & Evidence</th>
              <th>Functional Reviewer</th>
              <th>Timestamp</th>
            </tr>
          </thead>
          <tbody>
            {results.map((fg) => (
              <tr key={fg.id}>
                <td style={{ maxWidth: '280px' }}>
                  <div style={{ fontWeight: 600 }}>{fg.requirementTitle}</div>
                  <code style={{ fontSize: '11px' }}>{fg.requirementId} &bull; {fg.assessmentId}</code>
                </td>
                <td>
                  <div style={{ fontWeight: 600 }}>{fg.candidateAppName}</div>
                  <code>{fg.candidateAppId}</code>
                </td>
                <td>
                  <StatusBadge status={fg.coverageStatus} size="md" />
                </td>
                <td style={{ fontSize: '12px', maxWidth: '380px' }}>
                  <div style={{ color: 'var(--fiori-text-primary)', lineHeight: 1.4 }}>
                    {fg.gapExplanation}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--fiori-text-muted)', marginTop: '4px' }}>
                    <strong>Evidence:</strong> {fg.evidence}
                  </div>
                </td>
                <td>
                  <span style={{ fontSize: '12px' }}>{fg.reviewerName || 'Unassigned'}</span>
                </td>
                <td>
                  <span style={{ fontSize: '11px', color: 'var(--fiori-text-secondary)' }}>
                    {fg.reviewedTimestamp}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
