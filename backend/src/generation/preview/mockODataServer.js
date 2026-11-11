/**
 * FioriX — GEN-07: In-Process Mock OData V4 HTTP Server
 *
 * Implements a lightweight, isolated Node.js HTTP server binding strictly to 127.0.0.1
 * serving dynamic OData V4 endpoints and generated Fiori Elements static webapp files.
 */

import http from 'node:http';
import { buildServiceDocument, buildODataMetadataXml } from './mockODataMetadata.js';
import { executeODataQuery } from './mockODataQuery.js';
import { executeCreate, executeUpdate, executeDelete } from './mockODataMutation.js';
import { sanitizeWebappPath, MAX_REQUEST_BODY_BYTES } from './previewSecurity.js';
import { defaultPreviewSessionStore } from './previewSessionStore.js';

export const PREVIEW_WATERMARK_HTML = `
<!-- FIORIX GEN-07 MANDATORY WATERMARK -->
<div id="fiorix-preview-banner" style="position:fixed;top:0;left:0;right:0;height:28px;background:#c0392b;color:#ffffff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-weight:700;font-size:11px;letter-spacing:0.8px;display:flex;align-items:center;justify-content:center;z-index:2147483647;box-shadow:0 2px 6px rgba(0,0,0,0.3);text-transform:uppercase;user-select:none;pointer-events:none;">
  &#9888; LOCAL MOCK PREVIEW — SYNTHETIC DATA ONLY — NOT CONNECTED TO SAP S21
</div>
<style>body { padding-top: 28px !important; }</style>
`;

/**
 * Creates and starts an in-process mock HTTP server.
 *
 * @param {Object} project - The GenerationProject record
 * @param {Object} architecture - Evaluated architecture spec
 * @param {number} port - Allocated safe port (4050-4099)
 * @param {Object} syntheticStore - In-memory entity collections
 * @returns {Promise<http.Server>} Running HTTP server instance
 */
export function startMockODataServer(project, architecture, port, syntheticStore) {
  return new Promise((resolve, reject) => {
    const rootEntity = project.dataModelSpec?.entities?.find((e) => e.entityType === 'ROOT' || e.isRoot) || project.dataModelSpec?.entities?.[0];
    const prefix = (rootEntity?.name || 'CUSTOM').replace(/[^a-zA-Z0-9_]/g, '');
    const serviceName = `ZUI_${prefix}`.toUpperCase();
    const serviceBasePath = `/sap/opu/odata4/sap/${serviceName.toLowerCase()}/srvd/sap/${serviceName.toLowerCase()}/0001`;

    const server = http.createServer(async (req, res) => {
      const startTime = Date.now();
      const clientIp = req.socket.remoteAddress;

      // Restrict strictly to loopback
      if (clientIp !== '127.0.0.1' && clientIp !== '::1' && clientIp !== '::ffff:127.0.0.1') {
        res.writeHead(403, { 'Content-Type': 'text/plain' });
        res.end('Access denied: Mock preview bound only to 127.0.0.1.');
        return;
      }

      // Handle CORS
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, PUT, DELETE, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, OData-Version, OData-MaxVersion, If-Match');

      if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
      }

      try {
        const parsedUrl = new URL(req.url, `http://127.0.0.1:${port}`);
        let pathname = decodeURIComponent(parsedUrl.pathname);

        // Normalize /odata/v4/service alias to serviceBasePath
        if (pathname.startsWith('/odata/v4/service')) {
          const subPath = pathname.slice('/odata/v4/service'.length);
          pathname = `${serviceBasePath}${subPath}`;
        }

        // 1. OData V4 Metadata Request ($metadata)
        if (pathname === `${serviceBasePath}/$metadata` || pathname === '/$metadata' || pathname.endsWith('/$metadata')) {
          const xml = buildODataMetadataXml(project, architecture);
          res.writeHead(200, {
            'Content-Type': 'application/xml;charset=utf-8',
            'OData-Version': '4.0'
          });
          res.end(xml);
          defaultPreviewSessionStore.logRequest(project.projectId, { method: req.method, url: req.url, status: 200, durationMs: Date.now() - startTime });
          return;
        }

        // 2. OData V4 Service Document
        if (pathname === serviceBasePath || pathname === `${serviceBasePath}/` || pathname === '/') {
          // If request accepts HTML and root path, serve the Fiori application entrypoint!
          if (pathname === '/' && req.headers.accept?.includes('text/html')) {
            serveStaticFioriAsset(project, 'webapp/index.html', res, serviceBasePath);
            defaultPreviewSessionStore.logRequest(project.projectId, { method: req.method, url: req.url, status: 200, durationMs: Date.now() - startTime });
            return;
          }

          const doc = buildServiceDocument(project, architecture);
          res.writeHead(200, {
            'Content-Type': 'application/json;odata.metadata=minimal;charset=utf-8',
            'OData-Version': '4.0'
          });
          res.end(JSON.stringify(doc));
          defaultPreviewSessionStore.logRequest(project.projectId, { method: req.method, url: req.url, status: 200, durationMs: Date.now() - startTime });
          return;
        }

        // 3. OData V4 Entity Operations
        if (pathname.startsWith(serviceBasePath)) {
          const odataPath = pathname.slice(serviceBasePath.length).replace(/^\/+/, '');
          await handleODataOperation(req, res, odataPath, parsedUrl.searchParams, project, architecture, syntheticStore, startTime);
          return;
        }

        // 4. Static Fiori WebApp Assets (webapp/*)
        const relPath = sanitizeWebappPath(pathname);
        const webappPath = relPath.startsWith('webapp/') ? relPath : `webapp/${relPath}`;
        serveStaticFioriAsset(project, webappPath, res, serviceBasePath);
        defaultPreviewSessionStore.logRequest(project.projectId, { method: req.method, url: req.url, status: 200, durationMs: Date.now() - startTime });

      } catch (err) {
        const statusCode = err.statusCode || (err.code === 'NOT_FOUND' ? 404 : 500);
        res.writeHead(statusCode, { 'Content-Type': 'application/json;charset=utf-8' });
        res.end(JSON.stringify({
          error: {
            code: err.code || 'INTERNAL_ERROR',
            message: err.message,
            target: req.url
          }
        }));
        defaultPreviewSessionStore.logRequest(project.projectId, { method: req.method, url: req.url, status: statusCode, error: err.message, durationMs: Date.now() - startTime });
      }
    });

    server.listen(port, '127.0.0.1', () => {
      resolve(server);
    });

    server.on('error', (err) => {
      reject(err);
    });
  });
}

/**
 * Handles OData EntitySet queries, key reads, and CRUD operations.
 */
async function handleODataOperation(req, res, odataPath, queryParams, project, architecture, syntheticStore, startTime) {
  const entities = project.dataModelSpec?.entities || [];

  // Match: EntitySet or EntitySet(KeyVal) or EntitySet(KeyVal)/NavigationProperty
  const entityMatch = odataPath.match(/^([a-zA-Z0-9_]+)(?:\((?:'([^']*)'|([0-9]+))\))?(?:\/([a-zA-Z0-9_]+))?$/);
  if (!entityMatch) {
    const err = new Error(`Resource "${odataPath}" not found.`);
    err.code = 'NOT_FOUND';
    err.statusCode = 404;
    throw err;
  }

  const [, entitySetName, strKey, numKey, navProperty] = entityMatch;
  const keyVal = strKey !== undefined ? strKey : numKey;
  const entity = entities.find((e) => e.name === entitySetName);

  if (!entity) {
    const err = new Error(`EntitySet "${entitySetName}" does not exist in service.`);
    err.code = 'RESOURCE_NOT_FOUND';
    err.statusCode = 404;
    throw err;
  }

  const entityRecords = syntheticStore[entity.name] || [];
  const keyField = (entity.fields || []).find((f) => f.isKey) || entity.fields?.[0];

  // 1. GET: Collection or Single Instance or Navigation Read
  if (req.method === 'GET') {
    if (keyVal !== undefined) {
      // Single Instance Read
      const instance = entityRecords.find((r) => String(r[keyField?.name]) === String(keyVal));
      if (!instance) {
        const err = new Error(`Entity "${entity.name}" with key "${keyVal}" not found.`);
        err.code = 'NOT_FOUND';
        err.statusCode = 404;
        throw err;
      }

      // Check if navigation property requested (e.g. /PurchaseOrder('100')/_Items)
      if (navProperty) {
        const relationships = project.dataModelSpec?.relationships || [];
        const rel = relationships.find((r) => r.sourceEntityId === entity.entityId && (r.name === navProperty || `_${r.name}` === navProperty));
        const targetEntity = entities.find((e) => e.entityId === rel?.targetEntityId);

        if (targetEntity) {
          const childRecords = (syntheticStore[targetEntity.name] || []).filter((c) => String(c[keyField?.name]) === String(keyVal));
          const queryResult = executeODataQuery(childRecords, queryParams);
          res.writeHead(200, { 'Content-Type': 'application/json;odata.metadata=minimal;charset=utf-8', 'OData-Version': '4.0' });
          res.end(JSON.stringify(queryResult));
          defaultPreviewSessionStore.logRequest(project.projectId, { method: req.method, url: req.url, status: 200, durationMs: Date.now() - startTime });
          return;
        }
      }

      res.writeHead(200, { 'Content-Type': 'application/json;odata.metadata=minimal;charset=utf-8', 'OData-Version': '4.0' });
      res.end(JSON.stringify({
        '@odata.context': '$metadata',
        ...instance
      }));
      defaultPreviewSessionStore.logRequest(project.projectId, { method: req.method, url: req.url, status: 200, durationMs: Date.now() - startTime });
      return;
    }

    // Collection Read
    const queryResult = executeODataQuery(entityRecords, queryParams);
    res.writeHead(200, { 'Content-Type': 'application/json;odata.metadata=minimal;charset=utf-8', 'OData-Version': '4.0' });
    res.end(JSON.stringify(queryResult));
    defaultPreviewSessionStore.logRequest(project.projectId, { method: req.method, url: req.url, status: 200, durationMs: Date.now() - startTime });
    return;
  }

  // Read request body for POST/PATCH
  let bodyPayload = {};
  if (req.method === 'POST' || req.method === 'PATCH' || req.method === 'PUT') {
    const rawBody = await readRequestBody(req);
    if (rawBody.trim()) {
      try {
        bodyPayload = JSON.parse(rawBody);
      } catch {
        const err = new Error('Malformed JSON payload.');
        err.code = 'INVALID_JSON';
        err.statusCode = 400;
        throw err;
      }
    }
  }

  // 2. POST: Create
  if (req.method === 'POST') {
    const createResult = executeCreate(entity, bodyPayload, syntheticStore, architecture);
    res.writeHead(createResult.status, { 'Content-Type': 'application/json;odata.metadata=minimal;charset=utf-8', 'OData-Version': '4.0' });
    res.end(JSON.stringify(createResult.record));
    defaultPreviewSessionStore.logRequest(project.projectId, { method: req.method, url: req.url, status: createResult.status, durationMs: Date.now() - startTime });
    return;
  }

  // 3. PATCH / PUT: Update
  if (req.method === 'PATCH' || req.method === 'PUT') {
    if (keyVal === undefined) {
      const err = new Error('Update requires an entity key specification.');
      err.code = 'KEY_REQUIRED';
      err.statusCode = 400;
      throw err;
    }
    const updateResult = executeUpdate(entity, keyVal, bodyPayload, syntheticStore, architecture);
    res.writeHead(updateResult.status, { 'Content-Type': 'application/json;odata.metadata=minimal;charset=utf-8', 'OData-Version': '4.0' });
    res.end(JSON.stringify(updateResult.record));
    defaultPreviewSessionStore.logRequest(project.projectId, { method: req.method, url: req.url, status: updateResult.status, durationMs: Date.now() - startTime });
    return;
  }

  // 4. DELETE: Delete
  if (req.method === 'DELETE') {
    if (keyVal === undefined) {
      const err = new Error('Delete requires an entity key specification.');
      err.code = 'KEY_REQUIRED';
      err.statusCode = 400;
      throw err;
    }
    const deleteResult = executeDelete(entity, keyVal, syntheticStore, architecture);
    res.writeHead(deleteResult.status);
    res.end();
    defaultPreviewSessionStore.logRequest(project.projectId, { method: req.method, url: req.url, status: deleteResult.status, durationMs: Date.now() - startTime });
    return;
  }

  // Unsupported HTTP method
  res.writeHead(405, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: { code: 'METHOD_NOT_ALLOWED', message: `HTTP method ${req.method} not allowed.` } }));
}

/**
 * Serves generated webapp artifacts directly from the project's artifact registry.
 */
function serveStaticFioriAsset(project, webappPath, res, serviceBasePath = '') {
  const registry = project.artifactRegistry?.artifacts || {};
  const artifact = Object.values(registry).find((a) => a.filePath === webappPath || a.filePath.endsWith(webappPath));

  let content = artifact ? artifact.content : '';
  let contentType = 'text/plain;charset=utf-8';

  if (webappPath.endsWith('.html')) {
    contentType = 'text/html;charset=utf-8';
    // If index.html is missing or is the static/non-interactive bootstrap, render the full interactive Fiori Elements application
    if (!content || !content.includes('fiori-preview-runtime')) {
      content = buildInteractiveFioriPreviewHtml(project, serviceBasePath);
    }
    // Inject mandatory permanent watermark banner into preview HTML
    if (content.includes('</body>')) {
      content = content.replace('</body>', `${PREVIEW_WATERMARK_HTML}</body>`);
    } else {
      content = `${PREVIEW_WATERMARK_HTML}${content}`;
    }
  } else {
    if (!artifact) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end(`Fiori asset "${webappPath}" not found in project artifact registry. Has the Fiori app been generated?`);
      return;
    }
    if (webappPath.endsWith('.json')) {
      contentType = 'application/json;charset=utf-8';
    } else if (webappPath.endsWith('.xml')) {
      contentType = 'application/xml;charset=utf-8';
    } else if (webappPath.endsWith('.js')) {
      contentType = 'application/javascript;charset=utf-8';
    } else if (webappPath.endsWith('.properties')) {
      contentType = 'text/plain;charset=utf-8';
    }
  }

  res.writeHead(200, { 'Content-Type': contentType });
  res.end(content);
}

/**
 * Builds an interactive, standalone SAP Fiori Elements application with Horizon theme styling
 * that operates against the local Node.js mock OData V4 server in real time.
 */
export function buildInteractiveFioriPreviewHtml(project, serviceBasePath = '') {
  const rootEntity = project.dataModelSpec?.entities?.find((e) => e.entityType === 'ROOT' || e.isRoot) || project.dataModelSpec?.entities?.[0];
  const rootEntityName = rootEntity?.name || 'CUSTOM';
  const entityTitle = rootEntity?.businessName || rootEntityName;
  const appTitle = project.projectName || `${entityTitle} Application`;
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
  <meta name="fiori-preview-runtime" content="v1.0">
  <title>${appTitle} — SAP Fiori Elements Preview</title>
  <style>
    :root {
      --fiori-shell-bg: #1c2d42;
      --fiori-shell-text: #ffffff;
      --fiori-primary: #0066ff;
      --fiori-primary-hover: #0052cc;
      --fiori-bg: #f5f6f8;
      --fiori-card-bg: #ffffff;
      --fiori-border: #d5dadd;
      --fiori-text: #1d2d3e;
      --fiori-text-secondary: #64748b;
      --fiori-row-hover: #eef4fc;
      --fiori-badge-bg: #e8f3ff;
      --fiori-badge-text: #0050b3;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html, body {
      height: 100%;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      background: var(--fiori-bg);
      color: var(--fiori-text);
      display: flex;
      flex-direction: column;
    }
    /* SAP Fiori Shell Header */
    .fiori-shell {
      height: 48px;
      background: var(--fiori-shell-bg);
      color: var(--fiori-shell-text);
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 16px;
      font-size: 14px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      flex-shrink: 0;
    }
    .fiori-shell-left {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .fiori-sap-logo {
      font-weight: 900;
      letter-spacing: 0.8px;
      font-size: 14px;
      background: #0070f2;
      padding: 3px 8px;
      border-radius: 4px;
    }
    .fiori-shell-title {
      font-weight: 600;
      font-size: 15px;
    }
    .fiori-shell-subtitle {
      font-size: 12px;
      color: #94a3b8;
    }
    .fiori-shell-right {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .fiori-user-badge {
      display: flex;
      align-items: center;
      gap: 6px;
      background: rgba(255,255,255,0.12);
      padding: 4px 10px;
      border-radius: 16px;
      font-size: 12px;
    }
    /* Main Content Area */
    .fiori-page {
      flex: 1;
      overflow-y: auto;
      padding: 16px 24px;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    /* FilterBar */
    .fiori-card {
      background: var(--fiori-card-bg);
      border: 1px solid var(--fiori-border);
      border-radius: 8px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.04);
      padding: 16px 20px;
    }
    .fiori-filter-bar {
      display: flex;
      align-items: flex-end;
      gap: 16px;
      flex-wrap: wrap;
    }
    .fiori-field {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .fiori-field label {
      font-size: 12px;
      font-weight: 600;
      color: var(--fiori-text-secondary);
    }
    .fiori-input {
      height: 34px;
      border: 1px solid var(--fiori-border);
      border-radius: 4px;
      padding: 0 10px;
      font-size: 13px;
      outline: none;
      min-width: 200px;
    }
    .fiori-input:focus { border-color: var(--fiori-primary); box-shadow: 0 0 0 2px rgba(0,102,255,0.15); }
    .fiori-btn {
      height: 34px;
      padding: 0 16px;
      border-radius: 4px;
      border: 1px solid transparent;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      transition: all 0.15s ease;
    }
    .fiori-btn-primary { background: var(--fiori-primary); color: #fff; }
    .fiori-btn-primary:hover { background: var(--fiori-primary-hover); }
    .fiori-btn-secondary { background: #fff; border-color: var(--fiori-border); color: var(--fiori-text); }
    .fiori-btn-secondary:hover { background: #f0f2f5; }
    .fiori-btn-danger { background: #fff; border-color: #ef4444; color: #dc2626; }
    .fiori-btn-danger:hover { background: #fee2e2; }
    /* Table Toolbar */
    .fiori-table-toolbar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
    }
    .fiori-table-title {
      font-size: 16px;
      font-weight: 700;
      color: var(--fiori-text);
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .fiori-table-count {
      font-size: 13px;
      font-weight: 600;
      color: var(--fiori-text-secondary);
    }
    .fiori-toolbar-actions {
      display: flex;
      gap: 8px;
    }
    /* Responsive Table */
    .fiori-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 13px;
    }
    .fiori-table th {
      text-align: left;
      padding: 10px 12px;
      background: #f8fafc;
      border-bottom: 2px solid var(--fiori-border);
      color: var(--fiori-text-secondary);
      font-size: 12px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .fiori-table td {
      padding: 10px 12px;
      border-bottom: 1px solid #edf0f2;
      vertical-align: middle;
    }
    .fiori-table tr:hover td {
      background: var(--fiori-row-hover);
      cursor: pointer;
    }
    .fiori-key-cell {
      font-weight: 700;
      color: var(--fiori-primary);
    }
    .fiori-badge {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 12px;
      background: var(--fiori-badge-bg);
      color: var(--fiori-badge-text);
      font-size: 11px;
      font-weight: 600;
    }
    /* Object Page View */
    .fiori-object-page {
      display: none;
    }
    .fiori-object-header {
      background: #fff;
      border: 1px solid var(--fiori-border);
      border-radius: 8px;
      padding: 20px 24px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.04);
      margin-bottom: 16px;
    }
    .fiori-back-btn {
      color: var(--fiori-primary);
      text-decoration: none;
      font-size: 13px;
      font-weight: 600;
      display: inline-flex;
      align-items: center;
      gap: 4px;
      margin-bottom: 12px;
      cursor: pointer;
    }
    .fiori-grid-form {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 16px;
      margin-top: 16px;
    }
    .fiori-form-group {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .fiori-form-label {
      font-size: 11px;
      font-weight: 600;
      color: var(--fiori-text-secondary);
      text-transform: uppercase;
    }
    .fiori-form-value {
      font-size: 14px;
      color: var(--fiori-text);
      font-weight: 500;
    }
    /* Toast */
    .fiori-toast {
      position: fixed;
      bottom: 24px;
      right: 24px;
      background: #1e293b;
      color: #fff;
      padding: 10px 18px;
      border-radius: 6px;
      font-size: 13px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.2);
      display: none;
      z-index: 99999;
    }
    /* Modal Dialog */
    .fiori-dialog-overlay {
      position: fixed;
      top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(0,0,0,0.4);
      display: none;
      align-items: center;
      justify-content: center;
      z-index: 10000;
    }
    .fiori-dialog {
      background: #fff;
      width: 480px;
      max-width: 90%;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 10px 25px rgba(0,0,0,0.2);
    }
    .fiori-dialog-header {
      padding: 16px 20px;
      background: #f8fafc;
      border-bottom: 1px solid var(--fiori-border);
      font-weight: 700;
      font-size: 15px;
    }
    .fiori-dialog-body {
      padding: 20px;
      display: flex;
      flex-direction: column;
      gap: 14px;
    }
    .fiori-dialog-footer {
      padding: 12px 20px;
      background: #f8fafc;
      border-top: 1px solid var(--fiori-border);
      display: flex;
      justify-content: flex-end;
      gap: 8px;
    }
  </style>
</head>
<body class="sapUiBody">

  <!-- Shell Header -->
  <header class="fiori-shell">
    <div class="fiori-shell-left">
      <span class="fiori-sap-logo">SAP</span>
      <div>
        <div class="fiori-shell-title">${appTitle}</div>
        <div class="fiori-shell-subtitle">SAP Fiori Elements • S/4HANA 2023 Mock Runtime</div>
      </div>
    </div>
    <div class="fiori-shell-right">
      <div class="fiori-user-badge">👤 SAP Consultant</div>
    </div>
  </header>

  <!-- Page Content -->
  <main class="fiori-page">

    <!-- LIST REPORT FLOORPLAN -->
    <div id="listView">
      <!-- Dynamic FilterBar -->
      <div class="fiori-card" style="margin-bottom: 16px;">
        <div class="fiori-filter-bar">
          <div class="fiori-field">
            <label for="searchFilter">Search by ${keyField.label || keyField.name}</label>
            <input type="text" id="searchFilter" class="fiori-input" placeholder="Type to filter..." />
          </div>
          <button class="fiori-btn fiori-btn-primary" onclick="applySearch()">Go</button>
          <button class="fiori-btn fiori-btn-secondary" onclick="resetSearch()">Clear</button>
        </div>
      </div>

      <!-- Responsive Table Card -->
      <div class="fiori-card">
        <div class="fiori-table-toolbar">
          <div class="fiori-table-title">
            <span>${entityTitle}</span>
            <span class="fiori-table-count" id="tableCount">(0)</span>
          </div>
          <div class="fiori-toolbar-actions">
            <button class="fiori-btn fiori-btn-primary" onclick="openCreateDialog()">+ Create</button>
            <button class="fiori-btn fiori-btn-danger" id="deleteBtn" onclick="deleteSelected()" disabled>🗑 Delete</button>
            <button class="fiori-btn fiori-btn-secondary" onclick="loadData()">🔄 Refresh</button>
          </div>
        </div>

        <div style="overflow-x: auto;">
          <table class="fiori-table">
            <thead>
              <tr id="tableHeadRow"></tr>
            </thead>
            <tbody id="tableBody"></tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- OBJECT PAGE FLOORPLAN -->
    <div id="objectView" class="fiori-object-page">
      <div class="fiori-object-header">
        <div class="fiori-back-btn" onclick="backToList()">← Back to ${entityTitle} List</div>
        <div style="display: flex; justify-content: space-between; align-items: flex-start;">
          <div>
            <h2 id="objHeaderTitle" style="font-size: 20px; font-weight: 700; color: #0f172a;"></h2>
            <div id="objHeaderSubtitle" style="font-size: 13px; color: #64748b; margin-top: 4px;"></div>
          </div>
          <div style="display: flex; gap: 8px;">
            <button class="fiori-btn fiori-btn-danger" onclick="deleteCurrentObject()">Delete</button>
            <button class="fiori-btn fiori-btn-secondary" onclick="backToList()">Close</button>
          </div>
        </div>
      </div>

      <div class="fiori-card">
        <h3 style="font-size: 15px; font-weight: 700; margin-bottom: 12px; border-bottom: 1px solid #edf0f2; padding-bottom: 8px;">
          General Information
        </h3>
        <div id="objFormGrid" class="fiori-grid-form"></div>
      </div>

      <div id="childEntitiesSection" style="margin-top: 16px;"></div>
    </div>

  </main>

  <!-- Create Modal Dialog -->
  <div id="createDialog" class="fiori-dialog-overlay">
    <div class="fiori-dialog">
      <div class="fiori-dialog-header">Create New ${entityTitle}</div>
      <div class="fiori-dialog-body" id="createFormBody"></div>
      <div class="fiori-dialog-footer">
        <button class="fiori-btn fiori-btn-secondary" onclick="closeCreateDialog()">Cancel</button>
        <button class="fiori-btn fiori-btn-primary" onclick="submitCreate()">Save</button>
      </div>
    </div>
  </div>

  <!-- Notification Toast -->
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

    // Toast helper
    function showToast(msg) {
      const toast = document.getElementById('fioriToast');
      toast.textContent = msg;
      toast.style.display = 'block';
      setTimeout(() => { toast.style.display = 'none'; }, 3500);
    }

    // Build Table Header
    function buildTableHeader() {
      const row = document.getElementById('tableHeadRow');
      row.innerHTML = '<th style="width: 40px; text-align: center;"><input type="checkbox" id="selectAllCheckbox" onchange="toggleSelectAll(this)" /></th>';
      FIELDS.forEach(f => {
        const th = document.createElement('th');
        th.textContent = f.label || f.name;
        row.appendChild(th);
      });
      const actTh = document.createElement('th');
      actTh.textContent = 'Actions';
      actTh.style.textAlign = 'right';
      row.appendChild(actTh);
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
        renderTable(items, data['@odata.count'] !== undefined ? data['@odata.count'] : items.length);
      } catch (err) {
        console.error('Failed to load OData collection:', err);
        showToast('Error loading OData: ' + err.message);
      }
    }

    // Render Table Rows
    function renderTable(recordList, count) {
      document.getElementById('tableCount').textContent = '(' + count + ')';
      const tbody = document.getElementById('tableBody');
      tbody.innerHTML = '';

      if (recordList.length === 0) {
        tbody.innerHTML = '<tr><td colspan="' + (FIELDS.length + 2) + '" style="text-align:center;padding:32px;color:#94a3b8;">No records found in mock OData V4 database.</td></tr>';
        return;
      }

      recordList.forEach(rec => {
        const tr = document.createElement('tr');
        const keyVal = rec[KEY_FIELD_NAME];
        const isChecked = selectedKeys.has(String(keyVal));

        tr.onclick = (e) => {
          if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'BUTTON') {
            openObjectPage(rec);
          }
        };

        // Checkbox cell
        const chkCell = document.createElement('td');
        chkCell.style.textAlign = 'center';
        chkCell.innerHTML = \`<input type="checkbox" \${isChecked ? 'checked' : ''} onchange="toggleSelectRow('\${keyVal}', this)" />\`;
        tr.appendChild(chkCell);

        // Data cells
        FIELDS.forEach(f => {
          const td = document.createElement('td');
          const val = rec[f.name];
          if (f.isKey) {
            td.className = 'fiori-key-cell';
            td.textContent = val !== undefined && val !== null ? val : '—';
          } else if (f.semanticRole === 'CODE' || f.type === 'abap.boolean') {
            td.innerHTML = \`<span class="fiori-badge">\${val !== undefined && val !== null ? val : '—'}</span>\`;
          } else {
            td.textContent = val !== undefined && val !== null ? val : '—';
          }
          tr.appendChild(td);
        });

        // Action cell
        const actTd = document.createElement('td');
        actTd.style.textAlign = 'right';
        actTd.innerHTML = \`<button class="fiori-btn fiori-btn-secondary" style="height:26px;padding:0 8px;font-size:11px;" onclick="openObjectPageByKey('\${keyVal}', event)">Inspect</button>\`;
        tr.appendChild(actTd);

        tbody.appendChild(tr);
      });
    }

    // Selection
    function toggleSelectRow(keyVal, cb) {
      if (cb.checked) selectedKeys.add(String(keyVal));
      else selectedKeys.delete(String(keyVal));
      updateDeleteButton();
    }

    function toggleSelectAll(cb) {
      if (cb.checked) {
        items.forEach(i => selectedKeys.add(String(i[KEY_FIELD_NAME])));
      } else {
        selectedKeys.clear();
      }
      renderTable(items, items.length);
      updateDeleteButton();
    }

    function updateDeleteButton() {
      const btn = document.getElementById('deleteBtn');
      btn.disabled = selectedKeys.size === 0;
      btn.textContent = selectedKeys.size > 1 ? \`🗑 Delete (\${selectedKeys.size})\` : '🗑 Delete';
    }

    // Search / Filter
    function applySearch() {
      const term = document.getElementById('searchFilter').value.trim();
      if (!term) { loadData(); return; }
      loadData(\`$filter=contains(\${KEY_FIELD_NAME},'\${encodeURIComponent(term)}')&$count=true\`);
    }

    function resetSearch() {
      document.getElementById('searchFilter').value = '';
      loadData();
    }

    // Object Page
    function openObjectPage(rec) {
      currentObject = rec;
      const keyVal = rec[KEY_FIELD_NAME];
      document.getElementById('objHeaderTitle').textContent = \`\${ROOT_ENTITY}: \${keyVal}\`;
      document.getElementById('objHeaderSubtitle').textContent = \`Target Release: SAP S/4HANA 2023 • OData V4 Entity Set\`;

      const formGrid = document.getElementById('objFormGrid');
      formGrid.innerHTML = '';
      FIELDS.forEach(f => {
        const grp = document.createElement('div');
        grp.className = 'fiori-form-group';
        grp.innerHTML = \`
          <span class="fiori-form-label">\${f.label || f.name}\${f.isKey ? ' (KEY)' : ''}</span>
          <span class="fiori-form-value">\${rec[f.name] !== undefined && rec[f.name] !== null ? rec[f.name] : '—'}</span>
        \`;
        formGrid.appendChild(grp);
      });

      // Load child entities if relationships exist
      loadChildEntities(keyVal);

      document.getElementById('listView').style.display = 'none';
      document.getElementById('objectView').style.display = 'block';
    }

    function openObjectPageByKey(keyVal, event) {
      if (event) event.stopPropagation();
      const rec = items.find(i => String(i[KEY_FIELD_NAME]) === String(keyVal));
      if (rec) openObjectPage(rec);
    }

    async function loadChildEntities(keyVal) {
      const childSec = document.getElementById('childEntitiesSection');
      childSec.innerHTML = '';
      for (const rel of RELATIONSHIPS) {
        const navName = rel.name.startsWith('_') ? rel.name : \`_\${rel.name}\`;
        const target = CHILD_ENTITIES.find(c => c.entityId === rel.targetEntityId);
        if (!target) continue;

        const card = document.createElement('div');
        card.className = 'fiori-card';
        card.innerHTML = \`<h4 style="font-size:14px;font-weight:700;margin-bottom:8px;">\${target.businessName || target.name} Items</h4><div id="childTable_\${target.name}">Loading...</div>\`;
        childSec.appendChild(card);

        try {
          const res = await fetch(\`\${SERVICE_BASE}/\${ROOT_ENTITY}('\${keyVal}')/\${navName}\`);
          if (res.ok) {
            const childData = await res.json();
            const childList = childData.value || [];
            const container = document.getElementById('childTable_' + target.name);
            if (childList.length === 0) {
              container.innerHTML = '<div style="color:#94a3b8;font-size:12px;">No related items.</div>';
            } else {
              let tblHtml = '<table class="fiori-table"><thead><tr>';
              (target.fields || []).forEach(tf => { tblHtml += \`<th>\${tf.label || tf.name}</th>\`; });
              tblHtml += '</tr></thead><tbody>';
              childList.forEach(cr => {
                tblHtml += '<tr>';
                (target.fields || []).forEach(tf => {
                  tblHtml += \`<td>\${cr[tf.name] !== undefined ? cr[tf.name] : '—'}</td>\`;
                });
                tblHtml += '</tr>';
              });
              tblHtml += '</tbody></table>';
              container.innerHTML = tblHtml;
            }
          }
        } catch(e) {}
      }
    }

    function backToList() {
      document.getElementById('objectView').style.display = 'none';
      document.getElementById('listView').style.display = 'block';
      loadData();
    }

    // Create Dialog
    function openCreateDialog() {
      const form = document.getElementById('createFormBody');
      form.innerHTML = '';
      FIELDS.forEach(f => {
        const div = document.createElement('div');
        div.className = 'fiori-field';
        div.innerHTML = \`
          <label for="create_\${f.name}">\${f.label || f.name} \${f.isMandatory ? '*' : ''}</label>
          <input type="text" id="create_\${f.name}" class="fiori-input" placeholder="\${f.type}" />
        \`;
        form.appendChild(div);
      });
      document.getElementById('createDialog').style.display = 'flex';
    }

    function closeCreateDialog() {
      document.getElementById('createDialog').style.display = 'none';
    }

    // POST Create OData V4 Mutation
    async function submitCreate() {
      const payload = {};
      FIELDS.forEach(f => {
        const input = document.getElementById('create_' + f.name);
        if (input && input.value.trim()) {
          payload[f.name] = input.value.trim();
        }
      });

      try {
        const res = await fetch(\`\${SERVICE_BASE}/\${ROOT_ENTITY}\`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData?.error?.message || 'HTTP ' + res.status);
        }

        closeCreateDialog();
        showToast('Record created successfully (POST 201 Created)');
        loadData();
      } catch (err) {
        alert('Failed to create record: ' + err.message);
      }
    }

    // DELETE OData V4 Mutation
    async function deleteSelected() {
      if (!confirm(\`Delete \${selectedKeys.size} record(s)?\`)) return;
      try {
        for (const k of selectedKeys) {
          await fetch(\`\${SERVICE_BASE}/\${ROOT_ENTITY}('\${k}')\`, { method: 'DELETE' });
        }
        showToast(\`Successfully deleted \${selectedKeys.size} record(s) (DELETE 204)\`);
        selectedKeys.clear();
        loadData();
      } catch (err) {
        showToast('Delete failed: ' + err.message);
      }
    }

    async function deleteCurrentObject() {
      if (!currentObject) return;
      const keyVal = currentObject[KEY_FIELD_NAME];
      if (!confirm(\`Delete record \${keyVal}?\`)) return;
      try {
        await fetch(\`\${SERVICE_BASE}/\${ROOT_ENTITY}('\${keyVal}')\`, { method: 'DELETE' });
        showToast('Record deleted (DELETE 204)');
        backToList();
      } catch(err) {
        showToast('Delete failed: ' + err.message);
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

/**
 * Reads request body safely up to 1MB limit.
 */
function readRequestBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    let bytesReceived = 0;

    req.on('data', (chunk) => {
      bytesReceived += chunk.length;
      if (bytesReceived > MAX_REQUEST_BODY_BYTES) {
        const err = new Error('Payload too large.');
        err.statusCode = 413;
        req.destroy();
        reject(err);
        return;
      }
      body += chunk.toString('utf-8');
    });

    req.on('end', () => resolve(body));
    req.on('error', (err) => reject(err));
  });
}
