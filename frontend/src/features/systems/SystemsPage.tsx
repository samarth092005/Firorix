import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { SapSystem } from '../../types';
import { systemService } from '../../services/mock/systemService';
import { StatusBadge } from '../../components/status/StatusBadge';
import { FilterBar } from '../../components/tables/FilterBar';
import { AddSystemDialog } from '../../components/dialogs/AddSystemDialog';
import { PlusCircle, Activity, ExternalLink } from 'lucide-react';
import { MessageStrip } from '../../components/status/MessageStrip';

export const SystemsPage: React.FC = () => {
  const navigate = useNavigate();
  const [systems, setSystems] = useState<SapSystem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [environmentFilter, setEnvironmentFilter] = useState('ALL');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [testingSystemId, setTestingSystemId] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{ id: string; message: string; success: boolean } | null>(null);

  const loadData = async () => {
    const res = await systemService.getAllSystems();
    setSystems(res.data);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleTestConnection = async (id: string, alias: string) => {
    try {
      setTestingSystemId(id);
      setTestResult(null);
      const res = await systemService.testConnection(id);
      setTestResult({
        id,
        message: `[${alias}] ${res.message} (Roundtrip: ${res.data.latencyMs}ms)`,
        success: res.success
      });
    } catch (err: any) {
      setTestResult({ id, message: err.message, success: false });
    } finally {
      setTestingSystemId(null);
    }
  };

  const filteredSystems = systems.filter((s) => {
    const matchesSearch =
      s.alias.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.host.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.destinationReference.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesEnv = environmentFilter === 'ALL' || s.environment === environmentFilter;
    return matchesSearch && matchesEnv;
  });

  return (
    <div style={{ padding: '24px', maxWidth: '1440px', margin: '0 auto' }}>
      <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 className="fiori-page-title">SAP S/4HANA System Landscape</h1>
          <p className="fiori-page-subtitle">
            Registered On-Premise S/4HANA systems, Cloud Connector virtual routes, and ADT discovery endpoint bindings.
          </p>
        </div>
        <button
          type="button"
          className="fiori-btn fiori-btn-primary"
          onClick={() => setIsAddOpen(true)}
        >
          <PlusCircle size={14} /> Add SAP System
        </button>
      </div>

      <MessageStrip type="info">
        <strong>Governance Boundary Notice:</strong> FioriX operates in local demonstration mode. Connection tests simulate BTP Destination Service pings over Cloud Connector without sending real packets to live enterprise backends.
      </MessageStrip>

      {testResult && (
        <MessageStrip type={testResult.success ? 'success' : 'error'}>
          {testResult.message}
        </MessageStrip>
      )}

      <FilterBar
        searchPlaceholder="Filter systems by alias, destination, or host..."
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        filters={[
          {
            key: 'env',
            label: 'Environment',
            value: environmentFilter,
            onChange: setEnvironmentFilter,
            options: [
              { label: 'All Environments', value: 'ALL' },
              { label: 'Development (DEV)', value: 'DEVELOPMENT' },
              { label: 'Quality (QAS)', value: 'QUALITY' },
              { label: 'Sandbox (SBX)', value: 'SANDBOX' },
              { label: 'Production (PRD)', value: 'PRODUCTION' }
            ]
          }
        ]}
        onReset={() => {
          setSearchQuery('');
          setEnvironmentFilter('ALL');
        }}
      />

      <div className="fiori-table-container">
        <table className="fiori-table">
          <thead>
            <tr>
              <th>System Alias</th>
              <th>Environment</th>
              <th>Target Release Profile</th>
              <th>Destination Reference</th>
              <th>Client</th>
              <th>Connection Status</th>
              <th>Last Verified</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredSystems.map((sys) => (
              <tr key={sys.id}>
                <td>
                  <div style={{ fontWeight: 600, color: 'var(--fiori-text-primary)' }}>{sys.alias}</div>
                  <div style={{ fontSize: '11px', color: 'var(--fiori-text-secondary)' }}>{sys.host}</div>
                </td>
                <td>
                  <span style={{ fontSize: '12px', fontWeight: 500 }}>{sys.environment}</span>
                </td>
                <td>
                  <div style={{ fontSize: '12px', color: 'var(--fiori-text-primary)' }}>{sys.targetReleaseProfile}</div>
                </td>
                <td>
                  <code>{sys.destinationReference}</code>
                </td>
                <td>
                  <code>{sys.client}</code>
                </td>
                <td>
                  <StatusBadge status={sys.connectionStatus} />
                </td>
                <td>
                  <span style={{ fontSize: '12px', color: 'var(--fiori-text-secondary)' }}>
                    {sys.lastVerifiedTimestamp}
                  </span>
                </td>
                <td style={{ textAlign: 'right' }}>
                  <div style={{ display: 'inline-flex', gap: '6px' }}>
                    <button
                      type="button"
                      className="fiori-btn fiori-btn-secondary"
                      style={{ height: '26px', fontSize: '11px', padding: '0 8px' }}
                      disabled={testingSystemId === sys.id}
                      onClick={() => handleTestConnection(sys.id, sys.alias)}
                      title="Simulate connection test over Cloud Connector"
                    >
                      <Activity size={12} />
                      {testingSystemId === sys.id ? 'Testing...' : 'Test Connection'}
                    </button>
                    <button
                      type="button"
                      className="fiori-btn fiori-btn-subtle"
                      style={{ height: '26px', fontSize: '11px', padding: '0 8px' }}
                      onClick={() => navigate(`/systems/${sys.id}`)}
                    >
                      <ExternalLink size={12} /> Inspect
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <AddSystemDialog
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        onSystemAdded={loadData}
      />
    </div>
  );
};
