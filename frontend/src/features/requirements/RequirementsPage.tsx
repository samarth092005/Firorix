import React, { useEffect, useState } from 'react';
import { BusinessRequirement } from '../../types';
import { localStore } from '../../services/mock/localStore';
import { StatusBadge } from '../../components/status/StatusBadge';
import { FilterBar } from '../../components/tables/FilterBar';
import { AddRequirementDialog } from '../../components/dialogs/AddRequirementDialog';
import { PlusCircle, CheckSquare } from 'lucide-react';
import { MessageStrip } from '../../components/status/MessageStrip';

export const RequirementsPage: React.FC = () => {
  const [requirements, setRequirements] = useState<BusinessRequirement[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [isAddOpen, setIsAddOpen] = useState(false);

  const loadData = () => {
    let all = localStore.getRequirements();
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      all = all.filter(r => r.title.toLowerCase().includes(q) || r.statement.toLowerCase().includes(q));
    }
    if (priorityFilter !== 'ALL') {
      all = all.filter(r => r.priority === priorityFilter);
    }
    if (statusFilter !== 'ALL') {
      all = all.filter(r => r.reviewStatus === statusFilter);
    }
    setRequirements(all);
  };

  useEffect(() => {
    loadData();
  }, [searchQuery, priorityFilter, statusFilter]);

  return (
    <div style={{ padding: '24px', maxWidth: '1440px', margin: '0 auto' }}>
      <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 className="fiori-page-title">Business & Functional Requirements</h1>
          <p className="fiori-page-subtitle">
            Catalog of confirmed business rules, validations, and functional requirements used to drive Fit-Gap comparisons.
          </p>
        </div>
        <button
          type="button"
          className="fiori-btn fiori-btn-primary"
          onClick={() => setIsAddOpen(true)}
        >
          <PlusCircle size={14} /> Add Requirement
        </button>
      </div>

      <MessageStrip type="info">
        <strong>Functional Review Mandate:</strong> Only requirements with review status <code>CONFIRMED</code> by a certified functional consultant are evaluated by the deterministic fit-gap decision engine.
      </MessageStrip>

      <FilterBar
        searchPlaceholder="Filter requirements by title, rule, or statement..."
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        filters={[
          {
            key: 'prio',
            label: 'Priority',
            value: priorityFilter,
            onChange: setPriorityFilter,
            options: [
              { label: 'All Priorities', value: 'ALL' },
              { label: 'MUST (Core)', value: 'MUST' },
              { label: 'SHOULD (Important)', value: 'SHOULD' },
              { label: 'COULD (Optional)', value: 'COULD' }
            ]
          },
          {
            key: 'stat',
            label: 'Review Status',
            value: statusFilter,
            onChange: setStatusFilter,
            options: [
              { label: 'All Review Statuses', value: 'ALL' },
              { label: 'CONFIRMED', value: 'CONFIRMED' },
              { label: 'DRAFT', value: 'DRAFT' }
            ]
          }
        ]}
        onReset={() => {
          setSearchQuery('');
          setPriorityFilter('ALL');
          setStatusFilter('ALL');
        }}
      />

      <div className="fiori-table-container">
        <table className="fiori-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Assessment</th>
              <th>Title & Functional Statement</th>
              <th>Actor Role</th>
              <th>Priority</th>
              <th>Review Status</th>
              <th>Confirmed Reviewer</th>
            </tr>
          </thead>
          <tbody>
            {requirements.map((r) => (
              <tr key={r.id}>
                <td><code>{r.id}</code></td>
                <td><code>{r.assessmentId}</code></td>
                <td>
                  <div style={{ fontWeight: 600 }}>{r.title}</div>
                  <div style={{ fontSize: '12px', color: 'var(--fiori-text-secondary)', marginTop: '2px' }}>
                    {r.statement}
                  </div>
                  {r.businessRule && (
                    <div style={{ fontSize: '11px', color: 'var(--fiori-teal)', marginTop: '4px' }}>
                      Rule: {r.businessRule}
                    </div>
                  )}
                </td>
                <td style={{ fontSize: '12px' }}>{r.actorRole}</td>
                <td>
                  <span style={{ fontSize: '11px', fontWeight: 700, color: r.priority === 'MUST' ? 'var(--fiori-error)' : 'var(--fiori-teal)' }}>
                    {r.priority}
                  </span>
                </td>
                <td>
                  <StatusBadge status={r.reviewStatus} />
                </td>
                <td>
                  <span style={{ fontSize: '11px', color: 'var(--fiori-text-secondary)' }}>
                    {r.reviewedBy || 'Pending'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <AddRequirementDialog
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        assessmentId="ASM-2026-001"
        onRequirementAdded={loadData}
      />
    </div>
  );
};
