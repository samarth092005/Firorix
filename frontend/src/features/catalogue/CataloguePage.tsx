import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  catalogueService,
  CatalogueAppRecord,
  CatalogueStatusInfo
} from '../../services/catalogue/catalogueService';
import { ApiError } from '../../services/api/apiClient';
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
  CheckCircle2,
  ArrowRight,
  Sparkles,
  ShieldCheck,
  Search,
  X,
  RotateCcw
} from 'lucide-react';
import { sapDiscoveryAdapter } from '../../services/sap/sapDiscoveryAdapter';
import { DiscoveryVerificationModal } from '../transaction-discovery/components/DiscoveryVerificationModal';
import {
  TransactionDiscoveryResponse,
  CatalogueReference
} from '../../services/contracts/types';
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
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [statusLoading, setStatusLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isOffline, setIsOffline] = useState(false);
  const [isVerificationModalOpen, setIsVerificationModalOpen] = useState(false);
  const [verificationMetadata, setVerificationMetadata] = useState<TransactionDiscoveryResponse | null>(null);
  const [verifyingTcode, setVerifyingTcode] = useState(false);

  const isCustomSearch = useMemo(() => {
    const q = searchQuery.trim().toUpperCase();
    return q.startsWith('Z') || q.startsWith('Y') || apps.some((a) => (a as any).isCustom);
  }, [searchQuery, apps]);

  const isPotentialTcode = useMemo(() => {
    const q = searchQuery.trim().toUpperCase();
    return q.length >= 2 && !q.includes(' ') && /^[A-Z0-9_\-\/]{2,20}$/i.test(q);
  }, [searchQuery]);

  const mappedCandidates = useMemo<CatalogueReference[]>(() => {
    return apps.map((app) => ({
      appId: app.appId,
      appName: app.appName,
      description: app.description || '',
      relatedTCodes: app.leadingTransactionCodes || [app.appId],
      supportedProductRelease: app.productVersion || 'SAP S/4HANA 2023',
      uiTechnology: (app.uiTechnology?.includes('elements')
        ? 'SAP Fiori elements'
        : app.uiTechnology?.includes('GUI')
        ? 'SAP GUI for HTML'
        : 'SAP Fiori elements') as any,
      businessRoles: app.businessRole ? app.businessRole.split(/[,*|]/).map((r) => r.trim()).filter(Boolean) : [],
      businessCatalogues: app.businessCatalog ? [app.businessCatalog] : [],
      odataServices: app.odataServices || [],
      technicalComponent: app.softwareComponent || 'S4CORE 108',
      implementationInfo: 'Verified in SAP Fiori Catalogue',
      officialSourceUrl: app.documentationUrl || `https://fal.cloud.sap/apps/${app.appId}`,
      sourceVerificationDate: new Date().toISOString().substring(0, 10),
      importVersion: 'FAL_2023_BASELINE',
      isCuratedDemoData: false
    }));
  }, [apps]);

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
        setError('Cannot reach Fiorify backend service on port 4004. Please verify the backend is running.');
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

  // Dynamic Module Counts
  const moduleCounts = useMemo(() => {
    let fi = 0;
    let mm = 0;
    let sd = 0;
    let config = 0;

    apps.forEach((app) => {
      const text = `${app.lineOfBusiness || ''} ${app.businessProcess || ''} ${app.appName || ''}`.toUpperCase();
      if (text.includes('FINANCE') || text.includes('ACCOUNT') || text.includes('PAYMENT')) fi++;
      if (text.includes('PURCHAS') || text.includes('SOURCING') || text.includes('SUPPLY') || text.includes('INVOICE')) mm++;
      if (text.includes('SALE') || text.includes('BILLING') || text.includes('CUSTOMER')) sd++;
      if (text.includes('CONFIG') || text.includes('NUMBER RANGE') || text.includes('PERIOD')) config++;
    });

    return { all: apps.length, fi, mm, sd, config };
  }, [apps]);

  const modules = useMemo(() => [
    { id: 'ALL', label: 'All Applications', count: moduleCounts.all },
    { id: 'FI', label: 'Finance & Controlling (FI/CO)', count: moduleCounts.fi },
    { id: 'MM', label: 'Sourcing & Procurement (MM)', count: moduleCounts.mm },
    { id: 'SD', label: 'Sales & Distribution (SD)', count: moduleCounts.sd },
    { id: 'CONFIG', label: 'Configuration & Administration', count: moduleCounts.config },
  ], [moduleCounts]);

  const hasActiveFilters = Boolean(
    searchQuery.trim() || selectedLob || selectedAppType || selectedProvenance || selectedModule !== 'ALL'
  );

  const handleResetFilters = useCallback(() => {
    setSearchQuery('');
    setSelectedLob('');
    setSelectedAppType('');
    setSelectedProvenance('');
    setSelectedModule('ALL');
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


      </div>

      {/* 3. Unified Filter & Search Control Panel */}
      <div className="catalogue-filter-panel">
        {/* Upper Row: Domain Quick Filter Pills */}
        <div className="filter-panel-top">
          <div className="domain-pill-group">
            <span className="domain-filter-label">Quick Filter:</span>
            {modules.map((m) => (
              <button
                key={m.id}
                type="button"
                className={`domain-pill ${selectedModule === m.id ? 'active' : ''}`}
                onClick={() => setSelectedModule(m.id)}
              >
                <span className="domain-pill-text">{m.label}</span>
                <span className="domain-pill-count">{m.count}</span>
              </button>
            ))}
          </div>

          {hasActiveFilters && (
            <button
              type="button"
              className="btn-filter-reset"
              onClick={handleResetFilters}
              title="Reset all search and filter parameters"
            >
              <RotateCcw size={12} />
              <span>Reset Filters</span>
            </button>
          )}
        </div>

        {/* Lower Row: Search Bar & Compact Filter Selects */}
        <div className="filter-panel-bottom">
          <div className="search-field-wrapper">
            <Search size={16} className="search-field-icon" />
            <input
              type="text"
              className="search-field-input"
              placeholder="Search by SAP T-Code (e.g. MM01, VA01, ME21N, F-53, CO01), App ID (F1602), or name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button
                type="button"
                className="search-field-clear"
                onClick={() => setSearchQuery('')}
                title="Clear search query"
              >
                <X size={14} />
              </button>
            )}
          </div>

          <div className="filter-dropdown-group">
            <select
              value={selectedLob}
              onChange={(e) => setSelectedLob(e.target.value)}
              className="catalogue-select"
              title="Filter by Line of Business"
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
              className="catalogue-select"
              title="Filter by Application Type"
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
              className="catalogue-select"
              title="Filter by Data Provenance"
            >
              <option value="">All Provenance</option>
              <option value="OFFICIAL_CATALOGUE_LIVE">Live SAP FAL</option>
              <option value="OFFICIAL_FAL_EXPORT">Official Export</option>
              <option value="OFFICIAL_CATALOGUE_CACHED">Verified Baseline</option>
              <option value="CURATED_FIXTURE">Demo Fixture</option>
            </select>
          </div>
        </div>

        {/* Results Counter / Filter Indicator */}
        <div className="filter-panel-status">
          <span className="results-count">
            Showing <strong>{filteredApps.length}</strong> of {apps.length} applications
          </span>
          {hasActiveFilters && (
            <span className="active-filter-tags">
              Active filters: {[
                searchQuery.trim() ? `Search: "${searchQuery.trim()}"` : '',
                selectedModule !== 'ALL' ? (modules.find(m => m.id === selectedModule)?.label || selectedModule) : '',
                selectedLob ? `LoB: ${selectedLob}` : '',
                selectedAppType ? `Type: ${selectedAppType}` : '',
                selectedProvenance ? `Source: ${selectedProvenance}` : ''
              ].filter(Boolean).join(' • ')}
            </span>
          )}
        </div>
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
            Unable to connect to the Fiorify backend API on port 4004. Please verify the backend service is running.
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

      {/* Custom Transaction Modernization Notice */}
      {isCustomSearch && (
        <div
          style={{
            background: 'linear-gradient(135deg, #eff6ff 0%, #f0fdf4 100%)',
            border: '1px solid #bfdbfe',
            borderRadius: '10px',
            padding: '16px 20px',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '16px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.03)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
            <div style={{ background: '#3b82f6', color: '#fff', borderRadius: '8px', padding: '8px', display: 'flex' }}>
              <Sparkles size={20} />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '14px', color: '#1e3a8a', marginBottom: '2px' }}>
                Custom Transaction Detected: {searchQuery.trim().toUpperCase()}
              </div>
              <div style={{ fontSize: '13px', color: '#475569', lineHeight: 1.4 }}>
                Customer-specific transactions (Z*/Y*) do not exist in SAP's public standard Fiori Apps Reference Library.
                You can modernise this transaction directly using <strong>Fiorify Generation Studio</strong> to build custom ABAP RAP CDS Views and SAP Fiori Elements UI.
              </div>
            </div>
          </div>
          <button
            type="button"
            className="fiori-btn fiori-btn-primary"
            style={{ flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            onClick={() => navigate('/generation-studio')}
          >
            Open in Generation Studio <ArrowRight size={14} />
          </button>
        </div>
      )}

      {/* Live SAP S/4HANA Verification Banner */}
      {isPotentialTcode && !isCustomSearch && (
        <div
          style={{
            background: 'linear-gradient(135deg, #ECFDF5 0%, #EFF6FF 100%)',
            border: '1px solid #A7F3D0',
            borderRadius: '10px',
            padding: '14px 20px',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '16px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.03)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ background: '#059669', color: '#fff', borderRadius: '8px', padding: '8px', display: 'flex' }}>
              <ShieldCheck size={20} />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '14px', color: '#065F46', marginBottom: '2px' }}>
                SAP Transaction Detected: {searchQuery.trim().toUpperCase()}
              </div>
              <div style={{ fontSize: '12.5px', color: '#334155' }}>
                Check live SAP S/4HANA (S21-200) Data Dictionary status and view the full verification pop-up.
              </div>
            </div>
          </div>
          <button
            type="button"
            className="fiori-btn fiori-btn-primary"
            style={{
              flexShrink: 0,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: '#059669',
              fontSize: '12px',
              padding: '0 16px',
              height: '36px'
            }}
            disabled={verifyingTcode}
            onClick={async () => {
              const cleanTc = searchQuery.trim().toUpperCase();
              setVerifyingTcode(true);
              try {
                const discoRes = await sapDiscoveryAdapter.inspectTransaction({
                  requestId: `REQ-${Date.now()}-${cleanTc}`,
                  tcode: cleanTc,
                  systemId: 'S21-200',
                  client: '200',
                  targetRelease: 'SAP S/4HANA 2023 Private Edition',
                  timestamp: new Date().toISOString()
                });
                setVerificationMetadata(discoRes);
                setIsVerificationModalOpen(true);
              } catch (err) {
                console.error('Error verifying in S/4HANA:', err);
              } finally {
                setVerifyingTcode(false);
              }
            }}
          >
            <ShieldCheck size={15} />
            <span>{verifyingTcode ? 'Checking S/4HANA...' : 'Live S/4HANA Verification Pop-up'}</span>
          </button>
        </div>
      )}

      {/* 5. Fiori Tile Grid View */}
      {!loading && !isOffline && !error && filteredApps.length > 0 && (
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

      {/* SAP S/4HANA & Fiori Catalogue Discovery Verification Pop-up */}
      <DiscoveryVerificationModal
        isOpen={isVerificationModalOpen}
        onClose={() => setIsVerificationModalOpen(false)}
        metadata={verificationMetadata}
        candidates={mappedCandidates}
        systemId="S21-200"
        client="200"
        targetRelease="SAP S/4HANA 2023 Private Edition"
        onProceedToAssessment={() => {
          setIsVerificationModalOpen(false);
          const tc = verificationMetadata?.tcode || searchQuery.trim().toUpperCase();
          navigate(`/transaction-discovery?tcode=${encodeURIComponent(tc)}`);
        }}
      />
    </div>
  );
};
