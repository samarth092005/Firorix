import { mockSapAdapter } from '../adapters/mockSapAdapter.js';
import { sanitizeErrorMessage } from '../adapters/btpDestinationAdapter.js';

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
    matchingEngineInstance,
    catalogueAdapter: officialCatalogueAdapter,
    mcpDiscoveryOrchestrator
  } = context;

  let requestCounter = context.requestCounter || 1;

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

      const configuredAdminSecret = process.env.FIORIX_ADMIN_SECRET;
      if (isLiveMode && configuredAdminSecret) {
        if (!checkAdminAuth()) {
          res.writeHead(401, { 'Content-Type': 'application/json' });
          res.end(
            JSON.stringify({
              success: false,
              statusCode: 'UNAUTHORIZED',
              errorMessage: 'Access denied: Valid administrative secret required for live SAP operations on S21.'
            }, null, 2)
          );
          return true;
        }
      }

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

      if (!discoveryResult.success && (discoveryResult.statusCode === 'CONNECTION_ERROR' || discoveryResult.statusCode === 'GATEWAY_ERROR' || discoveryResult.statusCode === 'DESTINATION_NOT_CONFIGURED')) {
        res.writeHead(502, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          error: 'Bad Gateway',
          statusCode: discoveryResult.statusCode,
          message: discoveryResult.errorMessage || 'Failed to communicate with SAP landscape.',
          overallStatus: 'CONNECTION_ERROR'
        }));
        return true;
      }

      if (!discoveryResult.success && (discoveryResult.statusCode === 'NOT_FOUND' || discoveryResult.verificationStatus === 'NOT_FOUND')) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: false,
          statusCode: 'NOT_FOUND',
          overallStatus: 'NOT_FOUND',
          requestId,
          tcode: discoveryResult.tcode,
          mode: isLiveMode ? 'LIVE_SAP' : 'MOCK',
          timestamp,
          system: {
            systemId,
            client,
            release: targetRelease,
            mode: isLiveMode ? 'LIVE_SAP' : 'MOCK'
          },
          transaction: {
            tcode: discoveryResult.tcode,
            exists: false,
            classification: 'NOT_FOUND',
            description: `Transaction "${discoveryResult.tcode}" does not exist in target SAP system.`
          },
          discovery: discoveryResult,
          matching: {
            status: 'NOT_FOUND',
            matchClassification: 'NO_MATCH',
            candidates: [],
            totalCandidatesEvaluated: 0,
            bestCandidate: null
          },
          candidates: [],
          bestMatch: null,
          errorMessage: `Transaction code "${discoveryResult.tcode}" does not exist in SAP system ${systemId}.`
        }));
        return true;
      }

      // Canonical catalogue search
      const localSearchResult = await officialCatalogueAdapter.searchApps({
        tcode: discoveryResult.tcode,
        query: discoveryResult.transactionDescription || discoveryResult.description || '',
        limit: 50
      });
      const candidatePool = localSearchResult?.candidates || [];

      // Canonical matching evaluation
      const matchResult = await matchingEngineInstance.match({
        transaction: discoveryResult,
        technicalEvidence: discoveryResult.evidence || [],
        liveGatewayServices: discoveryResult.corroboratingServices || [],
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
        tcode: discoveryResult.tcode,
        exists: discoveryResult.transactionIdentity?.sapExistenceVerification?.status !== 'NOT_FOUND',
        classification: discoveryResult.classification || 'STANDARD',
        description: discoveryResult.description || discoveryResult.transactionDescription,
        program: discoveryResult.program || discoveryResult.programName,
        screenNumber: discoveryResult.screenNumber || '0100',
        packageName: discoveryResult.package || discoveryResult.packageName,
        originalSystem: discoveryResult.classification === 'CUSTOM' ? (systemId.split('-')[0] || 'S21') : 'SAP',
        softwareComponent: discoveryResult.softwareComponent || 'S4CORE 108',
        metadataStatus: discoveryResult.missingEvidence?.length > 0 ? 'INCOMPLETE' : 'COMPLETE',
        evidence: discoveryResult.evidence ? discoveryResult.evidence.map(e => typeof e === 'string' ? e : `[${e.sourceName || e.evidenceType}] ${e.sourceRecordId || ''}: ${e.confidence || ''}`) : [],
        classificationDetails: discoveryResult.classificationDetails
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
          console.warn(`[FioriX Discovery] Non-blocking MCP orchestration error: ${orchErr.message}`);
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
