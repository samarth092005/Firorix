import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { SapSystem } from '../../types';
import { systemService } from '../../services/mock/systemService';
import { StatusBadge } from '../../components/status/StatusBadge';
import { MessageStrip } from '../../components/status/MessageStrip';
import { ArrowLeft, Server, Activity, ShieldCheck, Database, Key } from 'lucide-react';

export const SystemDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [system, setSystem] = useState<SapSystem | null>(null);
  const [loading, setLoading] = useState(true);
  const [testResult, setTestResult] = useState<{ message: string; success: boolean } | null>(null);
  const [isTesting, setIsTesting] = useState(false);

  useEffect(() => {
    if (id) {
      systemService.getSystemById(id).then((res) => {
        setSystem(res.data);
        setLoading(false);
      });
    }
  }, [id]);

  const handleTest = async () => {
    if (!system) return;
    try {
      setIsTesting(true);
      const res = await systemService.testConnection(system.id);
      setTestResult({ message: res.message || 'Connection test finished', success: res.success });
    } catch (err: any) {
      setTestResult({ message: err.message, success: false });
    } finally {
      setIsTesting(false);
    }
  };

  if (loading) {
    return <div style={{ padding: '32px', textAlign: 'center' }}>Loading system configuration...</div>;
  }

  if (!system) {
    return (
      <div style={{ padding: '32px' }}>
        <MessageStrip type="error">System record not found.</MessageStrip>
        <button className="fiori-btn fiori-btn-secondary" onClick={() => navigate('/systems')}>
          Back to Systems
        </button>
      </div>
    );
  }

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      <button
        type="button"
        className="fiori-btn fiori-btn-subtle"
        style={{ marginBottom: '14px', paddingLeft: 0 }}
        onClick={() => navigate('/systems')}
      >
        <ArrowLeft size={14} /> Back to Systems List
      </button>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Server size={22} color="var(--fiori-teal)" />
            <h1 className="fiori-page-title">{system.alias}</h1>
            <StatusBadge status={system.connectionStatus} />
          </div>
          <p className="fiori-page-subtitle">
            {system.description || 'SAP S/4HANA On-Premise Target Instance'}
          </p>
        </div>

        <button
          type="button"
          className="fiori-btn fiori-btn-primary"
          onClick={handleTest}
          disabled={isTesting}
        >
          <Activity size={14} /> {isTesting ? 'Simulating Handshake...' : 'Simulate Ping Test'}
        </button>
      </div>

      {testResult && (
        <MessageStrip type={testResult.success ? 'success' : 'error'}>
          {testResult.message}
        </MessageStrip>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        {/* Core Connectivity Attributes */}
        <div className="fiori-card">
          <div className="fiori-card-header">
            <div className="fiori-card-title">
              <Database size={16} color="var(--fiori-teal)" /> Connection & Network Endpoints
            </div>
          </div>
          <div className="fiori-card-body" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr', gap: '6px', fontSize: '13px' }}>
              <span style={{ color: 'var(--fiori-text-secondary)', fontWeight: 500 }}>Environment Tier:</span>
              <span><strong>{system.environment}</strong></span>

              <span style={{ color: 'var(--fiori-text-secondary)', fontWeight: 500 }}>Release Baseline:</span>
              <span>{system.targetReleaseProfile}</span>

              <span style={{ color: 'var(--fiori-text-secondary)', fontWeight: 500 }}>Destination Reference:</span>
              <code>{system.destinationReference}</code>

              <span style={{ color: 'var(--fiori-text-secondary)', fontWeight: 500 }}>Internal Hostname:</span>
              <code>{system.host}</code>

              <span style={{ color: 'var(--fiori-text-secondary)', fontWeight: 500 }}>SAP Client:</span>
              <code>{system.client}</code>

              <span style={{ color: 'var(--fiori-text-secondary)', fontWeight: 500 }}>Cloud Connector ID:</span>
              <span>{system.cloudConnectorSubaccount || 'Default Subaccount Mapping'}</span>

              <span style={{ color: 'var(--fiori-text-secondary)', fontWeight: 500 }}>ADT Base URI:</span>
              <code>{system.adtEndpoint}</code>

              <span style={{ color: 'var(--fiori-text-secondary)', fontWeight: 500 }}>Last Handshake:</span>
              <span>{system.lastVerifiedTimestamp}</span>
            </div>
          </div>
        </div>

        {/* Security & Discovery Authorization Scope */}
        <div className="fiori-card">
          <div className="fiori-card-header">
            <div className="fiori-card-title">
              <ShieldCheck size={16} color="var(--fiori-teal)" /> Security & Discovery Scopes
            </div>
          </div>
          <div className="fiori-card-body" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <MessageStrip type="info">
              Communication user is strictly constrained to read-only metadata objects under role <code>Z_FIORIX_DISCOVERY_RO</code>.
            </MessageStrip>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--fiori-border-light)' }}>
                <span>ADT Repository Discovery (`/sap/bc/adt`):</span>
                <StatusBadge status="VERIFIED" />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--fiori-border-light)' }}>
                <span>OData V4 Catalog Services (`/iwbep/catalog`):</span>
                <StatusBadge status="VERIFIED" />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--fiori-border-light)' }}>
                <span>T-Code Table Extraction (`TSTC`, `TADIR`):</span>
                <StatusBadge status="VERIFIED" />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--fiori-border-light)' }}>
                <span>Source Code Inspection (`S_DEVELOP` 03):</span>
                <StatusBadge status="PARTIAL" />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0' }}>
                <span>CTS Automated Transport Creation:</span>
                <StatusBadge status="NOT_AUTHORIZED" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
