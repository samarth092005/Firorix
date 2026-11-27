import { sanitizeErrorMessage } from '../adapters/btpDestinationAdapter.js';
import { USER_ROLES, authService, PERMISSIONS } from '../services/authService.js';
import { SECURITY_ACTIONS } from '../infrastructure/security/securityAuditLogger.js';
import { sanitizeProtectedFields } from '../middleware/securityFieldSanitizer.js';
import { readJsonBody } from '../api/index.js';

async function parseJsonOrRespond(req, res, { optional = false } = {}) {
  try {
    return { ok: true, payload: await readJsonBody(req) };
  } catch (err) {
    if (optional && err.code === 'BAD_REQUEST') {
      return { ok: true, payload: {} };
    }
    const status = err.statusCode || (err.code === 'PAYLOAD_TOO_LARGE' ? 413 : 400);
    res.writeHead(status, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify({
        success: false,
        statusCode: err.code || 'BAD_REQUEST',
        error: status === 413 ? 'Payload Too Large' : 'Bad Request',
        errorMessage: err.message,
        message: err.message
      })
    );
    return { ok: false, payload: {} };
  }
}

/**
 * Assessment Store, Lifecycle & Governance HTTP Routes
 *
 * @param {import('node:http').IncomingMessage} req
 * @param {import('node:http').ServerResponse} res
 * @param {URL} url
 * @param {object} context
 * @returns {Promise<boolean>} True if handled, false otherwise
 */
export async function handleAssessmentRoutes(req, res, url, context = {}) {
  const {
    assessmentStore,
    enterpriseService,
    securityAuditLogger,
    currentUser,
    requireRole
  } = context;

  let requestCounter = context.requestCounter || 1;

  // Tenant Verification Helper (SEC-002, SEC-005)
  async function checkAssessmentTenant(assessmentId, resourcePath) {
    if (!currentUser?.tenantId) return { allowed: true };
    try {
      const existing = await assessmentStore.getById(assessmentId);
      if (!existing) return { allowed: true, notFound: true };
      if (existing.tenantId && existing.tenantId !== currentUser.tenantId) {
        if (securityAuditLogger) {
          securityAuditLogger.logEvent({
            actor: currentUser.id || 'anonymous',
            tenantId: currentUser.tenantId,
            action: SECURITY_ACTIONS.TENANT_ACCESS_VIOLATION,
            resource: resourcePath || `/api/v1/assessments/${assessmentId}`,
            outcome: 'DENIED',
            details: { targetTenant: existing.tenantId, userTenant: currentUser.tenantId }
          }).catch(() => {});
        }
        res.writeHead(403, { 'Content-Type': 'application/json' });
        res.end(
          JSON.stringify({
            success: false,
            statusCode: 'FORBIDDEN',
            error: 'TenantAccessDenied',
            errorMessage: `Access denied to assessment belonging to tenant "${existing.tenantId}". Current tenant is "${currentUser.tenantId}".`
          })
        );
        return { allowed: false };
      }
      return { allowed: true, record: existing };
    } catch {
      return { allowed: true };
    }
  }



  // 1. POST /api/v1/assessments (Create Assessment)
  if (req.method === 'POST' && url.pathname === '/api/v1/assessments') {
    const parsed = await parseJsonOrRespond(req, res);
    if (!parsed.ok) return true;
    const payload = parsed.payload;

    const correlationId = req.headers['x-correlation-id'] || req.headers['x-request-id'];
    const requestId = correlationId || `REQ-ASM-${String(requestCounter++).padStart(6, '0')}`;

    try {
      // SEC-004 & SEC-005: Sanitize client-controlled protected security fields and enforce user/tenant context
      const cleanPayload = sanitizeProtectedFields(payload, {
        strict: false,
        onViolation: (violations) => {
          if (securityAuditLogger?.logEvent) {
            securityAuditLogger.logEvent({
              actor: currentUser?.id || 'anonymous',
              tenantId: currentUser?.tenantId || 'DEFAULT-TENANT-S21',
              action: SECURITY_ACTIONS.UNAUTHORIZED_ACCESS_ATTEMPT || 'PROTECTED_FIELD_STRIPPED',
              resource: url.pathname,
              outcome: 'STRIPPED',
              details: { detectedFields: violations }
            }).catch(() => {});
          }
        }
      });
      const record = await assessmentStore.create(cleanPayload, requestId, currentUser);

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
        return true;
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
        return true;
      }

      console.error('[AssessmentRoutes] POST /api/v1/assessments error:', err);
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
    return true;
  }

  // 4. GET /api/v1/assessments/summary
  if (req.method === 'GET' && url.pathname === '/api/v1/assessments/summary') {
    try {
      const summary = await assessmentStore.getSummary();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, summary }, null, 2));
    } catch (err) {
      const sanitized = sanitizeErrorMessage(err.message || 'Failed to retrieve assessment summary');
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, statusCode: 'INTERNAL_ERROR', errorMessage: sanitized }));
    }
    return true;
  }

  // 5. GET /api/v1/assessments/:id/audit
  if (req.method === 'GET' && url.pathname.startsWith('/api/v1/assessments/') && url.pathname.endsWith('/audit')) {
    const assessmentId = decodeURIComponent(url.pathname.slice('/api/v1/assessments/'.length, -'/audit'.length));
    const tenantCheck = await checkAssessmentTenant(assessmentId, url.pathname);
    if (!tenantCheck.allowed) return true;
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
        return true;
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
      res.end(JSON.stringify({ success: false, statusCode: 'INTERNAL_ERROR', errorMessage: sanitized }));
    }
    return true;
  }

  // 6. POST /api/v1/assessments/:id/archive
  if (req.method === 'POST' && url.pathname.startsWith('/api/v1/assessments/') && url.pathname.endsWith('/archive')) {
    const assessmentId = decodeURIComponent(url.pathname.slice('/api/v1/assessments/'.length, -'/archive'.length));
    const tenantCheck = await checkAssessmentTenant(assessmentId, url.pathname);
    if (!tenantCheck.allowed) return true;
    const parsed = await parseJsonOrRespond(req, res, { optional: true });
    if (!parsed.ok) return true;
    const payload = parsed.payload;

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
        return true;
      }
      const sanitized = sanitizeErrorMessage(err.message || 'Failed to archive assessment');
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, statusCode: 'INTERNAL_ERROR', errorMessage: sanitized }));
    }
    return true;
  }

  // 7. PUT /api/v1/assessments/:id (Update & Transition Lifecycle)
  if (
    req.method === 'PUT' &&
    url.pathname.startsWith('/api/v1/assessments/') &&
    url.pathname !== '/api/v1/assessments/summary' &&
    !url.pathname.endsWith('/audit') &&
    !url.pathname.endsWith('/archive') &&
    !url.pathname.endsWith('/deployment-readiness')
  ) {
    const assessmentId = decodeURIComponent(url.pathname.slice('/api/v1/assessments/'.length));
    const tenantCheck = await checkAssessmentTenant(assessmentId, url.pathname);
    if (!tenantCheck.allowed) return true;
    const parsed = await parseJsonOrRespond(req, res);
    if (!parsed.ok) return true;
    const payload = parsed.payload;

    try {
      const requestedLifecycle = payload.lifecycleStatus || payload.status;
      const cleanPayload = sanitizeProtectedFields(payload, { strict: false });
      if (requestedLifecycle) {
        cleanPayload.lifecycleStatus = requestedLifecycle;
      }
      const userCtx = (currentUser && !currentUser.isDefaultViewer) ? currentUser : null;
      const author = payload.author || cleanPayload.author || (userCtx ? userCtx.name : null) || 'System Administrator';
      const comment = payload.comment || cleanPayload.comment || '';
      const updated = await assessmentStore.update(
        assessmentId,
        cleanPayload,
        author,
        comment,
        userCtx
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
        return true;
      }
      if (err.code === 'SEPARATION_OF_DUTIES_VIOLATION' || err.code === 'UNAUTHORIZED_OVERRIDE') {
        res.writeHead(403, { 'Content-Type': 'application/json' });
        res.end(
          JSON.stringify({
            success: false,
            statusCode: err.code,
            error: 'Forbidden',
            errorMessage: err.message
          })
        );
        return true;
      }
      if (err.code === 'INVALID_LIFECYCLE_TRANSITION' || err.code === 'INVALID_STATE_TRANSITION' || err.code === 'VALIDATION_ERROR') {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(
          JSON.stringify({
            success: false,
            statusCode: err.code,
            error: 'Bad Request',
            errorMessage: err.message
          })
        );
        return true;
      }
      const sanitized = sanitizeErrorMessage(err.message || 'Failed to update assessment');
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, statusCode: 'INTERNAL_ERROR', errorMessage: sanitized }));
    }
    return true;
  }

  // 8. POST /api/v1/assessments/:id/submit-review
  if (req.method === 'POST' && url.pathname.startsWith('/api/v1/assessments/') && url.pathname.endsWith('/submit-review')) {
    if (!requireRole([USER_ROLES.SAP_CONSULTANT, USER_ROLES.ADMIN])) return true;
    const assessmentId = decodeURIComponent(url.pathname.slice('/api/v1/assessments/'.length, -'/submit-review'.length));
    const tenantCheck = await checkAssessmentTenant(assessmentId, url.pathname);
    if (!tenantCheck.allowed) return true;
    const parsed = await parseJsonOrRespond(req, res, { optional: true });
    if (!parsed.ok) return true;
    const payload = parsed.payload;
    try {
      const updated = await assessmentStore.submitForReview(assessmentId, currentUser, payload.comment || 'Submitted for governance review.');
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, statusCode: 'PENDING_REVIEW', assessment: updated }, null, 2));
    } catch (err) {
      res.writeHead(err.code === 'NOT_FOUND' ? 404 : 400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, statusCode: err.code || 'BAD_REQUEST', errorMessage: err.message }));
    }
    return true;
  }

  // 9. POST /api/v1/assessments/:id/approve
  if (req.method === 'POST' && url.pathname.startsWith('/api/v1/assessments/') && url.pathname.endsWith('/approve')) {
    if (!requireRole([USER_ROLES.APPROVER, USER_ROLES.ADMIN, USER_ROLES.LEAD_ARCHITECT])) return true;
    const assessmentId = decodeURIComponent(url.pathname.slice('/api/v1/assessments/'.length, -'/approve'.length));
    const tenantCheck = await checkAssessmentTenant(assessmentId, url.pathname);
    if (!tenantCheck.allowed) return true;
    const parsed = await parseJsonOrRespond(req, res, { optional: true });
    if (!parsed.ok) return true;
    const payload = parsed.payload;
    try {
      const isOverride = payload.isOverride === true;
      if (isOverride) {
        const isAdmin = currentUser && !currentUser.isUnauthenticated && (
          currentUser.role === USER_ROLES.ADMIN ||
          currentUser.role === USER_ROLES.LEAD_ARCHITECT ||
          currentUser.role === 'CHIEF_ARCHITECT' ||
          authService.hasPermission(currentUser, PERMISSIONS.ADMIN_ACCESS) ||
          authService.hasPermission(currentUser, PERMISSIONS.USER_ADMIN)
        );
        if (!isAdmin) {
          res.writeHead(403, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            success: false,
            statusCode: 'UNAUTHORIZED_OVERRIDE',
            errorMessage: 'Administrative override requires explicit authenticated ADMIN authorization.'
          }));
          return true;
        }
      }
      const updated = await assessmentStore.approve(assessmentId, currentUser, payload.comment || 'Formally approved for modernization roadmap.', isOverride);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, statusCode: 'APPROVED', assessment: updated }, null, 2));
    } catch (err) {
      const status = err.code === 'NOT_FOUND' ? 404 : ((err.code === 'SEPARATION_OF_DUTIES_VIOLATION' || err.code === 'UNAUTHORIZED_BUILD_APPROVER' || err.code === 'UNAUTHORIZED_BUILD' || err.code === 'UNAUTHORIZED_OVERRIDE') ? 403 : 400);
      res.writeHead(status, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, statusCode: err.code || 'BAD_REQUEST', errorMessage: err.message }));
    }
    return true;
  }

  // 10. POST /api/v1/assessments/:id/reject
  if (req.method === 'POST' && url.pathname.startsWith('/api/v1/assessments/') && url.pathname.endsWith('/reject')) {
    if (!requireRole([USER_ROLES.APPROVER, USER_ROLES.ADMIN])) return true;
    const assessmentId = decodeURIComponent(url.pathname.slice('/api/v1/assessments/'.length, -'/reject'.length));
    const tenantCheck = await checkAssessmentTenant(assessmentId, url.pathname);
    if (!tenantCheck.allowed) return true;
    const parsed = await parseJsonOrRespond(req, res, { optional: true });
    if (!parsed.ok) return true;
    const payload = parsed.payload;
    try {
      const updated = await assessmentStore.reject(assessmentId, currentUser, payload.reason || payload.comment);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, statusCode: 'REJECTED', assessment: updated }, null, 2));
    } catch (err) {
      const status = err.code === 'NOT_FOUND' ? 404 : 400;
      res.writeHead(status, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, statusCode: err.code || 'BAD_REQUEST', errorMessage: err.message }));
    }
    return true;
  }

  // 10b. POST /api/v1/assessments/:id/override (Privileged & Audited Governance Override - GOV-008)
  if (req.method === 'POST' && url.pathname.startsWith('/api/v1/assessments/') && url.pathname.endsWith('/override')) {
    const assessmentId = decodeURIComponent(url.pathname.slice('/api/v1/assessments/'.length, -'/override'.length));
    const tenantCheck = await checkAssessmentTenant(assessmentId, url.pathname);
    if (!tenantCheck.allowed) return true;

    const hasOverridePermission = currentUser && !currentUser.isUnauthenticated && (
      authService.hasPermission(currentUser, PERMISSIONS.ADMIN_OVERRIDE) ||
      authService.hasPermission(currentUser, 'Fiorify.admin.override') ||
      (currentUser.role === USER_ROLES.ADMIN && authService.hasPermission(currentUser, PERMISSIONS.ADMIN_ACCESS))
    );

    if (!hasOverridePermission) {
      res.writeHead(403, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: false,
        statusCode: 'UNAUTHORIZED_OVERRIDE',
        error: 'Forbidden',
        errorMessage: 'Administrative override requires explicit authenticated ADMIN authorization with Fiorify.admin.override permission.'
      }));
      return true;
    }

    const parsed = await parseJsonOrRespond(req, res, { optional: true });
    if (!parsed.ok) return true;
    const payload = parsed.payload;

    const validScopes = ['BUILD', 'ADD_AND_CONFIGURE'];
    const overrideScope = payload.scope || 'BUILD';
    if (!validScopes.includes(overrideScope)) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: false,
        statusCode: 'VALIDATION_ERROR',
        error: 'Validation Error',
        errorMessage: `Invalid override scope "${overrideScope}". Allowed scopes: ${validScopes.join(', ')}.`
      }));
      return true;
    }

    const reason = String(payload.reason || payload.overrideReason || payload.comment || '').trim();
    if (reason.length < 10) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: false,
        statusCode: 'VALIDATION_ERROR',
        error: 'Validation Error',
        errorMessage: 'Governance override requires a documented business justification (minimum 10 characters).'
      }));
      return true;
    }

    try {
      const updated = await assessmentStore.approve(assessmentId, currentUser, reason, true);
      if (securityAuditLogger?.logEvent) {
        securityAuditLogger.logEvent({
          actor: currentUser?.id || 'admin',
          tenantId: currentUser?.tenantId || 'DEFAULT',
          action: SECURITY_ACTIONS.ADMIN_OVERRIDE,
          resource: `/api/v1/assessments/${assessmentId}/override`,
          outcome: 'GRANTED',
          details: { reason, scope: payload.scope || 'BUILD' }
        }).catch(() => {});
      }

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: true,
        statusCode: 'OVERRIDE_APPROVED',
        assessment: updated,
        override: {
          overriddenBy: currentUser.id || currentUser.name,
          overriddenAt: new Date().toISOString(),
          reason,
          scope: payload.scope || 'BUILD'
        }
      }, null, 2));
    } catch (err) {
      const status = err.code === 'NOT_FOUND' ? 404 : ((err.code === 'SEPARATION_OF_DUTIES_VIOLATION' || err.code === 'UNAUTHORIZED_OVERRIDE') ? 403 : 400);
      res.writeHead(status, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, statusCode: err.code || 'BAD_REQUEST', errorMessage: err.message }));
    }
    return true;
  }

  // 11. GET /api/v1/assessments/:id/verify-audit
  if (req.method === 'GET' && url.pathname.startsWith('/api/v1/assessments/') && url.pathname.endsWith('/verify-audit')) {
    const assessmentId = decodeURIComponent(url.pathname.slice('/api/v1/assessments/'.length, -'/verify-audit'.length));
    const tenantCheck = await checkAssessmentTenant(assessmentId, url.pathname);
    if (!tenantCheck.allowed) return true;
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
    return true;
  }

  // 12. PUT /api/v1/assessments/:id/deployment-readiness
  if (req.method === 'PUT' && url.pathname.startsWith('/api/v1/assessments/') && url.pathname.endsWith('/deployment-readiness')) {
    if (!requireRole([USER_ROLES.SAP_CONSULTANT, USER_ROLES.ADMIN])) return true;
    const assessmentId = decodeURIComponent(url.pathname.slice('/api/v1/assessments/'.length, -'/deployment-readiness'.length));
    const tenantCheck = await checkAssessmentTenant(assessmentId, url.pathname);
    if (!tenantCheck.allowed) return true;
    const parsed = await parseJsonOrRespond(req, res);
    if (!parsed.ok) return true;
    const payload = parsed.payload;
    try {
      const updated = await enterpriseService.updateDeploymentReadiness(assessmentId, payload, currentUser);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, assessment: updated }, null, 2));
    } catch (err) {
      res.writeHead(err.code === 'NOT_FOUND' ? 404 : 400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, statusCode: err.code || 'BAD_REQUEST', errorMessage: err.message }));
    }
    return true;
  }

  // 13. GET /api/v1/enterprise/portfolio
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
    return true;
  }

  // 14. GET /api/v1/enterprise/roadmap
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
    return true;
  }

  // 15. POST /api/v1/enterprise/assessments/process
  if (req.method === 'POST' && url.pathname === '/api/v1/enterprise/assessments/process') {
    if (!requireRole([USER_ROLES.SAP_CONSULTANT, USER_ROLES.ADMIN])) return true;
    const parsed = await parseJsonOrRespond(req, res);
    if (!parsed.ok) return true;
    const payload = parsed.payload;
    try {
      const result = await enterpriseService.createProcessAssessment(payload, currentUser);
      res.writeHead(201, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, ...result }, null, 2));
    } catch (err) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, statusCode: 'BAD_REQUEST', errorMessage: err.message }));
    }
    return true;
  }

  // 16. GET /api/v1/enterprise/reports/:id
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
        return true;
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, report }, null, 2));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, statusCode: 'INTERNAL_ERROR', errorMessage: err.message }));
    }
    return true;
  }

  // 17. POST /api/v1/assessments/:id/modernization-action
  if (req.method === 'POST' && url.pathname.startsWith('/api/v1/assessments/') && url.pathname.endsWith('/modernization-action')) {
    const assessmentId = decodeURIComponent(url.pathname.slice('/api/v1/assessments/'.length, -'/modernization-action'.length));
    const tenantCheck = await checkAssessmentTenant(assessmentId, url.pathname);
    if (!tenantCheck.allowed) return true;
    const parsed = await parseJsonOrRespond(req, res);
    if (!parsed.ok) return true;
    const payload = parsed.payload;

    try {
      const result = await assessmentStore.recordModernizationAction(assessmentId, payload, currentUser);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(result, null, 2));
    } catch (err) {
      const status = err.code === 'NOT_FOUND' ? 404 : ((err.code === 'UNAUTHORIZED_BUILD' || err.code === 'UNAUTHORIZED_BUILD_APPROVER') ? 403 : 400);
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

  // 18. GET /api/v1/assessments/:id/modernization-decisions
  if (req.method === 'GET' && url.pathname.startsWith('/api/v1/assessments/') && url.pathname.endsWith('/modernization-decisions')) {
    const assessmentId = decodeURIComponent(url.pathname.slice('/api/v1/assessments/'.length, -'/modernization-decisions'.length));
    const tenantCheck = await checkAssessmentTenant(assessmentId, url.pathname);
    if (!tenantCheck.allowed) return true;
    try {
      const decisions = await assessmentStore.getModernizationDecisions(assessmentId);
      if (decisions === null) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, statusCode: 'NOT_FOUND', errorMessage: `Assessment not found: ${assessmentId}` }));
        return true;
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, assessmentId, count: decisions.length, decisions }, null, 2));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, statusCode: 'INTERNAL_ERROR', errorMessage: err.message }));
    }
    return true;
  }

  // 19. GET /api/v1/assessments/:id (Single Assessment)
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
      res.end(JSON.stringify({ success: false, statusCode: 'BAD_REQUEST', errorMessage: 'Assessment ID is required.' }));
      return true;
    }

    try {
      const record = await assessmentStore.getById(assessmentId);
      if (!record) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, statusCode: 'NOT_FOUND', error: 'Not Found', errorMessage: `Assessment not found: ${assessmentId}` }));
        return true;
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
        return true;
      }

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, assessment: record }, null, 2));
    } catch (err) {
      const sanitized = sanitizeErrorMessage(err.message || 'Failed to retrieve assessment');
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, statusCode: 'INTERNAL_ERROR', errorMessage: sanitized }));
    }
    return true;
  }

  // 20. GET /api/v1/assessments (List Assessments)
  if (req.method === 'GET' && url.pathname === '/api/v1/assessments') {
    const clientTenantId = url.searchParams.get('tenantId');
    const hasAdminAccess = currentUser?.role === USER_ROLES.ADMIN ||
      (Array.isArray(currentUser?.scopes) && currentUser?.scopes.includes('Fiorify.admin.access'));

    if (clientTenantId && currentUser?.tenantId && clientTenantId !== currentUser.tenantId && !hasAdminAccess) {
      if (securityAuditLogger?.logEvent) {
        securityAuditLogger.logEvent({
          actor: currentUser.id || 'anonymous',
          tenantId: currentUser.tenantId,
          action: SECURITY_ACTIONS.TENANT_ACCESS_VIOLATION,
          resource: '/api/v1/assessments',
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
        sortOrder,
        tenantId: (hasAdminAccess && clientTenantId) ? clientTenantId : currentUser?.tenantId
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
      res.end(JSON.stringify({ success: false, statusCode: 'INTERNAL_ERROR', errorMessage: sanitized }));
    }
    return true;
  }

  return false;
}
