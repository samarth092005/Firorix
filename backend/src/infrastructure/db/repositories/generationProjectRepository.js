import DatabasePool from '../pool.js';
import crypto from 'node:crypto';

export class GenerationProjectRepository {
  constructor(pool = DatabasePool) {
    this.pool = pool;
  }

  async _getClient() {
    if (typeof this.pool.getClient === 'function') {
      return await this.pool.getClient();
    }
    return await this.pool.connect();
  }

  async createProject(project, tenantId = 'DEFAULT-TENANT-S21') {
    const client = await this._getClient();
    try {
      await client.query('BEGIN;');

      // Ensure tenant exists
      await client.query(`
        INSERT INTO tenants (tenant_id, name)
        VALUES ($1, $2)
        ON CONFLICT (tenant_id) DO NOTHING;
      `, [tenantId, `Tenant ${tenantId}`]);

      const projectId = project.projectId || project.id;
      const projectName = project.projectName || project.name || 'Unnamed Generation Project';
      const origin = project.origin || project.source?.origin || 'STANDALONE';
      const assessmentId = project.sourceAssessmentId || project.source?.assessmentId || null;
      const tcode = project.sourceTransactionCode || project.source?.tcode || null;
      const sysId = project.sourceSystemId || project.source?.systemContext?.systemId || null;
      const clientNum = project.sourceClient || project.source?.systemContext?.client || null;

      // Verify assessmentId foreign key if present
      let validAssessmentId = null;
      if (assessmentId) {
        const checkAsm = await client.query('SELECT id FROM assessments WHERE id = $1;', [assessmentId]);
        if (checkAsm.rowCount > 0) {
          validAssessmentId = assessmentId;
        }
      }

      await client.query(`
        INSERT INTO generation_projects (
          project_id, tenant_id, project_name, description, origin,
          source_assessment_id, source_transaction_code, source_system_id, source_client,
          target_product, target_release, target_deployment_model,
          lifecycle_status, current_phase, specification_version,
          created_by, creator_id, created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5,
          $6, $7, $8, $9,
          $10, $11, $12,
          $13, $14, $15,
          $16, $17, COALESCE($18::timestamptz, CURRENT_TIMESTAMP), CURRENT_TIMESTAMP
        )
        ON CONFLICT (project_id) DO UPDATE SET
          project_name = EXCLUDED.project_name,
          description = EXCLUDED.description,
          lifecycle_status = EXCLUDED.lifecycle_status,
          current_phase = EXCLUDED.current_phase,
          specification_version = EXCLUDED.specification_version,
          updated_at = CURRENT_TIMESTAMP;
      `, [
        projectId, tenantId, projectName, project.description || null, origin,
        validAssessmentId, tcode, sysId, clientNum,
        project.targetProduct || 'SAP S/4HANA',
        project.targetRelease || 'SAP S/4HANA 2023 On-Premise',
        project.targetDeploymentModel || 'ON_PREMISE',
        project.lifecycleStatus || 'DRAFT',
        project.currentPhase || 'PHASE_1_WORKSPACE',
        project.specificationVersion || 1,
        project.createdBy || 'Lead SAP Architect',
        project.creatorId || 'USR-CONS-01',
        project.createdAt || new Date().toISOString()
      ]);

      // Save specifications if provided in project definition
      const specs = [
        { type: 'REQUIREMENTS', content: project.requirementsSpec },
        { type: 'DATA_MODEL', content: project.dataModelSpec },
        { type: 'ARCHITECTURE', content: project.architectureSpec },
        { type: 'GENERAL', content: project.specification }
      ];

      for (const s of specs) {
        if (s.content) {
          const specVer = parseInt(String(s.content.specVersion || s.content.revision || '1').replace(/\D/g, ''), 10) || 1;
          await client.query(`
            INSERT INTO generation_specifications (project_id, spec_type, spec_version, spec_content)
            VALUES ($1, $2, $3, $4)
            ON CONFLICT (project_id, spec_type) DO UPDATE SET
              spec_content = EXCLUDED.spec_content,
              updated_at = CURRENT_TIMESTAMP;
          `, [projectId, s.type, specVer, JSON.stringify(s.content)]);
        }
      }

      // Record activity event
      const initialEvents = project.activityHistory || [
        {
          eventId: `EVT-${Date.now()}-GENESIS`,
          timestamp: project.createdAt || new Date().toISOString(),
          author: project.createdBy || 'Lead SAP Architect',
          actorId: project.creatorId || 'USR-CONS-01',
          action: 'PROJECT_CREATED',
          details: { origin, targetRelease: project.targetRelease || 'SAP S/4HANA 2023 On-Premise' },
          newStatus: project.lifecycleStatus || 'DRAFT'
        }
      ];

      for (const evt of initialEvents) {
        await client.query(`
          INSERT INTO generation_activity_events (project_id, event_id, timestamp, author, actor_id, action, details, previous_status, new_status)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9);
        `, [
          projectId,
          evt.eventId || `EVT-${Date.now()}`,
          evt.timestamp ? new Date(evt.timestamp) : new Date(),
          evt.author || 'Lead SAP Architect',
          evt.actorId || 'USR-CONS-01',
          evt.action || 'PROJECT_CREATED',
          JSON.stringify(evt.details || {}),
          evt.previousStatus || null,
          evt.newStatus || 'DRAFT'
        ]);
      }

      await client.query('COMMIT;');
      return await this.getProjectById(projectId, tenantId);
    } catch (err) {
      await client.query('ROLLBACK;');
      throw err;
    } finally {
      client.release();
    }
  }

  async getProject(projectId, tenantId = 'DEFAULT-TENANT-S21') {
    return await this.getProjectById(projectId, tenantId);
  }

  async archiveProject(projectId, userContext = null, tenantId = 'DEFAULT-TENANT-S21') {
    return await this.updateProject(projectId, {
      lifecycleStatus: 'ARCHIVED',
      status: 'ARCHIVED',
      author: userContext?.userName || 'Lead SAP Architect',
      actorId: userContext?.userId || 'USR-CONS-01',
      activityAction: 'PROJECT_ARCHIVED',
      activityDetails: { comment: 'Project archived by user.' }
    }, tenantId);
  }

  async restoreProject(projectId, userContext = null, tenantId = 'DEFAULT-TENANT-S21') {
    return await this.updateProject(projectId, {
      lifecycleStatus: 'DRAFT',
      status: 'DRAFT',
      author: userContext?.userName || 'Lead SAP Architect',
      actorId: userContext?.userId || 'USR-CONS-01',
      activityAction: 'PROJECT_RESTORED',
      activityDetails: { comment: 'Project restored from archive to active DRAFT.' }
    }, tenantId);
  }

  async duplicateProject(sourceProjectId, options = {}, userContext = null, tenantId = 'DEFAULT-TENANT-S21') {
    const sourceProject = await this.getProjectById(sourceProjectId, tenantId);
    if (!sourceProject) {
      const err = new Error(`Source project "${sourceProjectId}" was not found.`);
      err.code = 'NOT_FOUND';
      throw err;
    }

    const newName = options.newProjectName || `${sourceProject.projectName} (Copy)`;
    const newId = options.newProjectId || `${sourceProject.projectId}-COPY-${crypto.randomBytes(2).toString('hex').toUpperCase()}`;

    const duplicatePayload = {
      ...sourceProject,
      projectId: newId,
      projectName: newName,
      description: options.newDescription || sourceProject.description,
      origin: sourceProject.origin,
      sourceAssessmentId: sourceProject.sourceAssessmentId,
      sourceTransactionCode: sourceProject.sourceTransactionCode,
      sourceSystemId: sourceProject.sourceSystemId,
      sourceClient: sourceProject.sourceClient,
      targetRelease: sourceProject.targetRelease,
      targetDeploymentModel: sourceProject.targetDeploymentModel
    };

    delete duplicatePayload.artifactRegistry;
    delete duplicatePayload.validationReport;
    delete duplicatePayload.reviewRecord;
    delete duplicatePayload.activityHistory;

    return await this.createProject(duplicatePayload, tenantId);
  }

  async getProjectById(projectId, tenantId = 'DEFAULT-TENANT-S21') {
    const res = await this.pool.query(
      'SELECT * FROM generation_projects WHERE project_id = $1 AND tenant_id = $2;',
      [projectId, tenantId]
    );
    if (res.rowCount === 0) return null;

    const row = res.rows[0];
    const specRes = await this.pool.query(
      'SELECT spec_type, spec_version, spec_content FROM generation_specifications WHERE project_id = $1;',
      [projectId]
    );
    const specsByType = {};
    for (const s of specRes.rows) {
      specsByType[s.spec_type] = s.spec_content;
    }

    const eventsRes = await this.pool.query(
      'SELECT event_id, timestamp, author, actor_id, action, details, previous_status, new_status FROM generation_activity_events WHERE project_id = $1 ORDER BY timestamp ASC, id ASC;',
      [projectId]
    );

    const artifactsRes = await this.pool.query(
      'SELECT id, artifact_name, artifact_type, storage_driver, storage_path, content_hash, file_size_bytes, metadata, created_at FROM generation_artifacts WHERE project_id = $1 ORDER BY id ASC;',
      [projectId]
    );

    const artifactRegistry = {
      artifacts: {},
      generationRuns: [],
      version: 1,
      lastGeneratedAt: null
    };

    for (const art of artifactsRes.rows) {
      const meta = typeof art.metadata === 'string' ? JSON.parse(art.metadata) : (art.metadata || {});
      const artifactKey = art.artifact_name;
      artifactRegistry.artifacts[artifactKey] = {
        id: meta.id || `ART-${art.id}`,
        artifactName: art.artifact_name,
        name: art.artifact_name,
        type: art.artifact_type,
        artifactType: art.artifact_type,
        category: meta.category || (art.artifact_type.includes('ABAP') ? 'BACKEND' : 'FRONTEND'),
        layer: meta.layer || (art.artifact_type.includes('ABAP') ? 'ABAP' : 'UI5'),
        storagePath: art.storage_path,
        path: art.storage_path,
        content: meta.content || '',
        checksum: art.content_hash,
        contentHash: art.content_hash,
        fileSizeBytes: Number(art.file_size_bytes) || 0,
        manualEdit: meta.manualEdit || false,
        version: meta.version || 1,
        createdAt: art.created_at?.toISOString ? art.created_at.toISOString() : art.created_at,
        metadata: meta
      };
      if (art.created_at) {
        artifactRegistry.lastGeneratedAt = art.created_at?.toISOString ? art.created_at.toISOString() : art.created_at;
      }
    }

    return {
      projectId: row.project_id,
      id: row.project_id,
      projectName: row.project_name,
      name: row.project_name,
      description: row.description,
      origin: row.origin,
      source: {
        origin: row.origin,
        assessmentId: row.source_assessment_id,
        tcode: row.source_transaction_code,
        systemContext: {
          systemId: row.source_system_id,
          client: row.source_client,
          targetRelease: row.target_release
        }
      },
      sourceAssessmentId: row.source_assessment_id,
      sourceTransactionCode: row.source_transaction_code,
      sourceSystemId: row.source_system_id,
      sourceClient: row.source_client,
      targetProduct: row.target_product,
      targetRelease: row.target_release,
      targetDeploymentModel: row.target_deployment_model,
      lifecycleStatus: row.lifecycle_status,
      currentPhase: row.current_phase,
      specificationVersion: row.specification_version,
      specification: specsByType['GENERAL'] || specsByType['ARCHITECTURE'] || { revision: 'v1' },
      requirementsSpec: specsByType['REQUIREMENTS'] || null,
      dataModelSpec: specsByType['DATA_MODEL'] || null,
      architectureSpec: specsByType['ARCHITECTURE'] || null,
      artifactRegistry,
      activityHistory: eventsRes.rows.map(e => ({
        eventId: e.event_id,
        timestamp: e.timestamp.toISOString(),
        author: e.author,
        actorId: e.actor_id,
        action: e.action,
        details: e.details,
        previousStatus: e.previous_status,
        newStatus: e.new_status
      })),
      createdBy: row.created_by,
      creatorId: row.creator_id,
      createdAt: row.created_at.toISOString(),
      updatedAt: row.updated_at.toISOString()
    };
  }

  async listProjects(filter = {}, tenantId = 'DEFAULT-TENANT-S21') {
    let query = 'SELECT project_id FROM generation_projects WHERE tenant_id = $1';
    const params = [tenantId];

    if (filter.lifecycleStatus || filter.status) {
      params.push(filter.lifecycleStatus || filter.status);
      query += ` AND lifecycle_status = $${params.length}`;
    }
    if (filter.origin) {
      params.push(filter.origin);
      query += ` AND origin = $${params.length}`;
    }
    if (filter.search) {
      params.push(`%${filter.search}%`);
      query += ` AND (project_name ILIKE $${params.length} OR description ILIKE $${params.length} OR source_transaction_code ILIKE $${params.length})`;
    }

    query += ' ORDER BY created_at DESC;';
    const res = await this.pool.query(query, params);

    const projects = [];
    for (const r of res.rows) {
      const p = await this.getProjectById(r.project_id, tenantId);
      if (p) projects.push(p);
    }
    return projects;
  }

  async updateProject(projectId, updates, tenantId = 'DEFAULT-TENANT-S21') {
    const existing = await this.getProjectById(projectId, tenantId);
    if (!existing) return null;

    const client = await this._getClient();
    try {
      await client.query('BEGIN;');

      const newName = updates.projectName || updates.name || existing.projectName;
      const newDesc = updates.description !== undefined ? updates.description : existing.description;
      const newStatus = updates.lifecycleStatus || updates.status || existing.lifecycleStatus;
      const newPhase = updates.currentPhase || existing.currentPhase;
      const newSpecVer = updates.specificationVersion || (existing.specificationVersion + 1);

      await client.query(`
        UPDATE generation_projects SET
          project_name = $1,
          description = $2,
          lifecycle_status = $3,
          current_phase = $4,
          specification_version = $5,
          updated_at = CURRENT_TIMESTAMP
        WHERE project_id = $6 AND tenant_id = $7;
      `, [newName, newDesc, newStatus, newPhase, newSpecVer, projectId, tenantId]);

      if (updates.specification) {
        await client.query(`
          INSERT INTO generation_specifications (project_id, spec_type, spec_version, spec_content)
          VALUES ($1, 'GENERAL', $2, $3)
          ON CONFLICT (project_id, spec_type) DO UPDATE SET
            spec_version = EXCLUDED.spec_version,
            spec_content = EXCLUDED.spec_content,
            updated_at = CURRENT_TIMESTAMP;
        `, [projectId, newSpecVer, JSON.stringify(updates.specification)]);
      }

      if (updates.requirementsSpec) {
        const reqVer = parseInt(String(updates.requirementsSpec.specVersion || 1).replace(/\D/g, ''), 10) || 1;
        await client.query(`
          INSERT INTO generation_specifications (project_id, spec_type, spec_version, spec_content)
          VALUES ($1, 'REQUIREMENTS', $2, $3)
          ON CONFLICT (project_id, spec_type) DO UPDATE SET
            spec_version = EXCLUDED.spec_version,
            spec_content = EXCLUDED.spec_content,
            updated_at = CURRENT_TIMESTAMP;
        `, [projectId, reqVer, JSON.stringify(updates.requirementsSpec)]);
      }

      if (updates.dataModelSpec) {
        const dmVer = parseInt(String(updates.dataModelSpec.specVersion || 1).replace(/\D/g, ''), 10) || 1;
        await client.query(`
          INSERT INTO generation_specifications (project_id, spec_type, spec_version, spec_content)
          VALUES ($1, 'DATA_MODEL', $2, $3)
          ON CONFLICT (project_id, spec_type) DO UPDATE SET
            spec_version = EXCLUDED.spec_version,
            spec_content = EXCLUDED.spec_content,
            updated_at = CURRENT_TIMESTAMP;
        `, [projectId, dmVer, JSON.stringify(updates.dataModelSpec)]);
      }

      if (updates.architectureSpec) {
        const archVer = parseInt(String(updates.architectureSpec.specVersion || 1).replace(/\D/g, ''), 10) || 1;
        await client.query(`
          INSERT INTO generation_specifications (project_id, spec_type, spec_version, spec_content)
          VALUES ($1, 'ARCHITECTURE', $2, $3)
          ON CONFLICT (project_id, spec_type) DO UPDATE SET
            spec_version = EXCLUDED.spec_version,
            spec_content = EXCLUDED.spec_content,
            updated_at = CURRENT_TIMESTAMP;
        `, [projectId, archVer, JSON.stringify(updates.architectureSpec)]);
      }

      // Record activity event
      await client.query(`
        INSERT INTO generation_activity_events (project_id, event_id, timestamp, author, actor_id, action, details, previous_status, new_status)
        VALUES ($1, $2, CURRENT_TIMESTAMP, $3, $4, $5, $6, $7, $8);
      `, [
        projectId,
        `EVT-${Date.now()}`,
        updates.author || 'Lead SAP Architect',
        updates.actorId || 'USR-CONS-01',
        updates.activityAction || 'PROJECT_UPDATED',
        JSON.stringify(updates.activityDetails || { updatedFields: Object.keys(updates) }),
        existing.lifecycleStatus,
        newStatus
      ]);

      await client.query('COMMIT;');
      return await this.getProjectById(projectId, tenantId);
    } catch (err) {
      await client.query('ROLLBACK;');
      throw err;
    } finally {
      client.release();
    }
  }

  async deleteProject(projectId, tenantId = 'DEFAULT-TENANT-S21') {
    const res = await this.pool.query(
      'DELETE FROM generation_projects WHERE project_id = $1 AND tenant_id = $2 RETURNING project_id;',
      [projectId, tenantId]
    );
    return res.rowCount > 0;
  }

  async saveSpecification(projectId, specType, specVersion = 1, specContent = {}) {
    const res = await this.pool.query(`
      INSERT INTO generation_specifications (project_id, spec_type, spec_version, spec_content, updated_at)
      VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
      ON CONFLICT (project_id, spec_type) DO UPDATE SET
        spec_version = EXCLUDED.spec_version,
        spec_content = EXCLUDED.spec_content,
        updated_at = CURRENT_TIMESTAMP
      RETURNING id, project_id, spec_type, spec_version, spec_content, updated_at;
    `, [projectId, specType, specVersion, JSON.stringify(specContent)]);
    return res.rows[0];
  }

  async getSpecification(projectId, specType) {
    const res = await this.pool.query(
      'SELECT project_id, spec_type, spec_version, spec_content, updated_at FROM generation_specifications WHERE project_id = $1 AND spec_type = $2;',
      [projectId, specType]
    );
    if (res.rowCount === 0) return null;
    return res.rows[0];
  }

  async getActivityHistory(projectId) {
    const res = await this.pool.query(
      'SELECT event_id, timestamp, author, actor_id, action, details, previous_status, new_status FROM generation_activity_events WHERE project_id = $1 ORDER BY timestamp ASC, id ASC;',
      [projectId]
    );
    return res.rows.map(r => ({
      eventId: r.event_id,
      timestamp: r.timestamp.toISOString ? r.timestamp.toISOString() : r.timestamp,
      author: r.author,
      actorId: r.actor_id,
      action: r.action,
      details: r.details,
      previousStatus: r.previous_status,
      newStatus: r.new_status
    }));
  }

  async saveArtifactRecord(projectId, artifactRecord) {
    const res = await this.pool.query(`
      INSERT INTO generation_artifacts (
        project_id, artifact_name, artifact_type, storage_driver,
        storage_path, content_hash, file_size_bytes, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING id, artifact_name, content_hash, storage_path;
    `, [
      projectId,
      artifactRecord.artifactName,
      artifactRecord.artifactType || 'GEN_CODE',
      artifactRecord.storageDriver || 'LOCAL_FS',
      artifactRecord.storagePath,
      artifactRecord.contentHash,
      artifactRecord.fileSizeBytes,
      JSON.stringify(artifactRecord.metadata || {})
    ]);
    return res.rows[0];
  }

  async listArtifacts(projectId) {
    const res = await this.pool.query(
      'SELECT * FROM generation_artifacts WHERE project_id = $1 ORDER BY created_at DESC;',
      [projectId]
    );
    return res.rows;
  }
}

export default GenerationProjectRepository;
