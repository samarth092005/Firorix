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
import { defaultAuthService, USER_ROLES, PERMISSIONS } from './services/authService.js';
import { defaultSecurityAuditLogger, SECURITY_ACTIONS } from './infrastructure/security/securityAuditLogger.js';
import { getDevAdminSecret, getFiorifyEnv } from './infrastructure/config/envHelper.js';
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

// Modular API Architecture (Middlewares, Router, Error Handler, SPA Handler)
import {
  setCorsHeaders,
  handleCorsPreflight,
  setSecurityHeaders,
  createRateLimiter,
  attachRequestContext,
  handleUnhandledApiError,
  dispatchApiRoutes,
  serveFrontendSpa
} from './api/index.js';

export { setCorsHeaders, setSecurityHeaders };

// Re-export Fit-Gap validator utilities for backwards compatibility
export { validateFitGapAssessRequest, normalizeFitGapInput } from './validators/fitGapValidator.js';

const PORT = process.env.PORT || 4004;
const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
let requestCounter = 1;

defaultFalIngestionService.adapter = officialFioriCatalogueAdapter;

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
  const defaultTenantId = options.tenantId || process.env.FIORIFY_TENANT_ID || process.env.Fiorify_TENANT_ID || 'DEFAULT-TENANT-S21';
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

  const checkRateLimit = createRateLimiter({ skip: isTestMode });

  const server = http.createServer(async (req, res) => {
    try {
      attachRequestContext(req, res);
      setCorsHeaders(req, res);
      setSecurityHeaders(req, res);

      if (handleCorsPreflight(req, res)) return;

      const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);

      if (!checkRateLimit(req, res, url)) return;

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
        const rawCustomHeader = req.headers['x-fiorify-admin-secret'];
        const customHeaderSecret = rawCustomHeader
          ? String(rawCustomHeader).trim()
          : null;
        const providedSecret = customHeaderSecret || bearerSecret;

        if (!providedSecret) {
          return false;
        }

        const configuredSecret = getDevAdminSecret(isProduction);
        if (configuredSecret && providedSecret === configuredSecret) return true;
        if (!isProduction && adapter && typeof adapter.verifyAdminSecret === 'function' && adapter.verifyAdminSecret(providedSecret)) return true;
        return false;
      };

    const frontendDistDir = path.resolve(REPO_ROOT, 'frontend', 'dist');

    const context = {
      isProduction,
      frontendDistDir,
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
      generationProjectService,
      generationProjectStore,
      requirementsService,
      dataModelService,
      cdsReuseRegistry,
      cdsRegistry: cdsReuseRegistry,
      handoffStore: generationHandoffStore,
      discoveryService,
      defaultTenantId,
      requestCounter
    };

    if (await dispatchApiRoutes(req, res, url, context)) return;
    if (serveFrontendSpa(req, res, url, frontendDistDir)) return;

    // Route not found
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: false, statusCode: 'NOT_FOUND', error: 'Endpoint Not Found', path: url.pathname }));
  } catch (unexpectedErr) {
    handleUnhandledApiError(req, res, unexpectedErr);
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
    console.error('[Fiorify Server] Fatal uncaught exception:', err?.message || err);
    process.exit(1);
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
