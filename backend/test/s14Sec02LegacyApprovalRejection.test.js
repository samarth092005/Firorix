import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {
  DeploymentOrchestrationService,
  DEPLOYMENT_LIFECYCLE_STATUSES
} from '../src/generation/deployment/deploymentOrchestrationService.js';
import {
  CryptographicSignatureService
} from '../src/infrastructure/security/cryptographicSignatureService.js';

test('Sprint 14.1 SEC-02 — Cryptographic Approval Enforcement & Legacy SHA-256 Rejection Suite', async (t) => {
  const SIGNING_SECRET = 'production-grade-hmac-signing-secret-32-chars!!';

  function createMockRepo(initialPlans = [], initialApprovals = []) {
    const plans = new Map(initialPlans.map((p) => [p.id, { ...p }]));
    const approvals = new Map(initialApprovals.map((a) => [a.planId, { ...a }]));
    const executions = [];

    return {
      plans,
      approvals,
      executions,
      async getDeploymentPlan(id, tenantId) {
        const p = plans.get(id);
        if (!p) return null;
        if (tenantId && p.tenantId && p.tenantId !== tenantId) return null;
        return p;
      },
      async createDeploymentPlan(plan, tenantId) {
        plans.set(plan.id, { ...plan, tenantId: tenantId || plan.tenantId || 'DEFAULT-TENANT-S21' });
        return plans.get(plan.id);
      },
      async getLatestApproval(planId, tenantId) {
        const a = approvals.get(planId);
        if (!a) return null;
        if (tenantId && a.tenantId && a.tenantId !== tenantId) return null;
        return a;
      },
      async createApproval(app, tenantId) {
        approvals.set(app.planId, { ...app, tenantId: tenantId || app.tenantId || 'DEFAULT-TENANT-S21' });
        return approvals.get(app.planId);
      },
      async createExecution(exec) {
        executions.push(exec);
        return exec;
      }
    };
  }

  const mockVerifier = {
    async verifyDeployment() {
      return { overallStatus: 'VERIFIED', checks: [] };
    }
  };

  await t.test('1. Valid keyed HMAC approval succeeds execution up to the SAP Write Boundary', async () => {
    const signatureService = new CryptographicSignatureService({
      activeKeyVersion: 'v1',
      keys: { v1: SIGNING_SECRET }
    });
    const repo = createMockRepo();
    const service = new DeploymentOrchestrationService({
      repository: repo,
      signatureService,
      verifier: mockVerifier
    });

    const plan = {
      id: 'DEP-PLAN-HMAC-01',
      projectId: 'PRJ-01',
      planHash: 'hash-plan-valid-1',
      artifactManifestHash: 'hash-manifest-valid-1',
      targetSystem: 'S21',
      targetClient: '200',
      targetPackage: '$TMP',
      planDetails: { operations: [] },
      tenantId: 'TENANT-S21'
    };
    await repo.createDeploymentPlan(plan, 'TENANT-S21');

    const approvalRes = await service.approveDeploymentPlan(
      'DEP-PLAN-HMAC-01',
      { comments: 'Approved for automated testing' },
      { id: 'usr-chief-arch', name: 'Chief Architect', role: 'CHIEF_ARCHITECT', tenantId: 'TENANT-S21' }
    );
    assert.strictEqual(approvalRes.status, 'APPROVED');
    assert.ok(approvalRes.approval.signatureHash.startsWith('sig:v1:'));

    const execRes = await service.executeDeploymentPlan(
      'DEP-PLAN-HMAC-01',
      {},
      { id: 'usr-chief-arch', role: 'CHIEF_ARCHITECT', tenantId: 'TENANT-S21' }
    );
    assert.strictEqual(execRes.lifecycleStatus, DEPLOYMENT_LIFECYCLE_STATUSES.STOPPED_AT_WRITE_BOUNDARY);
    assert.strictEqual(execRes.executionBoundaryStatus, 'STOPPED_AT_WRITE_BOUNDARY');
  });

  await t.test('2. Tampered HMAC signature fails execution with DEPLOYMENT_SIGNATURE_INVALID', async () => {
    const signatureService = new CryptographicSignatureService({
      activeKeyVersion: 'v1',
      keys: { v1: SIGNING_SECRET }
    });
    const repo = createMockRepo();
    const service = new DeploymentOrchestrationService({
      repository: repo,
      signatureService,
      verifier: mockVerifier
    });

    const plan = {
      id: 'DEP-PLAN-HMAC-02',
      projectId: 'PRJ-02',
      planHash: 'hash-plan-02',
      artifactManifestHash: 'hash-manifest-02',
      targetSystem: 'S21',
      targetClient: '200',
      targetPackage: '$TMP',
      planDetails: { operations: [] },
      tenantId: 'TENANT-S21'
    };
    await repo.createDeploymentPlan(plan, 'TENANT-S21');
    await service.approveDeploymentPlan(
      'DEP-PLAN-HMAC-02',
      {},
      { id: 'usr-chief-arch', role: 'CHIEF_ARCHITECT', tenantId: 'TENANT-S21' }
    );

    // Tamper with signature
    const app = await repo.getLatestApproval('DEP-PLAN-HMAC-02', 'TENANT-S21');
    app.signatureHash = 'sig:v1:deadbeef00000000000000000000000000000000000000000000000000000000';

    await assert.rejects(
      async () => service.executeDeploymentPlan('DEP-PLAN-HMAC-02', {}, { id: 'usr-chief-arch', tenantId: 'TENANT-S21' }),
      (err) => err.code === 'DEPLOYMENT_SIGNATURE_INVALID'
    );
  });

  await t.test('3. Legacy unauthenticated SHA-256 approval fails with LEGACY_APPROVAL_UNAUTHORIZED', async () => {
    const signatureService = new CryptographicSignatureService({
      activeKeyVersion: 'v1',
      keys: { v1: SIGNING_SECRET }
    });
    const repo = createMockRepo();
    const service = new DeploymentOrchestrationService({
      repository: repo,
      signatureService,
      verifier: mockVerifier
    });

    const plan = {
      id: 'DEP-PLAN-LEGACY-SEC',
      projectId: 'PRJ-LEGACY',
      planHash: 'hash-plan-legacy',
      artifactManifestHash: 'hash-manifest-legacy',
      targetSystem: 'S21',
      targetClient: '200',
      targetPackage: 'Z_PACKAGE',
      planDetails: { operations: [] },
      tenantId: 'TENANT-S21'
    };
    await repo.createDeploymentPlan(plan, 'TENANT-S21');

    const approvedAt = new Date().toISOString();
    const expiresAt = new Date(Date.now() + 86400000).toISOString();
    const approverId = 'chief-architect';
    const legacyPayload = `${plan.id}:${plan.planHash}:${plan.artifactManifestHash}:${approverId}:${approvedAt}`;
    const legacyDigest = crypto.createHash('sha256').update(legacyPayload).digest('hex');

    await repo.createApproval({
      planId: plan.id,
      projectId: plan.projectId,
      decision: 'APPROVED',
      approver: 'Chief Architect',
      approverId,
      approverRole: 'CHIEF_ARCHITECT',
      planHash: plan.planHash,
      artifactManifestHash: plan.artifactManifestHash,
      signatureHash: legacyDigest,
      approvedAt,
      expiresAt,
      tenantId: 'TENANT-S21'
    }, 'TENANT-S21');

    await assert.rejects(
      async () => service.executeDeploymentPlan('DEP-PLAN-LEGACY-SEC', {}, { id: 'chief-architect', tenantId: 'TENANT-S21' }),
      (err) => {
        assert.strictEqual(err.code, 'LEGACY_APPROVAL_UNAUTHORIZED');
        assert.match(err.message, /Legacy unauthenticated SHA-256 approval digests are restricted to historical audit/);
        return true;
      }
    );
  });

  await t.test('4. Historical legacy approval records remain fully readable for audit inspection', async () => {
    const repo = createMockRepo();
    const legacyDigest = crypto.createHash('sha256').update('HISTORICAL_RECORD').digest('hex');

    await repo.createDeploymentPlan({
      id: 'DEP-PLAN-HISTORICAL',
      projectId: 'PRJ-HIST',
      status: 'APPROVED',
      tenantId: 'TENANT-S21'
    }, 'TENANT-S21');

    await repo.createApproval({
      planId: 'DEP-PLAN-HISTORICAL',
      decision: 'APPROVED',
      signatureHash: legacyDigest,
      tenantId: 'TENANT-S21'
    }, 'TENANT-S21');

    const fetchedPlan = await repo.getDeploymentPlan('DEP-PLAN-HISTORICAL', 'TENANT-S21');
    const fetchedApproval = await repo.getLatestApproval('DEP-PLAN-HISTORICAL', 'TENANT-S21');

    assert.ok(fetchedPlan, 'Historical plan must remain readable');
    assert.strictEqual(fetchedPlan.id, 'DEP-PLAN-HISTORICAL');
    assert.ok(fetchedApproval, 'Historical approval record must remain readable');
    assert.strictEqual(fetchedApproval.signatureHash, legacyDigest);
  });

  await t.test('5. Missing signing secret in production fails closed', () => {
    const origEnv = process.env.NODE_ENV;
    const origSecret = process.env.FIORIFY_SIGNING_SECRET;
    const origApproval = process.env.FIORIFY_APPROVAL_SECRET;

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
      if (origApproval) process.env.FIORIFY_APPROVAL_SECRET = origApproval;
    }
  });

  await t.test('6. Invalid or unknown key version fails signature verification', async () => {
    const signatureService = new CryptographicSignatureService({
      activeKeyVersion: 'v1',
      keys: { v1: SIGNING_SECRET }
    });
    const repo = createMockRepo();
    const service = new DeploymentOrchestrationService({
      repository: repo,
      signatureService,
      verifier: mockVerifier
    });

    const plan = {
      id: 'DEP-PLAN-KEYVER-01',
      projectId: 'PRJ-01',
      planHash: 'hash-plan',
      artifactManifestHash: 'hash-art',
      targetSystem: 'S21',
      targetClient: '200',
      targetPackage: '$TMP',
      planDetails: { operations: [] },
      tenantId: 'TENANT-S21'
    };
    await repo.createDeploymentPlan(plan, 'TENANT-S21');

    await repo.createApproval({
      planId: plan.id,
      decision: 'APPROVED',
      approverId: 'chief-arch',
      planHash: plan.planHash,
      artifactManifestHash: plan.artifactManifestHash,
      signatureHash: 'sig:v999:abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
      approvedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 86400000).toISOString(),
      tenantId: 'TENANT-S21'
    }, 'TENANT-S21');

    await assert.rejects(
      async () => service.executeDeploymentPlan('DEP-PLAN-KEYVER-01', {}, { id: 'chief-arch', tenantId: 'TENANT-S21' }),
      (err) => err.code === 'DEPLOYMENT_SIGNATURE_INVALID'
    );
  });

  await t.test('7. Modified artifact hash fails with DEPLOYMENT_INTEGRITY_VIOLATION', async () => {
    const signatureService = new CryptographicSignatureService({
      activeKeyVersion: 'v1',
      keys: { v1: SIGNING_SECRET }
    });
    const repo = createMockRepo();
    const service = new DeploymentOrchestrationService({
      repository: repo,
      signatureService,
      verifier: mockVerifier
    });

    const plan = {
      id: 'DEP-PLAN-INT-01',
      projectId: 'PRJ-01',
      planHash: 'hash-plan-original',
      artifactManifestHash: 'hash-artifact-original',
      targetSystem: 'S21',
      targetClient: '200',
      targetPackage: '$TMP',
      planDetails: { operations: [] },
      tenantId: 'TENANT-S21'
    };
    await repo.createDeploymentPlan(plan, 'TENANT-S21');
    await service.approveDeploymentPlan('DEP-PLAN-INT-01', {}, { id: 'chief-arch', role: 'CHIEF_ARCHITECT', tenantId: 'TENANT-S21' });

    // Mutate artifactManifestHash in plan
    plan.artifactManifestHash = 'hash-artifact-tampered';
    await repo.createDeploymentPlan(plan, 'TENANT-S21');

    await assert.rejects(
      async () => service.executeDeploymentPlan('DEP-PLAN-INT-01', {}, { id: 'chief-arch', tenantId: 'TENANT-S21' }),
      (err) => err.code === 'DEPLOYMENT_INTEGRITY_VIOLATION'
    );
  });

  await t.test('8. Cross-tenant deployment execution rejected with TENANT_ACCESS_DENIED or NOT_FOUND', async () => {
    const signatureService = new CryptographicSignatureService({
      activeKeyVersion: 'v1',
      keys: { v1: SIGNING_SECRET }
    });
    const repo = createMockRepo();
    const service = new DeploymentOrchestrationService({
      repository: repo,
      signatureService,
      verifier: mockVerifier
    });

    const plan = {
      id: 'DEP-PLAN-TENANT-ALPHA',
      projectId: 'PRJ-ALPHA',
      planHash: 'hash-plan-alpha',
      artifactManifestHash: 'hash-art-alpha',
      targetSystem: 'S21',
      targetClient: '200',
      targetPackage: '$TMP',
      planDetails: { operations: [] },
      tenantId: 'TENANT-ALPHA'
    };
    await repo.createDeploymentPlan(plan, 'TENANT-ALPHA');
    await service.approveDeploymentPlan('DEP-PLAN-TENANT-ALPHA', {}, { id: 'chief-arch', role: 'CHIEF_ARCHITECT', tenantId: 'TENANT-ALPHA' });

    // Attempt execution from TENANT-BETA
    await assert.rejects(
      async () => service.executeDeploymentPlan('DEP-PLAN-TENANT-ALPHA', {}, { id: 'chief-arch', tenantId: 'TENANT-BETA' }),
      (err) => err.code === 'NOT_FOUND' || err.code === 'TENANT_ACCESS_DENIED'
    );
  });

  await t.test('9. Expired deployment approval fails with DEPLOYMENT_APPROVAL_EXPIRED', async () => {
    const signatureService = new CryptographicSignatureService({
      activeKeyVersion: 'v1',
      keys: { v1: SIGNING_SECRET }
    });
    const repo = createMockRepo();
    const service = new DeploymentOrchestrationService({
      repository: repo,
      signatureService,
      verifier: mockVerifier
    });

    const plan = {
      id: 'DEP-PLAN-EXPIRED',
      projectId: 'PRJ-01',
      planHash: 'hash-plan',
      artifactManifestHash: 'hash-art',
      targetSystem: 'S21',
      targetClient: '200',
      targetPackage: '$TMP',
      planDetails: { operations: [] },
      tenantId: 'TENANT-S21'
    };
    await repo.createDeploymentPlan(plan, 'TENANT-S21');

    await repo.createApproval({
      planId: plan.id,
      decision: 'APPROVED',
      approverId: 'chief-arch',
      planHash: plan.planHash,
      artifactManifestHash: plan.artifactManifestHash,
      signatureHash: 'sig:v1:valid-format',
      approvedAt: new Date(Date.now() - 100000).toISOString(),
      expiresAt: new Date(Date.now() - 50000).toISOString(), // Expired
      tenantId: 'TENANT-S21'
    }, 'TENANT-S21');

    await assert.rejects(
      async () => service.executeDeploymentPlan('DEP-PLAN-EXPIRED', {}, { id: 'chief-arch', tenantId: 'TENANT-S21' }),
      (err) => err.code === 'DEPLOYMENT_APPROVAL_EXPIRED'
    );
  });
});
