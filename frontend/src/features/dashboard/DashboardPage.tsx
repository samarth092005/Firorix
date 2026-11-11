import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { dashboardService, DashboardMetrics } from '../../services/mock/dashboardService';
import { StatusBadge } from '../../components/status/StatusBadge';
import { PlusCircle, Library, Server, FileText, ArrowRight, Activity } from 'lucide-react';

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    dashboardService.getMetrics().then((res) => {
      setMetrics(res.data);
      setLoading(false);
    });
  }, []);

  if (loading || !metrics) {
    return <div style={{ padding: '32px', textAlign: 'center' }}>Loading dashboard telemetry...</div>;
  }

  return (
    <div style={{ padding: '24px', maxWidth: '1440px', margin: '0 auto' }}>
      {/* Page Header */}
      <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 className="fiori-page-title">Executive Discovery & Assessment Dashboard</h1>
          <p className="fiori-page-subtitle">
            Overview of SAP S/4HANA transaction assessments, standard Fiori catalog coverage, and custom generation candidates.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            type="button"
            className="fiori-btn fiori-btn-primary"
            onClick={() => navigate('/assessments/new')}
          >
            <PlusCircle size={14} /> Start New Assessment
          </button>
          <button
            type="button"
            className="fiori-btn fiori-btn-secondary"
            onClick={() => navigate('/catalogue')}
          >
            <Library size={14} /> Browse Fiori Catalogue
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '16px',
          marginBottom: '24px'
        }}
      >
        <div className="fiori-card" style={{ padding: '16px' }}>
          <div style={{ fontSize: '12px', color: 'var(--fiori-text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>
            Transactions Assessed
          </div>
          <div style={{ fontSize: '28px', fontWeight: 700, color: 'var(--fiori-text-primary)', margin: '8px 0 4px' }}>
            {metrics.transactionsAssessedCount}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--fiori-text-muted)' }}>
            Target transactions with active or completed discovery
          </div>
        </div>

        <div className="fiori-card" style={{ padding: '16px' }}>
          <div style={{ fontSize: '12px', color: 'var(--fiori-text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>
            Standard Fiori Apps Evaluated
          </div>
          <div style={{ fontSize: '28px', fontWeight: 700, color: 'var(--fiori-teal)', margin: '8px 0 4px' }}>
            {metrics.standardFioriAppsEvaluatedCount}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--fiori-text-muted)' }}>
            Curated official SAP Reference Library records
          </div>
        </div>

        <div className="fiori-card" style={{ padding: '16px' }}>
          <div style={{ fontSize: '12px', color: 'var(--fiori-text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>
            Open Functional Gaps
          </div>
          <div style={{ fontSize: '28px', fontWeight: 700, color: 'var(--fiori-warning)', margin: '8px 0 4px' }}>
            {metrics.openFunctionalGapsCount}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--fiori-text-muted)' }}>
            Requirements scored as Unsupported or Unknown
          </div>
        </div>

        <div className="fiori-card" style={{ padding: '16px' }}>
          <div style={{ fontSize: '12px', color: 'var(--fiori-text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>
            Custom Draft Applications
          </div>
          <div style={{ fontSize: '28px', fontWeight: 700, color: 'var(--fiori-navy)', margin: '8px 0 4px' }}>
            {metrics.draftApplicationsCount}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--fiori-text-muted)' }}>
            Validated blueprints prepared for human review
          </div>
        </div>
      </div>

      {/* Main Content Split: Left (Recent Assessments) & Right (Landscape & Activity) */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px' }}>
        {/* Left: Recent Assessments */}
        <div className="fiori-card">
          <div className="fiori-card-header">
            <div className="fiori-card-title">
              <FileText size={16} color="var(--fiori-teal)" /> Recent Transaction Assessments
            </div>
            <button
              className="fiori-btn fiori-btn-subtle"
              style={{ fontSize: '12px' }}
              onClick={() => navigate('/assessments')}
            >
              View All <ArrowRight size={12} />
            </button>
          </div>
          <div style={{ padding: 0 }}>
            <table className="fiori-table">
              <thead>
                <tr>
                  <th>T-Code</th>
                  <th>Assessment Title</th>
                  <th>System</th>
                  <th>Outcome</th>
                  <th>Progress</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {metrics.recentAssessments.map((a) => (
                  <tr key={a.id}>
                    <td>
                      <code style={{ fontWeight: 600, color: 'var(--fiori-text-primary)' }}>{a.tcode}</code>
                    </td>
                    <td>
                      <div style={{ fontWeight: 500 }}>{a.title}</div>
                      <div style={{ fontSize: '11px', color: 'var(--fiori-text-secondary)' }}>{a.businessProcess}</div>
                    </td>
                    <td>{a.systemAlias}</td>
                    <td>
                      <StatusBadge status={a.recommendationOutcome || a.status} />
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
                      <button
                        type="button"
                        className="fiori-btn fiori-btn-secondary"
                        style={{ height: '26px', fontSize: '11px', padding: '0 8px' }}
                        onClick={() => navigate(`/assessments/${a.id}`)}
                      >
                        Open Workspace
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right: Landscape Connection & Activity */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Landscape Health Card */}
          <div className="fiori-card">
            <div className="fiori-card-header">
              <div className="fiori-card-title">
                <Server size={16} color="var(--fiori-teal)" /> Landscape Status
              </div>
              <button
                className="fiori-btn fiori-btn-subtle"
                style={{ fontSize: '11px' }}
                onClick={() => navigate('/systems')}
              >
                Manage
              </button>
            </div>
            <div className="fiori-card-body" style={{ padding: '14px 16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '13px' }}>
                <span style={{ color: 'var(--fiori-text-secondary)' }}>Connected Instances (Simulated):</span>
                <span style={{ fontWeight: 600, color: 'var(--fiori-success)' }}>
                  {metrics.systemHealth.connectedSystems} / {metrics.systemHealth.totalSystems}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '12px' }}>
                <span style={{ color: 'var(--fiori-text-secondary)' }}>Cloud Connector Tunnel:</span>
                <span style={{ fontWeight: 600, color: 'var(--fiori-teal)' }}>Active (Demo Proxy)</span>
              </div>
              <div
                style={{
                  padding: '8px 10px',
                  backgroundColor: 'var(--fiori-bg)',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '11px',
                  color: 'var(--fiori-text-secondary)',
                  border: '1px solid var(--fiori-border)'
                }}
              >
                Primary Target: <strong>S4H_DEV_100</strong> (S/4HANA 2022 FPS02)
              </div>
            </div>
          </div>

          {/* Recent Discovery Activity */}
          <div className="fiori-card">
            <div className="fiori-card-header">
              <div className="fiori-card-title">
                <Activity size={16} color="var(--fiori-teal)" /> Discovery Job Activity
              </div>
              <button
                className="fiori-btn fiori-btn-subtle"
                style={{ fontSize: '11px' }}
                onClick={() => navigate('/jobs')}
              >
                All Jobs
              </button>
            </div>
            <div className="fiori-card-body" style={{ padding: '10px 16px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {metrics.recentJobs.map((j) => (
                  <div
                    key={j.id}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '2px',
                      paddingBottom: '8px',
                      borderBottom: '1px solid var(--fiori-border-light)'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '12px', fontWeight: 600 }}>{j.targetTCode}</span>
                      <StatusBadge status={j.status} />
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--fiori-text-secondary)' }}>
                      {j.stageDetails}
                    </div>
                    <div style={{ fontSize: '10px', color: 'var(--fiori-text-muted)' }}>
                      {j.createdDate} by {j.executedBy}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
