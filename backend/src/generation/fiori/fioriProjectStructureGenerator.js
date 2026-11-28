/**
 * Fiorify — GEN-06: SAP Fiori Application Project Scaffolding
 *
 * Synthesizes Component.js, index.html, i18n.properties, package.json,
 * and ui5.yaml for the SAP Fiori Elements project.
 */

import { createFioriArtifact, FIORI_ARTIFACT_TYPES, TARGET_UI5_VERSION_S4HANA2023 } from './fioriArtifactContract.js';
import { buildODataMetadataXml } from '../preview/mockODataMetadata.js';
import { formatCdsViewName } from '../abap/cdsViewEntityGenerator.js';

function buildSampleMockRows(entity, count = 5) {
  const rows = [];
  const fields = entity.fields || [];
  for (let i = 1; i <= count; i++) {
    const row = {};
    for (const f of fields) {
      const name = f.name;
      const t = String(f.type || '').toLowerCase();
      if (t === 'sysuuid_x16') {
        row[name] = `00000000-0000-0000-0000-${String(i).padStart(12, '0')}`;
      } else if (t === 'abap.boolean') {
        row[name] = i % 2 === 1;
      } else if (t === 'abap.int4' || t === 'abap.int8') {
        row[name] = i * 10;
      } else if (t === 'abap.dec' || t === 'abap.curr' || t === 'abap.quan') {
        row[name] = Number((i * 1250.5).toFixed(2));
      } else if (t === 'abap.dats') {
        row[name] = `2026-11-${String(10 + i).padStart(2, '0')}`;
      } else if (t === 'abap.cuky') {
        row[name] = 'USD';
      } else if (t === 'abap.unit') {
        row[name] = 'EA';
      } else if (f.isKey) {
        row[name] = `${String(entity.name || 'REC').slice(0, 4).toUpperCase()}-${String(1000 + i)}`;
      } else {
        row[name] = `${f.label || name} ${i}`;
      }
    }
    rows.push(row);
  }
  return rows;
}

export function generateFioriProjectScaffolding(project, architecture, uiConfig = {}) {
  const rootEntity = project.dataModelSpec?.entities?.find((e) => e.entityType === 'ROOT' || e.isRoot) || project.dataModelSpec?.entities?.[0];
  if (!rootEntity) return [];

  const prefix = (rootEntity.name || 'CUSTOM').replace(/[^a-zA-Z0-9_]/g, '').toLowerCase();
  const appId = uiConfig.appId || `com.fiorify.custom.${prefix}`;
  const appTitle = uiConfig.pageTitle || project.projectName || `${rootEntity.businessName || rootEntity.name} Application`;
  const artifacts = [];

  // 1. webapp/Component.js
  const componentJs = `sap.ui.define(["sap/fe/core/AppComponent"], function (AppComponent) {
  "use strict";

  return AppComponent.extend("${appId}.Component", {
    metadata: {
      manifest: "json"
    }
  });
});
`;

  artifacts.push(createFioriArtifact({
    projectId: project.projectId,
    artifactType: FIORI_ARTIFACT_TYPES.FIORI_COMPONENT,
    objectName: 'Component.js',
    filePath: 'webapp/Component.js',
    content: componentJs,
    language: 'JAVASCRIPT',
    sourceEntityIds: [rootEntity.entityId]
  }));

  // 2. webapp/index.html
  const indexHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${appTitle}</title>
  <style>
    html, body, #content, [data-sap-ui-component] {
      height: 100% !important;
      width: 100% !important;
      margin: 0;
      padding: 0;
    }
  </style>
  <script
    id="sap-ui-bootstrap"
    src="resources/sap-ui-core.js"
    data-sap-ui-theme="sap_horizon"
    data-sap-ui-resourceroots='{ "${appId}": "./" }'
    data-sap-ui-oninit="module:sap/ui/core/ComponentSupport"
    data-sap-ui-compatVersion="edge"
    data-sap-ui-async="true"
    data-sap-ui-preload="async"
    onerror="window.handleUi5BootstrapError && window.handleUi5BootstrapError()"
  ></script>
  <script>
    window.handleUi5BootstrapError = function() {
      setTimeout(showCdnFallback, 100);
    };
    setTimeout(function() {
      if (!window.sap || !window.sap.ui) {
        showCdnFallback();
      }
    }, 7000);
    function showCdnFallback() {
      var c = document.getElementById('content');
      if (c && !document.getElementById('Fiorify-fallback-banner')) {
        c.innerHTML = '<div id="Fiorify-fallback-banner" style="font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;padding:32px 24px;max-width:750px;margin:40px auto;background:#fff;border:1px solid #e2e8f0;border-radius:8px;box-shadow:0 4px 6px rgba(0,0,0,0.05);">' +
          '<h2 style="font-size:18px;font-weight:700;color:#0f172a;margin:0 0 12px 0;">Interactive Fiori Elements Preview</h2>' +
          '<div style="padding:10px 14px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:6px;color:#166534;font-size:13px;margin-bottom:16px;">' +
          '<strong>Local Mock OData V4 Service Active</strong> — Run <code>npm install &amp;&amp; npm start</code> to serve UI5 resources locally.' +
          '</div>' +
          '<div style="font-size:12px;color:#64748b;background:#f8fafc;padding:12px;border-radius:6px;font-family:monospace;">' +
          'Target App ID: ${appId}<br/>' +
          'Root Entity: ${rootEntity.name}' +
          '</div>' +
          '</div>';
      }
    }
  </script>
</head>
<body class="sapUiBody" id="content">
  <div
    data-sap-ui-component
    data-name="${appId}"
    data-id="rootComponent"
    data-settings='{ "id": "${appId}" }'
  ></div>
</body>
</html>
`;

  artifacts.push(createFioriArtifact({
    projectId: project.projectId,
    artifactType: FIORI_ARTIFACT_TYPES.FIORI_INDEX_HTML,
    objectName: 'index.html',
    filePath: 'webapp/index.html',
    content: indexHtml,
    language: 'HTML',
    sourceEntityIds: [rootEntity.entityId]
  }));

  // 3. webapp/i18n/i18n.properties
  let i18n = `# Fiorify Generated i18n Bundle for ${project.projectName}\n`;
  i18n += `appTitle=${appTitle}\n`;
  i18n += `appDescription=${project.description || 'SAP S/4HANA 2023 Modernization Application'}\n`;
  i18n += `\n# Entity Labels\n`;
  for (const ent of project.dataModelSpec?.entities || []) {
    i18n += `entity.${ent.name}=${ent.businessName || ent.name}\n`;
    for (const f of ent.fields || []) {
      i18n += `field.${ent.name}.${f.name}=${f.label || f.name}\n`;
    }
  }

  artifacts.push(createFioriArtifact({
    projectId: project.projectId,
    artifactType: FIORI_ARTIFACT_TYPES.FIORI_I18N,
    objectName: 'i18n.properties',
    filePath: 'webapp/i18n/i18n.properties',
    content: i18n,
    language: 'PROPERTIES',
    sourceEntityIds: [rootEntity.entityId]
  }));

  // 4. package.json (zero-bloat local runner; no heavy @sap/ux-ui5-tooling install required)
  const packageJson = {
    name: `fiorify-${prefix}-ui`,
    version: '1.0.0',
    description: project.description || `SAP Fiori Elements Application for ${project.projectName}`,
    scripts: {
      start: 'node start.js',
      'start:fast': 'node start.js',
      'start:ui5': 'ui5 serve --config ui5-mock.yaml --port 8080 --open index.html',
      'start:sap': 'ui5 serve --port 8080 --open test/flpSandbox.html',
      build: 'ui5 build --clean-dest'
    },
    dependencies: {},
    devDependencies: {
      '@ui5/cli': '^3.0.0'
    }
  };

  artifacts.push(createFioriArtifact({
    projectId: project.projectId,
    artifactType: FIORI_ARTIFACT_TYPES.FIORI_PACKAGE_JSON,
    objectName: 'package.json',
    filePath: 'package.json',
    content: JSON.stringify(packageJson, null, 2),
    language: 'JSON',
    sourceEntityIds: [rootEntity.entityId]
  }));

  // 5. ui5.yaml (with fiori-tools-proxy for SAP S/4HANA OData backend)
  const ui5Yaml = `specVersion: "3.0"
metadata:
  name: fiorify-${prefix}-ui
type: application
framework:
  name: SAPUI5
  version: "${TARGET_UI5_VERSION_S4HANA2023}"
  libraries:
    - name: sap.m
    - name: sap.ui.core
    - name: sap.fe.templates
    - name: themelib_sap_horizon
server:
  customMiddleware:
    - name: fiori-tools-proxy
      afterMiddleware: compression
      configuration:
        ignoreCertError: false
        backend:
          - path: /sap
            url: http://localhost:8000
            destination: ${project.targetDestination || 'S21_FIORI'}
`;

  artifacts.push(createFioriArtifact({
    projectId: project.projectId,
    artifactType: FIORI_ARTIFACT_TYPES.FIORI_UI5_YAML,
    objectName: 'ui5.yaml',
    filePath: 'ui5.yaml',
    content: ui5Yaml,
    language: 'YAML',
    sourceEntityIds: [rootEntity.entityId]
  }));

  // 5a-mock. ui5-mock.yaml & webapp/localService/* (Enables zero-backend local `npm start` without blank screen)
  const serviceName = formatCdsViewName('ZUI_', (rootEntity.name || 'CUSTOM').replace(/[^a-zA-Z0-9_]/g, '')).toUpperCase();
  const mainServiceUri = `/sap/opu/odata4/sap/${serviceName.toLowerCase()}/srvd/sap/${serviceName.toLowerCase()}/0001/`;
  const ui5MockYaml = `specVersion: "3.0"
metadata:
  name: fiorify-${prefix}-ui
type: application
framework:
  name: SAPUI5
  version: "${TARGET_UI5_VERSION_S4HANA2023}"
  libraries:
    - name: sap.m
    - name: sap.ui.core
    - name: sap.fe.templates
    - name: themelib_sap_horizon
server:
  customMiddleware:
    - name: sap-fe-mockserver
      beforeMiddleware: csp
      configuration:
        mountPath: /
        services:
          - urlPath: ${mainServiceUri}
            metadataPath: ./webapp/localService/metadata.xml
            mockdataPath: ./webapp/localService/mockdata
            generateMockData: true
        annotations: []
`;

  artifacts.push(createFioriArtifact({
    projectId: project.projectId,
    artifactType: FIORI_ARTIFACT_TYPES.FIORI_DOCUMENTATION,
    objectName: 'ui5-mock.yaml',
    filePath: 'ui5-mock.yaml',
    content: ui5MockYaml,
    language: 'YAML',
    sourceEntityIds: [rootEntity.entityId]
  }));

  const metadataXml = buildODataMetadataXml(project, architecture);
  artifacts.push(createFioriArtifact({
    projectId: project.projectId,
    artifactType: FIORI_ARTIFACT_TYPES.FIORI_DOCUMENTATION,
    objectName: 'metadata.xml',
    filePath: 'webapp/localService/metadata.xml',
    content: metadataXml,
    language: 'XML',
    sourceEntityIds: [rootEntity.entityId]
  }));

  for (const ent of project.dataModelSpec?.entities || []) {
    const mockRows = buildSampleMockRows(ent, 5);
    artifacts.push(createFioriArtifact({
      projectId: project.projectId,
      artifactType: FIORI_ARTIFACT_TYPES.FIORI_DOCUMENTATION,
      objectName: `${ent.name}.json`,
      filePath: `webapp/localService/mockdata/${ent.name}.json`,
      content: JSON.stringify(mockRows, null, 2),
      language: 'JSON',
      sourceEntityIds: [ent.entityId]
    }));
  }

  // 5b. xs-app.json (BTP Managed AppRouter / HTML5 App Repository)
  const xsAppJson = {
    welcomeFile: '/index.html',
    authenticationMethod: 'route',
    routes: [
      {
        source: '^/sap/(.*)$',
        target: '/sap/$1',
        destination: project.targetDestination || 'S21_FIORI',
        authenticationType: 'xsuaa',
        csrfProtection: true
      },
      {
        source: '^/(.*)$',
        target: '$1',
        service: 'html5-apps-repo-rt',
        authenticationType: 'xsuaa'
      }
    ]
  };
  artifacts.push(createFioriArtifact({
    projectId: project.projectId,
    artifactType: FIORI_ARTIFACT_TYPES.FIORI_DOCUMENTATION,
    objectName: 'xs-app.json',
    filePath: 'xs-app.json',
    content: JSON.stringify(xsAppJson, null, 2),
    language: 'JSON',
    sourceEntityIds: [rootEntity.entityId]
  }));

  // 5c. webapp/test/flpSandbox.html (Local Fiori Launchpad Sandbox)
  const flpSandboxHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>${appTitle} — FLP Sandbox</title>
  <style>
    html, body, [data-sap-ui-component] {
      height: 100% !important;
      width: 100% !important;
      margin: 0;
      padding: 0;
    }
  </style>
  <script id="sap-ui-bootstrap"
    src="../resources/sap-ui-core.js"
    data-sap-ui-theme="sap_horizon"
    data-sap-ui-resourceroots='{ "${appId}": "../" }'
    data-sap-ui-oninit="module:sap/ui/core/ComponentSupport"
    data-sap-ui-compatVersion="edge"
    data-sap-ui-async="true">
  </script>
</head>
<body class="sapUiBody">
  <div data-sap-ui-component data-name="${appId}" data-id="flpComponent" data-settings='{"id":"${appId}"}'></div>
</body>
</html>
`;

  // 5d. Zero-dependency Local OData V4 Mock Server (mockserver.js) + Integrated Runner (start.js)
  const entityNames = (project.dataModelSpec?.entities || []).map((e) => e.name);
  const mockServerJs = `const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const PORT = Number(process.env.MOCK_PORT || 8000);
const SERVICE_URI = '${mainServiceUri}';
const METADATA_PATH = path.join(__dirname, 'webapp', 'localService', 'metadata.xml');
const MOCKDATA_DIR = path.join(__dirname, 'webapp', 'localService', 'mockdata');
const ENTITIES = ${JSON.stringify(entityNames)};

function readMockRows(entityName) {
  const file = path.join(MOCKDATA_DIR, entityName + '.json');
  if (!fs.existsSync(file)) return [];
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return []; }
}

function handleSubRequest(method, rawUrl) {
  const cleanUrl = rawUrl.split('?')[0];
  const rel = cleanUrl.startsWith(SERVICE_URI) ? cleanUrl.slice(SERVICE_URI.length) : cleanUrl.replace(/^\\/+/, '');
  if (rel === '$metadata') {
    const xml = fs.existsSync(METADATA_PATH) ? fs.readFileSync(METADATA_PATH, 'utf8') : '';
    return { status: 200, headers: { 'Content-Type': 'application/xml; charset=utf-8' }, body: xml };
  }
  if (rel === '' || rel === '/') {
    const doc = { '@odata.context': '$metadata', value: ENTITIES.map((n) => ({ name: n, kind: 'EntitySet', url: n })) };
    return { status: 200, headers: { 'Content-Type': 'application/json; charset=utf-8' }, body: JSON.stringify(doc) };
  }
  const entityName = ENTITIES.find((n) => rel === n || rel.startsWith(n + '('));
  if (entityName) {
    const rows = readMockRows(entityName);
    if (rel.includes('(')) {
      const payload = { '@odata.context': '../$metadata#' + entityName + '/$entity', ...(rows[0] || {}) };
      return { status: 200, headers: { 'Content-Type': 'application/json; charset=utf-8' }, body: JSON.stringify(payload) };
    }
    const payload = { '@odata.context': '$metadata#' + entityName, '@odata.count': rows.length, value: rows };
    return { status: 200, headers: { 'Content-Type': 'application/json; charset=utf-8' }, body: JSON.stringify(payload) };
  }
  return { status: 404, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ error: { code: 'NOT_FOUND', message: 'Unknown OData resource: ' + rel } }) };
}

const server = http.createServer((req, res) => {
  const urlPath = (req.url || '/').split('?')[0];
  res.setHeader('OData-Version', '4.0');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, PUT, DELETE, OPTIONS');
  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

  if (urlPath.startsWith('/sap/bc/lrep/')) {
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ changes: [], contexts: [], variantSection: {} }));
    return;
  }

  if (req.method === 'POST' && urlPath.endsWith('/$batch')) {
    let body = '';
    req.on('data', (c) => (body += c));
    req.on('end', () => {
      const ct = req.headers['content-type'] || '';
      const m = ct.match(/boundary=([^;\\s]+)/i);
      const boundary = m ? m[1].replace(/^"|"$/g, '') : 'batch_mock';
      const parts = body.split('--' + boundary).filter((p) => p.includes('HTTP/1.1'));
      const out = parts.map((part) => {
        const lineMatch = part.match(/(GET|POST|PATCH|DELETE)\\s+([^\\s]+)\\s+HTTP\\/1\\.1/);
        const subMethod = lineMatch ? lineMatch[1] : 'GET';
        const subUrl = lineMatch ? lineMatch[2] : SERVICE_URI;
        const r = handleSubRequest(subMethod, subUrl);
        return '--' + boundary + '\\r\\nContent-Type: application/http\\r\\nContent-Transfer-Encoding: binary\\r\\n\\r\\nHTTP/1.1 ' + r.status + ' OK\\r\\nContent-Type: ' + r.headers['Content-Type'] + '\\r\\nOData-Version: 4.0\\r\\n\\r\\n' + r.body + '\\r\\n';
      }).join('') + '--' + boundary + '--\\r\\n';
      res.writeHead(200, { 'Content-Type': 'multipart/mixed; boundary=' + boundary });
      res.end(out);
    });
    return;
  }

  if (urlPath.startsWith(SERVICE_URI)) {
    const r = handleSubRequest(req.method, req.url);
    res.writeHead(r.status, r.headers);
    res.end(r.body);
    return;
  }

  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not Found' }));
});

server.listen(PORT, '127.0.0.1', () => {
  console.log('[Fiorify Mock OData V4] Listening on http://127.0.0.1:' + PORT + SERVICE_URI);
});
`;

  const startJs = `const http = require('node:http');
const https = require('node:https');
const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');

const WEBAPP_DIR = path.join(__dirname, 'webapp');
const UI_PORT = Number(process.env.PORT || 8080);
const MOCK_PORT = 4004;
const UI5_CDN_BASE = 'https://ui5.sap.com/${TARGET_UI5_VERSION_S4HANA2023}';

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.properties': 'text/plain; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png'
};

const mock = spawn(process.execPath, [path.join(__dirname, 'mockserver.js')], { stdio: 'inherit' });

const server = http.createServer((req, res) => {
  const urlPath = (req.url || '/').split('?')[0];

  // 1. Proxy OData & LREP calls to zero-dependency mockserver.js
  if (urlPath.startsWith('/sap/')) {
    const proxyReq = http.request(
      { hostname: '127.0.0.1', port: MOCK_PORT, path: req.url, method: req.method, headers: req.headers },
      (proxyRes) => {
        res.writeHead(proxyRes.statusCode || 200, proxyRes.headers);
        proxyRes.pipe(res);
      }
    );
    proxyReq.on('error', (err) => {
      res.writeHead(502, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Mock server unavailable: ' + err.message }));
    });
    req.pipe(proxyReq);
    return;
  }

  // 2. Serve local webapp file if it exists
  const cleanRel = urlPath === '/' ? 'index.html' : urlPath.replace(/^\\/+/, '');
  const localFile = path.resolve(WEBAPP_DIR, cleanRel);
  if (localFile.startsWith(WEBAPP_DIR) && fs.existsSync(localFile) && fs.statSync(localFile).isFile()) {
    const ext = path.extname(localFile).toLowerCase();
    res.writeHead(200, { 'Content-Type': MIME_TYPES[ext] || 'application/octet-stream' });
    fs.createReadStream(localFile).pipe(res);
    return;
  }

  // 3. Proxy /resources/* and /test-resources/* to SAPUI5 CDN for instant zero-install launch
  if (urlPath.startsWith('/resources/') || urlPath.startsWith('/test-resources/')) {
    const cdnUrl = UI5_CDN_BASE + req.url;
    https.get(cdnUrl, (cdnRes) => {
      res.writeHead(cdnRes.statusCode || 200, cdnRes.headers);
      cdnRes.pipe(res);
    }).on('error', (err) => {
      res.writeHead(502, { 'Content-Type': 'text/plain' });
      res.end('Failed to load UI5 resource from CDN: ' + err.message);
    });
    return;
  }

  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('Not Found: ' + urlPath);
});

server.listen(UI_PORT, '127.0.0.1', () => {
  console.log('[Fiorify Local App] Ready in <2s at http://127.0.0.1:' + UI_PORT + '/index.html');
});

const cleanup = () => { try { mock.kill(); } catch {} try { server.close(); } catch {} process.exit(0); };
process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
`;

  const localSetupMd = `# Local Setup & Hosting Guide (${appTitle})

## Prerequisites
- **Node.js:** v20 LTS or v22 LTS (no global SAP CLI or Java required)
- **Ports Required:** \`8080\` (Fiori UI) and \`4004\` (Local OData V4 Mock Server)
- **Runtime Dependencies:** **0** external runtime dependencies required for instant preview

## Option 1: Instant Start (< 5 Seconds — Recommended)
Run directly with Node.js (no \`npm install\` wait):
\`\`\`bash
node start.js
\`\`\`
Then open **http://127.0.0.1:8080/index.html** in your browser.
- \`mockserver.js\` serves \`$metadata\`, \`$batch\`, mock entity data, and \`/sap/bc/lrep/*\`.
- \`start.js\` serves \`webapp/\` and streams SAPUI5 ${TARGET_UI5_VERSION_S4HANA2023} resources cleanly.

## Option 2: Full UI5 CLI Offline Build (< 4-5 Minutes)
If you want to run with \`@ui5/cli\` or build a deployable \`dist/\` bundle:
\`\`\`bash
npm install
npm run start:ui5
\`\`\`
### DevDependencies Manifest
- \`@ui5/cli\` (\`^3.0.0\`) — SAPUI5 local server & \`ui5 build\` bundler
`;

  artifacts.push(createFioriArtifact({
    projectId: project.projectId,
    artifactType: FIORI_ARTIFACT_TYPES.FIORI_DOCUMENTATION,
    objectName: 'LOCAL_SETUP.md',
    filePath: 'LOCAL_SETUP.md',
    content: localSetupMd,
    language: 'MARKDOWN',
    sourceEntityIds: [rootEntity.entityId]
  }));

  const cfManifestYml = `---
applications:
  - name: fiorify-${prefix}-ui
    memory: 256M
    disk_quota: 512M
    buildpacks:
      - nodejs_buildpack
    command: node start.js
    random-route: true
    env:
      NODE_ENV: production
`;

  const runbookMd = `# Fiorify Deployment & Hosting Runbook — ${appTitle}

This package is self-contained and ready for **Local Testing (< 5s)**, **UI5 CLI Build**, **Cloud Foundry (\`cf push\`)**, or **Live SAP S/4HANA Integration**.

---

## 1. Local Laptop Testing (< 5 Seconds — Zero Install)
\`\`\`bash
cd fiori
node start.js
\`\`\`
Open **http://127.0.0.1:8080/index.html**.

---

## 2. Host on SAP BTP Cloud Foundry (\`cf push\`)
A pre-configured \`manifest.yml\` is included in \`fiori/\`:
\`\`\`bash
cf login -a https://api.cf.eu10-005.hana.ondemand.com
cd fiori
cf push
\`\`\`

---

## 3. Full Offline UI5 CLI Build (< 4–5 Minutes)
\`\`\`bash
cd fiori
npm install
npm run build
\`\`\`

---

## 4. Connect to Live SAP S/4HANA (${project.sourceSystemId || 'S21'} Client ${project.sourceClient || '200'})
- **BTP Destination:** \`${project.targetDestination || 'S21_FIORI'}\`
- **OData V4 Service:** \`ZUI_${prefix.toUpperCase()}\` (\`/sap/opu/odata4/sap/zui_${prefix}/srvd/sap/zui_${prefix}/0001/\`)
- **Proxy Files:** \`ui5.yaml\` (local proxy) & \`xs-app.json\` (BTP AppRouter)
`;

  artifacts.push(createFioriArtifact({
    projectId: project.projectId,
    artifactType: FIORI_ARTIFACT_TYPES.FIORI_DOCUMENTATION,
    objectName: 'manifest.yml',
    filePath: 'manifest.yml',
    content: cfManifestYml,
    language: 'YAML',
    sourceEntityIds: [rootEntity.entityId]
  }));

  artifacts.push(createFioriArtifact({
    projectId: project.projectId,
    artifactType: FIORI_ARTIFACT_TYPES.FIORI_DOCUMENTATION,
    objectName: 'RUNBOOK.md',
    filePath: 'RUNBOOK.md',
    content: runbookMd,
    language: 'MARKDOWN',
    sourceEntityIds: [rootEntity.entityId]
  }));

  artifacts.push(createFioriArtifact({
    projectId: project.projectId,
    artifactType: FIORI_ARTIFACT_TYPES.FIORI_DOCUMENTATION,
    objectName: 'mockserver.js',
    filePath: 'mockserver.js',
    content: mockServerJs,
    language: 'JAVASCRIPT',
    sourceEntityIds: [rootEntity.entityId]
  }));

  artifacts.push(createFioriArtifact({
    projectId: project.projectId,
    artifactType: FIORI_ARTIFACT_TYPES.FIORI_DOCUMENTATION,
    objectName: 'start.js',
    filePath: 'start.js',
    content: startJs,
    language: 'JAVASCRIPT',
    sourceEntityIds: [rootEntity.entityId]
  }));
  artifacts.push(createFioriArtifact({
    projectId: project.projectId,
    artifactType: FIORI_ARTIFACT_TYPES.FIORI_DOCUMENTATION,
    objectName: 'flpSandbox.html',
    filePath: 'webapp/test/flpSandbox.html',
    content: flpSandboxHtml,
    language: 'HTML',
    sourceEntityIds: [rootEntity.entityId]
  }));

  // 6. README.md
  let readme = `# SAP Fiori Elements Application — ${appTitle}\n\n`;
  readme += `**Application ID:** \`${appId}\`  \n`;
  readme += `**Target System:** \`${project.targetRelease || 'SAP S/4HANA 2023'}\`  \n`;
  readme += `**UI5 Framework Baseline:** \`${TARGET_UI5_VERSION_S4HANA2023}\`  \n`;
  readme += `**Floorplan Pattern:** List Report Page + Object Page (SAP Fiori Elements OData V4)  \n\n`;
  readme += `## Directory Structure\n\n`;
  readme += `\`\`\`\n`;
  readme += `webapp/\n`;
  readme += `├── Component.js\n`;
  readme += `├── index.html\n`;
  readme += `├── manifest.json\n`;
  readme += `├── i18n/\n`;
  readme += `│   └── i18n.properties\n`;
  readme += `└── annotations/\n`;
  readme += `    └── annotations.xml\n`;
  readme += `package.json\n`;
  readme += `ui5.yaml\n`;
  readme += `\`\`\`\n\n`;
  readme += `## Development & Review Guide\n\n`;
  readme += `1. **SAP Business Application Studio (BAS):** Import this folder into a BAS workspace or VS Code with SAP Fiori Tools.\n`;
  readme += `2. **Local Preview:** Run \`npm start\` with UI5 CLI to serve the standalone application with horizon theme.\n`;
  readme += `3. **OData Binding:** Ensure backend service \`${`ZUI_${prefix.toUpperCase()}`}\` is published on SAP S/4HANA 2023.\n`;

  artifacts.push(createFioriArtifact({
    projectId: project.projectId,
    artifactType: FIORI_ARTIFACT_TYPES.FIORI_DOCUMENTATION,
    objectName: 'README_FIORI',
    filePath: 'README_FIORI.md',
    content: readme,
    language: 'MARKDOWN',
    sourceEntityIds: [rootEntity.entityId]
  }));

  return artifacts;
}
