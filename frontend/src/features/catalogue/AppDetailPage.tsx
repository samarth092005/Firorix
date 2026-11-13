import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  catalogueService,
  CatalogueAppRecord
} from '../../services/catalogue/catalogueService';
import { ApiError } from '../../services/api/apiClient';
import { MessageStrip } from '../../components/status/MessageStrip';
import {
  ArrowLeft,
  Library,
  ExternalLink,
  Database,
  Layers,
  FileText,
  Shield,
  RefreshCw,
  AlertTriangle,
  WifiOff
} from 'lucide-react';

export const AppDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [app, setApp] = useState<CatalogueAppRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isOffline, setIsOffline] = useState(false);

  const loadApp = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    setIsOffline(false);

    try {
      const res = await catalogueService.getAppById(id);
      if (res.success && res.data) {
        setApp(res.data);
      } else {
        setApp(null);
        setError(res.errorMessage || `Application "${id}" not found in canonical catalogue.`);
      }
    } catch (err: any) {
      if (err instanceof ApiError && (err.isNetworkError || err.statusCode === 0)) {
        setIsOffline(true);
        setError('Cannot reach Fiorify backend service on port 4004.');
      } else if (err instanceof ApiError && err.statusCode === 404) {
        setApp(null);
        setError(`Application "${id}" not found in canonical catalogue.`);
      } else {
        setError(err.message || 'Failed to retrieve application details from backend.');
      }
      setApp(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadApp();
  }, [loadApp]);

  // Provenance Badge
  const renderProvenanceBadge = (provenance: string) => {
    let bg = 'var(--fiori-info-bg)';
    let color = 'var(--fiori-info)';
    let border = 'var(--fiori-info-border)';
    let label = provenance;

    switch (provenance) {
      case 'OFFICIAL_FAL_EXPORT':
        bg = 'rgba(16, 126, 62, 0.1)';
        color = '#107e3e';
        border = 'rgba(16, 126, 62, 0.3)';
        label = 'Official FAL Export';
        break;
      case 'OFFICIAL_CATALOGUE_LIVE':
        bg = 'rgba(11, 85, 149, 0.1)';
        color = '#0b5595';
        border = 'rgba(11, 85, 149, 0.3)';
        label = 'Live SAP FAL';
        break;
      case 'OFFICIAL_CATALOGUE_CACHED':
        bg = 'rgba(92, 51, 150, 0.1)';
        color = '#5c3396';
        border = 'rgba(92, 51, 150, 0.3)';
        label = 'Cached FAL';
        break;
      case 'CURATED_FIXTURE':
        bg = 'rgba(233, 115, 12, 0.1)';
        color = '#b05708';
        border = 'rgba(233, 115, 12, 0.3)';
        label = 'Demo Fixture';
        break;
      default:
        label = provenance || 'Official';
    }

    return (
      <span
        style={{
          fontSize: '11px',
          fontWeight: 600,
          padding: '3px 8px',
          backgroundColor: bg,
          color: color,
          border: `1px solid ${border}`,
          borderRadius: '3px'
        }}
      >
        {label}
      </span>
    );
  };

  // Loading State
  if (loading) {
    return (
      <div style={{ padding: '48px', textAlign: 'center', color: 'var(--fiori-text-secondary)' }}>
        <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 12px' }} />
        <div>Loading Fiori Application specification from canonical catalogue...</div>
      </div>
    );
  }

  // Backend Offline State
  if (isOffline) {
    return (
      <div style={{ padding: '32px', maxWidth: '800px', margin: '0 auto' }}>
        <button
          type="button"
          className="fiori-btn fiori-btn-subtle"
          style={{ marginBottom: '16px' }}
          onClick={() => navigate('/catalogue')}
        >
          <ArrowLeft size={14} /> Back to Catalogue
        </button>
        <div
          className="fiori-card"
          style={{
            padding: '32px',
            textAlign: 'center',
            backgroundColor: '#fff4f4',
            border: '1px solid #f8d7da',
            borderRadius: '4px'
          }}
        >
          <WifiOff size={36} color="#d93838" style={{ margin: '0 auto 12px' }} />
          <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#a61c1c', marginBottom: '8px' }}>
            Backend Catalogue Service Offline
          </h2>
          <p style={{ fontSize: '13px', color: '#555', marginBottom: '16px' }}>
            Could not communicate with the Fiorify backend on port 4004 to retrieve application &ldquo;{id}&rdquo;.
          </p>
          <button type="button" className="fiori-btn fiori-btn-primary" onClick={loadApp}>
            <RefreshCw size={14} /> Retry Connection
          </button>
        </div>
      </div>
    );
  }

  // Not Found / Error State
  if (!app) {
    return (
      <div style={{ padding: '32px', maxWidth: '800px', margin: '0 auto' }}>
        <button
          type="button"
          className="fiori-btn fiori-btn-subtle"
          style={{ marginBottom: '16px' }}
          onClick={() => navigate('/catalogue')}
        >
          <ArrowLeft size={14} /> Back to Catalogue
        </button>
        <div
          className="fiori-card"
          style={{
            padding: '32px',
            textAlign: 'center',
            border: '1px dashed var(--fiori-border)'
          }}
        >
          <AlertTriangle size={32} color="var(--fiori-warning)" style={{ margin: '0 auto 12px' }} />
          <h2 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '8px' }}>Application Not Found</h2>
          <p style={{ fontSize: '13px', color: 'var(--fiori-text-secondary)', marginBottom: '16px' }}>
            {error || `Application "${id}" does not exist in the canonical catalogue.`}
          </p>
          <button
            type="button"
            className="fiori-btn fiori-btn-secondary"
            onClick={() => navigate('/catalogue')}
          >
            Back to Catalogue
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Back button */}
      <button
        type="button"
        className="fiori-btn fiori-btn-subtle"
        style={{ marginBottom: '14px', paddingLeft: 0 }}
        onClick={() => navigate('/catalogue')}
      >
        <ArrowLeft size={14} /> Back to Fiori Catalogue
      </button>

      {/* Header Bar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: '20px',
          flexWrap: 'wrap',
          gap: '12px'
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <Library size={22} color="var(--fiori-teal)" />
            <h1 className="fiori-page-title" style={{ margin: 0 }}>
              {app.appId}: {app.appName}
            </h1>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 600,
                padding: '3px 8px',
                backgroundColor: 'var(--fiori-info-bg)',
                color: 'var(--fiori-info)',
                border: '1px solid var(--fiori-info-border)',
                borderRadius: '3px'
              }}
            >
              {app.appType || 'Transactional'}
            </span>
            {renderProvenanceBadge(app.provenance)}
          </div>

          <p className="fiori-page-subtitle" style={{ marginTop: '6px' }}>
            Line of Business: <strong>{app.lineOfBusiness || app.businessProcess || 'General'}</strong>
            {app.businessRole && <span> &bull; Target Role: {app.businessRole}</span>}
          </p>
        </div>

        {app.documentationUrl && (
          <a
            href={app.documentationUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="fiori-btn fiori-btn-secondary"
          >
            <ExternalLink size={12} /> Open in SAP Reference Library
          </a>
        )}
      </div>

      {/* Scope Description */}
      {app.description && (
        <div
          className="fiori-card"
          style={{
            padding: '16px 20px',
            marginBottom: '20px',
            backgroundColor: 'var(--fiori-card-bg)',
            border: '1px solid var(--fiori-border)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <FileText size={16} color="var(--fiori-teal)" />
            <span style={{ fontSize: '13px', fontWeight: 600 }}>Functional Scope & Description</span>
          </div>
          <p style={{ fontSize: '13px', color: 'var(--fiori-text-primary)', margin: 0, whiteSpace: 'pre-line' }}>
            {app.description}
          </p>
        </div>
      )}

      {/* Detail Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        {/* Architecture & Technical Metadata */}
        <div className="fiori-card">
          <div className="fiori-card-header">
            <div className="fiori-card-title">
              <Database size={16} color="var(--fiori-teal)" /> Architecture & Technical Metadata
            </div>
          </div>
          <div
            className="fiori-card-body"
            style={{ fontSize: '13px', display: 'flex', flexDirection: 'column', gap: '12px' }}
          >
            <div>
              <div style={{ color: 'var(--fiori-text-secondary)', fontSize: '11px', fontWeight: 600 }}>
                UI TECHNOLOGY
              </div>
              <div style={{ fontWeight: 500 }}>{app.uiTechnology || 'SAP Fiori (SAPUI5)'}</div>
            </div>

            <div>
              <div style={{ color: 'var(--fiori-text-secondary)', fontSize: '11px', fontWeight: 600 }}>
                PRODUCT VERSION
              </div>
              <div>{app.productVersion || 'SAP S/4HANA'}</div>
            </div>

            {app.softwareComponent && (
              <div>
                <div style={{ color: 'var(--fiori-text-secondary)', fontSize: '11px', fontWeight: 600 }}>
                  BACKEND SOFTWARE COMPONENT
                </div>
                <div>{app.softwareComponent}</div>
              </div>
            )}

            {app.sapui5Component && (
              <div>
                <div style={{ color: 'var(--fiori-text-secondary)', fontSize: '11px', fontWeight: 600 }}>
                  SAPUI5 COMPONENT ID
                </div>
                <code>{app.sapui5Component}</code>
              </div>
            )}

            {app.bspApplicationUrl && (
              <div>
                <div style={{ color: 'var(--fiori-text-secondary)', fontSize: '11px', fontWeight: 600 }}>
                  BSP APPLICATION URL
                </div>
                <code>{app.bspApplicationUrl}</code>
              </div>
            )}

            {(app.semanticObject || app.semanticAction) && (
              <div>
                <div style={{ color: 'var(--fiori-text-secondary)', fontSize: '11px', fontWeight: 600 }}>
                  NAVIGATION INTENT
                </div>
                <code>
                  #{app.semanticObject || '*'}-{app.semanticAction || '*'}
                </code>
              </div>
            )}
          </div>
        </div>

        {/* Business & Role Configuration */}
        <div className="fiori-card">
          <div className="fiori-card-header">
            <div className="fiori-card-title">
              <Layers size={16} color="var(--fiori-teal)" /> Business & Launchpad Configuration
            </div>
          </div>
          <div
            className="fiori-card-body"
            style={{ fontSize: '13px', display: 'flex', flexDirection: 'column', gap: '12px' }}
          >
            <div>
              <div style={{ color: 'var(--fiori-text-secondary)', fontSize: '11px', fontWeight: 600 }}>
                BUSINESS PROCESS / AREA
              </div>
              <div>{app.businessProcess || app.lineOfBusiness || 'Not specified'}</div>
            </div>

            {app.businessRole && (
              <div>
                <div style={{ color: 'var(--fiori-text-secondary)', fontSize: '11px', fontWeight: 600 }}>
                  TARGET BUSINESS ROLE(S)
                </div>
                <div>{app.businessRole}</div>
              </div>
            )}

            {app.businessCatalog && (
              <div>
                <div style={{ color: 'var(--fiori-text-secondary)', fontSize: '11px', fontWeight: 600 }}>
                  BUSINESS CATALOG
                </div>
                <code>{app.businessCatalog}</code>
              </div>
            )}

            {app.technicalCatalog && (
              <div>
                <div style={{ color: 'var(--fiori-text-secondary)', fontSize: '11px', fontWeight: 600 }}>
                  TECHNICAL CATALOG
                </div>
                <code>{app.technicalCatalog}</code>
              </div>
            )}

            {app.leadingTransactionCodes && app.leadingTransactionCodes.length > 0 && (
              <div>
                <div style={{ color: 'var(--fiori-text-secondary)', fontSize: '11px', fontWeight: 600 }}>
                  LEADING / REPLACED TRANSACTION CODES
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '4px' }}>
                  {app.leadingTransactionCodes.map((tc) => (
                    <code
                      key={tc}
                      style={{
                        padding: '2px 6px',
                        backgroundColor: 'var(--fiori-bg)',
                        border: '1px solid var(--fiori-border)',
                        borderRadius: '2px'
                      }}
                    >
                      {tc}
                    </code>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* OData Service Dependencies */}
        <div className="fiori-card" style={{ gridColumn: 'span 2' }}>
          <div className="fiori-card-header">
            <div className="fiori-card-title">
              <Shield size={16} color="var(--fiori-teal)" /> OData Service Dependencies & Provenance
            </div>
          </div>
          <div className="fiori-card-body" style={{ fontSize: '13px' }}>
            <div style={{ marginBottom: '14px' }}>
              <div style={{ color: 'var(--fiori-text-secondary)', fontSize: '11px', fontWeight: 600, marginBottom: '6px' }}>
                CONSUMED ODATA SERVICES
              </div>
              {app.odataServices && app.odataServices.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {app.odataServices.map((srv) => (
                    <code key={srv} style={{ padding: '4px 8px', backgroundColor: 'var(--fiori-bg)', borderRadius: '3px' }}>
                      {srv}
                    </code>
                  ))}
                </div>
              ) : (
                <div style={{ color: 'var(--fiori-text-secondary)', fontStyle: 'italic' }}>
                  No explicit OData service dependencies declared in catalogue manifest.
                </div>
              )}
            </div>

            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '24px',
                borderTop: '1px solid var(--fiori-border-light)',
                paddingTop: '12px',
                fontSize: '12px',
                color: 'var(--fiori-text-secondary)'
              }}
            >
              <div>
                Source Provenance: <strong>{app.provenance}</strong>
              </div>
              {app.retrievalTimestamp && (
                <div>
                  Retrieved / Imported: {new Date(app.retrievalTimestamp).toLocaleString()}
                </div>
              )}
              {app.importTimestamp && !app.retrievalTimestamp && (
                <div>
                  Import Timestamp: {new Date(app.importTimestamp).toLocaleString()}
                </div>
              )}
              {app.sourceVersion && (
                <div>
                  Source Version: <strong>{app.sourceVersion}</strong>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
