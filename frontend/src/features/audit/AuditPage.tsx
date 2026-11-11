import React, { useState } from 'react';
import { localStore } from '../../services/mock/localStore';
import { FilterBar } from '../../components/tables/FilterBar';
import { StatusBadge } from '../../components/status/StatusBadge';
import { MessageStrip } from '../../components/status/MessageStrip';
import { History } from 'lucide-react';

export const AuditPage: React.FC = () => {
  const [events] = useState(localStore.getAuditEvents());
  const [searchQuery, setSearchQuery] = useState('');

  const filtered = searchQuery
    ? events.filter(e =>
        e.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.userId.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.details.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : events;

  return (
    <div style={{ padding: '24px', maxWidth: '1440px', margin: '0 auto' }}>
      <div style={{ marginBottom: '20px' }}>
        <h1 className="fiori-page-title">Enterprise Audit & Governance Trail</h1>
        <p className="fiori-page-subtitle">
          Tamper-evident record of requirement confirmations, recommendation reviews, and generation requests with correlation IDs.
        </p>
      </div>

      <MessageStrip type="info">
        Audit records supplement SAP BTP Audit Log Service with domain-specific governance events.
      </MessageStrip>

      <FilterBar
        searchPlaceholder="Search audit events by action, user ID, or details..."
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onReset={() => setSearchQuery('')}
      />

      <div className="fiori-table-container">
        <table className="fiori-table">
          <thead>
            <tr>
              <th>Timestamp</th>
              <th>Action</th>
              <th>User ID & Role</th>
              <th>Target Entity</th>
              <th>Outcome</th>
              <th>Details & Correlation ID</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((e) => (
              <tr key={e.id}>
                <td>
                  <span style={{ fontSize: '11px', color: 'var(--fiori-text-secondary)', whiteSpace: 'nowrap' }}>
                    {e.timestamp}
                  </span>
                </td>
                <td>
                  <code style={{ fontSize: '12px', fontWeight: 600 }}>{e.action}</code>
                </td>
                <td>
                  <div style={{ fontWeight: 500, fontSize: '12px' }}>{e.userId}</div>
                  <div style={{ fontSize: '10px', color: 'var(--fiori-text-secondary)' }}>{e.userRole}</div>
                </td>
                <td>
                  <span style={{ fontSize: '12px' }}>{e.entityType} ({e.entityId})</span>
                </td>
                <td>
                  <StatusBadge status={e.outcome} />
                </td>
                <td style={{ fontSize: '12px', maxWidth: '420px' }}>
                  <div>{e.details}</div>
                  <div style={{ fontSize: '10px', color: 'var(--fiori-text-muted)', marginTop: '2px' }}>
                    Correlation ID: <code>{e.correlationId}</code>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
