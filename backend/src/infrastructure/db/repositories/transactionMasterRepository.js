import DatabasePool from '../pool.js';

export class TransactionMasterRepository {
  constructor(pool = DatabasePool) {
    this.pool = pool;
  }

  async saveSnapshot(snapshotData, tenantId = 'DEFAULT-TENANT-S21', systemProfileId = null) {
    const effectiveProfileId = systemProfileId || `${tenantId}-S21-200`;
    const client = await this.pool.getClient();
    try {
      await client.query('BEGIN;');

      // Ensure tenant
      await client.query(`
        INSERT INTO tenants (tenant_id, name)
        VALUES ($1, $2)
        ON CONFLICT (tenant_id) DO NOTHING;
      `, [tenantId, `Tenant ${tenantId}`]);

      // Ensure system profile
      await client.query(`
        INSERT INTO sap_system_profiles (id, tenant_id, system_id, client, release, description)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (id) DO UPDATE SET updated_at = CURRENT_TIMESTAMP;
      `, [effectiveProfileId, tenantId, 'S21', '200', 'SAP S/4HANA 2023 On-Premise', 'SAP S/4HANA S21 Client 200']);

      const records = snapshotData.records || (snapshotData.transactions ? Object.values(snapshotData.transactions) : []);

      // Create snapshot record
      const snapRes = await client.query(`
        INSERT INTO transaction_master_snapshots (
          tenant_id, system_profile_id, snapshot_version, provenance, source_tables, total_transactions
        ) VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id;
      `, [
        tenantId,
        effectiveProfileId,
        snapshotData.version || 'Fiorify_TX_MASTER_V1',
        snapshotData.provenance || 'AUTHORITATIVE_DDIC_SNAPSHOT',
        ['TSTC', 'TSTCT', 'TADIR', 'TDEVC', 'CVERS'],
        records.length
      ]);
      const snapshotId = snapRes.rows[0].id;

      // Ingest transaction records
      for (const rec of records) {
        await client.query(`
          INSERT INTO transaction_master_records (
            snapshot_id, tenant_id, system_profile_id, tcode, description,
            program, screen_number, package_name, original_system,
            software_component, classification, system_id, client,
            language, complexity, has_user_exits, badi_count, screen_count
          ) VALUES (
            $1, $2, $3, $4, $5,
            $6, $7, $8, $9,
            $10, $11, $12, $13,
            $14, $15, $16, $17, $18
          )
          ON CONFLICT (tenant_id, system_profile_id, tcode) DO UPDATE SET
            snapshot_id = EXCLUDED.snapshot_id,
            description = EXCLUDED.description,
            program = EXCLUDED.program,
            screen_number = EXCLUDED.screen_number,
            package_name = EXCLUDED.package_name,
            complexity = EXCLUDED.complexity,
            has_user_exits = EXCLUDED.has_user_exits,
            badi_count = EXCLUDED.badi_count,
            screen_count = EXCLUDED.screen_count;
        `, [
          snapshotId, tenantId, effectiveProfileId, rec.tcode, rec.description || null,
          rec.program || null, rec.screenNumber || rec.screen || null, rec.packageName || rec.package || null,
          rec.originalSystem || 'SAP', rec.softwareComponent || 'S4CORE', rec.classification || 'STANDARD',
          rec.systemId || 'S21', rec.client || '200', rec.language || 'EN',
          rec.complexity || 'MEDIUM', rec.hasUserExits || false, rec.badiCount || 0, rec.screenCount || 1
        ]);
      }

      await client.query('COMMIT;');
      return {
        snapshotId,
        totalRecords: records.length,
        version: snapshotData.version
      };
    } catch (err) {
      await client.query('ROLLBACK;');
      throw err;
    } finally {
      client.release();
    }
  }

  async getRecordByTCode(tcode, tenantId = 'DEFAULT-TENANT-S21', systemProfileId = null) {
    const effectiveProfileId = systemProfileId || `${tenantId}-S21-200`;
    const res = await this.pool.query(`
      SELECT * FROM transaction_master_records
      WHERE tcode ILIKE $1 AND tenant_id = $2 AND system_profile_id = $3;
    `, [tcode, tenantId, effectiveProfileId]);

    if (res.rowCount === 0) return null;
    const r = res.rows[0];
    return {
      tcode: r.tcode,
      description: r.description,
      program: r.program,
      screenNumber: r.screen_number,
      packageName: r.package_name,
      originalSystem: r.original_system,
      softwareComponent: r.software_component,
      classification: r.classification,
      systemId: r.system_id,
      client: r.client,
      language: r.language,
      complexity: r.complexity,
      hasUserExits: r.has_user_exits,
      badiCount: r.badi_count,
      screenCount: r.screen_count
    };
  }

  async search(query, tenantId = 'DEFAULT-TENANT-S21', systemProfileId = null) {
    const effectiveProfileId = systemProfileId || `${tenantId}-S21-200`;
    const res = await this.pool.query(`
      SELECT * FROM transaction_master_records
      WHERE tenant_id = $1 AND system_profile_id = $2
        AND (tcode ILIKE $3 OR description ILIKE $3)
      ORDER BY tcode ASC LIMIT 50;
    `, [tenantId, effectiveProfileId, `%${query}%`]);

    return res.rows.map(r => ({
      tcode: r.tcode,
      description: r.description,
      program: r.program,
      screenNumber: r.screen_number,
      packageName: r.package_name,
      complexity: r.complexity
    }));
  }

  async listRecords(tenantId = 'DEFAULT-TENANT-S21', systemProfileId = null) {
    const effectiveProfileId = systemProfileId || `${tenantId}-S21-200`;
    const res = await this.pool.query(`
      SELECT * FROM transaction_master_records
      WHERE tenant_id = $1 AND system_profile_id = $2
      ORDER BY tcode ASC;
    `, [tenantId, effectiveProfileId]);

    return res.rows.map(r => ({
      tcode: r.tcode,
      description: r.description,
      program: r.program,
      screenNumber: r.screen_number,
      packageName: r.package_name,
      originalSystem: r.original_system,
      softwareComponent: r.software_component,
      classification: r.classification,
      systemId: r.system_id,
      client: r.client,
      language: r.language,
      complexity: r.complexity,
      hasUserExits: r.has_user_exits,
      badiCount: r.badi_count,
      screenCount: r.screen_count
    }));
  }
}

export default TransactionMasterRepository;
