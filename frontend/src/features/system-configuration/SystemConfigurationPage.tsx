import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { systemHealthService, GatewayCatalogResult } from '../../services/systemHealthService';
import { SystemHealthResponse } from '../../services/contracts/types';
import {
  PageHeader,
  Breadcrumbs,
  SectionHeader,
  StatusBadge,
  InformationPanel,
  LoadingState,
  SystemStatusIndicator
} from '../../components/common';
import {
  Server,
  Database,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Layers,
  ShieldAlert,
  Sliders,
  Terminal,
  Cpu,
  Lock,
  Search,
  RefreshCw,
  ExternalLink,
  Wifi,
  WifiOff
} from 'lucide-react';

export const SystemConfigurationPage: React.FC = () => {
  const navigate = useNavigate();
  const [health, setHealth] = useState<SystemHealthResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isTesting, setIsTesting] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
    testedAt: string;
    details: string;
  } | null>(null);

  // Gateway Service Catalogue state
  const [catalogState, setCatalogState] = useState<GatewayCatalogResult>({
    status: 'LOADING',
    services: [],
    totalCount: 0,
    returnedCount: 0,
    fromCache: false,
    provenance: 'LIVE_SAP_S21'
  });
  const [catalogSearch, setCatalogSearch] = useState<string>('');
  const [isRefreshingCatalog, setIsRefreshingCatalog] = useState<boolean>(false);

  const fetchCatalog = async (search?: string, refresh?: boolean) => {
    setIsRefreshingCatalog(true);
    try {
      const res = await systemHealthService.getGatewayCatalog({ search, limit: 10, refresh });
      setCatalogState(res);
    } catch (err: any) {
      setCatalogState({
        status: 'BACKEND_OFFLINE',
        services: [],
        totalCount: 0,
        returnedCount: 0,
        fromCache: false,
        provenance: 'LIVE_SAP_S21',
        errorMessage: err.message
      });
    } finally {
      setIsRefreshingCatalog(false);
    }
  };

  useEffect(() => {
    async function loadConfig() {
      setIsLoading(true);
      try {
        const data = await systemHealthService.getSystemHealth('S21');
        setHealth(data);
      } catch (err) {
        console.error('Failed to load system configuration:', err);
      } finally {
        setIsLoading(false);
      }
    }

    loadConfig();
    fetchCatalog();
  }, []);

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const res = await systemHealthService.testConnection('S21');
      setTestResult(res);
      // Refresh health indicators after test
      const updatedHealth = await systemHealthService.getSystemHealth('S21');
      setHealth(updatedHealth);
    } finally {
      setIsTesting(false);
    }
  };

  const handleCatalogSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchCatalog(catalogSearch);
  };

  if (isLoading || !health) {
    return <LoadingState message="Loading system configuration and landscape profile..." />;
  }

  const indicators = health.indicators;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <PageHeader
        title="System &amp; Configuration"
        subtitle="S21 SAP S/4HANA Private Edition landscape parameters, component release levels and connection diagnostics."
        breadcrumbs={<Breadcrumbs items={[{ label: 'System & Configuration' }]} />}
        systemContextBadge={
          <SystemStatusIndicator state={health.connectionState} systemId={health.systemId} client={health.client} />
        }
        actions={[
          {
            label: 'SAP Fiori MCP Server',
            icon: Layers,
            variant: 'secondary',
            onClick: () => navigate('/system-configuration/mcp')
          },
          {
            label: isTesting ? 'Testing...' : 'Test Connection',
            icon: RotateCcw,
            variant: 'primary',
            onClick: handleTestConnection,
            disabled: isTesting
          }
        ]}
      />

      {/* Connection Test Diagnostics Alert */}
      {testResult && (
        <div
          style={{
            padding: '14px 18px',
            borderRadius: 'var(--radius-md, 6px)',
            backgroundColor: testResult.success ? 'var(--fiori-success-bg, #EDF7ED)' : '#FEF7ED',
            border: `1px solid ${testResult.success ? 'var(--fiori-success-border, #A3D9A3)' : '#F8CB96'}`,
            display: 'flex',
            flexDirection: 'column',
            gap: '6px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600, color: testResult.success ? 'var(--fiori-success, #188918)' : '#E9730C' }}>
            {testResult.success ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
            <span>Diagnostic Connection Result ({testResult.testedAt})</span>
          </div>
          <div style={{ fontSize: '13px', color: 'var(--fiori-text-primary, #1B2838)' }}>
            {testResult.message}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--fiori-text-secondary, #64748B)' }}>
            {testResult.details}
          </div>
        </div>
      )}

      {/* System Landscape Profile Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(460px, 1fr))',
          gap: '20px'
        }}
      >
        {/* Left: System Details & Separated Health Indicators */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Target Environment */}
          <div
            style={{
              backgroundColor: '#FFFFFF',
              border: '1px solid var(--fiori-border, #E2E8F0)',
              borderRadius: 'var(--radius-md, 10px)',
              padding: '22px',
              boxShadow: 'var(--fiori-shadow-card)'
            }}
          >
            <SectionHeader
              title="Target SAP S/4HANA Environment"
              description="Configured private cloud endpoint details."
            />

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', backgroundColor: 'var(--fiori-surface-subtle, #F9FAFB)', borderRadius: 'var(--radius-sm, 6px)', border: '1px solid var(--fiori-border-light, #EDF1F3)' }}>
                <span style={{ color: 'var(--fiori-text-secondary, #556B82)' }}>System Identifier (SID):</span>
                <strong style={{ color: 'var(--fiori-text-primary, #1D2D3E)' }}>{health.systemId}</strong>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', backgroundColor: 'var(--fiori-surface-subtle, #F9FAFB)', borderRadius: 'var(--radius-sm, 6px)', border: '1px solid var(--fiori-border-light, #EDF1F3)' }}>
                <span style={{ color: 'var(--fiori-text-secondary, #556B82)' }}>Target Client:</span>
                <strong style={{ color: 'var(--fiori-text-primary, #1D2D3E)' }}>{health.client}</strong>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', backgroundColor: 'var(--fiori-surface-subtle, #F9FAFB)', borderRadius: 'var(--radius-sm, 6px)', border: '1px solid var(--fiori-border-light, #EDF1F3)' }}>
                <span style={{ color: 'var(--fiori-text-secondary, #556B82)' }}>Platform / Release:</span>
                <strong style={{ color: 'var(--fiori-text-primary, #1D2D3E)' }}>{health.platform}</strong>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', backgroundColor: 'var(--fiori-surface-subtle, #F9FAFB)', borderRadius: 'var(--radius-sm, 6px)', border: '1px solid var(--fiori-border-light, #EDF1F3)' }}>
                <span style={{ color: 'var(--fiori-text-secondary, #556B82)' }}>Destination Reference:</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{health.connectivityStatus.destinationName}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', backgroundColor: 'var(--fiori-surface-subtle, #F9FAFB)', borderRadius: 'var(--radius-sm, 6px)', border: '1px solid var(--fiori-border-light, #EDF1F3)' }}>
                <span style={{ color: 'var(--fiori-text-secondary, #556B82)' }}>Cloud Connector Subaccount:</span>
                <span style={{ fontFamily: 'var(--font-mono)' }}>{health.connectivityStatus.cloudConnectorSubaccount || 'N/A'}</span>
              </div>
            </div>
          </div>

          {/* Separated Landscape Health Indicators (FX-003 Step 4) */}
          <div
            style={{
              backgroundColor: '#FFFFFF',
              border: '1px solid var(--fiori-border, #E2E8F0)',
              borderRadius: 'var(--radius-md, 10px)',
              padding: '22px',
              boxShadow: 'var(--fiori-shadow-card)'
            }}
          >
            <SectionHeader
              title="Separated Landscape Health Indicators"
              description="Independent monitoring of backend services, SAP reachability, tunnel status, and Gateway."
            />

            {indicators ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {/* 1. Backend Health */}
                <div style={{ padding: '10px 14px', borderRadius: '6px', border: '1px solid var(--fiori-border, #E2E8F0)', backgroundColor: '#F8FAFC' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <span style={{ fontWeight: 600, fontSize: '13px' }}>1. {indicators.backendHealth.label}</span>
                    <StatusBadge
                      status={indicators.backendHealth.status}
                      variant={indicators.backendHealth.badgeVariant}
                      customLabel={indicators.backendHealth.statusText}
                      size="sm"
                    />
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--fiori-text-secondary, #64748B)' }}>
                    {indicators.backendHealth.details}
                  </div>
                </div>

                {/* 2. Configured SAP System Status */}
                <div style={{ padding: '10px 14px', borderRadius: '6px', border: '1px solid var(--fiori-border, #E2E8F0)', backgroundColor: '#F8FAFC' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <span style={{ fontWeight: 600, fontSize: '13px' }}>2. {indicators.configuredSystem.label}</span>
                    <StatusBadge
                      status={indicators.configuredSystem.status}
                      variant={indicators.configuredSystem.badgeVariant}
                      customLabel={indicators.configuredSystem.statusText}
                      size="sm"
                    />
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--fiori-text-secondary, #64748B)' }}>
                    {indicators.configuredSystem.details}
                  </div>
                </div>

                {/* 3. SAP Host Reachability */}
                <div style={{ padding: '10px 14px', borderRadius: '6px', border: '1px solid var(--fiori-border, #E2E8F0)', backgroundColor: '#F8FAFC' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <span style={{ fontWeight: 600, fontSize: '13px' }}>3. {indicators.sapHostReachability.label}</span>
                    <StatusBadge
                      status={indicators.sapHostReachability.status}
                      variant={indicators.sapHostReachability.badgeVariant}
                      customLabel={indicators.sapHostReachability.statusText}
                      size="sm"
                    />
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--fiori-text-secondary, #64748B)' }}>
                    {indicators.sapHostReachability.details}
                  </div>
                </div>

                {/* 4. Cloud Connector Availability */}
                <div style={{ padding: '10px 14px', borderRadius: '6px', border: '1px solid var(--fiori-border, #E2E8F0)', backgroundColor: '#F8FAFC' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <span style={{ fontWeight: 600, fontSize: '13px' }}>4. {indicators.cloudConnector.label}</span>
                    <StatusBadge
                      status={indicators.cloudConnector.status}
                      variant={indicators.cloudConnector.badgeVariant}
                      customLabel={indicators.cloudConnector.statusText}
                      size="sm"
                    />
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--fiori-text-secondary, #64748B)' }}>
                    {indicators.cloudConnector.details}
                  </div>
                </div>

                {/* 5. SAP Gateway Availability */}
                <div style={{ padding: '10px 14px', borderRadius: '6px', border: '1px solid var(--fiori-border, #E2E8F0)', backgroundColor: '#F8FAFC' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <span style={{ fontWeight: 600, fontSize: '13px' }}>5. {indicators.sapGateway.label}</span>
                    <StatusBadge
                      status={indicators.sapGateway.status}
                      variant={indicators.sapGateway.badgeVariant}
                      customLabel={indicators.sapGateway.statusText}
                      size="sm"
                    />
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--fiori-text-secondary, #64748B)' }}>
                    {indicators.sapGateway.details}
                  </div>
                </div>

                {/* 6. Gateway Service Catalogue */}
                <div style={{ padding: '10px 14px', borderRadius: '6px', border: '1px solid var(--fiori-border, #E2E8F0)', backgroundColor: '#F8FAFC' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <span style={{ fontWeight: 600, fontSize: '13px' }}>6. {indicators.gatewayCatalog.label}</span>
                    <StatusBadge
                      status={indicators.gatewayCatalog.status}
                      variant={indicators.gatewayCatalog.badgeVariant}
                      customLabel={indicators.gatewayCatalog.statusText}
                      size="sm"
                    />
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--fiori-text-secondary, #64748B)' }}>
                    {indicators.gatewayCatalog.details}
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ fontSize: '12px', color: '#64748B' }}>Indicators loading...</div>
            )}
          </div>
        </div>

        {/* Right: Software Component Levels & Gateway Catalog Explorer */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Component Levels Panel */}
          <div
            style={{
              backgroundColor: '#FFFFFF',
              border: '1px solid var(--fiori-border, #E2E8F0)',
              borderRadius: 'var(--radius-md, 10px)',
              padding: '22px',
              boxShadow: 'var(--fiori-shadow-card)'
            }}
          >
            <SectionHeader
              title="Installed Software Components"
              description="Recorded component levels for S21. Status marked as awaiting live refresh."
            />

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {health.components.map((comp) => (
                <div
                  key={comp.name}
                  style={{
                    padding: '10px 14px',
                    borderRadius: 'var(--radius-sm, 6px)',
                    border: '1px solid var(--fiori-border-light, #EDF1F3)',
                    backgroundColor: 'var(--fiori-surface-subtle, #F9FAFB)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontWeight: 600, fontFamily: 'var(--font-mono)', fontSize: '13px', color: 'var(--fiori-text-primary, #1D2D3E)' }}>
                        {comp.name}
                      </span>
                      <span style={{ fontSize: '12px', color: 'var(--fiori-text-secondary, #556B82)' }}>
                        Release {comp.release}
                      </span>
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--fiori-text-secondary, #556B82)', marginTop: '2px' }}>
                      {comp.description} &bull; Patch Level: <strong>{comp.spLevel}</strong>
                    </div>
                  </div>

                  <StatusBadge status={comp.status} size="sm" customLabel="Recorded" />
                </div>
              ))}
            </div>
          </div>

          {/* Live SAP Gateway Service Catalogue Explorer (FX-003 Step 2, 4, 5, 6) */}
          <div
            style={{
              backgroundColor: '#FFFFFF',
              border: '1px solid var(--fiori-border, #E2E8F0)',
              borderRadius: 'var(--radius-md, 10px)',
              padding: '22px',
              boxShadow: 'var(--fiori-shadow-card)'
            }}
          >
            <SectionHeader
              title="SAP Gateway Service Catalogue (Live S21)"
              description="Endpoint: GET /api/v1/gateway/services"
            />

            {/* Catalogue Search & Refresh Bar */}
            <form onSubmit={handleCatalogSearchSubmit} style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
              <div style={{ position: 'relative', flex: 1 }}>
                <input
                  type="text"
                  placeholder="Filter service by technical name (e.g. Z_FIORIX, EPM, SD)..."
                  value={catalogSearch}
                  onChange={(e) => setCatalogSearch(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px 8px 34px',
                    borderRadius: '6px',
                    border: '1px solid #CBD5E1',
                    fontSize: '12px'
                  }}
                />
                <Search size={14} color="#64748B" style={{ position: 'absolute', left: '10px', top: '10px' }} />
              </div>
              <button
                type="submit"
                className="fiori-btn fiori-btn-secondary"
                disabled={isRefreshingCatalog}
                style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <Search size={13} /> Search
              </button>
              <button
                type="button"
                className="fiori-btn fiori-btn-subtle"
                onClick={() => fetchCatalog(catalogSearch, true)}
                disabled={isRefreshingCatalog}
                title="Force refresh live catalog"
                style={{ fontSize: '12px' }}
              >
                <RefreshCw size={13} className={isRefreshingCatalog ? 'spin' : ''} />
              </button>
            </form>

            {/* Catalog State Renderers */}
            {catalogState.status === 'LOADING' && (
              <div style={{ padding: '24px', textAlign: 'center', fontSize: '12px', color: '#64748B' }}>
                Querying SAP Gateway service catalogue...
              </div>
            )}

            {catalogState.status === 'UNAUTHORIZED' && (
              <div
                style={{
                  padding: '14px 16px',
                  borderRadius: '6px',
                  backgroundColor: '#FFFBEB',
                  border: '1px solid #FDE68A',
                  color: '#92400E',
                  fontSize: '12px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600, marginBottom: '6px' }}>
                  <Lock size={15} color="#D97706" />
                  <span>Administrative Authentication Boundary (HTTP 401)</span>
                </div>
                <p style={{ margin: '0 0 6px 0', lineHeight: 1.5 }}>
                  The backend Gateway catalog endpoint (<code>GET /api/v1/gateway/services</code>) requires administrative authorization (<code>FIORIX_ADMIN_SECRET</code>).
                </p>
                <p style={{ margin: 0, fontSize: '11px', color: '#B45309', lineHeight: 1.4 }}>
                  <strong>Security Enforcement:</strong> In compliance with Clean Core governance, privileged administrative credentials are not exposed to client-side browser sessions. Live catalog synchronization is performed via authorized backend tasks.
                </p>
              </div>
            )}

            {catalogState.status === 'BACKEND_OFFLINE' && (
              <div
                style={{
                  padding: '14px 16px',
                  borderRadius: '6px',
                  backgroundColor: '#FEF2F2',
                  border: '1px solid #FECACA',
                  color: '#991B1B',
                  fontSize: '12px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600, marginBottom: '4px' }}>
                  <WifiOff size={15} color="#DC2626" />
                  <span>Backend Offline</span>
                </div>
                <div>{catalogState.errorMessage || 'FioriX backend HTTP service is unreachable.'}</div>
              </div>
            )}

            {catalogState.status === 'UNREACHABLE' && (
              <div
                style={{
                  padding: '14px 16px',
                  borderRadius: '6px',
                  backgroundColor: '#FEF2F2',
                  border: '1px solid #FECACA',
                  color: '#991B1B',
                  fontSize: '12px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600, marginBottom: '4px' }}>
                  <AlertTriangle size={15} color="#DC2626" />
                  <span>SAP Gateway Unreachable (HTTP 502)</span>
                </div>
                <div>{catalogState.errorMessage}</div>
              </div>
            )}

            {catalogState.status === 'EMPTY' && (
              <div style={{ padding: '24px', textAlign: 'center', fontSize: '12px', color: '#64748B' }}>
                No registered SAP Gateway services found matching query "{catalogSearch}".
              </div>
            )}

            {catalogState.status === 'LOADED' && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', fontSize: '11px', color: '#64748B' }}>
                  <span>Showing {catalogState.services.length} of {catalogState.totalCount.toLocaleString()} services</span>
                  <span>Provenance: {catalogState.provenance}</span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '240px', overflowY: 'auto' }}>
                  {catalogState.services.map((srv) => (
                    <div
                      key={srv.id || srv.technicalServiceName}
                      style={{
                        padding: '8px 12px',
                        borderRadius: '4px',
                        border: '1px solid #E2E8F0',
                        backgroundColor: '#F8FAFC',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        fontSize: '11px'
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 600, fontFamily: 'var(--font-mono)', color: '#0F172A' }}>
                          {srv.technicalServiceName}
                        </div>
                        <div style={{ color: '#64748B' }}>{srv.title || srv.description}</div>
                      </div>
                      <span
                        style={{
                          fontSize: '10px',
                          padding: '2px 6px',
                          borderRadius: '10px',
                          backgroundColor: '#E0F2FE',
                          color: '#0369A1',
                          fontWeight: 600
                        }}
                      >
                        v{srv.version || 1}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>


      



            
          </div>
        </div>
      </div>

  );
};
