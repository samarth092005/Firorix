/**
 * Fiorify — Specification Versioning & Review Service (S7)
 *
 * Implements:
 * - Version snapshotting of complete specification bundles
 * - Version comparison / diff calculations
 * - Chief Architect review & approval governance with signature hashing
 * - PostgreSQL persistence in project_specification_versions & project_specification_approvals
 */

import crypto from 'node:crypto';
import DatabasePool from '../../infrastructure/db/pool.js';
import { defaultGenerationReadinessEngine, SPEC_READINESS_STATUSES } from './generationReadinessEngine.js';
import { defaultCryptographicSignatureService } from '../../infrastructure/security/cryptographicSignatureService.js';

export class SpecificationVersioningService {
  constructor(pool = DatabasePool, readinessEngine = defaultGenerationReadinessEngine, signatureService = defaultCryptographicSignatureService) {
    this.pool = pool;
    this.readinessEngine = readinessEngine;
    this.signatureService = signatureService;
  }

  async _getClient() {
    if (typeof this.pool.getClient === 'function') {
      return await this.pool.getClient();
    }
    return await this.pool.connect();
  }

  /**
   * Captures an immutable version snapshot of the current project specification.
   */
  async createVersionSnapshot(project, user, changelog = 'Specification update') {
    if (!project || !project.projectId) {
      throw new Error('Valid project record is required to create a version snapshot.');
    }

    const client = await this._getClient();
    try {
      await client.query('BEGIN;');

      // Determine next version number
      const verRes = await client.query(
        'SELECT COALESCE(MAX(version_number), 0) + 1 AS next_ver FROM project_specification_versions WHERE project_id = $1;',
        [project.projectId]
      );
      const nextVersion = verRes.rows[0].next_ver;

      const snapshot = {
        projectId: project.projectId,
        version: nextVersion,
        timestamp: new Date().toISOString(),
        metadata: {
          projectName: project.projectName,
          description: project.description,
          targetRelease: project.targetRelease,
          modernizationOutcome: project.modernizationOutcome || 'BUILD'
        },
        requirements: project.requirementsSpec || {},
        dataModel: project.dataModelSpec || {},
        architecture: project.architectureSpec || {},
        odataContract: project.odataContractSpec || {},
        fioriUI: project.fioriSpec || {},
        traceability: project.traceabilityMatrix || {},
        readiness: this.readinessEngine.evaluateReadiness(project)
      };

      await client.query(
        `INSERT INTO project_specification_versions (
          project_id, version_number, version_tag, status, snapshot, changelog, created_by, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP);`,
        [
          project.projectId,
          nextVersion,
          `v${nextVersion}.0`,
          'DRAFT',
          JSON.stringify(snapshot),
          changelog,
          user?.name || user?.username || 'Lead SAP Architect'
        ]
      );

      // Update project's current specification version
      await client.query(
        'UPDATE generation_projects SET specification_version = $1, updated_at = CURRENT_TIMESTAMP WHERE project_id = $2;',
        [nextVersion, project.projectId]
      );

      await client.query('COMMIT;');

      return {
        success: true,
        versionNumber: nextVersion,
        versionTag: `v${nextVersion}.0`,
        snapshot
      };
    } catch (err) {
      await client.query('ROLLBACK;');
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * Retrieves all historical versions for a project.
   */
  async listVersions(projectId) {
    const client = await this._getClient();
    try {
      const res = await client.query(
        `SELECT version_number, version_tag, status, changelog, created_by, created_at
         FROM project_specification_versions
         WHERE project_id = $1
         ORDER BY version_number DESC;`,
        [projectId]
      );
      return res.rows.map(r => ({
        versionNumber: r.version_number,
        versionTag: r.version_tag,
        status: r.status,
        changelog: r.changelog,
        createdBy: r.created_by,
        createdAt: r.created_at
      }));
    } finally {
      client.release();
    }
  }

  /**
   * Retrieves full details and snapshot for a specific version.
   */
  async getVersion(projectId, versionNumber) {
    const client = await this._getClient();
    try {
      const res = await client.query(
        `SELECT version_number, version_tag, status, snapshot, changelog, created_by, created_at
         FROM project_specification_versions
         WHERE project_id = $1 AND version_number = $2;`,
        [projectId, versionNumber]
      );
      if (res.rowCount === 0) {
        const err = new Error(`Specification version ${versionNumber} not found for project ${projectId}.`);
        err.code = 'NOT_FOUND';
        throw err;
      }
      return {
        versionNumber: res.rows[0].version_number,
        versionTag: res.rows[0].version_tag,
        status: res.rows[0].status,
        snapshot: res.rows[0].snapshot,
        changelog: res.rows[0].changelog,
        createdBy: res.rows[0].created_by,
        createdAt: res.rows[0].created_at
      };
    } finally {
      client.release();
    }
  }

  /**
   * Computes a structured semantic diff between two specification versions.
   */
  async compareVersions(projectId, ver1, ver2) {
    const v1Data = await this.getVersion(projectId, ver1);
    const v2Data = await this.getVersion(projectId, ver2);

    const s1 = v1Data.snapshot;
    const s2 = v2Data.snapshot;

    const reqDiff = {
      v1Count: (s1.requirements?.requirements || []).length,
      v2Count: (s2.requirements?.requirements || []).length,
      added: (s2.requirements?.requirements || []).filter(r2 => {
        const id2 = r2.requirementId || r2.id;
        return !(s1.requirements?.requirements || []).some(r1 => (r1.requirementId || r1.id) === id2);
      }),
      removed: (s1.requirements?.requirements || []).filter(r1 => {
        const id1 = r1.requirementId || r1.id;
        return !(s2.requirements?.requirements || []).some(r2 => (r2.requirementId || r2.id) === id1);
      })
    };

    const entDiff = {
      v1Count: (s1.dataModel?.entities || []).length,
      v2Count: (s2.dataModel?.entities || []).length,
      added: (s2.dataModel?.entities || []).filter(e2 => !(s1.dataModel?.entities || []).some(e1 => e1.name === e2.name)),
      removed: (s1.dataModel?.entities || []).filter(e1 => !(s2.dataModel?.entities || []).some(e2 => e2.name === e1.name))
    };

    return {
      projectId,
      baseVersion: ver1,
      targetVersion: ver2,
      differences: {
        requirements: reqDiff,
        entities: entDiff,
        architectureChanged: s1.architecture?.profile !== s2.architecture?.profile,
        readinessDiff: {
          base: s1.readiness?.readinessPercentage || 0,
          target: s2.readiness?.readinessPercentage || 0
        }
      }
    };
  }

  /**
   * Submits specification for review (transitions lifecycle state).
   */
  async submitForReview(project, user) {
    const readiness = this.readinessEngine.evaluateReadiness(project);
    if (readiness.blockingReasons.length > 0) {
      const err = new Error(`Specification cannot be submitted for review: ${readiness.blockingReasons.join('; ')}`);
      err.code = 'VALIDATION_FAILED';
      throw err;
    }

    const client = await this._getClient();
    try {
      await client.query(
        "UPDATE generation_projects SET lifecycle_status = 'REQUIREMENTS_REVIEW', updated_at = CURRENT_TIMESTAMP WHERE project_id = $1;",
        [project.projectId]
      );
      return { success: true, status: 'REQUIREMENTS_REVIEW', message: 'Specification successfully submitted for architectural review.' };
    } finally {
      client.release();
    }
  }

  /**
   * Approves or requests changes on a specification version (Server-side RBAC enforced).
   */
  async processApproval(project, { decision, comments = '' }, user) {
    if (!user || (!user.roles?.includes('CHIEF_ARCHITECT') && !user.roles?.includes('ADMIN') && !user.roles?.includes('LEAD_ARCHITECT'))) {
      const err = new Error('Access denied: Chief Architect or Administrator authorization required to approve specifications.');
      err.code = 'UNAUTHORIZED_APPROVAL';
      throw err;
    }

    if (!['APPROVED', 'REJECTED', 'CHANGES_REQUESTED'].includes(decision)) {
      const err = new Error(`Invalid decision "${decision}". Must be APPROVED, REJECTED, or CHANGES_REQUESTED.`);
      err.code = 'BAD_REQUEST';
      throw err;
    }

    const client = await this._getClient();
    try {
      await client.query('BEGIN;');

      const verNum = project.specificationVersion || 1;
      const approverIdentifier = user.id || user.username || user.name || 'chief-architect';
      const approvedAt = new Date().toISOString();
      const signaturePayload = `${project.projectId}:${verNum}:${decision}:${approverIdentifier}:${approvedAt}`;
      const signResult = await this.signatureService.signPayload(signaturePayload);
      const signatureHash = signResult.signature;

      await client.query(
        `INSERT INTO project_specification_approvals (
          project_id, version_number, decision, comments, approver, approver_role, approved_at, signature_hash
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8);`,
        [
          project.projectId,
          verNum,
          decision,
          comments,
          user.name || user.username,
          user.roles[0] || 'CHIEF_ARCHITECT',
          approvedAt,
          signatureHash
        ]
      );

      let newLifecycleStatus = project.lifecycleStatus;
      if (decision === 'APPROVED') {
        newLifecycleStatus = 'APPROVED_FOR_GENERATION';
      } else if (decision === 'CHANGES_REQUESTED') {
        newLifecycleStatus = 'REQUIREMENTS_IN_PROGRESS';
      } else if (decision === 'REJECTED') {
        newLifecycleStatus = 'DRAFT';
      }

      await client.query(
        `UPDATE generation_projects SET
          lifecycle_status = $1,
          approved_by = $2,
          approved_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
         WHERE project_id = $3;`,
        [newLifecycleStatus, decision === 'APPROVED' ? user.name || user.username : null, project.projectId]
      );

      // Update version status in project_specification_versions
      await client.query(
        'UPDATE project_specification_versions SET status = $1 WHERE project_id = $2 AND version_number = $3;',
        [decision, project.projectId, verNum]
      );

      await client.query('COMMIT;');

      return {
        success: true,
        decision,
        lifecycleStatus: newLifecycleStatus,
        approver: user.name || user.username,
        signatureHash,
        signatureType: signResult.signatureType,
        keyVersion: signResult.keyVersion,
        message: `Specification version ${verNum} successfully ${decision.toLowerCase().replace('_', ' ')}.`
      };
    } catch (err) {
      await client.query('ROLLBACK;');
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * Verifies the cryptographic signature of an approval record for a specification version.
   * Supports both keyed HMAC signatures and legacy unauthenticated SHA-256 digests.
   */
  async verifyApprovalSignature(projectId, versionNumber) {
    const client = await this._getClient();
    try {
      const res = await client.query(
        `SELECT project_id, version_number, decision, approver, approver_role, approved_at, signature_hash
         FROM project_specification_approvals
         WHERE project_id = $1 AND version_number = $2
         ORDER BY approved_at DESC LIMIT 1;`,
        [projectId, versionNumber]
      );

      if (res.rows.length === 0) {
        return {
          valid: false,
          error: 'NO_APPROVAL_RECORD_FOUND',
          reason: `No approval record found for project "${projectId}" version ${versionNumber}.`
        };
      }

      const row = res.rows[0];
      const approverId = row.approver || 'chief-architect';
      const approvedAt = new Date(row.approved_at).toISOString();
      const payload = `${row.project_id}:${row.version_number}:${row.decision}:${approverId}:${approvedAt}`;

      const verification = await this.signatureService.verifySignature(payload, row.signature_hash);
      return {
        ...verification,
        approvalRecord: row
      };
    } finally {
      client.release();
    }
  }
}

export const defaultSpecificationVersioningService = new SpecificationVersioningService();
