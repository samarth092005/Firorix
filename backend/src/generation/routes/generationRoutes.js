/**
 * FioriX — Generation Studio Combined Router (GEN-02, GEN-03, GEN-04)
 *
 * Dispatches requirements, data model, assessment context, and CDS registry API requests.
 */

import { defaultRequirementsService } from '../requirements/requirementsService.js';
import { defaultDataModelService } from '../datamodel/dataModelService.js';
import { defaultCdsReuseRegistry } from '../datamodel/cdsReuseRegistry.js';
import { defaultGenerationProjectService } from '../projects/generationProjectService.js';
import { defaultArchitectureService } from '../architecture/architectureService.js';
import { defaultAbapGeneratorEngine } from '../abap/abapGeneratorEngine.js';
import { defaultFioriGeneratorEngine } from '../fiori/fioriGeneratorEngine.js';
import { defaultStaticValidationEngine } from '../validation/staticValidationEngine.js';
import { defaultPreviewManager } from '../preview/previewManager.js';
import { defaultExportManager } from '../export/exportManager.js';
import { buildTraceabilityMatrix } from '../export/traceabilityEngine.js';
import { defaultToolchainScanner } from '../toolchain/toolchainScanner.js';
import { generateDeveloperHandoverGuide } from '../toolchain/handoverGuideGenerator.js';
import { ArtifactRegistry } from '../artifacts/artifactRegistry.js';
import { PERMISSIONS } from '../../services/authService.js';
import { SECURITY_ACTIONS } from '../../infrastructure/security/securityAuditLogger.js';

const MAX_BODY_SIZE = 100 * 1024; // 100KB limit

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
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
      if (!body || !body.trim()) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(body));
      } catch {
        const err = new Error('Malformed JSON payload.');
        err.code = 'BAD_REQUEST';
        reject(err);
      }
    });

    req.on('error', reject);
  });
}

function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data, null, 2));
}

function sendError(res, err) {
  const statusCode = err.code === 'NOT_FOUND'
    ? 404
    : err.code === 'UNAUTHORIZED_BUILD' || err.code === 'FORBIDDEN' || err.code === 'TenantAccessDenied'
    ? 403
    : err.code === 'PAYLOAD_TOO_LARGE'
    ? 413
    : err.code === 'ID_CONFLICT'
    ? 409
    : 400;

  sendJson(res, statusCode, {
    success: false,
    statusCode: err.code || 'BAD_REQUEST',
    errorMessage: err.message,
    issues: err.issues || undefined
  });
}

/**
 * Handles Generation Studio endpoints.
 * Returns true if request was handled, false otherwise.
 */
export async function handleGenerationRoutes(req, res, url, context = {}) {
  const {
    currentUser,
    requirePermission = () => true,
    securityAuditLogger,
    generationProjectService = defaultGenerationProjectService,
    requirementsService = defaultRequirementsService,
    dataModelService = defaultDataModelService,
    cdsRegistry = defaultCdsReuseRegistry,
    architectureService = defaultArchitectureService,
    abapGeneratorEngine = defaultAbapGeneratorEngine,
    fioriGeneratorEngine = defaultFioriGeneratorEngine,
    staticValidationEngine = defaultStaticValidationEngine,
    previewManager = defaultPreviewManager,
    exportManager = defaultExportManager,
    toolchainScanner = defaultToolchainScanner
  } = context;

  const pathname = url.pathname;

  // 1. GET /api/v1/generation/context/:assessmentId
  if (req.method === 'GET' && pathname.startsWith('/api/v1/generation/context/')) {
    if (!requirePermission(PERMISSIONS.GENERATION_MANAGE)) return true;
    const assessmentId = decodeURIComponent(pathname.slice('/api/v1/generation/context/'.length));
    try {
      const result = await generationProjectService.getAssessmentHandoffContext(assessmentId, currentUser);
      sendJson(res, 200, result);
    } catch (err) {
      sendError(res, err);
    }
    return true;
  }

  // 2. GET /api/v1/generation/cds-registry (or /cds-registry/search or /data-model/cds-registry)
  if (req.method === 'GET' && (
    pathname === '/api/v1/generation/cds-registry' ||
    pathname === '/api/v1/generation/cds-registry/search' ||
    pathname === '/api/v1/generation/data-model/cds-registry'
  )) {
    if (!requirePermission(PERMISSIONS.GENERATION_MANAGE)) return true;
    try {
      const query = url.searchParams.get('q') || url.searchParams.get('query') || url.searchParams.get('search') || '';
      const category = url.searchParams.get('category') || null;
      const entries = cdsRegistry.search(query, category);
      sendJson(res, 200, {
        success: true,
        count: entries.length,
        entries,
        views: entries
      });
    } catch (err) {
      sendError(res, err);
    }
    return true;
  }

  // ============================================================
  // REQUIREMENTS ROUTES (GEN-03)
  // ============================================================

  // 3. POST /api/v1/generation/projects/:projectId/requirements/import (or /import-assessment)
  const importMatch = pathname.match(/^\/api\/v1\/generation\/projects\/([^/]+)\/requirements\/(import|import-assessment)$/);
  if (req.method === 'POST' && importMatch) {
    if (!requirePermission(PERMISSIONS.GENERATION_MANAGE)) return true;
    const projectId = decodeURIComponent(importMatch[1]);
    try {
      const payload = await readJsonBody(req);
      const result = await requirementsService.importFromAssessment(projectId, payload.assessmentId, currentUser);
      sendJson(res, 200, result);
    } catch (err) {
      sendError(res, err);
    }
    return true;
  }

  // 4. POST /api/v1/generation/projects/:projectId/requirements/:requirementId/confirm (or /action)
  const confirmMatch = pathname.match(/^\/api\/v1\/generation\/projects\/([^/]+)\/requirements\/([^/]+)\/(?:confirm|action)$/);
  if (req.method === 'POST' && confirmMatch) {
    if (!requirePermission(PERMISSIONS.GENERATION_MANAGE)) return true;
    const projectId = decodeURIComponent(confirmMatch[1]);
    const requirementId = decodeURIComponent(confirmMatch[2]);
    try {
      const payload = await readJsonBody(req);
      const result = await requirementsService.confirmRequirement(
        projectId,
        requirementId,
        payload.action || 'CONFIRM',
        payload.reason || payload.comment || payload.deferralReason || payload.rejectionReason || '',
        currentUser
      );
      sendJson(res, 200, result);
    } catch (err) {
      sendError(res, err);
    }
    return true;
  }

  // 5. GET /api/v1/generation/projects/:projectId/requirements
  const reqListMatch = pathname.match(/^\/api\/v1\/generation\/projects\/([^/]+)\/requirements$/);
  if (req.method === 'GET' && reqListMatch) {
    if (!requirePermission(PERMISSIONS.GENERATION_MANAGE)) return true;
    const projectId = decodeURIComponent(reqListMatch[1]);
    try {
      const result = await requirementsService.listRequirements(projectId, currentUser);
      sendJson(res, 200, result);
    } catch (err) {
      sendError(res, err);
    }
    return true;
  }

  // 6. POST /api/v1/generation/projects/:projectId/requirements
  if (req.method === 'POST' && reqListMatch) {
    if (!requirePermission(PERMISSIONS.GENERATION_MANAGE)) return true;
    const projectId = decodeURIComponent(reqListMatch[1]);
    try {
      const payload = await readJsonBody(req);
      const requirement = await requirementsService.createRequirement(projectId, payload, currentUser);
      sendJson(res, 201, { success: true, requirement });
    } catch (err) {
      sendError(res, err);
    }
    return true;
  }

  // 7. PUT/PATCH /api/v1/generation/projects/:projectId/requirements/:requirementId
  const singleReqMatch = pathname.match(/^\/api\/v1\/generation\/projects\/([^/]+)\/requirements\/([^/]+)$/);
  if ((req.method === 'PUT' || req.method === 'PATCH') && singleReqMatch) {
    if (!requirePermission(PERMISSIONS.GENERATION_MANAGE)) return true;
    const projectId = decodeURIComponent(singleReqMatch[1]);
    const requirementId = decodeURIComponent(singleReqMatch[2]);
    try {
      const patch = await readJsonBody(req);
      const updated = await requirementsService.updateRequirement(projectId, requirementId, patch, currentUser);
      sendJson(res, 200, { success: true, requirement: updated });
    } catch (err) {
      sendError(res, err);
    }
    return true;
  }

  // 8. DELETE /api/v1/generation/projects/:projectId/requirements/:requirementId
  if (req.method === 'DELETE' && singleReqMatch) {
    if (!requirePermission(PERMISSIONS.GENERATION_MANAGE)) return true;
    const projectId = decodeURIComponent(singleReqMatch[1]);
    const requirementId = decodeURIComponent(singleReqMatch[2]);
    try {
      const result = await requirementsService.deleteRequirement(projectId, requirementId, currentUser);
      sendJson(res, 200, result);
    } catch (err) {
      sendError(res, err);
    }
    return true;
  }

  // ============================================================
  // DATA MODEL ROUTES (GEN-04)
  // ============================================================

  // 9. POST /api/v1/generation/projects/:projectId/data-model/validate (or /datamodel/validate)
  const validateMatch = pathname.match(/^\/api\/v1\/generation\/projects\/([^/]+)\/(?:data-model|datamodel)\/validate$/);
  if (req.method === 'POST' && validateMatch) {
    if (!requirePermission(PERMISSIONS.GENERATION_MANAGE)) return true;
    const projectId = decodeURIComponent(validateMatch[1]);
    try {
      const result = await dataModelService.validateDataModel(projectId, currentUser);
      sendJson(res, 200, result);
    } catch (err) {
      sendError(res, err);
    }
    return true;
  }

  // 10. GET /api/v1/generation/projects/:projectId/data-model (or /datamodel)
  const dataModelMatch = pathname.match(/^\/api\/v1\/generation\/projects\/([^/]+)\/(?:data-model|datamodel)$/);
  if (req.method === 'GET' && dataModelMatch) {
    if (!requirePermission(PERMISSIONS.GENERATION_MANAGE)) return true;
    const projectId = decodeURIComponent(dataModelMatch[1]);
    try {
      const result = await dataModelService.getDataModel(projectId, currentUser);
      sendJson(res, 200, result);
    } catch (err) {
      sendError(res, err);
    }
    return true;
  }

  // 11. PUT /api/v1/generation/projects/:projectId/data-model (or /datamodel)
  if (req.method === 'PUT' && dataModelMatch) {
    if (!requirePermission(PERMISSIONS.GENERATION_MANAGE)) return true;
    const projectId = decodeURIComponent(dataModelMatch[1]);
    try {
      const payload = await readJsonBody(req);
      const result = await dataModelService.saveDataModel(projectId, payload, currentUser);
      sendJson(res, 200, result);
    } catch (err) {
      sendError(res, err);
    }
    return true;
  }

  // 12. POST /api/v1/generation/projects/:projectId/data-model/entities (or /datamodel/entities)
  const entitiesMatch = pathname.match(/^\/api\/v1\/generation\/projects\/([^/]+)\/(?:data-model|datamodel)\/entities$/);
  if (req.method === 'POST' && entitiesMatch) {
    if (!requirePermission(PERMISSIONS.GENERATION_MANAGE)) return true;
    const projectId = decodeURIComponent(entitiesMatch[1]);
    try {
      const payload = await readJsonBody(req);
      const entity = await dataModelService.addEntity(projectId, payload, currentUser);
      sendJson(res, 201, { success: true, entity });
    } catch (err) {
      sendError(res, err);
    }
    return true;
  }

  // 13. PUT/PATCH /api/v1/generation/projects/:projectId/data-model/entities/:entityId (or /datamodel/entities/:entityId)
  const singleEntityMatch = pathname.match(/^\/api\/v1\/generation\/projects\/([^/]+)\/(?:data-model|datamodel)\/entities\/([^/]+)$/);
  if ((req.method === 'PUT' || req.method === 'PATCH') && singleEntityMatch) {
    if (!requirePermission(PERMISSIONS.GENERATION_MANAGE)) return true;
    const projectId = decodeURIComponent(singleEntityMatch[1]);
    const entityId = decodeURIComponent(singleEntityMatch[2]);
    try {
      const patch = await readJsonBody(req);
      const updated = await dataModelService.updateEntity(projectId, entityId, patch, currentUser);
      sendJson(res, 200, { success: true, entity: updated });
    } catch (err) {
      sendError(res, err);
    }
    return true;
  }

  // 14. DELETE /api/v1/generation/projects/:projectId/data-model/entities/:entityId (or /datamodel/entities/:entityId)
  if (req.method === 'DELETE' && singleEntityMatch) {
    if (!requirePermission(PERMISSIONS.GENERATION_MANAGE)) return true;
    const projectId = decodeURIComponent(singleEntityMatch[1]);
    const entityId = decodeURIComponent(singleEntityMatch[2]);
    try {
      const result = await dataModelService.deleteEntity(projectId, entityId, currentUser);
      sendJson(res, 200, result);
    } catch (err) {
      sendError(res, err);
    }
    return true;
  }

  // 15. POST /api/v1/generation/projects/:projectId/data-model/entities/:entityId/fields (or /datamodel/entities/:entityId/fields)
  const fieldsMatch = pathname.match(/^\/api\/v1\/generation\/projects\/([^/]+)\/(?:data-model|datamodel)\/entities\/([^/]+)\/fields$/);
  if (req.method === 'POST' && fieldsMatch) {
    if (!requirePermission(PERMISSIONS.GENERATION_MANAGE)) return true;
    const projectId = decodeURIComponent(fieldsMatch[1]);
    const entityId = decodeURIComponent(fieldsMatch[2]);
    try {
      const payload = await readJsonBody(req);
      const field = await dataModelService.addField(projectId, entityId, payload, currentUser);
      sendJson(res, 201, { success: true, field });
    } catch (err) {
      sendError(res, err);
    }
    return true;
  }

  // 16. PUT/PATCH /api/v1/generation/projects/:projectId/data-model/entities/:entityId/fields/:fieldId (or /datamodel/...)
  const singleFieldMatch = pathname.match(/^\/api\/v1\/generation\/projects\/([^/]+)\/(?:data-model|datamodel)\/entities\/([^/]+)\/fields\/([^/]+)$/);
  if ((req.method === 'PUT' || req.method === 'PATCH') && singleFieldMatch) {
    if (!requirePermission(PERMISSIONS.GENERATION_MANAGE)) return true;
    const projectId = decodeURIComponent(singleFieldMatch[1]);
    const entityId = decodeURIComponent(singleFieldMatch[2]);
    const fieldId = decodeURIComponent(singleFieldMatch[3]);
    try {
      const patch = await readJsonBody(req);
      const updated = await dataModelService.updateField(projectId, entityId, fieldId, patch, currentUser);
      sendJson(res, 200, { success: true, field: updated });
    } catch (err) {
      sendError(res, err);
    }
    return true;
  }

  // 17. DELETE /api/v1/generation/projects/:projectId/data-model/entities/:entityId/fields/:fieldId (or /datamodel/...)
  if (req.method === 'DELETE' && singleFieldMatch) {
    if (!requirePermission(PERMISSIONS.GENERATION_MANAGE)) return true;
    const projectId = decodeURIComponent(singleFieldMatch[1]);
    const entityId = decodeURIComponent(singleFieldMatch[2]);
    const fieldId = decodeURIComponent(singleFieldMatch[3]);
    try {
      const result = await dataModelService.deleteField(projectId, entityId, fieldId, currentUser);
      sendJson(res, 200, result);
    } catch (err) {
      sendError(res, err);
    }
    return true;
  }

  // 18. POST /api/v1/generation/projects/:projectId/data-model/relationships (or /datamodel/relationships)
  const relsMatch = pathname.match(/^\/api\/v1\/generation\/projects\/([^/]+)\/(?:data-model|datamodel)\/relationships$/);
  if (req.method === 'POST' && relsMatch) {
    if (!requirePermission(PERMISSIONS.GENERATION_MANAGE)) return true;
    const projectId = decodeURIComponent(relsMatch[1]);
    try {
      const payload = await readJsonBody(req);
      const relationship = await dataModelService.addRelationship(projectId, payload, currentUser);
      sendJson(res, 201, { success: true, relationship });
    } catch (err) {
      sendError(res, err);
    }
    return true;
  }

  // 19. DELETE /api/v1/generation/projects/:projectId/data-model/relationships/:relationshipId (or /datamodel/...)
  const singleRelMatch = pathname.match(/^\/api\/v1\/generation\/projects\/([^/]+)\/(?:data-model|datamodel)\/relationships\/([^/]+)$/);
  if (req.method === 'DELETE' && singleRelMatch) {
    if (!requirePermission(PERMISSIONS.GENERATION_MANAGE)) return true;
    const projectId = decodeURIComponent(singleRelMatch[1]);
    const relationshipId = decodeURIComponent(singleRelMatch[2]);
    try {
      const result = await dataModelService.deleteRelationship(projectId, relationshipId, currentUser);
      sendJson(res, 200, result);
    } catch (err) {
      sendError(res, err);
    }
    return true;
  }

  // =========================================================================
  // GEN-05: RAP Architecture Designer Endpoints
  // =========================================================================

  // 20. POST /api/v1/generation/projects/:projectId/architecture/evaluate
  const archEvalMatch = pathname.match(/^\/api\/v1\/generation\/projects\/([^/]+)\/architecture\/evaluate$/);
  if (req.method === 'POST' && archEvalMatch) {
    if (!requirePermission(PERMISSIONS.GENERATION_MANAGE)) return true;
    const projectId = decodeURIComponent(archEvalMatch[1]);
    try {
      const payload = await readJsonBody(req);
      const result = await architectureService.evaluateArchitecture(projectId, payload, currentUser);
      sendJson(res, 200, result);
    } catch (err) {
      sendError(res, err);
    }
    return true;
  }

  // 21. GET /api/v1/generation/projects/:projectId/architecture
  const archGetMatch = pathname.match(/^\/api\/v1\/generation\/projects\/([^/]+)\/architecture$/);
  if (req.method === 'GET' && archGetMatch) {
    if (!requirePermission(PERMISSIONS.GENERATION_MANAGE)) return true;
    const projectId = decodeURIComponent(archGetMatch[1]);
    try {
      const result = await architectureService.getArchitecture(projectId, currentUser);
      sendJson(res, 200, result);
    } catch (err) {
      sendError(res, err);
    }
    return true;
  }

  // 22. PATCH/PUT /api/v1/generation/projects/:projectId/architecture
  if ((req.method === 'PATCH' || req.method === 'PUT') && archGetMatch) {
    if (!requirePermission(PERMISSIONS.GENERATION_MANAGE)) return true;
    const projectId = decodeURIComponent(archGetMatch[1]);
    try {
      const patch = await readJsonBody(req);
      const result = await architectureService.updateArchitecture(projectId, patch, currentUser);
      sendJson(res, 200, result);
    } catch (err) {
      sendError(res, err);
    }
    return true;
  }

  // =========================================================================
  // GEN-05: ABAP Generator Endpoints
  // =========================================================================

  // 23. POST /api/v1/generation/projects/:projectId/abap/generate
  const abapGenMatch = pathname.match(/^\/api\/v1\/generation\/projects\/([^/]+)\/abap\/generate$/);
  if (req.method === 'POST' && abapGenMatch) {
    if (!requirePermission(PERMISSIONS.GENERATION_MANAGE)) return true;
    const projectId = decodeURIComponent(abapGenMatch[1]);
    try {
      const payload = await readJsonBody(req);
      const result = await abapGeneratorEngine.generateAbapArtifacts(projectId, payload, currentUser);
      sendJson(res, 201, result);
    } catch (err) {
      sendError(res, err);
    }
    return true;
  }

  // 24. POST /api/v1/generation/projects/:projectId/abap/regenerate
  const abapRegenMatch = pathname.match(/^\/api\/v1\/generation\/projects\/([^/]+)\/abap\/regenerate$/);
  if (req.method === 'POST' && abapRegenMatch) {
    if (!requirePermission(PERMISSIONS.GENERATION_MANAGE)) return true;
    const projectId = decodeURIComponent(abapRegenMatch[1]);
    try {
      const payload = await readJsonBody(req);
      const result = await abapGeneratorEngine.generateAbapArtifacts(projectId, { ...payload, forceOverwrite: true }, currentUser);
      sendJson(res, 200, result);
    } catch (err) {
      sendError(res, err);
    }
    return true;
  }

  // 25. GET /api/v1/generation/projects/:projectId/abap/artifacts
  const abapArtsMatch = pathname.match(/^\/api\/v1\/generation\/projects\/([^/]+)\/abap\/artifacts$/);
  if (req.method === 'GET' && abapArtsMatch) {
    if (!requirePermission(PERMISSIONS.GENERATION_MANAGE)) return true;
    const projectId = decodeURIComponent(abapArtsMatch[1]);
    try {
      const project = await generationProjectService.getProject(projectId, currentUser);
      const arts = Object.values(project.artifactRegistry?.artifacts || {}).filter(
        (a) => a.language === 'ABAP' || a.artifactType.startsWith('RAP_') || a.artifactType.startsWith('CDS_') || a.artifactType === 'DDL_SOURCE' || a.objectName === 'README_ABAP'
      );
      sendJson(res, 200, { success: true, count: arts.length, artifacts: arts });
    } catch (err) {
      sendError(res, err);
    }
    return true;
  }

  // 26. GET /api/v1/generation/projects/:projectId/abap/artifacts/:artifactId
  const abapSingleArtMatch = pathname.match(/^\/api\/v1\/generation\/projects\/([^/]+)\/abap\/artifacts\/([^/]+)$/);
  if (req.method === 'GET' && abapSingleArtMatch) {
    if (!requirePermission(PERMISSIONS.GENERATION_MANAGE)) return true;
    const projectId = decodeURIComponent(abapSingleArtMatch[1]);
    const artifactId = decodeURIComponent(abapSingleArtMatch[2]);
    try {
      const project = await generationProjectService.getProject(projectId, currentUser);
      const artifact = project.artifactRegistry?.artifacts?.[artifactId];
      if (!artifact) {
        const err = new Error(`ABAP artifact "${artifactId}" not found.`);
        err.code = 'NOT_FOUND';
        throw err;
      }
      sendJson(res, 200, { success: true, artifact });
    } catch (err) {
      sendError(res, err);
    }
    return true;
  }

  // 27. PATCH/PUT /api/v1/generation/projects/:projectId/abap/artifacts/:artifactId
  if ((req.method === 'PATCH' || req.method === 'PUT') && abapSingleArtMatch) {
    if (!requirePermission(PERMISSIONS.GENERATION_MANAGE)) return true;
    const projectId = decodeURIComponent(abapSingleArtMatch[1]);
    const artifactId = decodeURIComponent(abapSingleArtMatch[2]);
    try {
      const payload = await readJsonBody(req);
      const project = await generationProjectService.getProject(projectId, currentUser);
      const editResult = ArtifactRegistry.applyManualEdit(project, artifactId, payload.content, currentUser?.name || 'ABAP Developer');
      await generationProjectService.updateProject(projectId, {
        artifactRegistry: project.artifactRegistry,
        author: currentUser?.name || 'ABAP Developer',
        activityAction: 'ARTIFACT_MANUAL_EDIT',
        activityDetails: { artifactId, status: editResult.manualEditStatus }
      }, currentUser);
      sendJson(res, 200, editResult);
    } catch (err) {
      sendError(res, err);
    }
    return true;
  }

  // =========================================================================
  // GEN-06: SAP Fiori Elements Generator Endpoints
  // =========================================================================

  // 28. POST /api/v1/generation/projects/:projectId/fiori/generate
  const fioriGenMatch = pathname.match(/^\/api\/v1\/generation\/projects\/([^/]+)\/fiori\/generate$/);
  if (req.method === 'POST' && fioriGenMatch) {
    if (!requirePermission(PERMISSIONS.GENERATION_MANAGE)) return true;
    const projectId = decodeURIComponent(fioriGenMatch[1]);
    try {
      const payload = await readJsonBody(req);
      const result = await fioriGeneratorEngine.generateFioriApplication(projectId, payload, currentUser);
      sendJson(res, 201, result);
    } catch (err) {
      sendError(res, err);
    }
    return true;
  }

  // 29. GET /api/v1/generation/projects/:projectId/fiori/config
  const fioriConfigMatch = pathname.match(/^\/api\/v1\/generation\/projects\/([^/]+)\/fiori\/config$/);
  if (req.method === 'GET' && fioriConfigMatch) {
    if (!requirePermission(PERMISSIONS.GENERATION_MANAGE)) return true;
    const projectId = decodeURIComponent(fioriConfigMatch[1]);
    try {
      const project = await generationProjectService.getProject(projectId, currentUser);
      sendJson(res, 200, { success: true, config: project.fioriConfig || {} });
    } catch (err) {
      sendError(res, err);
    }
    return true;
  }

  // 30. PATCH/PUT /api/v1/generation/projects/:projectId/fiori/config
  if ((req.method === 'PATCH' || req.method === 'PUT') && fioriConfigMatch) {
    if (!requirePermission(PERMISSIONS.GENERATION_MANAGE)) return true;
    const projectId = decodeURIComponent(fioriConfigMatch[1]);
    try {
      const patch = await readJsonBody(req);
      const project = await generationProjectService.getProject(projectId, currentUser);
      const updatedConfig = { ...(project.fioriConfig || {}), ...patch };
      await generationProjectService.updateProject(projectId, {
        fioriConfig: updatedConfig,
        author: currentUser?.name || 'UI Developer',
        activityAction: 'FIORI_CONFIG_UPDATED'
      }, currentUser);
      sendJson(res, 200, { success: true, config: updatedConfig });
    } catch (err) {
      sendError(res, err);
    }
    return true;
  }

  // 31. GET /api/v1/generation/projects/:projectId/fiori/artifacts
  const fioriArtsMatch = pathname.match(/^\/api\/v1\/generation\/projects\/([^/]+)\/fiori\/artifacts$/);
  if (req.method === 'GET' && fioriArtsMatch) {
    if (!requirePermission(PERMISSIONS.GENERATION_MANAGE)) return true;
    const projectId = decodeURIComponent(fioriArtsMatch[1]);
    try {
      const project = await generationProjectService.getProject(projectId, currentUser);
      const arts = Object.values(project.artifactRegistry?.artifacts || {}).filter(
        (a) => a.filePath.startsWith('webapp/') || a.filePath.includes('ui5.yaml') || a.objectName === 'README_FIORI' || a.filePath === 'package.json'
      );
      sendJson(res, 200, { success: true, count: arts.length, artifacts: arts });
    } catch (err) {
      sendError(res, err);
    }
    return true;
  }

  // 32. GET /api/v1/generation/projects/:projectId/fiori/artifacts/:artifactId
  const fioriSingleArtMatch = pathname.match(/^\/api\/v1\/generation\/projects\/([^/]+)\/fiori\/artifacts\/([^/]+)$/);
  if (req.method === 'GET' && fioriSingleArtMatch) {
    if (!requirePermission(PERMISSIONS.GENERATION_MANAGE)) return true;
    const projectId = decodeURIComponent(fioriSingleArtMatch[1]);
    const artifactId = decodeURIComponent(fioriSingleArtMatch[2]);
    try {
      const project = await generationProjectService.getProject(projectId, currentUser);
      const artifact = project.artifactRegistry?.artifacts?.[artifactId];
      if (!artifact) {
        const err = new Error(`Fiori artifact "${artifactId}" not found.`);
        err.code = 'NOT_FOUND';
        throw err;
      }
      sendJson(res, 200, { success: true, artifact });
    } catch (err) {
      sendError(res, err);
    }
    return true;
  }

  // 33. PATCH/PUT /api/v1/generation/projects/:projectId/fiori/artifacts/:artifactId
  if ((req.method === 'PATCH' || req.method === 'PUT') && fioriSingleArtMatch) {
    if (!requirePermission(PERMISSIONS.GENERATION_MANAGE)) return true;
    const projectId = decodeURIComponent(fioriSingleArtMatch[1]);
    const artifactId = decodeURIComponent(fioriSingleArtMatch[2]);
    try {
      const payload = await readJsonBody(req);
      const project = await generationProjectService.getProject(projectId, currentUser);
      const editResult = ArtifactRegistry.applyManualEdit(project, artifactId, payload.content, currentUser?.name || 'UI Developer');
      await generationProjectService.updateProject(projectId, {
        artifactRegistry: project.artifactRegistry,
        author: currentUser?.name || 'UI Developer',
        activityAction: 'ARTIFACT_MANUAL_EDIT',
        activityDetails: { artifactId, status: editResult.manualEditStatus }
      }, currentUser);
      sendJson(res, 200, editResult);
    } catch (err) {
      sendError(res, err);
    }
    return true;
  }

  // =========================================================================
  // SHARED: Artifact Registry, Generation Runs, Traceability & Validation
  // =========================================================================

  // 34. GET /api/v1/generation/projects/:projectId/artifacts
  const allArtsMatch = pathname.match(/^\/api\/v1\/generation\/projects\/([^/]+)\/artifacts$/);
  if (req.method === 'GET' && allArtsMatch) {
    if (!requirePermission(PERMISSIONS.GENERATION_MANAGE)) return true;
    const projectId = decodeURIComponent(allArtsMatch[1]);
    try {
      const project = await generationProjectService.getProject(projectId, currentUser);
      const arts = Object.values(project.artifactRegistry?.artifacts || {});
      sendJson(res, 200, {
        success: true,
        count: arts.length,
        version: project.artifactRegistry?.version || 1,
        artifacts: arts
      });
    } catch (err) {
      sendError(res, err);
    }
    return true;
  }

  // 35. GET /api/v1/generation/projects/:projectId/artifacts/:artifactId
  const singleArtMatch = pathname.match(/^\/api\/v1\/generation\/projects\/([^/]+)\/artifacts\/([^/]+)$/);
  if (req.method === 'GET' && singleArtMatch) {
    if (!requirePermission(PERMISSIONS.GENERATION_MANAGE)) return true;
    const projectId = decodeURIComponent(singleArtMatch[1]);
    const artifactId = decodeURIComponent(singleArtMatch[2]);
    try {
      const project = await generationProjectService.getProject(projectId, currentUser);
      const artifact = project.artifactRegistry?.artifacts?.[artifactId];
      if (!artifact) {
        const err = new Error(`Artifact "${artifactId}" not found.`);
        err.code = 'NOT_FOUND';
        throw err;
      }
      sendJson(res, 200, { success: true, artifact });
    } catch (err) {
      sendError(res, err);
    }
    return true;
  }

  // 36. PATCH/PUT /api/v1/generation/projects/:projectId/artifacts/:artifactId
  if ((req.method === 'PATCH' || req.method === 'PUT') && singleArtMatch) {
    if (!requirePermission(PERMISSIONS.GENERATION_MANAGE)) return true;
    const projectId = decodeURIComponent(singleArtMatch[1]);
    const artifactId = decodeURIComponent(singleArtMatch[2]);
    try {
      const payload = await readJsonBody(req);
      const project = await generationProjectService.getProject(projectId, currentUser);
      const editResult = ArtifactRegistry.applyManualEdit(project, artifactId, payload.content, currentUser?.name || 'Developer');
      await generationProjectService.updateProject(projectId, {
        artifactRegistry: project.artifactRegistry,
        author: currentUser?.name || 'Developer',
        activityAction: 'ARTIFACT_MANUAL_EDIT',
        activityDetails: { artifactId, status: editResult.manualEditStatus }
      }, currentUser);
      sendJson(res, 200, editResult);
    } catch (err) {
      sendError(res, err);
    }
    return true;
  }

  // 37. POST /api/v1/generation/projects/:projectId/artifacts/:artifactId/restore
  const restoreArtMatch = pathname.match(/^\/api\/v1\/generation\/projects\/([^/]+)\/artifacts\/([^/]+)\/restore$/);
  if (req.method === 'POST' && restoreArtMatch) {
    if (!requirePermission(PERMISSIONS.GENERATION_MANAGE)) return true;
    const projectId = decodeURIComponent(restoreArtMatch[1]);
    const artifactId = decodeURIComponent(restoreArtMatch[2]);
    try {
      const project = await generationProjectService.getProject(projectId, currentUser);
      const restoreResult = ArtifactRegistry.restoreToTemplate(project, artifactId);
      await generationProjectService.updateProject(projectId, {
        artifactRegistry: project.artifactRegistry,
        author: currentUser?.name || 'Developer',
        activityAction: 'ARTIFACT_RESTORED_TEMPLATE',
        activityDetails: { artifactId }
      }, currentUser);
      sendJson(res, 200, restoreResult);
    } catch (err) {
      sendError(res, err);
    }
    return true;
  }

  // 38. GET /api/v1/generation/projects/:projectId/generation-runs
  const runsMatch = pathname.match(/^\/api\/v1\/generation\/projects\/([^/]+)\/generation-runs$/);
  if (req.method === 'GET' && runsMatch) {
    if (!requirePermission(PERMISSIONS.GENERATION_MANAGE)) return true;
    const projectId = decodeURIComponent(runsMatch[1]);
    try {
      const project = await generationProjectService.getProject(projectId, currentUser);
      const runs = project.artifactRegistry?.generationRuns || [];
      sendJson(res, 200, { success: true, count: runs.length, generationRuns: runs });
    } catch (err) {
      sendError(res, err);
    }
    return true;
  }

  // 39. GET /api/v1/generation/projects/:projectId/traceability
  const traceMatch = pathname.match(/^\/api\/v1\/generation\/projects\/([^/]+)\/traceability$/);
  if (req.method === 'GET' && traceMatch) {
    if (!requirePermission(PERMISSIONS.GENERATION_MANAGE)) return true;
    const projectId = decodeURIComponent(traceMatch[1]);
    try {
      const project = await generationProjectService.getProject(projectId, currentUser);
      const reqs = project.requirementsSpec?.items || [];
      const artifacts = Object.values(project.artifactRegistry?.artifacts || {});
      const matrix = reqs.map((r) => {
        const mappedArts = artifacts.filter(
          (a) => Array.isArray(a.sourceRequirementIds) && a.sourceRequirementIds.includes(r.requirementId)
        );
        return {
          requirementId: r.requirementId,
          title: r.title,
          category: r.category,
          priority: r.priority,
          status: r.status,
          mappedArtifactsCount: mappedArts.length,
          mappedArtifacts: mappedArts.map((a) => ({
            artifactId: a.artifactId,
            objectName: a.objectName,
            artifactType: a.artifactType,
            filePath: a.filePath
          }))
        };
      });
      sendJson(res, 200, { success: true, count: matrix.length, traceabilityMatrix: matrix });
    } catch (err) {
      sendError(res, err);
    }
    return true;
  }

  // 40. POST /api/v1/generation/projects/:projectId/validate-generation
  const valGenMatch = pathname.match(/^\/api\/v1\/generation\/projects\/([^/]+)\/validate-generation$/);
  if (req.method === 'POST' && valGenMatch) {
    if (!requirePermission(PERMISSIONS.GENERATION_MANAGE)) return true;
    const projectId = decodeURIComponent(valGenMatch[1]);
    try {
      const project = await generationProjectService.getProject(projectId, currentUser);
      const report = staticValidationEngine.validateProject(project);
      await generationProjectService.updateProject(projectId, {
        validationReport: report,
        author: currentUser?.name || 'Validation Engine',
        activityAction: 'STATIC_VALIDATION_EXECUTED',
        activityDetails: { status: report.status, errors: report.errorsCount, warnings: report.warningsCount }
      }, currentUser);
      sendJson(res, 200, { success: true, validationReport: report });
    } catch (err) {
      sendError(res, err);
    }
    return true;
  }

  // 41. GET /api/v1/generation/toolchain/status
  if (req.method === 'GET' && pathname === '/api/v1/generation/toolchain/status') {
    if (!requirePermission(PERMISSIONS.GENERATION_MANAGE)) return true;
    try {
      const scan = await toolchainScanner.scanEnvironment();
      sendJson(res, 200, { success: true, toolchain: scan });
    } catch (err) {
      sendError(res, err);
    }
    return true;
  }

  // 42. GET /api/v1/generation/projects/:projectId/handover-guide
  const handoverMatch = pathname.match(/^\/api\/v1\/generation\/projects\/([^/]+)\/handover-guide$/);
  if (req.method === 'GET' && handoverMatch) {
    if (!requirePermission(PERMISSIONS.GENERATION_MANAGE)) return true;
    const projectId = decodeURIComponent(handoverMatch[1]);
    try {
      const project = await generationProjectService.getProject(projectId, currentUser);
      const guide = generateDeveloperHandoverGuide(project);
      sendJson(res, 200, { success: true, handoverGuide: guide });
    } catch (err) {
      sendError(res, err);
    }
    return true;
  }

  // 43. POST /api/v1/generation/projects/:projectId/preview/start
  const prevStartMatch = pathname.match(/^\/api\/v1\/generation\/projects\/([^/]+)\/preview\/start$/);
  if (req.method === 'POST' && prevStartMatch) {
    if (!requirePermission(PERMISSIONS.GENERATION_MANAGE)) return true;
    const projectId = decodeURIComponent(prevStartMatch[1]);
    try {
      const payload = await readJsonBody(req);
      const result = await previewManager.startPreview(projectId, payload, currentUser);
      sendJson(res, 200, { success: true, session: result.session || result });
    } catch (err) {
      sendError(res, err);
    }
    return true;
  }

  // 44. POST /api/v1/generation/projects/:projectId/preview/stop
  const prevStopMatch = pathname.match(/^\/api\/v1\/generation\/projects\/([^/]+)\/preview\/stop$/);
  if (req.method === 'POST' && prevStopMatch) {
    if (!requirePermission(PERMISSIONS.GENERATION_MANAGE)) return true;
    const projectId = decodeURIComponent(prevStopMatch[1]);
    try {
      const result = await previewManager.stopPreview(projectId, currentUser);
      sendJson(res, 200, { success: true, result });
    } catch (err) {
      sendError(res, err);
    }
    return true;
  }

  // 45. POST /api/v1/generation/projects/:projectId/preview/restart
  const prevRestartMatch = pathname.match(/^\/api\/v1\/generation\/projects\/([^/]+)\/preview\/restart$/);
  if (req.method === 'POST' && prevRestartMatch) {
    if (!requirePermission(PERMISSIONS.GENERATION_MANAGE)) return true;
    const projectId = decodeURIComponent(prevRestartMatch[1]);
    try {
      const payload = await readJsonBody(req);
      const result = await previewManager.restartPreview(projectId, payload, currentUser);
      sendJson(res, 200, { success: true, session: result.session || result });
    } catch (err) {
      sendError(res, err);
    }
    return true;
  }

  // 46. GET /api/v1/generation/projects/:projectId/preview/status
  const prevStatusMatch = pathname.match(/^\/api\/v1\/generation\/projects\/([^/]+)\/preview\/status$/);
  if (req.method === 'GET' && prevStatusMatch) {
    if (!requirePermission(PERMISSIONS.GENERATION_MANAGE)) return true;
    const projectId = decodeURIComponent(prevStatusMatch[1]);
    try {
      const status = await previewManager.getPreviewStatus(projectId, currentUser);
      sendJson(res, 200, { success: true, previewStatus: status });
    } catch (err) {
      sendError(res, err);
    }
    return true;
  }

  // 47. GET /api/v1/generation/projects/:projectId/preview/requests
  const prevReqMatch = pathname.match(/^\/api\/v1\/generation\/projects\/([^/]+)\/preview\/requests$/);
  if (req.method === 'GET' && prevReqMatch) {
    if (!requirePermission(PERMISSIONS.GENERATION_MANAGE)) return true;
    const projectId = decodeURIComponent(prevReqMatch[1]);
    try {
      const result = await previewManager.getPreviewRequests(projectId, currentUser);
      const reqList = Array.isArray(result) ? result : (result?.requests || []);
      sendJson(res, 200, { success: true, count: reqList.length, requests: reqList });
    } catch (err) {
      sendError(res, err);
    }
    return true;
  }

  // 48. POST /api/v1/generation/projects/:projectId/preview/synthetic-data/reset
  const prevResetMatch = pathname.match(/^\/api\/v1\/generation\/projects\/([^/]+)\/preview\/synthetic-data\/reset$/);
  if (req.method === 'POST' && prevResetMatch) {
    if (!requirePermission(PERMISSIONS.GENERATION_MANAGE)) return true;
    const projectId = decodeURIComponent(prevResetMatch[1]);
    try {
      const result = await previewManager.resetSyntheticData(projectId, currentUser);
      sendJson(res, 200, { success: true, result });
    } catch (err) {
      sendError(res, err);
    }
    return true;
  }

  // 49. GET /api/v1/generation/projects/:projectId/review/readiness
  const reviewReadinessMatch = pathname.match(/^\/api\/v1\/generation\/projects\/([^/]+)\/review\/readiness$/);
  if (req.method === 'GET' && reviewReadinessMatch) {
    if (!requirePermission(PERMISSIONS.GENERATION_MANAGE)) return true;
    const projectId = decodeURIComponent(reviewReadinessMatch[1]);
    try {
      const ack = url.searchParams.get('acknowledgedWarnings') === 'true';
      const readiness = await exportManager.validateExportReadiness(projectId, currentUser, { acknowledgedWarnings: ack });
      sendJson(res, 200, { success: true, readiness });
    } catch (err) {
      sendError(res, err);
    }
    return true;
  }

  // 50. GET /api/v1/generation/projects/:projectId/traceability-matrix
  const fullTraceMatch = pathname.match(/^\/api\/v1\/generation\/projects\/([^/]+)\/traceability-matrix$/);
  if (req.method === 'GET' && fullTraceMatch) {
    if (!requirePermission(PERMISSIONS.GENERATION_MANAGE)) return true;
    const projectId = decodeURIComponent(fullTraceMatch[1]);
    try {
      const project = await generationProjectService.getProject(projectId, currentUser);
      const matrixReport = buildTraceabilityMatrix(project);
      sendJson(res, 200, { success: true, report: matrixReport });
    } catch (err) {
      sendError(res, err);
    }
    return true;
  }

  // 51. POST /api/v1/generation/projects/:projectId/export
  const exportMatch = pathname.match(/^\/api\/v1\/generation\/projects\/([^/]+)\/export$/);
  if (req.method === 'POST' && exportMatch) {
    if (!requirePermission(PERMISSIONS.GENERATION_MANAGE)) return true;
    const projectId = decodeURIComponent(exportMatch[1]);
    try {
      const body = await readJsonBody(req);
      const exportResult = await exportManager.packageExport(projectId, currentUser, body);
      sendJson(res, 200, {
        success: true,
        exportId: exportResult.exportId,
        filename: exportResult.filename,
        sizeBytes: exportResult.sizeBytes,
        zipSha256: exportResult.zipSha256,
        manifest: exportResult.manifest,
        downloadUrl: `/api/v1/generation/projects/${encodeURIComponent(projectId)}/exports/${encodeURIComponent(exportResult.filename)}/download`
      });
    } catch (err) {
      sendError(res, err);
    }
    return true;
  }

  // 52. GET /api/v1/generation/projects/:projectId/exports/:filename/download
  const downloadMatch = pathname.match(/^\/api\/v1\/generation\/projects\/([^/]+)\/exports\/([^/]+)\/download$/);
  if (req.method === 'GET' && downloadMatch) {
    if (!requirePermission(PERMISSIONS.GENERATION_MANAGE)) return true;
    const projectId = decodeURIComponent(downloadMatch[1]);
    const filename = decodeURIComponent(downloadMatch[2]);
    try {
      const zipBuffer = await exportManager.getExportZip(projectId, filename, currentUser);
      res.writeHead(200, {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': zipBuffer.length
      });
      res.end(zipBuffer);
    } catch (err) {
      sendError(res, err);
    }
    return true;
  }

  // Route not handled by this router
  return false;
}
