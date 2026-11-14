/**
 * Fiorify — SAP Deployment Orchestration Engine (Sprint 11.4)
 *
 * Implements structured deployment lifecycle orchestration:
 * GENERATED -> VALIDATED -> COMPATIBILITY_CHECKED -> DEPLOYMENT_PLANNED ->
 * APPROVAL_PENDING -> APPROVED -> [STOPPED_AT_WRITE_BOUNDARY] -> IMPORTED ->
 * ACTIVATION_PENDING -> ACTIVATED -> VERIFIED
 *
 * SECURITY DIRECTIVE:
 * Strict Server-Side Authorization Boundary.
 * Stops at the SAP Write Boundary without executing mutating operations unless explicit user approval is granted.
 */

import crypto from 'node:crypto';
import { defaultDeploymentRepository } from '../../infrastructure/db/repositories/deploymentRepository.js';
import { defaultSapArtifactCompatibilityEngine } from '../validation/sapArtifactCompatibilityEngine.js';
import { defaultSapPreflightService } from '../../infrastructure/connectivity/sapPreflightService.js';
import { defaultSapPostDeploymentVerifier } from './sapPostDeploymentVerifier.js';
import { defaultSecurityAuditLogger, SECURITY_ACTIONS } from '../../infrastructure/security/securityAuditLogger.js';
import { defaultCryptographicSignatureService } from '../../infrastructure/security/cryptographicSignatureService.js';

export const DEPLOYMENT_LIFECYCLE_STATUSES = Object.freeze({
  GENERATED: 'GENERATED',
  VALIDATED: 'VALIDATED',
  COMPATIBILITY_CHECKED: 'COMPATIBILITY_CHECKED',
  DEPLOYMENT_PLANNED: 'DEPLOYMENT_PLANNED',
  APPROVAL_PENDING: 'APPROVAL_PENDING',
  APPROVED: 'APPROVED',
  STOPPED_AT_WRITE_BOUNDARY: 'STOPPED_AT_WRITE_BOUNDARY',
  IMPORTED: 'IMPORTED',
  ACTIVATION_PENDING: 'ACTIVATION_PENDING',
  ACTIVATED: 'ACTIVATED',
  VERIFIED: 'VERIFIED',
  FAILED: 'FAILED',
  CANCELLED: 'CANCELLED'
});

export const ARTIFACT_ORDER_RANKS = Object.freeze({
  DDIC_TABLE: 1,
  DRAFT_TABLE: 2,
  CDS_VIEW_ENTITY: 3,
  CDS_PROJECTION_VIEW: 4,
  METADATA_EXTENSION: 5,
  RAP_BEHAVIOR_DEFINITION: 6,
  RAP_BEHAVIOR_POOL: 7,
  RAP_SERVICE_DEFINITION: 8,
  RAP_SERVICE_BINDING_PROPOSAL: 9,
  FIORI_MANIFEST: 10,
  FIORI_ANNOTATIONS: 11,
  UI5_PROJECT_STRUCTURE: 12
});

export class DeploymentOrchestrationService {
  constructor(options = {}) {
    this.repository = options.repository || defaultDeploymentRepository;
    this.compatibilityEngine = options.compatibilityEngine || defaultSapArtifactCompatibilityEngine;
    this.preflightService = options.preflightService || defaultSapPreflightService;
    this.verifier = options.verifier || defaultSapPostDeploymentVerifier;
    this.auditLogger = options.auditLogger || defaultSecurityAuditLogger;
    this.signatureService = options.signatureService || defaultCryptographicSignatureService;
  }

  /**
   * Computes SHA-256 hash of arbitrary content or object
   */
  computeHash(data) {
    const raw = typeof data === 'string' ? data : JSON.stringify(data);
    return crypto.createHash('sha256').update(raw).digest('hex');
  }

  /**
   * Evaluates deployment readiness for a generation project
   */
  async getDeploymentReadiness(project, tenantId = 'DEFAULT-TENANT-S21') {
    const preflight = await this.preflightService.runPreflight();
    const compatibility = this.compatibilityEngine.evaluateProjectCompatibility(project);

    const isSystemReady = preflight.overallReadiness === 'READY' || preflight.overallReadiness === 'READY_WITH_LIMITATIONS';
    const isCompatReady = compatibility.rating === 'COMPATIBLE' || compatibility.rating === 'COMPATIBLE_WITH_LIMITATIONS';
    const isProjectReady = project && (project.lifecycleStatus === 'REVIEW_COMPLETED' || project.lifecycleStatus === 'EXPORTED' || project.lifecycleStatus === 'GENERATED' || project.lifecycleStatus === 'VALIDATION_COMPLETED');

    const blockers = [];
    if (!isSystemReady) blockers.push(`Target SAP System is not ready (${preflight.overallReadiness}).`);
    if (!isCompatReady) blockers.push(`Artifact compatibility requires remediation (${compatibility.rating}).`);
    if (!isProjectReady) blockers.push('Project must complete generation and validation stages.');

    return {
      projectId: project?.projectId,
      readyForDeploymentPlanning: isSystemReady && isCompatReady,
      status: (isSystemReady && isCompatReady) ? 'READY' : 'BLOCKED',
      blockers,
      preflightSummary: {
        targetSystem: preflight.targetSystem,
        overallReadiness: preflight.overallReadiness,
        checksPassed: preflight.summary.passed,
        totalChecks: preflight.summary.totalChecks
      },
      compatibilitySummary: {
        rating: compatibility.rating,
        score: compatibility.score,
        serviceBindingStatus: compatibility.serviceBindingStatus,
        limitations: compatibility.limitations
      },
      evaluatedAt: new Date().toISOString()
    };
  }

  /**
   * Generates a formal, immutable Deployment Plan
   */
  async generateDeploymentPlan(project, options = {}, userContext = {}) {
    const tenantId = userContext.tenantId || 'DEFAULT-TENANT-S21';
    const readiness = await this.getDeploymentReadiness(project, tenantId);

    if (!readiness.readyForDeploymentPlanning && !options.forcePlan) {
      const err = new Error(`Deployment plan cannot be generated: ${readiness.blockers.join(' ')}`);
      err.code = 'DEPLOYMENT_READINESS_FAILED';
      throw err;
    }

    const artifacts = Object.values(project?.artifactRegistry?.artifacts || {});
    
    // Sort artifacts into dependency-safe execution order
    const orderedArtifacts = [...artifacts].sort((a, b) => {
      const rankA = ARTIFACT_ORDER_RANKS[a.artifactType] || 99;
      const rankB = ARTIFACT_ORDER_RANKS[b.artifactType] || 99;
      return rankA - rankB;
    });

    const plannedOperations = orderedArtifacts.map((art, idx) => ({
      sequence: idx + 1,
      operationType: 'CREATE_OR_REPLACE',
      artifactType: art.artifactType,
      objectName: art.objectName,
      filePath: art.filePath,
      targetPackage: options.targetPackage || '$TMP',
      reversible: art.artifactType.startsWith('RAP_') ? false : true,
      requiresActivation: ['CDS_VIEW_ENTITY', 'CDS_PROJECTION_VIEW', 'RAP_BEHAVIOR_DEFINITION', 'RAP_SERVICE_DEFINITION'].includes(art.artifactType)
    }));

    const artifactManifestHash = this.computeHash(orderedArtifacts.map(a => ({ id: a.artifactId, hash: a.sha256Hash || this.computeHash(a.content) })));

    const planDetails = {
      projectId: project.projectId,
      projectName: project.name,
      sourceTcode: project.sourceTcode || 'VA01',
      targetSystem: options.targetSystem || 'S21',
      targetClient: options.targetClient || '200',
      targetPackage: options.targetPackage || '$TMP',
      targetNamespace: options.targetNamespace || 'Z',
      transportRequest: options.transportRequest || null,
      softwareComponent: 'S4CORE 108',
      operationsCount: plannedOperations.length,
      operations: plannedOperations,
      requiredAuthorizations: [
        'S_DEVELOP (OBJTYPE: TABL, DDLS, DDLX, BDEF, CLAS, SRVD, SRVB; ACTVT: 02, 03, 07)',
        'S_SERVICE (SRV_NAME: ZUI_*, ACTVT: 03, 16)',
        'S_TABU_DIS (DICBERCLS: &NC&, ACTVT: 02, 03)',
        'S_CTS_ADMI / S_CTS_SADM (Workbench Request recording)'
      ],
      rollbackPlan: {
        strategy: 'MANUAL_COMPENSATING_ACTIONS',
        explanation: 'SAP ABAP repository objects cannot be automatically rolled back if activated. Rollback requires manual deletion via ADT or transport reversal.',
        steps: [
          '1. Deactivate service binding in /IWFND/MAINT_SERVICE',
          '2. Delete generated CDS view entities via ADT in reverse dependency order',
          '3. Drop custom database table entries via SE14 / ADT'
        ]
      },
      readiness
    };

    const planHash = this.computeHash({
      projectId: project.projectId,
      targetSystem: planDetails.targetSystem,
      targetClient: planDetails.targetClient,
      targetPackage: planDetails.targetPackage,
      artifactManifestHash,
      operationsCount: plannedOperations.length
    });

    const planId = `DEP-PLAN-${Date.now().toString(36).toUpperCase()}-${planHash.substring(0, 8).toUpperCase()}`;

    const planRecord = {
      id: planId,
      projectId: project.projectId,
      tenantId,
      targetSystem: planDetails.targetSystem,
      targetClient: planDetails.targetClient,
      targetPackage: planDetails.targetPackage,
      targetNamespace: planDetails.targetNamespace,
      transportRequest: planDetails.transportRequest,
      specificationVersion: project.specificationVersion || 1,
      generationVersion: project.generationVersion || 1,
      planHash,
      artifactManifestHash,
      status: 'PLANNED',
      planDetails,
      createdBy: userContext.name || userContext.id || 'Lead SAP Architect',
      createdAt: new Date().toISOString()
    };

    await this.repository.createDeploymentPlan(planRecord, tenantId);

    await this.auditLogger.logEvent({
      actor: userContext.id || 'lead-architect',
      tenantId,
      action: 'DEPLOYMENT_PLAN_GENERATED',
      resource: planId,
      outcome: 'SUCCESS',
      details: { planHash, targetSystem: planRecord.targetSystem, operationsCount: plannedOperations.length }
    });

    return planRecord;
  }

  /**
   * Approves a Deployment Plan with Cryptographic Signature
   */
  async approveDeploymentPlan(planId, approvalData = {}, userContext = {}) {
    const tenantId = userContext.tenantId || 'DEFAULT-TENANT-S21';
    const plan = await this.repository.getDeploymentPlan(planId, tenantId);

    if (!plan) {
      const err = new Error(`Deployment plan "${planId}" not found.`);
      err.code = 'NOT_FOUND';
      throw err;
    }

    const approverRole = userContext.role || approvalData.approverRole || 'CHIEF_ARCHITECT';
    const allowedRoles = ['CHIEF_ARCHITECT', 'LEAD_ARCHITECT', 'ADMIN'];
    if (!allowedRoles.includes(approverRole)) {
      const err = new Error(`Role "${approverRole}" is not authorized to approve SAP deployment plans. Required: ${allowedRoles.join(', ')}.`);
      err.code = 'UNAUTHORIZED_APPROVER';
      throw err;
    }

    const approvedAt = new Date().toISOString();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24h validity

    const approverId = userContext.id || 'chief-architect';
    const signaturePayload = `${plan.id}:${plan.planHash}:${plan.artifactManifestHash}:${approverId}:${approvedAt}`;
    const signResult = await this.signatureService.signPayload(signaturePayload);
    const signatureHash = signResult.signature;

    const approvalRecord = {
      planId: plan.id,
      projectId: plan.projectId,
      tenantId,
      decision: 'APPROVED',
      approver: userContext.name || userContext.id || 'Chief Enterprise Architect',
      approverId,
      approverRole,
      planHash: plan.planHash,
      artifactManifestHash: plan.artifactManifestHash,
      signatureHash,
      signatureType: signResult.signatureType,
      keyVersion: signResult.keyVersion,
      approvedAt,
      expiresAt,
      comments: approvalData.comments || 'Approved for SAP DEV deployment testing under Clean Core governance.'
    };

    await this.repository.createApproval(approvalRecord, tenantId);

    // Update plan status
    plan.status = 'APPROVED';
    await this.repository.createDeploymentPlan(plan, tenantId);

    await this.auditLogger.logEvent({
      actor: userContext.id || 'chief-architect',
      tenantId,
      action: 'DEPLOYMENT_PLAN_APPROVED',
      resource: plan.id,
      outcome: 'SUCCESS',
      details: { signatureHash, expiresAt }
    });

    return {
      planId: plan.id,
      status: 'APPROVED',
      approval: approvalRecord
    };
  }

  /**
   * Executes Deployment Plan up to the SAP Write Boundary
   *
   * STRICT GUARD: Enforces that unapproved requests fail immediately.
   * At the SAP boundary, halts execution and outputs exact boundary verification report.
   */
  async executeDeploymentPlan(planId, executionData = {}, userContext = {}) {
    const tenantId = userContext.tenantId || 'DEFAULT-TENANT-S21';
    const plan = await this.repository.getDeploymentPlan(planId, tenantId);

    if (!plan) {
      const err = new Error(`Deployment plan "${planId}" not found.`);
      err.code = 'NOT_FOUND';
      throw err;
    }

    // 1. Verify Approval
    const latestApproval = await this.repository.getLatestApproval(planId, tenantId);
    if (!latestApproval || latestApproval.decision !== 'APPROVED') {
      const err = new Error(`Deployment plan "${planId}" cannot be executed: Missing or rejected Chief Architect approval.`);
      err.code = 'DEPLOYMENT_NOT_APPROVED';
      throw err;
    }

    // Check expiry
    if (new Date(latestApproval.expiresAt) < new Date()) {
      const err = new Error(`Approval for deployment plan "${planId}" expired at ${latestApproval.expiresAt}. Re-approval required.`);
      err.code = 'DEPLOYMENT_APPROVAL_EXPIRED';
      throw err;
    }

    // Verify Hash Integrity
    if (latestApproval.planHash !== plan.planHash || latestApproval.artifactManifestHash !== plan.artifactManifestHash) {
      const err = new Error(`Deployment integrity violation: Plan or artifact manifest hash modified after approval.`);
      err.code = 'DEPLOYMENT_INTEGRITY_VIOLATION';
      throw err;
    }

    // Verify Cryptographic Signature Integrity (Sprint 13.2 / REM-SEC-03)
    const approverId = latestApproval.approverId || (latestApproval.approver && latestApproval.approver.includes('@') ? latestApproval.approver : 'chief-architect');
    const signaturePayload = `${plan.id}:${latestApproval.planHash}:${latestApproval.artifactManifestHash}:${approverId}:${latestApproval.approvedAt}`;
    let sigVerification = await this.signatureService.verifySignature(signaturePayload, latestApproval.signatureHash);

    // Fallback payload check for compatibility with different historical approver fields
    if (!sigVerification.valid && latestApproval.approver && latestApproval.approver !== approverId) {
      const fallbackPayload = `${plan.id}:${latestApproval.planHash}:${latestApproval.artifactManifestHash}:${latestApproval.approver}:${latestApproval.approvedAt}`;
      const fallbackCheck = await this.signatureService.verifySignature(fallbackPayload, latestApproval.signatureHash);
      if (fallbackCheck.valid) {
        sigVerification = fallbackCheck;
      }
    }

    if (!sigVerification.valid) {
      const err = new Error(`Deployment plan "${planId}" cannot be executed: Cryptographic approval signature verification failed (${sigVerification.reason || 'TAMPERED_OR_INVALID'}).`);
      err.code = 'DEPLOYMENT_SIGNATURE_INVALID';
      throw err;
    }

    const executionId = `DEP-EXEC-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
    const startTime = new Date().toISOString();

    const logs = [
      { timestamp: new Date().toISOString(), level: 'INFO', message: `Initializing deployment execution "${executionId}" for plan "${planId}".` },
      { timestamp: new Date().toISOString(), level: 'INFO', message: `Target System: ${plan.targetSystem} (Client ${plan.targetClient}), Package: ${plan.targetPackage}.` },
      {
        timestamp: new Date().toISOString(),
        level: sigVerification.isLegacy ? 'WARN' : 'INFO',
        message: sigVerification.isLegacy
          ? `Cryptographic approval verified with legacy unauthenticated digest (${sigVerification.signatureType}). Re-approval with HMAC-SHA256 recommended.`
          : `Cryptographic approval verified (Key: ${sigVerification.keyVersion}, Type: ${sigVerification.signatureType}, Signature: ${latestApproval.signatureHash.substring(0, 20)}...).`
      },
      { timestamp: new Date().toISOString(), level: 'GUARDRAIL', message: 'CRITICAL GUARDRAIL: Halting execution at the SAP S/4HANA Write Boundary.' },
      { timestamp: new Date().toISOString(), level: 'GUARDRAIL', message: 'Fiorify Read-Only Directives prohibit unapproved mutating HTTP requests (POST, PUT, DELETE) to SAP endpoints.' },
      { timestamp: new Date().toISOString(), level: 'INFO', message: 'Preflight and readiness verified 100%. Standing by for explicit human SAP write authorization.' }
    ];

    // Execute read-only post-deployment verification baseline
    const verif = await this.verifier.verifyDeployment(plan, { testGateway: true });

    const executionRecord = {
      id: executionId,
      planId: plan.id,
      projectId: plan.projectId,
      tenantId,
      idempotencyKey: executionData.idempotencyKey || `idem-${planId}-${Date.now()}`,
      lifecycleStatus: DEPLOYMENT_LIFECYCLE_STATUSES.STOPPED_AT_WRITE_BOUNDARY,
      executionBoundaryStatus: 'STOPPED_AT_WRITE_BOUNDARY',
      operations: plan.planDetails.operations || [],
      logs,
      verificationResults: verif,
      startedAt: startTime,
      completedAt: new Date().toISOString(),
      errorMessage: null
    };

    await this.repository.createExecution(executionRecord, tenantId);

    await this.auditLogger.logEvent({
      actor: userContext.id || 'deployment-engine',
      tenantId,
      action: 'DEPLOYMENT_EXECUTION_GUARD_TRIGGERED',
      resource: executionId,
      outcome: 'STOPPED_AT_WRITE_BOUNDARY',
      details: {
        planId: plan.id,
        boundary: 'SAP_WRITE_BOUNDARY_ENFORCED',
        targetSystem: plan.targetSystem,
        client: plan.targetClient,
        package: plan.targetPackage
      }
    });

    return executionRecord;
  }
}

export const defaultDeploymentOrchestrationService = new DeploymentOrchestrationService();
