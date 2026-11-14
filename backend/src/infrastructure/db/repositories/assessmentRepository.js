import DatabasePool from '../pool.js';
import crypto from 'node:crypto';

export class AssessmentRepository {
  constructor(pool = DatabasePool) {
    this.pool = pool;
  }

  computeHash(event, previousHash) {
    const payload = `${previousHash}|${event.timestamp}|${event.actor}|${event.action}|${event.details}`;
    return crypto.createHash('sha256').update(payload).digest('hex');
  }

  async create(assessment, tenantId = 'DEFAULT-TENANT-S21') {
    const client = typeof this.pool.getClient === 'function' ? await this.pool.getClient() : await this.pool.connect();
    try {
      await client.query('BEGIN;');

      // Ensure tenant exists
      await client.query(`
        INSERT INTO tenants (tenant_id, name)
        VALUES ($1, $2)
        ON CONFLICT (tenant_id) DO NOTHING;
      `, [tenantId, `Tenant ${tenantId}`]);

      // Ensure system profile exists if specified
      const sysId = assessment.systemId || assessment.systemContext?.systemId || 'S21';
      const clientNum = assessment.client || assessment.systemContext?.client || '200';

      const existingProfile = await client.query(
        'SELECT id FROM sap_system_profiles WHERE tenant_id = $1 AND system_id = $2 AND client = $3 LIMIT 1;',
        [tenantId, sysId, clientNum]
      );

      let profileId;
      if (existingProfile.rowCount > 0) {
        profileId = existingProfile.rows[0].id;
      } else {
        profileId = assessment.systemProfileId || `${tenantId}-${sysId}-${clientNum}`;
        await client.query(`
          INSERT INTO sap_system_profiles (id, tenant_id, system_id, client, release, description)
          VALUES ($1, $2, $3, $4, $5, $6)
          ON CONFLICT (tenant_id, system_id, client) DO UPDATE SET updated_at = CURRENT_TIMESTAMP;
        `, [profileId, tenantId, sysId, clientNum, assessment.targetRelease || 'SAP S/4HANA 2023 On-Premise', `SAP S/4HANA ${sysId} Client ${clientNum}`]);
      }

      const tcode = assessment.tcode || assessment.transactionCode;
      const rec = assessment.recommendation || {};
      const candidate = assessment.matchingFioriApp || assessment.candidateApp || {};

      // Resolve candidate_app_id foreign key safely
      let validCandidateAppId = null;
      const rawCandidateId = candidate.appId || candidate.fioriId;
      if (rawCandidateId) {
        const checkCat = await client.query('SELECT app_id FROM fiori_catalog_apps WHERE app_id = $1;', [rawCandidateId]);
        if (checkCat.rowCount > 0) {
          validCandidateAppId = rawCandidateId;
        }
      }

      // Insert assessment root
      await client.query(`
        INSERT INTO assessments (
          id, tenant_id, request_id, transaction_code, description, business_area,
          system_profile_id, system_id, client, target_release,
          candidate_app_id, candidate_app_name, match_score,
          recommendation_action, recommendation_confidence, recommendation_justification,
          verification_status, lifecycle_status, fit_gap_score, score_coverage,
          gaps_count, evidence_confidence, provenance, readiness_state, scoring_breakdown,
          created_by, created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
          $11, $12, $13, $14, $15, $16, $17, $18, $19, $20,
          $21, $22, $23, $24, $25,
          $26, COALESCE($27::timestamptz, CURRENT_TIMESTAMP), CURRENT_TIMESTAMP
        )
        ON CONFLICT (id) DO UPDATE SET
          description = EXCLUDED.description,
          lifecycle_status = EXCLUDED.lifecycle_status,
          recommendation_action = EXCLUDED.recommendation_action,
          fit_gap_score = EXCLUDED.fit_gap_score,
          readiness_state = EXCLUDED.readiness_state,
          scoring_breakdown = EXCLUDED.scoring_breakdown,
          updated_at = CURRENT_TIMESTAMP;
      `, [
        assessment.id, tenantId, assessment.requestId || null, tcode, assessment.description || null,
        assessment.businessArea || null, profileId, sysId, clientNum,
        assessment.targetRelease || 'SAP S/4HANA 2023 On-Premise',
        validCandidateAppId,
        candidate.appName || rawCandidateId || null,
        candidate.matchScore || null,
        rec.action || 'MANUAL_REVIEW',
        rec.confidence || 'MEDIUM',
        rec.justification || null,
        assessment.verificationStatus || 'VERIFIED_COMPLETE',
        assessment.lifecycleStatus || assessment.status || 'DRAFT',
        assessment.fitGapScore || null,
        assessment.scoreCoverage || null,
        assessment.gapsCount || 0,
        assessment.evidenceConfidence || 'MEDIUM',
        assessment.provenance || 'ASSESSMENT_ENGINE',
        assessment.readinessState || rec.readinessState || rec.state || 'REVIEW',
        JSON.stringify(assessment.scoringBreakdown || assessment.scores || rec.scoringBreakdown || {}),
        assessment.createdBy || 'admin',
        assessment.createdAt || new Date().toISOString()
      ]);

      // Insert dimensions
      const dimensions = assessment.dimensionResults || assessment.dimensions || assessment.fitGapDimensions || {};
      for (const [dimKey, dimVal] of Object.entries(dimensions)) {
        const score = typeof dimVal === 'number' ? dimVal : (dimVal.score ?? 0);
        const gaps = dimVal.gaps || [];
        const findings = dimVal.findings || dimVal.justification || null;
        await client.query(`
          INSERT INTO fit_gap_dimensions (assessment_id, dimension_name, score, status, findings, gaps)
          VALUES ($1, $2, $3, $4, $5, $6)
          ON CONFLICT (assessment_id, dimension_name) DO UPDATE SET
            score = EXCLUDED.score,
            findings = EXCLUDED.findings,
            gaps = EXCLUDED.gaps;
        `, [assessment.id, dimKey, score, dimVal.status || 'EVALUATED', findings, JSON.stringify(gaps)]);
      }

      // Insert initial audit event if none exists
      const existingAudit = await client.query('SELECT COUNT(*) FROM assessment_audit_events WHERE assessment_id = $1;', [assessment.id]);
      if (parseInt(existingAudit.rows[0].count, 10) === 0) {
        const initialEvents = assessment.auditEvents || [
          {
            eventId: `EVT-${Date.now()}-GENESIS`,
            timestamp: assessment.createdAt || new Date().toISOString(),
            actor: assessment.createdBy || 'admin',
            action: 'CREATE',
            details: 'Assessment created'
          }
        ];

        let prevHash = 'GENESIS';
        for (const evt of initialEvents) {
          const timestamp = evt.timestamp || new Date().toISOString();
          const actor = evt.actor || 'admin';
          const action = evt.action || 'CREATE';
          const details = evt.details || '';
          const integrityHash = evt.integrityHash || this.computeHash({ timestamp, actor, action, details }, prevHash);
          const previousHash = evt.previousHash || prevHash;

          await client.query(`
            INSERT INTO assessment_audit_events (assessment_id, event_id, timestamp, actor, action, details, previous_hash, integrity_hash)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8);
          `, [assessment.id, evt.eventId || `EVT-${Date.now()}`, timestamp, actor, action, details, previousHash, integrityHash]);

          prevHash = integrityHash;
        }
      }

      await client.query('COMMIT;');
      return await this.getById(assessment.id, tenantId);
    } catch (err) {
      await client.query('ROLLBACK;');
      throw err;
    } finally {
      client.release();
    }
  }

  async getById(id, tenantId = 'DEFAULT-TENANT-S21') {
    const res = await this.pool.query(
      'SELECT * FROM assessments WHERE id = $1 AND tenant_id = $2;',
      [id, tenantId]
    );
    if (res.rowCount === 0) return null;

    const row = res.rows[0];
    const dimRes = await this.pool.query(
      'SELECT dimension_name, score, status, findings, gaps FROM fit_gap_dimensions WHERE assessment_id = $1;',
      [id]
    );
    const dimensions = {};
    for (const d of dimRes.rows) {
      dimensions[d.dimension_name] = {
        score: parseFloat(d.score),
        status: d.status,
        findings: d.findings,
        gaps: d.gaps
      };
    }

    const auditRes = await this.pool.query(
      'SELECT event_id, timestamp, actor, action, details, previous_hash, integrity_hash FROM assessment_audit_events WHERE assessment_id = $1 ORDER BY timestamp ASC, id ASC;',
      [id]
    );

    return {
      id: row.id,
      requestId: row.request_id,
      tcode: row.transaction_code,
      transactionCode: row.transaction_code,
      description: row.description,
      businessArea: row.business_area,
      systemId: row.system_id,
      client: row.client,
      targetRelease: row.target_release,
      lifecycleStatus: row.lifecycle_status,
      status: row.lifecycle_status,
      ...(() => {
        const rawAction = String(row.recommendation_action || '').toUpperCase();
        let resolvedAction = rawAction;
        let resolvedOutcome = rawAction;
        let resolvedCanonical = rawAction;
        let legacyOriginal = null;
        let migrationRationale = null;

        if (rawAction === 'EXTEND') {
          legacyOriginal = 'EXTEND';
          const hasCand = Boolean(row.candidate_app_id || row.candidate_app_name);
          const isVerified = row.verification_status !== 'UNVERIFIED';
          const hasGaps = (row.gaps_count || 0) > 0;

          let isExplicitBuildApproval = false;
          let approvalObj = null;
          try {
            if (row.lead_architect_approval) {
              approvalObj = typeof row.lead_architect_approval === 'string'
                ? JSON.parse(row.lead_architect_approval)
                : row.lead_architect_approval;
            }
          } catch (e) {
            approvalObj = null;
          }

          if (approvalObj && approvalObj.approved === true) {
            const scope = String(approvalObj.scope || approvalObj.approvalScope || approvalObj.decision || approvalObj.targetOutcome || '').toUpperCase();
            if (scope === 'BUILD' || scope === 'CUSTOM_DEVELOPMENT' || approvalObj.customDevelopmentApproved === true || approvalObj.buildApproved === true) {
              isExplicitBuildApproval = true;
            }
          }

          if (row.approval_scope) {
            const scope = String(row.approval_scope).toUpperCase();
            if (scope === 'BUILD' || scope === 'CUSTOM_DEVELOPMENT') {
              isExplicitBuildApproval = true;
            }
          }

          if (hasCand && isVerified && !hasGaps) {
            resolvedAction = 'ADD_AND_CONFIGURE';
            resolvedOutcome = 'ADD_AND_CONFIGURE';
            resolvedCanonical = 'ADD_AND_CONFIGURE';
            migrationRationale = 'Migrated from legacy EXTEND to ADD_AND_CONFIGURE: verified standard candidate available for adaptation.';
          } else if (hasGaps && isExplicitBuildApproval) {
            resolvedAction = 'BUILD';
            resolvedOutcome = 'BUILD';
            resolvedCanonical = 'BUILD';
            migrationRationale = 'Migrated from legacy EXTEND to BUILD due to identified gaps and explicit architect sign-off for custom development.';
          } else if (hasGaps && row.lifecycle_status === 'APPROVED' && !isExplicitBuildApproval) {
            resolvedAction = 'REVIEW';
            resolvedOutcome = 'REVIEW';
            resolvedCanonical = 'REVIEW';
            migrationRationale = 'Migrated from legacy EXTEND to REVIEW: historical approval was scoped to EXTEND. Custom development (BUILD) requires fresh architect approval.';
          } else {
            resolvedAction = 'REVIEW';
            resolvedOutcome = 'REVIEW';
            resolvedCanonical = 'REVIEW';
            migrationRationale = 'Migrated from legacy EXTEND to REVIEW: evidence requires verification.';
          }
        } else if (['ADOPT', 'CONFIGURE', 'EVALUATE_FUNCTIONAL_ALTERNATIVE', 'USE_STANDARD_FIORI_SUCCESSOR', 'USE_CLASSIC_TRANSACTION_LAUNCHPAD'].includes(rawAction)) {
          resolvedAction = 'ADD_AND_CONFIGURE';
          resolvedOutcome = 'ADD_AND_CONFIGURE';
          resolvedCanonical = 'ADD_AND_CONFIGURE';
        }

        const isBusiness = resolvedOutcome === 'ADD_AND_CONFIGURE' || resolvedOutcome === 'BUILD';

        return {
          legacyOriginalOutcome: legacyOriginal,
          migrationRationale,
          recommendation: {
            action: resolvedAction,
            outcome: resolvedOutcome,
            canonicalOutcome: resolvedCanonical,
            businessOutcome: isBusiness ? resolvedOutcome : null,
            governanceState: isBusiness ? null : resolvedOutcome,
            isBusinessOutcome: isBusiness,
            confidence: row.recommendation_confidence,
            justification: row.recommendation_justification,
            ...(legacyOriginal ? { legacyOriginalOutcome: legacyOriginal } : {})
          }
        };
      })(),
      assessmentResult: row.recommendation_action,
      matchingFioriApp: (row.candidate_app_id || row.candidate_app_name) ? {
        appId: row.candidate_app_id || row.candidate_app_name,
        appName: row.candidate_app_name,
        matchScore: row.match_score ? parseFloat(row.match_score) : null
      } : null,
      verificationStatus: row.verification_status,
      fitGapScore: row.fit_gap_score ? parseFloat(row.fit_gap_score) : null,
      scoreCoverage: row.score_coverage ? parseFloat(row.score_coverage) : null,
      gapsCount: row.gaps_count,
      evidenceConfidence: row.evidence_confidence,
      provenance: row.provenance,
      readinessState: row.readiness_state || 'REVIEW',
      scoringBreakdown: row.scoring_breakdown || {},
      dimensions,
      dimensionResults: dimensions,
      auditEvents: auditRes.rows.map(a => ({
        eventId: a.event_id,
        timestamp: a.timestamp.toISOString(),
        actor: a.actor,
        action: a.action,
        details: a.details,
        previousHash: a.previous_hash,
        integrityHash: a.integrity_hash
      })),
      createdBy: row.created_by,
      createdAt: row.created_at.toISOString(),
      updatedAt: row.updated_at.toISOString()
    };
  }

  async list(filter = {}, tenantId = 'DEFAULT-TENANT-S21') {
    let query = 'SELECT id FROM assessments WHERE tenant_id = $1';
    const params = [tenantId];

    if (filter.status || filter.lifecycleStatus) {
      params.push(filter.status || filter.lifecycleStatus);
      query += ` AND lifecycle_status = $${params.length}`;
    }
    if (filter.businessArea) {
      params.push(filter.businessArea);
      query += ` AND business_area = $${params.length}`;
    }
    if (filter.search) {
      params.push(`%${filter.search}%`);
      query += ` AND (transaction_code ILIKE $${params.length} OR description ILIKE $${params.length} OR candidate_app_name ILIKE $${params.length})`;
    }

    query += ' ORDER BY created_at DESC;';
    const res = await this.pool.query(query, params);

    const items = [];
    for (const row of res.rows) {
      const item = await this.getById(row.id, tenantId);
      if (item) items.push(item);
    }
    return items;
  }

  async update(id, updates, tenantId = 'DEFAULT-TENANT-S21') {
    const existing = await this.getById(id, tenantId);
    if (!existing) return null;

    const client = await this.pool.getClient();
    try {
      await client.query('BEGIN;');

      const newStatus = updates.lifecycleStatus || updates.status || existing.lifecycleStatus;
      const newAction = updates.recommendation?.action || existing.recommendation?.action;
      const newConfidence = updates.recommendation?.confidence || existing.recommendation?.confidence;
      const newJustification = updates.recommendation?.justification || existing.recommendation?.justification;

      await client.query(`
        UPDATE assessments SET
          lifecycle_status = $1,
          recommendation_action = $2,
          recommendation_confidence = $3,
          recommendation_justification = $4,
          fit_gap_score = COALESCE($5, fit_gap_score),
          description = COALESCE($6, description),
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $7 AND tenant_id = $8;
      `, [
        newStatus,
        newAction,
        newConfidence,
        newJustification,
        updates.fitGapScore ?? null,
        updates.description ?? null,
        id,
        tenantId
      ]);

      // Record audit event
      const lastAudit = existing.auditEvents[existing.auditEvents.length - 1];
      const prevHash = lastAudit?.integrityHash || 'GENESIS';
      const actor = updates.actor || 'admin';
      const action = updates.auditAction || 'UPDATE';
      const details = updates.auditDetails || `Assessment updated to ${newStatus}`;
      const timestamp = new Date().toISOString();
      const integrityHash = this.computeHash({ timestamp, actor, action, details }, prevHash);

      await client.query(`
        INSERT INTO assessment_audit_events (assessment_id, event_id, timestamp, actor, action, details, previous_hash, integrity_hash)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8);
      `, [id, `EVT-${Date.now()}`, timestamp, actor, action, details, prevHash, integrityHash]);

      await client.query('COMMIT;');
      return await this.getById(id, tenantId);
    } catch (err) {
      await client.query('ROLLBACK;');
      throw err;
    } finally {
      client.release();
    }
  }

  async archive(id, tenantId = 'DEFAULT-TENANT-S21') {
    return await this.update(id, {
      lifecycleStatus: 'ARCHIVED',
      auditAction: 'ARCHIVE',
      auditDetails: 'Assessment archived'
    }, tenantId);
  }

  async getAuditTrail(id, tenantId = 'DEFAULT-TENANT-S21') {
    const item = await this.getById(id, tenantId);
    return item ? item.auditEvents : null;
  }
}

export default AssessmentRepository;
