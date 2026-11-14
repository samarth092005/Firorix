import fs from 'node:fs';
import path from 'node:path';
import { mockSapAdapter } from '../adapters/mockSapAdapter.js';
import { sanitizeErrorMessage } from '../adapters/btpDestinationAdapter.js';
import { USER_ROLES } from '../services/authService.js';
import { SECURITY_ACTIONS } from '../infrastructure/security/securityAuditLogger.js';

// IP Rate Limiter for Login Endpoint
const loginRateLimitMap = new Map();
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000; // 10 minutes
const MAX_LOGIN_ATTEMPTS = 15;

function checkLoginRateLimit(ip) {
  const now = Date.now();
  const record = loginRateLimitMap.get(ip);
  if (!record || now > record.resetTime) {
    loginRateLimitMap.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS });
    return { allowed: true };
  }
  if (record.count >= MAX_LOGIN_ATTEMPTS) {
    return { allowed: false, retryAfterSeconds: Math.ceil((record.resetTime - now) / 1000) };
  }
  record.count++;
  return { allowed: true };
}

/**
 * System, Health, Auth, and SAP Gateway HTTP Routes
 *
 * @param {import('node:http').IncomingMessage} req
 * @param {import('node:http').ServerResponse} res
 * @param {URL} url
 * @param {object} context
 * @returns {Promise<boolean>} True if handled, false otherwise
 */
export async function handleSystemRoutes(req, res, url, context = {}) {
  const {
    currentUser,
    requirePermission,
    requireRole,
    checkAdminAuth,
    authService,
    securityAuditLogger,
    systemRegistry,
    adapter,
    gatewayAdapter
  } = context;

  // 1. Health Check
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
          targetODataService: '/sap/opu/odata/sap/Z_Fiorify_DISCOVERY_SRV',
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
    return true;
  }

  // 1b. Demo Environment Reset (Cleans generation projects, handoffs, test assessments, and artifacts)
  if (req.method === 'POST' && url.pathname === '/api/v1/system/reset-demo') {
    if (process.env.NODE_ENV === 'production') {
      res.writeHead(403, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, statusCode: 'FORBIDDEN', errorMessage: 'Demo environment reset is disabled in production.' }));
      return true;
    }
    if (!requireRole([USER_ROLES.ADMIN])) return true;
    try {
      let purgedProjectsCount = 0;
      const targetTenantId = currentUser?.tenantId || context.defaultTenantId || 'DEFAULT-TENANT-S21';

      // 1. Reset Generation Projects (Tenant-scoped)
      if (context.projectStore && typeof context.projectStore.resetDemoProjects === 'function') {
        const pRes = await context.projectStore.resetDemoProjects(targetTenantId);
        purgedProjectsCount = pRes.purgedCount || 0;
      }

      // 2. Reset Generation Handoffs (Tenant-scoped)
      if (context.handoffStore && typeof context.handoffStore.resetDemoHandoffs === 'function') {
        await context.handoffStore.resetDemoHandoffs(targetTenantId);
      }

      // 3. Reset Assessments to pristine baseline
      if (context.assessmentStore && typeof context.assessmentStore.resetToBaseline === 'function') {
        await context.assessmentStore.resetToBaseline();
      }

      // 4. Clear generated artifacts directory
      const artifactsDir = path.resolve(process.cwd(), 'backend', 'data', 'artifacts');
      if (fs.existsSync(artifactsDir)) {
        try {
          const artifactEntries = await fs.promises.readdir(artifactsDir, { withFileTypes: true });
          for (const entry of artifactEntries) {
            if (entry.isDirectory()) {
              await fs.promises.rm(path.join(artifactsDir, entry.name), { recursive: true, force: true });
            }
          }
        } catch (artErr) {
          console.warn('[SystemReset] Artifacts directory cleanup note:', artErr.message);
        }
      }

      if (securityAuditLogger) {
        securityAuditLogger.logEvent({
          actor: currentUser?.id || 'USR-ADMIN-01',
          tenantId: targetTenantId,
          action: 'SYSTEM_DEMO_RESET',
          resource: '/api/v1/system/reset-demo',
          outcome: 'SUCCESS',
          details: { purgedProjectsCount, targetTenantId }
        }).catch(() => {});
      }

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          success: true,
          message: 'Fiorify demonstration environment successfully reset to pristine Clean Core baseline.',
          purged: {
            tenantId: targetTenantId,
            projectsCount: purgedProjectsCount,
            assessmentsReset: true,
            handoffsReset: true
          }
        }, null, 2)
      );
      return true;
    } catch (resetErr) {
      console.error('[SystemReset] Error during demo reset:', resetErr);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          success: false,
          statusCode: 'INTERNAL_ERROR',
          errorMessage: `Failed to reset demo environment: ${resetErr.message}`
        })
      );
      return true;
    }
  }

  // 2. Authentication Routes (SEC-01)
  if (req.method === 'POST' && url.pathname === '/api/v1/auth/login') {
    const clientIp = (req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '127.0.0.1').split(',')[0].trim();
    const rateLimit = checkLoginRateLimit(clientIp);
    if (!rateLimit.allowed) {
      res.writeHead(429, {
        'Content-Type': 'application/json',
        'Retry-After': String(rateLimit.retryAfterSeconds)
      });
      res.end(
        JSON.stringify({
          success: false,
          statusCode: 'RATE_LIMIT_EXCEEDED',
          errorMessage: `Too many login attempts. Please try again in ${rateLimit.retryAfterSeconds} seconds.`
        })
      );
      return true;
    }

    let body = '';
    req.on('data', (c) => (body += c));
    await new Promise((resolve) => req.on('end', resolve));

    let payload = {};
    try {
      payload = JSON.parse(body || '{}');
    } catch {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, statusCode: 'BAD_REQUEST', errorMessage: 'Malformed JSON payload.' }));
      return true;
    }

    const authResult = authService.login(payload.email || payload.username, payload.password);
    if (!authResult.success) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, statusCode: 'UNAUTHORIZED', error: authResult.error, errorMessage: authResult.errorMessage }));
      return true;
    }

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(authResult, null, 2));
    return true;
  }

  if (req.method === 'POST' && url.pathname === '/api/v1/auth/logout') {
    const authHeader = req.headers.authorization;
    if (authHeader) {
      authService.logout(authHeader);
    }
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true, message: 'Session successfully revoked.' }));
    return true;
  }

  if (req.method === 'GET' && url.pathname === '/api/v1/auth/me') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true, authenticated: Boolean(currentUser), user: currentUser }));
    return true;
  }

  // 3. Security Audit Event Trail (S2.4)
  if (req.method === 'GET' && url.pathname === '/api/v1/security/audit') {
    if (!requirePermission('Fiorify.audit.read')) return true;
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
    return true;
  }

  // 4. Landscape Registry & Multi-System Discovery (SAP-LIVE-01 & ENTERPRISE-01)
  if (req.method === 'GET' && url.pathname === '/api/v1/systems') {
    const tenantId = currentUser?.tenantId || 'DEFAULT-TENANT-S21';
    let regSystems = [];
    if (systemRegistry) {
      regSystems = typeof systemRegistry.listSystems === 'function'
        ? await systemRegistry.listSystems(tenantId)
        : systemRegistry.listSystemsSync();
    }
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
    return true;
  }

  // Register / Update SAP System Configuration (S2)
  if (req.method === 'POST' && url.pathname === '/api/v1/systems') {
    if (!requireRole([USER_ROLES.SAP_CONSULTANT, USER_ROLES.ADMIN, USER_ROLES.LEAD_ARCHITECT])) return true;

    let body = '';
    req.on('data', (c) => (body += c));
    await new Promise((resolve) => req.on('end', resolve));

    let payload = {};
    try {
      payload = JSON.parse(body || '{}');
    } catch {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, statusCode: 'BAD_REQUEST', errorMessage: 'Malformed JSON payload.' }));
      return true;
    }

    if (!payload.systemId && !payload.system_id) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, statusCode: 'VALIDATION_ERROR', errorMessage: 'systemId is required.' }));
      return true;
    }

    // Safety invariant: Never accept or store plaintext passwords
    if (payload.password) {
      delete payload.password;
    }

    try {
      const tenantId = currentUser?.tenantId || 'DEFAULT-TENANT-S21';
      const registered = await systemRegistry.registerSystem({
        ...payload,
        tenantId,
        isReadOnly: true
      }, tenantId);

      if (securityAuditLogger) {
        securityAuditLogger.logEvent({
          actor: currentUser?.id || 'anonymous',
          tenantId,
          action: 'REGISTER_SAP_SYSTEM',
          resource: `/api/v1/systems/${registered.systemId}`,
          outcome: 'SUCCESS',
          details: { systemId: registered.systemId, connectionMode: registered.connectionMode }
        }).catch(() => {});
      }

      res.writeHead(201, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, system: registered }, null, 2));
    } catch (regErr) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, statusCode: 'REGISTRATION_ERROR', errorMessage: regErr.message }));
    }
    return true;
  }

  // Diagnostic History Endpoint (S2)
  if (req.method === 'GET' && url.pathname.startsWith('/api/v1/systems/') && url.pathname.endsWith('/diagnostics/history')) {
    const systemId = decodeURIComponent(url.pathname.slice('/api/v1/systems/'.length, -'/diagnostics/history'.length));
    const tenantId = currentUser?.tenantId || 'DEFAULT-TENANT-S21';
    const limit = Number(url.searchParams.get('limit')) || 20;

    try {
      const history = await systemRegistry.getDiagnosticHistory(systemId, tenantId, limit);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, systemId, history }, null, 2));
    } catch (histErr) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, statusCode: 'INTERNAL_ERROR', errorMessage: histErr.message }));
    }
    return true;
  }

  // Gateway Metadata Test Endpoint (S2)
  if (req.method === 'GET' && url.pathname.startsWith('/api/v1/systems/') && url.pathname.endsWith('/gateway/metadata')) {
    const systemId = decodeURIComponent(url.pathname.slice('/api/v1/systems/'.length, -'/gateway/metadata'.length));
    const servicePath = url.searchParams.get('service') || '/sap/opu/odata/IWFND/CATALOGSERVICE;v=2/$metadata';
    const tenantId = currentUser?.tenantId || 'DEFAULT-TENANT-S21';

    try {
      const metadataResult = await systemRegistry.inspectGatewayMetadata(systemId, servicePath, tenantId);
      res.writeHead(metadataResult.success ? 200 : (metadataResult.status || 502), { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(metadataResult, null, 2));
    } catch (metaErr) {
      res.writeHead(metaErr.statusCode === 'AUTHORIZATION_BLOCKED' ? 403 : 500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, statusCode: metaErr.code || 'INTERNAL_ERROR', errorMessage: metaErr.message }));
    }
    return true;
  }

  // ADT Reachability Test Endpoint (S2)
  if (req.method === 'GET' && url.pathname.startsWith('/api/v1/systems/') && url.pathname.endsWith('/adt/reachability')) {
    const systemId = decodeURIComponent(url.pathname.slice('/api/v1/systems/'.length, -'/adt/reachability'.length));
    const tenantId = currentUser?.tenantId || 'DEFAULT-TENANT-S21';

    try {
      const diagResult = await systemRegistry.runDiagnostics(systemId, currentUser);
      const adtCheck = diagResult.checks?.adtDiscovery || {};
      const httpCode = adtCheck.httpStatus || (adtCheck.status === 'VERIFIED' ? 200 : (adtCheck.status === 'AUTHORIZATION_FAILED' ? 403 : 502));
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: adtCheck.status === 'VERIFIED',
        systemId,
        endpoint: '/sap/bc/adt/discovery',
        status: adtCheck.status,
        httpStatus: httpCode,
        error: adtCheck.error,
        requiredAuthorizations: adtCheck.requiredAuthorizations || []
      }, null, 2));
    } catch (adtErr) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, statusCode: 'INTERNAL_ERROR', errorMessage: adtErr.message }));
    }
    return true;
  }

  if (req.method === 'GET' && url.pathname.startsWith('/api/v1/systems/') && !url.pathname.endsWith('/diagnostics')) {
    const systemId = decodeURIComponent(url.pathname.slice('/api/v1/systems/'.length));
    const tenantId = currentUser?.tenantId || 'DEFAULT-TENANT-S21';
    const system = systemRegistry ? await systemRegistry.getSystem(systemId, tenantId) : null;
    if (!system) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, statusCode: 'NOT_FOUND', errorMessage: `System "${systemId}" not found.` }));
      return true;
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
      return true;
    }
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true, system }));
    return true;
  }

  if (req.method === 'POST' && url.pathname.startsWith('/api/v1/systems/') && url.pathname.endsWith('/diagnostics')) {
    if (!requireRole([USER_ROLES.SAP_CONSULTANT, USER_ROLES.ADMIN, USER_ROLES.LEAD_ARCHITECT])) return true;
    const systemId = decodeURIComponent(url.pathname.slice('/api/v1/systems/'.length, -'/diagnostics'.length));
    try {
      const diagnostics = await systemRegistry.runDiagnostics(systemId, currentUser);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(diagnostics, null, 2));
    } catch (diagErr) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, statusCode: 'INTERNAL_ERROR', errorMessage: diagErr.message }));
    }
    return true;
  }

  // 5. Protected Gateway Smoke Test (Task 3)
  if (req.method === 'GET' && url.pathname === '/api/v1/gateway-smoke-test') {
    const authHeader = req.headers.authorization;
    const bearerSecret = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : null;
    const rawAdminSecret = req.headers['x-fiorify-admin-secret'] || req.headers['x-Fiorify-admin-secret'];
    const customHeaderSecret = rawAdminSecret
      ? String(rawAdminSecret).trim()
      : null;
    const providedSecret = customHeaderSecret || bearerSecret;

    if (!adapter.verifyAdminSecret(providedSecret)) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          success: false,
          statusCode: 'UNAUTHORIZED',
          errorMessage: 'Access denied: Valid administrative secret required in X-Fiorify-Admin-Secret or Authorization Bearer header.'
        }, null, 2)
      );
      return true;
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
    return true;
  }

  // 6. Live SAP Gateway OData Catalog Search (Sprint 6.3)
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
      return true;
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
    return true;
  }

  // 7. Parsed Service $metadata EDMX Query (Sprint 6.3 & 6.4)
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
      return true;
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
    return true;
  }

  return false;
}
