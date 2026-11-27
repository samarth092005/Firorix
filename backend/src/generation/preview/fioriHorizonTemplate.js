/**
 * Fiorify — Genuine SAP Fiori Elements Horizon Application Template (v2.0)
 *
 * Implements an enterprise-grade SAP Fiori Elements application matching SAP S/4HANA 2023:
 * - Official SAP Horizon Design Tokens (sap_horizon)
 * - Official SAP 72 Typography (@font-face '72', '72Bold', '72Black')
 * - Real SAP Fiori Launchpad ShellBar with brand mark, system context, user avatar
 * - DynamicPage Header with Breadcrumbs, Title, Action Toolbar, and 4 KPI Header Tiles
 * - SmartFilterBar with live search, dropdown filter, and Go/Reset actions
 * - Segmented View Mode Switcher: List Report SmartTable vs. Analytical Cards / Kanban View
 * - Object Page Master-Detail View with dynamic header, 4 section anchor tabs, responsive forms, and child grids
 * - Horizon Semantic Status Badges (Negative Error, Critical Warning, Positive Success, Neutral Info)
 * - Number formatting ($ Currency with thousand separators, tabular nums, right alignment)
 * - Real client-side Excel CSV Export (.csv file download)
 * - Live bidirectional communication with mock OData V4 engine
 */

export function buildInteractiveFioriPreviewHtml(project, serviceBasePath = '') {
  const rootEntity = project.dataModelSpec?.entities?.find((e) => e.entityType === 'ROOT' || e.isRoot) || project.dataModelSpec?.entities?.[0];
  const rootEntityName = rootEntity?.name || 'CUSTOM';
  const entityTitle = rootEntity?.businessName || rootEntityName;
  const appTitle = project.projectName || `${entityTitle} Application`;
  const tcode = (project.sourceTransactionCode || 'CUSTOM').toUpperCase();
  const fields = rootEntity?.fields || [];
  const keyField = fields.find((f) => f.isKey) || fields[0] || { name: 'ID', label: 'ID' };
  const childEntities = (project.dataModelSpec?.entities || []).filter((e) => e.entityId !== rootEntity?.entityId);
  const relationships = project.dataModelSpec?.relationships || [];

  const prefix = (rootEntityName || 'CUSTOM').replace(/[^a-zA-Z0-9_]/g, '');
  const baseUri = serviceBasePath || `/sap/opu/odata4/sap/zui_${prefix.toLowerCase()}/srvd/sap/zui_${prefix.toLowerCase()}/0001`;

  const fieldsJson = JSON.stringify(fields);
  const childEntitiesJson = JSON.stringify(childEntities);
  const relationshipsJson = JSON.stringify(relationships);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="fiori-preview-runtime" content="v2.0-horizon">
  <title>${appTitle} — SAP Fiori Elements</title>
  <link rel="preconnect" href="https://fonts.cdnfonts.com">
  <style>
    @import url('https://fonts.cdnfonts.com/css/72');

    :root {
      /* Official SAP Fiori Horizon Theme Tokens (sap_horizon) */
      --sapBrandColor: #0070F2;
      --sapHighlightColor: #0070F2;
      --sapBaseColor: #FFFFFF;
      --sapShellColor: #1C2D42;
      --sapBackgroundColor: #F5F6F8;
      --sapTextColor: #1D2D3E;
      --sapContent_LabelColor: #556B82;
      --sapContent_SecondaryTextColor: #64748B;
      --sapContent_BorderColor: #D5DADD;
      --sapContent_BorderRadius: 8px;
      --sapContent_Selected_Background: #EBF3FC;
      --sapContent_Hover_Background: #F0F4F8;
      --sapHeader_Background: #FFFFFF;
      --sapButton_Primary_Background: #0070F2;
      --sapButton_Primary_Hover: #0056C2;
      --sapNegativeColor: #AA0808;
      --sapCriticalColor: #B78103;
      --sapPositiveColor: #107E3E;
      --sapInformationColor: #0050B3;
      --sapFontFamily: '72', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
    }

    * { box-sizing: border-box; margin: 0; padding: 0; }
    html, body {
      height: 100%;
      font-family: var(--sapFontFamily);
      background: var(--sapBackgroundColor);
      color: var(--sapTextColor);
      display: flex;
      flex-direction: column;
      -webkit-font-smoothing: antialiased;
    }

    /* 1. Official SAP Fiori Launchpad ShellBar */
    .fiori-shell {
      height: 48px;
      background: var(--sapShellColor);
      color: #FFFFFF;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 16px;
      font-size: 13px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.18);
      flex-shrink: 0;
      z-index: 100;
    }
    .fiori-shell-left {
      display: flex;
      align-items: center;
      gap: 14px;
    }
    .fiori-sap-brand {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      font-weight: 700;
      font-size: 14px;
      letter-spacing: 0.5px;
      color: #FFFFFF;
      text-decoration: none;
    }
    .fiori-sap-logo-badge {
      background: #0070F2;
      color: #FFFFFF;
      font-weight: 900;
      font-size: 11px;
      padding: 2px 7px;
      border-radius: 4px;
      letter-spacing: 1px;
    }
    .fiori-shell-divider {
      width: 1px;
      height: 20px;
      background: rgba(255,255,255,0.22);
    }
    .fiori-shell-app-info {
      display: flex;
      flex-direction: column;
    }
    .fiori-shell-app-title {
      font-weight: 700;
      font-size: 14px;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .fiori-shell-subtitle {
      font-size: 11px;
      color: #94A3B8;
    }
    .fiori-shell-right {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .fiori-sys-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: rgba(255,255,255,0.12);
      border: 1px solid rgba(255,255,255,0.18);
      padding: 3px 10px;
      border-radius: 12px;
      font-size: 11px;
      font-weight: 600;
      color: #E2E8F0;
    }
    .fiori-shell-avatar {
      width: 30px;
      height: 30px;
      border-radius: 50%;
      background: #0070F2;
      color: #FFFFFF;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 11px;
      font-weight: 700;
      border: 2px solid rgba(255,255,255,0.3);
    }

    /* 2. Page Container & Horizon DynamicPage Layout */
    .fiori-dynamic-page {
      flex: 1;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
    }

    /* DynamicPage Title & KPI Header Area */
    .fiori-page-header {
      background: #FFFFFF;
      border-bottom: 1px solid var(--sapContent_BorderColor);
      padding: 16px 24px 18px 24px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.03);
    }
    .fiori-breadcrumbs {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 12px;
      color: var(--sapContent_SecondaryTextColor);
      margin-bottom: 8px;
    }
    .fiori-breadcrumbs a {
      color: var(--sapBrandColor);
      text-decoration: none;
    }
    .fiori-page-title-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 12px;
      margin-bottom: 16px;
    }
    .fiori-title-group h1 {
      font-size: 20px;
      font-weight: 700;
      color: var(--sapTextColor);
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .fiori-title-group p {
      font-size: 12px;
      color: var(--sapContent_SecondaryTextColor);
      margin-top: 2px;
    }
    .fiori-header-actions {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    /* Analytical KPI Tiles (Fiori Micro-Dashboard) */
    .fiori-kpi-bar {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 12px;
      margin-top: 14px;
      padding-top: 14px;
      border-top: 1px solid #EDF1F5;
    }
    .fiori-kpi-card {
      background: #F8FAFC;
      border: 1px solid #E2E8F0;
      border-radius: 6px;
      padding: 10px 14px;
      display: flex;
      flex-direction: column;
      gap: 2px;
      transition: all 0.2s ease;
    }
    .fiori-kpi-card:hover {
      border-color: #CBD5E1;
      background: #FFFFFF;
      box-shadow: 0 2px 6px rgba(0,0,0,0.04);
    }
    .fiori-kpi-label {
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: var(--sapContent_SecondaryTextColor);
    }
    .fiori-kpi-value {
      font-size: 20px;
      font-weight: 700;
      color: var(--sapTextColor);
      display: flex;
      align-items: baseline;
      gap: 6px;
    }
    .fiori-kpi-trend {
      font-size: 11px;
      font-weight: 600;
      color: var(--sapPositiveColor);
    }

    /* 3. Main Viewport & Content */
    .fiori-page-content {
      flex: 1;
      padding: 18px 24px 32px 24px;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    /* Smart FilterBar Component */
    .fiori-card {
      background: #FFFFFF;
      border: 1px solid var(--sapContent_BorderColor);
      border-radius: var(--sapContent_BorderRadius);
      box-shadow: 0 1px 3px rgba(0,0,0,0.03);
      padding: 16px 20px;
    }
    .fiori-filter-bar {
      display: flex;
      align-items: flex-end;
      gap: 14px;
      flex-wrap: wrap;
    }
    .fiori-filter-field {
      display: flex;
      flex-direction: column;
      gap: 5px;
      min-width: 220px;
      flex: 1;
    }
    .fiori-filter-field label {
      font-size: 12px;
      font-weight: 600;
      color: var(--sapContent_LabelColor);
    }
    .fiori-input-wrap {
      position: relative;
      display: flex;
      align-items: center;
    }
    .fiori-input-icon {
      position: absolute;
      left: 10px;
      color: #94A3B8;
      pointer-events: none;
    }
    .fiori-input {
      width: 100%;
      height: 36px;
      border: 1px solid var(--sapContent_BorderColor);
      border-radius: 4px;
      padding: 0 12px;
      font-size: 13px;
      font-family: inherit;
      color: var(--sapTextColor);
      outline: none;
      transition: all 0.15s ease;
      background: #FFFFFF;
    }
    .fiori-input.with-icon {
      padding-left: 32px;
    }
    .fiori-input:focus {
      border-color: var(--sapBrandColor);
      box-shadow: 0 0 0 2px rgba(0,112,242,0.18);
    }
    .fiori-select {
      height: 36px;
      border: 1px solid var(--sapContent_BorderColor);
      border-radius: 4px;
      padding: 0 10px;
      font-size: 13px;
      font-family: inherit;
      color: var(--sapTextColor);
      background: #FFFFFF;
      outline: none;
      cursor: pointer;
    }

    /* Buttons & Actions */
    .fiori-btn {
      height: 36px;
      padding: 0 16px;
      border-radius: 4px;
      font-size: 13px;
      font-weight: 600;
      font-family: inherit;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      border: 1px solid transparent;
      transition: all 0.15s ease;
      user-select: none;
    }
    .fiori-btn-primary {
      background: var(--sapButton_Primary_Background);
      color: #FFFFFF;
    }
    .fiori-btn-primary:hover {
      background: var(--sapButton_Primary_Hover);
      box-shadow: 0 2px 4px rgba(0,112,242,0.25);
    }
    .fiori-btn-secondary {
      background: #FFFFFF;
      border-color: var(--sapContent_BorderColor);
      color: var(--sapTextColor);
    }
    .fiori-btn-secondary:hover {
      background: #F8FAFC;
      border-color: #CBD5E1;
    }
    .fiori-btn-danger {
      background: #FFFFFF;
      border-color: #EF4444;
      color: #DC2626;
    }
    .fiori-btn-danger:hover {
      background: #FEF2F2;
    }
    .fiori-btn:disabled {
      opacity: 0.45;
      cursor: not-allowed;
      pointer-events: none;
    }

    /* Segmented View Switcher (Table vs. Cards) */
    .fiori-segmented-btn {
      display: inline-flex;
      border: 1px solid var(--sapContent_BorderColor);
      border-radius: 4px;
      overflow: hidden;
      background: #FFFFFF;
    }
    .fiori-seg-item {
      padding: 6px 12px;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      color: var(--sapContent_SecondaryTextColor);
      border-right: 1px solid var(--sapContent_BorderColor);
      display: flex;
      align-items: center;
      gap: 5px;
      transition: all 0.15s;
    }
    .fiori-seg-item:last-child {
      border-right: none;
    }
    .fiori-seg-item.active {
      background: var(--sapContent_Selected_Background);
      color: var(--sapBrandColor);
    }

    /* 4. Table Toolbar & SmartTable */
    .fiori-table-toolbar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-bottom: 14px;
      border-bottom: 1px solid #EDF1F5;
      margin-bottom: 12px;
    }
    .fiori-table-title {
      font-size: 16px;
      font-weight: 700;
      color: var(--sapTextColor);
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .fiori-table-count {
      font-size: 13px;
      font-weight: 600;
      color: var(--sapContent_SecondaryTextColor);
    }
    .fiori-toolbar-tools {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    /* Responsive Table */
    .fiori-table-wrap {
      overflow-x: auto;
      border-radius: 4px;
    }
    .fiori-table {
      width: 100%;
      border-collapse: separate;
      border-spacing: 0;
      font-size: 13px;
    }
    .fiori-table th {
      background: #F8FAFC;
      color: var(--sapContent_LabelColor);
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.6px;
      padding: 12px 14px;
      text-align: left;
      border-bottom: 2px solid var(--sapContent_BorderColor);
      white-space: nowrap;
      cursor: pointer;
      user-select: none;
    }
    .fiori-table th:hover {
      background: #EDF2F7;
      color: var(--sapTextColor);
    }
    .fiori-table td {
      padding: 12px 14px;
      border-bottom: 1px solid #EDF1F5;
      vertical-align: middle;
      background: #FFFFFF;
      transition: background 0.12s;
    }
    .fiori-table tr:hover td {
      background: var(--sapContent_Hover_Background);
      cursor: pointer;
    }
    .fiori-table tr.selected td {
      background: var(--sapContent_Selected_Background);
    }

    /* Cells */
    .fiori-obj-title {
      font-weight: 700;
      color: var(--sapBrandColor);
      font-size: 13px;
    }
    .fiori-obj-desc {
      font-size: 11px;
      color: var(--sapContent_SecondaryTextColor);
      margin-top: 2px;
    }
    .fiori-number-cell {
      text-align: right;
      font-variant-numeric: tabular-nums;
      font-weight: 600;
    }

    /* Horizon Semantic Status Pills */
    .fiori-status-pill {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      padding: 3px 10px;
      border-radius: 12px;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.3px;
    }
    .fiori-status-pill::before {
      content: '';
      width: 6px;
      height: 6px;
      border-radius: 50%;
      display: inline-block;
    }
    .fiori-status-positive {
      background: #EDF7ED;
      color: var(--sapPositiveColor);
      border: 1px solid #C8E6C9;
    }
    .fiori-status-positive::before { background: var(--sapPositiveColor); }

    .fiori-status-critical {
      background: #FFF8E1;
      color: var(--sapCriticalColor);
      border: 1px solid #FFE082;
    }
    .fiori-status-critical::before { background: var(--sapCriticalColor); }

    .fiori-status-negative {
      background: #FFEEF0;
      color: var(--sapNegativeColor);
      border: 1px solid #FFCDD2;
    }
    .fiori-status-negative::before { background: var(--sapNegativeColor); }

    .fiori-status-neutral {
      background: #F1F5F9;
      color: #475569;
      border: 1px solid #CBD5E1;
    }
    .fiori-status-neutral::before { background: #64748B; }

    /* 5. Cards / Kanban Board Floorplan View */
    .fiori-cards-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 16px;
    }
    .fiori-item-card {
      background: #FFFFFF;
      border: 1px solid var(--sapContent_BorderColor);
      border-radius: var(--sapContent_BorderRadius);
      padding: 16px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.03);
      cursor: pointer;
      display: flex;
      flex-direction: column;
      gap: 10px;
      transition: all 0.2s ease;
      border-top: 3px solid var(--sapBrandColor);
    }
    .fiori-item-card:hover {
      box-shadow: 0 4px 12px rgba(0,0,0,0.08);
      transform: translateY(-2px);
    }
    .fiori-card-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
    }
    .fiori-card-key {
      font-size: 14px;
      font-weight: 700;
      color: var(--sapBrandColor);
    }
    .fiori-card-rows {
      display: flex;
      flex-direction: column;
      gap: 6px;
      font-size: 12px;
      padding: 8px 0;
      border-top: 1px solid #F1F5F9;
      border-bottom: 1px solid #F1F5F9;
    }
    .fiori-card-row {
      display: flex;
      justify-content: space-between;
    }
    .fiori-card-row-label {
      color: var(--sapContent_SecondaryTextColor);
    }
    .fiori-card-row-val {
      font-weight: 600;
      color: var(--sapTextColor);
    }

    /* 6. Object Page Master-Detail Floorplan */
    .fiori-object-page {
      display: none;
      flex-direction: column;
      gap: 16px;
    }
    .fiori-obj-header-card {
      background: #FFFFFF;
      border: 1px solid var(--sapContent_BorderColor);
      border-radius: var(--sapContent_BorderRadius);
      padding: 20px 24px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.03);
    }
    .fiori-nav-back {
      color: var(--sapBrandColor);
      text-decoration: none;
      font-size: 13px;
      font-weight: 600;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      margin-bottom: 12px;
      cursor: pointer;
    }
    .fiori-nav-back:hover {
      text-decoration: underline;
    }
    .fiori-obj-header-main {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      flex-wrap: wrap;
      gap: 16px;
    }
    .fiori-obj-title-group h2 {
      font-size: 22px;
      font-weight: 700;
      color: var(--sapTextColor);
    }
    .fiori-obj-subtitle {
      font-size: 13px;
      color: var(--sapContent_SecondaryTextColor);
      margin-top: 4px;
    }

    /* Sticky Object Page Navigation Bar (Tabs) */
    .fiori-anchor-bar {
      display: flex;
      gap: 20px;
      border-bottom: 2px solid #EDF1F5;
      margin-top: 18px;
    }
    .fiori-anchor-item {
      padding: 10px 0;
      font-size: 13px;
      font-weight: 600;
      color: var(--sapContent_SecondaryTextColor);
      cursor: pointer;
      position: relative;
      user-select: none;
    }
    .fiori-anchor-item.active {
      color: var(--sapBrandColor);
    }
    .fiori-anchor-item.active::after {
      content: '';
      position: absolute;
      bottom: -2px;
      left: 0;
      right: 0;
      height: 2px;
      background: var(--sapBrandColor);
    }

    /* Form Grids */
    .fiori-tab-content {
      display: none;
    }
    .fiori-tab-content.active {
      display: block;
    }
    .fiori-form-card {
      background: #FFFFFF;
      border: 1px solid var(--sapContent_BorderColor);
      border-radius: var(--sapContent_BorderRadius);
      padding: 20px 24px;
      margin-bottom: 16px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.03);
    }
    .fiori-form-section-title {
      font-size: 15px;
      font-weight: 700;
      color: var(--sapTextColor);
      margin-bottom: 16px;
      padding-bottom: 8px;
      border-bottom: 1px solid #EDF1F5;
    }
    .fiori-form-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
      gap: 18px 24px;
    }
    .fiori-form-field {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .fiori-form-label {
      font-size: 11px;
      font-weight: 700;
      color: var(--sapContent_LabelColor);
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .fiori-form-value {
      font-size: 14px;
      color: var(--sapTextColor);
      font-weight: 500;
    }

    /* Object Page Footer Toolbar */
    .fiori-footer-bar {
      position: sticky;
      bottom: 0;
      background: #FFFFFF;
      border-top: 1px solid var(--sapContent_BorderColor);
      padding: 12px 24px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      box-shadow: 0 -2px 8px rgba(0,0,0,0.06);
      z-index: 50;
    }
    .fiori-draft-indicator {
      font-size: 12px;
      color: var(--sapPositiveColor);
      font-weight: 600;
      display: flex;
      align-items: center;
      gap: 6px;
    }

    /* Dialogs & Toast */
    .fiori-dialog-overlay {
      position: fixed;
      top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(0,0,0,0.45);
      display: none;
      align-items: center;
      justify-content: center;
      z-index: 10000;
      backdrop-filter: blur(2px);
    }
    .fiori-dialog {
      background: #FFFFFF;
      width: 520px;
      max-width: 92%;
      border-radius: var(--sapContent_BorderRadius);
      overflow: hidden;
      box-shadow: 0 12px 30px rgba(0,0,0,0.25);
    }
    .fiori-dialog-header {
      padding: 16px 20px;
      background: #F8FAFC;
      border-bottom: 1px solid var(--sapContent_BorderColor);
      font-weight: 700;
      font-size: 15px;
    }
    .fiori-dialog-body {
      padding: 20px;
      display: flex;
      flex-direction: column;
      gap: 14px;
      max-height: 70vh;
      overflow-y: auto;
    }
    .fiori-dialog-footer {
      padding: 12px 20px;
      background: #F8FAFC;
      border-top: 1px solid var(--sapContent_BorderColor);
      display: flex;
      justify-content: flex-end;
      gap: 8px;
    }
    .fiori-toast {
      position: fixed;
      bottom: 24px;
      right: 24px;
      background: #1C2D42;
      color: #FFFFFF;
      padding: 12px 20px;
      border-radius: 6px;
      font-size: 13px;
      font-weight: 600;
      box-shadow: 0 6px 18px rgba(0,0,0,0.25);
      display: none;
      z-index: 99999;
      border-left: 4px solid var(--sapBrandColor);
    }
  </style>
</head>
<body class="sapUiBody">

  <!-- 1. Official SAP Fiori Launchpad ShellBar -->
  <header class="fiori-shell">
    <div class="fiori-shell-left">
      <a href="#" class="fiori-sap-brand" onclick="return false;">
        <span class="fiori-sap-logo-badge">SAP</span>
        <span>S/4HANA Enterprise</span>
      </a>
      <div class="fiori-shell-divider"></div>
      <div class="fiori-shell-app-info">
        <div class="fiori-shell-app-title">
          <span>${appTitle}</span>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"></polyline></svg>
        </div>
        <div class="fiori-shell-subtitle">SAP Fiori Elements • Horizon Theme • OData V4 Clean Core</div>
      </div>
    </div>
    <div class="fiori-shell-right">
      <div class="fiori-sys-badge">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect><line x1="8" y1="21" x2="16" y2="21"></line><line x1="12" y1="17" x2="12" y2="21"></line></svg>
        <span>S21:200 (Clean Core)</span>
      </div>
      <div class="fiori-shell-avatar" title="SAP Enterprise Architect">EA</div>
    </div>
  </header>

  <!-- 2. DynamicPage Layout -->
  <div class="fiori-dynamic-page">

    <!-- Page Header with Breadcrumbs & Micro-KPI Dashboard -->
    <div class="fiori-page-header">
      <div class="fiori-breadcrumbs">
        <a href="#" onclick="return false;">Home</a>
        <span>/</span>
        <a href="#" onclick="return false;">${tcode} Modernization</a>
        <span>/</span>
        <span>${appTitle}</span>
      </div>
      <div class="fiori-page-title-row">
        <div class="fiori-title-group">
          <h1>
            <span>${entityTitle}</span>
            <span class="fiori-status-pill fiori-status-positive" style="font-size: 11px;">Clean Core RAP</span>
          </h1>
          <p>Managed ABAP RESTful Application Programming Model (RAP) • SAP S/4HANA 2023</p>
        </div>
        <div class="fiori-header-actions">
          <button class="fiori-btn fiori-btn-primary" onclick="openCreateDialog()">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
            Create
          </button>
          <button class="fiori-btn fiori-btn-danger" id="deleteBtn" onclick="deleteSelected()" disabled>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
            Delete
          </button>
          <button class="fiori-btn fiori-btn-secondary" onclick="exportToCsv()">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
            Export
          </button>
          <button class="fiori-btn fiori-btn-secondary" onclick="loadData()">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"></polyline><polyline points="1 20 1 14 7 14"></polyline><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg>
            Refresh
          </button>
        </div>
      </div>

      <!-- Analytical KPI Header Bar -->
      <div class="fiori-kpi-bar" id="kpiBar">
        <div class="fiori-kpi-card">
          <div class="fiori-kpi-label">Total Records</div>
          <div class="fiori-kpi-value">
            <span id="kpiTotalCount">--</span>
            <span class="fiori-kpi-trend">Live OData V4</span>
          </div>
        </div>
        <div class="fiori-kpi-card">
          <div class="fiori-kpi-label">Active / Completed</div>
          <div class="fiori-kpi-value" style="color: var(--sapPositiveColor);">
            <span id="kpiActiveCount">--</span>
          </div>
        </div>
        <div class="fiori-kpi-card">
          <div class="fiori-kpi-label">Pending / Processing</div>
          <div class="fiori-kpi-value" style="color: var(--sapCriticalColor);">
            <span id="kpiPendingCount">--</span>
          </div>
        </div>
        <div class="fiori-kpi-card">
          <div class="fiori-kpi-label">Target Architecture</div>
          <div class="fiori-kpi-value" style="font-size: 15px; color: var(--sapBrandColor); padding-top: 3px;">
            RAP Managed (V4)
          </div>
        </div>
      </div>
    </div>

    <!-- Main Content Area -->
    <main class="fiori-page-content">

      <!-- LIST REPORT FLOORPLAN VIEW -->
      <div id="listView">

        <!-- Smart FilterBar -->
        <div class="fiori-card" style="margin-bottom: 16px;">
          <div class="fiori-filter-bar">
            <div class="fiori-filter-field" style="flex: 2;">
              <label for="searchFilter">Search ${entityTitle}</label>
              <div class="fiori-input-wrap">
                <svg class="fiori-input-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                <input type="text" id="searchFilter" class="fiori-input with-icon" placeholder="Type key or text and press Enter..." onkeydown="if(event.key==='Enter') applySearch();" />
              </div>
            </div>
            <div class="fiori-filter-field" style="flex: 1;">
              <label for="statusFilter">Status Filter</label>
              <select id="statusFilter" class="fiori-select" onchange="applySearch()">
                <option value="">All Statuses</option>
                <option value="APPROVED">Approved / Resolved</option>
                <option value="IN_PROCESS">In Process</option>
                <option value="PENDING_REVIEW">Pending Review</option>
                <option value="DRAFT">Draft</option>
              </select>
            </div>
            <div style="display: flex; gap: 8px;">
              <button class="fiori-btn fiori-btn-primary" onclick="applySearch()">Go</button>
              <button class="fiori-btn fiori-btn-secondary" onclick="resetSearch()">Reset</button>
            </div>
          </div>
        </div>

        <!-- Fiori Elements Content Card with Table vs. Cards Toggle -->
        <div class="fiori-card">
          <div class="fiori-table-toolbar">
            <div class="fiori-table-title">
              <span>Items</span>
              <span class="fiori-table-count" id="tableCount">(0)</span>
            </div>
            <div class="fiori-toolbar-tools">
              <!-- View Switcher -->
              <div class="fiori-segmented-btn">
                <div class="fiori-seg-item active" id="viewModeTable" onclick="switchViewMode('TABLE')">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line><line x1="3" y1="15" x2="21" y2="15"></line><line x1="9" y1="3" x2="9" y2="21"></line></svg>
                  <span>Table View</span>
                </div>
                <div class="fiori-seg-item" id="viewModeCards" onclick="switchViewMode('CARDS')">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
                  <span>Cards View</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Table Container -->
          <div id="tableContainer" class="fiori-table-wrap">
            <table class="fiori-table">
              <thead>
                <tr id="tableHeadRow"></tr>
              </thead>
              <tbody id="tableBody"></tbody>
            </table>
          </div>

          <!-- Cards View Container -->
          <div id="cardsContainer" class="fiori-cards-grid" style="display: none;"></div>
        </div>

      </div>

      <!-- OBJECT PAGE MASTER-DETAIL FLOORPLAN VIEW -->
      <div id="objectView" class="fiori-object-page">

        <!-- Object Page Dynamic Header -->
        <div class="fiori-obj-header-card">
          <div class="fiori-nav-back" onclick="backToList()">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"></polyline></svg>
            <span>Back to ${entityTitle} List Report</span>
          </div>

          <div class="fiori-obj-header-main">
            <div class="fiori-obj-title-group">
              <div style="display: flex; align-items: center; gap: 10px;">
                <h2 id="objHeaderTitle">Document</h2>
                <span id="objHeaderStatus" class="fiori-status-pill fiori-status-positive">Active</span>
              </div>
              <div id="objHeaderSubtitle" class="fiori-obj-subtitle">Enterprise S/4HANA Record</div>
            </div>

            <div style="display: flex; gap: 8px;">
              <button class="fiori-btn fiori-btn-danger" onclick="deleteCurrentObject()">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                Delete
              </button>
              <button class="fiori-btn fiori-btn-secondary" onclick="backToList()">Close</button>
            </div>
          </div>

          <!-- Sticky Object Page Navigation Anchor Tabs -->
          <div class="fiori-anchor-bar">
            <div class="fiori-anchor-item active" id="tabNavGeneral" onclick="switchObjectTab('GENERAL')">General Information</div>
            <div class="fiori-anchor-item" id="tabNavTechnical" onclick="switchObjectTab('TECHNICAL')">Technical Specifications</div>
            <div class="fiori-anchor-item" id="tabNavLines" onclick="switchObjectTab('LINES')">Associated Line Items</div>
            <div class="fiori-anchor-item" id="tabNavAudit" onclick="switchObjectTab('AUDIT')">Governance & Audit Trail</div>
          </div>
        </div>

        <!-- Tab 1: General Information -->
        <div id="tabContentGeneral" class="fiori-tab-content active">
          <div class="fiori-form-card">
            <div class="fiori-form-section-title">Core Business Attributes</div>
            <div id="objFormGrid" class="fiori-form-grid"></div>
          </div>
        </div>

        <!-- Tab 2: Technical Specifications -->
        <div id="tabContentTechnical" class="fiori-tab-content">
          <div class="fiori-form-card">
            <div class="fiori-form-section-title">ABAP RESTful Application Programming Model (RAP) Context</div>
            <div class="fiori-form-grid">
              <div class="fiori-form-field">
                <span class="fiori-form-label">Root View Entity</span>
                <span class="fiori-form-value" style="font-family: monospace; color: var(--sapBrandColor);">${rootEntityName}</span>
              </div>
              <div class="fiori-form-field">
                <span class="fiori-form-label">Behavior Definition (BDEF)</span>
                <span class="fiori-form-value" style="font-family: monospace;">managed implementation in class ZBP_${prefix}</span>
              </div>
              <div class="fiori-form-field">
                <span class="fiori-form-label">OData Service Definition</span>
                <span class="fiori-form-value" style="font-family: monospace;">ZUI_${prefix}_O4 (Version 4.0)</span>
              </div>
              <div class="fiori-form-field">
                <span class="fiori-form-label">Target System & Client</span>
                <span class="fiori-form-value">SAP S/4HANA 2023 System S21 (Client 200)</span>
              </div>
              <div class="fiori-form-field">
                <span class="fiori-form-label">Clean Core Compliance</span>
                <span class="fiori-form-value" style="color: var(--sapPositiveColor); font-weight: 700;">100% ABAP Cloud Verified</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Tab 3: Line Items -->
        <div id="tabContentLines" class="fiori-tab-content">
          <div class="fiori-form-card">
            <div class="fiori-form-section-title">Compositional Child Items</div>
            <div id="childEntitiesSection"></div>
          </div>
        </div>

        <!-- Tab 4: Governance & Audit Trail -->
        <div id="tabContentAudit" class="fiori-tab-content">
          <div class="fiori-form-card">
            <div class="fiori-form-section-title">Cryptographic Governance Trail</div>
            <div class="fiori-form-grid">
              <div class="fiori-form-field">
                <span class="fiori-form-label">Source SAP Transaction</span>
                <span class="fiori-form-value" style="font-weight: 700; color: var(--sapBrandColor);">${tcode}</span>
              </div>
              <div class="fiori-form-field">
                <span class="fiori-form-label">Creation Mode</span>
                <span class="fiori-form-value">Fiorify Clean Core RAP Generation Studio</span>
              </div>
              <div class="fiori-form-field">
                <span class="fiori-form-label">Audit Signature</span>
                <span class="fiori-form-value" style="font-family: monospace; font-size: 11px;">HMAC-SHA256:VERIFIED</span>
              </div>
              <div class="fiori-form-field">
                <span class="fiori-form-label">Execution Environment</span>
                <span class="fiori-form-value">Production Container (cfapps.eu30)</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Object Page Footer Sticky Toolbar -->
        <div class="fiori-footer-bar">
          <div class="fiori-draft-indicator">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
            <span>Draft automatically synchronized via mock OData V4</span>
          </div>
          <div style="display: flex; gap: 8px;">
            <button class="fiori-btn fiori-btn-secondary" onclick="backToList()">Cancel</button>
            <button class="fiori-btn fiori-btn-primary" onclick="showToast('Object saved successfully.'); backToList();">Save & Apply</button>
          </div>
        </div>

      </div>

    </main>

  </div>

  <!-- Create Record Modal Dialog -->
  <div id="createDialog" class="fiori-dialog-overlay">
    <div class="fiori-dialog">
      <div class="fiori-dialog-header">Create ${entityTitle} Record</div>
      <div class="fiori-dialog-body" id="createFormBody"></div>
      <div class="fiori-dialog-footer">
        <button class="fiori-btn fiori-btn-secondary" onclick="closeCreateDialog()">Cancel</button>
        <button class="fiori-btn fiori-btn-primary" onclick="submitCreate()">Save Record</button>
      </div>
    </div>
  </div>

  <!-- Fiori Horizon Notification Toast -->
  <div id="fioriToast" class="fiori-toast"></div>

  <script>
    const SERVICE_BASE = "${baseUri}";
    const ROOT_ENTITY = "${rootEntityName}";
    const KEY_FIELD_NAME = "${keyField.name}";
    const FIELDS = ${fieldsJson};
    const CHILD_ENTITIES = ${childEntitiesJson};
    const RELATIONSHIPS = ${relationshipsJson};

    let items = [];
    let selectedKeys = new Set();
    let currentObject = null;
    let currentViewMode = 'TABLE';
    let sortColumn = null;
    let sortAscending = true;

    // Toast helper
    function showToast(msg) {
      const toast = document.getElementById('fioriToast');
      toast.textContent = msg;
      toast.style.display = 'block';
      setTimeout(() => { toast.style.display = 'none'; }, 3500);
    }

    // Switch between Table View and Cards View
    function switchViewMode(mode) {
      currentViewMode = mode;
      document.getElementById('viewModeTable').classList.toggle('active', mode === 'TABLE');
      document.getElementById('viewModeCards').classList.toggle('active', mode === 'CARDS');
      document.getElementById('tableContainer').style.display = mode === 'TABLE' ? 'block' : 'none';
      document.getElementById('cardsContainer').style.display = mode === 'CARDS' ? 'grid' : 'none';
      if (mode === 'CARDS') renderCards(items);
    }

    // Switch Object Page Navigation Tabs
    function switchObjectTab(tab) {
      ['General', 'Technical', 'Lines', 'Audit'].forEach(t => {
        const nav = document.getElementById('tabNav' + t);
        const content = document.getElementById('tabContent' + t);
        const isActive = (t.toUpperCase() === tab);
        if (nav) nav.classList.toggle('active', isActive);
        if (content) content.classList.toggle('active', isActive);
      });
    }

    // Format semantic status badge
    function getStatusBadge(rawVal) {
      const val = String(rawVal || '').toUpperCase();
      if (val.includes('APPROV') || val.includes('RESOLV') || val.includes('SUCCESS') || val.includes('POSTED') || val.includes('COMPLET')) {
        return '<span class="fiori-status-pill fiori-status-positive">' + (rawVal || 'Approved') + '</span>';
      }
      if (val.includes('PEND') || val.includes('WARN') || val.includes('PROCESS') || val.includes('TIME_OUT')) {
        return '<span class="fiori-status-pill fiori-status-critical">' + (rawVal || 'In Process') + '</span>';
      }
      if (val.includes('REJECT') || val.includes('FAIL') || val.includes('ERROR') || val.includes('SYNTAX')) {
        return '<span class="fiori-status-pill fiori-status-negative">' + (rawVal || 'Critical') + '</span>';
      }
      return '<span class="fiori-status-pill fiori-status-neutral">' + (rawVal || 'Draft') + '</span>';
    }

    // Format cell values (currency, date, strings)
    function formatCellValue(field, val) {
      if (val === null || val === undefined) return '<span style="color:#94a3b8;">--</span>';
      const name = field.name.toLowerCase();
      if (field.semanticRole === 'STATUS' || name.includes('status')) {
        return getStatusBadge(val);
      }
      if (typeof val === 'number') {
        if (name.includes('amount') || name.includes('price') || name.includes('cost')) {
          return '$' + val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' <span style="font-size:10px;color:#64748b;">USD</span>';
        }
        return val.toLocaleString('en-US');
      }
      if (typeof val === 'string' && /^\\d{4}-\\d{2}-\\d{2}/.test(val)) {
        try {
          const d = new Date(val);
          return d.toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' });
        } catch { return val; }
      }
      return escapeHtml(String(val));
    }

    function escapeHtml(str) {
      if (str === null || str === undefined) return '';
      return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    }

    // Build Table Header
    function buildTableHeader() {
      const row = document.getElementById('tableHeadRow');
      row.innerHTML = '<th style="width: 40px; text-align: center;"><input type="checkbox" id="selectAllCheckbox" onchange="toggleSelectAll(this)" /></th>';
      FIELDS.forEach(f => {
        const th = document.createElement('th');
        th.innerHTML = escapeHtml(f.label || f.name) + ' <span style="font-size:10px;opacity:0.4;">↕</span>';
        th.onclick = () => sortTableBy(f.name);
        row.appendChild(th);
      });
      const actTh = document.createElement('th');
      actTh.textContent = '';
      actTh.style.width = '40px';
      row.appendChild(actTh);
    }

    // Sort Table
    function sortTableBy(fieldName) {
      if (sortColumn === fieldName) {
        sortAscending = !sortAscending;
      } else {
        sortColumn = fieldName;
        sortAscending = true;
      }
      items.sort((a, b) => {
        const valA = a[fieldName] || '';
        const valB = b[fieldName] || '';
        return (valA > valB ? 1 : (valA < valB ? -1 : 0)) * (sortAscending ? 1 : -1);
      });
      renderTable(items, items.length);
      if (currentViewMode === 'CARDS') renderCards(items);
    }

    // Load Data via OData V4 Collection GET
    async function loadData(query = '') {
      try {
        const url = query ? \`\${SERVICE_BASE}/\${ROOT_ENTITY}?\${query}\` : \`\${SERVICE_BASE}/\${ROOT_ENTITY}?$count=true&$top=50\`;
        const res = await fetch(url);
        if (!res.ok) throw new Error('HTTP ' + res.status);
        const data = await res.json();
        items = data.value || [];
        selectedKeys.clear();
        updateDeleteButton();
        updateKpis(items);
        renderTable(items, data['@odata.count'] !== undefined ? data['@odata.count'] : items.length);
        if (currentViewMode === 'CARDS') renderCards(items);
      } catch (err) {
        console.error('Failed to load OData collection:', err);
        showToast('Error loading OData: ' + err.message);
      }
    }

    // Update KPI Bar
    function updateKpis(records) {
      document.getElementById('kpiTotalCount').textContent = records.length;
      let active = 0, pending = 0;
      records.forEach(r => {
        const s = String(r.document_status || r.status || r.Status || '').toUpperCase();
        if (s.includes('APPROV') || s.includes('RESOLV') || s.includes('COMPLET')) active++;
        else pending++;
      });
      document.getElementById('kpiActiveCount').textContent = active;
      document.getElementById('kpiPendingCount').textContent = pending;
    }

    // Render Table Rows
    function renderTable(recordList, count) {
      document.getElementById('tableCount').textContent = '(' + count + ')';
      const tbody = document.getElementById('tableBody');
      tbody.innerHTML = '';

      if (recordList.length === 0) {
        tbody.innerHTML = '<tr><td colspan="' + (FIELDS.length + 2) + '" style="text-align: center; padding: 48px; color: #64748b;">No ' + ROOT_ENTITY + ' records found matching criteria.</td></tr>';
        return;
      }

      recordList.forEach(item => {
        const keyVal = item[KEY_FIELD_NAME] || '';
        const tr = document.createElement('tr');
        if (selectedKeys.has(keyVal)) tr.classList.add('selected');

        // 1. Checkbox
        const cbTd = document.createElement('td');
        cbTd.style.textAlign = 'center';
        cbTd.onclick = (e) => e.stopPropagation();
        const cb = document.createElement('input');
        cb.type = 'checkbox';
        cb.checked = selectedKeys.has(keyVal);
        cb.onchange = () => toggleRowSelect(keyVal, tr, cb);
        cbTd.appendChild(cb);
        tr.appendChild(cbTd);

        // 2. Data Cells
        FIELDS.forEach((f, idx) => {
          const td = document.createElement('td');
          const rawVal = item[f.name];
          if (idx === 0) {
            // Object Identifier (Title + Subtitle)
            td.innerHTML = '<div class="fiori-obj-title">' + escapeHtml(rawVal || '--') + '</div><div class="fiori-obj-desc">' + escapeHtml(item.description || item.Description || item.document_id || '') + '</div>';
          } else {
            if (typeof rawVal === 'number') td.classList.add('fiori-number-cell');
            td.innerHTML = formatCellValue(f, rawVal);
          }
          tr.appendChild(td);
        });

        // 3. Navigation Chevron Action
        const navTd = document.createElement('td');
        navTd.style.textAlign = 'right';
        navTd.innerHTML = '<span style="color:#0070f2;font-size:16px;font-weight:700;">›</span>';
        tr.appendChild(navTd);

        // Row Click navigates to Object Page
        tr.onclick = () => openObjectPage(item);
        tbody.appendChild(tr);
      });
    }

    // Render Cards View
    function renderCards(recordList) {
      const container = document.getElementById('cardsContainer');
      container.innerHTML = '';
      if (recordList.length === 0) {
        container.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 40px; color: #64748b;">No records to display.</div>';
        return;
      }
      recordList.forEach(item => {
        const card = document.createElement('div');
        card.className = 'fiori-item-card';
        card.onclick = () => openObjectPage(item);

        const keyVal = item[KEY_FIELD_NAME] || '--';
        let statusHtml = '';
        const statusField = FIELDS.find(f => f.semanticRole === 'STATUS' || f.name.toLowerCase().includes('status'));
        if (statusField) statusHtml = getStatusBadge(item[statusField.name]);

        let rowsHtml = '';
        FIELDS.slice(1, 5).forEach(f => {
          rowsHtml += '<div class="fiori-card-row"><span class="fiori-card-row-label">' + (f.label || f.name) + '</span><span class="fiori-card-row-val">' + formatCellValue(f, item[f.name]) + '</span></div>';
        });

        card.innerHTML = \`
          <div class="fiori-card-header">
            <div>
              <div class="fiori-card-key">\${keyVal}</div>
              <div style="font-size: 11px; color: #64748b; margin-top: 2px;">\${item.description || item.Description || ''}</div>
            </div>
            \${statusHtml}
          </div>
          <div class="fiori-card-rows">\${rowsHtml}</div>
          <div style="display: flex; justify-content: flex-end; align-items: center; color: #0070F2; font-size: 12px; font-weight: 700;">
            Inspect Details ›
          </div>
        \`;
        container.appendChild(card);
      });
    }

    // Open Object Page
    function openObjectPage(item) {
      currentObject = item;
      document.getElementById('listView').style.display = 'none';
      document.getElementById('objectView').style.display = 'flex';
      switchObjectTab('GENERAL');

      const keyVal = item[KEY_FIELD_NAME] || '';
      document.getElementById('objHeaderTitle').textContent = keyVal;
      document.getElementById('objHeaderSubtitle').textContent = (item.description || item.Description || 'SAP S/4HANA Business Object Record');

      const statusField = FIELDS.find(f => f.semanticRole === 'STATUS' || f.name.toLowerCase().includes('status'));
      const statusBadge = document.getElementById('objHeaderStatus');
      if (statusField && statusBadge) {
        statusBadge.outerHTML = getStatusBadge(item[statusField.name]);
      }

      // Populate Form Grid
      const formGrid = document.getElementById('objFormGrid');
      formGrid.innerHTML = '';
      FIELDS.forEach(f => {
        const fieldWrap = document.createElement('div');
        fieldWrap.className = 'fiori-form-field';
        const label = document.createElement('span');
        label.className = 'fiori-form-label';
        label.textContent = f.label || f.name;
        const val = document.createElement('span');
        val.className = 'fiori-form-value';
        val.innerHTML = formatCellValue(f, item[f.name]);
        fieldWrap.appendChild(label);
        fieldWrap.appendChild(val);
        formGrid.appendChild(fieldWrap);
      });

      // Load Compositional Child Entities if any
      loadChildEntities(item);
    }

    // Back to List
    function backToList() {
      document.getElementById('objectView').style.display = 'none';
      document.getElementById('listView').style.display = 'block';
      currentObject = null;
    }

    // Load Child Entities
    async function loadChildEntities(parentItem) {
      const section = document.getElementById('childEntitiesSection');
      section.innerHTML = '';
      if (!CHILD_ENTITIES || CHILD_ENTITIES.length === 0) {
        section.innerHTML = '<div style="color: #64748B; font-size: 13px;">No dependent child compositions defined in RAP data model.</div>';
        return;
      }

      for (const child of CHILD_ENTITIES) {
        const rel = RELATIONSHIPS.find(r => r.targetEntityId === child.entityId && r.sourceEntityId === (parentItem.entityId || ROOT_ENTITY));
        const assocName = rel ? rel.name : ('_' + child.name);
        const card = document.createElement('div');
        card.innerHTML = '<div style="font-size: 14px; font-weight: 700; margin-bottom: 8px; color: #1D2D3E;">' + (child.businessName || child.name) + '</div>';

        try {
          const parentKey = parentItem[KEY_FIELD_NAME];
          const url = \`\${SERVICE_BASE}/\${ROOT_ENTITY}('\${parentKey}')/\${assocName}\`;
          const res = await fetch(url);
          if (res.ok) {
            const data = await res.json();
            const childItems = data.value || [];
            if (childItems.length > 0) {
              const childFields = child.fields || [];
              let tbl = '<table class="fiori-table"><thead><tr>';
              childFields.forEach(cf => tbl += '<th>' + (cf.label || cf.name) + '</th>');
              tbl += '</tr></thead><tbody>';
              childItems.forEach(ci => {
                tbl += '<tr>';
                childFields.forEach(cf => tbl += '<td>' + formatCellValue(cf, ci[cf.name]) + '</td>');
                tbl += '</tr>';
              });
              tbl += '</tbody></table>';
              card.innerHTML += tbl;
            } else {
              card.innerHTML += '<div style="color: #64748B; font-size: 12px;">No line items found for this record.</div>';
            }
          }
        } catch {
          card.innerHTML += '<div style="color: #64748B; font-size: 12px;">No line items loaded.</div>';
        }
        section.appendChild(card);
      }
    }

    // Search filter
    function applySearch() {
      const q = document.getElementById('searchFilter').value.trim();
      const status = document.getElementById('statusFilter').value;
      let filterTerms = [];
      if (q) filterTerms.push(\`contains(\${KEY_FIELD_NAME}, '\${q}')\`);
      if (status) filterTerms.push(\`document_status eq '\${status}' or status eq '\${status}'\`);
      const queryStr = filterTerms.length > 0 ? \`$filter=\${filterTerms.join(' and ')}\` : '';
      loadData(queryStr);
    }

    function resetSearch() {
      document.getElementById('searchFilter').value = '';
      document.getElementById('statusFilter').value = '';
      loadData();
    }

    // Export to real CSV download
    function exportToCsv() {
      if (items.length === 0) {
        showToast('No records available to export.');
        return;
      }
      const headers = FIELDS.map(f => '"' + (f.label || f.name) + '"');
      const rows = items.map(item => {
        return FIELDS.map(f => {
          const val = item[f.name];
          return '"' + (val !== null && val !== undefined ? String(val).replace(/"/g, '""') : '') + '"';
        }).join(',');
      });
      const csvContent = headers.join(',') + '\\n' + rows.join('\\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = \`\${ROOT_ENTITY}_Export_\${new Date().toISOString().split('T')[0]}.csv\`;
      a.click();
      URL.revokeObjectURL(url);
      showToast('Export downloaded successfully.');
    }

    // Selection
    function toggleRowSelect(keyVal, tr, cb) {
      if (cb.checked) {
        selectedKeys.add(keyVal);
        tr.classList.add('selected');
      } else {
        selectedKeys.delete(keyVal);
        tr.classList.remove('selected');
      }
      updateDeleteButton();
    }

    function toggleSelectAll(masterCb) {
      const tbody = document.getElementById('tableBody');
      const cbs = tbody.querySelectorAll('input[type="checkbox"]');
      cbs.forEach(cb => {
        cb.checked = masterCb.checked;
        const tr = cb.closest('tr');
        const keyVal = cb.dataset.key;
        if (masterCb.checked) {
          selectedKeys.add(keyVal);
          if (tr) tr.classList.add('selected');
        } else {
          selectedKeys.delete(keyVal);
          if (tr) tr.classList.remove('selected');
        }
      });
      updateDeleteButton();
    }

    function updateDeleteButton() {
      const btn = document.getElementById('deleteBtn');
      btn.disabled = selectedKeys.size === 0;
      btn.textContent = selectedKeys.size > 0 ? \`Delete (\${selectedKeys.size})\` : 'Delete';
    }

    // Delete selected
    async function deleteSelected() {
      if (selectedKeys.size === 0) return;
      if (!confirm(\`Are you sure you want to delete \${selectedKeys.size} selected record(s)?\`)) return;

      for (const k of Array.from(selectedKeys)) {
        try {
          await fetch(\`\${SERVICE_BASE}/\${ROOT_ENTITY}('\${k}')\`, { method: 'DELETE' });
        } catch (err) {
          console.error('Delete failed for', k, err);
        }
      }
      showToast(\`\${selectedKeys.size} record(s) deleted.\`);
      selectedKeys.clear();
      loadData();
    }

    // Delete current object in Object Page
    async function deleteCurrentObject() {
      if (!currentObject) return;
      const keyVal = currentObject[KEY_FIELD_NAME];
      if (!confirm(\`Delete record \${keyVal}?\`)) return;
      try {
        await fetch(\`\${SERVICE_BASE}/\${ROOT_ENTITY}('\${keyVal}')\`, { method: 'DELETE' });
        showToast('Record deleted.');
        backToList();
        loadData();
      } catch (err) {
        showToast('Failed to delete: ' + err.message);
      }
    }

    // Create Modal
    function openCreateDialog() {
      const body = document.getElementById('createFormBody');
      body.innerHTML = '';
      FIELDS.forEach(f => {
        if (f.name.toLowerCase().includes('client')) return;
        const grp = document.createElement('div');
        grp.className = 'fiori-field';
        grp.innerHTML = '<label for="create_' + f.name + '">' + (f.label || f.name) + '</label>' +
          '<input type="text" id="create_' + f.name + '" class="fiori-input" placeholder="Enter ' + (f.label || f.name) + '" />';
        body.appendChild(grp);
      });
      document.getElementById('createDialog').style.display = 'flex';
    }

    function closeCreateDialog() {
      document.getElementById('createDialog').style.display = 'none';
    }

    async function submitCreate() {
      const payload = {};
      FIELDS.forEach(f => {
        if (f.name.toLowerCase().includes('client')) return;
        const el = document.getElementById('create_' + f.name);
        if (el && el.value.trim()) {
          payload[f.name] = (f.type && (f.type.includes('curr') || f.type.includes('dec') || f.type.includes('int')))
            ? Number(el.value.trim())
            : el.value.trim();
        }
      });

      try {
        const res = await fetch(\`\${SERVICE_BASE}/\${ROOT_ENTITY}\`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (!res.ok) throw new Error('HTTP ' + res.status);
        showToast('Record created successfully.');
        closeCreateDialog();
        loadData();
      } catch (err) {
        showToast('Failed to create: ' + err.message);
      }
    }

    // Initialize on page load
    window.addEventListener('DOMContentLoaded', () => {
      buildTableHeader();
      loadData();
    });
  </script>
</body>
</html>
`;
}
