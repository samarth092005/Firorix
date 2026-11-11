import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Layers,
  SearchCode,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Database,
  ChevronRight,
  Code2,
  Sparkles,
  Cpu,
  FileCode,
  Terminal,
  Eye,
  Download,
  Box,
  GitBranch,
  Play,
  Workflow,
  Rocket,
  FileText,
  FileArchive,
  Compass,
  FolderArchive,
  RefreshCw,
  ExternalLink
} from 'lucide-react';
import './LandingPage.css';

interface SampleTCode {
  tcode: string;
  name: string;
  module: string;
  program: string;
  fioriAppId: string;
  fioriTitle: string;
  appType: string;
  fitScore: number;
  fitCategory: 'DIRECT_REPLACEMENT' | 'FIT_WITH_ENHANCEMENT' | 'CUSTOM_RAP_BUILD';
  odataService: string;
  cleanCore: boolean;
  actionText: string;
  targetRoute: string;
}

const SAMPLE_TCODES: SampleTCode[] = [
  {
    tcode: 'ME21N',
    name: 'Create Purchase Order',
    module: 'Materials Management (MM-PUR)',
    program: 'SAPLMEGUI',
    fioriAppId: 'F0842A',
    fioriTitle: 'Manage Purchase Orders',
    appType: 'SAP Fiori Elements (List Report / Object Page)',
    fitScore: 94,
    fitCategory: 'DIRECT_REPLACEMENT',
    odataService: 'MM_PUR_PO_MAINT_V2_SRV',
    cleanCore: true,
    actionText: 'Launch Assessment in FioriX',
    targetRoute: '/transaction-discovery?tcode=ME21N'
  },
  {
    tcode: 'FB50',
    name: 'G/L Account Document Post',
    module: 'Financial Accounting (FI-GL)',
    program: 'SAPMF05A',
    fioriAppId: 'F0718',
    fioriTitle: 'Post General Journal Entries',
    appType: 'SAP Fiori Elements (Analytical / Transactional)',
    fitScore: 91,
    fitCategory: 'DIRECT_REPLACEMENT',
    odataService: 'FAC_FINANCIAL_DOCUMENT_POST_SRV',
    cleanCore: true,
    actionText: 'Launch Assessment in FioriX',
    targetRoute: '/transaction-discovery?tcode=FB50'
  },
  {
    tcode: 'VA01',
    name: 'Create Sales Order',
    module: 'Sales & Distribution (SD-SLS)',
    program: 'SAPMV45A',
    fioriAppId: 'F3893',
    fioriTitle: 'Create Sales Orders - Fast Entry',
    appType: 'SAP Fiori (Freestyle UI5 / Flexible Programming)',
    fitScore: 88,
    fitCategory: 'FIT_WITH_ENHANCEMENT',
    odataService: 'API_SALES_ORDER_SRV',
    cleanCore: true,
    actionText: 'Launch Assessment in FioriX',
    targetRoute: '/transaction-discovery?tcode=VA01'
  },
  {
    tcode: 'Z_VA02_EXT',
    name: 'Custom Sales Order Maintenance',
    module: 'Custom SD Extensions',
    program: 'ZSAPMV45A_CUSTOM',
    fioriAppId: 'NO_STD_FIT',
    fioriTitle: 'Custom Sales Order Fiori App (RAP Managed)',
    appType: 'RAP Business Object + Fiori Elements V4 (Generated)',
    fitScore: 42,
    fitCategory: 'CUSTOM_RAP_BUILD',
    odataService: 'ZUI_SALESORDER_O4 (Generated)',
    cleanCore: true,
    actionText: 'Design & Generate in Generation Studio',
    targetRoute: '/generation-studio'
  },
  {
    tcode: 'MM01',
    name: 'Create Material & Goods Master',
    module: 'Materials Management (MM-MD)',
    program: 'SAPLMG01',
    fioriAppId: 'F1990',
    fioriTitle: 'Manage Product Master Data',
    appType: 'SAP Fiori Elements',
    fitScore: 89,
    fitCategory: 'DIRECT_REPLACEMENT',
    odataService: 'CMD_PRODUCT_MAINT_SRV',
    cleanCore: true,
    actionText: 'Launch Assessment in FioriX',
    targetRoute: '/transaction-discovery?tcode=MM01'
  }
];

const CAPABILITIES = [
  {
    icon: SearchCode,
    title: 'Automated T-Code Discovery',
    description: 'Direct inspection of SAP kernel dictionary tables (TSTC, TSTCT, TADIR) to extract dynpros, screens, and custom user exits in real time.'
  },
  {
    icon: Database,
    title: '18,000+ App Fiori Catalog Intelligence',
    description: 'Continuously synced with the official SAP Fiori Reference Library to match standard apps, verified OData APIs, and S/4HANA release versions.'
  },
  {
    icon: ShieldCheck,
    title: 'Clean Core Fit-Gap Governance',
    description: 'Evidence-based delta analysis assessing custom database tables, modifications, and extension hooks with Lead Architect approval gating.'
  },
  {
    icon: Code2,
    title: 'RAP Backend Generator (S/4HANA 2023)',
    description: 'Synthesizes clean ABAP CDS View Entities, Behavior Definitions with strict ( 2 ), behavior pool classes, DCLs, and service definitions.'
  },
  {
    icon: Box,
    title: 'Fiori Elements V4 Application Generator',
    description: 'Generates complete SAPUI5 applications conforming to Fiori Design Guidelines, with manifest.json, annotations.xml, and @ui5/cli tooling.'
  },
  {
    icon: Play,
    title: 'Ephemeral Mock OData V4 Preview',
    description: 'Instant in-process local mock server with live query evaluation, synthetic records, and visual watermarking. No SAP connection required.'
  }
];

const KPI_METRICS = [
  {
    value: '18,000+',
    label: 'Official Fiori Apps Indexed',
    description: 'Continuously synced with SAP Fiori Reference Library and S/4HANA 2023–2026 baselines.'
  },
  {
    value: '80%+',
    label: 'Boilerplate Code Reduction',
    description: 'Automates CDS views, draft behavior definitions, and Fiori Elements XML annotations.'
  },
  {
    value: '100%',
    label: 'Clean Core RAP Compliance',
    description: 'Generates modern ABAP Cloud syntax (define view entity, strict 2, no legacy direct DB updates).'
  },
  {
    value: '< 3s',
    label: 'Instant Local Mock Preview',
    description: 'Ephemeral in-process OData V4 mock runtime allows testing UI without waiting for SAP transports.'
  }
];

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const [selectedTcode, setSelectedTcode] = useState<SampleTCode>(SAMPLE_TCODES[0]);
  const [activeStudioTab, setActiveStudioTab] = useState<'abap' | 'fiori' | 'preview' | 'handover'>('abap');

  return (
    <div className="landing-root">
      {/* 1. Navigation Header */}
      <header className="landing-nav">
        <div className="landing-brand" onClick={() => navigate('/')}>
          <div className="landing-brand-logo">
            <Layers size={18} />
          </div>
          <span className="landing-brand-title">
            Fiori<span className="landing-brand-accent">X</span>
          </span>
          <span className="nav-version-badge">2026 Enterprise</span>
        </div>

        <nav className="landing-nav-links">
          <a href="#sandbox" className="landing-nav-link">Discovery Console</a>
          <a href="#generation-studio" className="landing-nav-link nav-link-highlight">
            <Sparkles size={13} className="nav-sparkle-icon" />
            <span>Generation Studio</span>
            <span className="nav-new-pill">NEW</span>
          </a>
          <a href="#workflow" className="landing-nav-link">Modernization Flow</a>
          <a href="#capabilities" className="landing-nav-link">Capabilities</a>
          <a href="#clean-core" className="landing-nav-link">Clean Core</a>
        </nav>

        <div className="landing-nav-actions">
          <button
            type="button"
            className="btn-ghost"
            onClick={() => navigate('/login')}
          >
            Sign In
          </button>
          <button
            type="button"
            className="btn-primary-compact"
            onClick={() => navigate('/login?mode=demo')}
          >
            <span>Launch Platform</span>
            <ArrowRight size={14} />
          </button>
        </div>
      </header>

      {/* 2. Hero Section */}
      <section className="landing-hero">
        <div className="hero-pill-badge">
          <span className="pulse-dot" />
          <span>✨ GENERATION STUDIO NOW ACTIVE &bull; SAP S/4HANA 2023 RAP &amp; FIORI ELEMENTS SYNTHESIS</span>
        </div>

        <h1 className="hero-headline">
          Modernize Legacy SAP GUI Transactions to Clean Core Fiori &amp; Automated RAP Backends
        </h1>

        <p className="hero-subheadline">
          The end-to-end SAP modernization platform. Discover standard Fiori apps with kernel-grounded evidence,
          or generate production-ready ABAP RAP CDS entities, behaviors, and SAP Fiori Elements apps with instant local mock previews.
        </p>

        <div className="hero-cta-group">
          <button
            type="button"
            className="btn-hero-primary"
            onClick={() => navigate('/login?mode=demo&redirect=/generation-studio')}
          >
            <Code2 size={18} />
            <span>Launch Generation Studio</span>
            <ArrowRight size={16} />
          </button>

          <button
            type="button"
            className="btn-hero-secondary"
            onClick={() => navigate('/login?mode=demo&redirect=/transaction-discovery')}
          >
            <SearchCode size={18} />
            <span>Explore T-Code Discovery</span>
          </button>

          <a href="#generation-studio" className="btn-hero-ghost">
            <span>See Generated Artifacts</span>
            <ChevronRight size={16} />
          </a>
        </div>

        <div className="hero-trust-bar">
          <div className="trust-item">
            <CheckCircle2 size={15} color="#107e3e" />
            <span>Standard SAP Fiori First</span>
          </div>
          <div className="trust-item">
            <CheckCircle2 size={15} color="#107e3e" />
            <span>S/4HANA 2023 RAP &amp; ABAP Cloud</span>
          </div>
          <div className="trust-item">
            <CheckCircle2 size={15} color="#107e3e" />
            <span>Offline Ephemeral Mock OData V4</span>
          </div>
          <div className="trust-item">
            <CheckCircle2 size={15} color="#107e3e" />
            <span>Zero-Dependency PKZIP Handover</span>
          </div>
        </div>
      </section>

      {/* 3. Interactive Discovery & Decision Console Sandbox */}
      <section id="sandbox" className="sandbox-section">
        <div className="sandbox-container">
          <div className="sandbox-header">
            <span className="sandbox-kicker">Interactive Evaluation</span>
            <h2 className="sandbox-title">Experience Grounded Transaction Matching &amp; Gap Resolution</h2>
            <p className="sandbox-subtitle">
              Select a standard SAP transaction or a custom legacy extension to preview how FioriX inspects technical dictionary tables,
              matches official Fiori apps, or routes genuine gaps to Generation Studio.
            </p>
          </div>

          {/* Quick Selector Pills */}
          <div className="tcode-pills">
            {SAMPLE_TCODES.map((item) => {
              const isSelected = selectedTcode.tcode === item.tcode;
              const isCustom = item.fitCategory === 'CUSTOM_RAP_BUILD';
              return (
                <button
                  key={item.tcode}
                  type="button"
                  className={`tcode-pill ${isSelected ? 'active' : ''} ${isCustom ? 'pill-custom' : ''}`}
                  onClick={() => setSelectedTcode(item)}
                >
                  <span className="tcode-pill-code">{item.tcode}</span>
                  <span className="tcode-pill-name">({item.name})</span>
                  {isCustom && <span className="pill-badge-new">RAP BUILD</span>}
                </button>
              );
            })}
          </div>

          {/* Discovery Console Card */}
          <div className="console-card">
            {/* System Status Header */}
            <div className="console-system-bar">
              <div className="system-status-indicator">
                <span className="system-status-dot" />
                <span>Active Target: S21 (Client 200) &bull; SAP_BASIS 7.58 &bull; SAP_UI 7.58</span>
              </div>
              <div className="system-meta-indicator">
                <ShieldCheck size={14} color="#107e3e" />
                <span>Verified DDIC Source: TSTC, TADIR &bull; Clean Core Governed</span>
              </div>
            </div>

            {/* Console Content */}
            <div className="console-body">
              {/* Left Column: Legacy Transaction */}
              <div className="console-col-left">
                <div className="panel-label">Legacy SAP Dynpro Source</div>
                <div className="tcode-title-row">
                  <span className="tcode-display">{selectedTcode.tcode}</span>
                  <span className="badge-tag">SAP TSTC</span>
                </div>
                <div className="tcode-name-display">{selectedTcode.name}</div>
                <div className="meta-rows">
                  <div><strong>Module:</strong> {selectedTcode.module}</div>
                  <div><strong>ABAP Program:</strong> <code className="meta-code">{selectedTcode.program}</code></div>
                  <div><strong>Classification:</strong> {selectedTcode.fitCategory.replace(/_/g, ' ')}</div>
                </div>
              </div>

              {/* Middle Flow Indicator */}
              <div className="console-flow">
                <div className="flow-icon-circle">
                  {selectedTcode.fitCategory === 'CUSTOM_RAP_BUILD' ? <Code2 size={18} /> : <ArrowRight size={18} />}
                </div>
                <span className="flow-label">
                  {selectedTcode.fitCategory === 'CUSTOM_RAP_BUILD' ? 'GAP DETECTED' : 'MATCHED'}
                </span>
              </div>

              {/* Right Column: Target Recommendation */}
              <div className="console-col-right">
                <div className="target-header-row">
                  <span className="target-label">
                    {selectedTcode.fitCategory === 'CUSTOM_RAP_BUILD'
                      ? 'Custom Modernization Path'
                      : 'Recommended Fiori Target'}
                  </span>
                  <span className={`fit-badge ${selectedTcode.fitCategory === 'CUSTOM_RAP_BUILD' ? 'badge-build' : ''}`}>
                    {selectedTcode.fitCategory === 'CUSTOM_RAP_BUILD'
                      ? 'Custom Gap Build'
                      : `${selectedTcode.fitScore}% Fit Score`}
                  </span>
                </div>

                <div className="target-title">{selectedTcode.fioriTitle}</div>
                <div className="target-meta">
                  {selectedTcode.fioriAppId !== 'NO_STD_FIT' ? (
                    <>App ID: <strong>{selectedTcode.fioriAppId}</strong> &bull; {selectedTcode.appType}</>
                  ) : (
                    <>Technology: <strong>ABAP RAP Managed with Draft</strong> &bull; SAP Fiori Elements V4</>
                  )}
                </div>

                <div className="target-details">
                  <div><strong>Service:</strong> <code className="meta-code">{selectedTcode.odataService}</code></div>
                  <div>
                    <strong>Strategy:</strong>{' '}
                    {selectedTcode.fitCategory === 'CUSTOM_RAP_BUILD'
                      ? 'Clean Core In-App RAP Synthesis (Generation Studio)'
                      : 'Direct Standard Replacement (Clean Core Compliant)'}
                  </div>
                </div>

                <button
                  type="button"
                  className={`btn-launch-assessment ${selectedTcode.fitCategory === 'CUSTOM_RAP_BUILD' ? 'btn-launch-studio' : ''}`}
                  onClick={() => navigate(`/login?mode=demo&redirect=${encodeURIComponent(selectedTcode.targetRoute)}`)}
                >
                  {selectedTcode.fitCategory === 'CUSTOM_RAP_BUILD' ? <Code2 size={15} /> : <Sparkles size={15} />}
                  <span>{selectedTcode.actionText}</span>
                  <ArrowRight size={14} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Brand New Section: Generation Studio Showcase */}
      <section id="generation-studio" className="studio-showcase-section">
        <div className="studio-showcase-container">
          <div className="section-intro">
            <span className="section-kicker">Bridging the Gap Between Discovery and Execution</span>
            <h2 className="section-headline">FioriX Generation Studio: Automated Code Synthesis</h2>
            <p className="section-subheadline">
              When standard SAP Fiori apps have genuine custom gaps, Generation Studio generates an end-to-end,
              Clean Core ABAP RAP Business Object stack and SAP Fiori Elements application in seconds.
            </p>
          </div>

          {/* Interactive Studio Artifact Explorer */}
          <div className="studio-tabs-card">
            {/* Tab Switcher */}
            <div className="studio-tab-header">
              <button
                type="button"
                className={`studio-tab-btn ${activeStudioTab === 'abap' ? 'active' : ''}`}
                onClick={() => setActiveStudioTab('abap')}
              >
                <Cpu size={16} />
                <span>1. ABAP RAP Backend</span>
                <span className="tab-pill">CDS &amp; BDEF</span>
              </button>
              <button
                type="button"
                className={`studio-tab-btn ${activeStudioTab === 'fiori' ? 'active' : ''}`}
                onClick={() => setActiveStudioTab('fiori')}
              >
                <Box size={16} />
                <span>2. SAP Fiori Elements V4</span>
                <span className="tab-pill">UI5 App</span>
              </button>
              <button
                type="button"
                className={`studio-tab-btn ${activeStudioTab === 'preview' ? 'active' : ''}`}
                onClick={() => setActiveStudioTab('preview')}
              >
                <Play size={16} />
                <span>3. Local Ephemeral Preview</span>
                <span className="tab-pill-live">LIVE MOCK</span>
              </button>
              <button
                type="button"
                className={`studio-tab-btn ${activeStudioTab === 'handover' ? 'active' : ''}`}
                onClick={() => setActiveStudioTab('handover')}
              >
                <FolderArchive size={16} />
                <span>4. Developer Handover</span>
                <span className="tab-pill">PKZIP &amp; ADT</span>
              </button>
            </div>

            {/* Tab 1: ABAP RAP */}
            {activeStudioTab === 'abap' && (
              <div className="studio-tab-body">
                <div className="studio-code-header">
                  <div className="file-indicator">
                    <FileCode size={15} color="#0070f2" />
                    <span className="file-name">abap/cds/zi_customorder.ddls.asddls</span>
                    <span className="file-tag">CDS View Entity (S/4HANA 2023)</span>
                  </div>
                  <div className="code-action-tag">Clean Core ABAP Cloud &bull; strict ( 2 )</div>
                </div>
                <div className="studio-code-preview">
                  <pre className="code-block">
{`@AccessControl.authorizationCheck: #CHECK
@EndUserText.label: 'Custom Sales Order Interface Entity'
@Metadata.allowExtensions: true
@VDM.viewType: #BASIC
define root view entity ZI_CustomOrder
  as select from zcustom_order as Order
  composition [0..*] of ZI_CustomOrderItem as _Items
{
  key Order.order_id            as OrderID,
      Order.customer_id         as CustomerID,
      @Semantics.amount.currencyCode: 'CurrencyCode'
      Order.total_amount        as TotalAmount,
      Order.currency_code       as CurrencyCode,
      Order.order_status        as OrderStatus,
      @Semantics.systemDateTime.lastChangedAt: true
      Order.last_changed_at     as LastChangedAt,
      _Items
}`}
                  </pre>
                </div>
                <div className="studio-tab-footer">
                  <div className="footer-bullet">
                    <CheckCircle2 size={14} color="#107e3e" />
                    <span>Modern CDS View Entities (no obsolete DDIC views)</span>
                  </div>
                  <div className="footer-bullet">
                    <CheckCircle2 size={14} color="#107e3e" />
                    <span>Behavior Definition with Draft Actions, Total ETag, and Strict Mode 2</span>
                  </div>
                  <button
                    type="button"
                    className="btn-tab-action"
                    onClick={() => navigate('/login?mode=demo&redirect=/generation-studio')}
                  >
                    <span>Inspect in Generation Studio</span>
                    <ArrowRight size={13} />
                  </button>
                </div>
              </div>
            )}

            {/* Tab 2: Fiori Elements */}
            {activeStudioTab === 'fiori' && (
              <div className="studio-tab-body">
                <div className="studio-code-header">
                  <div className="file-indicator">
                    <FileCode size={15} color="#0070f2" />
                    <span className="file-name">fiori/webapp/manifest.json</span>
                    <span className="file-tag">SAP Fiori Elements V4 LROP</span>
                  </div>
                  <div className="code-action-tag">SAPUI5 1.120.0 LTS &bull; minUI5Version 1.114.0</div>
                </div>
                <div className="studio-code-preview">
                  <pre className="code-block">
{`{
  "_version": "1.58.0",
  "sap.app": {
    "id": "customer.fiorix.customorder",
    "type": "application",
    "dataSources": {
      "mainService": {
        "uri": "/sap/opu/odata4/sap/zui_customorder_o4/srvd/sap/zui_customorder/0001/",
        "type": "OData",
        "settings": { "odataVersion": "4.0" }
      }
    }
  },
  "sap.ui5": {
    "dependencies": {
      "minUI5Version": "1.114.0",
      "libs": { "sap.fe.core": {}, "sap.m": {} }
    },
    "routing": {
      "routes": [{ "name": "CustomOrderList", "pattern": ":?query:", "target": "CustomOrderList" }],
      "targets": {
        "CustomOrderList": { "type": "Component", "id": "CustomOrderList", "name": "sap.fe.templates.ListReport" }
      }
    }
  }
}`}
                  </pre>
                </div>
                <div className="studio-tab-footer">
                  <div className="footer-bullet">
                    <CheckCircle2 size={14} color="#107e3e" />
                    <span>Complete List Report &amp; Object Page V4 Routing</span>
                  </div>
                  <div className="footer-bullet">
                    <CheckCircle2 size={14} color="#107e3e" />
                    <span>Local XML UI Annotations: LineItem, HeaderInfo, SelectionFields</span>
                  </div>
                  <button
                    type="button"
                    className="btn-tab-action"
                    onClick={() => navigate('/login?mode=demo&redirect=/generation-studio')}
                  >
                    <span>Configure in Generation Studio</span>
                    <ArrowRight size={13} />
                  </button>
                </div>
              </div>
            )}

            {/* Tab 3: Local Ephemeral Preview */}
            {activeStudioTab === 'preview' && (
              <div className="studio-tab-body">
                <div className="studio-preview-simulation">
                  {/* Watermark Banner */}
                  <div className="mock-watermark-banner">
                    <Terminal size={14} />
                    <span>MOCK / DRAFT PREVIEW ONLY &bull; NOT CONNECTED TO SAP S21 &bull; LOOPBACK 127.0.0.1</span>
                  </div>

                  {/* Mock Fiori Toolbar */}
                  <div className="mock-fiori-toolbar">
                    <div className="mock-toolbar-title">Custom Sales Orders (4)</div>
                    <div className="mock-toolbar-actions">
                      <button type="button" className="mock-btn-sm">Filter</button>
                      <button type="button" className="mock-btn-sm mock-btn-primary">+ Create</button>
                    </div>
                  </div>

                  {/* Mock Table */}
                  <div className="mock-table-wrapper">
                    <table className="mock-table">
                      <thead>
                        <tr>
                          <th>Order ID</th>
                          <th>Customer</th>
                          <th>Total Amount</th>
                          <th>Status</th>
                          <th>Draft State</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td><strong>ORD-2026-901</strong></td>
                          <td>Industrial Dynamics AG</td>
                          <td>$ 142,500.00 USD</td>
                          <td><span className="mock-badge-success">Approved</span></td>
                          <td><span className="mock-badge-active">Active</span></td>
                        </tr>
                        <tr>
                          <td><strong>ORD-2026-902</strong></td>
                          <td>Nordic Logistics GmbH</td>
                          <td>$ 89,200.00 EUR</td>
                          <td><span className="mock-badge-draft">In Review</span></td>
                          <td><span className="mock-badge-draft-pill">Draft Saved</span></td>
                        </tr>
                        <tr>
                          <td><strong>ORD-2026-903</strong></td>
                          <td>Apex Manufacturing Corp</td>
                          <td>$ 310,000.00 USD</td>
                          <td><span className="mock-badge-pending">Pending Approval</span></td>
                          <td><span className="mock-badge-active">Active</span></td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="studio-tab-footer">
                  <div className="footer-bullet">
                    <CheckCircle2 size={14} color="#107e3e" />
                    <span>In-process native Node HTTP OData V4 mock runtime</span>
                  </div>
                  <div className="footer-bullet">
                    <CheckCircle2 size={14} color="#107e3e" />
                    <span>Evaluates $filter, $select, $expand, and RAP draft actions</span>
                  </div>
                  <button
                    type="button"
                    className="btn-tab-action"
                    onClick={() => navigate('/login?mode=demo&redirect=/generation-studio')}
                  >
                    <span>Test Local Preview</span>
                    <ArrowRight size={13} />
                  </button>
                </div>
              </div>
            )}

            {/* Tab 4: Developer Handover */}
            {activeStudioTab === 'handover' && (
              <div className="studio-tab-body">
                <div className="studio-handover-grid">
                  <div className="handover-tree-col">
                    <div className="handover-tree-title">
                      <FolderArchive size={15} color="#0070f2" />
                      <span>Zero-Dependency PKZIP Bundle</span>
                    </div>
                    <div className="handover-tree-content">
                      <div className="tree-node tree-folder">📦 Project_Handover_Bundle.zip</div>
                      <div className="tree-node tree-sub">📁 abap/tables/ (SQL DDL &amp; Draft Tables)</div>
                      <div className="tree-node tree-sub">📁 abap/cds/ (ZI_* Interface &amp; ZC_* Projection)</div>
                      <div className="tree-node tree-sub">📁 abap/behavior/ (ZR_* BDEF strict 2)</div>
                      <div className="tree-node tree-sub">📁 abap/behavior_classes/ (ZBP_* Behavior Pool)</div>
                      <div className="tree-node tree-sub">📁 abap/services/ (ZUI_* SRVD Service Def)</div>
                      <div className="tree-node tree-sub">📁 fiori/webapp/ (manifest.json, annotations.xml)</div>
                      <div className="tree-node tree-sub">📁 docs/ (TRACEABILITY_MATRIX.md, DEVELOPER_GUIDE.md)</div>
                      <div className="tree-node tree-sub">📄 fiorix-export-manifest.json (SHA-256 Hashes)</div>
                    </div>
                  </div>

                  <div className="handover-guide-col">
                    <div className="guide-box-title">
                      <Terminal size={15} color="#0070f2" />
                      <span>Ready for Eclipse ADT &amp; SAP BAS</span>
                    </div>
                    <ol className="handover-steps-list">
                      <li><strong>Eclipse ADT Connection:</strong> Connect to SAP S21 (Client 200) via ABAP Cloud project.</li>
                      <li><strong>Create Database Tables:</strong> Execute transparent table DDL in <code>abap/tables/</code>.</li>
                      <li><strong>Activate CDS Views:</strong> Import Interface &amp; Projection Views in dependency order.</li>
                      <li><strong>Activate Behavior:</strong> Import Behavior Definition &amp; implement custom logic hooks.</li>
                      <li><strong>Publish Service Binding:</strong> Publish OData V4 UI service binding in 1 click.</li>
                    </ol>
                  </div>
                </div>

                <div className="studio-tab-footer">
                  <div className="footer-bullet">
                    <CheckCircle2 size={14} color="#107e3e" />
                    <span>Pure Node.js PKZIP archiver (zero external npm dependencies)</span>
                  </div>
                  <div className="footer-bullet">
                    <CheckCircle2 size={14} color="#107e3e" />
                    <span>Cryptographic SHA-256 verification and full audit provenance</span>
                  </div>
                  <button
                    type="button"
                    className="btn-tab-action"
                    onClick={() => navigate('/login?mode=demo&redirect=/generation-studio')}
                  >
                    <span>Open Generation Studio</span>
                    <ArrowRight size={13} />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* 4 RAP Architectural Profiles Strip */}
          <div className="rap-profiles-grid">
            <div className="rap-profile-card">
              <div className="profile-badge">PROFILE 1</div>
              <h4 className="profile-title">Managed with Draft</h4>
              <p className="profile-desc">
                Default for new transactional business objects. Optimistic locking, total ETag, draft staging, and clean core compliance.
              </p>
            </div>
            <div className="rap-profile-card">
              <div className="profile-badge">PROFILE 2</div>
              <h4 className="profile-title">Managed Direct</h4>
              <p className="profile-desc">
                Master data and configuration entities requiring direct database persistence without intermediate draft tables.
              </p>
            </div>
            <div className="rap-profile-card">
              <div className="profile-badge">PROFILE 3</div>
              <h4 className="profile-title">Unmanaged Wrapper</h4>
              <p className="profile-desc">
                Safely modernizes legacy BAPIs, function modules, and custom update tasks inside a governed RAP behavior handler.
              </p>
            </div>
            <div className="rap-profile-card">
              <div className="profile-badge">PROFILE 4</div>
              <h4 className="profile-title">Read-Only Query</h4>
              <p className="profile-desc">
                High-performance analytical reporting, KPI dashboards, and read-only status monitoring views.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 5. End-to-End Modernization Journey */}
      <section id="workflow" className="workflow-section">
        <div className="section-intro">
          <span className="section-kicker">Unified Lifecycle</span>
          <h2 className="section-headline">The 4-Step Modernization Journey</h2>
          <p className="section-subheadline">
            From technical dictionary discovery to developer-ready ABAP RAP packages in one governed workflow.
          </p>
        </div>

        <div className="workflow-steps-grid">
          <div className="workflow-step-card">
            <div className="step-number-badge">01</div>
            <div className="step-icon-wrap">
              <SearchCode size={20} />
            </div>
            <h3 className="step-title">Discover &amp; Inspect</h3>
            <p className="step-desc">
              Inspect legacy transactions in SAP TSTC, TADIR, and dynpros. Identify custom tables and extensions.
            </p>
          </div>

          <div className="workflow-step-card">
            <div className="step-number-badge">02</div>
            <div className="step-icon-wrap">
              <ShieldCheck size={20} />
            </div>
            <h3 className="step-title">Assess &amp; Govern</h3>
            <p className="step-desc">
              Evaluate against 18,000+ Fiori apps. Score Clean Core compatibility and enforce Lead Architect approval.
            </p>
          </div>

          <div className="workflow-step-card step-card-highlight">
            <div className="step-number-badge step-badge-highlight">03</div>
            <div className="step-icon-wrap step-icon-highlight">
              <Code2 size={20} />
            </div>
            <h3 className="step-title">Model &amp; Synthesize</h3>
            <p className="step-desc">
              Generation Studio designs the CDS data model and synthesizes RAP CDS, BDEF, behavior classes, and UI5 apps.
            </p>
          </div>

          <div className="workflow-step-card">
            <div className="step-number-badge">04</div>
            <div className="step-icon-wrap">
              <Download size={20} />
            </div>
            <h3 className="step-title">Preview &amp; Handover</h3>
            <p className="step-desc">
              Validate via local mock OData runtime, check Clean Core rules, and export PKZIP bundle for Eclipse ADT.
            </p>
          </div>
        </div>
      </section>

      {/* 6. Core Platform Capabilities */}
      <section id="capabilities" className="capabilities-section">
        <div className="section-intro">
          <span className="section-kicker">Enterprise Architecture</span>
          <h2 className="section-headline">Engineered for Pragmatic SAP Modernization</h2>
        </div>

        <div className="capabilities-grid">
          {CAPABILITIES.map((cap) => {
            const Icon = cap.icon;
            return (
              <div key={cap.title} className="capability-card">
                <div className="capability-icon-wrap">
                  <Icon size={20} />
                </div>
                <h3 className="capability-title">{cap.title}</h3>
                <p className="capability-desc">{cap.description}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* 7. Clean Core Metric Strip */}
      <section id="clean-core" className="clean-core-strip">
        <div className="clean-core-inner">
          {KPI_METRICS.map((kpi) => (
            <div key={kpi.label} className="kpi-metric-card">
              <span className="kpi-value">{kpi.value}</span>
              <span className="kpi-label">{kpi.label}</span>
              <p className="kpi-desc">{kpi.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 8. Call to Action Banner */}
      <section className="cta-banner-section">
        <div className="cta-banner-card">
          <div className="cta-content">
            <span className="cta-kicker">Start Modernizing Now</span>
            <h2 className="cta-title">Accelerate Your SAP S/4HANA Clean Core Journey</h2>
            <p className="cta-desc">
              Move from legacy Dynpro screens to production-grade ABAP RAP and SAP Fiori Elements in minutes.
            </p>
          </div>
          <div className="cta-actions">
            <button
              type="button"
              className="btn-cta-primary"
              onClick={() => navigate('/login?mode=demo&redirect=/generation-studio')}
            >
              <Code2 size={16} />
              <span>Open Generation Studio</span>
              <ArrowRight size={14} />
            </button>
            <button
              type="button"
              className="btn-cta-secondary"
              onClick={() => navigate('/login?mode=demo&redirect=/transaction-discovery')}
            >
              <SearchCode size={16} />
              <span>Explore T-Codes</span>
            </button>
          </div>
        </div>
      </section>

      {/* 9. Footer */}
      <footer className="landing-footer">
        <div className="footer-left">
          <span className="footer-brand">FioriX</span>
          <span>&bull; SAP S/4HANA Modernization Platform</span>
          <span className="footer-system-tag">Target: S21 (Client 200) &bull; SAP_BASIS 7.58 &bull; SAP_UI 7.58</span>
        </div>
        <div className="footer-right">
          <span>Official Fiori Catalog &bull; ABAP RAP Generator &bull; Fiori Elements V4</span>
        </div>
      </footer>
    </div>
  );
};
