/**
 * Fiorify — Deployment Repository (Sprint 11)
 *
 * Persists deployment plans, cryptographic approvals, and execution records in PostgreSQL
 * with transparent in-memory fallback for test isolation.
 */

import DatabasePool from '../pool.js';

export class DeploymentRepository {
  constructor(pool = DatabasePool) {
    this.pool = pool;
    this.inMemoryPlans = new Map();
    this.inMemoryApprovals = [];
    this.inMemoryExecutions = new Map();
  }

  async _getClient() {
    if (!this.pool) return null;
    try {
      if (typeof this.pool.getClient === 'function') {
        return await this.pool.getClient();
      }
      if (typeof this.pool.connect === 'function') {
        return await this.pool.connect();
      }
    } catch {
      return null;
    }
    return null;
  }

  async createDeploymentPlan(plan, tenantId = 'DEFAULT-TENANT-S21') {
    const client = await this._getClient();
    if (!client) {
      this.inMemoryPlans.set(plan.id, { ...plan, tenantId });
      return plan;
    }

    try {
      await client.query(`
        INSERT INTO deployment_plans (
          id, project_id, tenant_id, target_system, target_client,
          target_package, target_namespace, transport_request,
          specification_version, generation_version, plan_hash,
          artifact_manifest_hash, status, plan_details, created_by, created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5,
          $6, $7, $8,
          $9, $10, $11,
          $12, $13, $14, $15, $16, $17
        )
        ON CONFLICT (id) DO UPDATE SET
          status = EXCLUDED.status,
          plan_details = EXCLUDED.plan_details,
          updated_at = CURRENT_TIMESTAMP;
      `, [
        plan.id,
        plan.projectId,
        tenantId,
        plan.targetSystem || 'S21',
        plan.targetClient || '200',
        plan.targetPackage || '$TMP',
        plan.targetNamespace || 'Z',
        plan.transportRequest || null,
        plan.specificationVersion || 1,
        plan.generationVersion || 1,
        plan.planHash,
        plan.artifactManifestHash,
        plan.status || 'PLANNED',
        JSON.stringify(plan.planDetails || {}),
        plan.createdBy || 'Lead SAP Architect',
        plan.createdAt ? new Date(plan.createdAt) : new Date(),
        new Date()
      ]);
      return plan;
    } finally {
      if (client && typeof client.release === 'function') client.release();
    }
  }

  async getDeploymentPlan(planId, tenantId = 'DEFAULT-TENANT-S21') {
    const client = await this._getClient();
    if (!client) {
      const p = this.inMemoryPlans.get(planId);
      return (p && (!tenantId || p.tenantId === tenantId)) ? p : null;
    }

    try {
      const res = await client.query(`
        SELECT * FROM deployment_plans WHERE id = $1 AND tenant_id = $2;
      `, [planId, tenantId]);
      if (res.rowCount === 0) return null;
      const row = res.rows[0];
      return {
        id: row.id,
        projectId: row.project_id,
        tenantId: row.tenant_id,
        targetSystem: row.target_system,
        targetClient: row.target_client,
        targetPackage: row.target_package,
        targetNamespace: row.target_namespace,
        transportRequest: row.transport_request,
        specificationVersion: row.specification_version,
        generationVersion: row.generation_version,
        planHash: row.plan_hash,
        artifactManifestHash: row.artifact_manifest_hash,
        status: row.status,
        planDetails: row.plan_details,
        createdBy: row.created_by,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      };
    } finally {
      if (client && typeof client.release === 'function') client.release();
    }
  }

  async createApproval(approval, tenantId = 'DEFAULT-TENANT-S21') {
    const client = await this._getClient();
    if (!client) {
      this.inMemoryApprovals.push({ ...approval, tenantId });
      return approval;
    }

    try {
      await client.query(`
        INSERT INTO deployment_approvals (
          plan_id, project_id, tenant_id, decision, approver,
          approver_role, plan_hash, artifact_manifest_hash,
          signature_hash, approved_at, expires_at, comments
        ) VALUES (
          $1, $2, $3, $4, $5,
          $6, $7, $8,
          $9, $10, $11, $12
        );
      `, [
        approval.planId,
        approval.projectId,
        tenantId,
        approval.decision || 'APPROVED',
        approval.approver,
        approval.approverRole || 'CHIEF_ARCHITECT',
        approval.planHash,
        approval.artifactManifestHash,
        approval.signatureHash,
        approval.approvedAt ? new Date(approval.approvedAt) : new Date(),
        approval.expiresAt ? new Date(approval.expiresAt) : new Date(Date.now() + 86400000),
        approval.comments || ''
      ]);
      return approval;
    } finally {
      if (client && typeof client.release === 'function') client.release();
    }
  }

  async getLatestApproval(planId, tenantId = 'DEFAULT-TENANT-S21') {
    const client = await this._getClient();
    if (!client) {
      const matches = this.inMemoryApprovals.filter(a => a.planId === planId && (!tenantId || a.tenantId === tenantId));
      return matches.length > 0 ? matches[matches.length - 1] : null;
    }

    try {
      const res = await client.query(`
        SELECT * FROM deployment_approvals
        WHERE plan_id = $1 AND tenant_id = $2
        ORDER BY approved_at DESC LIMIT 1;
      `, [planId, tenantId]);
      if (res.rowCount === 0) return null;
      const row = res.rows[0];
      return {
        id: row.id,
        planId: row.plan_id,
        projectId: row.project_id,
        tenantId: row.tenant_id,
        decision: row.decision,
        approver: row.approver,
        approverRole: row.approver_role,
        planHash: row.plan_hash,
        artifactManifestHash: row.artifact_manifest_hash,
        signatureHash: row.signature_hash,
        approvedAt: row.approved_at,
        expiresAt: row.expires_at,
        comments: row.comments
      };
    } finally {
      if (client && typeof client.release === 'function') client.release();
    }
  }

  async createExecution(execution, tenantId = 'DEFAULT-TENANT-S21') {
    const client = await this._getClient();
    if (!client) {
      this.inMemoryExecutions.set(execution.id, { ...execution, tenantId });
      return execution;
    }

    try {
      await client.query(`
        INSERT INTO deployment_executions (
          id, plan_id, project_id, tenant_id, idempotency_key,
          lifecycle_status, execution_boundary_status, operations,
          logs, verification_results, started_at, completed_at, error_message
        ) VALUES (
          $1, $2, $3, $4, $5,
          $6, $7, $8,
          $9, $10, $11, $12, $13
        );
      `, [
        execution.id,
        execution.planId,
        execution.projectId,
        tenantId,
        execution.idempotencyKey || null,
        execution.lifecycleStatus || 'STOPPED_AT_WRITE_BOUNDARY',
        execution.executionBoundaryStatus || 'STOPPED_AT_WRITE_BOUNDARY',
        JSON.stringify(execution.operations || []),
        JSON.stringify(execution.logs || []),
        JSON.stringify(execution.verificationResults || {}),
        execution.startedAt ? new Date(execution.startedAt) : new Date(),
        execution.completedAt ? new Date(execution.completedAt) : null,
        execution.errorMessage || null
      ]);
      return execution;
    } finally {
      if (client && typeof client.release === 'function') client.release();
    }
  }

  async getExecution(executionId, tenantId = 'DEFAULT-TENANT-S21') {
    const client = await this._getClient();
    if (!client) {
      const e = this.inMemoryExecutions.get(executionId);
      return (e && (!tenantId || e.tenantId === tenantId)) ? e : null;
    }

    try {
      const res = await client.query(`
        SELECT * FROM deployment_executions WHERE id = $1 AND tenant_id = $2;
      `, [executionId, tenantId]);
      if (res.rowCount === 0) return null;
      const row = res.rows[0];
      return {
        id: row.id,
        planId: row.plan_id,
        projectId: row.project_id,
        tenantId: row.tenant_id,
        idempotencyKey: row.idempotency_key,
        lifecycleStatus: row.lifecycle_status,
        executionBoundaryStatus: row.execution_boundary_status,
        operations: row.operations,
        logs: row.logs,
        verificationResults: row.verification_results,
        startedAt: row.started_at,
        completedAt: row.completed_at,
        errorMessage: row.error_message
      };
    } finally {
      if (client && typeof client.release === 'function') client.release();
    }
  }
}

export const defaultDeploymentRepository = new DeploymentRepository();
