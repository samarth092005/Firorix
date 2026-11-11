import DatabasePool from '../pool.js';

export class CatalogueRepository {
  constructor(pool = DatabasePool) {
    this.pool = pool;
  }

  async recordSourceImport(source) {
    const res = await this.pool.query(`
      INSERT INTO fiori_catalog_sources (
        source_name, source_type, source_version, target_release,
        record_count, content_hash, status, summary, imported_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, COALESCE($9::timestamptz, CURRENT_TIMESTAMP))
      RETURNING id, source_name, source_version, record_count, status, imported_at;
    `, [
      source.sourceName || 'FAL_IMPORT',
      source.sourceType || 'OFFICIAL_FAL_EXPORT',
      source.sourceVersion || 'S4HANA_2023_FPS02_OFFICIAL',
      source.targetRelease || 'SAP S/4HANA 2023 On-Premise',
      source.recordCount || 0,
      source.contentHash || 'NO_HASH',
      source.status || 'SUCCESS',
      JSON.stringify(source.summary || {}),
      source.importedAt || new Date().toISOString()
    ]);
    return res.rows[0];
  }

  async upsertApp(app) {
    const appId = app.appId || app.fioriId || app.id;
    if (!appId) throw new Error('Cannot upsert catalogue app without valid appId');

    const client = await this.pool.getClient();
    try {
      await client.query('BEGIN;');

      await client.query(`
        INSERT INTO fiori_catalog_apps (
          app_id, app_name, description, app_type, ui_technology,
          business_process, line_of_business, product_version,
          software_component, business_role, business_catalog, technical_catalog,
          sapui5_component, bsp_application_url, documentation_url,
          provenance, retrieval_timestamp, created_at
        ) VALUES (
          $1, $2, $3, $4, $5,
          $6, $7, $8,
          $9, $10, $11, $12,
          $13, $14, $15,
          $16, $17, CURRENT_TIMESTAMP
        )
        ON CONFLICT (app_id) DO UPDATE SET
          app_name = EXCLUDED.app_name,
          description = EXCLUDED.description,
          app_type = EXCLUDED.app_type,
          ui_technology = EXCLUDED.ui_technology,
          business_process = EXCLUDED.business_process,
          line_of_business = EXCLUDED.line_of_business,
          product_version = EXCLUDED.product_version,
          software_component = EXCLUDED.software_component,
          business_role = EXCLUDED.business_role,
          business_catalog = EXCLUDED.business_catalog,
          technical_catalog = EXCLUDED.technical_catalog,
          sapui5_component = EXCLUDED.sapui5_component,
          bsp_application_url = EXCLUDED.bsp_application_url,
          documentation_url = EXCLUDED.documentation_url,
          provenance = EXCLUDED.provenance,
          retrieval_timestamp = EXCLUDED.retrieval_timestamp;
      `, [
        appId,
        app.appName || 'Unnamed Fiori App',
        app.description || null,
        app.appType || 'Transactional',
        app.uiTechnology || 'SAP Fiori elements',
        app.businessProcess || null,
        app.lineOfBusiness || null,
        app.productVersion || 'SAP S/4HANA 2023',
        app.softwareComponent || null,
        app.businessRole || null,
        app.businessCatalog || null,
        app.technicalCatalog || null,
        app.sapui5Component || null,
        app.bspApplicationUrl || null,
        app.documentationUrl || null,
        app.provenance || 'OFFICIAL_CATALOGUE_LIVE',
        app.retrievalTimestamp ? new Date(app.retrievalTimestamp) : null
      ]);

      // Handle OData Services
      if (Array.isArray(app.odataServices)) {
        for (const srv of app.odataServices) {
          const srvName = typeof srv === 'string' ? srv : srv.serviceName;
          if (srvName) {
            await client.query(`
              INSERT INTO fiori_catalog_services (app_id, service_name, service_type)
              VALUES ($1, $2, $3)
              ON CONFLICT (app_id, service_name) DO NOTHING;
            `, [appId, srvName, typeof srv === 'object' && srv.serviceType ? srv.serviceType : 'ODATA']);
          }
        }
      }

      // Handle TCode mappings if present
      if (app.leadingTCode) {
        await client.query(`
          INSERT INTO fiori_catalog_tcode_mappings (app_id, tcode, is_leading)
          VALUES ($1, $2, true)
          ON CONFLICT (app_id, tcode) DO UPDATE SET is_leading = true;
        `, [appId, app.leadingTCode]);
      }
      if (Array.isArray(app.relatedTCodes)) {
        for (const tcode of app.relatedTCodes) {
          await client.query(`
            INSERT INTO fiori_catalog_tcode_mappings (app_id, tcode, is_leading)
            VALUES ($1, $2, false)
            ON CONFLICT (app_id, tcode) DO NOTHING;
          `, [appId, tcode]);
        }
      }

      await client.query('COMMIT;');
      return await this.getAppById(appId);
    } catch (err) {
      await client.query('ROLLBACK;');
      throw err;
    } finally {
      client.release();
    }
  }

  async getAppById(appId) {
    const res = await this.pool.query('SELECT * FROM fiori_catalog_apps WHERE app_id = $1;', [appId]);
    if (res.rowCount === 0) return null;

    const row = res.rows[0];
    const srvRes = await this.pool.query('SELECT service_name, service_type FROM fiori_catalog_services WHERE app_id = $1;', [appId]);
    const tcodeRes = await this.pool.query('SELECT tcode, is_leading FROM fiori_catalog_tcode_mappings WHERE app_id = $1;', [appId]);

    const leadingMap = tcodeRes.rows.find(t => t.is_leading);
    const related = tcodeRes.rows.filter(t => !t.is_leading).map(t => t.tcode);

    return {
      appId: row.app_id,
      fioriId: row.app_id,
      appName: row.app_name,
      description: row.description,
      appType: row.app_type,
      uiTechnology: row.ui_technology,
      businessProcess: row.business_process,
      lineOfBusiness: row.line_of_business,
      productVersion: row.product_version,
      softwareComponent: row.software_component,
      businessRole: row.business_role,
      businessCatalog: row.business_catalog,
      technicalCatalog: row.technical_catalog,
      odataServices: srvRes.rows.map(s => s.service_name),
      leadingTCode: leadingMap ? leadingMap.tcode : null,
      relatedTCodes: related,
      sapui5Component: row.sapui5_component,
      bspApplicationUrl: row.bsp_application_url,
      documentationUrl: row.documentation_url,
      provenance: row.provenance,
      retrievalTimestamp: row.retrieval_timestamp ? row.retrieval_timestamp.toISOString() : null
    };
  }

  async listApps(filter = {}) {
    let query = 'SELECT app_id FROM fiori_catalog_apps WHERE 1=1';
    const params = [];

    if (filter.appType) {
      params.push(filter.appType);
      query += ` AND app_type = $${params.length}`;
    }
    if (filter.uiTechnology) {
      params.push(filter.uiTechnology);
      query += ` AND ui_technology = $${params.length}`;
    }
    if (filter.search) {
      params.push(`%${filter.search}%`);
      query += ` AND (app_id ILIKE $${params.length} OR app_name ILIKE $${params.length} OR description ILIKE $${params.length})`;
    }

    query += ' ORDER BY app_id ASC';
    if (filter.limit) {
      params.push(parseInt(filter.limit, 10));
      query += ` LIMIT $${params.length}`;
    }

    const res = await this.pool.query(query, params);
    const items = [];
    for (const row of res.rows) {
      const app = await this.getAppById(row.app_id);
      if (app) items.push(app);
    }
    return items;
  }

  async getStats() {
    const totalRes = await this.pool.query('SELECT COUNT(*) FROM fiori_catalog_apps;');
    const sourceRes = await this.pool.query('SELECT * FROM fiori_catalog_sources ORDER BY imported_at DESC LIMIT 1;');
    const typesRes = await this.pool.query('SELECT app_type, COUNT(*) as count FROM fiori_catalog_apps GROUP BY app_type;');

    const recordsByAppType = {};
    for (const r of typesRes.rows) {
      recordsByAppType[r.app_type] = parseInt(r.count, 10);
    }

    return {
      totalRecords: parseInt(totalRes.rows[0].count, 10),
      uniqueApplicationIds: parseInt(totalRes.rows[0].count, 10),
      recordsByAppType,
      lastImport: sourceRes.rows[0] || null
    };
  }

  async getTCodeMappings(tcode) {
    const res = await this.pool.query(`
      SELECT m.app_id, m.tcode, m.is_leading, a.app_name, a.app_type, a.ui_technology
      FROM fiori_catalog_tcode_mappings m
      JOIN fiori_catalog_apps a ON m.app_id = a.app_id
      WHERE m.tcode ILIKE $1;
    `, [tcode]);
    return res.rows;
  }
}

export default CatalogueRepository;
