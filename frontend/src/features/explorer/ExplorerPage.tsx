import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { TransactionCode } from '../../types';
import { transactionService } from '../../services/mock/transactionService';
import { StatusBadge } from '../../components/status/StatusBadge';
import { FilterBar } from '../../components/tables/FilterBar';
import { PlusCircle, SearchCode, Eye, Layers } from 'lucide-react';
import { MessageStrip } from '../../components/status/MessageStrip';

export const ExplorerPage: React.FC = () => {
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState<TransactionCode[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [moduleFilter, setModuleFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const loadData = async () => {
    const res = await transactionService.getAllTransactions({
      searchQuery,
      module: moduleFilter,
      status: statusFilter
    });
    setTransactions(res.data);
  };

  useEffect(() => {
    loadData();
  }, [searchQuery, moduleFilter, statusFilter]);

  return (
    <div style={{ padding: '24px', maxWidth: '1440px', margin: '0 auto' }}>
      <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 className="fiori-page-title">Transaction Code Explorer</h1>
          <p className="fiori-page-subtitle">
            Repository index of SAP GUI standard and custom transactions, linked programs, data dictionary tables, and SU24 authorization profiles.
          </p>
        </div>
        <button
          type="button"
          className="fiori-btn fiori-btn-primary"
          onClick={() => navigate('/assessments/new')}
        >
          <PlusCircle size={14} /> Assess New T-Code
        </button>
      </div>

      <MessageStrip type="info">
        <strong>Technical Discovery Notice:</strong> Metadata displayed below is extracted from SAP DDIC tables (<code>TSTC</code>, <code>TADIR</code>) and ADT repository resources. Dynamic runtime execution paths (such as dynamic submit or user exit execution) remain classified as <code>UNKNOWN</code> until verified.
      </MessageStrip>

      <FilterBar
        searchPlaceholder="Filter by T-Code (e.g. VA01), description, or program name..."
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        filters={[
          {
            key: 'mod',
            label: 'Module',
            value: moduleFilter,
            onChange: setModuleFilter,
            options: [
              { label: 'All Modules', value: 'ALL' },
              { label: 'Sales & Distribution (SD)', value: 'SD' },
              { label: 'Materials Management (MM)', value: 'MM' },
              { label: 'Financial Accounting (FI)', value: 'FI' },
              { label: 'Custom Enhancements (Z/Y)', value: 'CUSTOM' }
            ]
          },
          {
            key: 'stat',
            label: 'Assessment Status',
            value: statusFilter,
            onChange: setStatusFilter,
            options: [
              { label: 'All Statuses', value: 'ALL' },
              { label: 'Not Assessed', value: 'NOT_ASSESSED' },
              { label: 'In Progress', value: 'IN_PROGRESS' },
              { label: 'Review Ready', value: 'REVIEW_READY' },
              { label: 'Approved', value: 'APPROVED' }
            ]
          }
        ]}
        onReset={() => {
          setSearchQuery('');
          setModuleFilter('ALL');
          setStatusFilter('ALL');
        }}
      />

      <div className="fiori-table-container">
        <table className="fiori-table">
          <thead>
            <tr>
              <th>Transaction Code</th>
              <th>Description</th>
              <th>Module</th>
              <th>Program / Executable</th>
              <th>Package</th>
              <th>Linked Tables</th>
              <th>Assessment Status</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((tx) => (
              <tr key={tx.id}>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <code style={{ fontWeight: 700, fontSize: '13px', color: 'var(--fiori-text-primary)' }}>
                      {tx.tcode}
                    </code>
                    <span
                      style={{
                        fontSize: '10px',
                        fontWeight: 600,
                        padding: '1px 5px',
                        borderRadius: '2px',
                        backgroundColor: tx.type === 'CUSTOM' ? 'var(--fiori-warning-bg)' : 'var(--fiori-info-bg)',
                        color: tx.type === 'CUSTOM' ? 'var(--fiori-warning)' : 'var(--fiori-info)'
                      }}
                    >
                      {tx.type}
                    </span>
                  </div>
                </td>
                <td>
                  <div style={{ fontWeight: 500 }}>{tx.description}</div>
                </td>
                <td>
                  <span style={{ fontSize: '12px', fontWeight: 600 }}>{tx.module}</span>
                </td>
                <td>
                  <code>{tx.programName}</code>
                </td>
                <td>
                  <code>{tx.packageName}</code>
                </td>
                <td>
                  <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                    {tx.linkedTables.slice(0, 3).map((tbl) => (
                      <span
                        key={tbl}
                        style={{
                          fontSize: '11px',
                          padding: '1px 4px',
                          backgroundColor: 'var(--fiori-bg)',
                          border: '1px solid var(--fiori-border)',
                          borderRadius: '2px'
                        }}
                      >
                        {tbl}
                      </span>
                    ))}
                    {tx.linkedTables.length > 3 && (
                      <span style={{ fontSize: '11px', color: 'var(--fiori-text-muted)' }}>
                        +{tx.linkedTables.length - 3}
                      </span>
                    )}
                  </div>
                </td>
                <td>
                  <StatusBadge status={tx.assessmentStatus} />
                </td>
                <td style={{ textAlign: 'right' }}>
                  <div style={{ display: 'inline-flex', gap: '6px' }}>
                    <button
                      type="button"
                      className="fiori-btn fiori-btn-secondary"
                      style={{ height: '26px', fontSize: '11px', padding: '0 8px' }}
                      onClick={() => navigate(`/explorer/${tx.tcode}`)}
                    >
                      <Eye size={12} /> Inspect
                    </button>
                    {tx.assessmentStatus === 'NOT_ASSESSED' && (
                      <button
                        type="button"
                        className="fiori-btn fiori-btn-primary"
                        style={{ height: '26px', fontSize: '11px', padding: '0 8px' }}
                        onClick={() => navigate(`/assessments/new?tcode=${tx.tcode}`)}
                      >
                        Assess
                      </button>
                    )}
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
