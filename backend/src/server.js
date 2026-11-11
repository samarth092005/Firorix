import http from 'node:http';
import { fileURLToPath } from 'node:url';
import { mockSapAdapter } from './adapters/mockSapAdapter.js';
import { liveSapAdapter } from './adapters/liveSapAdapter.js';
import { matchingEngine } from './matchingEngine.js';
import { btpDestinationAdapter, sanitizeHeaders, sanitizeErrorMessage } from './adapters/btpDestinationAdapter.js';
import { sapGatewayMetadataAdapter } from './adapters/sapGatewayMetadataAdapter.js';
import { sapTransactionDiscoveryAdapter } from './adapters/sapTransactionDiscoveryAdapter.js';
import { officialFioriCatalogueAdapter } from './adapters/officialFioriCatalogueAdapter.js';
import { fitGapAssessmentEngine } from './engine/fitGapAssessmentEngine.js';
import { recommendationEngine } from './engine/recommendationEngine.js';
import { AssessmentStore, defaultAssessmentStore, validateAssessmentRecord, normalizeAssessmentRecord, LIFECYCLE_STATES, ALLOWED_TRANSITIONS } from './services/assessmentStore.js';
import { FALIngestionService, defaultFalIngestionService } from './tools/ingestFAL.js';
import { transactionDiscoveryEngine, TransactionDiscoveryEngine } from './engine/transactionDiscoveryEngine.js';
import { technicalEvidenceEngine, TechnicalEvidenceEngine } from './engine/technicalEvidenceEngine.js';
import { fioriMatchingEngine, FioriMatchingEngine } from './engine/fioriMatchingEngine.js';
import { defaultMcpService } from './mcp/services/mcpService.js';
import { handleMcpRoute } from './mcp/routes/mcpRoutes.js';
import { defaultMcpDiscoveryOrchestrator } from './mcp/discovery/index.js';
import { defaultAuthService, AuthService, USER_ROLES, PERMISSIONS } from './services/authService.js';
import { defaultSecurityAuditLogger, SecurityAuditLogger, SECURITY_ACTIONS } from './infrastructure/security/securityAuditLogger.js';
import { defaultSystemRegistry, SystemRegistry, CONNECTIVITY_STATUSES } from './adapters/systemRegistry.js';
import { defaultEnterpriseService, EnterpriseService, ASSESSMENT_LEVELS, DEPLOYMENT_STAGES } from './services/enterpriseService.js';
import { defaultGenerationHandoffStore } from './services/generationHandoffStore.js';
import { GenerationProjectStore, defaultGenerationProjectStore } from './generation/projects/generationProjectStore.js';
import { GenerationProjectService, defaultGenerationProjectService } from './generation/projects/generationProjectService.js';
import { RequirementsService, defaultRequirementsService } from './generation/requirements/requirementsService.js';
import { DataModelService, defaultDataModelService } from './generation/datamodel/dataModelService.js';
import { defaultCdsReuseRegistry } from './generation/datamodel/cdsReuseRegistry.js';
import { handleGenerationRoutes } from './generation/routes/generationRoutes.js';

const PORT = process.env.PORT || 4004;
const MAX_BODY_SIZE = 100 * 1024; // 100KB body limit
const MAX_IMPORT_BODY_SIZE = 10 * 1024 * 1024; // 10MB body limit for catalogue exports
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
    // Default safe local origins for development and demo mode
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
    'Content-Type, Authorization, X-Requested-With, X-FioriX-Admin-Secret'
  );
  res.setHeader('Access-Control-Max-Age', '86400');
}

/**
 * Validates the FITGAP-01 request payload.
 * Enforces structured types for requirement, candidate, and context.
 */
export function validateFitGapAssessRequest(payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return {
      isValid: false,
      error: 'Request body must be a JSON object containing requirement, candidate, and context.'
    };
  }

  // 1. Requirement validation
  if (!payload.requirement || typeof payload.requirement !== 'object' || Array.isArray(payload.requirement)) {
    return { isValid: false, error: 'Requirement object is required.' };
  }
  const { requirement } = payload;
  const reqTitle = requirement.title || requirement.statement || requirement.description;
  if (!reqTitle || typeof reqTitle !== 'string' || !reqTitle.trim()) {
    return { isValid: false, error: 'Requirement title or statement is required as a non-empty string.' };
  }
  if (requirement.id !== undefined && typeof requirement.id !== 'string') {
    return { isValid: false, error: 'Requirement id must be a string if provided.' };
  }
  if (requirement.title !== undefined && typeof requirement.title !== 'string') {
    return { isValid: false, error: 'Requirement title must be a string if provided.' };
  }
  if (requirement.statement !== undefined && typeof requirement.statement !== 'string') {
    return { isValid: false, error: 'Requirement statement must be a string if provided.' };
  }
  if (requirement.description !== undefined && typeof requirement.description !== 'string') {
    return { isValid: false, error: 'Requirement description must be a string if provided.' };
  }
  if (requirement.businessProcess !== undefined && typeof requirement.businessProcess !== 'string') {
    return { isValid: false, error: 'Requirement businessProcess must be a string if provided.' };
  }
  if (requirement.tcode !== undefined && typeof requirement.tcode !== 'string') {
    return { isValid: false, error: 'Requirement tcode must be a string if provided.' };
  }
  if (requirement.expectedFunctionality !== undefined && !Array.isArray(requirement.expectedFunctionality)) {
    return { isValid: false, error: 'Requirement expectedFunctionality must be an array of strings if provided.' };
  }
  if (requirement.requiredCapabilities !== undefined && !Array.isArray(requirement.requiredCapabilities)) {
    return { isValid: false, error: 'Requirement requiredCapabilities must be an array of strings if provided.' };
  }
  if (requirement.requiredOperations !== undefined && !Array.isArray(requirement.requiredOperations)) {
    return { isValid: false, error: 'Requirement requiredOperations must be an array of strings if provided.' };
  }
  if (requirement.mandatoryConditions !== undefined && !Array.isArray(requirement.mandatoryConditions)) {
    return { isValid: false, error: 'Requirement mandatoryConditions must be an array of strings if provided.' };
  }
  if (requirement.priority !== undefined && typeof requirement.priority !== 'string') {
    return { isValid: false, error: 'Requirement priority must be a string if provided.' };
  }

  // 2. Candidate validation
  if (!payload.candidate || typeof payload.candidate !== 'object' || Array.isArray(payload.candidate)) {
    return { isValid: false, error: 'Candidate application object is required.' };
  }
  const { candidate } = payload;
  if (!candidate.appId || typeof candidate.appId !== 'string' || !candidate.appId.trim()) {
    return { isValid: false, error: 'Candidate appId is required as a non-empty string.' };
  }
  if (candidate.appName !== undefined && typeof candidate.appName !== 'string') {
    return { isValid: false, error: 'Candidate appName must be a string if provided.' };
  }
  if (candidate.appType !== undefined && typeof candidate.appType !== 'string') {
    return { isValid: false, error: 'Candidate appType must be a string if provided.' };
  }
  if (candidate.uiTechnology !== undefined && typeof candidate.uiTechnology !== 'string') {
    return { isValid: false, error: 'Candidate uiTechnology must be a string if provided.' };
  }
  if (candidate.supportedProductRelease !== undefined && typeof candidate.supportedProductRelease !== 'string') {
    return { isValid: false, error: 'Candidate supportedProductRelease must be a string if provided.' };
  }
  if (candidate.productVersion !== undefined && typeof candidate.productVersion !== 'string') {
    return { isValid: false, error: 'Candidate productVersion must be a string if provided.' };
  }
  if (candidate.businessRole !== undefined && typeof candidate.businessRole !== 'string') {
    return { isValid: false, error: 'Candidate businessRole must be a string if provided.' };
  }
  if (candidate.businessRoles !== undefined && !Array.isArray(candidate.businessRoles)) {
    return { isValid: false, error: 'Candidate businessRoles must be an array of strings if provided.' };
  }
  if (candidate.capabilities !== undefined && !Array.isArray(candidate.capabilities)) {
    return { isValid: false, error: 'Candidate capabilities must be an array of strings if provided.' };
  }
  if (candidate.supportedCapabilities !== undefined && !Array.isArray(candidate.supportedCapabilities)) {
    return { isValid: false, error: 'Candidate supportedCapabilities must be an array of strings if provided.' };
  }
  if (candidate.odataServices !== undefined && !Array.isArray(candidate.odataServices)) {
    return { isValid: false, error: 'Candidate odataServices must be an array of strings if provided.' };
  }
  if (candidate.odataDependencies !== undefined && !Array.isArray(candidate.odataDependencies)) {
    return { isValid: false, error: 'Candidate odataDependencies must be an array of strings if provided.' };
  }
  if (candidate.verifiedODataServices !== undefined && !Array.isArray(candidate.verifiedODataServices)) {
    return { isValid: false, error: 'Candidate verifiedODataServices must be an array if provided.' };
  }

  // 3. Context validation
  if (!payload.context || typeof payload.context !== 'object' || Array.isArray(payload.context)) {
    return { isValid: false, error: 'Context object is required.' };
  }
  const { context } = payload;
  if (context.systemId !== undefined && typeof context.systemId !== 'string') {
    return { isValid: false, error: 'Context systemId must be a string if provided.' };
  }
  if (context.client !== undefined && typeof context.client !== 'string') {
    return { isValid: false, error: 'Context client must be a string if provided.' };
  }
  if (context.systemRelease !== undefined && typeof context.systemRelease !== 'string') {
    return { isValid: false, error: 'Context systemRelease must be a string if provided.' };
  }
  if (context.activeGatewayServices !== undefined && !Array.isArray(context.activeGatewayServices)) {
    return { isValid: false, error: 'Context activeGatewayServices must be an array of strings if provided.' };
  }
  if (context.activeServices !== undefined && !Array.isArray(context.activeServices)) {
    return { isValid: false, error: 'Context activeServices must be an array of strings if provided.' };
  }
  if (context.userRoles !== undefined && !Array.isArray(context.userRoles)) {
    return { isValid: false, error: 'Context userRoles must be an array of strings if provided.' };
  }
  if (context.userAuthorizations !== undefined && !Array.isArray(context.userAuthorizations)) {
    return { isValid: false, error: 'Context userAuthorizations must be an array of strings if provided.' };
  }
  if (context.liveServices !== undefined && !Array.isArray(context.liveServices)) {
    return { isValid: false, error: 'Context liveServices must be an array if provided.' };
  }

  return { isValid: true };
}

/**
 * Maps incoming canonical request properties to the internal fitGapAssessmentEngine model.
 * Bridges both canonical naming and raw engine property names seamlessly.
 */
export function normalizeFitGapInput(payload) {
  const { requirement, candidate, context = {} } = payload;

  const reqCapabilities = Array.isArray(requirement.requiredCapabilities)
    ? requirement.requiredCapabilities
    : Array.isArray(requirement.expectedFunctionality)
      ? requirement.expectedFunctionality
      : [];

  const reqOperations = Array.isArray(requirement.requiredOperations)
    ? requirement.requiredOperations
    : [];

  let priority = requirement.priority || 'MEDIUM';
  if (typeof priority === 'string' && (priority.toUpperCase() === 'MUST' || priority.toUpperCase() === 'MANDATORY' || priority.toUpperCase() === 'HIGH')) {
    priority = 'MANDATORY';
  }

  const normalizedRequirement = {
    id: requirement.id || `REQ-${Date.now()}`,
    title: requirement.title || requirement.statement || requirement.description || 'Untitled Business Requirement',
    description: requirement.description || requirement.statement || requirement.title || '',
    statement: requirement.statement || requirement.description || requirement.title || '',
    businessProcess: requirement.businessProcess || '',
    tcode: requirement.tcode || '',
    requiredCapabilities: reqCapabilities,
    expectedFunctionality: reqCapabilities,
    requiredOperations: reqOperations,
    mandatoryConditions: Array.isArray(requirement.mandatoryConditions) ? requirement.mandatoryConditions : [],
    priority,
    customizationRequirements: Array.isArray(requirement.customizationRequirements)
      ? requirement.customizationRequirements
      : []
  };

  const candCapabilities = Array.isArray(candidate.supportedCapabilities)
    ? candidate.supportedCapabilities
    : Array.isArray(candidate.capabilities)
      ? candidate.capabilities
      : [];

  const candODataDeps = Array.isArray(candidate.odataDependencies)
    ? candidate.odataDependencies
    : Array.isArray(candidate.odataServices)
      ? candidate.odataServices
      : [];

  const candRoles = Array.isArray(candidate.businessRoles)
    ? candidate.businessRoles
    : typeof candidate.businessRole === 'string' && candidate.businessRole.trim()
      ? [candidate.businessRole.trim()]
      : [];

  const productVersion = candidate.productVersion || candidate.supportedProductRelease || '';

  const normalizedCandidate = {
    appId: String(candidate.appId).trim(),
    appName: candidate.appName || candidate.appId,
    appType: candidate.appType || 'Transactional',
    uiTechnology: candidate.uiTechnology || 'SAP Fiori elements',
    productVersion,
    supportedProductRelease: productVersion,
    businessProcess: candidate.businessProcess || candidate.lineOfBusiness || '',
    businessRoles: candRoles,
    businessRole: typeof candidate.businessRole === 'string' ? candidate.businessRole : (candRoles[0] || ''),
    odataDependencies: candODataDeps,
    odataServices: candODataDeps,
    supportedCapabilities: candCapabilities,
    capabilities: candCapabilities,
    verifiedODataServices: Array.isArray(candidate.verifiedODataServices) ? candidate.verifiedODataServices : [],
    documentationUrl: candidate.documentationUrl || `https://fal.cloud.sap/apps/${candidate.appId}`
  };

  const activeServices = Array.isArray(context.activeServices)
    ? context.activeServices
    : Array.isArray(context.activeGatewayServices)
      ? context.activeGatewayServices
      : [];

  const userAuthorizations = Array.isArray(context.userAuthorizations)
    ? context.userAuthorizations
    : Array.isArray(context.userRoles)
      ? context.userRoles
      : [];

  const systemRelease = context.systemRelease || context.targetSystem?.release || 'SAP S/4HANA 2023';
  const systemId = context.systemId || context.targetSystem?.systemId || 'S21-200';

  const normalizedContext = {
    targetSystem: {
      systemId,
      release: systemRelease,
      client: context.client || '200'
    },
    systemId,
    client: context.client || '200',
    systemRelease,
    activeServices,
    activeGatewayServices: activeServices,
    liveServices: Array.isArray(context.liveServices) ? context.liveServices : [],
    userAuthorizations,
    userRoles: userAuthorizations,
    customVariantActive: Boolean(context.customVariantActive)
  };

  return {
    requirement: normalizedRequirement,
    candidate: normalizedCandidate,
    context: normalizedContext
  };
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
  const assessmentStore = options.assessmentStore || defaultAssessmentStore;
  const falIngestionService = options.falIngestionService || defaultFalIngestionService;
  const discoveryEngine = options.discoveryEngine || transactionDiscoveryEngine;
  const evidenceEngine = options.evidenceEngine || technicalEvidenceEngine;
  const matchingEngineInstance = options.matchingEngine || fioriMatchingEngine;
  const mcpService = options.mcpService || defaultMcpService;
  const mcpDiscoveryOrchestrator = options.mcpDiscoveryOrchestrator || defaultMcpDiscoveryOrchestrator;
  const authService = options.authService || defaultAuthService;
  const securityAuditLogger = options.securityAuditLogger || defaultSecurityAuditLogger;
  const enforceAuth = options.enforceAuth === true || process.env.FIORIX_ENFORCE_AUTH === 'true';
  const systemRegistry = options.systemRegistry || defaultSystemRegistry;
  const defaultTenantId = options.tenantId || process.env.FIORIX_TENANT_ID || 'DEFAULT-TENANT-S21';
  const enterpriseService = options.enterpriseService || new EnterpriseService({ assessmentStore, systemRegistry });
  const generationHandoffStore = options.generationHandoffStore || defaultGenerationHandoffStore;
  if (options.assessmentStore && generationHandoffStore) {
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
  if (officialCatalogueAdapter && falIngestionService) {
    falIngestionService.adapter = officialCatalogueAdapter;
  }

  const server = http.createServer(async (req, res) => {
    setCorsHeaders(req, res);

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);

    // Helper to resolve authenticated user context (SEC-01 + S2)
    const resolveUser = () => {
      const authHeader = req.headers.authorization;
      const customSecret = req.headers['x-fiorix-admin-secret'];
      const configuredSecret = process.env.FIORIX_ADMIN_SECRET || (process.env.NODE_ENV !== 'production' ? 'dev-admin-secret-change-in-production' : undefined);
      const requestTenantId = req.headers['x-tenant-id'] || defaultTenantId;

      const isAdminSecretValid = (sec) => {
        if (!sec) return false;
        const clean = String(sec).trim();
        if (configuredSecret && clean === configuredSecret) return true;
        if (adapter && typeof adapter.verifyAdminSecret === 'function' && adapter.verifyAdminSecret(clean)) return true;
        return false;
      };

      if (customSecret && isAdminSecretValid(customSecret)) {
        return {
          id: req.headers['x-fiorix-admin-user'] || 'USR-ADMIN-01',
          name: req.headers['x-fiorix-admin-name'] || 'Enterprise System Administrator',
          email: req.headers['x-fiorix-admin-email'] || 'admin@fiorix.corp',
          role: USER_ROLES.ADMIN,
          tenantId: requestTenantId,
          department: 'SAP Architecture & Platform Governance'
        };
      }

      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.slice(7).trim();
        if (isAdminSecretValid(token)) {
          return {
            id: req.headers['x-fiorix-admin-user'] || 'USR-ADMIN-01',
            name: req.headers['x-fiorix-admin-name'] || 'Enterprise System Administrator',
            email: req.headers['x-fiorix-admin-email'] || 'admin@fiorix.corp',
            role: USER_ROLES.ADMIN,
            tenantId: requestTenantId,
            department: 'SAP Architecture & Platform Governance'
          };
        }
        const verified = authService.verifyToken(token);
        if (verified) {
          const tokenTenantId = verified.tenantId || verified.ext_attr?.zdn;
          const hasCrossTenantAdmin = Array.isArray(verified.scopes) && (
            verified.scopes.includes('fiorix.admin.access') ||
            verified.scopes.includes('fiorix.tenants.manage') ||
            verified.role === USER_ROLES.ADMIN
          );
          if (req.headers['x-tenant-id'] && tokenTenantId && req.headers['x-tenant-id'] !== tokenTenantId && !hasCrossTenantAdmin) {
            return { isUnauthenticated: true, authError: 'TENANT_SPOOFING_FORBIDDEN' };
          }
          verified.tenantId = (hasCrossTenantAdmin && req.headers['x-tenant-id']) ? req.headers['x-tenant-id'] : (tokenTenantId || defaultTenantId);
          return verified;
        }
        // Token was provided but is invalid / expired / untrusted
        return { isUnauthenticated: true, authError: 'INVALID_TOKEN' };
      }

      if (enforceAuth) {
        return { isUnauthenticated: true, authError: 'MISSING_TOKEN' };
      }

      // Default context for local/test execution without explicit enforceAuth (Admin for development & testing)
      return {
        id: 'USR-ADMIN-01',
        name: 'Enterprise System Administrator',
        email: 'admin@fiorix.corp',
        role: USER_ROLES.ADMIN,
        tenantId: defaultTenantId,
        department: 'SAP Architecture & Platform Governance'
      };
    };

    const currentUser = resolveUser();
    req.user = currentUser;

    const isPublicEndpoint = (
      url.pathname === '/' ||
      url.pathname === '/health' ||
      url.pathname === '/api/v1/health' ||
      url.pathname === '/api/v1/auth/login' ||
      url.pathname === '/api/v1/auth/logout' ||
      (req.method === 'GET' && url.pathname === '/api/v1/status')
    );

    if (!isPublicEndpoint && currentUser && currentUser.isUnauthenticated) {
      securityAuditLogger.logEvent({
        actor: 'anonymous',
        tenantId: 'UNKNOWN_TENANT',
        action: SECURITY_ACTIONS.AUTH_FAILURE,
        resource: url.pathname,
        outcome: 'FAILED',
        details: { reason: currentUser.authError }
      }).catch(() => {});

      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          success: false,
          statusCode: 'UNAUTHORIZED',
          error: 'Unauthorized',
          errorMessage: 'Authentication required. Invalid or missing Bearer token.'
        })
      );
      return;
    }

    const requirePermission = (permission) => {
      if (currentUser && (authService.hasPermission(currentUser, permission) || currentUser.role === USER_ROLES.ADMIN)) {
        return true;
      }
      securityAuditLogger.logEvent({
        actor: currentUser?.id || 'anonymous',
        tenantId: currentUser?.tenantId || 'DEFAULT-TENANT-S21',
        action: SECURITY_ACTIONS.PERMISSION_DENIED,
        resource: url.pathname,
        outcome: 'DENIED',
        details: { requiredPermission: permission, userRole: currentUser?.role }
      }).catch(() => {});

      res.writeHead(403, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          success: false,
          statusCode: 'FORBIDDEN',
          error: 'Forbidden',
          errorMessage: `User is lacking required permission "${permission}". Access denied.`
        })
      );
      return false;
    };

    const requireRole = (allowedRoles) => {
      if (currentUser && allowedRoles.includes(currentUser.role)) {
        return true;
      }
      securityAuditLogger.logEvent({
        actor: currentUser?.id || 'anonymous',
        tenantId: currentUser?.tenantId || 'DEFAULT-TENANT-S21',
        action: SECURITY_ACTIONS.PERMISSION_DENIED,
        resource: url.pathname,
        outcome: 'DENIED',
        details: { allowedRoles, userRole: currentUser?.role }
      }).catch(() => {});

      res.writeHead(403, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          success: false,
          statusCode: 'FORBIDDEN',
          error: 'Forbidden',
          errorMessage: `Role "${currentUser?.role}" is not authorized for this operation. Required: ${allowedRoles.join(', ')}.`
        })
      );
      return false;
    };

    // Helper to extract and verify admin secret
    const checkAdminAuth = () => {
      if (currentUser && currentUser.role === USER_ROLES.ADMIN) {
        return true;
      }
      const configuredSecret = process.env.FIORIX_ADMIN_SECRET;
      if (!configuredSecret) return true;
      const authHeader = req.headers.authorization;
      const bearerSecret = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : null;
      const customHeaderSecret = req.headers['x-fiorix-admin-secret']
        ? String(req.headers['x-fiorix-admin-secret']).trim()
        : null;
      const providedSecret = customHeaderSecret || bearerSecret;
      return adapter.verifyAdminSecret(providedSecret);
    };

    // 1. Root Service Index
    if (req.method === 'GET' && url.pathname === '/') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify(
          {
            service: 'FioriX SAP Finance Discovery API',
            version: '1.1.0',
            engine: 'Node 20 LTS (Native HTTP & CAP Ready)',
            targetSystem: 'S21 (Client 200) - SAP S/4HANA 2023 Private Edition',
            endpoints: [
              { method: 'GET', path: '/api/v1/health', description: 'Landscape and service health status' },
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



    // 2. Health Check
    if (req.method === 'GET' && url.pathname === '/api/v1/health') {
      const btpConfig = adapter.validateConfiguration();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          status: 'UP',
          timestamp: new Date().toISOString(),
          targetLandscape: {
            sid: 'S21',
            client: '200',
            release: 'SAP S/4HANA 2023 Private Edition',
            components: ['S4CORE 108', 'SAP_BASIS 758', 'SAP_UI 758', 'SAP_GWFND 758'],
            targetODataService: '/sap/opu/odata/sap/Z_FIORIX_DISCOVERY_SRV',
            gatewayCatalogService: '/sap/opu/odata/IWFND/CATALOGSERVICE;v=2/ServiceCollection'
          },
          btpDestinationStatus: {
            configured: btpConfig.isValid,
            destinationName: btpConfig.configuration.destinationName,
            sapClient: btpConfig.configuration.sapClient,
            destinationBindingPresent: btpConfig.destinationBinding.present,
            connectivityBindingPresent: btpConfig.connectivityBinding.present
          }
        }, null, 2)
      );
      return;
    }



    // 2b. Authentication Routes (SEC-01)
    if (req.method === 'POST' && url.pathname === '/api/v1/auth/login') {
      let body = '';
      req.on('data', (c) => (body += c));
      req.on('end', () => {
        let payload = {};
        try {
          payload = JSON.parse(body || '{}');
        } catch {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, statusCode: 'BAD_REQUEST', errorMessage: 'Malformed JSON payload.' }));
          return;
        }

        const authResult = authService.login(payload.email || payload.username, payload.password);
        if (!authResult.success) {
          res.writeHead(401, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, statusCode: 'UNAUTHORIZED', error: authResult.error, errorMessage: authResult.errorMessage }));
          return;
        }

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(authResult, null, 2));
      });
      return;
    }

    if (req.method === 'POST' && url.pathname === '/api/v1/auth/logout') {
      const authHeader = req.headers.authorization;
      if (authHeader) {
        authService.logout(authHeader);
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, message: 'Session successfully revoked.' }));
      return;
    }

    if (req.method === 'GET' && url.pathname === '/api/v1/auth/me') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, authenticated: Boolean(currentUser), user: currentUser }));
      return;
    }

    // Security Audit Event Trail (S2.4)
    if (req.method === 'GET' && url.pathname === '/api/v1/security/audit') {
      if (!requirePermission('fiorix.audit.read')) return;
      try {
        const tenantId = currentUser?.tenantId || 'DEFAULT-TENANT-S21';
        const events = await securityAuditLogger.listEvents({}, tenantId);
        const chainVerification = await securityAuditLogger.verifyChain(tenantId);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: true,
          events,
          chainVerification
        }, null, 2));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: err.message }));
      }
      return;
    }


    // 3. Landscape Registry & Multi-System Discovery (SAP-LIVE-01 & ENTERPRISE-01)
    if (req.method === 'GET' && url.pathname === '/api/v1/systems') {
      const regSystems = systemRegistry ? systemRegistry.listSystems() : [];
      const mockSystems = mockSapAdapter.getAvailableSystems();
      const merged = [...regSystems];
      for (const ms of mockSystems) {
        if (!merged.some((s) => s.systemId === ms.systemId)) {
          merged.push(ms);
        }
      }
      // Filter by tenant if user is tenant-scoped
      const filtered = merged.filter((s) => !s.tenantId || !currentUser?.tenantId || s.tenantId === currentUser.tenantId);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(filtered, null, 2));
      return;
    }

    if (req.method === 'GET' && url.pathname.startsWith('/api/v1/systems/') && !url.pathname.endsWith('/diagnostics')) {
      const systemId = decodeURIComponent(url.pathname.slice('/api/v1/systems/'.length));
      const system = systemRegistry ? systemRegistry.getSystem(systemId) : null;
      if (!system) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, statusCode: 'NOT_FOUND', errorMessage: `System "${systemId}" not found.` }));
        return;
      }
      // Tenant Isolation Check
      if (system.tenantId && currentUser?.tenantId && system.tenantId !== currentUser.tenantId) {
        securityAuditLogger.logEvent({
          actor: currentUser.id || 'anonymous',
          tenantId: currentUser.tenantId,
          action: SECURITY_ACTIONS.TENANT_ACCESS_VIOLATION,
          resource: `/api/v1/systems/${systemId}`,
          outcome: 'DENIED',
          details: { systemTenant: system.tenantId, userTenant: currentUser.tenantId }
        }).catch(() => {});

        res.writeHead(403, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: false,
          statusCode: 'FORBIDDEN',
          error: 'TenantAccessDenied',
          errorMessage: `Access denied to SAP system belonging to tenant "${system.tenantId}". Current tenant is "${currentUser.tenantId}".`
        }));
        return;
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, system }));
      return;
    }

    if (req.method === 'POST' && url.pathname.startsWith('/api/v1/systems/') && url.pathname.endsWith('/diagnostics')) {
      if (!requireRole([USER_ROLES.SAP_CONSULTANT, USER_ROLES.ADMIN])) return;
      const systemId = decodeURIComponent(url.pathname.slice('/api/v1/systems/'.length, -'/diagnostics'.length));
      try {
        const diagnostics = await systemRegistry.runDiagnostics(systemId);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(diagnostics, null, 2));
      } catch (diagErr) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, statusCode: 'INTERNAL_ERROR', errorMessage: diagErr.message }));
      }
      return;
    }




    // 4. Protected Gateway Smoke Test (Task 3)
    if (req.method === 'GET' && url.pathname === '/api/v1/gateway-smoke-test') {
      // Require server-side administrative secret
      const authHeader = req.headers.authorization;
      const bearerSecret = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : null;
      const customHeaderSecret = req.headers['x-fiorix-admin-secret']
        ? String(req.headers['x-fiorix-admin-secret']).trim()
        : null;
      const providedSecret = customHeaderSecret || bearerSecret;

      if (!adapter.verifyAdminSecret(providedSecret)) {
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(
          JSON.stringify({
            success: false,
            statusCode: 'UNAUTHORIZED',
            errorMessage: 'Access denied: Valid administrative secret required in X-FioriX-Admin-Secret or Authorization Bearer header.'
          }, null, 2)
        );
        return;
      }

      try {
        const smokeTestResult = await adapter.executeSmokeTest();
        const httpStatus = smokeTestResult.httpStatus || (smokeTestResult.success ? 200 : 502);

        res.writeHead(httpStatus, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(smokeTestResult, null, 2));
      } catch (err) {
        const sanitized = sanitizeErrorMessage(err.message || 'Unknown smoke test error');
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(
          JSON.stringify({
            success: false,
            statusCode: 'INTERNAL_ERROR',
            errorMessage: `Unexpected error during Gateway smoke test: ${sanitized}`
          }, null, 2)
        );
      }
      return;
    }




    // 5. Live SAP Gateway OData Catalog Search (Sprint 6.3)
    if (req.method === 'GET' && url.pathname === '/api/v1/gateway/services') {
      if (!checkAdminAuth()) {
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(
          JSON.stringify({
            success: false,
            statusCode: 'UNAUTHORIZED',
            errorMessage: 'Access denied: Valid administrative secret required.'
          }, null, 2)
        );
        return;
      }

      const search = url.searchParams.get('search') || '';
      const limit = Number(url.searchParams.get('limit')) || 0;
      const refresh = url.searchParams.get('refresh') === 'true';

      try {
        const result = await gatewayAdapter.getCatalogServices({ search, limit, refresh });
        res.writeHead(result.httpStatus || (result.success ? 200 : 502), { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(result, null, 2));
      } catch (err) {
        const sanitized = sanitizeErrorMessage(err.message || 'Failed to retrieve Gateway catalog');
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, statusCode: 'INTERNAL_ERROR', errorMessage: sanitized }, null, 2));
      }
      return;
    }




    // 6. Parsed Service $metadata EDMX Query (Sprint 6.3 & 6.4)
    if (req.method === 'GET' && url.pathname.startsWith('/api/v1/gateway/services/') && url.pathname.endsWith('/metadata')) {
      if (!checkAdminAuth()) {
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(
          JSON.stringify({
            success: false,
            statusCode: 'UNAUTHORIZED',
            errorMessage: 'Access denied: Valid administrative secret required.'
          }, null, 2)
        );
        return;
      }

      const serviceId = url.pathname.slice('/api/v1/gateway/services/'.length, -'/metadata'.length);
      try {
        const result = await gatewayAdapter.getServiceMetadata(decodeURIComponent(serviceId));
        res.writeHead(result.httpStatus || (result.success ? 200 : 502), { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(result, null, 2));
      } catch (err) {
        const sanitized = sanitizeErrorMessage(err.message || 'Failed to retrieve service metadata');
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, statusCode: 'INTERNAL_ERROR', errorMessage: sanitized }, null, 2));
      }
      return;
    }




    // 7. Live SAP Transaction Discovery (Sprint 6.2 & 6.5)
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
        return;
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
      return;
    }




    // 8. Official SAP Fiori Apps Reference Library App by ID (Sprint 7 / CAT-02 Read-Only Public)
    if (req.method === 'GET' && url.pathname.startsWith('/api/v1/fiori-catalogue/apps/')) {
      const appId = decodeURIComponent(url.pathname.slice('/api/v1/fiori-catalogue/apps/'.length));
      const refresh = url.searchParams.get('refresh') === 'true';

      // Administrative refresh operations require admin authorization
      if (refresh && !checkAdminAuth()) {
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(
          JSON.stringify({
            success: false,
            statusCode: 'UNAUTHORIZED',
            errorMessage: 'Access denied: Valid administrative secret required for catalogue refresh.'
          }, null, 2)
        );
        return;
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
      return;
    }




    // 9. Official SAP Fiori Apps Reference Library Multi-Criteria Search (Sprint 7 / CAT-02 Read-Only Public)
    if (req.method === 'GET' && (url.pathname === '/api/v1/fiori-catalogue/search' || url.pathname === '/api/v1/fiori-catalogue/apps')) {
      const refresh = url.searchParams.get('refresh') === 'true';
      const evaluateLive = url.searchParams.get('evaluateLive') === 'true';

      // Administrative refresh operations and live Gateway evaluations require admin authorization
      if ((refresh || evaluateLive) && !checkAdminAuth()) {
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(
          JSON.stringify({
            success: false,
            statusCode: 'UNAUTHORIZED',
            errorMessage: 'Access denied: Valid administrative secret required for live evaluation or refresh.'
          }, null, 2)
        );
        return;
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
          return;
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
      return;
    }




    // 9a. Ingest Official FAL Export (CAT-01, Protected)
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
        return;
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

      req.on('end', async () => {
        if (isAborted) return;

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
            return;
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
            return;
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
      });
      return;
    }



    // 9b. Catalogue Status and Health (CAT-01)
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
      return;
    }


    // 9c. Controlled Catalogue Synchronization (CAT-04)
    if (req.method === 'POST' && url.pathname === '/api/v1/fiori-catalogue/sync') {
      if (!requireRole([USER_ROLES.ADMIN])) return;

      let body = '';
      req.on('data', (c) => (body += c));
      req.on('end', async () => {
        let payload = {};
        if (body.trim().length > 0) {
          try {
            payload = JSON.parse(body);
          } catch {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: false, statusCode: 'BAD_REQUEST', errorMessage: 'Malformed JSON payload.' }));
            return;
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
      });
      return;
    }

    // 9d. Safe Catalogue Rollback (Admin Protected)
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
        return;
      }

      let body = '';
      req.on('data', (c) => (body += c));
      req.on('end', async () => {
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
      });
      return;
    }



    // 8. Evidence-based T-Code Search & Discovery (Canonical Discovery Pipeline Delegation)
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

      req.on('end', async () => {
        if (isAborted) return;

        let payload;
        try {
          payload = JSON.parse(body || '{}');
        } catch (parseErr) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Bad Request', message: 'Malformed JSON payload.' }));
          return;
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
            return;
          }

          if (!rawTcode || !rawTcode.trim()) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Bad Request', message: 'Transaction code (tcode) is required as a non-empty string.' }));
            return;
          }

          const targetSystem = mockSapAdapter.getSystemById(systemId);
          const isLiveMode = payload.useLiveSap === true || (targetSystem?.mode === 'LIVE_SAP' && payload.useLiveSap !== false && payload.mode !== 'MOCK');

          // If targeting LIVE_SAP and an admin secret is configured on the server, protect live queries
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
              return;
            }
          }

          const correlationId = req.headers['x-correlation-id'] || `corr-${Date.now()}-${requestCounter++}`;
          res.setHeader('X-Correlation-ID', correlationId);
          const reqNum = String(requestCounter++).padStart(6, '0');
          const requestId = `SRV-${reqNum}`;
          const timestamp = new Date().toISOString();

          // 1. Delegate directly to canonical transaction discovery engine
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
            return;
          }

          if (!discoveryResult.success && (discoveryResult.statusCode === 'CONNECTION_ERROR' || discoveryResult.statusCode === 'GATEWAY_ERROR' || discoveryResult.statusCode === 'DESTINATION_NOT_CONFIGURED')) {
            res.writeHead(502, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
              error: 'Bad Gateway',
              statusCode: discoveryResult.statusCode,
              message: discoveryResult.errorMessage || 'Failed to communicate with SAP landscape.',
              overallStatus: 'CONNECTION_ERROR'
            }));
            return;
          }

          // 2. Canonical catalogue search
          const localSearchResult = await officialCatalogueAdapter.searchApps({
            tcode: discoveryResult.tcode,
            query: discoveryResult.transactionDescription || discoveryResult.description || '',
            limit: 50
          });
          const candidatePool = localSearchResult?.candidates || [];

          // 3. Canonical matching evaluation
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
            : (rawClassification || (candidates.length > 0 ? 'MATCH_FOUND' : 'NO_VERIFIED_MATCH'));
          const overallStatus = status;

          // Legacy transaction format compatibility
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
            // Canonical fields
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
      });
      return;
    }



    // 10. Execute Evidence-Backed Fit-Gap Assessment (FITGAP-01)
    if (req.method === 'POST' && url.pathname === '/api/v1/fitgap/assess') {
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
              success: false,
              statusCode: 'PAYLOAD_TOO_LARGE',
              error: 'Payload Too Large',
              errorMessage: `Request body exceeds maximum size of ${MAX_BODY_SIZE / 1024}KB.`,
              message: `Request body exceeds maximum size of ${MAX_BODY_SIZE / 1024}KB.`
            })
          );
          return;
        }
        body += chunk;
      });

      req.on('end', async () => {
        if (isAborted) return;

        let payload;
        try {
          payload = JSON.parse(body || '{}');
        } catch (parseErr) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(
            JSON.stringify({
              success: false,
              statusCode: 'BAD_REQUEST',
              error: 'Bad Request',
              errorMessage: 'Malformed JSON payload.',
              message: 'Malformed JSON payload.'
            })
          );
          return;
        }

        const validation = validateFitGapAssessRequest(payload);
        if (!validation.isValid) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(
            JSON.stringify({
              success: false,
              statusCode: 'BAD_REQUEST',
              error: 'Bad Request',
              errorMessage: validation.error,
              message: validation.error
            })
          );
          return;
        }

        const correlationId = req.headers['x-correlation-id'] || null;
        if (correlationId) {
          res.setHeader('X-Correlation-ID', correlationId);
        }

        const reqNum = String(requestCounter++).padStart(6, '0');
        const requestId = `REQ-FITGAP-${reqNum}`;

        try {
          const normalizedInput = normalizeFitGapInput(payload);
          const assessment = fitGapEngine.evaluate(normalizedInput);

          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(
            JSON.stringify(
              {
                success: true,
                requestId,
                correlationId: correlationId || undefined,
                timestamp: new Date().toISOString(),
                overallStatus: assessment.overallStatus,
                overallScore: assessment.overallScore,
                assessment
              },
              null,
              2
            )
          );
        } catch (evalErr) {
          const sanitized = sanitizeErrorMessage(evalErr.message || 'Fit-gap evaluation error');
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(
            JSON.stringify({
              success: false,
              statusCode: 'INTERNAL_ERROR',
              error: 'Internal Server Error',
              errorMessage: `Unexpected error during fit-gap assessment evaluation: ${sanitized}`,
              message: `Unexpected error during fit-gap assessment evaluation: ${sanitized}`
            })
          );
        }
      });
      return;
    }



    // 10b. Governed Recommendation Generation (REC-01)
    if (req.method === 'POST' && url.pathname === '/api/v1/recommendations/generate') {
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
              success: false,
              statusCode: 'PAYLOAD_TOO_LARGE',
              error: 'Payload Too Large',
              errorMessage: `Request body exceeds maximum size of ${MAX_BODY_SIZE / 1024}KB.`
            })
          );
          return;
        }
        body += chunk;
      });

      req.on('end', async () => {
        if (isAborted) return;

        let payload;
        try {
          payload = JSON.parse(body || '{}');
        } catch {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(
            JSON.stringify({
              success: false,
              statusCode: 'BAD_REQUEST',
              error: 'Bad Request',
              errorMessage: 'Malformed JSON payload.'
            })
          );
          return;
        }

        const hasAssessment = payload && typeof payload.assessment === 'object';
        const hasReqAndCand = payload && typeof payload.requirement === 'object' && typeof payload.candidate === 'object';

        if (!hasAssessment && !hasReqAndCand) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(
            JSON.stringify({
              success: false,
              statusCode: 'BAD_REQUEST',
              error: 'Bad Request',
              errorMessage: 'Request payload requires either an "assessment" object or both "requirement" and "candidate" specifications.'
            })
          );
          return;
        }

        const correlationId = req.headers['x-correlation-id'] || null;
        if (correlationId) {
          res.setHeader('X-Correlation-ID', correlationId);
        }

        const reqNum = String(requestCounter++).padStart(6, '0');
        const requestId = `REQ-REC-${reqNum}`;

        try {
          const recommendation = recommendationEngine.generate(payload);

          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(
            JSON.stringify(
              {
                success: true,
                requestId,
                correlationId: correlationId || undefined,
                timestamp: new Date().toISOString(),
                outcome: recommendation.outcome,
                confidence: recommendation.confidence,
                recommendation
              },
              null,
              2
            )
          );
        } catch (recErr) {
          const sanitized = sanitizeErrorMessage(recErr.message || 'Recommendation generation error');
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(
            JSON.stringify({
              success: false,
              statusCode: 'INTERNAL_ERROR',
              error: 'Internal Server Error',
              errorMessage: `Unexpected error during recommendation generation: ${sanitized}`
            })
          );
        }
      });
      return;
    }



    // 11. Create & Persist Assessment (PERSIST-01)
    if (req.method === 'POST' && url.pathname === '/api/v1/assessments') {
      let body = '';
      let bodyLength = 0;
      let isAborted = false;

      req.on('data', (chunk) => {
        if (isAborted) return;
        bodyLength += chunk.length;
        if (bodyLength > MAX_BODY_SIZE) {
          isAborted = true;
          req.pause();
          res.writeHead(413, { 'Content-Type': 'application/json', 'Connection': 'close' });
          res.end(
            JSON.stringify({
              success: false,
              statusCode: 'PAYLOAD_TOO_LARGE',
              error: 'Payload Too Large',
              errorMessage: `Request body exceeds maximum size of ${MAX_BODY_SIZE / 1024}KB.`,
              message: `Request body exceeds maximum size of ${MAX_BODY_SIZE / 1024}KB.`
            })
          );
          req.destroy();
          return;
        }
        body += chunk;
      });

      req.on('end', async () => {
        if (isAborted) return;

        let payload;
        try {
          payload = JSON.parse(body || '{}');
        } catch (parseErr) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(
            JSON.stringify({
              success: false,
              statusCode: 'BAD_REQUEST',
              error: 'Bad Request',
              errorMessage: 'Malformed JSON payload.',
              message: 'Malformed JSON payload.'
            })
          );
          return;
        }

        const correlationId = req.headers['x-correlation-id'] || req.headers['x-request-id'];
        const requestId = correlationId || `REQ-ASM-${String(requestCounter++).padStart(6, '0')}`;

        try {
          const record = await assessmentStore.create(payload, requestId);

          res.writeHead(201, { 'Content-Type': 'application/json' });
          res.end(
            JSON.stringify(
              {
                success: true,
                statusCode: 'CREATED',
                requestId,
                correlationId: correlationId || undefined,
                assessment: record
              },
              null,
              2
            )
          );
        } catch (err) {
          if (err.code === 'VALIDATION_ERROR') {
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
            return;
          }

          if (err.code === 'ID_CONFLICT') {
            res.writeHead(409, { 'Content-Type': 'application/json' });
            res.end(
              JSON.stringify({
                success: false,
                statusCode: 'CONFLICT',
                error: 'Conflict',
                errorMessage: err.message,
                message: err.message
              })
            );
            return;
          }

          const sanitized = sanitizeErrorMessage(err.message || 'Storage error');
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(
            JSON.stringify({
              success: false,
              statusCode: 'INTERNAL_ERROR',
              error: 'Internal Server Error',
              errorMessage: `Unexpected error during assessment persistence: ${sanitized}`,
              message: `Unexpected error during assessment persistence: ${sanitized}`
            })
          );
        }
      });
      return;
    }



    // 12. Assessment Summary Metrics (PERSIST-01)
    if (req.method === 'GET' && url.pathname === '/api/v1/assessments/summary') {
      try {
        const summary = await assessmentStore.getSummary();
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(
          JSON.stringify(
            {
              success: true,
              summary
            },
            null,
            2
          )
        );
      } catch (err) {
        const sanitized = sanitizeErrorMessage(err.message || 'Failed to retrieve assessment summary');
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(
          JSON.stringify({
            success: false,
            statusCode: 'INTERNAL_ERROR',
            errorMessage: sanitized
          })
        );
      }
      return;
    }




    // 13a. Assessment Audit Trail (PERSIST-02)
    if (req.method === 'GET' && url.pathname.startsWith('/api/v1/assessments/') && url.pathname.endsWith('/audit')) {
      const assessmentId = decodeURIComponent(url.pathname.slice('/api/v1/assessments/'.length, -'/audit'.length));
      try {
        const auditEvents = await assessmentStore.getAuditHistory(assessmentId);
        if (auditEvents === null) {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          res.end(
            JSON.stringify({
              success: false,
              statusCode: 'NOT_FOUND',
              error: 'Not Found',
              errorMessage: `Assessment not found: ${assessmentId}`
            })
          );
          return;
        }

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(
          JSON.stringify(
            {
              success: true,
              assessmentId,
              count: auditEvents.length,
              auditEvents
            },
            null,
            2
          )
        );
      } catch (err) {
        const sanitized = sanitizeErrorMessage(err.message || 'Failed to retrieve assessment audit history');
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(
          JSON.stringify({
            success: false,
            statusCode: 'INTERNAL_ERROR',
            errorMessage: sanitized
          })
        );
      }
      return;
    }




    // 13b. Archive Assessment (PERSIST-02)
    if (req.method === 'POST' && url.pathname.startsWith('/api/v1/assessments/') && url.pathname.endsWith('/archive')) {
      const assessmentId = decodeURIComponent(url.pathname.slice('/api/v1/assessments/'.length, -'/archive'.length));
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
              success: false,
              statusCode: 'PAYLOAD_TOO_LARGE',
              error: 'Payload Too Large',
              errorMessage: `Request body exceeds maximum size of ${MAX_BODY_SIZE / 1024}KB.`
            })
          );
          return;
        }
        body += chunk;
      });

      req.on('end', async () => {
        if (isAborted) return;
        let payload = {};
        if (body.trim().length > 0) {
          try {
            payload = JSON.parse(body);
          } catch {
            // ignore non-json archive comment
          }
        }

        try {
          const archived = await assessmentStore.archive(
            assessmentId,
            payload.author || 'System Administrator',
            payload.comment || 'Assessment archived by user request.'
          );

          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(
            JSON.stringify(
              {
                success: true,
                statusCode: 'ARCHIVED',
                assessment: archived
              },
              null,
              2
            )
          );
        } catch (err) {
          if (err.code === 'NOT_FOUND') {
            res.writeHead(404, { 'Content-Type': 'application/json' });
            res.end(
              JSON.stringify({
                success: false,
                statusCode: 'NOT_FOUND',
                error: 'Not Found',
                errorMessage: err.message
              })
            );
            return;
          }
          const sanitized = sanitizeErrorMessage(err.message || 'Failed to archive assessment');
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(
            JSON.stringify({
              success: false,
              statusCode: 'INTERNAL_ERROR',
              errorMessage: sanitized
            })
          );
        }
      });
      return;
    }



    // 13c. Update Assessment & Advance Lifecycle State (PERSIST-02)
    if (
      req.method === 'PUT' &&
      url.pathname.startsWith('/api/v1/assessments/') &&
      url.pathname !== '/api/v1/assessments/summary' &&
      !url.pathname.endsWith('/audit') &&
      !url.pathname.endsWith('/archive') &&
      !url.pathname.endsWith('/deployment-readiness')
    ) {
      const assessmentId = decodeURIComponent(url.pathname.slice('/api/v1/assessments/'.length));
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
              success: false,
              statusCode: 'PAYLOAD_TOO_LARGE',
              error: 'Payload Too Large',
              errorMessage: `Request body exceeds maximum size of ${MAX_BODY_SIZE / 1024}KB.`
            })
          );
          return;
        }
        body += chunk;
      });

      req.on('end', async () => {
        if (isAborted) return;
        let payload;
        try {
          payload = JSON.parse(body || '{}');
        } catch {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(
            JSON.stringify({
              success: false,
              statusCode: 'BAD_REQUEST',
              error: 'Bad Request',
              errorMessage: 'Malformed JSON payload.'
            })
          );
          return;
        }

        try {
          const updated = await assessmentStore.update(
            assessmentId,
            payload,
            payload.author || 'System Administrator',
            payload.comment || ''
          );

          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(
            JSON.stringify(
              {
                success: true,
                statusCode: 'UPDATED',
                assessment: updated
              },
              null,
              2
            )
          );
        } catch (err) {
          if (err.code === 'NOT_FOUND') {
            res.writeHead(404, { 'Content-Type': 'application/json' });
            res.end(
              JSON.stringify({
                success: false,
                statusCode: 'NOT_FOUND',
                error: 'Not Found',
                errorMessage: err.message
              })
            );
            return;
          }
          if (err.code === 'SEPARATION_OF_DUTIES_VIOLATION') {
            res.writeHead(403, { 'Content-Type': 'application/json' });
            res.end(
              JSON.stringify({
                success: false,
                statusCode: err.code,
                error: 'Forbidden',
                errorMessage: err.message
              })
            );
            return;
          }
          if (err.code === 'INVALID_STATE_TRANSITION' || err.code === 'VALIDATION_ERROR') {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(
              JSON.stringify({
                success: false,
                statusCode: err.code,
                error: 'Bad Request',
                errorMessage: err.message
              })
            );
            return;
          }
          const sanitized = sanitizeErrorMessage(err.message || 'Failed to update assessment');
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(
            JSON.stringify({
              success: false,
              statusCode: 'INTERNAL_ERROR',
              errorMessage: sanitized
            })
          );
        }
      });
      return;
    }



    // 13d. Submit Assessment for Governance Review (GOV-01)
    if (req.method === 'POST' && url.pathname.startsWith('/api/v1/assessments/') && url.pathname.endsWith('/submit-review')) {
      if (!requireRole([USER_ROLES.SAP_CONSULTANT, USER_ROLES.ADMIN])) return;
      const assessmentId = decodeURIComponent(url.pathname.slice('/api/v1/assessments/'.length, -'/submit-review'.length));
      let body = '';
      req.on('data', (c) => (body += c));
      req.on('end', async () => {
        let payload = {};
        if (body.trim().length > 0) {
          try { payload = JSON.parse(body); } catch { /* ignore */ }
        }
        try {
          const updated = await assessmentStore.submitForReview(assessmentId, currentUser, payload.comment || 'Submitted for governance review.');
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true, statusCode: 'PENDING_REVIEW', assessment: updated }, null, 2));
        } catch (err) {
          res.writeHead(err.code === 'NOT_FOUND' ? 404 : 400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, statusCode: err.code || 'BAD_REQUEST', errorMessage: err.message }));
        }
      });
      return;
    }

    // 13e. Controlled Approval Gate (GOV-01)
    if (req.method === 'POST' && url.pathname.startsWith('/api/v1/assessments/') && url.pathname.endsWith('/approve')) {
      if (!requireRole([USER_ROLES.APPROVER, USER_ROLES.ADMIN])) return;
      const assessmentId = decodeURIComponent(url.pathname.slice('/api/v1/assessments/'.length, -'/approve'.length));
      let body = '';
      req.on('data', (c) => (body += c));
      req.on('end', async () => {
        let payload = {};
        if (body.trim().length > 0) {
          try { payload = JSON.parse(body); } catch { /* ignore */ }
        }
        try {
          const updated = await assessmentStore.approve(assessmentId, currentUser, payload.comment || 'Formally approved for modernization roadmap.', payload.isOverride === true);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true, statusCode: 'APPROVED', assessment: updated }, null, 2));
        } catch (err) {
          const status = err.code === 'NOT_FOUND' ? 404 : (err.code === 'SEPARATION_OF_DUTIES_VIOLATION' ? 403 : 400);
          res.writeHead(status, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, statusCode: err.code || 'BAD_REQUEST', errorMessage: err.message }));
        }
      });
      return;
    }

    // 13f. Controlled Rejection Gate (GOV-01)
    if (req.method === 'POST' && url.pathname.startsWith('/api/v1/assessments/') && url.pathname.endsWith('/reject')) {
      if (!requireRole([USER_ROLES.APPROVER, USER_ROLES.ADMIN])) return;
      const assessmentId = decodeURIComponent(url.pathname.slice('/api/v1/assessments/'.length, -'/reject'.length));
      let body = '';
      req.on('data', (c) => (body += c));
      req.on('end', async () => {
        let payload = {};
        if (body.trim().length > 0) {
          try { payload = JSON.parse(body); } catch { /* ignore */ }
        }
        try {
          const updated = await assessmentStore.reject(assessmentId, currentUser, payload.reason || payload.comment);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true, statusCode: 'REJECTED', assessment: updated }, null, 2));
        } catch (err) {
          const status = err.code === 'NOT_FOUND' ? 404 : 400;
          res.writeHead(status, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, statusCode: err.code || 'BAD_REQUEST', errorMessage: err.message }));
        }
      });
      return;
    }

    // 13g. Verify Cryptographic Audit Chain (GOV-01)
    if (req.method === 'GET' && url.pathname.startsWith('/api/v1/assessments/') && url.pathname.endsWith('/verify-audit')) {
      const assessmentId = decodeURIComponent(url.pathname.slice('/api/v1/assessments/'.length, -'/verify-audit'.length));
      try {
        const verification = await assessmentStore.verifyAuditChain(assessmentId);
        res.writeHead(verification.valid ? 200 : 400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: verification.valid,
          assessmentId,
          verification,
          auditChain: {
            verified: verification.valid,
            eventCount: verification.count,
            latestHash: verification.latestHash
          }
        }, null, 2));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, statusCode: 'INTERNAL_ERROR', errorMessage: err.message }));
      }
      return;
    }


    // 13h. Update Deployment Readiness Stage (ENTERPRISE-01)
    if (req.method === 'PUT' && url.pathname.startsWith('/api/v1/assessments/') && url.pathname.endsWith('/deployment-readiness')) {
      if (!requireRole([USER_ROLES.SAP_CONSULTANT, USER_ROLES.ADMIN])) return;
      const assessmentId = decodeURIComponent(url.pathname.slice('/api/v1/assessments/'.length, -'/deployment-readiness'.length));
      let body = '';
      req.on('data', (c) => (body += c));
      req.on('end', async () => {
        let payload = {};
        try { payload = JSON.parse(body || '{}'); } catch {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, statusCode: 'BAD_REQUEST', errorMessage: 'Malformed JSON payload.' }));
          return;
        }
        try {
          const updated = await enterpriseService.updateDeploymentReadiness(assessmentId, payload, currentUser);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true, assessment: updated }, null, 2));
        } catch (err) {
          res.writeHead(err.code === 'NOT_FOUND' ? 404 : 400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, statusCode: err.code || 'BAD_REQUEST', errorMessage: err.message }));
        }
      });
      return;
    }

    // 13i. Enterprise Modernization Portfolio Metrics (ENTERPRISE-01)
    if (req.method === 'GET' && url.pathname === '/api/v1/enterprise/portfolio') {
      try {
        const systemId = url.searchParams.get('systemId') || undefined;
        const portfolio = await enterpriseService.getPortfolioMetrics(systemId);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, portfolio }, null, 2));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, statusCode: 'INTERNAL_ERROR', errorMessage: err.message }));
      }
      return;
    }


    // 13j. Enterprise Modernization Roadmap (ENTERPRISE-01)
    if (req.method === 'GET' && url.pathname === '/api/v1/enterprise/roadmap') {
      try {
        const systemId = url.searchParams.get('systemId') || undefined;
        const roadmap = await enterpriseService.generateRoadmap(systemId);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, roadmap }, null, 2));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, statusCode: 'INTERNAL_ERROR', errorMessage: err.message }));
      }
      return;
    }


    // 13k. Multi-Transaction Process Level Assessment (ENTERPRISE-01)
    if (req.method === 'POST' && url.pathname === '/api/v1/enterprise/assessments/process') {
      if (!requireRole([USER_ROLES.SAP_CONSULTANT, USER_ROLES.ADMIN])) return;
      let body = '';
      req.on('data', (c) => (body += c));
      req.on('end', async () => {
        let payload = {};
        try { payload = JSON.parse(body || '{}'); } catch {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, statusCode: 'BAD_REQUEST', errorMessage: 'Malformed JSON payload.' }));
          return;
        }
        try {
          const result = await enterpriseService.createProcessAssessment(payload, currentUser);
          res.writeHead(201, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true, ...result }, null, 2));
        } catch (err) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, statusCode: 'BAD_REQUEST', errorMessage: err.message }));
        }
      });
      return;
    }

    // 13l. Export Enterprise Reports (ENTERPRISE-01)
    if (req.method === 'GET' && url.pathname.startsWith('/api/v1/enterprise/reports/')) {
      const reportType = decodeURIComponent(url.pathname.slice('/api/v1/enterprise/reports/'.length));
      try {
        const systemId = url.searchParams.get('systemId') || undefined;
        const format = (url.searchParams.get('format') || 'json').toLowerCase();
        const report = await enterpriseService.exportReport(reportType, { systemId });
        if (format === 'markdown' || format === 'md') {
          const md = enterpriseService.renderReportMarkdown(report);
          res.writeHead(200, { 'Content-Type': 'text/markdown; charset=utf-8' });
          res.end(md);
          return;
        }
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, report }, null, 2));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, statusCode: 'INTERNAL_ERROR', errorMessage: err.message }));
      }
      return;
    }


    // 13m. Record Modernization Action (MW-02)
    if (req.method === 'POST' && url.pathname.startsWith('/api/v1/assessments/') && url.pathname.endsWith('/modernization-action')) {
      const assessmentId = decodeURIComponent(url.pathname.slice('/api/v1/assessments/'.length, -'/modernization-action'.length));
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
          res.end(JSON.stringify({ success: false, statusCode: 'PAYLOAD_TOO_LARGE', errorMessage: 'Payload exceeds maximum limit' }));
          return;
        }
        body += chunk;
      });

      req.on('end', async () => {
        if (isAborted) return;
        let payload = {};
        try {
          payload = JSON.parse(body || '{}');
        } catch {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, statusCode: 'BAD_REQUEST', errorMessage: 'Malformed JSON payload.' }));
          return;
        }

        try {
          const result = await assessmentStore.recordModernizationAction(assessmentId, payload, currentUser);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(result, null, 2));
        } catch (err) {
          const status = err.code === 'NOT_FOUND'
            ? 404
            : err.code === 'UNAUTHORIZED_BUILD'
            ? 403
            : 400;
          res.writeHead(status, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            success: false,
            statusCode: err.code || 'BAD_REQUEST',
            errorMessage: err.message,
            error: err.message
          }));
        }
      });
      return;
    }

    // 13n. Retrieve Modernization Decisions History (MW-02)
    if (req.method === 'GET' && url.pathname.startsWith('/api/v1/assessments/') && url.pathname.endsWith('/modernization-decisions')) {
      const assessmentId = decodeURIComponent(url.pathname.slice('/api/v1/assessments/'.length, -'/modernization-decisions'.length));
      try {
        const decisions = await assessmentStore.getModernizationDecisions(assessmentId);
        if (decisions === null) {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, statusCode: 'NOT_FOUND', errorMessage: `Assessment not found: ${assessmentId}` }));
          return;
        }
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, assessmentId, count: decisions.length, decisions }, null, 2));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, statusCode: 'INTERNAL_ERROR', errorMessage: err.message }));
      }
      return;
    }


    // 13o. Create Generation Studio Handoff (MW-03)
    if (req.method === 'POST' && url.pathname === '/api/v1/generation/handoff') {
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
          res.end(JSON.stringify({ success: false, statusCode: 'PAYLOAD_TOO_LARGE', errorMessage: 'Payload exceeds maximum limit' }));
          return;
        }
        body += chunk;
      });

      req.on('end', async () => {
        if (isAborted) return;
        let payload = {};
        try {
          payload = JSON.parse(body || '{}');
        } catch {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, statusCode: 'BAD_REQUEST', errorMessage: 'Malformed JSON payload.' }));
          return;
        }

        try {
          const handoff = await generationHandoffStore.createHandoff(payload, currentUser);
          res.writeHead(201, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true, statusCode: 'CREATED', handoff }, null, 2));
        } catch (err) {
          const status = err.code === 'NOT_FOUND'
            ? 404
            : err.code === 'UNAUTHORIZED_BUILD'
            ? 403
            : 400;
          res.writeHead(status, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            success: false,
            statusCode: err.code || 'BAD_REQUEST',
            errorMessage: err.message,
            error: err.message
          }));
        }
      });
      return;
    }

    // 13p. Retrieve Generation Studio Handoff by ID (MW-03)
    if (req.method === 'GET' && url.pathname.startsWith('/api/v1/generation/handoff/')) {
      const handoffId = decodeURIComponent(url.pathname.slice('/api/v1/generation/handoff/'.length));
      try {
        const handoff = await generationHandoffStore.getHandoff(handoffId);
        if (!handoff) {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, statusCode: 'NOT_FOUND', errorMessage: `Generation handoff not found: ${handoffId}` }));
          return;
        }
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, handoff }, null, 2));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, statusCode: 'INTERNAL_ERROR', errorMessage: err.message }));
      }
      return;
    }


    // 13q. List Generation Studio Handoffs (MW-03)
    if (req.method === 'GET' && url.pathname === '/api/v1/generation/handoff') {
      try {
        const assessmentId = url.searchParams.get('assessmentId') || undefined;
        const tcode = url.searchParams.get('tcode') || undefined;
        const handoffs = await generationHandoffStore.listHandoffs({ assessmentId, tcode });
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, count: handoffs.length, handoffs }, null, 2));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, statusCode: 'INTERNAL_ERROR', errorMessage: err.message }));
      }
      return;
    }


    // Generation Studio Routes (GEN-02, GEN-03, GEN-04)
    const generationHandled = await handleGenerationRoutes(req, res, url, {
      currentUser,
      requirePermission,
      securityAuditLogger,
      generationProjectService,
      requirementsService,
      dataModelService,
      cdsRegistry: cdsReuseRegistry
    });
    if (generationHandled) return;

    // 13r. Generation Studio Projects API (P1-B + P1-C)
    // List Generation Projects
    if (req.method === 'GET' && url.pathname === '/api/v1/generation/projects') {
      if (!requirePermission(PERMISSIONS.GENERATION_MANAGE)) return;
      try {
        const search = url.searchParams.get('search') || undefined;
        const lifecycleStatus = url.searchParams.get('lifecycleStatus') || undefined;
        const origin = url.searchParams.get('origin') || undefined;
        const page = url.searchParams.get('page') || undefined;
        const pageSize = url.searchParams.get('pageSize') || undefined;
        const sortOrder = url.searchParams.get('sortOrder') || undefined;

        const result = await generationProjectService.listProjects({
          search,
          lifecycleStatus,
          origin,
          page,
          pageSize,
          sortOrder
        }, currentUser);

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, ...result }, null, 2));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, statusCode: 'INTERNAL_ERROR', errorMessage: err.message }));
      }
      return;
    }


    // Create Generation Project (Standalone or from Approved Assessment Handoff)
    if (req.method === 'POST' && url.pathname === '/api/v1/generation/projects') {
      if (!requirePermission(PERMISSIONS.GENERATION_MANAGE)) return;
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
          res.end(JSON.stringify({ success: false, statusCode: 'PAYLOAD_TOO_LARGE', errorMessage: 'Payload exceeds maximum limit' }));
          return;
        }
        body += chunk;
      });

      req.on('end', async () => {
        if (isAborted) return;
        let payload = {};
        try {
          payload = JSON.parse(body || '{}');
        } catch {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, statusCode: 'BAD_REQUEST', errorMessage: 'Malformed JSON payload.' }));
          return;
        }

        try {
          const result = await generationProjectService.createProject(payload, currentUser);
          const statusCode = result.alreadyExists ? 200 : 201;
          res.writeHead(statusCode, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            success: true,
            statusCode: result.alreadyExists ? 'OK' : 'CREATED',
            alreadyExists: result.alreadyExists,
            message: result.message,
            project: result.project
          }, null, 2));
        } catch (err) {
          const status = err.code === 'NOT_FOUND'
            ? 404
            : err.code === 'UNAUTHORIZED_BUILD'
            ? 403
            : err.code === 'ID_CONFLICT'
            ? 409
            : 400;

          res.writeHead(status, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            success: false,
            statusCode: err.code || 'BAD_REQUEST',
            errorMessage: err.message,
            error: err.message
          }, null, 2));
        }
      });
      return;
    }

    // Project Activity History
    if (req.method === 'GET' && url.pathname.startsWith('/api/v1/generation/projects/') && url.pathname.endsWith('/activity')) {
      if (!requirePermission(PERMISSIONS.GENERATION_MANAGE)) return;
      const projectId = decodeURIComponent(url.pathname.slice('/api/v1/generation/projects/'.length, -'/activity'.length));
      try {
        const activity = await generationProjectService.getProjectActivity(projectId, currentUser);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, ...activity }, null, 2));
      } catch (err) {
        const status = err.code === 'NOT_FOUND' ? 404 : 400;
        res.writeHead(status, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, statusCode: err.code || 'BAD_REQUEST', errorMessage: err.message }));
      }
      return;
    }


    // Project Data-Driven Summary
    if (req.method === 'GET' && url.pathname.startsWith('/api/v1/generation/projects/') && url.pathname.endsWith('/summary')) {
      if (!requirePermission(PERMISSIONS.GENERATION_MANAGE)) return;
      const projectId = decodeURIComponent(url.pathname.slice('/api/v1/generation/projects/'.length, -'/summary'.length));
      try {
        const summary = await generationProjectService.getProjectSummary(projectId, currentUser);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, summary }, null, 2));
      } catch (err) {
        const status = err.code === 'NOT_FOUND' ? 404 : 400;
        res.writeHead(status, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, statusCode: err.code || 'BAD_REQUEST', errorMessage: err.message }));
      }
      return;
    }


    // Duplicate Project
    if (req.method === 'POST' && url.pathname.startsWith('/api/v1/generation/projects/') && url.pathname.endsWith('/duplicate')) {
      if (!requirePermission(PERMISSIONS.GENERATION_MANAGE)) return;
      const projectId = decodeURIComponent(url.pathname.slice('/api/v1/generation/projects/'.length, -'/duplicate'.length));
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
          res.end(JSON.stringify({ success: false, statusCode: 'PAYLOAD_TOO_LARGE', errorMessage: 'Payload exceeds maximum limit' }));
          return;
        }
        body += chunk;
      });

      req.on('end', async () => {
        if (isAborted) return;
        let payload = {};
        try {
          payload = JSON.parse(body || '{}');
        } catch {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, statusCode: 'BAD_REQUEST', errorMessage: 'Malformed JSON payload.' }));
          return;
        }

        try {
          const duplicated = await generationProjectService.duplicateProject(projectId, payload, currentUser);
          res.writeHead(201, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true, statusCode: 'CREATED', project: duplicated }, null, 2));
        } catch (err) {
          const status = err.code === 'NOT_FOUND' ? 404 : (err.code === 'ID_CONFLICT' ? 409 : 400);
          res.writeHead(status, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, statusCode: err.code || 'BAD_REQUEST', errorMessage: err.message }));
        }
      });
      return;
    }

    // Archive Project
    if (req.method === 'POST' && url.pathname.startsWith('/api/v1/generation/projects/') && url.pathname.endsWith('/archive')) {
      if (!requirePermission(PERMISSIONS.GENERATION_MANAGE)) return;
      const projectId = decodeURIComponent(url.pathname.slice('/api/v1/generation/projects/'.length, -'/archive'.length));
      try {
        const archived = await generationProjectService.archiveProject(projectId, currentUser);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, project: archived }, null, 2));
      } catch (err) {
        const status = err.code === 'NOT_FOUND' ? 404 : 400;
        res.writeHead(status, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, statusCode: err.code || 'BAD_REQUEST', errorMessage: err.message }));
      }
      return;
    }


    // Restore Project
    if (req.method === 'POST' && url.pathname.startsWith('/api/v1/generation/projects/') && url.pathname.endsWith('/restore')) {
      if (!requirePermission(PERMISSIONS.GENERATION_MANAGE)) return;
      const projectId = decodeURIComponent(url.pathname.slice('/api/v1/generation/projects/'.length, -'/restore'.length));
      try {
        const restored = await generationProjectService.restoreProject(projectId, currentUser);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, project: restored }, null, 2));
      } catch (err) {
        const status = err.code === 'NOT_FOUND' ? 404 : 400;
        res.writeHead(status, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, statusCode: err.code || 'BAD_REQUEST', errorMessage: err.message }));
      }
      return;
    }


    // Download/Export Generation Artifact (S2.3 Tenant Isolation + S2.2 Permission fiorix.artifacts.export)
    if (req.method === 'GET' && url.pathname.includes('/generation/projects/') && url.pathname.includes('/artifacts/') && url.pathname.endsWith('/download')) {
      if (!requirePermission('fiorix.artifacts.export')) return;
      const parts = url.pathname.split('/');
      const pIdx = parts.indexOf('projects');
      const aIdx = parts.indexOf('artifacts');
      const projectId = decodeURIComponent(parts[pIdx + 1]);
      const artifactId = decodeURIComponent(parts[aIdx + 1]);

      try {
        const project = await generationProjectService.getProject(projectId, currentUser);
        if (!project) {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, statusCode: 'NOT_FOUND', errorMessage: `Project not found: ${projectId}` }));
          return;
        }
        if (project.tenantId && currentUser?.tenantId && project.tenantId !== currentUser.tenantId) {
          securityAuditLogger.logEvent({
            actor: currentUser.id || 'anonymous',
            tenantId: currentUser.tenantId,
            action: SECURITY_ACTIONS.TENANT_ACCESS_VIOLATION,
            resource: url.pathname,
            outcome: 'DENIED',
            details: { targetTenant: project.tenantId, userTenant: currentUser.tenantId }
          }).catch(() => {});

          res.writeHead(403, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            success: false,
            statusCode: 'FORBIDDEN',
            error: 'TenantAccessDenied',
            errorMessage: `Access denied to artifact belonging to tenant "${project.tenantId}". Current tenant is "${currentUser.tenantId}".`
          }));
          return;
        }

        const artifacts = await generationProjectStore.listArtifacts(projectId);
        const art = artifacts.find((a) => (a.artifactId || a.id) === artifactId);
        if (!art) {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, statusCode: 'NOT_FOUND', errorMessage: `Artifact "${artifactId}" not found in project ${projectId}.` }));
          return;
        }

        securityAuditLogger.logEvent({
          actor: currentUser.id || 'anonymous',
          tenantId: currentUser.tenantId || 'DEFAULT-TENANT-S21',
          action: SECURITY_ACTIONS.ARTIFACT_EXPORTED,
          resource: `/api/v1/generation/projects/${projectId}/artifacts/${artifactId}`,
          outcome: 'SUCCESS',
          details: { artifactName: art.artifactName || art.name, artifactType: art.layer || art.artifactType }
        }).catch(() => {});

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, artifact: art }));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: err.message }));
      }
      return;
    }


    // Single Project by ID: GET
    const singleProjectMatch = url.pathname.match(/^\/api\/v1\/generation\/projects\/([^/]+)$/);
    if (req.method === 'GET' && singleProjectMatch) {
      if (!requirePermission(PERMISSIONS.GENERATION_MANAGE)) return;
      const projectId = decodeURIComponent(singleProjectMatch[1]);
      try {
        const project = await generationProjectService.getProject(projectId, currentUser);
        if (!project) {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, statusCode: 'NOT_FOUND', errorMessage: `Project not found: ${projectId}` }));
          return;
        }
        // Tenant Isolation Check
        if (project.tenantId && currentUser?.tenantId && project.tenantId !== currentUser.tenantId) {
          securityAuditLogger.logEvent({
            actor: currentUser.id || 'anonymous',
            tenantId: currentUser.tenantId,
            action: SECURITY_ACTIONS.TENANT_ACCESS_VIOLATION,
            resource: `/api/v1/generation/projects/${projectId}`,
            outcome: 'DENIED',
            details: { targetTenant: project.tenantId, userTenant: currentUser.tenantId }
          }).catch(() => {});

          res.writeHead(403, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            success: false,
            statusCode: 'FORBIDDEN',
            error: 'TenantAccessDenied',
            errorMessage: `Access denied to generation project belonging to tenant "${project.tenantId}". Current tenant is "${currentUser.tenantId}".`
          }));
          return;
        }
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, project }, null, 2));
      } catch (err) {
        const status = err.code === 'INVALID_PROJECT_ID' || err.code === 'PATH_TRAVERSAL_DETECTED' ? 400 : 500;
        res.writeHead(status, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, statusCode: err.code || 'INTERNAL_ERROR', errorMessage: err.message }));
      }
      return;
    }


    // Update Project: PATCH
    if (req.method === 'PATCH' && singleProjectMatch) {
      if (!requirePermission(PERMISSIONS.GENERATION_MANAGE)) return;
      const projectId = decodeURIComponent(singleProjectMatch[1]);
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
          res.end(JSON.stringify({ success: false, statusCode: 'PAYLOAD_TOO_LARGE', errorMessage: 'Payload exceeds maximum limit' }));
          return;
        }
        body += chunk;
      });

      req.on('end', async () => {
        if (isAborted) return;
        let patch = {};
        try {
          patch = JSON.parse(body || '{}');
        } catch {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, statusCode: 'BAD_REQUEST', errorMessage: 'Malformed JSON payload.' }));
          return;
        }

        try {
          const updated = await generationProjectService.updateProject(projectId, patch, currentUser);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true, project: updated }, null, 2));
        } catch (err) {
          const status = err.code === 'NOT_FOUND'
            ? 404
            : err.code === 'PROJECT_ARCHIVED'
            ? 409
            : 400;

          res.writeHead(status, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, statusCode: err.code || 'BAD_REQUEST', errorMessage: err.message }));
        }
      });
      return;
    }

    // Delete Project: DELETE
    if (req.method === 'DELETE' && singleProjectMatch) {
      if (!requirePermission(PERMISSIONS.GENERATION_MANAGE)) return;
      const projectId = decodeURIComponent(singleProjectMatch[1]);
      const confirmed = url.searchParams.get('confirmed') === 'true';

      try {
        const deleteResult = await generationProjectService.deleteProject(projectId, { confirmed, userContext: currentUser });
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, ...deleteResult }, null, 2));
      } catch (err) {
        const status = err.code === 'NOT_FOUND'
          ? 404
          : err.code === 'CONFIRMATION_REQUIRED'
          ? 409
          : 400;

        res.writeHead(status, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, statusCode: err.code || 'BAD_REQUEST', errorMessage: err.message }));
      }
      return;
    }


    // 13. Single Assessment by ID (PERSIST-01)
    if (
      req.method === 'GET' &&
      url.pathname.startsWith('/api/v1/assessments/') &&
      url.pathname !== '/api/v1/assessments/summary' &&
      !url.pathname.endsWith('/audit') &&
      !url.pathname.endsWith('/modernization-decisions') &&
      !url.pathname.endsWith('/verify-audit')
    ) {
      const assessmentId = decodeURIComponent(url.pathname.slice('/api/v1/assessments/'.length));

      if (!assessmentId || assessmentId.trim().length === 0) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(
          JSON.stringify({
            success: false,
            statusCode: 'BAD_REQUEST',
            errorMessage: 'Assessment ID is required.'
          })
        );
        return;
      }

      try {
        const record = await assessmentStore.getById(assessmentId);
        if (!record) {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          res.end(
            JSON.stringify({
              success: false,
              statusCode: 'NOT_FOUND',
              error: 'Not Found',
              errorMessage: `Assessment not found: ${assessmentId}`
            })
          );
          return;
        }

        // Tenant Isolation Check
        if (record.tenantId && currentUser?.tenantId && record.tenantId !== currentUser.tenantId) {
          securityAuditLogger.logEvent({
            actor: currentUser.id || 'anonymous',
            tenantId: currentUser.tenantId,
            action: SECURITY_ACTIONS.TENANT_ACCESS_VIOLATION,
            resource: `/api/v1/assessments/${assessmentId}`,
            outcome: 'DENIED',
            details: { targetTenant: record.tenantId, userTenant: currentUser.tenantId }
          }).catch(() => {});

          res.writeHead(403, { 'Content-Type': 'application/json' });
          res.end(
            JSON.stringify({
              success: false,
              statusCode: 'FORBIDDEN',
              error: 'TenantAccessDenied',
              errorMessage: `Access denied to assessment belonging to tenant "${record.tenantId}". Current tenant is "${currentUser.tenantId}".`
            })
          );
          return;
        }

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(
          JSON.stringify(
            {
              success: true,
              assessment: record
            },
            null,
            2
          )
        );
      } catch (err) {
        const sanitized = sanitizeErrorMessage(err.message || 'Failed to retrieve assessment');
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(
          JSON.stringify({
            success: false,
            statusCode: 'INTERNAL_ERROR',
            errorMessage: sanitized
          })
        );
      }
      return;
    }




    // 14. List & Filter Assessments (PERSIST-01)
    if (req.method === 'GET' && url.pathname === '/api/v1/assessments') {
      const businessArea = url.searchParams.get('businessArea') || undefined;
      const status = url.searchParams.get('status') || undefined;
      const lifecycleStatus = url.searchParams.get('lifecycleStatus') || undefined;
      const includeArchived = url.searchParams.get('includeArchived') === 'true';
      const systemId = url.searchParams.get('systemId') || undefined;
      const search = url.searchParams.get('search') || url.searchParams.get('searchTerm') || undefined;
      const sortBy = url.searchParams.get('sortBy') || undefined;
      const sortOrder = url.searchParams.get('sortOrder') || undefined;

      try {
        const records = await assessmentStore.list({
          businessArea,
          status,
          lifecycleStatus,
          includeArchived,
          systemId,
          search,
          sortBy,
          sortOrder
        });

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(
          JSON.stringify(
            {
              success: true,
              count: records.length,
              assessments: records
            },
            null,
            2
          )
        );
      } catch (err) {
        const sanitized = sanitizeErrorMessage(err.message || 'Failed to list assessments');
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(
          JSON.stringify({
            success: false,
            statusCode: 'INTERNAL_ERROR',
            errorMessage: sanitized
          })
        );
      }
      return;
    }


    // 15. SAP Transaction Discovery & Evidence Collection (DISC-01 + DISC-02)
    if (req.method === 'POST' && url.pathname === '/api/v1/discovery/transaction') {
      let bodyStr = '';
      let bodyLength = 0;

      req.on('data', (chunk) => {
        bodyLength += chunk.length;
        if (bodyLength > MAX_BODY_SIZE) {
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

      req.on('end', async () => {
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
          return;
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
          return;
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
      });
      return;
    }

    // 16. Standard Fiori Application Matching & Ranking (MATCH-01 + MATCH-02)
    if (req.method === 'POST' && url.pathname === '/api/v1/matching/fiori-apps') {
      let bodyStr = '';
      let bodyLength = 0;

      req.on('data', (chunk) => {
        bodyLength += chunk.length;
        if (bodyLength > MAX_BODY_SIZE) {
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

      req.on('end', async () => {
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
          return;
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
          return;
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
      });
      return;
    }

    // 17. Unified End-to-End Discovery and Matching Pipeline (supports optional or dedicated MCP-Assistance)
    if (req.method === 'POST' && (url.pathname === '/api/v1/discovery/match' || url.pathname === '/api/v1/discovery/mcp-assisted')) {
      let bodyStr = '';
      let bodyLength = 0;

      req.on('data', (chunk) => {
        bodyLength += chunk.length;
        if (bodyLength > MAX_BODY_SIZE) {
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

      req.on('end', async () => {
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
          return;
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
          return;
        }

        const requestId = `req-${Date.now()}-${requestCounter++}`;
        const isDedicatedMcpRoute = url.pathname === '/api/v1/discovery/mcp-assisted';
        const mcpEnabledByRequest = isDedicatedMcpRoute
          ? (payload.mcpOptions?.enabled !== false)
          : (payload.mcpOptions?.enabled === true || payload.useMcp === true);

        try {
          // 1. Transaction Discovery & Evidence Collection
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
            return;
          }

          // 2. Local Canonical Catalogue Search for Base Candidates
          const localSearchResult = await officialCatalogueAdapter.searchApps({
            tcode: discoveryResult.tcode,
            query: discoveryResult.transactionDescription || discoveryResult.description || '',
            limit: 50
          });
          let candidatePool = localSearchResult?.candidates || [];
          let mcpDiscoveryEnvelope = null;

          // 3. Optional MCP Discovery Orchestration (if requested or enabled)
          if (mcpEnabledByRequest) {
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

              // Enrich discovery technical evidence with mapped MCP evidence
              if (Array.isArray(mcpOrch.mcpEvidence) && mcpOrch.mcpEvidence.length > 0) {
                discoveryResult.evidence = [...(discoveryResult.evidence || []), ...mcpOrch.mcpEvidence];
                discoveryResult.technicalEvidence = discoveryResult.evidence;
              }
            } catch (orchErr) {
              console.warn(`[FioriX Discovery] Non-blocking MCP orchestration error: ${orchErr.message}`);
            }
          }

          // 4. Fiori Application Matching & Ranking (Deterministic evaluation over candidatePool)
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
      });
      return;
    }

    // 18. MCP Integration Subsystem (MCP-01 + MCP-02)
    const mcpHandled = await handleMcpRoute(req, res, url, { mcpService, checkAdminAuth });
    if (mcpHandled) {
      return;
    }

    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Endpoint Not Found', path: url.pathname }));
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

  return server;
}

const server = createServer();

const isDirectRun = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isDirectRun) {
  defaultMcpService.initialize().catch((err) => {
    console.warn(`[FioriX MCP] Non-blocking initialization note: ${err.message}`);
  });

  const handleGracefulShutdown = async (signal) => {
    console.log(`[FioriX] Received ${signal}. Shutting down cleanly...`);
    try {
      await defaultMcpService.shutdown();
    } catch (err) {
      console.warn(`[FioriX MCP] Shutdown warning: ${err.message}`);
    }
    server.close(() => {
      process.exit(0);
    });
  };

  process.on('SIGINT', () => handleGracefulShutdown('SIGINT'));
  process.on('SIGTERM', () => handleGracefulShutdown('SIGTERM'));

  server.listen(PORT, () => {
    console.log(`FioriX Discovery Backend running on http://localhost:${PORT}`);
    console.log(`Ready for S21-200 live queries, BTP smoke tests, and local mock evaluations.`);
  });
}

export default server;
