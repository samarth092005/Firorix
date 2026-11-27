import { sanitizeProtectedFields } from '../middleware/securityFieldSanitizer.js';
import { SECURITY_ACTIONS } from '../infrastructure/security/securityAuditLogger.js';
import { USER_ROLES } from '../services/authService.js';
import { readJsonBody } from '../api/index.js';

/**
 * Generation Studio Handoff HTTP Routes
 *
 * @param {import('node:http').IncomingMessage} req
 * @param {import('node:http').ServerResponse} res
 * @param {URL} url
 * @param {object} context
 * @returns {Promise<boolean>} True if handled, false otherwise
 */
export async function handleHandoffRoutes(req, res, url, context = {}) {
  const { generationHandoffStore, currentUser, securityAuditLogger } = context;

  // 1. Create Handoff (POST /api/v1/generation/handoff)
  if (req.method === 'POST' && url.pathname === '/api/v1/generation/handoff') {
    let payload = {};
    try {
      payload = await readJsonBody(req);
    } catch (err) {
      const status = err.statusCode || (err.code === 'PAYLOAD_TOO_LARGE' ? 413 : 400);
      res.writeHead(status, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, statusCode: err.code || 'BAD_REQUEST', errorMessage: err.message }));
      return true;
    }

    try {
      const cleanPayload = sanitizeProtectedFields(payload, { strict: false, allowedFields: ['architectApproved'] });
      const handoff = await generationHandoffStore.createHandoff(cleanPayload, currentUser);
      res.writeHead(201, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, statusCode: 'CREATED', handoff }, null, 2));
    } catch (err) {
      const status = err.code === 'NOT_FOUND'
        ? 404
        : (err.code === 'UNAUTHORIZED_BUILD' || err.code === 'UNAUTHORIZED_BUILD_APPROVER')
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
    return true;
  }

  // 2. Retrieve Generation Studio Handoff by ID (GET /api/v1/generation/handoff/:id)
  if (req.method === 'GET' && url.pathname.startsWith('/api/v1/generation/handoff/')) {
    const handoffId = decodeURIComponent(url.pathname.slice('/api/v1/generation/handoff/'.length));
    try {
      const handoff = await generationHandoffStore.getHandoff(handoffId, currentUser);
      if (!handoff) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, statusCode: 'NOT_FOUND', errorMessage: `Generation handoff not found: ${handoffId}` }));
        return true;
      }

      // Enforce Tenant Isolation (SEC-002, SEC-005)
      if (handoff.tenantId && currentUser?.tenantId && handoff.tenantId !== currentUser.tenantId) {
        if (securityAuditLogger) {
          securityAuditLogger.logEvent({
            actor: currentUser.id || 'anonymous',
            tenantId: currentUser.tenantId,
            action: SECURITY_ACTIONS.TENANT_ACCESS_VIOLATION,
            resource: url.pathname,
            outcome: 'DENIED',
            details: { targetTenant: handoff.tenantId, userTenant: currentUser.tenantId }
          }).catch(() => {});
        }
        res.writeHead(403, { 'Content-Type': 'application/json' });
        res.end(
          JSON.stringify({
            success: false,
            statusCode: 'FORBIDDEN',
            error: 'TenantAccessDenied',
            errorMessage: `Access denied to handoff belonging to tenant "${handoff.tenantId}". Current tenant is "${currentUser.tenantId}".`
          })
        );
        return true;
      }

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, handoff }, null, 2));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, statusCode: 'INTERNAL_ERROR', errorMessage: err.message }));
    }
    return true;
  }

  // 3. List Generation Studio Handoffs (GET /api/v1/generation/handoff)
  if (req.method === 'GET' && url.pathname === '/api/v1/generation/handoff') {
    const clientTenantId = url.searchParams.get('tenantId');
    const hasAdminAccess = currentUser?.role === USER_ROLES.ADMIN ||
      (Array.isArray(currentUser?.scopes) && currentUser?.scopes.includes('Fiorify.admin.access'));

    if (clientTenantId && currentUser?.tenantId && clientTenantId !== currentUser.tenantId && !hasAdminAccess) {
      if (securityAuditLogger?.logEvent) {
        securityAuditLogger.logEvent({
          actor: currentUser.id || 'anonymous',
          tenantId: currentUser.tenantId,
          action: SECURITY_ACTIONS.TENANT_ACCESS_VIOLATION,
          resource: '/api/v1/generation/handoff',
          outcome: 'DENIED',
          details: { targetTenant: clientTenantId, userTenant: currentUser.tenantId }
        }).catch(() => {});
      }
      res.writeHead(403, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          success: false,
          statusCode: 'FORBIDDEN',
          error: 'TenantAccessDenied',
          errorMessage: `Client parameter cannot override authenticated tenant boundary "${currentUser.tenantId}".`
        })
      );
      return true;
    }

    try {
      const assessmentId = url.searchParams.get('assessmentId') || undefined;
      const tcode = url.searchParams.get('tcode') || undefined;
      const handoffs = await generationHandoffStore.listHandoffs({
        assessmentId,
        tcode,
        tenantId: (hasAdminAccess && clientTenantId) ? clientTenantId : currentUser?.tenantId
      }, currentUser);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, count: handoffs.length, handoffs }, null, 2));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, statusCode: 'INTERNAL_ERROR', errorMessage: err.message }));
    }
    return true;
  }

  return false;
}
