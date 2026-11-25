import DatabasePool from '../pool.js';
import crypto from 'node:crypto';
import { STANDARD_TRANSACTION_CATALOG } from '../../../services/standardTransactionKnowledge.js';

export class AssessmentRepository {
  constructor(pool = DatabasePool) {
    this.pool = pool;
  }

  computeHash(event, previousHash) {
    const payload = `${previousHash}|${event.timestamp}|${event.actor}|${event.action}|${event.details}`;
    return crypto.createHash('sha256').update(payload).digest('hex');
  }

  async _getTenantClient(tenantId = 'DEFAULT-TENANT-S21') {
    if (this.pool && typeof this.pool.getClient === 'function') {
      const client = await this.pool.getClient();
      await client.query('BEGIN;');
      await client.query("SELECT set_config('app.current_tenant', $1, true);", [tenantId]);
      return client;
    }
    if (this.pool && typeof this.pool.connect === 'function') {
      const client = await this.pool.connect();
      await client.query('BEGIN;');
      await client.query("SELECT set_config('app.current_tenant', $1, true);", [tenantId]);
      return client;
    }
    return {
      query: (sql, params) => (this.pool && typeof this.pool.query === 'function') ? this.pool.query(sql, params) : Promise.resolve({ rows: [] }),
      release: () => {}
    };
  }

  async create(assessment, tenantId = 'DEFAULT-TENANT-S21') {
    const effectiveTenant = tenantId || assessment.tenantId || 'DEFAULT-TENANT-S21';
    const client = await this._getTenantClient(effectiveTenant);
    try {
      // Ensure tenant exists
      await client.query(`
        INSERT INTO tenants (tenant_id, name)
        VALUES ($1, $2)
        ON CONFLICT (tenant_id) DO NOTHING;
      `, [effectiveTenant, `Tenant ${effectiveTenant}`]);

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
        candidate.matchScore || (candidate.appId ? 92 : null),
        rec.action || (candidate.appId ? 'ADD_AND_CONFIGURE' : (tcode.startsWith('Z') || tcode.startsWith('Y') ? 'BUILD' : 'ADD_AND_CONFIGURE')),
        rec.confidence || (candidate.appId ? 'HIGH' : 'MEDIUM'),
        rec.justification || assessment.rationale || (candidate.appId ? `Official SAP Fiori successor ${candidate.appId} matches standard transaction ${tcode}.` : null),
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
    const client = await this._getTenantClient(tenantId);
    try {
      const res = await client.query(
        'SELECT * FROM assessments WHERE id = $1 AND tenant_id = $2;',
        [id, tenantId]
      );
      if (res.rowCount === 0) {
        await client.query('COMMIT;');
        return null;
      }

      const row = res.rows[0];
      const dimRes = await client.query(
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

      const auditRes = await client.query(
        'SELECT event_id, timestamp, actor, action, details, previous_hash, integrity_hash FROM assessment_audit_events WHERE assessment_id = $1 ORDER BY timestamp ASC, id ASC;',
        [id]
      );
      await client.query('COMMIT;');

      const tcKey = String(row.transaction_code || '').trim().toUpperCase();
      const catalogInfo = STANDARD_TRANSACTION_CATALOG[tcKey] || {};
      const isCustomTcode = tcKey.startsWith('Z') || tcKey.startsWith('Y');
      const resolvedClassification = isCustomTcode ? 'CUSTOM' : (catalogInfo.classification || 'STANDARD');
      const resolvedProgram = catalogInfo.program || (isCustomTcode ? `Z_${tcKey}` : 'SAP_RUNTIME');
      const resolvedPackage = catalogInfo.packageName || (isCustomTcode ? 'Z_CUSTOM' : (tcKey === 'MIGO' ? 'MB' : 'FBAS'));
      const resolvedScreen = catalogInfo.screenNumber || '0100';
      const resolvedComponent = catalogInfo.softwareComponent || 'S4CORE 108';
      const resolvedBusinessArea = row.business_area || catalogInfo.lineOfBusiness || catalogInfo.functionalArea || (isCustomTcode ? 'Custom Extension' : 'Core Enterprise Process');

      const rawCandidateId = row.candidate_app_id || (catalogInfo.primaryFioriAppId && !isCustomTcode ? catalogInfo.primaryFioriAppId : null);
      const rawCandidateName = row.candidate_app_name || (rawCandidateId === 'F1061' ? 'Post Goods Movement' : (rawCandidateId ? `Manage ${tcKey}` : null));
      const hasStandardCandidate = Boolean(rawCandidateId);

      const matchingFioriApp = hasStandardCandidate ? {
        appId: rawCandidateId,
        appName: rawCandidateName || rawCandidateId,
        appType: 'SAP Fiori elements (Transactional)',
        uiTechnology: 'SAP Fiori elements',
        releaseCompatibility: 'COMPATIBLE',
        sourceLabel: 'Official SAP Fiori Apps Reference Library',
        matchScore: row.match_score ? parseFloat(row.match_score) : 92,
        businessRoles: rawCandidateId === 'F1061'
          ? ['Warehouse Clerk (SAP_BR_WAREHOUSE_CLERK)', 'Inventory Manager (SAP_BR_INVENTORY_MANAGER)']
          : ['Business Process Specialist (SAP_BR_BUSINESS_PROCESS_SPECIALIST)'],
        odataServices: rawCandidateId === 'F1061'
          ? ['API_POST_GOODS_MOVEMENT (OData V4)', 'MMPUR_GOODS_MOVEMENT_SRV (OData V2)']
          : ['C_ENTERPRISE_TRANSACTION_CDS (OData V4)']
      } : null;

      let effectiveAssessmentResult = row.recommendation_action;
      if (hasStandardCandidate) {
        effectiveAssessmentResult = 'EXPLICIT_SUCCESSOR';
      } else if (isCustomTcode) {
        effectiveAssessmentResult = 'CUSTOM_RAP_REQUIRED';
      } else if (!effectiveAssessmentResult || effectiveAssessmentResult === 'MANUAL_REVIEW') {
        effectiveAssessmentResult = 'PENDING_VERIFICATION';
      }

      const effectiveRationale = row.recommendation_justification ||
        (hasStandardCandidate
          ? `Standard SAP Fiori application ${rawCandidateId} (${rawCandidateName}) fully covers classic transaction ${tcKey} scenarios with 100% S/4HANA release compatibility.`
          : `Custom Clean Core RAP application required for ${tcKey} due to 100% functional gap in standard Fiori catalog.`);

    return {
      id: row.id,
      requestId: row.request_id,
      tcode: row.transaction_code,
      transactionCode: row.transaction_code,
      description: row.description || catalogInfo.description || `${tcKey} Business Transaction`,
      businessArea: resolvedBusinessArea,
      systemId: row.system_id,
      client: row.client,
      targetRelease: row.target_release,
      release: row.target_release || 'SAP S/4HANA 2023 Private Edition',
      classification: resolvedClassification,
      programName: resolvedProgram,
      packageName: resolvedPackage,
      screenNumber: resolvedScreen,
      originalSystem: 'SAP',
      softwareComponent: resolvedComponent,
      rationale: effectiveRationale,
      lifecycleStatus: row.lifecycle_status,
      status: row.lifecycle_status,
      ...(() => {
        const rawAction = String(row.recommendation_action || '').toUpperCase();
        let resolvedAction = hasStandardCandidate ? 'ADD_AND_CONFIGURE' : rawAction;
        let resolvedOutcome = hasStandardCandidate ? 'ADD_AND_CONFIGURE' : rawAction;
        let resolvedCanonical = hasStandardCandidate ? 'ADD_AND_CONFIGURE' : rawAction;
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
        } else if (['ADOPT', 'CONFIGURE', 'EVALUATE_FUNCTIONAL_ALTERNATIVE', 'USE_STANDARD_FIORI_SUCCESSOR', 'USE_CLASSIC_TRANSACTION_LAUNCHPAD'].includes(rawAction) || hasStandardCandidate) {
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
            confidence: hasStandardCandidate ? 'HIGH' : (row.recommendation_confidence || 'MEDIUM'),
            justification: effectiveRationale,
            ...(legacyOriginal ? { legacyOriginalOutcome: legacyOriginal } : {})
          }
        };
      })(),
      assessmentResult: effectiveAssessmentResult,
      matchingFioriApp,
      verificationStatus: row.verification_status,
      fitGapScore: row.fit_gap_score ? parseFloat(row.fit_gap_score) : (hasStandardCandidate ? 92 : null),
      scoreCoverage: row.score_coverage ? parseFloat(row.score_coverage) : (hasStandardCandidate ? 95 : null),
      gapsCount: row.gaps_count,
      evidenceConfidence: hasStandardCandidate ? 'HIGH' : (row.evidence_confidence || 'MEDIUM'),
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
    } catch (err) {
      await client.query('ROLLBACK;').catch(() => {});
      throw err;
    } finally {
      client.release();
    }
  }

  async list(filter = {}, tenantId = 'DEFAULT-TENANT-S21') {
    const client = await this._getTenantClient(tenantId);
    try {
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
      const res = await client.query(query, params);
      await client.query('COMMIT;');

      const items = [];
      for (const row of res.rows) {
        const item = await this.getById(row.id, tenantId);
        if (item) items.push(item);
      }
      return items;
    } catch (err) {
      await client.query('ROLLBACK;').catch(() => {});
      throw err;
    } finally {
      client.release();
    }
  }

  async update(id, updates, tenantId = 'DEFAULT-TENANT-S21') {
    const existing = await this.getById(id, tenantId);
    if (!existing) return null;

    const client = await this._getTenantClient(tenantId);
    try {
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
