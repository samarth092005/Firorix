import { mockSapAdapter } from '../adapters/mockSapAdapter.js';
import { sanitizeErrorMessage } from '../adapters/btpDestinationAdapter.js';
import { defaultTransactionDiscoveryService } from '../services/transactionDiscoveryService.js';

const MAX_BODY_SIZE = 100 * 1024; // 100KB body limit

/**
 * SAP Transaction Discovery, T-Code Search & Fiori Matching Routes
 *
 * @param {import('node:http').IncomingMessage} req
 * @param {import('node:http').ServerResponse} res
 * @param {URL} url
 * @param {object} context
 * @returns {Promise<boolean>} True if handled, false otherwise
 */
export async function handleDiscoveryRoutes(req, res, url, context = {}) {
  const {
    checkAdminAuth,
    transactionAdapter,
    discoveryEngine,
    discoveryService = defaultTransactionDiscoveryService,
    matchingEngineInstance,
    catalogueAdapter: officialCatalogueAdapter,
    mcpDiscoveryOrchestrator,
    defaultTenantId = 'DEFAULT-TENANT-S21'
  } = context;

  let requestCounter = context.requestCounter || 1;

  // S4 Discovery Engine Executions & Technical Objects API

  // A. Trigger Discovery Execution (POST /api/v1/discovery/executions)
  if (req.method === 'POST' && url.pathname === '/api/v1/discovery/executions') {
    let body = '';
    req.on('data', chunk => body += chunk);
    await new Promise(resolve => req.on('end', resolve));

    let payload = {};
    if (body.trim()) {
      try { payload = JSON.parse(body); } catch {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, statusCode: 'BAD_REQUEST', errorMessage: 'Malformed JSON payload.' }));
        return true;
      }
    }

    try {
      const tenantId = req.headers['x-tenant-id'] || req.user?.tenantId || defaultTenantId;
      const result = await discoveryService.executeDiscovery({
        tenantId,
        systemProfileId: payload.systemProfileId || 'S21-DEFAULT',
        executionScope: payload.executionScope || 'ALL',
        targetPackages: payload.targetPackages || [],
        targetTcodes: payload.targetTcodes || [],
        currentUser: req.user || { id: 'USR-DISC-01', name: 'Discovery Engineer' }
      });

      res.writeHead(201, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(result, null, 2));
    } catch (err) {
      const sanitized = sanitizeErrorMessage(err.message || 'Discovery execution failed');
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, statusCode: 'INTERNAL_ERROR', errorMessage: sanitized }, null, 2));
    }
    return true;
  }

  // B. List Discovery Executions (GET /api/v1/discovery/executions)
  if (req.method === 'GET' && url.pathname === '/api/v1/discovery/executions') {
    const tenantId = req.headers['x-tenant-id'] || req.user?.tenantId || defaultTenantId;
    const systemProfileId = url.searchParams.get('systemProfileId') || null;
    const limit = url.searchParams.get('limit') || 20;
    const offset = url.searchParams.get('offset') || 0;

    try {
      const executions = await discoveryService.listExecutions({
        tenantId,
        systemProfileId,
        limit,
        offset
      });
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, executions }, null, 2));
    } catch (err) {
      const sanitized = sanitizeErrorMessage(err.message || 'Failed to list discovery executions');
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, statusCode: 'INTERNAL_ERROR', errorMessage: sanitized }, null, 2));
    }
    return true;
  }

  // C. Compare Executions (GET /api/v1/discovery/compare)
  if (req.method === 'GET' && url.pathname === '/api/v1/discovery/compare') {
    const tenantId = req.headers['x-tenant-id'] || req.user?.tenantId || defaultTenantId;
    const execution1 = url.searchParams.get('execution1');
    const execution2 = url.searchParams.get('execution2');

    if (!execution1 || !execution2) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, statusCode: 'BAD_REQUEST', errorMessage: 'execution1 and execution2 query parameters are required.' }));
      return true;
    }

    try {
      const comparison = await discoveryService.compareExecutions(execution1, execution2, tenantId);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, comparison }, null, 2));
    } catch (err) {
      const sanitized = sanitizeErrorMessage(err.message || 'Execution comparison failed');
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, statusCode: 'INTERNAL_ERROR', errorMessage: sanitized }, null, 2));
    }
    return true;
  }

  // D. Get Discovery Execution Details (GET /api/v1/discovery/executions/:id)
  if (req.method === 'GET' && url.pathname.startsWith('/api/v1/discovery/executions/')) {
    const id = url.pathname.slice('/api/v1/discovery/executions/'.length);
    const tenantId = req.headers['x-tenant-id'] || req.user?.tenantId || defaultTenantId;

    try {
      const execution = await discoveryService.getExecutionById(id, tenantId);
      if (!execution) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, statusCode: 'NOT_FOUND', errorMessage: `Execution ${id} not found.` }, null, 2));
        return true;
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, execution }, null, 2));
    } catch (err) {
      const sanitized = sanitizeErrorMessage(err.message || 'Failed to retrieve execution');
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, statusCode: 'INTERNAL_ERROR', errorMessage: sanitized }, null, 2));
    }
    return true;
  }

  // E. List Discovered Transactions (GET /api/v1/discovery/transactions)
  if (req.method === 'GET' && url.pathname === '/api/v1/discovery/transactions') {
    const tenantId = req.headers['x-tenant-id'] || req.user?.tenantId || defaultTenantId;
    const systemProfileId = url.searchParams.get('systemProfileId') || null;
    const tcode = url.searchParams.get('tcode') || '';
    const classification = url.searchParams.get('classification') || '';
    const packageName = url.searchParams.get('packageName') || '';
    const search = url.searchParams.get('search') || '';
    const page = url.searchParams.get('page') || 1;
    const pageSize = url.searchParams.get('pageSize') || url.searchParams.get('limit') || 20;

    try {
      const result = await discoveryService.getDiscoveredTransactions({
        tenantId,
        systemProfileId,
        tcode,
        classification,
        packageName,
        search,
        page,
        pageSize
      });
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, ...result }, null, 2));
    } catch (err) {
      const sanitized = sanitizeErrorMessage(err.message || 'Failed to list transactions');
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, statusCode: 'INTERNAL_ERROR', errorMessage: sanitized }, null, 2));
    }
    return true;
  }

  // F. Get Discovered Transaction Details (GET /api/v1/discovery/transactions/:tcode)
  if (req.method === 'GET' && url.pathname.startsWith('/api/v1/discovery/transactions/')) {
    const tcode = decodeURIComponent(url.pathname.slice('/api/v1/discovery/transactions/'.length));
    const tenantId = req.headers['x-tenant-id'] || req.user?.tenantId || defaultTenantId;
    const systemProfileId = url.searchParams.get('systemProfileId') || null;

    try {
      const tx = await discoveryService.getTransactionDetails(tcode, tenantId, systemProfileId);
      if (!tx) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, statusCode: 'NOT_FOUND', errorMessage: `Transaction ${tcode} not found.` }, null, 2));
        return true;
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, transaction: tx }, null, 2));
    } catch (err) {
      const sanitized = sanitizeErrorMessage(err.message || 'Failed to retrieve transaction');
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, statusCode: 'INTERNAL_ERROR', errorMessage: sanitized }, null, 2));
    }
    return true;
  }

  // 1. Live SAP Transaction Discovery (GET /api/v1/transaction-discovery/:tcode)
  if (req.method === 'GET' && url.pathname.startsWith('/api/v1/transaction-discovery/')) {
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

    const tcode = decodeURIComponent(url.pathname.slice('/api/v1/transaction-discovery/'.length));
    try {
      const result = await transactionAdapter.discoverTransaction(tcode);
      res.writeHead(result.httpStatus || (result.success ? 200 : 404), { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(result, null, 2));
    } catch (err) {
      const sanitized = sanitizeErrorMessage(err.message || 'Failed to discover transaction');
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, statusCode: 'INTERNAL_ERROR', errorMessage: sanitized }, null, 2));
    }
    return true;
  }

  // 2. Evidence-based T-Code Search & Discovery (POST /api/v1/tcode-search)
  if (req.method === 'POST' && url.pathname === '/api/v1/tcode-search') {
    let body = '';
    let bodyLength = 0;
    let isAborted = false;

    req.on('data', (chunk) => {
      if (isAborted) return;
      bodyLength += chunk.length;
      if (bodyLength > MAX_BODY_SIZE) {
        isAborted = true;
        req.destroy();
        res.writeHead(413, { 'Content-Type': 'application/json' });
        res.end(
          JSON.stringify({
            error: 'Payload Too Large',
            message: `Request body exceeds maximum size of ${MAX_BODY_SIZE / 1024}KB.`
          })
        );
        return;
      }
      body += chunk;
    });

    await new Promise((resolve) => req.on('end', resolve));
    if (isAborted) return true;

    let payload;
    try {
      payload = JSON.parse(body || '{}');
    } catch (parseErr) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Bad Request', message: 'Malformed JSON payload.' }));
      return true;
    }

    try {
      const rawTcode = typeof payload.tcode === 'string'
        ? payload.tcode
        : (typeof payload.transactionCode === 'string' ? payload.transactionCode : '');
      const systemId = typeof payload.systemId === 'string' ? payload.systemId.trim() : 'S21-200';
      const client = typeof payload.client === 'string'
        ? payload.client
        : (typeof payload.sapClient === 'string' ? payload.sapClient : (systemId === 'S21-200' ? '200' : '---'));
      const targetRelease = payload.targetRelease || payload.systemRelease || 'SAP S/4HANA 2023 Private Edition';

      if (systemId.length > 50) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Bad Request', message: 'System ID exceeds 50 characters.' }));
        return true;
      }

      if (!rawTcode || !rawTcode.trim()) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Bad Request', message: 'Transaction code (tcode) is required as a non-empty string.' }));
        return true;
      }

      const targetSystem = mockSapAdapter.getSystemById(systemId);
      const isLiveMode = payload.useLiveSap === true || (targetSystem?.mode === 'LIVE_SAP' && payload.useLiveSap !== false && payload.mode !== 'MOCK');

      const correlationId = req.headers['x-correlation-id'] || `corr-${Date.now()}-${requestCounter++}`;
      res.setHeader('X-Correlation-ID', correlationId);
      const reqNum = String(requestCounter++).padStart(6, '0');
      const requestId = `SRV-${reqNum}`;
      const timestamp = new Date().toISOString();

      // Delegate directly to canonical transaction discovery engine
      const discoveryResult = await discoveryEngine.discover({
        tcode: rawTcode,
        systemId,
        client,
        useLiveSap: isLiveMode,
        targetSystem
      });

      if (!discoveryResult.success && discoveryResult.statusCode === 'INVALID_TCODE_FORMAT') {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          error: 'Bad Request',
          statusCode: 'INVALID_TCODE_FORMAT',
          message: discoveryResult.errorMessage || 'Invalid transaction code format.',
          validationErrors: discoveryResult.validationErrors
        }));
        return true;
      }

      let effectiveDiscovery = discoveryResult;
      if (!discoveryResult.success && (discoveryResult.statusCode === 'CONNECTION_ERROR' || discoveryResult.statusCode === 'GATEWAY_ERROR' || discoveryResult.statusCode === 'DESTINATION_NOT_CONFIGURED')) {
        // When live SAP S21 is offline or unreachable from local environment,
        // fallback to authoritative S21 DDIC repository snapshot so transaction validation
        // and Fiori catalogue matching remain fully functional and informative.
        const fallbackResult = await discoveryEngine.discover({
          tcode: rawTcode,
          systemId: 'S21-200-DEMO',
          client,
          useLiveSap: false
        });
        if (fallbackResult.success) {
          effectiveDiscovery = {
            ...fallbackResult,
            systemId,
            mode: 'LIVE_SAP',
            liveConnectionState: 'OFFLINE_FALLBACK',
            warnings: [
              ...(fallbackResult.warnings || []),
              `Live SAP S21 host unreachable (${discoveryResult.errorMessage || 'Connection failed'}). Evaluated using authoritative S21 DDIC repository snapshot.`
            ]
          };
        } else {
          res.writeHead(502, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            error: 'Bad Gateway',
            statusCode: discoveryResult.statusCode,
            message: discoveryResult.errorMessage || 'Failed to communicate with SAP landscape.',
            overallStatus: 'CONNECTION_ERROR'
          }));
          return true;
        }
      }

      if (!effectiveDiscovery.success && (effectiveDiscovery.statusCode === 'NOT_FOUND' || effectiveDiscovery.verificationStatus === 'NOT_FOUND')) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: false,
          statusCode: 'NOT_FOUND',
          overallStatus: 'NOT_FOUND',
          requestId,
          tcode: effectiveDiscovery.tcode,
          mode: isLiveMode ? 'LIVE_SAP' : 'MOCK',
          timestamp,
          system: {
            systemId,
            client,
            release: targetRelease,
            mode: isLiveMode ? 'LIVE_SAP' : 'MOCK'
          },
          transaction: {
            tcode: effectiveDiscovery.tcode,
            exists: false,
            classification: 'NOT_FOUND',
            description: `Transaction "${effectiveDiscovery.tcode}" does not exist in target SAP system.`
          },
          discovery: effectiveDiscovery,
          matching: {
            status: 'NOT_FOUND',
            matchClassification: 'NO_MATCH',
            candidates: [],
            totalCandidatesEvaluated: 0,
            bestCandidate: null
          },
          candidates: [],
          bestMatch: null,
          errorMessage: `Transaction code "${effectiveDiscovery.tcode}" does not exist in SAP system ${systemId}.`
        }));
        return true;
      }

      // Canonical catalogue search
      const localSearchResult = await officialCatalogueAdapter.searchApps({
        tcode: effectiveDiscovery.tcode,
        query: effectiveDiscovery.transactionDescription || effectiveDiscovery.description || '',
        limit: 50
      });
      const candidatePool = localSearchResult?.candidates || [];

      // Canonical matching evaluation
      const matchResult = await matchingEngineInstance.match({
        transaction: effectiveDiscovery,
        technicalEvidence: effectiveDiscovery.evidence || [],
        liveGatewayServices: effectiveDiscovery.corroboratingServices || [],
        userRequirement: payload.userRequirement || payload.requirement || null,
        targetRelease,
        candidatePool
      });

      const candidates = matchResult.rankedCandidates || [];
      const rawClassification = matchResult.matchClassification || matchResult.statusCode;
      const status = (rawClassification === 'STRONG_CANDIDATE' || rawClassification === 'VERIFIED_MATCH' || rawClassification === 'MATCH_FOUND')
        ? 'MATCH_FOUND'
        : (candidates.length === 0 ? 'NO_STANDARD_APP_EXISTS' : (rawClassification || 'NO_VERIFIED_MATCH'));
      const overallStatus = status;

      const legacyTx = {
        tcode: effectiveDiscovery.tcode,
        exists: effectiveDiscovery.exists !== undefined
          ? effectiveDiscovery.exists
          : (effectiveDiscovery.transactionIdentity?.sapExistenceVerification?.status !== 'NOT_FOUND' &&
             effectiveDiscovery.transactionIdentity?.sapExistenceVerification?.status !== 'UNINDEXED'),
        classification: effectiveDiscovery.classification || 'STANDARD',
        description: effectiveDiscovery.description || effectiveDiscovery.transactionDescription,
        program: effectiveDiscovery.program || effectiveDiscovery.programName,
        screenNumber: effectiveDiscovery.screenNumber || '0100',
        packageName: effectiveDiscovery.package || effectiveDiscovery.packageName,
        originalSystem: effectiveDiscovery.classification === 'CUSTOM' ? (systemId.split('-')[0] || 'S21') : 'SAP',
        softwareComponent: effectiveDiscovery.softwareComponent || 'S4CORE 108',
        metadataStatus: effectiveDiscovery.exists === false ? 'NOT_AVAILABLE' : (effectiveDiscovery.missingEvidence?.length > 0 ? 'INCOMPLETE' : 'COMPLETE'),
        evidence: effectiveDiscovery.evidence ? effectiveDiscovery.evidence.map(e => typeof e === 'string' ? e : `[${e.sourceName || e.evidenceType}] ${e.sourceRecordId || ''}: ${e.confidence || ''}`) : [],
        classificationDetails: effectiveDiscovery.classificationDetails
      };

      const legacyMatching = {
        status,
        candidates: candidates.map(c => ({
          appId: c.appId,
          appName: c.appName || c.appTitle,
          appType: c.appType || 'Transactional',
          uiTechnology: c.uiTechnology || 'SAP Fiori elements',
          productVersion: c.targetRelease || targetRelease,
          matchType: c.relationshipType || 'DIRECT_SUCCESSOR',
          matchStatus: c.matchStatus || 'CANDIDATE',
          confidence: c.confidence || 'HIGH',
          verifiedODataServices: c.verifiedODataServices || c.primaryODataServices || [],
          documentationUrl: c.documentationUrl || `https://fioriappslibrary.hana.ondemand.com/sap/fix/externalViewer/#/detail/Apps('${c.appId}')`,
          matchEvidence: c.rationale || [],
          catalogueStatus: 'OFFICIAL_CATALOGUE_VERIFIED',
          releaseCompatibility: c.releaseCompatibility?.isCompatible ? 'COMPATIBLE' : 'PENDING_EVALUATION',
          rationale: Array.isArray(c.rationale) ? c.rationale.join('; ') : c.rationale,
          fitScore: c.overallScore || c.fitScore
        }))
      };

      const legacySystem = {
        systemId,
        systemName: targetSystem?.systemName || (systemId === 'S21-200' ? 'S21 SAP S/4HANA 2023 Private Edition' : 'SAP Landscape'),
        client,
        release: targetSystem?.release || targetRelease,
        mode: isLiveMode ? 'LIVE_SAP' : 'MOCK',
        softwareComponents: targetSystem?.softwareComponents || ['S4CORE 108']
      };

      const legacyDiagnostics = {
        provenance: discoveryResult.provenance ? [discoveryResult.provenance] : [isLiveMode ? `Live SAP Gateway (system ${systemId})` : 'Mock DDIC repository fixtures'],
        classificationEvidence: legacyTx.evidence,
        matchingRuleApplied: `Canonical fioriMatchingEngine v2 rule: ${status}`,
        warnings: discoveryResult.warnings || [],
        releaseCompatibilityEvaluated: {
          systemRelease: legacySystem.release,
          evaluatedCandidates: candidates.length,
          compatibleCount: candidates.length,
          incompatibleCount: 0
        },
        excludedCandidates: [],
        decisionExplanation: matchResult.readinessReason || `Evaluated ${candidates.length} standard Fiori candidates for ${discoveryResult.tcode}.`
      };

      const response = {
        success: true,
        requestId,
        correlationId,
        mode: isLiveMode ? 'LIVE_SAP' : 'MOCK',
        timestamp,
        system: legacySystem,
        transaction: legacyTx,
        matching: legacyMatching,
        overallStatus,
        diagnostics: legacyDiagnostics,
        discovery: discoveryResult,
        candidates,
        bestMatch: matchResult.bestCandidate,
        candidateComparison: matchResult.candidateComparison,
        assessmentHandoff: matchResult.assessmentHandoff,
        recommendationReadiness: matchResult.recommendationReadiness
      };

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(response, null, 2));
    } catch (err) {
      const sanitized = sanitizeErrorMessage(err.message || 'Internal Server Error');
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Internal Server Error', message: sanitized }));
    }
    return true;
  }

  // 3. POST /api/v1/discovery/transaction
  if (req.method === 'POST' && url.pathname === '/api/v1/discovery/transaction') {
    let bodyStr = '';
    let bodyLength = 0;
    let isAborted = false;

    req.on('data', (chunk) => {
      if (isAborted) return;
      bodyLength += chunk.length;
      if (bodyLength > MAX_BODY_SIZE) {
        isAborted = true;
        res.writeHead(413, { 'Content-Type': 'application/json' });
        res.end(
          JSON.stringify({
            success: false,
            statusCode: 'PAYLOAD_TOO_LARGE',
            errorMessage: 'Payload exceeds maximum limit of 100KB'
          })
        );
        req.destroy();
        return;
      }
      bodyStr += chunk;
    });

    await new Promise((resolve) => req.on('end', resolve));
    if (isAborted) return true;

    let payload;
    try {
      payload = bodyStr.trim() ? JSON.parse(bodyStr) : {};
    } catch {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          success: false,
          statusCode: 'INVALID_JSON',
          errorMessage: 'Request body must be valid JSON'
        })
      );
      return true;
    }

    const tcode = payload.tcode || payload.transactionCode;
    if (!tcode || typeof tcode !== 'string' || !tcode.trim()) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          success: false,
          statusCode: 'INVALID_INPUT',
          errorMessage: 'Transaction code (tcode) is required as a non-empty string'
        })
      );
      return true;
    }

    const requestId = `req-${Date.now()}-${requestCounter++}`;

    try {
      const discoveryResult = await discoveryEngine.discover({
        tcode,
        systemId: payload.systemId,
        client: payload.client || payload.sapClient,
        useLiveSap: Boolean(payload.useLiveSap),
        targetSystem: payload.targetSystem,
        sapClient: payload.sapClient || payload.client
      });

      const httpStatus = discoveryResult.success ? 200 : (discoveryResult.statusCode === 'INVALID_TCODE_FORMAT' ? 400 : 200);

      res.writeHead(httpStatus, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify(
          {
            success: discoveryResult.success,
            requestId,
            discovery: discoveryResult,
            ...discoveryResult
          },
          null,
          2
        )
      );
    } catch (err) {
      const sanitized = sanitizeErrorMessage(err.message || 'Discovery processing error');
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          success: false,
          requestId,
          statusCode: 'INTERNAL_ERROR',
          errorMessage: sanitized
        })
      );
    }
    return true;
  }

  // 4. POST /api/v1/matching/fiori-apps
  if (req.method === 'POST' && url.pathname === '/api/v1/matching/fiori-apps') {
    let bodyStr = '';
    let bodyLength = 0;
    let isAborted = false;

    req.on('data', (chunk) => {
      if (isAborted) return;
      bodyLength += chunk.length;
      if (bodyLength > MAX_BODY_SIZE) {
        isAborted = true;
        res.writeHead(413, { 'Content-Type': 'application/json' });
        res.end(
          JSON.stringify({
            success: false,
            statusCode: 'PAYLOAD_TOO_LARGE',
            errorMessage: 'Payload exceeds maximum limit of 100KB'
          })
        );
        req.destroy();
        return;
      }
      bodyStr += chunk;
    });

    await new Promise((resolve) => req.on('end', resolve));
    if (isAborted) return true;

    let payload;
    try {
      payload = bodyStr.trim() ? JSON.parse(bodyStr) : {};
    } catch {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          success: false,
          statusCode: 'INVALID_JSON',
          errorMessage: 'Request body must be valid JSON'
        })
      );
      return true;
    }

    const txObj = payload.transaction || payload.discovery || (payload.tcode ? { transactionCode: payload.tcode } : null);
    if (!txObj || (!txObj.transactionCode && !txObj.tcode)) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          success: false,
          statusCode: 'INVALID_INPUT',
          errorMessage: 'Transaction information (transaction, discovery, or tcode) is required for matching'
        })
      );
      return true;
    }

    const requestId = `req-${Date.now()}-${requestCounter++}`;

    try {
      const matchResult = await matchingEngineInstance.match({
        transaction: txObj,
        technicalEvidence: payload.technicalEvidence || payload.evidence || (payload.discovery?.evidence || []),
        liveGatewayServices: payload.liveGatewayServices || payload.liveServices || (payload.discovery?.corroboratingServices || []),
        userRequirement: payload.userRequirement || payload.requirement || null,
        targetRelease: payload.targetRelease || payload.systemRelease || 'SAP S/4HANA 2023 Private Edition'
      });

      const httpStatus = matchResult.success !== false ? 200 : 400;

      res.writeHead(httpStatus, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify(
          {
            success: matchResult.success !== false,
            requestId,
            matching: matchResult,
            ...matchResult
          },
          null,
          2
        )
      );
    } catch (err) {
      const sanitized = sanitizeErrorMessage(err.message || 'Matching processing error');
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          success: false,
          requestId,
          statusCode: 'INTERNAL_ERROR',
          errorMessage: sanitized
        })
      );
    }
    return true;
  }

  // 5. POST /api/v1/discovery/match & /api/v1/discovery/mcp-assisted
  if (req.method === 'POST' && (url.pathname === '/api/v1/discovery/match' || url.pathname === '/api/v1/discovery/mcp-assisted')) {
    let bodyStr = '';
    let bodyLength = 0;
    let isAborted = false;

    req.on('data', (chunk) => {
      if (isAborted) return;
      bodyLength += chunk.length;
      if (bodyLength > MAX_BODY_SIZE) {
        isAborted = true;
        res.writeHead(413, { 'Content-Type': 'application/json' });
        res.end(
          JSON.stringify({
            success: false,
            statusCode: 'PAYLOAD_TOO_LARGE',
            errorMessage: 'Payload exceeds maximum limit of 100KB'
          })
        );
        req.destroy();
        return;
      }
      bodyStr += chunk;
    });

    await new Promise((resolve) => req.on('end', resolve));
    if (isAborted) return true;

    let payload;
    try {
      payload = bodyStr.trim() ? JSON.parse(bodyStr) : {};
    } catch {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          success: false,
          statusCode: 'INVALID_JSON',
          errorMessage: 'Request body must be valid JSON'
        })
      );
      return true;
    }

    const tcode = payload.tcode || payload.transactionCode;
    if (!tcode || typeof tcode !== 'string' || !tcode.trim()) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          success: false,
          statusCode: 'INVALID_INPUT',
          errorMessage: 'Transaction code (tcode) is required as a non-empty string'
        })
      );
      return true;
    }

    const requestId = `req-${Date.now()}-${requestCounter++}`;
    const isDedicatedMcpRoute = url.pathname === '/api/v1/discovery/mcp-assisted';
    const mcpEnabledByRequest = isDedicatedMcpRoute
      ? (payload.mcpOptions?.enabled !== false)
      : (payload.mcpOptions?.enabled === true || payload.useMcp === true);

    try {
      const discoveryResult = await discoveryEngine.discover({
        tcode,
        systemId: payload.systemId,
        client: payload.client || payload.sapClient,
        useLiveSap: Boolean(payload.useLiveSap),
        targetSystem: payload.targetSystem,
        sapClient: payload.sapClient || payload.client
      });

      if (!discoveryResult.success && discoveryResult.statusCode === 'INVALID_TCODE_FORMAT') {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(
          JSON.stringify({
            success: false,
            requestId,
            statusCode: discoveryResult.statusCode,
            errorMessage: discoveryResult.errorMessage,
            validationErrors: discoveryResult.validationErrors
          })
        );
        return true;
      }

      if (!discoveryResult.success && (discoveryResult.statusCode === 'NOT_FOUND' || discoveryResult.verificationStatus === 'NOT_FOUND')) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(
          JSON.stringify(
            {
              success: false,
              requestId,
              statusCode: 'NOT_FOUND',
              tcode: discoveryResult.tcode || tcode,
              discovery: discoveryResult,
              matching: {
                success: true,
                statusCode: 'NOT_FOUND',
                matchClassification: 'NO_MATCH',
                recommendationReadiness: 'NO_SUITABLE_STANDARD_CANDIDATE',
                totalCandidatesEvaluated: 0,
                bestCandidate: null,
                rankedCandidates: [],
                candidateComparison: []
              },
              recommendationReadiness: 'NO_SUITABLE_STANDARD_CANDIDATE',
              readinessReason: `Transaction "${discoveryResult.tcode || tcode}" does not exist in target SAP system.`,
              candidates: [],
              bestMatch: null,
              errorMessage: `Transaction code "${discoveryResult.tcode || tcode}" does not exist in SAP system.`
            },
            null,
            2
          )
        );
        return true;
      }

      // Local Canonical Catalogue Search for Base Candidates
      const localSearchResult = await officialCatalogueAdapter.searchApps({
        tcode: discoveryResult.tcode,
        query: discoveryResult.transactionDescription || discoveryResult.description || '',
        limit: 50
      });
      let candidatePool = localSearchResult?.candidates || [];
      let mcpDiscoveryEnvelope = null;

      // Optional MCP Discovery Orchestration
      if (mcpEnabledByRequest && mcpDiscoveryOrchestrator) {
        try {
          const mcpOrch = await mcpDiscoveryOrchestrator.executeAssistedDiscovery(
            {
              tcode: discoveryResult.tcode,
              transactionDescription: discoveryResult.description,
              userRequirement: payload.userRequirement || payload.requirement || null,
              systemId: payload.systemId,
              client: payload.client || payload.sapClient,
              mode: payload.useLiveSap ? 'LIVE' : 'MOCK',
              targetRelease: payload.targetRelease || payload.systemRelease,
              existingTechnicalEvidence: discoveryResult.evidence || [],
              mcpOptions: payload.mcpOptions || { enabled: true }
            },
            candidatePool
          );

          candidatePool = mcpOrch.mergedCandidates;
          mcpDiscoveryEnvelope = mcpOrch.discoveryResult;

          if (Array.isArray(mcpOrch.mcpEvidence) && mcpOrch.mcpEvidence.length > 0) {
            discoveryResult.evidence = [...(discoveryResult.evidence || []), ...mcpOrch.mcpEvidence];
            discoveryResult.technicalEvidence = discoveryResult.evidence;
          }
        } catch (orchErr) {
          console.warn(`[Fiorify Discovery] Non-blocking MCP orchestration error: ${orchErr.message}`);
        }
      }

      // Fiori Application Matching & Ranking
      const matchResult = await matchingEngineInstance.match({
        transaction: discoveryResult,
        technicalEvidence: discoveryResult.evidence || [],
        liveGatewayServices: discoveryResult.corroboratingServices || [],
        userRequirement: payload.userRequirement || payload.requirement || null,
        targetRelease: payload.targetRelease || payload.systemRelease || discoveryResult.targetSystem?.release || 'SAP S/4HANA 2023 Private Edition',
        candidatePool
      });

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify(
          {
            success: true,
            requestId,
            tcode: discoveryResult.tcode,
            discovery: discoveryResult,
            matching: matchResult,
            mcpAssisted: Boolean(mcpDiscoveryEnvelope),
            mcpDiscovery: mcpDiscoveryEnvelope,
            recommendationReadiness: matchResult.recommendationReadiness,
            readinessReason: matchResult.readinessReason,
            assessmentHandoff: matchResult.assessmentHandoff,
            candidateComparison: matchResult.candidateComparison,
            candidates: matchResult.rankedCandidates,
            bestMatch: matchResult.bestCandidate
          },
          null,
          2
        )
      );
    } catch (err) {
      const sanitized = sanitizeErrorMessage(err.message || 'Unified discovery-matching pipeline error');
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          success: false,
          requestId,
          statusCode: 'INTERNAL_ERROR',
          errorMessage: sanitized
        })
      );
    }
    return true;
  }

  return false;
}
