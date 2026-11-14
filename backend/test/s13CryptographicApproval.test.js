import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {
  CryptographicSignatureService,
  LocalHmacSignatureProvider,
  defaultCryptographicSignatureService
} from '../src/infrastructure/security/cryptographicSignatureService.js';
import { DeploymentOrchestrationService } from '../src/generation/deployment/deploymentOrchestrationService.js';

test('Cryptographic Signature Service (Sprint 13.2 / REM-SEC-03)', async (t) => {

  await t.test('1. Generates keyed HMAC-SHA256 signature with key version prefix', async () => {
    const service = new CryptographicSignatureService({
      activeKeyVersion: 'v1',
      keys: { v1: 'test-secret-key-12345' }
    });

    const payload = 'TEST-PLAN-001:hashA:hashB:chief-arch:2026-11-14T00:00:00Z';
    const result = await service.signPayload(payload);

    assert.ok(result.signature.startsWith('sig:v1:'), 'Signature must start with sig:v1:');
    assert.strictEqual(result.keyVersion, 'v1');
    assert.strictEqual(result.algorithm, 'HMAC-SHA256');
    assert.strictEqual(result.signatureType, 'HMAC_SHA256_KEYED');

    const rawHex = result.signature.split(':')[2];
    assert.strictEqual(rawHex.length, 64, 'HMAC-SHA256 hex digest must be 64 characters');
  });

  await t.test('2. Successfully verifies authentic payload with matching signature', async () => {
    const service = new CryptographicSignatureService({
      activeKeyVersion: 'v1',
      keys: { v1: 'test-secret-key-12345' }
    });

    const payload = 'TEST-PLAN-002:hashX:hashY:chief-arch:2026-11-14T00:00:00Z';
    const { signature } = await service.signPayload(payload);

    const verification = await service.verifySignature(payload, signature);
    assert.strictEqual(verification.valid, true, 'Valid signature must verify as true');
    assert.strictEqual(verification.isLegacy, false);
    assert.strictEqual(verification.keyVersion, 'v1');
    assert.strictEqual(verification.signatureType, 'HMAC_SHA256_KEYED');
  });

  await t.test('3. Rejects tampered payload', async () => {
    const service = new CryptographicSignatureService({
      activeKeyVersion: 'v1',
      keys: { v1: 'test-secret-key-12345' }
    });

    const payload = 'ORIGINAL_PAYLOAD';
    const { signature } = await service.signPayload(payload);

    const verification = await service.verifySignature('TAMPERED_PAYLOAD', signature);
    assert.strictEqual(verification.valid, false, 'Tampered payload must fail verification');
    assert.strictEqual(verification.reason, 'SIGNATURE_VERIFICATION_FAILED');
  });

  await t.test('4. Rejects tampered signature string', async () => {
    const service = new CryptographicSignatureService({
      activeKeyVersion: 'v1',
      keys: { v1: 'test-secret-key-12345' }
    });

    const payload = 'SOME_PAYLOAD';
    const { signature } = await service.signPayload(payload);

    // Corrupt one character in the hex part
    const parts = signature.split(':');
    const corruptedHex = (parts[2][0] === 'a' ? 'b' : 'a') + parts[2].slice(1);
    const corruptedSignature = `sig:${parts[1]}:${corruptedHex}`;

    const verification = await service.verifySignature(payload, corruptedSignature);
    assert.strictEqual(verification.valid, false);
    assert.strictEqual(verification.reason, 'SIGNATURE_VERIFICATION_FAILED');
  });

  await t.test('5. Rejects unknown key version', async () => {
    const service = new CryptographicSignatureService({
      activeKeyVersion: 'v1',
      keys: { v1: 'test-secret-key-12345' }
    });

    const payload = 'SOME_PAYLOAD';
    const fakeSignature = 'sig:v99:0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

    const verification = await service.verifySignature(payload, fakeSignature);
    assert.strictEqual(verification.valid, false);
    assert.ok(verification.reason.includes('SIGNING_KEY_VERSION_NOT_FOUND'));
  });

  await t.test('6. Supports key rotation: verifies v1 while signing with v2', async () => {
    const service = new CryptographicSignatureService({
      activeKeyVersion: 'v1',
      keys: {
        v1: 'historical-secret-key-v1',
        v2: 'new-active-secret-key-v2'
      }
    });

    const payloadOld = 'HISTORICAL_PLAN_PAYLOAD';
    const { signature: sigV1 } = await service.signPayload(payloadOld, 'v1');
    assert.ok(sigV1.startsWith('sig:v1:'));

    // Rotate active key to v2
    service.setActiveKey('v2');

    const payloadNew = 'NEW_PLAN_PAYLOAD';
    const { signature: sigV2 } = await service.signPayload(payloadNew);
    assert.ok(sigV2.startsWith('sig:v2:'));

    // Verify both: v1 and v2 must be valid
    const verifyOld = await service.verifySignature(payloadOld, sigV1);
    assert.strictEqual(verifyOld.valid, true);
    assert.strictEqual(verifyOld.keyVersion, 'v1');

    const verifyNew = await service.verifySignature(payloadNew, sigV2);
    assert.strictEqual(verifyNew.valid, true);
    assert.strictEqual(verifyNew.keyVersion, 'v2');
  });

  await t.test('7. Backward-compatibility: validates legacy unkeyed SHA-256 digest with flag', async () => {
    const service = new CryptographicSignatureService({
      activeKeyVersion: 'v1',
      keys: { v1: 'test-secret' }
    });

    const payload = 'LEGACY_APPROVAL_PAYLOAD_FROM_S11';
    const legacySha256 = crypto.createHash('sha256').update(payload).digest('hex');

    assert.strictEqual(legacySha256.length, 64);
    assert.ok(!legacySha256.startsWith('sig:'));

    const verification = await service.verifySignature(payload, legacySha256);
    assert.strictEqual(verification.valid, true);
    assert.strictEqual(verification.isLegacy, true);
    assert.strictEqual(verification.signatureType, 'UNAUTHENTICATED_LEGACY_DIGEST');
    assert.strictEqual(verification.reason, 'MATCHED_LEGACY_SHA256_DIGEST_WARNING_UNKEYED');
  });

  await t.test('8. Fails closed in production if no secret is configured', async () => {
    const origEnv = process.env.NODE_ENV;
    const origSecret = process.env.FIORIFY_SIGNING_SECRET;
    const origApprovalSecret = process.env.FIORIFY_APPROVAL_SECRET;

    try {
      process.env.NODE_ENV = 'production';
      delete process.env.FIORIFY_SIGNING_SECRET;
      delete process.env.FIORIFY_APPROVAL_SECRET;

      assert.throws(
        () => new CryptographicSignatureService({ keys: {} }),
        (err) => err.code === 'MISSING_SIGNING_SECRET'
      );
    } finally {
      process.env.NODE_ENV = origEnv;
      if (origSecret) process.env.FIORIFY_SIGNING_SECRET = origSecret;
      if (origApprovalSecret) process.env.FIORIFY_APPROVAL_SECRET = origApprovalSecret;
    }
  });

  await t.test('9. Deployment Orchestration: verifies cryptographic signature before execution', async () => {
    const signatureService = new CryptographicSignatureService({
      activeKeyVersion: 'v1',
      keys: { v1: 'orchestration-test-secret' }
    });

    const mockRepo = {
      plans: new Map(),
      approvals: new Map(),
      executions: [],
      async getDeploymentPlan(id) { return this.plans.get(id); },
      async createDeploymentPlan(plan) { this.plans.set(plan.id, plan); return plan; },
      async createApproval(app) { this.approvals.set(app.planId, app); return app; },
      async getLatestApproval(planId) { return this.approvals.get(planId); },
      async createExecution(exec) { this.executions.push(exec); return exec; }
    };

    const orchestrator = new DeploymentOrchestrationService({
      repository: mockRepo,
      signatureService,
      verifier: { verifyDeployment: async () => ({ overallStatus: 'VERIFIED', checks: [] }) }
    });

    // 1. Create plan
    const plan = {
      id: 'DEP-PLAN-TEST-01',
      projectId: 'PROJ-01',
      planHash: 'hash-plan-123',
      artifactManifestHash: 'hash-manifest-456',
      targetSystem: 'S21',
      targetClient: '200',
      targetPackage: 'Z_CLEAN_CORE',
      planDetails: { operations: [] }
    };
    await mockRepo.createDeploymentPlan(plan);

    // 2. Approve plan
    const approvalRes = await orchestrator.approveDeploymentPlan(
      'DEP-PLAN-TEST-01',
      { comments: 'Approved' },
      { id: 'chief-arch', role: 'CHIEF_ARCHITECT' }
    );

    assert.strictEqual(approvalRes.status, 'APPROVED');
    assert.ok(approvalRes.approval.signatureHash.startsWith('sig:v1:'));

    // 3. Execute plan -> should succeed up to write boundary
    const execRes = await orchestrator.executeDeploymentPlan(
      'DEP-PLAN-TEST-01',
      {},
      { id: 'chief-arch' }
    );

    assert.strictEqual(execRes.lifecycleStatus, 'STOPPED_AT_WRITE_BOUNDARY');
    const verifiedLog = execRes.logs.find(l => l.message.includes('Cryptographic approval verified'));
    assert.ok(verifiedLog, 'Must log cryptographic approval verification');

    // 4. Tamper with the planHash in the plan -> Execution MUST be rejected
    plan.planHash = 'tampered-hash-999';
    await mockRepo.createDeploymentPlan(plan);

    await assert.rejects(
      async () => orchestrator.executeDeploymentPlan('DEP-PLAN-TEST-01', {}, { id: 'chief-arch' }),
      (err) => err.code === 'DEPLOYMENT_INTEGRITY_VIOLATION'
    );

    // 5. Restore planHash but tamper with signatureHash -> Execution MUST be rejected
    plan.planHash = 'hash-plan-123';
    await mockRepo.createDeploymentPlan(plan);
    const app = await mockRepo.getLatestApproval('DEP-PLAN-TEST-01');
    app.signatureHash = 'sig:v1:0000000000000000000000000000000000000000000000000000000000000000';

    await assert.rejects(
      async () => orchestrator.executeDeploymentPlan('DEP-PLAN-TEST-01', {}, { id: 'chief-arch' }),
      (err) => err.code === 'DEPLOYMENT_SIGNATURE_INVALID'
    );
  });

  await t.test('10. Deployment Orchestration: handles legacy SHA-256 approval with warning log', async () => {
    const signatureService = new CryptographicSignatureService({
      activeKeyVersion: 'v1',
      keys: { v1: 'orchestration-test-secret' }
    });

    const plan = {
      id: 'DEP-PLAN-LEGACY-01',
      projectId: 'PROJ-LEGACY',
      planHash: 'hash-legacy-111',
      artifactManifestHash: 'hash-legacy-222',
      targetSystem: 'S21',
      targetClient: '200',
      targetPackage: 'Z_CLEAN_CORE',
      planDetails: { operations: [] }
    };

    const approvedAt = new Date().toISOString();
    const expiresAt = new Date(Date.now() + 86400000).toISOString();
    const legacyPayload = `${plan.id}:${plan.planHash}:${plan.artifactManifestHash}:chief-architect:${approvedAt}`;
    const legacySha256 = crypto.createHash('sha256').update(legacyPayload).digest('hex');

    const legacyApproval = {
      planId: plan.id,
      projectId: plan.projectId,
      decision: 'APPROVED',
      approver: 'Chief Enterprise Architect',
      approverId: 'chief-architect',
      approverRole: 'CHIEF_ARCHITECT',
      planHash: plan.planHash,
      artifactManifestHash: plan.artifactManifestHash,
      signatureHash: legacySha256,
      approvedAt,
      expiresAt
    };

    const mockRepo = {
      async getDeploymentPlan() { return plan; },
      async getLatestApproval() { return legacyApproval; },
      async createExecution(exec) { return exec; }
    };

    const orchestrator = new DeploymentOrchestrationService({
      repository: mockRepo,
      signatureService,
      verifier: { verifyDeployment: async () => ({ overallStatus: 'VERIFIED', checks: [] }) }
    });

    const execRes = await orchestrator.executeDeploymentPlan('DEP-PLAN-LEGACY-01', {}, { id: 'chief-architect' });
    assert.strictEqual(execRes.lifecycleStatus, 'STOPPED_AT_WRITE_BOUNDARY');

    const warnLog = execRes.logs.find(l => l.level === 'WARN' && l.message.includes('legacy unauthenticated digest'));
    assert.ok(warnLog, 'Must log WARN for legacy approval digest');
  });
});
