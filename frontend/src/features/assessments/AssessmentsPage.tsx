import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Assessment } from '../../types';
import { assessmentService } from '../../services/mock/assessmentService';
import { StatusBadge } from '../../components/status/StatusBadge';
import { FilterBar } from '../../components/tables/FilterBar';
import { PlusCircle, ExternalLink } from 'lucide-react';

export const AssessmentsPage: React.FC = () => {
  const navigate = useNavigate();
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const loadData = async () => {
    const res = await assessmentService.getAllAssessments({
      searchQuery,
      status: statusFilter
    });
    setAssessments(res.data);
  };

  useEffect(() => {
    loadData();
  }, [searchQuery, statusFilter]);

  return (
    <div style={{ padding: '24px', maxWidth: '1440px', margin: '0 auto' }}>
      <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 className="fiori-page-title">Transaction Assessments</h1>
          <p className="fiori-page-subtitle">
            Comprehensive register of ongoing and completed Fiori modernization assessments, fit-gap evaluations, and recommendations.
          </p>
        </div>
        <button
          type="button"
          className="fiori-btn fiori-btn-primary"
          onClick={() => navigate('/assessments/new')}
        >
          <PlusCircle size={14} /> New Assessment
        </button>
      </div>

      <FilterBar
        searchPlaceholder="Filter assessments by T-Code, title, or system..."
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        filters={[
          {
            key: 'status',
            label: 'Lifecycle Status',
            value: statusFilter,
            onChange: setStatusFilter,
            options: [
              { label: 'All Lifecycle Statuses', value: 'ALL' },
              { label: 'In Progress', value: 'IN_PROGRESS' },
              { label: 'Review Ready', value: 'REVIEW_READY' },
              { label: 'Approved', value: 'APPROVED' }
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
              <th>ID</th>
              <th>Target T-Code</th>
              <th>Assessment Title</th>
              <th>System</th>
              <th>Lifecycle Status</th>
              <th>Recommendation</th>
              <th>Progress</th>
              <th>Owner</th>
              <th>Last Updated</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {assessments.map((a) => (
              <tr key={a.id}>
                <td>
                  <code style={{ fontSize: '11px', fontWeight: 600 }}>{a.id}</code>
                </td>
                <td>
                  <code style={{ fontSize: '13px', fontWeight: 700, color: 'var(--fiori-text-primary)' }}>
                    {a.tcode}
                  </code>
                </td>
                <td>
                  <div style={{ fontWeight: 500 }}>{a.title}</div>
                  <div style={{ fontSize: '11px', color: 'var(--fiori-text-secondary)' }}>{a.businessProcess}</div>
                </td>
                <td>{a.systemAlias}</td>
                <td>
                  <StatusBadge status={a.status} />
                </td>
                <td>
                  {a.recommendationOutcome ? (
                    <StatusBadge status={a.recommendationOutcome} />
                  ) : (
                    <span style={{ fontSize: '12px', color: 'var(--fiori-text-muted)' }}>Pending</span>
                  )}
                </td>
                <td style={{ width: '90px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <div
                      style={{
                        flex: 1,
                        height: '6px',
                        backgroundColor: 'var(--fiori-border-light)',
                        borderRadius: '3px',
                        overflow: 'hidden'
                      }}
                    >
                      <div
                        style={{
                          width: `${a.progressPercent}%`,
                          height: '100%',
                          backgroundColor: 'var(--fiori-teal)'
                        }}
                      />
                    </div>
                    <span style={{ fontSize: '11px', color: 'var(--fiori-text-secondary)' }}>
                      {a.progressPercent}%
                    </span>
                  </div>
                </td>
                <td>
                  <span style={{ fontSize: '12px' }}>{a.ownerName}</span>
                </td>
                <td>
                  <span style={{ fontSize: '11px', color: 'var(--fiori-text-secondary)' }}>
                    {a.updatedDate}
                  </span>
                </td>
                <td style={{ textAlign: 'right' }}>
                  <button
                    type="button"
                    className="fiori-btn fiori-btn-secondary"
                    style={{ height: '26px', fontSize: '11px', padding: '0 8px' }}
                    onClick={() => navigate(`/assessments/${a.id}`)}
                  >
                    <ExternalLink size={12} /> Open Workspace
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
