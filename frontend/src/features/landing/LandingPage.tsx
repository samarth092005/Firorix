import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiorifyLogo } from '../../components/common/FiorifyLogo';
import { LandingProductPreview } from './LandingProductPreview';
import {
  Layers,
  SearchCode,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Code2,
  Sparkles,
  Database,
  Cpu,
  LayoutTemplate,
  Zap,
  Lock,
  ExternalLink,
  Terminal,
  FileCode2,
  Package,
  Play,
  BarChart3,
  Building2,
  GitBranch,
  Shield,
  Eye,
  Server,
  FileCheck,
  Copy,
  Check
} from 'lucide-react';
import './LandingPage.css';

interface DemoTCodeScenario {
  tcode: string;
  name: string;
  module: string;
  category: 'STANDARD' | 'CUSTOM';
  program: string;
  tables: string[];
  authObject: string;
  matchType: 'STANDARD_SUCCESSOR' | 'CUSTOM_RAP_BUILD';
  fioriAppId?: string;
  fioriAppName?: string;
  confidence: string;
  rationale: string;
  cleanCoreTier: string;
  suggestedAction: string;
}

const DEMO_SCENARIOS: DemoTCodeScenario[] = [
  {
    tcode: 'ME21N',
    name: 'Create Purchase Order',
    module: 'Procurement (MM-PUR)',
    category: 'STANDARD',
    program: 'SAPLMEGUI',
    tables: ['EKKO', 'EKPO', 'EKET', 'EKKN'],
    authObject: 'M_BEST_BSA',
    matchType: 'STANDARD_SUCCESSOR',
    fioriAppId: 'F0842A',
    fioriAppName: 'Manage Purchase Orders',
    confidence: '100% VERIFIED',
    rationale: 'Direct modern SAP Fiori elements replacement with OData V4 support. Standard PFCG role SAP_BR_PURCHASER.',
    cleanCoreTier: 'TIER 1 (STANDARD ADOPTION)',
    suggestedAction: 'ADOPT STANDARD APPLICATION'
  },
  {
    tcode: 'F-53',
    name: 'Post Outgoing Payments',
    module: 'Financials (FI-AP)',
    category: 'STANDARD',
    program: 'SAPMF05A',
    tables: ['BKPF', 'BSEG', 'BSIK', 'BSAK'],
    authObject: 'F_BKPF_BUK',
    matchType: 'STANDARD_SUCCESSOR',
    fioriAppId: 'F0773',
    fioriAppName: 'Post Outgoing Payments',
    confidence: '98% VERIFIED',
    rationale: 'Transactional Fiori application backed by active Gateway OData service. PFCG role SAP_BR_AP_ACCOUNTANT.',
    cleanCoreTier: 'TIER 1 (STANDARD ADOPTION)',
    suggestedAction: 'ACTIVATE & CONFIGURE CATALOG'
  },
  {
    tcode: 'IW31',
    name: 'Create Maintenance Order',
    module: 'Plant Maintenance (PM-WOC)',
    category: 'STANDARD',
    program: 'SAPLCOIH',
    tables: ['AUFK', 'AFKO', 'AFVC', 'AFIH'],
    authObject: 'I_TCODE',
    matchType: 'STANDARD_SUCCESSOR',
    fioriAppId: 'F2173',
    fioriAppName: 'Create Maintenance Order',
    confidence: '95% VERIFIED',
    rationale: 'Standard Fiori app with responsive object page. Available on S/4HANA 2023 on-premise.',
    cleanCoreTier: 'TIER 1 (STANDARD ADOPTION)',
    suggestedAction: 'ADOPT STANDARD APPLICATION'
  },
  {
    tcode: 'VA01',
    name: 'Create Sales Order',
    module: 'Sales & Distribution (SD-SLS)',
    category: 'STANDARD',
    program: 'SAPMV45A',
    tables: ['VBAK', 'VBAP', 'VBEP', 'VBKD'],
    authObject: 'V_VBAK_VKO',
    matchType: 'STANDARD_SUCCESSOR',
    fioriAppId: 'F3893',
    fioriAppName: 'Create Sales Orders - VA01',
    confidence: '92% VERIFIED',
    rationale: 'Modernized Fiori Elements application with integrated pricing condition determination.',
    cleanCoreTier: 'TIER 1 (STANDARD ADOPTION)',
    suggestedAction: 'ADOPT STANDARD APPLICATION'
  },
  {
    tcode: 'ZPURCHASE',
    name: 'Custom Capital PO Approval Engine',
    module: 'Procurement Custom (Z-MOD)',
    category: 'CUSTOM',
    program: 'ZMM_CAPEX_WF',
    tables: ['ZEKKO_EXT', 'ZEKPO_EXT', 'ZAPPRV_LOG'],
    authObject: 'Z_MM_CAPEX',
    matchType: 'CUSTOM_RAP_BUILD',
    confidence: '100% FUNCTIONAL GAP',
    rationale: 'Multi-level corporate threshold approval with proprietary matrix. Zero standard SAP Fiori match exists.',
    cleanCoreTier: 'TIER 2 (RAP MANAGED WITH DRAFT)',
    suggestedAction: 'SYNTHESIZE CLEAN CORE RAP APP'
  }
];

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const [activeScenario, setActiveScenario] = useState<DemoTCodeScenario>(DEMO_SCENARIOS[0]);
  const [activeStudioTab, setActiveStudioTab] = useState<'CDS' | 'BEHAVIOR' | 'PREVIEW' | 'HANDOVER'>('CDS');
  const [copiedCode, setCopiedCode] = useState<boolean>(false);

  const handleLaunchDemo = (targetUrl: string = '/overview') => {
    navigate(`/login?mode=demo&redirect=${encodeURIComponent(targetUrl)}`);
  };

  const handleCopyCode = (codeText: string) => {
    navigator.clipboard?.writeText(codeText);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const CDS_CODE = `@EndUserText.label: 'Purchase Order Projection View'
@AccessControl.authorizationCheck: #CHECK
@Metadata.allowExtensions: true
define root view entity ZC_PurchaseOrder
  provider contract transactional_query
  as projection on ZI_PurchaseOrder
{
  key PurchaseOrderUUID,
      PurchaseOrderNumber,
      @Consumption.valueHelpDefinition: [{ entity: { name: 'I_CompanyCode', element: 'CompanyCode' } }]
      CompanyCode,
      @Consumption.valueHelpDefinition: [{ entity: { name: 'I_Supplier', element: 'Supplier' } }]
      Supplier,
      TotalNetAmount,
      DocumentCurrency,
      OrderStatus,
      /* Compositions */
      _Item : redirected to composition child ZC_PurchaseOrderItem
}`;

  const BEHAVIOR_CODE = `METHOD validateSupplier.
  READ ENTITIES OF zi_purchaseorder IN LOCAL MODE
    ENTITY PurchaseOrder
      FIELDS ( Supplier ) WITH CORRESPONDING #( keys )
    RESULT DATA(lt_orders).

  LOOP AT lt_orders INTO DATA(ls_order).
    IF ls_order-Supplier IS INITIAL.
      APPEND VALUE #( %tky = ls_order-%tky ) TO failed-purchaseorder.
      APPEND VALUE #( %tky = ls_order-%tky
                      %msg = new_message_with_text(
                               severity = if_abap_behv_message=>severity-error
                               text     = 'Supplier is mandatory under Clean Core purchasing policy.' )
                      %element-Supplier = if_abap_behv=>mk-on ) TO reported-purchaseorder.
    ENDIF.
  ENDLOOP.
ENDMETHOD.`;

  return (
    <div className="landing-root">
      {/* ====================================================================
          1. NAVIGATION HEADER
          ==================================================================== */}
      <header className="landing-nav">
        <div className="landing-brand-area" onClick={() => navigate('/')}>
          <FiorifyLogo variant="compact" size="md" />
          <span className="nav-version-badge">Enterprise Edition</span>
        </div>

        <nav className="landing-nav-links">
          <a href="#discovery" className="landing-nav-link">
            <SearchCode size={15} />
            <span>T-Code Discovery</span>
          </a>
          <a href="#fit-gap" className="landing-nav-link">
            <ShieldCheck size={15} />
            <span>Fit-Gap Governance</span>
          </a>
          <a href="#studio" className="landing-nav-link">
            <Code2 size={15} />
            <span>RAP Studio</span>
            <span className="nav-new-pill">NEW</span>
          </a>
          <a href="#compliance" className="landing-nav-link">
            <CheckCircle2 size={15} />
            <span>Clean Core</span>
          </a>
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
            onClick={() => handleLaunchDemo('/overview')}
          >
            <span>Launch Platform Demo</span>
            <ArrowRight size={14} />
          </button>
        </div>
      </header>

      {/* ====================================================================
          2. HERO SECTION — BALANCED TWO-COLUMN ENTERPRISE COMPOSITION
          ==================================================================== */}
      <section className="landing-hero-two-col">
        <div className="hero-content-left">
          <div className="hero-pill-badge">
            <span className="pulse-dot" />
            <span>The Enterprise Modernization Accelerator for SAP S/4HANA</span>
          </div>

          <h1 className="hero-headline">
            Eliminate SAP GUI Legacy Debt. Accelerate <span className="landing-brand-accent">Clean Core Fiori</span> Adoption.
          </h1>

          <p className="hero-subheadline">
            Automate transaction discovery, match against the official SAP Fiori catalog, enforce standard-first governance, and generate production-grade ABAP RAP and Fiori Elements applications.
          </p>

          <div className="hero-cta-group">
            <button
              type="button"
              className="btn-hero-primary"
              onClick={() => handleLaunchDemo('/overview')}
            >
              <Zap size={17} />
              <span>Enter Enterprise Workspace</span>
              <ArrowRight size={15} />
            </button>

            <button
              type="button"
              className="btn-hero-secondary"
              onClick={() => handleLaunchDemo('/transaction-discovery')}
            >
              <SearchCode size={16} color="#0066FF" />
              <span>Analyze Transaction Code</span>
            </button>

            <a href="#sandbox" className="btn-hero-ghost">
              <span>Explore Interactive Sandbox</span>
              <ArrowRight size={13} />
            </a>
          </div>

          {/* Compact Enterprise Trust Indicators */}
          <div className="hero-trust-bar">
            <div className="trust-item">
              <CheckCircle2 size={15} className="trust-check-icon" />
              <span>Standard-First Priority</span>
            </div>
            <div className="trust-item">
              <CheckCircle2 size={15} className="trust-check-icon" />
              <span>Clean Core Governance</span>
            </div>
            <div className="trust-item">
              <CheckCircle2 size={15} className="trust-check-icon" />
              <span>RAP Managed with Draft &amp; EML</span>
            </div>
            <div className="trust-item">
              <CheckCircle2 size={15} className="trust-check-icon" />
              <span>Zero Mutation Safety</span>
            </div>
          </div>
        </div>

        {/* Right Column: Realistic FioriFy Product Preview Component */}
        <div className="hero-preview-right">
          <LandingProductPreview />
        </div>
      </section>

      {/* ====================================================================
          3. PLATFORM METRICS
          ==================================================================== */}
      <section className="clean-core-strip" id="compliance">
        <div className="clean-core-inner">
          <div className="kpi-metric-card">
            <div className="kpi-value">85%</div>
            <div className="kpi-label">Faster Assessment Cycles</div>
            <p className="kpi-desc">Instantly analyzes DDIC tables, screens, authorizations, and Fiori catalog equivalents.</p>
          </div>
          <div className="kpi-metric-card">
            <div className="kpi-value">14,000+</div>
            <div className="kpi-label">Verified Standard Apps</div>
            <p className="kpi-desc">Live synchronization with official SAP Fiori Apps Reference Library across all S/4HANA releases.</p>
          </div>
          <div className="kpi-metric-card">
            <div className="kpi-value">100%</div>
            <div className="kpi-label">Clean Core Compliance</div>
            <p className="kpi-desc">Tier 2 Cloud Development model with C1-released CDS value helps and zero core modification.</p>
          </div>
          <div className="kpi-metric-card">
            <div className="kpi-value">0 RISK</div>
            <div className="kpi-label">Non-Mutating Sandbox</div>
            <p className="kpi-desc">Strict read-only safety guardrails for SAP DEV/QA/PRD landscapes with offline abapGit handover.</p>
          </div>
        </div>
      </section>

      {/* ====================================================================
          4. INTERACTIVE PRODUCT SANDBOX
          ==================================================================== */}
      <section className="sandbox-section" id="sandbox">
        <div className="sandbox-container">
          <div className="sandbox-header">
            <span className="sandbox-kicker">Interactive Product Sandbox</span>
            <h2 className="sandbox-title">See How FioriFy Resolves Real Enterprise Transactions</h2>
            <p className="sandbox-subtitle">
              Select any SAP transaction code below to simulate live DDIC analysis, Fiori catalog matching, and governed modernization routing.
            </p>
          </div>

          {/* T-Code Pills */}
          <div className="tcode-pills">
            {DEMO_SCENARIOS.map((sc) => (
              <button
                key={sc.tcode}
                type="button"
                className={`tcode-pill ${activeScenario.tcode === sc.tcode ? 'active' : ''} ${sc.category === 'CUSTOM' ? 'pill-custom' : ''}`}
                onClick={() => setActiveScenario(sc)}
              >
                <span className="tcode-pill-code">{sc.tcode}</span>
                <span className="tcode-pill-name">({sc.name})</span>
                {sc.category === 'CUSTOM' && <span className="pill-badge-new">Z-CODE</span>}
              </button>
            ))}
          </div>

          {/* Interactive Dual Console Card */}
          <div className="console-card">
            <div className="console-system-bar">
              <div className="system-status-indicator">
                <span className="system-status-dot" />
                <span>Target Landscape: <strong>SAP S/4HANA 2023 FPS01 (Client 200)</strong></span>
              </div>
              <div className="system-meta-indicator">
                <Shield size={14} color="#107E3E" />
                <span>Read-Only Verification Mode Active</span>
              </div>
            </div>

            <div className="console-body">
              {/* Left Column: Input T-Code Details */}
              <div className="console-col-left">
                <span className="panel-label">1. Legacy SAP GUI Transaction</span>
                <div className="tcode-title-row">
                  <span className="tcode-display">{activeScenario.tcode}</span>
                  <span className="badge-tag">{activeScenario.module}</span>
                </div>
                <div className="tcode-name-display">{activeScenario.name}</div>
                <div className="meta-rows">
                  <div>Program: <span className="meta-code">{activeScenario.program}</span></div>
                  <div>Underlying Tables: <span className="meta-code">{activeScenario.tables.join(', ')}</span></div>
                  <div>Authorization Object: <span className="meta-code">{activeScenario.authObject}</span></div>
                </div>
              </div>

              {/* Middle Column: Flow Engine Arrow */}
              <div className="console-flow">
                <div className="flow-icon-circle">
                  <ArrowRight size={20} />
                </div>
                <span className="flow-label">FAL Match</span>
              </div>

              {/* Right Column: Governed Outcome */}
              <div className="console-col-right">
                <span className="target-label">2. Governed Modernization Route</span>
                <div className="target-header-row">
                  <span className="target-title">
                    {activeScenario.matchType === 'STANDARD_SUCCESSOR'
                      ? `${activeScenario.fioriAppId} — ${activeScenario.fioriAppName}`
                      : 'Clean Core Custom RAP Application'}
                  </span>
                  <span className={`fit-badge ${activeScenario.matchType === 'CUSTOM_RAP_BUILD' ? 'badge-build' : ''}`}>
                    {activeScenario.confidence}
                  </span>
                </div>
                <div className="target-meta">Compliance: <strong>{activeScenario.cleanCoreTier}</strong></div>
                <p className="target-details">{activeScenario.rationale}</p>

                <button
                  type="button"
                  className="btn-launch-assessment"
                  onClick={() => handleLaunchDemo(`/transaction-discovery?tcode=${activeScenario.tcode}`)}
                >
                  <Play size={14} />
                  <span>{activeScenario.suggestedAction}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ====================================================================
          5. GENERATION STUDIO SHOWCASE
          ==================================================================== */}
      <section className="studio-showcase-section" id="studio">
        <div className="studio-showcase-container">
          <div className="section-intro">
            <span className="section-kicker">Generation Studio &amp; Architecture Engine</span>
            <h2 className="section-headline">Deep ABAP RAP &amp; Fiori Elements Code Synthesis</h2>
            <p className="section-subheadline">
              When genuine functional gaps necessitate custom development, FioriFy generates a complete 17-artifact Clean Core ABAP repository and enterprise Fiori Elements application.
            </p>
          </div>

          <div className="studio-tabs-card">
            {/* Tabs Header */}
            <div className="studio-tab-header">
              <button
                type="button"
                className={`studio-tab-btn ${activeStudioTab === 'CDS' ? 'active' : ''}`}
                onClick={() => setActiveStudioTab('CDS')}
              >
                <FileCode2 size={16} />
                <span>1. Clean Core CDS Entities</span>
                <span className="tab-pill">DDLS / MDE</span>
              </button>

              <button
                type="button"
                className={`studio-tab-btn ${activeStudioTab === 'BEHAVIOR' ? 'active' : ''}`}
                onClick={() => setActiveStudioTab('BEHAVIOR')}
              >
                <Code2 size={16} />
                <span>2. Defensive EML Class Pool</span>
                <span className="tab-pill">BDEF / CLAS</span>
              </button>

              <button
                type="button"
                className={`studio-tab-btn ${activeStudioTab === 'PREVIEW' ? 'active' : ''}`}
                onClick={() => setActiveStudioTab('PREVIEW')}
              >
                <Eye size={16} />
                <span>3. Watermarked Mock Preview</span>
                <span className="tab-pill-live">ODATA V4</span>
              </button>

              <button
                type="button"
                className={`studio-tab-btn ${activeStudioTab === 'HANDOVER' ? 'active' : ''}`}
                onClick={() => setActiveStudioTab('HANDOVER')}
              >
                <Package size={16} />
                <span>4. abapGit &amp; Eclipse ADT Handover</span>
                <span className="tab-pill">SOP / CTS</span>
              </button>
            </div>

            {/* Tab Body */}
            <div className="studio-tab-body">
              {activeStudioTab === 'CDS' && (
                <div>
                  <div className="studio-code-header">
                    <div className="file-indicator">
                      <span className="file-name">zc_purchaseorder.ddls.asddls</span>
                      <span className="file-tag">CDS PROJECTION VIEW</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span className="code-action-tag">Clean Core Tier 2 &bull; Value Help Bound</span>
                      <button
                        type="button"
                        className="btn-copy-snippet"
                        onClick={() => handleCopyCode(CDS_CODE)}
                      >
                        {copiedCode ? <Check size={13} color="#107E3E" /> : <Copy size={13} />}
                        <span>{copiedCode ? 'Copied' : 'Copy'}</span>
                      </button>
                    </div>
                  </div>
                  <div className="studio-code-preview">
                    <pre className="code-block">
                      <code>{CDS_CODE}</code>
                    </pre>
                  </div>
                </div>
              )}

              {activeStudioTab === 'BEHAVIOR' && (
                <div>
                  <div className="studio-code-header">
                    <div className="file-indicator">
                      <span className="file-name">bp_i_purchaseorder.clas.abap</span>
                      <span className="file-tag">LOCAL BEHAVIOR HANDLER</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span className="code-action-tag">Defensive EML &bull; %tky &bull; if_abap_behv_message</span>
                      <button
                        type="button"
                        className="btn-copy-snippet"
                        onClick={() => handleCopyCode(BEHAVIOR_CODE)}
                      >
                        {copiedCode ? <Check size={13} color="#107E3E" /> : <Copy size={13} />}
                        <span>{copiedCode ? 'Copied' : 'Copy'}</span>
                      </button>
                    </div>
                  </div>
                  <div className="studio-code-preview">
                    <pre className="code-block">
                      <code>{BEHAVIOR_CODE}</code>
                    </pre>
                  </div>
                </div>
              )}

              {activeStudioTab === 'PREVIEW' && (
                <div className="studio-preview-simulation">
                  <div className="mock-watermark-banner">
                    <Shield size={14} />
                    <span>LOCAL MOCK PREVIEW — SYNTHETIC DATA ONLY — NOT CONNECTED TO SAP S21</span>
                  </div>
                  <div className="mock-fiori-toolbar">
                    <span className="mock-toolbar-title">Purchase Orders (5 items)</span>
                    <div className="mock-toolbar-actions">
                      <span className="mock-btn-sm">Filter</span>
                      <span className="mock-btn-sm mock-btn-primary">Create Purchase Order</span>
                    </div>
                  </div>
                  <div className="mock-table-wrapper">
                    <table className="mock-table">
                      <thead>
                        <tr>
                          <th>PO Number</th>
                          <th>Company Code</th>
                          <th>Supplier</th>
                          <th>Total Amount</th>
                          <th>Currency</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td><strong>4500010001</strong></td>
                          <td>1000 (US Headquarters)</td>
                          <td>100001 (Acme Industrial)</td>
                          <td>$142,500.00</td>
                          <td>USD</td>
                          <td><span className="mock-badge-success">APPROVED</span></td>
                        </tr>
                        <tr>
                          <td><strong>4500010002</strong></td>
                          <td>1000 (US Headquarters)</td>
                          <td>100003 (Apex Logistics)</td>
                          <td>$28,400.00</td>
                          <td>USD</td>
                          <td><span className="mock-badge-draft">IN_PROCESS</span></td>
                        </tr>
                        <tr>
                          <td><strong>4500010003</strong></td>
                          <td>2000 (Europe Distribution)</td>
                          <td>100005 (Global Tech Corp)</td>
                          <td>€67,890.00</td>
                          <td>EUR</td>
                          <td><span className="mock-badge-pending">PENDING_REVIEW</span></td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {activeStudioTab === 'HANDOVER' && (
                <div className="studio-handover-grid">
                  <div className="handover-tree-col">
                    <div className="handover-tree-title">
                      <Package size={16} color="#0066FF" />
                      <span>abapGit Repository Package Structure</span>
                    </div>
                    <pre className="handover-tree-content">
{`📁 src/
├── 📄 .abapgit.xml (Repository Descriptor)
├── 📁 tables/
│   ├── zpo_hdr.tabl.sql
│   └── zpo_hdr_d.tabl.sql (Draft Table)
├── 📁 cds/
│   ├── zi_purchaseorder.ddls.asddls
│   └── zc_purchaseorder.ddls.asddls
├── 📁 annotations/
│   └── zc_purchaseorder.bdef.asddlxs
├── 📁 behavior/
│   └── zi_purchaseorder.bdef.asbds
├── 📁 behavior_classes/
│   └── bp_i_purchaseorder.clas.abap
└── 📁 services/
    ├── zui_purchaseorder.srvd.asrvds
    └── zui_purchaseorder_o4.srvb.json`}
                    </pre>
                  </div>

                  <div className="handover-guide-col">
                    <div className="guide-box-title">
                      <FileCheck size={16} color="#107E3E" />
                      <span>Developer Handover SOP Steps</span>
                    </div>
                    <ol className="handover-steps-list">
                      <li><strong>CTS Transport Assignment:</strong> Authorize developer Workbench Transport Request (`TRKORR`).</li>
                      <li><strong>Eclipse ADT Import:</strong> Import 17 artifacts via abapGit offline branch.</li>
                      <li><strong>Activation Order:</strong> DDIC Tables $\rightarrow$ CDS Interface $\rightarrow$ Projection $\rightarrow$ MDE $\rightarrow$ BDEF $\rightarrow$ Class Pool.</li>
                      <li><strong>Service Binding:</strong> Publish OData V4 UI service in transaction `/IWFND/V4_ADMIN`.</li>
                    </ol>
                  </div>
                </div>
              )}

              {/* Tab Footer */}
              <div className="studio-tab-footer">
                <div className="footer-bullet">
                  <CheckCircle2 size={16} color="#107E3E" />
                  <span>10-Domain Archetypes (MM, FI, SD, PP, PM, QM, WM, HCM, BASIS, Custom)</span>
                </div>
                <button
                  type="button"
                  className="btn-tab-action"
                  onClick={() => handleLaunchDemo('/generation-studio')}
                >
                  <span>Open Generation Studio</span>
                  <ArrowRight size={14} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ====================================================================
          6. STANDARD-FIRST MODERNIZATION PIPELINE
          ==================================================================== */}
      <section className="workflow-section" id="fit-gap">
        <div className="sandbox-container">
          <div className="section-intro">
            <span className="section-kicker">End-to-End Governance</span>
            <h2 className="section-headline">Standard-First Modernization Pipeline</h2>
            <p className="section-subheadline">
              A transparent, audit-ready workflow built to protect core ERP stability while accelerating user experience modernization.
            </p>
          </div>

          <div className="workflow-pipeline-flow">
            <div className="workflow-pipeline-step">
              <div className="pipeline-step-header">
                <span className="step-phase-pill">PHASE 01</span>
                <span className="step-phase-conn" />
              </div>
              <div className="step-icon-wrap">
                <SearchCode size={20} />
              </div>
              <h3 className="step-title">Transaction Discovery</h3>
              <p className="step-desc">
                Validates transaction existence, executable programs, screens and authorization requirements.
              </p>
            </div>

            <div className="workflow-pipeline-step">
              <div className="pipeline-step-header">
                <span className="step-phase-pill">PHASE 02</span>
                <span className="step-phase-conn" />
              </div>
              <div className="step-icon-wrap">
                <Database size={20} />
              </div>
              <h3 className="step-title">Fiori Matching</h3>
              <p className="step-desc">
                Correlates transactions against the official SAP Fiori Apps Reference Library and checks relevant service readiness.
              </p>
            </div>

            <div className="workflow-pipeline-step">
              <div className="pipeline-step-header">
                <span className="step-phase-pill">PHASE 03</span>
                <span className="step-phase-conn" />
              </div>
              <div className="step-icon-wrap">
                <ShieldCheck size={20} />
              </div>
              <h3 className="step-title">10-Dimension Fit-Gap</h3>
              <p className="step-desc">
                Evaluates functional requirements, field parity, mobile requirements, user exits and authorization considerations.
              </p>
            </div>

            <div className="workflow-pipeline-step step-highlight">
              <div className="pipeline-step-header">
                <span className="step-phase-pill pill-highlight">PHASE 04</span>
              </div>
              <div className="step-icon-wrap step-icon-highlight">
                <Code2 size={20} />
              </div>
              <h3 className="step-title">Clean Core RAP Build</h3>
              <p className="step-desc">
                Generates governed CDS entities, behavior definitions, EML implementation and Fiori Elements applications when custom development is justified.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ====================================================================
          7. ENTERPRISE CAPABILITIES
          ==================================================================== */}
      <section className="capabilities-section" id="discovery">
        <div className="section-intro">
          <span className="section-kicker">Engineered For Enterprise Scale</span>
          <h2 className="section-headline">Why Enterprise SAP Architects Choose FioriFy</h2>
        </div>

        <div className="capabilities-grid">
          <div className="capability-card">
            <div className="capability-icon-wrap">
              <ShieldCheck size={22} />
            </div>
            <h3 className="capability-title">Standard-First Enforcement</h3>
            <p className="capability-desc">
              Hard governance guardrails prevent development teams from reinventing standard SAP applications. Custom BUILD is only unlocked upon proven functional gaps.
            </p>
          </div>

          <div className="capability-card">
            <div className="capability-icon-wrap">
              <GitBranch size={22} />
            </div>
            <h3 className="capability-title">Clean Core Tier 2 Compliance</h3>
            <p className="capability-desc">
              All generated CDS and ABAP artifacts reference C1-released views (`I_CompanyCode`, `I_Supplier`, etc.) ensuring compatibility with future S/4HANA release upgrades.
            </p>
          </div>

          <div className="capability-card">
            <div className="capability-icon-wrap">
              <Lock size={22} />
            </div>
            <h3 className="capability-title">Zero Direct Mutation Safety</h3>
            <p className="capability-desc">
              No direct write operations to SAP backend repositories. Artifacts are delivered via abapGit XML packages for review and governed CTS Workbench Transport assignment.
            </p>
          </div>

          <div className="capability-card">
            <div className="capability-icon-wrap">
              <LayoutTemplate size={22} />
            </div>
            <h3 className="capability-title">Turnkey Fiori Elements</h3>
            <p className="capability-desc">
              Synthesizes responsive List Report and Object Page applications with live UI annotations, full OData V4 support, and multi-language i18n configurations.
            </p>
          </div>

          <div className="capability-card">
            <div className="capability-icon-wrap">
              <Terminal size={22} />
            </div>
            <h3 className="capability-title">Instant In-Process Preview</h3>
            <p className="capability-desc">
              Run and test generated applications in an isolated loopback mock OData V4 runtime with domain-aware synthetic records and balanced accounting debits/credits.
            </p>
          </div>

          <div className="capability-card">
            <div className="capability-icon-wrap">
              <Building2 size={22} />
            </div>
            <h3 className="capability-title">Multi-Tenant Governance</h3>
            <p className="capability-desc">
              Complete tenant isolation with cryptographic HMAC-SHA256 audit logging, immutable approval history, and role-based access control for Enterprise Architects.
            </p>
          </div>
        </div>
      </section>

      {/* ====================================================================
          8. FINAL CALL TO ACTION
          ==================================================================== */}
      <section className="cta-banner-section">
        <div className="cta-banner-card">
          <div>
            <span className="cta-kicker">Transform Your SAP Landscape Today</span>
            <h2 className="cta-title">Ready to Modernize Your SAP GUI Transactions?</h2>
            <p className="cta-desc">
              Accelerate your S/4HANA modernization, enforce Clean Core governance and deliver modern SAP Fiori applications.
            </p>
          </div>
          <div className="cta-actions">
            <button
              type="button"
              className="btn-cta-primary"
              onClick={() => handleLaunchDemo('/overview')}
            >
              <span>Launch Live Workspace</span>
              <ArrowRight size={16} />
            </button>
            <button
              type="button"
              className="btn-cta-secondary"
              onClick={() => handleLaunchDemo('/transaction-discovery')}
            >
              <span>Try T-Code Discovery</span>
            </button>
          </div>
        </div>
      </section>

      {/* ====================================================================
          9. ENTERPRISE FOOTER
          ==================================================================== */}
      <footer className="landing-footer">
        <div className="footer-left">
          <span className="footer-brand">FioriFy</span>
          <span>&bull;</span>
          <span>SAP Fiori Modernization Platform</span>
          <span className="footer-system-tag">SAP S/4HANA 2023 FPS01</span>
        </div>
        <div className="footer-right">
          <span>Standard-First Governance</span>
          <span>RAP Managed with Draft</span>
          <span>abapGit Ready</span>
        </div>
      </footer>
    </div>
  );
};
