import { sanitizeErrorMessage } from '../adapters/btpDestinationAdapter.js';
import { USER_ROLES } from '../services/authService.js';
import { SECURITY_ACTIONS } from '../infrastructure/security/securityAuditLogger.js';

const MAX_BODY_SIZE = 100 * 1024; // 100KB body limit

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



  // 1. POST /api/v1/assessments (Create Assessment)
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

    await new Promise((resolve) => req.on('end', resolve));
    if (isAborted) return true;

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
          errorMessage: 'Malformed JSON payload.',
          message: 'Malformed JSON payload.'
        })
      );
      return true;
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

    await new Promise((resolve) => req.on('end', resolve));
    if (isAborted) return true;

    let payload = {};
    if (body.trim().length > 0) {
      try { payload = JSON.parse(body); } catch { /* ignore */ }
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

    await new Promise((resolve) => req.on('end', resolve));
    if (isAborted) return true;

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
      return true;
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
        return true;
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
        return true;
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
    let body = '';
    req.on('data', (c) => (body += c));
    await new Promise((resolve) => req.on('end', resolve));

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
    return true;
  }

  // 9. POST /api/v1/assessments/:id/approve
  if (req.method === 'POST' && url.pathname.startsWith('/api/v1/assessments/') && url.pathname.endsWith('/approve')) {
    if (!requireRole([USER_ROLES.APPROVER, USER_ROLES.ADMIN])) return true;
    const assessmentId = decodeURIComponent(url.pathname.slice('/api/v1/assessments/'.length, -'/approve'.length));
    let body = '';
    req.on('data', (c) => (body += c));
    await new Promise((resolve) => req.on('end', resolve));

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
    return true;
  }

  // 10. POST /api/v1/assessments/:id/reject
  if (req.method === 'POST' && url.pathname.startsWith('/api/v1/assessments/') && url.pathname.endsWith('/reject')) {
    if (!requireRole([USER_ROLES.APPROVER, USER_ROLES.ADMIN])) return true;
    const assessmentId = decodeURIComponent(url.pathname.slice('/api/v1/assessments/'.length, -'/reject'.length));
    let body = '';
    req.on('data', (c) => (body += c));
    await new Promise((resolve) => req.on('end', resolve));

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
    return true;
  }

  // 11. GET /api/v1/assessments/:id/verify-audit
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
    return true;
  }

  // 12. PUT /api/v1/assessments/:id/deployment-readiness
  if (req.method === 'PUT' && url.pathname.startsWith('/api/v1/assessments/') && url.pathname.endsWith('/deployment-readiness')) {
    if (!requireRole([USER_ROLES.SAP_CONSULTANT, USER_ROLES.ADMIN])) return true;
    const assessmentId = decodeURIComponent(url.pathname.slice('/api/v1/assessments/'.length, -'/deployment-readiness'.length));
    let body = '';
    req.on('data', (c) => (body += c));
    await new Promise((resolve) => req.on('end', resolve));

    let payload = {};
    try { payload = JSON.parse(body || '{}'); } catch {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, statusCode: 'BAD_REQUEST', errorMessage: 'Malformed JSON payload.' }));
      return true;
    }
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
    let body = '';
    req.on('data', (c) => (body += c));
    await new Promise((resolve) => req.on('end', resolve));

    let payload = {};
    try { payload = JSON.parse(body || '{}'); } catch {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, statusCode: 'BAD_REQUEST', errorMessage: 'Malformed JSON payload.' }));
      return true;
    }
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

    await new Promise((resolve) => req.on('end', resolve));
    if (isAborted) return true;

    let payload = {};
    try { payload = JSON.parse(body || '{}'); } catch {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, statusCode: 'BAD_REQUEST', errorMessage: 'Malformed JSON payload.' }));
      return true;
    }

    try {
      const result = await assessmentStore.recordModernizationAction(assessmentId, payload, currentUser);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(result, null, 2));
    } catch (err) {
      const status = err.code === 'NOT_FOUND' ? 404 : (err.code === 'UNAUTHORIZED_BUILD' ? 403 : 400);
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
      res.end(JSON.stringify({ success: false, statusCode: 'INTERNAL_ERROR', errorMessage: sanitized }));
    }
    return true;
  }

  return false;
}
