import { PERMISSIONS } from '../../services/authService.js';
import { SECURITY_ACTIONS } from '../../infrastructure/security/securityAuditLogger.js';
import { defaultGenerationReadinessEngine } from '../projects/generationReadinessEngine.js';
import { defaultSpecificationVersioningService } from '../projects/specificationVersioningService.js';

const MAX_BODY_SIZE = 100 * 1024; // 100KB limit

/**
 * Handles Generation Studio Project Lifecycle Routes (GEN-01, GEN-02)
 *
 * @param {import('node:http').IncomingMessage} req
 * @param {import('node:http').ServerResponse} res
 * @param {URL} url
 * @param {object} context
 * @returns {Promise<boolean>} True if handled, false otherwise
 */
export async function handleGenerationProjectRoutes(req, res, url, context = {}) {
  const {
    currentUser,
    requirePermission = () => true,
    securityAuditLogger,
    generationProjectService,
    generationProjectStore
  } = context;

  if (!url.pathname.startsWith('/api/v1/generation/projects')) {
    return false;
  }

  // Helper to read JSON body safely
  const readJson = () =>
    new Promise((resolve, reject) => {
      let body = '';
      let bodyLength = 0;
      let isAborted = false;

      req.on('data', (chunk) => {
        if (isAborted) return;
        bodyLength += chunk.length;
        if (bodyLength > MAX_BODY_SIZE) {
          isAborted = true;
          req.destroy();
          const err = new Error('Payload exceeds maximum allowed size (100KB).');
          err.code = 'PAYLOAD_TOO_LARGE';
          reject(err);
          return;
        }
        body += chunk;
      });

      req.on('end', () => {
        if (isAborted) return;
        try {
          resolve(JSON.parse(body || '{}'));
        } catch {
          const err = new Error('Malformed JSON payload.');
          err.code = 'BAD_REQUEST';
          reject(err);
        }
      });

      req.on('error', reject);
    });

  // 1. GET /api/v1/generation/projects - List Generation Projects
  if (req.method === 'GET' && url.pathname === '/api/v1/generation/projects') {
    if (!requirePermission(PERMISSIONS.GENERATION_MANAGE)) return true;
    try {
      const search = url.searchParams.get('search') || undefined;
      const lifecycleStatus = url.searchParams.get('lifecycleStatus') || undefined;
      const origin = url.searchParams.get('origin') || undefined;
      const page = url.searchParams.get('page') || undefined;
      const pageSize = url.searchParams.get('pageSize') || undefined;
      const sortOrder = url.searchParams.get('sortOrder') || undefined;

      const result = await generationProjectService.listProjects(
        {
          search,
          lifecycleStatus,
          origin,
          page,
          pageSize,
          sortOrder
        },
        currentUser
      );

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, ...result }, null, 2));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, statusCode: 'INTERNAL_ERROR', errorMessage: err.message }));
    }
    return true;
  }

  // 2. POST /api/v1/generation/projects - Create Generation Project (Standalone or from Approved Handoff)
  if (req.method === 'POST' && url.pathname === '/api/v1/generation/projects') {
    if (!requirePermission(PERMISSIONS.GENERATION_MANAGE)) return true;
    try {
      const payload = await readJson();
      const result = await generationProjectService.createProject(payload, currentUser);
      const statusCode = result.alreadyExists ? 200 : 201;
      res.writeHead(statusCode, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify(
          {
            success: true,
            statusCode: result.alreadyExists ? 'OK' : 'CREATED',
            alreadyExists: result.alreadyExists,
            message: result.message,
            project: result.project
          },
          null,
          2
        )
      );
    } catch (err) {
      const status =
        err.code === 'NOT_FOUND'
          ? 404
          : err.code === 'UNAUTHORIZED_BUILD'
          ? 403
          : err.code === 'ID_CONFLICT'
          ? 409
          : 400;

      res.writeHead(status, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify(
          {
            success: false,
            statusCode: err.code || 'BAD_REQUEST',
            errorMessage: err.message,
            error: err.message
          },
          null,
          2
        )
      );
    }
    return true;
  }

  // 3. GET /api/v1/generation/projects/:id/activity - Project Activity History
  if (req.method === 'GET' && url.pathname.endsWith('/activity')) {
    if (!requirePermission(PERMISSIONS.GENERATION_MANAGE)) return true;
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
    return true;
  }

  // 4. GET /api/v1/generation/projects/:id/summary - Project Summary
  if (req.method === 'GET' && url.pathname.endsWith('/summary')) {
    if (!requirePermission(PERMISSIONS.GENERATION_MANAGE)) return true;
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
    return true;
  }

  // 5. POST /api/v1/generation/projects/:id/duplicate - Duplicate Project
  if (req.method === 'POST' && url.pathname.endsWith('/duplicate')) {
    if (!requirePermission(PERMISSIONS.GENERATION_MANAGE)) return true;
    const projectId = decodeURIComponent(url.pathname.slice('/api/v1/generation/projects/'.length, -'/duplicate'.length));
    try {
      const payload = await readJson();
      const duplicated = await generationProjectService.duplicateProject(projectId, payload, currentUser);
      res.writeHead(201, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, statusCode: 'CREATED', project: duplicated }, null, 2));
    } catch (err) {
      const status = err.code === 'NOT_FOUND' ? 404 : err.code === 'ID_CONFLICT' ? 409 : 400;
      res.writeHead(status, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, statusCode: err.code || 'BAD_REQUEST', errorMessage: err.message }));
    }
    return true;
  }

  // 6. POST /api/v1/generation/projects/:id/archive - Archive Project
  if (req.method === 'POST' && url.pathname.endsWith('/archive')) {
    if (!requirePermission(PERMISSIONS.GENERATION_MANAGE)) return true;
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
    return true;
  }

  // 7. POST /api/v1/generation/projects/:id/restore - Restore Project
  if (req.method === 'POST' && url.pathname.endsWith('/restore')) {
    if (!requirePermission(PERMISSIONS.GENERATION_MANAGE)) return true;
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
    return true;
  }

  // 8. GET /api/v1/generation/projects/:id/artifacts/:id/download
  if (req.method === 'GET' && url.pathname.includes('/artifacts/') && url.pathname.endsWith('/download')) {
    if (!requirePermission('Fiorify.artifacts.export')) return true;
    const parts = url.pathname.split('/');
    const pIdx = parts.indexOf('projects');
    const aIdx = parts.indexOf('artifacts');
    const projectId = decodeURIComponent(parts[pIdx + 1]);
    const artifactId = decodeURIComponent(parts[aIdx + 1]);

    try {
      const project = await generationProjectService.getProject(projectId);
      if (!project) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, statusCode: 'NOT_FOUND', errorMessage: `Project not found: ${projectId}` }));
        return true;
      }
      if (project.tenantId && currentUser?.tenantId && project.tenantId !== currentUser.tenantId) {
        if (securityAuditLogger?.logEvent) {
          securityAuditLogger.logEvent({
            actor: currentUser.id || 'anonymous',
            tenantId: currentUser.tenantId,
            action: SECURITY_ACTIONS.TENANT_ACCESS_VIOLATION,
            resource: url.pathname,
            outcome: 'DENIED',
            details: { targetTenant: project.tenantId, userTenant: currentUser.tenantId }
          }).catch(() => {});
        }

        res.writeHead(403, { 'Content-Type': 'application/json' });
        res.end(
          JSON.stringify({
            success: false,
            statusCode: 'FORBIDDEN',
            error: 'TenantAccessDenied',
            errorMessage: `Access denied to artifact belonging to tenant "${project.tenantId}". Current tenant is "${currentUser.tenantId}".`
          })
        );
        return true;
      }

      const artifacts = await (generationProjectStore?.listArtifacts
        ? generationProjectStore.listArtifacts(projectId)
        : generationProjectService.projectStore?.listArtifacts(projectId) || []);
      const art = artifacts.find((a) => (a.artifactId || a.id) === artifactId);
      if (!art) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, statusCode: 'NOT_FOUND', errorMessage: `Artifact "${artifactId}" not found in project ${projectId}.` }));
        return true;
      }

      if (securityAuditLogger?.logEvent) {
        securityAuditLogger.logEvent({
          actor: currentUser.id || 'anonymous',
          tenantId: currentUser.tenantId || 'DEFAULT-TENANT-S21',
          action: SECURITY_ACTIONS.ARTIFACT_EXPORTED,
          resource: `/api/v1/generation/projects/${projectId}/artifacts/${artifactId}`,
          outcome: 'SUCCESS',
          details: { artifactName: art.artifactName || art.name, artifactType: art.layer || art.artifactType }
        }).catch(() => {});
      }

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, artifact: art }));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: err.message }));
    }
    return true;
  }

  // 9. Single Project by ID routes: GET, PATCH, DELETE
  const singleProjectMatch = url.pathname.match(/^\/api\/v1\/generation\/projects\/([^/]+)$/);

  // S7 API: GET /api/v1/generation/projects/:id/readiness
  if (req.method === 'GET' && url.pathname.endsWith('/readiness')) {
    if (!requirePermission(PERMISSIONS.GENERATION_MANAGE)) return true;
    const projectId = decodeURIComponent(url.pathname.slice('/api/v1/generation/projects/'.length, -'/readiness'.length));
    try {
      const project = await generationProjectService.getProject(projectId, currentUser);
      if (!project) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, statusCode: 'NOT_FOUND', errorMessage: `Project not found: ${projectId}` }));
        return true;
      }
      const readiness = defaultGenerationReadinessEngine.evaluateReadiness(project);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, projectId, readiness }, null, 2));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, statusCode: 'INTERNAL_ERROR', errorMessage: err.message }));
    }
    return true;
  }

  // S7 API: GET /api/v1/generation/projects/:id/versions - List specification versions
  if (req.method === 'GET' && url.pathname.endsWith('/versions')) {
    if (!requirePermission(PERMISSIONS.GENERATION_MANAGE)) return true;
    const projectId = decodeURIComponent(url.pathname.slice('/api/v1/generation/projects/'.length, -'/versions'.length));
    try {
      const versions = await defaultSpecificationVersioningService.listVersions(projectId);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, projectId, versions }, null, 2));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, statusCode: 'INTERNAL_ERROR', errorMessage: err.message }));
    }
    return true;
  }

  // S7 API: POST /api/v1/generation/projects/:id/versions - Snapshot current specification
  if (req.method === 'POST' && url.pathname.endsWith('/versions')) {
    if (!requirePermission(PERMISSIONS.GENERATION_MANAGE)) return true;
    const projectId = decodeURIComponent(url.pathname.slice('/api/v1/generation/projects/'.length, -'/versions'.length));
    try {
      const payload = await readJson();
      const project = await generationProjectService.getProject(projectId, currentUser);
      if (!project) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, statusCode: 'NOT_FOUND', errorMessage: `Project not found: ${projectId}` }));
        return true;
      }
      const snapResult = await defaultSpecificationVersioningService.createVersionSnapshot(
        project,
        currentUser,
        payload.changelog || 'Specification version snapshot'
      );
      res.writeHead(201, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, ...snapResult }, null, 2));
    } catch (err) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, statusCode: err.code || 'BAD_REQUEST', errorMessage: err.message }));
    }
    return true;
  }

  // S7 API: GET /api/v1/generation/projects/:id/versions/compare - Diff two versions
  if (req.method === 'GET' && url.pathname.includes('/versions/compare')) {
    if (!requirePermission(PERMISSIONS.GENERATION_MANAGE)) return true;
    const match = url.pathname.match(/^\/api\/v1\/generation\/projects\/([^/]+)\/versions\/compare$/);
    if (match) {
      const projectId = decodeURIComponent(match[1]);
      const v1 = parseInt(url.searchParams.get('v1') || '1', 10);
      const v2 = parseInt(url.searchParams.get('v2') || '2', 10);
      try {
        const diff = await defaultSpecificationVersioningService.compareVersions(projectId, v1, v2);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, ...diff }, null, 2));
      } catch (err) {
        res.writeHead(err.code === 'NOT_FOUND' ? 404 : 400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, statusCode: err.code || 'BAD_REQUEST', errorMessage: err.message }));
      }
      return true;
    }
  }

  // S7 API: POST /api/v1/generation/projects/:id/submit-review
  if (req.method === 'POST' && url.pathname.endsWith('/submit-review')) {
    if (!requirePermission(PERMISSIONS.GENERATION_MANAGE)) return true;
    const projectId = decodeURIComponent(url.pathname.slice('/api/v1/generation/projects/'.length, -'/submit-review'.length));
    try {
      const project = await generationProjectService.getProject(projectId, currentUser);
      if (!project) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, statusCode: 'NOT_FOUND', errorMessage: `Project not found: ${projectId}` }));
        return true;
      }
      const reviewResult = await defaultSpecificationVersioningService.submitForReview(project, currentUser);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, ...reviewResult }, null, 2));
    } catch (err) {
      res.writeHead(err.code === 'VALIDATION_FAILED' ? 422 : 400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, statusCode: err.code || 'BAD_REQUEST', errorMessage: err.message }));
    }
    return true;
  }

  // S7 API: POST /api/v1/generation/projects/:id/approve - Architectural review decision
  if (req.method === 'POST' && url.pathname.endsWith('/approve')) {
    if (!requirePermission(PERMISSIONS.GENERATION_MANAGE)) return true;
    const projectId = decodeURIComponent(url.pathname.slice('/api/v1/generation/projects/'.length, -'/approve'.length));
    try {
      const payload = await readJson();
      const project = await generationProjectService.getProject(projectId, currentUser);
      if (!project) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, statusCode: 'NOT_FOUND', errorMessage: `Project not found: ${projectId}` }));
        return true;
      }
      const approvalResult = await defaultSpecificationVersioningService.processApproval(project, payload, currentUser);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, ...approvalResult }, null, 2));
    } catch (err) {
      const status = err.code === 'UNAUTHORIZED_APPROVAL' ? 403 : err.code === 'NOT_FOUND' ? 404 : 400;
      res.writeHead(status, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, statusCode: err.code || 'BAD_REQUEST', errorMessage: err.message }));
    }
    return true;
  }
  if (singleProjectMatch) {
    if (!requirePermission(PERMISSIONS.GENERATION_MANAGE)) return true;
    const projectId = decodeURIComponent(singleProjectMatch[1]);

    if (req.method === 'GET') {
      try {
        const project = await generationProjectService.getProject(projectId, currentUser);
        if (!project) {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, statusCode: 'NOT_FOUND', errorMessage: `Project not found: ${projectId}` }));
          return true;
        }
        if (project.tenantId && currentUser?.tenantId && project.tenantId !== currentUser.tenantId) {
          if (securityAuditLogger?.logEvent) {
            securityAuditLogger.logEvent({
              actor: currentUser.id || 'anonymous',
              tenantId: currentUser.tenantId,
              action: SECURITY_ACTIONS.TENANT_ACCESS_VIOLATION,
              resource: `/api/v1/generation/projects/${projectId}`,
              outcome: 'DENIED',
              details: { targetTenant: project.tenantId, userTenant: currentUser.tenantId }
            }).catch(() => {});
          }

          res.writeHead(403, { 'Content-Type': 'application/json' });
          res.end(
            JSON.stringify({
              success: false,
              statusCode: 'FORBIDDEN',
              error: 'TenantAccessDenied',
              errorMessage: `Access denied to generation project belonging to tenant "${project.tenantId}". Current tenant is "${currentUser.tenantId}".`
            })
          );
          return true;
        }
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, project }, null, 2));
      } catch (err) {
        const status = err.code === 'INVALID_PROJECT_ID' || err.code === 'PATH_TRAVERSAL_DETECTED' ? 400 : 500;
        res.writeHead(status, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, statusCode: err.code || 'INTERNAL_ERROR', errorMessage: err.message }));
      }
      return true;
    }

    if (req.method === 'PATCH') {
      try {
        const patch = await readJson();
        const updated = await generationProjectService.updateProject(projectId, patch, currentUser);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, project: updated }, null, 2));
      } catch (err) {
        const status =
          err.code === 'NOT_FOUND'
            ? 404
            : err.code === 'PROJECT_ARCHIVED'
            ? 409
            : 400;

        res.writeHead(status, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, statusCode: err.code || 'BAD_REQUEST', errorMessage: err.message }));
      }
      return true;
    }

    if (req.method === 'DELETE') {
      const confirmed = url.searchParams.get('confirmed') === 'true';
      try {
        const deleteResult = await generationProjectService.deleteProject(projectId, { confirmed, userContext: currentUser });
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, ...deleteResult }, null, 2));
      } catch (err) {
        const status = err.code === 'NOT_FOUND' ? 404 : err.code === 'CONFIRMATION_REQUIRED' ? 409 : 400;
        res.writeHead(status, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, statusCode: err.code || 'BAD_REQUEST', errorMessage: err.message }));
      }
      return true;
    }
  }

  return false;
}
