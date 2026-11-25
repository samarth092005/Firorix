import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { btpDestinationAdapter, loadLocalEnv } from './adapters/btpDestinationAdapter.js';

// Load environment variables early
loadLocalEnv();
import { sapGatewayMetadataAdapter } from './adapters/sapGatewayMetadataAdapter.js';
import { sapTransactionDiscoveryAdapter } from './adapters/sapTransactionDiscoveryAdapter.js';
import { officialFioriCatalogueAdapter } from './adapters/officialFioriCatalogueAdapter.js';
import { fitGapAssessmentEngine } from './engine/fitGapAssessmentEngine.js';
import { recommendationEngine } from './engine/recommendationEngine.js';
import { defaultAssessmentStore, AssessmentStore, isTestRunnerActive, resolveDefaultStoragePath } from './services/assessmentStore.js';
import { defaultFalIngestionService } from './tools/ingestFAL.js';
import { transactionDiscoveryEngine } from './engine/transactionDiscoveryEngine.js';
import { technicalEvidenceEngine } from './engine/technicalEvidenceEngine.js';
import { fioriMatchingEngine } from './engine/fioriMatchingEngine.js';
import { defaultMcpService } from './mcp/services/mcpService.js';
import { defaultMcpDiscoveryOrchestrator } from './mcp/discovery/index.js';
import { defaultAuthService, USER_ROLES } from './services/authService.js';
import { defaultSecurityAuditLogger, SECURITY_ACTIONS } from './infrastructure/security/securityAuditLogger.js';
import { defaultAuthProviderFactory } from './infrastructure/security/authProviderFactory.js';
import { createAuthMiddleware } from './middleware/authMiddleware.js';
import { defaultSystemRegistry } from './adapters/systemRegistry.js';
import { EnterpriseService } from './services/enterpriseService.js';
import { GenerationHandoffStore, defaultGenerationHandoffStore } from './services/generationHandoffStore.js';
import { defaultGenerationProjectStore } from './generation/projects/generationProjectStore.js';
import { GenerationProjectService } from './generation/projects/generationProjectService.js';
import { RequirementsService } from './generation/requirements/requirementsService.js';
import { DataModelService } from './generation/datamodel/dataModelService.js';
import { defaultCdsReuseRegistry } from './generation/datamodel/cdsReuseRegistry.js';
import { defaultTransactionDiscoveryService, TransactionDiscoveryService } from './services/transactionDiscoveryService.js';

// Modular Route Handlers
import { handleSystemRoutes } from './routes/systemRoutes.js';
import { handleCatalogueRoutes } from './routes/catalogueRoutes.js';
import { handleDiscoveryRoutes } from './routes/discoveryRoutes.js';
import { handleFitGapRoutes } from './routes/fitGapRoutes.js';
import { handleAssessmentRoutes } from './routes/assessmentRoutes.js';
import { handleHandoffRoutes } from './routes/handoffRoutes.js';
import { handleGenerationProjectRoutes } from './generation/routes/generationProjectRoutes.js';
import { handleGenerationRoutes } from './generation/routes/generationRoutes.js';
import { handleMcpRoute } from './mcp/routes/mcpRoutes.js';

// Re-export Fit-Gap validator utilities for backwards compatibility
export { validateFitGapAssessRequest, normalizeFitGapInput } from './validators/fitGapValidator.js';

const PORT = process.env.PORT || 4004;
let requestCounter = 1;

defaultFalIngestionService.adapter = officialFioriCatalogueAdapter;

/**
 * Configure CORS headers with safe origin validation.
 */
export function setCorsHeaders(req, res) {
  const allowedOriginsEnv = process.env.CORS_ALLOWED_ORIGINS;
  const origin = req.headers.origin;

  if (allowedOriginsEnv) {
    const allowed = allowedOriginsEnv.split(',').map((s) => s.trim());
    if (allowed.includes('*')) {
      res.setHeader('Access-Control-Allow-Origin', '*');
    } else if (origin && allowed.includes(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
    } else {
      res.setHeader('Access-Control-Allow-Origin', allowed[0] || 'http://localhost:5173');
    }
  } else {
    const defaultLocalOrigins = [
      'http://localhost:5173',
      'http://127.0.0.1:5173',
      'http://localhost:4004',
      'http://localhost:3000'
    ];
    if (origin && defaultLocalOrigins.includes(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
    } else {
      res.setHeader('Access-Control-Allow-Origin', '*');
    }
  }

  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'Content-Type, Authorization, X-Requested-With, X-Fiorify-Admin-Secret'
  );
  res.setHeader('Access-Control-Max-Age', '86400');
}

/**
 * Sets enterprise-grade HTTP security headers (SEC-011)
 * Helmet-equivalent headers for OWASP / SAP BTP compliance.
 */
export function setSecurityHeaders(req, res) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  const isPreviewRequest = req.url && (req.url.includes('/preview/content') || req.url.includes('/webapp/'));
  res.setHeader('X-Frame-Options', isPreviewRequest ? 'SAMEORIGIN' : 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');

  const isProduction = process.env.NODE_ENV === 'production';
  if (isProduction || req.headers['x-forwarded-proto'] === 'https') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }

  // Content-Security-Policy
  const csp = isPreviewRequest
    ? "default-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; font-src 'self' data:; img-src 'self' data: https:; frame-ancestors 'self';"
    : "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; font-src 'self' data:; img-src 'self' data: https:; connect-src 'self' http://localhost:* https://*.hana.ondemand.com https://*.authentication.*.hana.ondemand.com; frame-ancestors 'self';";
  res.setHeader('Content-Security-Policy', csp);
}

/**
 * Creates and configures the native HTTP server.
 * Accepts optional adapter injections for testing and environment isolation.
 */
export function createServer(options = {}) {
  const adapter = options.btpAdapter || btpDestinationAdapter;
  const gatewayAdapter = options.gatewayAdapter || sapGatewayMetadataAdapter;
  const transactionAdapter = options.transactionAdapter || sapTransactionDiscoveryAdapter;
  const officialCatalogueAdapter = options.officialCatalogueAdapter || officialFioriCatalogueAdapter;
  const fitGapEngine = options.fitGapEngine || fitGapAssessmentEngine;
  const recommendationEngineInstance = options.recommendationEngine || recommendationEngine;
  const defaultTenantId = options.tenantId || process.env.Fiorify_TENANT_ID || 'DEFAULT-TENANT-S21';
  const isTestMode = isTestRunnerActive();
  let ephemeralAssessmentFile = null;
  let ephemeralDir = null;
  let assessmentStore = options.assessmentStore;
  if (!assessmentStore) {
    if (options.useDatabase) {
      assessmentStore = new AssessmentStore({ useDatabase: true, tenantId: defaultTenantId });
    } else if (isTestMode) {
      ephemeralDir = fs.mkdtempSync(path.join(os.tmpdir(), 'fiorify-test-asm-'));
      ephemeralAssessmentFile = path.join(ephemeralDir, 'assessments.json');
      const canonicalPath = resolveDefaultStoragePath();
      if (fs.existsSync(canonicalPath)) {
        fs.copyFileSync(canonicalPath, ephemeralAssessmentFile);
      } else {
        fs.writeFileSync(ephemeralAssessmentFile, '[]', 'utf8');
      }
      assessmentStore = new AssessmentStore({
        storagePath: ephemeralAssessmentFile,
        tenantId: defaultTenantId,
        isEphemeral: true,
        allowVolatileStoreInProduction: true
      });
    } else {
      assessmentStore = defaultAssessmentStore;
    }
  }

  const falIngestionService = options.falIngestionService || defaultFalIngestionService;
  const discoveryEngine = options.discoveryEngine || transactionDiscoveryEngine;
  const evidenceEngine = options.evidenceEngine || technicalEvidenceEngine;
  const matchingEngineInstance = options.matchingEngine || fioriMatchingEngine;
  const mcpService = options.mcpService || defaultMcpService;
  const mcpDiscoveryOrchestrator = options.mcpDiscoveryOrchestrator || defaultMcpDiscoveryOrchestrator;
  const authService = options.authService || defaultAuthService;
  const securityAuditLogger = options.securityAuditLogger || defaultSecurityAuditLogger;
  const isProduction = process.env.NODE_ENV === 'production';
  const enforceAuth = isProduction || options.enforceAuth === true || process.env.FIORIFY_ENFORCE_AUTH === 'true' || process.env.Fiorify_ENFORCE_AUTH === 'true';
  const systemRegistry = options.systemRegistry || defaultSystemRegistry;
  const enterpriseService = options.enterpriseService || new EnterpriseService({ assessmentStore, systemRegistry });
  const generationHandoffStore = options.generationHandoffStore || (
    (options.useDatabase || assessmentStore?.useDatabase)
      ? new GenerationHandoffStore({ useDatabase: true, tenantId: defaultTenantId, assessmentStore })
      : (isTestMode
          ? new GenerationHandoffStore({
              storagePath: path.join(ephemeralDir || os.tmpdir(), 'generationHandoffs.json'),
              assessmentStore,
              allowVolatileStoreInProduction: true
            })
          : defaultGenerationHandoffStore)
  );
  if ((options.assessmentStore || isTestMode) && generationHandoffStore) {
    generationHandoffStore.assessmentStore = assessmentStore;
  }
  const generationProjectStore = options.generationProjectStore || defaultGenerationProjectStore;
  const generationProjectService = options.generationProjectService || new GenerationProjectService({
    projectStore: generationProjectStore,
    assessmentStore,
    handoffStore: generationHandoffStore
  });
  const requirementsService = options.requirementsService || new RequirementsService({
    projectStore: generationProjectStore,
    assessmentStore
  });
  const dataModelService = options.dataModelService || new DataModelService({
    projectStore: generationProjectStore
  });
  const cdsReuseRegistry = options.cdsReuseRegistry || defaultCdsReuseRegistry;
  const discoveryService = options.discoveryService || defaultTransactionDiscoveryService;
  if (officialCatalogueAdapter && falIngestionService) {
    falIngestionService.adapter = officialCatalogueAdapter;
  }

  const authProviderFactory = options.authProviderFactory || defaultAuthProviderFactory;
  const authMiddleware = options.authMiddleware || createAuthMiddleware({
    adapter,
    authService,
    authProviderFactory,
    securityAuditLogger,
    isProduction,
    enforceAuth,
    defaultTenantId
  });

  const server = http.createServer(async (req, res) => {
    try {
      setCorsHeaders(req, res);
      setSecurityHeaders(req, res);

      if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
      }

      const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);

      // Centralized Authentication Gate (AUTH-001, AUTH-005)
      const allowed = await authMiddleware.authenticate(req, res, url);
      if (!allowed) {
        return;
      }

      const currentUser = req.user;
      const requirePermission = (permission) => authMiddleware.requirePermission(req, res, permission, url);
      const requireRole = (allowedRoles) => authMiddleware.requireRole(req, res, allowedRoles, url);

      const checkAdminAuth = () => {
        if (currentUser && !currentUser.isUnauthenticated) {
          if (
            currentUser.role === USER_ROLES.ADMIN ||
            currentUser.role === 'ADMIN' ||
            currentUser.role === USER_ROLES.LEAD_ARCHITECT ||
            currentUser.role === 'CHIEF_ARCHITECT' ||
            authService.hasPermission(currentUser, PERMISSIONS.MCP_MANAGE) ||
            authService.hasPermission(currentUser, PERMISSIONS.ADMIN_ACCESS) ||
            authService.hasPermission(currentUser, PERMISSIONS.ADMIN_OVERRIDE)
          ) {
            return true;
          }
        }

        const authHeader = req.headers.authorization;
        const bearerSecret = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : null;
        const rawCustomHeader = req.headers['x-fiorify-admin-secret'] || req.headers['x-Fiorify-admin-secret'];
        const customHeaderSecret = rawCustomHeader
          ? String(rawCustomHeader).trim()
          : null;
        const providedSecret = customHeaderSecret || bearerSecret;

        if (!providedSecret) {
          return false;
        }

        const configuredSecret = process.env.Fiorify_ADMIN_SECRET || process.env.FIORIFY_ADMIN_SECRET || 'dev-admin-secret-change-in-production';
        if (providedSecret === configuredSecret) return true;
        if (adapter && typeof adapter.verifyAdminSecret === 'function' && adapter.verifyAdminSecret(providedSecret)) return true;
        return false;
      };

    // 1. Root Service Index (or Frontend SPA Entrypoint if HTML requested)
    const frontendDistDir = path.resolve(process.cwd(), 'frontend', 'dist');
    const hasFrontendDist = fs.existsSync(path.join(frontendDistDir, 'index.html'));
    const prefersHtml = Boolean(req.headers.accept && req.headers.accept.includes('text/html'));

    if (req.method === 'GET' && url.pathname === '/' && (!hasFrontendDist || !prefersHtml)) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify(
          {
            service: 'Fiorify SAP Modernization & Discovery API',
            version: '1.2.0',
            engine: 'Node 20 LTS (Native HTTP & CAP Ready)',
            targetSystem: 'S21 (Client 200) - SAP S/4HANA 2023 Private Edition',
            endpoints: [
              { method: 'GET', path: '/api/v1/health', description: 'Landscape and service health status' },
              { method: 'POST', path: '/api/v1/system/reset-demo', description: 'Reset demo environment to clean baseline (clears projects, handoffs, and caches)' },
              { method: 'GET', path: '/api/v1/systems', description: 'Configured SAP landscapes and S21 connection metadata' },
              { method: 'POST', path: '/api/v1/tcode-search', description: 'Evidence-based T-Code search and Fiori discovery' },
              { method: 'GET', path: '/api/v1/gateway-smoke-test', description: 'Isolated SAP Gateway Catalog smoke test via BTP Destination S21 (Protected)' },
              { method: 'GET', path: '/api/v1/gateway/services', description: 'Live SAP Gateway OData Catalog query with search & pagination' },
              { method: 'GET', path: '/api/v1/gateway/services/:serviceId/metadata', description: 'Parsed $metadata EDMX structure for a specific Gateway OData service' },
              { method: 'GET', path: '/api/v1/transaction-discovery/:tcode', description: 'Live SAP S21 transaction discovery, ADT probing & Gateway corroboration' },
              { method: 'GET', path: '/api/v1/fiori-catalogue/apps/:appId', description: 'Retrieve normalized standard Fiori application by ID from official catalogue' },
              { method: 'GET', path: '/api/v1/fiori-catalogue/search', description: 'Search official SAP Fiori Apps Reference Library by T-Code, App ID, Name, or Business Process' },
              { method: 'POST', path: '/api/v1/fiori-catalogue/import', description: 'Import official SAP Fiori Apps Reference Library CSV, XLSX or JSON exports (CAT-01, Protected)' },
              { method: 'POST', path: '/api/v1/fiori-catalogue/rollback', description: 'Rollback catalogue to previous valid backup snapshot (Protected)' },
              { method: 'GET', path: '/api/v1/fiori-catalogue/status', description: 'Retrieve canonical Fiori catalogue size, source distribution, and import status (CAT-01)' },
              { method: 'POST', path: '/api/v1/discovery/transaction', description: 'Normalized SAP transaction discovery and multi-source evidence collection (DISC-01/02)' },
              { method: 'POST', path: '/api/v1/matching/fiori-apps', description: 'Standard SAP Fiori app matching, ranking, and explainability evaluation (MATCH-01/02)' },
              { method: 'POST', path: '/api/v1/discovery/match', description: 'Unified end-to-end transaction discovery and Fiori matching pipeline' },
              { method: 'POST', path: '/api/v1/discovery/mcp-assisted', description: 'MCP-assisted SAP transaction discovery and evidence enrichment (MCP-03/04)' },
              { method: 'POST', path: '/api/v1/fitgap/assess', description: 'Execute evidence-backed fit-gap assessment between requirement and candidate application' },
              { method: 'POST', path: '/api/v1/recommendations/generate', description: 'Formulate governed recommendation and actionable remediation plan (REC-01)' },
              { method: 'POST', path: '/api/v1/assessments', description: 'Create and persist an assessment record (PERSIST-01)' },
              { method: 'GET', path: '/api/v1/assessments', description: 'List persisted assessments with optional filters (businessArea, status, lifecycleStatus, search, systemId)' },
              { method: 'GET', path: '/api/v1/assessments/summary', description: 'Dashboard operational summary metrics derived from persisted assessments' },
              { method: 'GET', path: '/api/v1/assessments/:id', description: 'Retrieve full persisted assessment record by ID including Fit-Gap results and evidence' },
              { method: 'PUT', path: '/api/v1/assessments/:id', description: 'Update assessment record and advance lifecycle state with audit event logging (PERSIST-02)' },
              { method: 'POST', path: '/api/v1/assessments/:id/archive', description: 'Archive an assessment record (PERSIST-02)' },
              { method: 'GET', path: '/api/v1/assessments/:id/audit', description: 'Retrieve audit history timeline for an assessment (PERSIST-02)' },
              { method: 'GET', path: '/api/v1/mcp/status', description: 'Current MCP client connection lifecycle state, package info, and discovered tool metrics (MCP-01/02)' },
              { method: 'GET', path: '/api/v1/mcp/tools', description: 'Complete discovered MCP tool inventory with schemas, categories, and policy enforcement' },
              { method: 'GET', path: '/api/v1/mcp/health', description: 'Diagnostic health status distinguishing backend, MCP process, handshake, and SAP connectivity' },
              { method: 'POST', path: '/api/v1/mcp/connect', description: 'Establish or reconnect MCP child process session (Protected)' },
              { method: 'POST', path: '/api/v1/mcp/disconnect', description: 'Controlled shutdown of MCP client process (Protected)' },
              { method: 'POST', path: '/api/v1/mcp/tools/:toolName/execute', description: 'Execute an approved read-only MCP tool with schema validation and provenance tagging' }
            ]
          },
          null,
          2
        )
      );
      return;
    }

    const context = {
      currentUser,
      requirePermission,
      requireRole,
      checkAdminAuth,
      authService,
      authProviderFactory,
      authMiddleware,
      securityAuditLogger,
      systemRegistry,
      adapter,
      gatewayAdapter,
      transactionAdapter,
      catalogueAdapter: officialCatalogueAdapter,
      fitGapEngine,
      recommendationEngineInstance,
      recommendationEngine: recommendationEngineInstance,
      assessmentStore,
      falIngestionService,
      enterpriseService,
      generationHandoffStore,
      mcpService,
      mcpDiscoveryOrchestrator,
      discoveryEngine,
      evidenceEngine,
      matchingEngineInstance,
      projectStore: generationProjectStore,
      projectService: generationProjectService,
      requirementsService,
      dataModelService,
      cdsReuseRegistry,
      discoveryService,
      defaultTenantId,
      requestCounter
    };

    // Dispatch to modular route controllers
    if (await handleSystemRoutes(req, res, url, context)) return;
    if (await handleCatalogueRoutes(req, res, url, context)) return;
    if (await handleDiscoveryRoutes(req, res, url, context)) return;
    if (await handleFitGapRoutes(req, res, url, context)) return;
    if (await handleAssessmentRoutes(req, res, url, context)) return;
    if (await handleHandoffRoutes(req, res, url, context)) return;
    if (await handleGenerationProjectRoutes(req, res, url, {
      ...context,
      generationProjectService,
      generationProjectStore
    })) return;

    if (await handleGenerationRoutes(req, res, url, {
      ...context,
      generationProjectService,
      generationProjectStore,
      projectStore: generationProjectStore,
      projectService: generationProjectService,
      requirementsService,
      dataModelService,
      cdsRegistry: cdsReuseRegistry,
      cdsReuseRegistry,
      assessmentStore,
      handoffStore: generationHandoffStore,
      currentUser
    })) return;

    if (await handleMcpRoute(req, res, url, { mcpService, checkAdminAuth })) return;

    // Static frontend serving (for production and unified BTP deployments)
    if (req.method === 'GET' && !url.pathname.startsWith('/api/')) {
      const safePath = path.normalize(url.pathname).replace(/^(\.\.[\/\\])+/, '');
      let filePath = path.join(frontendDistDir, safePath);
      if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
        filePath = path.join(filePath, 'index.html');
      }

      if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
        const ext = path.extname(filePath).toLowerCase();
        const mimeTypes = {
          '.html': 'text/html',
          '.js': 'application/javascript',
          '.css': 'text/css',
          '.json': 'application/json',
          '.svg': 'image/svg+xml',
          '.png': 'image/png',
          '.jpg': 'image/jpeg',
          '.ico': 'image/x-icon',
          '.woff': 'font/woff',
          '.woff2': 'font/woff2'
        };
        const contentType = mimeTypes[ext] || 'application/octet-stream';
        res.writeHead(200, { 'Content-Type': contentType });
        fs.createReadStream(filePath).pipe(res);
        return;
      }

      // SPA fallback to index.html if request is for HTML navigation
      const indexPath = path.join(frontendDistDir, 'index.html');
      if (fs.existsSync(indexPath)) {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        fs.createReadStream(indexPath).pipe(res);
        return;
      }
    }

    // Route not found
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: false, statusCode: 'NOT_FOUND', error: 'Endpoint Not Found', path: url.pathname }));
  } catch (unexpectedErr) {
    if (!res.headersSent) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
    }
    res.end(JSON.stringify({
      success: false,
      statusCode: 'INTERNAL_SERVER_ERROR',
      errorMessage: unexpectedErr.message || 'An unexpected internal server error occurred.'
    }));
  }
});

  server.on('close', async () => {
    if (mcpService && typeof mcpService.shutdown === 'function') {
      try {
        await mcpService.shutdown();
      } catch (err) {
        // Non-blocking cleanup logging
      }
    }
  });

  const originalClose = server.close.bind(server);
  server.close = function (cb) {
    if (typeof server.closeAllConnections === 'function') {
      try {
        server.closeAllConnections();
      } catch (e) {
        // ignore
      }
    }
    if (ephemeralDir) {
      try {
        fs.rmSync(ephemeralDir, { recursive: true, force: true });
      } catch {
        // ignore ephemeral cleanup errors
      }
    }
    return originalClose(cb);
  };

  return server;
}

const server = createServer();

const isDirectRun = Boolean(
  process.argv[1] &&
  (fileURLToPath(import.meta.url) === process.argv[1] ||
   path.resolve(process.argv[1]).toLowerCase() === path.resolve(fileURLToPath(import.meta.url)).toLowerCase())
);
if (isDirectRun) {
  if (process.env.NODE_ENV === 'production') {
    try {
      defaultAuthProviderFactory.assertProductionReadiness();
      const { DatabaseAdapterFactory } = await import('./infrastructure/db/adapters/databaseAdapterFactory.js');
      DatabaseAdapterFactory.assertProductionReadiness();
    } catch (secErr) {
      console.error(`[Fiorify Security Guardrail] Startup Refused: ${secErr.message}`);
      process.exit(1);
    }
  }

  defaultMcpService.initialize().catch((err) => {
    console.warn(`[Fiorify MCP] Non-blocking initialization note: ${err.message}`);
  });

  const handleGracefulShutdown = async (signal) => {
    console.log(`[Fiorify] Received ${signal}. Shutting down cleanly...`);
    try {
      await defaultMcpService.shutdown();
    } catch (err) {
      console.warn(`[Fiorify MCP] Shutdown warning: ${err.message}`);
    }
    try {
      const { defaultDatabaseAdapter } = await import('./infrastructure/db/adapters/databaseAdapterFactory.js');
      await defaultDatabaseAdapter.close();
    } catch (err) {
      console.warn(`[Fiorify DB] Shutdown warning: ${err.message}`);
    }
    server.close(() => {
      process.exit(0);
    });
  };

  process.on('SIGINT', () => handleGracefulShutdown('SIGINT'));
  process.on('SIGTERM', () => handleGracefulShutdown('SIGTERM'));
  process.on('uncaughtException', (err) => {
    console.error('[Fiorify Server] Non-fatal uncaught exception intercepted:', err?.message || err);
  });
  process.on('unhandledRejection', (reason) => {
    console.error('[Fiorify Server] Non-fatal unhandled rejection intercepted:', reason?.message || reason);
  });

  server.listen(PORT, () => {
    console.log(`Fiorify Discovery Backend running on http://localhost:${PORT}`);
    console.log(`Ready for S21-200 live queries, BTP smoke tests, and local mock evaluations.`);
  });
}

export default server;
