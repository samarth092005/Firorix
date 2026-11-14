import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import DatabasePool from '../src/infrastructure/db/pool.js';
import {
  TransactionDiscoveryService,
  DISCOVERY_STATUSES,
  DISCOVERY_SCOPES
} from '../src/services/transactionDiscoveryService.js';
import { createServer } from '../src/server.js';

test('Fiorify S4 — SAP Transaction Discovery Engine Test Suite', async (t) => {
  process.env.FIORIFY_ALLOW_EMBEDDED_PG = 'true';
  const pool = await DatabasePool.getPool();
  assert.ok(pool, 'PostgreSQL pool must be initialized');

  const testTenant = `TENANT-S4-${Date.now().toString().slice(-6)}`;
  const testSystemProfileId = `SYS-S4-${Date.now().toString().slice(-6)}`;
  const discoveryService = new TransactionDiscoveryService({ pool });

  t.after(async () => {
    try {
      await pool.query('DELETE FROM transaction_technical_objects WHERE tenant_id = $1;', [testTenant]);
      await pool.query('DELETE FROM transaction_master_records WHERE tenant_id = $1;', [testTenant]);
      await pool.query('DELETE FROM transaction_master_snapshots WHERE tenant_id = $1;', [testTenant]);
      await pool.query('DELETE FROM transaction_discovery_executions WHERE tenant_id = $1;', [testTenant]);
      await pool.query('DELETE FROM sap_system_profiles WHERE tenant_id = $1;', [testTenant]);
      await pool.query('DELETE FROM tenants WHERE tenant_id = $1;', [testTenant]);
    } catch {}
    await DatabasePool.close();
  });

  let exec1Id;
  let exec2Id;

  await t.test('1. executeDiscovery runs complete discovery and populates executions, transactions, and technical objects', async () => {
    const res = await discoveryService.executeDiscovery({
      tenantId: testTenant,
      systemProfileId: testSystemProfileId,
      executionScope: DISCOVERY_SCOPES.ALL
    });

    assert.equal(res.success, true);
    assert.ok(res.execution);
    assert.equal(res.execution.status, DISCOVERY_STATUSES.COMPLETED);
    assert.ok(res.execution.discoveredTxCount >= 10, 'Should discover baseline transactions');
    assert.ok(res.execution.discoveredObjCount >= 20, 'Should discover technical objects (programs, packages, auth, services)');
    exec1Id = res.execution.id;
  });

  await t.test('2. getTransactionDetails retrieves transaction and its associated technical objects', async () => {
    const details = await discoveryService.getTransactionDetails('F-53', testTenant, testSystemProfileId);
    assert.ok(details, 'F-53 transaction must exist');
    assert.equal(details.tcode, 'F-53');
    assert.ok(details.technicalObjects.length >= 3, 'Must have at least PROGRAM, PACKAGE, and AUTH_OBJECT');

    const types = details.technicalObjects.map(o => o.objectType);
    assert.ok(types.includes('PROGRAM'), 'Must include PROGRAM');
    assert.ok(types.includes('PACKAGE'), 'Must include PACKAGE');
    assert.ok(types.includes('AUTHORIZATION_OBJECT'), 'Must include AUTHORIZATION_OBJECT');
  });

  await t.test('3. Scoped discovery with CUSTOM scope discovers only custom transactions', async () => {
    const res = await discoveryService.executeDiscovery({
      tenantId: testTenant,
      systemProfileId: testSystemProfileId,
      executionScope: DISCOVERY_SCOPES.CUSTOM
    });

    assert.equal(res.success, true);
    assert.equal(res.execution.status, DISCOVERY_STATUSES.COMPLETED);
    assert.equal(res.execution.executionScope, DISCOVERY_SCOPES.CUSTOM);
    exec2Id = res.execution.id;
  });

  await t.test('4. listExecutions returns discovery history and getExecutionById retrieves record', async () => {
    const history = await discoveryService.listExecutions({ tenantId: testTenant });
    assert.ok(history.length >= 2);
    assert.ok(history.some(e => e.id === exec1Id));
    assert.ok(history.some(e => e.id === exec2Id));

    const single = await discoveryService.getExecutionById(exec1Id, testTenant);
    assert.ok(single);
    assert.equal(single.id, exec1Id);
    assert.equal(single.status, DISCOVERY_STATUSES.COMPLETED);
  });

  await t.test('5. getDiscoveredTransactions returns paginated list with joined technicalObjectCount', async () => {
    const res = await discoveryService.getDiscoveredTransactions({
      tenantId: testTenant,
      systemProfileId: testSystemProfileId,
      page: 1,
      pageSize: 10
    });

    assert.ok(res.transactions.length > 0);
    assert.ok(res.totalCount > 0);
    assert.ok(res.transactions[0].technicalObjectCount >= 1, 'Joined technicalObjectCount should be >= 1');
  });

  await t.test('6. compareExecutions compares two executions and returns delta analysis', async () => {
    const comp = await discoveryService.compareExecutions(exec1Id, exec2Id, testTenant);
    assert.ok(comp);
    assert.ok(comp.summary);
    assert.ok(comp.summary.totalInExecution1 >= comp.summary.totalInExecution2);
    assert.ok(Array.isArray(comp.unchanged));
    assert.ok(Array.isArray(comp.removed));
  });

  await t.test('7. HTTP API routes for discovery executions, transactions, and comparison work end-to-end', async () => {
    const server = createServer({ useDatabase: true });
    await new Promise((resolve) => server.listen(0, resolve));
    const port = server.address().port;

    try {
      // 1. GET /api/v1/discovery/executions
      const listRes = await new Promise((resolve, reject) => {
        const req = http.request({
          hostname: '127.0.0.1',
          port,
          path: '/api/v1/discovery/executions',
          method: 'GET',
          headers: { 'x-tenant-id': testTenant }
        }, res => {
          let data = '';
          res.on('data', c => data += c);
          res.on('end', () => resolve({ status: res.statusCode, body: JSON.parse(data) }));
        });
        req.on('error', reject);
        req.end();
      });
      assert.equal(listRes.status, 200);
      assert.equal(listRes.body.success, true);
      assert.ok(Array.isArray(listRes.body.executions));

      // 2. GET /api/v1/discovery/transactions
      const txListRes = await new Promise((resolve, reject) => {
        const req = http.request({
          hostname: '127.0.0.1',
          port,
          path: '/api/v1/discovery/transactions?page=1&pageSize=5',
          method: 'GET',
          headers: { 'x-tenant-id': testTenant }
        }, res => {
          let data = '';
          res.on('data', c => data += c);
          res.on('end', () => resolve({ status: res.statusCode, body: JSON.parse(data) }));
        });
        req.on('error', reject);
        req.end();
      });
      assert.equal(txListRes.status, 200);
      assert.equal(txListRes.body.success, true);
      assert.ok(Array.isArray(txListRes.body.transactions));

      // 3. GET /api/v1/discovery/transactions/:tcode
      const txDetailRes = await new Promise((resolve, reject) => {
        const req = http.request({
          hostname: '127.0.0.1',
          port,
          path: '/api/v1/discovery/transactions/F-53',
          method: 'GET',
          headers: { 'x-tenant-id': testTenant }
        }, res => {
          let data = '';
          res.on('data', c => data += c);
          res.on('end', () => resolve({ status: res.statusCode, body: JSON.parse(data) }));
        });
        req.on('error', reject);
        req.end();
      });
      assert.equal(txDetailRes.status, 200);
      assert.equal(txDetailRes.body.success, true);
      assert.equal(txDetailRes.body.transaction.tcode, 'F-53');
      assert.ok(Array.isArray(txDetailRes.body.transaction.technicalObjects));

      // 4. GET /api/v1/discovery/compare
      const compRes = await new Promise((resolve, reject) => {
        const req = http.request({
          hostname: '127.0.0.1',
          port,
          path: `/api/v1/discovery/compare?execution1=${exec1Id}&execution2=${exec2Id}`,
          method: 'GET',
          headers: { 'x-tenant-id': testTenant }
        }, res => {
          let data = '';
          res.on('data', c => data += c);
          res.on('end', () => resolve({ status: res.statusCode, body: JSON.parse(data) }));
        });
        req.on('error', reject);
        req.end();
      });
      assert.equal(compRes.status, 200);
      assert.equal(compRes.body.success, true);
      assert.ok(compRes.body.comparison);
      assert.ok(compRes.body.comparison.summary);
    } finally {
      await new Promise(resolve => server.close(resolve));
    }
  });
});
