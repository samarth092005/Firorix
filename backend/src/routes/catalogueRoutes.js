import { sanitizeErrorMessage } from '../adapters/btpDestinationAdapter.js';
import { USER_ROLES } from '../services/authService.js';

const MAX_IMPORT_BODY_SIZE = 10 * 1024 * 1024; // 10MB body limit for catalogue exports

/**
 * SAP Fiori Apps Reference Library (FAL) Catalogue HTTP Routes
 *
 * @param {import('node:http').IncomingMessage} req
 * @param {import('node:http').ServerResponse} res
 * @param {URL} url
 * @param {object} context
 * @returns {Promise<boolean>} True if handled, false otherwise
 */
export async function handleCatalogueRoutes(req, res, url, context = {}) {
  const {
    checkAdminAuth,
    requireRole,
    catalogueAdapter: officialCatalogueAdapter,
    gatewayAdapter,
    falIngestionService
  } = context;

  // 1. Get Application by ID
  if (req.method === 'GET' && url.pathname.startsWith('/api/v1/fiori-catalogue/apps/')) {
    const appId = decodeURIComponent(url.pathname.slice('/api/v1/fiori-catalogue/apps/'.length));
    const refresh = url.searchParams.get('refresh') === 'true';

    if (refresh && !checkAdminAuth()) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          success: false,
          statusCode: 'UNAUTHORIZED',
          errorMessage: 'Access denied: Valid administrative secret required for catalogue refresh.'
        }, null, 2)
      );
      return true;
    }

    try {
      const result = await officialCatalogueAdapter.getAppById(appId, { refresh });
      res.writeHead(result.httpStatus || (result.success ? 200 : 404), { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(result, null, 2));
    } catch (err) {
      const sanitized = sanitizeErrorMessage(err.message || 'Failed to retrieve application from official catalogue');
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, statusCode: 'INTERNAL_ERROR', errorMessage: sanitized }, null, 2));
    }
    return true;
  }

  // 2. Multi-Criteria Search
  if (req.method === 'GET' && (url.pathname === '/api/v1/fiori-catalogue/search' || url.pathname === '/api/v1/fiori-catalogue/apps')) {
    const refresh = url.searchParams.get('refresh') === 'true';
    const evaluateLive = url.searchParams.get('evaluateLive') === 'true';

    if ((refresh || evaluateLive) && !checkAdminAuth()) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          success: false,
          statusCode: 'UNAUTHORIZED',
          errorMessage: 'Access denied: Valid administrative secret required for live evaluation or refresh.'
        }, null, 2)
      );
      return true;
    }

    const tcode = url.searchParams.get('tcode') || '';
    const appId = url.searchParams.get('appId') || '';
    const appName = url.searchParams.get('appName') || '';
    const businessProcess = url.searchParams.get('businessProcess') || '';
    const lineOfBusiness = url.searchParams.get('lineOfBusiness') || '';
    const appType = url.searchParams.get('appType') || '';
    const productVersion = url.searchParams.get('productVersion') || '';
    const productSuite = url.searchParams.get('productSuite') || '';
    const uiTechnology = url.searchParams.get('uiTechnology') || '';
    const odataService = url.searchParams.get('odataService') || '';
    const query = url.searchParams.get('query') || '';
    const limit = url.searchParams.has('limit') ? Number(url.searchParams.get('limit')) : undefined;
    const page = url.searchParams.has('page') ? Number(url.searchParams.get('page')) : undefined;
    const pageSize = url.searchParams.has('pageSize') ? Number(url.searchParams.get('pageSize')) : undefined;
    const offset = url.searchParams.has('offset') ? Number(url.searchParams.get('offset')) : undefined;

    try {
      const searchResult = await officialCatalogueAdapter.searchApps({
        tcode,
        appId,
        appName,
        businessProcess,
        lineOfBusiness,
        appType,
        productVersion,
        productSuite,
        uiTechnology,
        odataService,
        query,
        limit: limit ?? (pageSize ?? 20),
        page: page ?? 1,
        pageSize,
        offset,
        refresh
      });

      if (evaluateLive && searchResult.success && searchResult.candidates.length > 0) {
        const catalogResult = await gatewayAdapter.getCatalogServices();
        const liveServices = catalogResult.services || [];
        const evaluation = officialCatalogueAdapter.evaluateCandidateMatches({
          tcode: tcode || query,
          candidateApps: searchResult.candidates,
          liveGatewayServices: liveServices
        });

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(
          JSON.stringify(
            {
              ...searchResult,
              evaluatedMatches: evaluation
            },
            null,
            2
          )
        );
        return true;
      }

      const payload = {
        ...searchResult,
        apps: searchResult.candidates || []
      };
      res.writeHead(searchResult.httpStatus || (searchResult.success ? 200 : 502), { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(payload, null, 2));
    } catch (err) {
      const sanitized = sanitizeErrorMessage(err.message || 'Failed to search official catalogue');
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, statusCode: 'INTERNAL_ERROR', errorMessage: sanitized }, null, 2));
    }
    return true;
  }

  // 3. Ingest FAL Export
  if (req.method === 'POST' && url.pathname === '/api/v1/fiori-catalogue/import') {
    if (!checkAdminAuth()) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          success: false,
          statusCode: 'UNAUTHORIZED',
          errorMessage: 'Access denied: Valid administrative secret required.'
        }, null, 2)
      );
      return true;
    }

    const dryRunParam = url.searchParams.get('dryRun') === 'true';
    const sourceVersionParam = url.searchParams.get('sourceVersion') || undefined;

    let body = '';
    let bodyLength = 0;
    let isAborted = false;

    req.on('data', (chunk) => {
      if (isAborted) return;
      bodyLength += chunk.length;
      if (bodyLength > MAX_IMPORT_BODY_SIZE) {
        isAborted = true;
        req.pause();
        res.writeHead(413, { 'Content-Type': 'application/json', 'Connection': 'close' });
        res.end(
          JSON.stringify({
            success: false,
            statusCode: 'PAYLOAD_TOO_LARGE',
            error: 'Payload Too Large',
            errorMessage: `Import file exceeds maximum allowed size of ${MAX_IMPORT_BODY_SIZE / (1024 * 1024)}MB.`,
            message: `Import file exceeds maximum allowed size of ${MAX_IMPORT_BODY_SIZE / (1024 * 1024)}MB.`
          })
        );
        req.destroy();
        return;
      }
      body += chunk;
    });

    await new Promise((resolve) => req.on('end', resolve));
    if (isAborted) return true;

    const contentType = (req.headers['content-type'] || '').toLowerCase();
    let inputData = body;
    let format = 'auto';
    let dryRun = dryRunParam;
    let sourceVersion = sourceVersionParam;

    if (contentType.includes('application/json')) {
      format = 'json';
      try {
        const parsed = JSON.parse(body || '{}');
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed) && (parsed.data || parsed.records || parsed.apps)) {
          inputData = parsed.data || parsed.records || parsed.apps;
          if (parsed.format) format = parsed.format;
          if (parsed.dryRun !== undefined) dryRun = Boolean(parsed.dryRun);
          if (parsed.sourceVersion) sourceVersion = parsed.sourceVersion;
        } else {
          inputData = parsed;
        }
      } catch (jsonErr) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(
          JSON.stringify({
            success: false,
            statusCode: 'BAD_REQUEST',
            error: 'Bad Request',
            errorMessage: `Malformed JSON import payload: ${jsonErr.message}`,
            message: `Malformed JSON import payload: ${jsonErr.message}`
          })
        );
        return true;
      }
    } else if (contentType.includes('text/csv') || contentType.includes('application/csv')) {
      format = 'csv';
    }

    try {
      const summary = await falIngestionService.ingest(inputData, {
        format,
        dryRun,
        sourceVersion
      });

      res.writeHead(dryRun ? 200 : 201, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify(
          {
            success: true,
            statusCode: dryRun ? 'PREVIEW_SUCCESS' : 'IMPORT_SUCCESS',
            dryRun,
            summary
          },
          null,
          2
        )
      );
    } catch (err) {
      if (err.code === 'PARSE_ERROR' || err.message?.includes('Malformed') || err.message?.includes('empty') || err.message?.includes('invalid')) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(
          JSON.stringify({
            success: false,
            statusCode: 'BAD_REQUEST',
            error: 'Bad Request',
            errorMessage: err.message,
            message: err.message
          })
        );
        return true;
      }

      const sanitized = sanitizeErrorMessage(err.message || 'Import execution failed');
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          success: false,
          statusCode: 'INTERNAL_ERROR',
          error: 'Internal Server Error',
          errorMessage: `Catalogue import failed: ${sanitized}`,
          message: `Catalogue import failed: ${sanitized}`
        })
      );
    }
    return true;
  }

  // 4. Catalogue Status and Health
  if (req.method === 'GET' && url.pathname === '/api/v1/fiori-catalogue/status') {
    try {
      const status = await falIngestionService.getStatus();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify(
          {
            success: true,
            status
          },
          null,
          2
        )
      );
    } catch (err) {
      const sanitized = sanitizeErrorMessage(err.message || 'Failed to retrieve catalogue status');
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          success: false,
          statusCode: 'INTERNAL_ERROR',
          errorMessage: sanitized
        })
      );
    }
    return true;
  }

  // 5. Controlled Catalogue Synchronization
  if (req.method === 'POST' && url.pathname === '/api/v1/fiori-catalogue/sync') {
    if (!requireRole([USER_ROLES.ADMIN])) return true;

    let body = '';
    req.on('data', (c) => (body += c));
    await new Promise((resolve) => req.on('end', resolve));

    let payload = {};
    if (body.trim().length > 0) {
      try {
        payload = JSON.parse(body);
      } catch {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, statusCode: 'BAD_REQUEST', errorMessage: 'Malformed JSON payload.' }));
        return true;
      }
    }

    try {
      const syncSummary = await officialCatalogueAdapter.syncCatalogue(payload.records || [], {
        dryRun: payload.dryRun !== false,
        commit: payload.commit === true
      });
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, ...syncSummary }, null, 2));
    } catch (syncErr) {
      const sanitized = sanitizeErrorMessage(syncErr.message || 'Failed to sync catalogue');
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, statusCode: 'INTERNAL_ERROR', errorMessage: sanitized }));
    }
    return true;
  }

  // 6. Safe Catalogue Rollback
  if (req.method === 'POST' && url.pathname === '/api/v1/fiori-catalogue/rollback') {
    if (!checkAdminAuth()) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          success: false,
          statusCode: 'UNAUTHORIZED',
          errorMessage: 'Access denied: Valid administrative secret required.'
        }, null, 2)
      );
      return true;
    }

    let body = '';
    req.on('data', (c) => (body += c));
    await new Promise((resolve) => req.on('end', resolve));

    let payload = {};
    if (body.trim().length > 0) {
      try {
        payload = JSON.parse(body);
      } catch {
        // Optional payload
      }
    }

    try {
      const backupFile = payload.backupFile || null;
      const rollbackResult = await falIngestionService.rollback(backupFile);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, message: 'Catalogue successfully rolled back.', rollbackResult }, null, 2));
    } catch (rollbackErr) {
      const sanitized = sanitizeErrorMessage(rollbackErr.message || 'Catalogue rollback failed');
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, statusCode: 'INTERNAL_ERROR', errorMessage: sanitized }, null, 2));
    }
    return true;
  }

  return false;
}
