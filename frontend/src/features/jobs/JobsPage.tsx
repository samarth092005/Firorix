import React, { useState } from 'react';
import { localStore } from '../../services/mock/localStore';
import { DiscoveryJob } from '../../types';
import { StatusBadge } from '../../components/status/StatusBadge';
import { MessageStrip } from '../../components/status/MessageStrip';
import { Clock, RotateCcw } from 'lucide-react';

export const JobsPage: React.FC = () => {
  const [jobs, setJobs] = useState<DiscoveryJob[]>(localStore.getJobs());
  const [retryNotice, setRetryNotice] = useState<string | null>(null);

  const handleRetry = (jobId: string) => {
    setRetryNotice(`Simulated retry dispatched for Job ${jobId}`);
    setTimeout(() => setRetryNotice(null), 3500);
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1440px', margin: '0 auto' }}>
      <div style={{ marginBottom: '20px' }}>
        <h1 className="fiori-page-title">Asynchronous Discovery Jobs</h1>
        <p className="fiori-page-subtitle">
          Background scan execution queue, ADT repository where-used traversal progress, and error telemetry.
        </p>
      </div>

      <MessageStrip type="info">
        <strong>Execution Telemetry:</strong> Long-running metadata scans operate asynchronously to avoid Cloud Foundry 120s HTTP gateway timeouts. Status is persisted in the database-backed job table.
      </MessageStrip>

      {retryNotice && <MessageStrip type="success">{retryNotice}</MessageStrip>}

      <div className="fiori-table-container">
        <table className="fiori-table">
          <thead>
            <tr>
              <th>Job ID</th>
              <th>Job Type</th>
              <th>Target System & T-Code</th>
              <th>Status</th>
              <th>Progress</th>
              <th>Stage Output & Details</th>
              <th>Created & Finished</th>
              <th>Executed By</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {jobs.map((job) => (
              <tr key={job.id}>
                <td>
                  <code style={{ fontSize: '12px', fontWeight: 600 }}>{job.id}</code>
                </td>
                <td>
                  <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--fiori-text-secondary)' }}>
                    {job.jobType}
                  </span>
                </td>
                <td>
                  <div><strong>{job.targetTCode}</strong></div>
                  <div style={{ fontSize: '11px', color: 'var(--fiori-text-secondary)' }}>{job.systemAlias}</div>
                </td>
                <td>
                  <StatusBadge status={job.status} />
                </td>
                <td style={{ width: '100px' }}>
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
                          width: `${job.progressPercent}%`,
                          height: '100%',
                          backgroundColor: job.status === 'FAILED' ? 'var(--fiori-error)' : 'var(--fiori-teal)'
                        }}
                      />
                    </div>
                    <span style={{ fontSize: '11px', color: 'var(--fiori-text-secondary)' }}>
                      {job.progressPercent}%
                    </span>
                  </div>
                </td>
                <td style={{ fontSize: '12px', maxWidth: '340px' }}>
                  <div style={{ color: 'var(--fiori-text-primary)' }}>{job.stageDetails}</div>
                  {job.errorMessage && (
                    <div style={{ color: 'var(--fiori-error)', fontSize: '11px', marginTop: '2px' }}>
                      {job.errorMessage}
                    </div>
                  )}
                </td>
                <td style={{ fontSize: '11px', color: 'var(--fiori-text-secondary)' }}>
                  <div>Created: {job.createdDate}</div>
                  {job.finishedDate && <div>Finished: {job.finishedDate}</div>}
                </td>
                <td style={{ fontSize: '12px' }}>
                  {job.executedBy}
                </td>
                <td style={{ textAlign: 'right' }}>
                  {job.status === 'FAILED' ? (
                    <button
                      type="button"
                      className="fiori-btn fiori-btn-secondary"
                      style={{ height: '24px', fontSize: '11px', padding: '0 8px' }}
                      onClick={() => handleRetry(job.id)}
                    >
                      <RotateCcw size={10} /> Retry
                    </button>
                  ) : (
                    <span style={{ fontSize: '11px', color: 'var(--fiori-text-muted)' }}>—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
