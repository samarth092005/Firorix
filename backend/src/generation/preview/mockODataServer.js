/**
 * Fiorify — GEN-07: In-Process Mock OData V4 HTTP Server
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
import { buildInteractiveFioriPreviewHtml } from './fioriHorizonTemplate.js';

export { buildInteractiveFioriPreviewHtml };

export const PREVIEW_WATERMARK_HTML = '';

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
      const extServiceBase = project.projectId
        ? `/api/v1/generation/projects/${project.projectId}/preview/content/odata/v4/service`
        : serviceBasePath;
      content = buildInteractiveFioriPreviewHtml(project, extServiceBase);
    }
    if (PREVIEW_WATERMARK_HTML) {
      if (content.includes('</body>')) {
        content = content.replace('</body>', `${PREVIEW_WATERMARK_HTML}</body>`);
      } else {
        content = `${PREVIEW_WATERMARK_HTML}${content}`;
      }
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

// Note: buildInteractiveFioriPreviewHtml is imported from ./fioriHorizonTemplate.js and re-exported.

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
