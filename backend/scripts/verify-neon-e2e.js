import DatabasePool from '../src/infrastructure/db/pool.js';
import { SecurityAuditLogger, SECURITY_ACTIONS } from '../src/infrastructure/security/securityAuditLogger.js';

async function main() {
  console.log('[E2E-TEST] Starting Neon PostgreSQL End-to-End verification...');
  
  // 1. Verify Pool Connection
  const client = await DatabasePool.getClient();
  console.log('[E2E-TEST] Connected to DatabasePool successfully.');
  
  try {
    const versionRes = await client.query('SELECT version(), current_database(), current_user;');
    console.log('[E2E-TEST] Neon Database Info:', {
      database: versionRes.rows[0].current_database,
      user: versionRes.rows[0].current_user,
      version: versionRes.rows[0].version.split(' on ')[0]
    });

    const testTenantA = 'neon-test-tenant-alpha';
    const testTenantB = 'neon-test-tenant-beta';

    // Ensure tenants exist in tenants table for foreign key constraints
    await client.query(`
      INSERT INTO tenants (tenant_id, name, status) 
      VALUES ($1, 'Neon Test Tenant Alpha', 'ACTIVE'), ($2, 'Neon Test Tenant Beta', 'ACTIVE')
      ON CONFLICT (tenant_id) DO NOTHING;
    `, [testTenantA, testTenantB]);
    console.log('[E2E-TEST] Test tenants registered.');

    // 2. Set up unprivileged app role to test RLS kernel enforcement
    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'fiorify_app_user') THEN
          CREATE ROLE fiorify_app_user NOBYPASSRLS;
        END IF;
      END $$;
      GRANT fiorify_app_user TO neondb_owner;
      GRANT USAGE ON SCHEMA public TO fiorify_app_user;
      GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO fiorify_app_user;
    `);

    // 3. Insert test assessment as Tenant Alpha
    const testAssessmentId = 'asm-neon-e2e-001';
    await client.query(`
      INSERT INTO assessments (
        id, tenant_id, transaction_code, description, recommendation_action, 
        recommendation_confidence, lifecycle_status, fit_gap_score
      )
      VALUES ($1, $2, 'ME21N', 'Purchase Order Creation', 'RECOMMEND_STANDARD', 'HIGH', 'DRAFT', 85.5)
      ON CONFLICT (id) DO UPDATE SET fit_gap_score = 85.5;
    `, [testAssessmentId, testTenantA]);
    console.log('[E2E-TEST] Inserted assessment for Tenant Alpha.');

    // 4. Test RLS as fiorify_app_user (NOBYPASSRLS)
    await client.query("SET ROLE fiorify_app_user;");

    // Query as Tenant Alpha -> should find 1 row
    await client.query("SELECT set_config('app.current_tenant', $1, false);", [testTenantA]);
    let resAlpha = await client.query('SELECT id, tenant_id, transaction_code FROM assessments WHERE id = $1;', [testAssessmentId]);
    console.log('[E2E-TEST] Query as Tenant Alpha found rows:', resAlpha.rows.length);
    if (resAlpha.rows.length !== 1) {
      throw new Error(`Expected 1 row for Tenant Alpha, found ${resAlpha.rows.length}`);
    }

    // Switch context to Tenant Beta -> RLS blocks and returns 0 rows!
    await client.query("SELECT set_config('app.current_tenant', $1, false);", [testTenantB]);
    let resBeta = await client.query('SELECT id, tenant_id, transaction_code FROM assessments WHERE id = $1;', [testAssessmentId]);
    console.log('[E2E-TEST] Query as Tenant Beta (RLS isolation) found rows:', resBeta.rows.length);
    if (resBeta.rows.length !== 0) {
      throw new Error(`RLS breach! Tenant Beta could read Tenant Alpha record!`);
    }
    console.log('[E2E-TEST] Row-Level Security tenant isolation verified: ZERO cross-tenant leakage.');

    // Reset role back to owner
    await client.query("RESET ROLE;");

    // 5. Test Security Audit Logger
    console.log('[E2E-TEST] Testing SecurityAuditLogger against Neon...');
    const auditLogger = new SecurityAuditLogger();
    const event = await auditLogger.logEvent({
      actor: 'system-verifier',
      tenantId: testTenantA,
      action: SECURITY_ACTIONS.SYSTEM_TESTED,
      resource: 'silent-glade-07418707',
      outcome: 'SUCCESS',
      details: { test: true, engine: 'Neon PostgreSQL 18.7' }
    });
    console.log('[E2E-TEST] Security audit event written successfully with hash:', event.integrity_hash);

    // Clean up test records
    await client.query('DELETE FROM assessments WHERE id = $1;', [testAssessmentId]);
    await client.query('DELETE FROM security_audit_events WHERE tenant_id = $1;', [testTenantA]);
    await client.query('DELETE FROM tenants WHERE tenant_id IN ($1, $2);', [testTenantA, testTenantB]);
    console.log('[E2E-TEST] Test data cleaned up.');

    console.log('[E2E-TEST] ALL NEON POSTGRESQL E2E CHECKS PASSED SUCCESSFULLY!');
  } finally {
    client.release();
    await DatabasePool.close();
  }
}

main().catch(err => {
  console.error('[E2E-TEST] ERROR:', err);
  process.exit(1);
});
