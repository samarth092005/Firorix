import DatabasePool from '../pool.js';

export class GenerationHandoffRepository {
  constructor(pool = DatabasePool) {
    this.pool = pool;
  }

  async _getClient() {
    if (typeof this.pool.getClient === 'function') {
      return await this.pool.getClient();
    }
    return await this.pool.connect();
  }

  async createHandoff(handoff, tenantId = 'DEFAULT-TENANT-S21') {
    const client = await this._getClient();
    try {
      await client.query('BEGIN;');

      // Ensure tenant exists
      await client.query(`
        INSERT INTO tenants (tenant_id, name)
        VALUES ($1, $2)
        ON CONFLICT (tenant_id) DO NOTHING;
      `, [tenantId, `Tenant ${tenantId}`]);

      const handoffId = handoff.handoffId || handoff.id;
      const sourceAssessmentId = handoff.sourceAssessmentId || handoff.assessmentId || null;
      const tcode = handoff.tcode || handoff.transactionCode || 'UNKNOWN';

      // Check if source assessment exists in PostgreSQL before referencing foreign key
      let validAssessmentId = null;
      if (sourceAssessmentId) {
        const checkAsm = await client.query('SELECT id FROM assessments WHERE id = $1;', [sourceAssessmentId]);
        if (checkAsm.rowCount > 0) {
          validAssessmentId = sourceAssessmentId;
        }
      }

      await client.query(`
        INSERT INTO generation_handoffs (
          handoff_id, tenant_id, source_assessment_id, tcode,
          transaction_description, target_release, system_id, client,
          program_name, package_name, classification, current_stage,
          proposed_app_type, approval_status, clean_core_justification,
          fit_gap_summary, business_requirements, target_architecture,
          lead_architect_approval, metadata, created_by, created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4,
          $5, $6, $7, $8,
          $9, $10, $11, $12,
          $13, $14, $15,
          $16, $17, $18,
          $19, $20, $21, COALESCE($22::timestamptz, CURRENT_TIMESTAMP), CURRENT_TIMESTAMP
        )
        ON CONFLICT (handoff_id) DO UPDATE SET
          current_stage = EXCLUDED.current_stage,
          approval_status = EXCLUDED.approval_status,
          clean_core_justification = EXCLUDED.clean_core_justification,
          fit_gap_summary = EXCLUDED.fit_gap_summary,
          business_requirements = EXCLUDED.business_requirements,
          target_architecture = EXCLUDED.target_architecture,
          lead_architect_approval = EXCLUDED.lead_architect_approval,
          metadata = EXCLUDED.metadata,
          updated_at = CURRENT_TIMESTAMP;
      `, [
        handoffId,
        tenantId,
        validAssessmentId,
        tcode,
        handoff.transactionDescription || handoff.description || null,
        handoff.targetRelease || 'SAP S/4HANA 2023 On-Premise',
        handoff.systemId || 'S21',
        handoff.client || '200',
        handoff.programName || null,
        handoff.packageName || null,
        handoff.classification || 'STANDARD',
        handoff.currentStage || 'DRAFT',
        handoff.proposedAppType || 'RAP_MANAGED',
        handoff.approvalStatus || (handoff.architectApproved ? 'APPROVED' : 'PENDING_APPROVAL'),
        handoff.cleanCoreJustification || handoff.justification || null,
        JSON.stringify(handoff.fitGapSummary || {}),
        JSON.stringify(handoff.businessRequirements || {}),
        JSON.stringify(handoff.targetArchitecture || {}),
        JSON.stringify(handoff.leadArchitectApproval || {}),
        JSON.stringify(handoff.metadata || {}),
        handoff.createdBy || handoff.author || 'system',
        handoff.createdAt || new Date().toISOString()
      ]);

      // If approval details are provided, record in build_architect_approvals
      const approvalObj = handoff.leadArchitectApproval;
      if (approvalObj && approvalObj.approved === true && validAssessmentId) {
        const approvalId = approvalObj.approvalId || `APP-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
        const targetVersion = approvalObj.assessmentVersion !== undefined ? approvalObj.assessmentVersion : 1;
        await client.query(`
          INSERT INTO build_architect_approvals (
            approval_id, tenant_id, assessment_id, assessment_version,
            handoff_id, approver_id, approver_name, approver_role,
            scope, status, justification, approved_at, expires_at
          ) VALUES (
            $1, $2, $3, $4,
            $5, $6, $7, $8,
            $9, $10, $11, COALESCE($12::timestamptz, CURRENT_TIMESTAMP), $13::timestamptz
          )
          ON CONFLICT (assessment_id, assessment_version, scope) DO UPDATE SET
            handoff_id = EXCLUDED.handoff_id,
            status = EXCLUDED.status,
            justification = EXCLUDED.justification,
            approved_at = EXCLUDED.approved_at,
            expires_at = EXCLUDED.expires_at;
        `, [
          approvalId,
          tenantId,
          validAssessmentId,
          targetVersion,
          handoffId,
          approvalObj.approverId || 'USR-ARCH-01',
          approvalObj.approver || 'Lead Enterprise Architect',
          approvalObj.approverRole || 'LEAD_ARCHITECT',
          String(approvalObj.scope || 'BUILD').toUpperCase(),
          'APPROVED',
          approvalObj.justification || handoff.cleanCoreJustification || null,
          approvalObj.approvedAt || new Date().toISOString(),
          approvalObj.expiresAt || null
        ]);
      }

      await client.query('COMMIT;');
      return await this.getHandoff(handoffId, tenantId);
    } catch (err) {
      await client.query('ROLLBACK;').catch(() => {});
      throw err;
    } finally {
      client.release();
    }
  }

  async getHandoff(handoffId, tenantId = 'DEFAULT-TENANT-S21') {
    const res = await this.pool.query(
      `SELECT * FROM generation_handoffs WHERE handoff_id = $1 AND tenant_id = $2;`,
      [handoffId, tenantId]
    );
    if (res.rows.length === 0) return null;
    return this._mapRowToHandoff(res.rows[0]);
  }

  async listHandoffs(filters = {}, tenantId = 'DEFAULT-TENANT-S21') {
    let query = `SELECT * FROM generation_handoffs WHERE tenant_id = $1`;
    const params = [tenantId];

    if (filters.assessmentId || filters.sourceAssessmentId) {
      params.push(filters.assessmentId || filters.sourceAssessmentId);
      query += ` AND source_assessment_id = $${params.length}`;
    }
    if (filters.tcode) {
      params.push(filters.tcode.toUpperCase());
      query += ` AND tcode = $${params.length}`;
    }
    if (filters.approvalStatus) {
      params.push(filters.approvalStatus.toUpperCase());
      query += ` AND approval_status = $${params.length}`;
    }

    query += ` ORDER BY created_at DESC;`;
    const res = await this.pool.query(query, params);
    return res.rows.map(r => this._mapRowToHandoff(r));
  }

  async recordApproval(approvalData, tenantId = 'DEFAULT-TENANT-S21') {
    const client = await this._getClient();
    try {
      await client.query('BEGIN;');
      const approvalId = approvalData.approvalId || `APP-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
      const assessmentId = approvalData.assessmentId;
      const targetVersion = approvalData.assessmentVersion !== undefined ? approvalData.assessmentVersion : 1;
      const scope = String(approvalData.scope || 'BUILD').toUpperCase();

      const res = await client.query(`
        INSERT INTO build_architect_approvals (
          approval_id, tenant_id, assessment_id, assessment_version,
          handoff_id, approver_id, approver_name, approver_role,
          scope, status, justification, approved_at, expires_at
        ) VALUES (
          $1, $2, $3, $4,
          $5, $6, $7, $8,
          $9, $10, $11, COALESCE($12::timestamptz, CURRENT_TIMESTAMP), $13::timestamptz
        )
        ON CONFLICT (assessment_id, assessment_version, scope) DO UPDATE SET
          status = EXCLUDED.status,
          justification = EXCLUDED.justification,
          approved_at = EXCLUDED.approved_at,
          expires_at = EXCLUDED.expires_at
        RETURNING *;
      `, [
        approvalId,
        tenantId,
        assessmentId,
        targetVersion,
        approvalData.handoffId || null,
        approvalData.approverId || 'USR-ARCH-01',
        approvalData.approverName || 'Lead Enterprise Architect',
        approvalData.approverRole || 'LEAD_ARCHITECT',
        scope,
        approvalData.status || 'APPROVED',
        approvalData.justification || null,
        approvalData.approvedAt || new Date().toISOString(),
        approvalData.expiresAt || null
      ]);

      await client.query('COMMIT;');
      return res.rows[0];
    } catch (err) {
      await client.query('ROLLBACK;').catch(() => {});
      throw err;
    } finally {
      client.release();
    }
  }

  async getApproval(assessmentId, version = 1, scope = 'BUILD', tenantId = 'DEFAULT-TENANT-S21') {
    const res = await this.pool.query(
      `SELECT * FROM build_architect_approvals
       WHERE assessment_id = $1 AND assessment_version = $2 AND scope = $3 AND tenant_id = $4;`,
      [assessmentId, version, String(scope).toUpperCase(), tenantId]
    );
    if (res.rows.length === 0) return null;
    return res.rows[0];
  }

  _mapRowToHandoff(row) {
    return {
      handoffId: row.handoff_id,
      sourceAssessmentId: row.source_assessment_id,
      tcode: row.tcode,
      transactionDescription: row.transaction_description,
      targetRelease: row.target_release,
      systemId: row.system_id,
      client: row.client,
      programName: row.program_name,
      packageName: row.package_name,
      classification: row.classification,
      currentStage: row.current_stage,
      proposedAppType: row.proposed_app_type,
      approvalStatus: row.approval_status,
      cleanCoreJustification: row.clean_core_justification,
      fitGapSummary: typeof row.fit_gap_summary === 'string' ? JSON.parse(row.fit_gap_summary) : (row.fit_gap_summary || {}),
      businessRequirements: typeof row.business_requirements === 'string' ? JSON.parse(row.business_requirements) : (row.business_requirements || {}),
      targetArchitecture: typeof row.target_architecture === 'string' ? JSON.parse(row.target_architecture) : (row.target_architecture || {}),
      leadArchitectApproval: typeof row.lead_architect_approval === 'string' ? JSON.parse(row.lead_architect_approval) : (row.lead_architect_approval || {}),
      metadata: typeof row.metadata === 'string' ? JSON.parse(row.metadata) : (row.metadata || {}),
      createdBy: row.created_by,
      createdAt: row.created_at ? new Date(row.created_at).toISOString() : null,
      updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : null
    };
  }
}

export default GenerationHandoffRepository;
