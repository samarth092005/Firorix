import React from 'react';
import {
  CheckCircle2,
  Database,
  Layers,
  ShieldCheck,
  Table,
  Terminal,
  ExternalLink,
  Shield,
  FileCode2,
  Lock
} from 'lucide-react';
import { HERO_PRODUCT_PREVIEW_DATA } from './landingPreviewData';

export const LandingProductPreview: React.FC = () => {
  const data = HERO_PRODUCT_PREVIEW_DATA;

  return (
    <div className="product-preview-frame">
      {/* 1. Window Top Titlebar */}
      <div className="preview-window-titlebar">
        <div className="preview-window-dots">
          <span className="dot dot-close" />
          <span className="dot dot-minimize" />
          <span className="dot dot-maximize" />
        </div>
        <div className="preview-window-address">
          <Lock size={11} className="preview-lock-icon" />
          <span>fiorify.corp / transaction-analysis / ME21N</span>
        </div>
        <div className="preview-window-tag">
          <span className="preview-live-dot" />
          <span>Demo Environment</span>
        </div>
      </div>

      {/* 2. Application Workspace Header */}
      <div className="preview-app-header">
        <div className="preview-app-title-group">
          <div className="preview-app-icon">
            <Layers size={16} />
          </div>
          <div>
            <div className="preview-app-breadcrumbs">
              <span>SAP S/4HANA 2023 FPS01</span>
              <span>/</span>
              <span>Transaction Analysis</span>
            </div>
            <div className="preview-app-title">
              <strong>{data.tcode}</strong> — {data.description}
            </div>
          </div>
        </div>
        <div className="preview-app-badges">
          <span className="preview-env-badge">{data.environmentBadge}</span>
        </div>
      </div>

      {/* 3. Transaction Technical Metadata Strip */}
      <div className="preview-meta-grid">
        <div className="preview-meta-cell">
          <span className="preview-meta-label">Business Module</span>
          <span className="preview-meta-val">{data.module}</span>
        </div>
        <div className="preview-meta-cell">
          <span className="preview-meta-label">ABAP Program</span>
          <span className="preview-meta-code">{data.program}</span>
        </div>
        <div className="preview-meta-cell">
          <span className="preview-meta-label">Underlying Tables</span>
          <span className="preview-meta-code">{data.tables.join(', ')}</span>
        </div>
        <div className="preview-meta-cell">
          <span className="preview-meta-label">Authorization Object</span>
          <span className="preview-meta-code">{data.authObject}</span>
        </div>
      </div>

      {/* 4. Analysis Summary Status Bar */}
      <div className="preview-checklist-bar">
        <div className="preview-check-item">
          <CheckCircle2 size={13} className="check-icon-green" />
          <span>T-Code Verified</span>
        </div>
        <div className="preview-check-item">
          <CheckCircle2 size={13} className="check-icon-green" />
          <span>DDIC Analyzed</span>
        </div>
        <div className="preview-check-item">
          <CheckCircle2 size={13} className="check-icon-green" />
          <span>Standard Fiori Match</span>
        </div>
        <div className="preview-check-item">
          <CheckCircle2 size={13} className="check-icon-green" />
          <span>Fit-Gap Validated</span>
        </div>
      </div>

      {/* 5. Governed Recommendation Panel */}
      <div className="preview-recommendation-card">
        <div className="preview-rec-header">
          <div className="preview-rec-left">
            <span className="preview-rec-app-id">{data.recommendation.appId}</span>
            <span className="preview-rec-app-name">{data.recommendation.appName}</span>
          </div>
          <span className="preview-rec-status-badge">
            <ShieldCheck size={12} />
            <span>{data.recommendation.matchStatus}</span>
          </span>
        </div>
        <div className="preview-rec-details">
          <div className="preview-rec-chip">
            <span className="chip-label">Compliance:</span>
            <span className="chip-val">{data.recommendation.complianceTier}</span>
          </div>
          <div className="preview-rec-chip">
            <span className="chip-label">Service:</span>
            <span className="chip-val">{data.recommendation.odataVersion}</span>
          </div>
          <div className="preview-rec-chip">
            <span className="chip-label">PFCG Role:</span>
            <span className="chip-val mono">{data.recommendation.pfcgRole}</span>
          </div>
        </div>
      </div>

      {/* 6. Synthetic PO Table Preview */}
      <div className="preview-table-container">
        <div className="preview-table-header">
          <div className="preview-table-title">
            <Table size={13} />
            <span>Demonstration Purchase Order Records</span>
          </div>
          <span className="preview-table-count">3 items</span>
        </div>
        <table className="preview-table">
          <thead>
            <tr>
              <th>PO Number</th>
              <th>Supplier</th>
              <th>Company Code</th>
              <th>Net Amount</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {data.sampleRecords.map((rec) => (
              <tr key={rec.poNumber}>
                <td className="cell-po-num">{rec.poNumber}</td>
                <td>{rec.supplier}</td>
                <td><span className="cell-company">{rec.companyCode}</span></td>
                <td>{rec.currency === 'USD' ? '$' : '€'}{rec.netAmount}</td>
                <td>
                  <span className={`cell-status-pill status-${rec.status.toLowerCase().replace(/\s+/g, '-')}`}>
                    {rec.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="preview-table-footer">
          <span>Synthetic demonstration records &bull; Isolated local preview &bull; Zero live SAP mutation</span>
        </div>
      </div>
    </div>
  );
};
