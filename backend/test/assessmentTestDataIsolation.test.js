import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { createServer } from '../src/server.js';
import { AssessmentStore, resolveDefaultStoragePath, isTestRunnerActive } from '../src/services/assessmentStore.js';

describe('Stage A: Assessment Test Data Isolation & Immutable Baseline Suite', () => {
  const canonicalPath = resolveDefaultStoragePath();
  const EXPECTED_BASELINE_HASH = 'f636202ce7a07873dc68ffa10639c5daa3f7ee5f61563afc2d1f5b240d99b4e8';
  const EXPECTED_CANONICAL_COUNT = 12;
  const EXPECTED_DEFAULT_TENANT_COUNT = 9;

  function getCanonicalFileHash() {
    const data = fs.readFileSync(canonicalPath);
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  function getCanonicalRecordCount() {
    const raw = fs.readFileSync(canonicalPath, 'utf8');
    const records = JSON.parse(raw);
    return records.length;
  }

  it('detects that the test runner is actively running', () => {
    assert.strictEqual(isTestRunnerActive(), true);
  });

  it('verifies canonical assessments.json matches the pristine 12-record baseline SHA-256', () => {
    const currentHash = getCanonicalFileHash();
    const currentCount = getCanonicalRecordCount();
    assert.strictEqual(currentCount, EXPECTED_CANONICAL_COUNT, `Expected exactly ${EXPECTED_CANONICAL_COUNT} records`);
    assert.strictEqual(currentHash, EXPECTED_BASELINE_HASH, `Hash must match canonical baseline: ${EXPECTED_BASELINE_HASH}`);
  });

  it('fail-closed defense: direct _persist() to canonical storage path throws TEST_ISOLATION_VIOLATION during test execution', async () => {
    const store = new AssessmentStore({ storagePath: canonicalPath });
    await assert.rejects(
      async () => {
        await store._persist();
      },
      (err) => {
        assert.strictEqual(err.code, 'TEST_ISOLATION_VIOLATION');
        assert.ok(err.message.includes('Attempted to write to canonical assessment storage'));
        return true;
      }
    );
    assert.strictEqual(getCanonicalFileHash(), EXPECTED_BASELINE_HASH);
  });

  it('createServer() in test mode creates an ephemeral store that does not leak mutations to canonical file', async () => {
    const server = createServer();
    let port;
    await new Promise((resolve) => {
      server.listen(0, () => {
        port = server.address().port;
        resolve();
      });
    });

    try {
      // 1. Fetch initial assessments: should see baseline records for default tenant
      const initialRes = await fetch(`http://127.0.0.1:${port}/api/v1/assessments`);
      assert.strictEqual(initialRes.status, 200);
      const initialData = await initialRes.json();
      assert.strictEqual(initialData.assessments.length, EXPECTED_DEFAULT_TENANT_COUNT);

      // 2. Create a test assessment
      const createRes = await fetch(`http://127.0.0.1:${port}/api/v1/assessments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: 'ASM-EPHEMERAL-TEST-001',
          tcode: 'FB50',
          title: 'Ephemeral Isolation Verification Test',
          businessArea: 'Finance',
          status: 'COMPLETED',
          fitGapScore: 85
        })
      });
      assert.strictEqual(createRes.status, 201);

      // 3. Confirm server now reports 10 records in its ephemeral store for default tenant
      const updatedRes = await fetch(`http://127.0.0.1:${port}/api/v1/assessments`);
      const updatedData = await updatedRes.json();
      assert.strictEqual(updatedData.assessments.length, EXPECTED_DEFAULT_TENANT_COUNT + 1);

      // 4. Invariant check: Canonical file remains pristine with 12 records and original hash!
      assert.strictEqual(getCanonicalRecordCount(), EXPECTED_CANONICAL_COUNT);
      assert.strictEqual(getCanonicalFileHash(), EXPECTED_BASELINE_HASH);
    } finally {
      await new Promise((resolve) => server.close(resolve));
    }

    // Verify canonical hash after server closure
    assert.strictEqual(getCanonicalFileHash(), EXPECTED_BASELINE_HASH);
  });

  it('two separate createServer() instances maintain independent isolated stores without cross-talk', async () => {
    const server1 = createServer();
    const server2 = createServer();
    let port1, port2;

    await new Promise((resolve) => {
      server1.listen(0, () => {
        port1 = server1.address().port;
        resolve();
      });
    });

    await new Promise((resolve) => {
      server2.listen(0, () => {
        port2 = server2.address().port;
        resolve();
      });
    });

    try {
      // Create record on server1 only
      const createRes = await fetch(`http://127.0.0.1:${port1}/api/v1/assessments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: 'ASM-SERVER1-EXCLUSIVE',
          tcode: 'VA01',
          title: 'Server 1 Exclusive Test',
          businessArea: 'Sales',
          status: 'COMPLETED'
        })
      });
      assert.strictEqual(createRes.status, 201);

      // Server1 has 10 records for default tenant
      const s1Res = await fetch(`http://127.0.0.1:${port1}/api/v1/assessments`);
      const s1Data = await s1Res.json();
      assert.strictEqual(s1Data.assessments.length, EXPECTED_DEFAULT_TENANT_COUNT + 1);

      // Server2 still has 9 records for default tenant
      const s2Res = await fetch(`http://127.0.0.1:${port2}/api/v1/assessments`);
      const s2Data = await s2Res.json();
      assert.strictEqual(s2Data.assessments.length, EXPECTED_DEFAULT_TENANT_COUNT);
      assert.strictEqual(s2Data.assessments.some((a) => a.id === 'ASM-SERVER1-EXCLUSIVE'), false);

      // Canonical file remains pristine with 12 records
      assert.strictEqual(getCanonicalRecordCount(), EXPECTED_CANONICAL_COUNT);
      assert.strictEqual(getCanonicalFileHash(), EXPECTED_BASELINE_HASH);
    } finally {
      await Promise.all([
        new Promise((resolve) => server1.close(resolve)),
        new Promise((resolve) => server2.close(resolve))
      ]);
    }

    assert.strictEqual(getCanonicalFileHash(), EXPECTED_BASELINE_HASH);
  });
});
