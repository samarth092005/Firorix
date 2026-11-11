import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  catalogueService,
  CatalogueAppRecord,
  CatalogueStatusInfo
} from '../../services/catalogue/catalogueService';
import { ApiError } from '../../services/api/apiClient';
import { FilterBar } from '../../components/tables/FilterBar';
import { MessageStrip } from '../../components/status/MessageStrip';
import {
  Library,
  ExternalLink,
  RefreshCw,
  AlertTriangle,
  WifiOff,
  Server,
  Layers,
  Database,
  LayoutGrid,
  Table as TableIcon,
  CheckCircle2,
  ArrowRight,
  Sparkles
} from 'lucide-react';
import './CataloguePage.css';

export const CataloguePage: React.FC = () => {
  const navigate = useNavigate();
  const [apps, setApps] = useState<CatalogueAppRecord[]>([]);
  const [statusInfo, setStatusInfo] = useState<CatalogueStatusInfo | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLob, setSelectedLob] = useState('');
  const [selectedAppType, setSelectedAppType] = useState('');
  const [selectedProvenance, setSelectedProvenance] = useState('');
  const [selectedModule, setSelectedModule] = useState('ALL');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [statusLoading, setStatusLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isOffline, setIsOffline] = useState(false);

  // Fetch status info
  const loadStatus = useCallback(async () => {
    setStatusLoading(true);
    try {
      const status = await catalogueService.getCatalogueStatus();
      setStatusInfo(status);
    } catch (err: any) {
      console.warn('Could not load catalogue status:', err);
    } finally {
      setStatusLoading(false);
    }
  }, []);

  // Fetch catalogue apps
  const loadCatalogue = useCallback(async () => {
    setLoading(true);
    setError(null);
    setIsOffline(false);

    try {
      const res = await catalogueService.searchCatalogue({
        searchQuery: searchQuery.trim(),
        lineOfBusiness: selectedLob || undefined,
        isDemoMode
      });
      setApps(res.data);
    } catch (err: any) {
      if (err instanceof ApiError && (err.isNetworkError || err.statusCode === 0)) {
        setIsOffline(true);
        setError('Cannot reach FioriX backend service on port 4004. Please verify the backend is running.');
      } else {
        setError(err.message || 'Failed to load catalogue records from backend.');
      }
      setApps([]);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, selectedLob, isDemoMode]);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  useEffect(() => {
    loadCatalogue();
  }, [loadCatalogue]);

  // Provenance Badge
  const renderProvenanceBadge = (provenance: string) => {
    let label = provenance;
    let badgeClass = 'tech-badge-pill webgui';

    switch (provenance) {
      case 'OFFICIAL_FAL_EXPORT':
        label = 'Official Export';
        badgeClass = 'tech-badge-pill freestyle';
        break;
      case 'OFFICIAL_CATALOGUE_LIVE':
        label = 'Live SAP FAL';
        badgeClass = 'tech-badge-pill elements';
        break;
      case 'OFFICIAL_CATALOGUE_CACHED':
        label = 'Verified Baseline';
        badgeClass = 'tech-badge-pill elements';
        break;
      case 'CURATED_FIXTURE':
        label = 'Demo Fixture';
        badgeClass = 'tech-badge-pill webgui';
        break;
      default:
        label = provenance || 'Official';
    }

    return <span className={badgeClass}>{label}</span>;
  };

  // Helper to format raw SAP role strings into clean, human-readable titles
  const parseRoles = useCallback((rawRole?: string): { display: string[]; extraCount: number } => {
    if (!rawRole) return { display: [], extraCount: 0 };
    const tokens = rawRole
      .split(/[\*\$,;]+/)
      .map((r) => r.trim().replace(/^SAP_BR_/, '').replace(/^SAP_/, '').replace(/_/g, ' '))
      .filter((r) => r.length > 2 && !r.toLowerCase().includes('dummy'));

    const unique = [...new Set(tokens)];
    const top = unique.slice(0, 2);
    const extraCount = Math.max(0, unique.length - 2);
    return { display: top, extraCount };
  }, []);

  // Filter apps
  const filteredApps = useMemo(() => {
    return apps.filter((app) => {
      if (selectedAppType && (app.appType || 'Transactional') !== selectedAppType) return false;
      if (selectedProvenance && app.provenance !== selectedProvenance) return false;

      // Module quick filter
      if (selectedModule !== 'ALL') {
        const text = `${app.lineOfBusiness || ''} ${app.businessProcess || ''} ${app.appName || ''}`.toUpperCase();
        if (selectedModule === 'FI' && !text.includes('FINANCE') && !text.includes('ACCOUNT') && !text.includes('PAYMENT')) return false;
        if (selectedModule === 'MM' && !text.includes('PURCHAS') && !text.includes('SOURCING') && !text.includes('SUPPLY') && !text.includes('INVOICE')) return false;
        if (selectedModule === 'SD' && !text.includes('SALE') && !text.includes('BILLING') && !text.includes('CUSTOMER')) return false;
        if (selectedModule === 'CONFIG' && !text.includes('CONFIG') && !text.includes('NUMBER RANGE') && !text.includes('PERIOD')) return false;
      }

      return true;
    });
  }, [apps, selectedAppType, selectedProvenance, selectedModule]);

  return (
    <div className="catalogue-root">
      {/* 1. Header Toolbar */}
      <div className="catalogue-header">
        <div className="catalogue-title-group">
          <div className="catalogue-title-row">
            <div className="catalogue-title-icon">
              <Library size={18} />
            </div>
            <h1 className="catalogue-heading">SAP Fiori Applications Catalogue</h1>
          </div>
          <p className="catalogue-subtitle">
            Authoritative Fiori application metadata synchronized from the SAP Fiori Apps Reference Library (17,049 Global Apps).
          </p>
        </div>

        <div className="catalogue-actions">
          {/* Grid vs Table View Switcher */}
          <div className="view-toggle-group">
            <button
              type="button"
              className={`view-toggle-btn ${viewMode === 'grid' ? 'active' : ''}`}
              onClick={() => setViewMode('grid')}
              title="Tile Grid View"
            >
              <LayoutGrid size={14} />
              <span>Grid</span>
            </button>
            <button
              type="button"
              className={`view-toggle-btn ${viewMode === 'table' ? 'active' : ''}`}
              onClick={() => setViewMode('table')}
              title="Compact Table View"
            >
              <TableIcon size={14} />
              <span>Table</span>
            </button>
          </div>

          <button
            type="button"
            className="btn-refresh"
            onClick={() => {
              loadStatus();
              loadCatalogue();
            }}
            disabled={loading}
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            <span>Sync</span>
          </button>
        </div>
      </div>

      {/* 2. Executive KPI Ribbon */}
      <div className="catalogue-kpi-grid">
        <div className="catalogue-kpi-card">
          <div className="kpi-icon-wrap">
            <Database size={20} />
          </div>
          <div className="kpi-content">
            <div className="kpi-value-row">
              <span className="kpi-number">{statusInfo?.totalRecords ?? apps.length}</span>
              <span className="kpi-subtext">Verified Records</span>
            </div>
            <span className="kpi-title">{statusInfo?.targetRelease || 'SAP S/4HANA 2023 On-Premise'}</span>
          </div>
        </div>

        <div className="catalogue-kpi-card">
          <div className="kpi-icon-wrap green">
            <CheckCircle2 size={20} />
          </div>
          <div className="kpi-content">
            <div className="kpi-value-row">
              <span className="kpi-number">
                {statusInfo?.recordsByProductSuite?.['SAP_S4HANA_ON_PREMISE'] ??
                  apps.filter((a) => (a.productSuite || '').includes('ON_PREMISE') || (a.productVersion || '').includes('2023')).length}
              </span>
              <span className="kpi-subtext">S/4HANA 2023</span>
            </div>
            <span className="kpi-title">Target Release Verified</span>
          </div>
        </div>

        <div className="catalogue-kpi-card">
          <div className="kpi-icon-wrap purple">
            <Layers size={20} />
          </div>
          <div className="kpi-content">
            <div className="kpi-value-row">
              <span className="kpi-number">
                {((apps.filter((a) => a.odataServices && a.odataServices.length > 0).length / (apps.length || 1)) * 100).toFixed(0)}%
              </span>
              <span className="kpi-subtext">OData v2/v4</span>
            </div>
            <span className="kpi-title">Direct Service Bound</span>
          </div>
        </div>

        <div className="catalogue-kpi-card">
          <div className="kpi-icon-wrap amber">
            <Server size={20} />
          </div>
          <div className="kpi-content">
            <div className="kpi-value-row">
              <span className="kpi-number" style={{ fontSize: '15px' }}>
                {statusInfo?.liveSourceStatus === 'OFFICIAL_EXPORT_IMPORTED' ? 'Official Export' : (statusInfo?.liveSourceStatus || 'Offline Cache')}
              </span>
              <span className="kpi-subtext">{statusInfo?.catalogueFreshness || 'Current'}</span>
            </div>
            <span className="kpi-title">Catalogue Ingestion Provenance</span>
          </div>
        </div>
      </div>

      {/* 3. Module Quick-Filter Bar */}
      <div className="module-filter-bar">
        <span style={{ fontSize: '12px', fontWeight: 600, color: '#6a7d90', marginRight: '4px' }}>Quick Filter:</span>
        <button
          type="button"
          className={`module-pill ${selectedModule === 'ALL' ? 'active' : ''}`}
          onClick={() => setSelectedModule('ALL')}
        >
          All Applications ({apps.length})
        </button>
        <button
          type="button"
          className={`module-pill ${selectedModule === 'FI' ? 'active' : ''}`}
          onClick={() => setSelectedModule('FI')}
        >
          Finance &amp; Controlling (FI/CO)
        </button>
        <button
          type="button"
          className={`module-pill ${selectedModule === 'MM' ? 'active' : ''}`}
          onClick={() => setSelectedModule('MM')}
        >
          Sourcing &amp; Procurement (MM)
        </button>
        <button
          type="button"
          className={`module-pill ${selectedModule === 'SD' ? 'active' : ''}`}
          onClick={() => setSelectedModule('SD')}
        >
          Sales &amp; Distribution (SD)
        </button>
        <button
          type="button"
          className={`module-pill ${selectedModule === 'CONFIG' ? 'active' : ''}`}
          onClick={() => setSelectedModule('CONFIG')}
        >
          Configuration &amp; Administration
        </button>
      </div>

      {/* 4. Filter Toolbar */}
      <div className="catalogue-filter-toolbar">
        <div className="search-input-wrap">
          <FilterBar
            searchPlaceholder="Search verified SAP S/4HANA 2023 apps by App ID (e.g. F0842A, F1612), name, or OData service..."
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            onReset={() => {
              setSearchQuery('');
              setSelectedLob('');
              setSelectedAppType('');
              setSelectedProvenance('');
              setSelectedModule('ALL');
            }}
          />
        </div>

        <select
          value={selectedLob}
          onChange={(e) => setSelectedLob(e.target.value)}
          className="select-compact"
        >
          <option value="">All Lines of Business</option>
          <option value="Finance">Finance</option>
          <option value="Sourcing and Procurement">Sourcing and Procurement</option>
          <option value="Supply Chain">Supply Chain</option>
          <option value="Corporate Finance">Corporate Finance</option>
        </select>

        <select
          value={selectedAppType}
          onChange={(e) => setSelectedAppType(e.target.value)}
          className="select-compact"
        >
          <option value="">All App Types</option>
          <option value="Transactional">Transactional</option>
          <option value="SAP GUI">SAP GUI for HTML (WebGUI)</option>
          <option value="Fact sheet">Fact sheet</option>
          <option value="Analytical">Analytical</option>
        </select>

        <select
          value={selectedProvenance}
          onChange={(e) => setSelectedProvenance(e.target.value)}
          className="select-compact"
        >
          <option value="">All Provenance</option>
          <option value="OFFICIAL_CATALOGUE_LIVE">Live SAP FAL</option>
          <option value="OFFICIAL_FAL_EXPORT">Official Export</option>
          <option value="CURATED_FIXTURE">Demo Fixture</option>
        </select>
      </div>

      {/* Offline State */}
      {isOffline && (
        <div
          className="fiori-card"
          style={{
            padding: '36px',
            textAlign: 'center',
            backgroundColor: '#fff4f4',
            border: '1px solid #f8d7da',
            borderRadius: '8px',
            marginBottom: '20px'
          }}
        >
          <WifiOff size={32} color="#d93838" style={{ margin: '0 auto 12px' }} />
          <h2 style={{ fontSize: '17px', fontWeight: 600, color: '#a61c1c', marginBottom: '8px' }}>
            Backend Catalogue Service Offline
          </h2>
          <p style={{ fontSize: '13px', color: '#555', maxWidth: '500px', margin: '0 auto 16px' }}>
            Unable to connect to the FioriX backend API on port 4004. Please verify the backend service is running.
          </p>
          <button
            type="button"
            className="fiori-btn fiori-btn-primary"
            onClick={loadCatalogue}
          >
            <RefreshCw size={13} /> Retry Connection
          </button>
        </div>
      )}

      {/* Error State */}
      {!isOffline && error && (
        <div style={{ marginBottom: '20px' }}>
          <MessageStrip type="error">
            <strong>Error:</strong> {error}
          </MessageStrip>
          <button
            type="button"
            className="fiori-btn fiori-btn-secondary"
            style={{ marginTop: '8px' }}
            onClick={loadCatalogue}
          >
            Retry Query
          </button>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div style={{ padding: '60px', textAlign: 'center', color: '#6a7d90' }}>
          <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 12px', color: '#0070f2' }} />
          <div style={{ fontSize: '14px', fontWeight: 500 }}>Synchronizing authoritative SAP Fiori applications...</div>
        </div>
      )}

      {/* Empty State */}
      {!loading && !isOffline && !error && filteredApps.length === 0 && (
        <div
          className="fiori-card"
          style={{
            padding: '48px',
            textAlign: 'center',
            color: '#6a7d90',
            border: '1px dashed #d2dbe3',
            borderRadius: '10px'
          }}
        >
          <AlertTriangle size={32} color="#e9730c" style={{ margin: '0 auto 12px' }} />
          <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#0f233a', marginBottom: '6px' }}>No Applications Found</h3>
          <p style={{ fontSize: '13px', maxWidth: '480px', margin: '0 auto 16px' }}>
            {searchQuery || selectedLob || selectedAppType || selectedProvenance || selectedModule !== 'ALL'
              ? 'No catalogue records match your active filters. Try clearing filters or searching by a broader term.'
              : 'The canonical catalogue store currently contains no records.'}
          </p>
          <button
            type="button"
            className="fiori-btn fiori-btn-subtle"
            onClick={() => {
              setSearchQuery('');
              setSelectedLob('');
              setSelectedAppType('');
              setSelectedProvenance('');
              setSelectedModule('ALL');
            }}
          >
            Reset All Filters
          </button>
        </div>
      )}

      {/* 5A. Fiori Tile Grid View */}
      {!loading && !isOffline && !error && filteredApps.length > 0 && viewMode === 'grid' && (
        <div className="app-grid">
          {filteredApps.map((app) => {
            const isWebGui = app.appType === 'SAP GUI' || app.uiTechnology?.includes('SAP GUI');
            const isElements = !isWebGui && (app.uiTechnology?.includes('elements') || app.appType === 'Transactional');
            const techClass = isWebGui ? 'webgui' : (isElements ? 'elements' : 'freestyle');
            const roles = parseRoles(app.businessRole);

            return (
              <div key={app.appId} className="app-card">
                <div className="app-card-top">
                  <span className="app-id-chip">{app.appId}</span>
                  <span className={`tech-badge-pill ${techClass}`}>
                    {isWebGui ? 'WebGUI' : (isElements ? 'Fiori Elements' : 'Freestyle UI5')}
                  </span>
                </div>

                <h3 className="app-card-title">{app.appName}</h3>
                <p className="app-card-desc">{app.description || app.appName}</p>

                {roles.display.length > 0 && (
                  <div className="role-pill-list">
                    {roles.display.map((role) => (
                      <span key={role} className="role-chip" title={role}>
                        {role}
                      </span>
                    ))}
                    {roles.extraCount > 0 && (
                      <span className="role-chip more">+{roles.extraCount} more</span>
                    )}
                  </div>
                )}

                <div className="app-card-meta">
                  <div className="meta-row-clean">
                    <span className="meta-label">Line of Business:</span>
                    <span className="meta-val">{app.lineOfBusiness || app.businessProcess || 'General'}</span>
                  </div>
                  {app.odataServices && app.odataServices.length > 0 && (
                    <div className="meta-row-clean">
                      <span className="meta-label">OData Service:</span>
                      <span className="odata-tag">{app.odataServices[0]}</span>
                    </div>
                  )}
                  <div className="meta-row-clean">
                    <span className="meta-label">Provenance:</span>
                    <span>{renderProvenanceBadge(app.provenance)}</span>
                  </div>
                </div>

                <div className="app-card-actions">
                  <button
                    type="button"
                    className="btn-card-assess"
                    onClick={() => navigate(`/transaction-discovery?tcode=${encodeURIComponent(app.appId)}`)}
                  >
                    <span>Assess in Discovery</span>
                    <ArrowRight size={13} />
                  </button>
                  <button
                    type="button"
                    className="btn-card-details"
                    onClick={() => navigate(`/catalogue/${encodeURIComponent(app.appId)}`)}
                  >
                    <ExternalLink size={12} />
                    <span>Details</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 5B. Compact Table View */}
      {!loading && !isOffline && !error && filteredApps.length > 0 && viewMode === 'table' && (
        <div style={{ overflowX: 'auto', marginBottom: '32px' }}>
          <table className="fiori-table-modern">
            <thead>
              <tr>
                <th style={{ width: '90px' }}>App ID</th>
                <th>Application Name &amp; Description</th>
                <th style={{ width: '130px' }}>Technology</th>
                <th style={{ width: '150px' }}>Line of Business</th>
                <th style={{ width: '180px' }}>Business Roles</th>
                <th style={{ width: '120px' }}>Provenance</th>
                <th style={{ textAlign: 'right', width: '170px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredApps.map((app) => {
                const isWebGui = app.appType === 'SAP GUI' || app.uiTechnology?.includes('SAP GUI');
                const isElements = !isWebGui && (app.uiTechnology?.includes('elements') || app.appType === 'Transactional');
                const techClass = isWebGui ? 'webgui' : (isElements ? 'elements' : 'freestyle');
                const roles = parseRoles(app.businessRole);

                return (
                  <tr key={app.appId}>
                    <td>
                      <code style={{ fontSize: '13px', fontWeight: 700, color: '#0f233a' }}>
                        {app.appId}
                      </code>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, color: '#0f233a' }}>{app.appName}</div>
                      {app.odataServices && app.odataServices.length > 0 && (
                        <div style={{ fontSize: '11px', color: '#0070f2', marginTop: '2px', fontFamily: 'monospace' }}>
                          OData: {app.odataServices[0]}
                        </div>
                      )}
                    </td>
                    <td>
                      <span className={`tech-badge-pill ${techClass}`}>
                        {isWebGui ? 'WebGUI' : (isElements ? 'Fiori Elements' : 'Freestyle')}
                      </span>
                    </td>
                    <td style={{ color: '#556b82' }}>{app.lineOfBusiness || app.businessProcess || '—'}</td>
                    <td>
                      {roles.display.length > 0 ? (
                        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                          {roles.display.map((r) => (
                            <span key={r} className="role-chip">{r}</span>
                          ))}
                          {roles.extraCount > 0 && <span className="role-chip more">+{roles.extraCount}</span>}
                        </div>
                      ) : (
                        <span style={{ color: '#999' }}>—</span>
                      )}
                    </td>
                    <td>{renderProvenanceBadge(app.provenance)}</td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                        <button
                          type="button"
                          className="btn-card-assess"
                          style={{ padding: '5px 10px', fontSize: '11px' }}
                          onClick={() => navigate(`/transaction-discovery?tcode=${encodeURIComponent(app.appId)}`)}
                        >
                          Assess
                        </button>
                        <button
                          type="button"
                          className="btn-card-details"
                          style={{ padding: '5px 8px', fontSize: '11px' }}
                          onClick={() => navigate(`/catalogue/${encodeURIComponent(app.appId)}`)}
                        >
                          Details
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
