/**
 * Fiorify — Post-Hardening RLS & Tenant Isolation Test
 *
 * Requirements:
 * - Must run as the restricted application role (fiorify_app) with NOBYPASSRLS.
 * - Must NOT rely on application WHERE tenant_id filters (tests kernel RLS enforcement).
 * - Tests SELECT, INSERT, UPDATE, DELETE isolation between Tenant Alpha and Tenant Beta.
 * - Tests WITH CHECK policy preventing tenant spoofing on INSERT.
 * - Tests all 5 tenant-scoped tables.
 */

import DatabasePool from '../src/infrastructure/db/pool.js';

async function runSecurityAudit() {
  console.log('================================================================');
  console.log(' FIORIFY — POSTGRESQL RLS & APPLICATION ROLE SECURITY AUDIT    ');
  console.log('================================================================');

  const pool = await DatabasePool.getPool();

  // 1. Verify Connected Role & Privileges
  const client = await pool.connect();
  let roleInfo;
  try {
    const res = await client.query(`
      SELECT 
        current_user,
        current_database(),
        r.rolsuper,
        r.rolcreaterole,
        r.rolcreatedb,
        r.rolbypassrls
      FROM pg_roles r 
      WHERE r.rolname = current_user;
    `);
    roleInfo = res.rows[0];
  } finally {
    client.release();
  }

  console.log('[AUDIT-ROLE] Runtime User:', roleInfo.current_user);
  console.log('[AUDIT-ROLE] Database:', roleInfo.current_database);
  console.log('[AUDIT-ROLE] Is Superuser:', roleInfo.rolsuper);
  console.log('[AUDIT-ROLE] Has BypassRLS:', roleInfo.rolbypassrls);

  if (roleInfo.current_user !== 'fiorify_app') {
    throw new Error(`CRITICAL: Expected runtime user 'fiorify_app', found '${roleInfo.current_user}'`);
  }
  if (roleInfo.rolsuper === true) {
    throw new Error('CRITICAL: Application role must not be a superuser!');
  }
  if (roleInfo.rolbypassrls === true) {
    throw new Error('CRITICAL: Application role must have NOBYPASSRLS!');
  }
  console.log('[AUDIT-ROLE] PASS: Application role fiorify_app verified with least privileges and NOBYPASSRLS.\n');

  // 2. Setup Test Tenants
  const TENANT_A = 'TENANT_ALPHA_SEC';
  const TENANT_B = 'TENANT_BETA_SEC';

  const setupClient = await pool.connect();
  try {
    await setupClient.query(`
      INSERT INTO tenants (tenant_id, name, status)
      VALUES ($1, 'Security Audit Tenant Alpha', 'ACTIVE'),
             ($2, 'Security Audit Tenant Beta', 'ACTIVE')
      ON CONFLICT (tenant_id) DO NOTHING;
    `, [TENANT_A, TENANT_B]);
  } finally {
    setupClient.release();
  }

  // Helper to run query in tenant context using withTenantClient
  async function runInTenant(tenantId, queryText, params = []) {
    return await DatabasePool.withTenantClient(tenantId, async (tClient) => {
      return await tClient.query(queryText, params);
    });
  }

  console.log('--- Testing Kernel RLS across all 5 Tenant-Scoped Tables ---');

  // TEST 1: assessments
  console.log('\n[1/5] Testing table: assessments');
  const asmId = `ASM-RLS-${Date.now()}`;
  
  // Tenant Alpha inserts
  await runInTenant(TENANT_A, `
    INSERT INTO assessments (id, tenant_id, transaction_code, description, recommendation_action, recommendation_confidence)
    VALUES ($1, $2, 'ME21N', 'Purchase Order', 'RECOMMEND_STANDARD', 'HIGH');
  `, [asmId, TENANT_A]);

  // Tenant Alpha reads (WITHOUT tenant filter)
  const asmReadA = await runInTenant(TENANT_A, 'SELECT id, tenant_id FROM assessments WHERE id = $1;', [asmId]);
  if (asmReadA.rows.length !== 1) throw new Error('Tenant Alpha failed to read its own assessment');
  console.log('  ✓ Tenant Alpha read authorized: 1 row returned');

  // Tenant Beta reads (WITHOUT tenant filter) -> MUST return 0 rows by RLS
  const asmReadB = await runInTenant(TENANT_B, 'SELECT id, tenant_id FROM assessments WHERE id = $1;', [asmId]);
  if (asmReadB.rows.length !== 0) throw new Error('SECURITY BREACH: Tenant Beta read Tenant Alpha assessment!');
  console.log('  ✓ Tenant Beta read blocked by RLS: 0 rows returned');

  // Tenant Beta updates -> MUST update 0 rows by RLS
  const asmUpdB = await runInTenant(TENANT_B, 'UPDATE assessments SET description = $1 WHERE id = $2;', ['HACKED', asmId]);
  if (asmUpdB.rowCount !== 0) throw new Error('SECURITY BREACH: Tenant Beta updated Tenant Alpha assessment!');
  console.log('  ✓ Tenant Beta update blocked by RLS: 0 rows updated');

  // Tenant Beta deletes -> MUST delete 0 rows by RLS
  const asmDelB = await runInTenant(TENANT_B, 'DELETE FROM assessments WHERE id = $1;', [asmId]);
  if (asmDelB.rowCount !== 0) throw new Error('SECURITY BREACH: Tenant Beta deleted Tenant Alpha assessment!');
  console.log('  ✓ Tenant Beta delete blocked by RLS: 0 rows deleted');

  // Tenant Beta spoofed INSERT -> WITH CHECK policy must reject
  let spoofBlocked = false;
  try {
    await runInTenant(TENANT_B, `
      INSERT INTO assessments (id, tenant_id, transaction_code, description, recommendation_action, recommendation_confidence)
      VALUES ($1, $2, 'VA01', 'Spoofed', 'RECOMMEND_STANDARD', 'HIGH');
    `, [`ASM-SPOOF-${Date.now()}`, TENANT_A]); // Inserting with Tenant Alpha ID while session is Tenant Beta
  } catch (err) {
    if (err.message.includes('row-level security policy') || err.message.includes('violates row-level security')) {
      spoofBlocked = true;
    } else {
      throw err;
    }
  }
  if (!spoofBlocked) throw new Error('SECURITY BREACH: Tenant Beta successfully spoofed Tenant Alpha on INSERT!');
  console.log('  ✓ Cross-tenant INSERT spoofing blocked by WITH CHECK policy');

  // TEST 2: security_audit_events
  console.log('\n[2/5] Testing table: security_audit_events');
  const evtId = `EVT-RLS-${Date.now()}`;
  await runInTenant(TENANT_A, `
    INSERT INTO security_audit_events (event_id, tenant_id, actor, action, resource, outcome, previous_hash, integrity_hash)
    VALUES ($1, $2, 'admin_a', 'LOGIN', 'auth', 'SUCCESS', 'GENESIS', 'hash_a');
  `, [evtId, TENANT_A]);

  const evtReadA = await runInTenant(TENANT_A, 'SELECT event_id FROM security_audit_events WHERE event_id = $1;', [evtId]);
  if (evtReadA.rows.length !== 1) throw new Error('Tenant Alpha failed to read audit event');
  const evtReadB = await runInTenant(TENANT_B, 'SELECT event_id FROM security_audit_events WHERE event_id = $1;', [evtId]);
  if (evtReadB.rows.length !== 0) throw new Error('SECURITY BREACH: Tenant Beta read Tenant Alpha audit event!');
  console.log('  ✓ Audit trail isolation verified: 0 rows visible to cross-tenant');

  // TEST 3: generation_handoffs
  console.log('\n[3/5] Testing table: generation_handoffs');
  const handoffId = `HO-RLS-${Date.now()}`;
  await runInTenant(TENANT_A, `
    INSERT INTO generation_handoffs (handoff_id, tenant_id, tcode, classification, approval_status)
    VALUES ($1, $2, 'ME21N', 'CUSTOM', 'DRAFT');
  `, [handoffId, TENANT_A]);

  const hoReadB = await runInTenant(TENANT_B, 'SELECT handoff_id FROM generation_handoffs WHERE handoff_id = $1;', [handoffId]);
  if (hoReadB.rows.length !== 0) throw new Error('SECURITY BREACH: Tenant Beta read Tenant Alpha handoff!');
  console.log('  ✓ Generation handoff isolation verified: 0 rows visible to cross-tenant');

  // TEST 4: generation_projects
  console.log('\n[4/5] Testing table: generation_projects');
  const projId = `PROJ-RLS-${Date.now()}`;
  await runInTenant(TENANT_A, `
    INSERT INTO generation_projects (project_id, tenant_id, project_name, current_phase)
    VALUES ($1, $2, 'Alpha Project', 'DISCOVERY');
  `, [projId, TENANT_A]);

  const projReadB = await runInTenant(TENANT_B, 'SELECT project_id FROM generation_projects WHERE project_id = $1;', [projId]);
  if (projReadB.rows.length !== 0) throw new Error('SECURITY BREACH: Tenant Beta read Tenant Alpha project!');
  console.log('  ✓ Generation project isolation verified: 0 rows visible to cross-tenant');

  // TEST 5: deployment_plans
  console.log('\n[5/5] Testing table: deployment_plans');
  const planId = `PLAN-RLS-${Date.now()}`;
  await runInTenant(TENANT_A, `
    INSERT INTO deployment_plans (id, tenant_id, project_id, plan_hash, artifact_manifest_hash, status)
    VALUES ($1, $2, $3, 'hash_plan_123', 'hash_artifact_456', 'PLANNED');
  `, [planId, TENANT_A, projId]);

  const planReadB = await runInTenant(TENANT_B, 'SELECT id FROM deployment_plans WHERE id = $1;', [planId]);
  if (planReadB.rows.length !== 0) throw new Error('SECURITY BREACH: Tenant Beta read Tenant Alpha deployment plan!');
  console.log('  ✓ Deployment plan isolation verified: 0 rows visible to cross-tenant');

  // CLEANUP TEST RECORDS (using Tenant Alpha context for each)
  await runInTenant(TENANT_A, 'DELETE FROM deployment_plans WHERE id = $1;', [planId]);
  await runInTenant(TENANT_A, 'DELETE FROM generation_projects WHERE project_id = $1;', [projId]);
  await runInTenant(TENANT_A, 'DELETE FROM generation_handoffs WHERE handoff_id = $1;', [handoffId]);
  await runInTenant(TENANT_A, 'DELETE FROM security_audit_events WHERE event_id = $1;', [evtId]);
  await runInTenant(TENANT_A, 'DELETE FROM assessments WHERE id = $1;', [asmId]);

  // Clean tenants using unconstrained client
  const cleanupClient = await pool.connect();
  try {
    await cleanupClient.query('DELETE FROM tenants WHERE tenant_id IN ($1, $2);', [TENANT_A, TENANT_B]);
  } finally {
    cleanupClient.release();
    await DatabasePool.close();
  }

  console.log('\n================================================================');
  console.log(' RLS SECURITY VERIFICATION COMPLETE: ALL 5 TABLES PASSED!       ');
  console.log('================================================================');
}

runSecurityAudit().catch((err) => {
  console.error('[SECURITY-AUDIT] FAILED:', err);
  process.exit(1);
});
