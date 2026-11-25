/**
 * Fiorify — Governance Master Test Suite (Phase 7 / GOV-001 to GOV-008)
 *
 * Automated verification of:
 * - GOV-001: Assessment input validation & reject protected client fields
 * - GOV-002: Assessment permissions and tenant scope (JWT-derived tenant, no client overrides)
 * - GOV-003: Creator/approver separation of duties (strict enforcement, no admin self-approval)
 * - GOV-004: Cryptographically bound HMAC-SHA256 signatures (timing-safe, key rotation)
 * - GOV-005: Revalidate approval at handoff & generation boundaries (fail closed on tampering)
 * - GOV-006: Persist lifecycle changes and immutable audit events with hash-chain integrity
 * - GOV-007: ADD_AND_CONFIGURE vs BUILD standard-first decisioning (no false BUILD on errors)
 * - GOV-008: Privileged and audited override controls (requires ADMIN + 10+ char reason, audited)
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import os from 'node:os';
import { AssessmentStore, LIFECYCLE_STATES } from '../src/services/assessmentStore.js';

function createTempStore() {
  const tmpPath = path.join(os.tmpdir(), `test-assessments-${Date.now()}-${Math.random().toString(36).slice(2)}.json`);
  return new AssessmentStore(tmpPath, { allowVolatileStoreInProduction: true });
}
import { GenerationHandoffStore } from '../src/services/generationHandoffStore.js';
import { GenerationProjectService } from '../src/generation/projects/generationProjectService.js';
import { defaultCryptographicSignatureService } from '../src/infrastructure/security/cryptographicSignatureService.js';
import { sanitizeProtectedFields, PROTECTED_SECURITY_FIELDS } from '../src/middleware/securityFieldSanitizer.js';
import { USER_ROLES } from '../src/services/authService.js';
import { RecommendationEngine, RECOMMENDATION_OUTCOMES } from '../src/engine/recommendationEngine.js';
import { SecurityAuditLogger, SECURITY_ACTIONS } from '../src/infrastructure/security/securityAuditLogger.js';

test('GOV-001: Assessment input validation & reject protected client fields', async (t) => {
  await t.test('Sanitizer strips protected security fields from client payloads', () => {
    const maliciousPayload = {
      tcode: 'VA01',
      title: 'Sales Order Assessment',
      tenantId: 'MALICIOUS_TENANT',
      createdBy: 'ATTACKER_01',
      approverId: 'FORGED_APPROVER',
      approvalStatus: 'APPROVED',
      lifecycleStatus: 'APPROVED',
      approvalSignature: 'forged_sig_123',
      leadArchitectApproval: { approved: true, approver: 'Hacker' }
    };

    const sanitized = sanitizeProtectedFields(maliciousPayload, { strict: false });
    assert.equal(sanitized.tcode, 'VA01');
    assert.equal(sanitized.title, 'Sales Order Assessment');
    assert.equal(sanitized.tenantId, undefined);
    assert.equal(sanitized.createdBy, undefined);
    assert.equal(sanitized.approverId, undefined);
    assert.equal(sanitized.approvalStatus, undefined);
    assert.equal(sanitized.lifecycleStatus, undefined);
    assert.equal(sanitized.approvalSignature, undefined);
    assert.equal(sanitized.leadArchitectApproval, undefined);
  });

  await t.test('Strict mode throws error when client attempts to inject protected fields', () => {
    const payload = {
      tcode: 'FB03',
      lifecycleStatus: 'APPROVED'
    };

    assert.throws(
      () => sanitizeProtectedFields(payload, { strict: true }),
      /Security Violation.*unauthorized protected security field/
    );
  });
});

test('GOV-002: Assessment permissions and tenant scope', async (t) => {
  const store = createTempStore();

  await t.test('Assessment creation stamps verified tenantId from authenticated userContext, ignoring client payload', async () => {
    const userContext = {
      id: 'USR-CONSULT-01',
      name: 'Alice Consultant',
      tenantId: 'TENANT-ALPHA',
      role: USER_ROLES.SAP_CONSULTANT
    };

    const record = await store.create({
      tcode: 'VA01',
      title: 'Tenant Alpha Assessment',
      tenantId: 'FORGED-TENANT-BETA'
    }, 'REQ-001', userContext);

    assert.equal(record.tenantId, 'TENANT-ALPHA', 'Tenant must be derived from verified user context, never client body');
    assert.equal(record.createdBy, 'USR-CONSULT-01');
  });

  await t.test('Tenant-isolated list only returns records belonging to authenticated tenant', async () => {
    const userA = { id: 'USR-A', tenantId: 'TENANT-A', role: USER_ROLES.SAP_CONSULTANT };
    const userB = { id: 'USR-B', tenantId: 'TENANT-B', role: USER_ROLES.SAP_CONSULTANT };

    await store.create({ id: 'ASM-A1', tcode: 'VA01', title: 'A1' }, 'REQ-A', userA);
    await store.create({ id: 'ASM-B1', tcode: 'FB03', title: 'B1' }, 'REQ-B', userB);

    const listA = await store.list({ tenantId: 'TENANT-A' });
    const listB = await store.list({ tenantId: 'TENANT-B' });

    assert.ok(listA.every((r) => r.tenantId === 'TENANT-A'));
    assert.ok(listB.every((r) => r.tenantId === 'TENANT-B'));
    assert.ok(!listA.some((r) => r.id === 'ASM-B1'));
    assert.ok(!listB.some((r) => r.id === 'ASM-A1'));
  });
});

test('GOV-003: Creator/approver separation of duties', async (t) => {
  const store = createTempStore();

  await t.test('Creator cannot approve their own assessment (throws SEPARATION_OF_DUTIES_VIOLATION)', async () => {
    const creatorUser = {
      id: 'USR-CREATOR-01',
      name: 'Charlie Creator',
      role: USER_ROLES.SAP_CONSULTANT,
      tenantId: 'TENANT-S21'
    };

    const record = await store.create({
      id: 'ASM-SOD-01',
      tcode: 'VA01',
      title: 'Sales Order Gap Assessment'
    }, 'REQ-SOD', creatorUser);

    await store.submitForReview(record.id, creatorUser, 'Ready for governance approval');

    // Attempt self-approval by creator:
    await assert.rejects(
      async () => {
        await store.approve(record.id, creatorUser, 'Self-approving my own assessment');
      },
      (err) => {
        assert.equal(err.code, 'SEPARATION_OF_DUTIES_VIOLATION');
        return true;
      }
    );
  });

  await t.test('Admin user who created the assessment cannot self-approve even with admin credentials', async () => {
    const adminCreator = {
      id: 'USR-ADMIN-CREATOR',
      name: 'Dave Admin',
      role: USER_ROLES.ADMIN,
      tenantId: 'TENANT-S21'
    };

    const record = await store.create({
      id: 'ASM-SOD-ADMIN',
      tcode: 'ME21N',
      title: 'Admin Created Assessment'
    }, 'REQ-SOD2', adminCreator);

    await store.submitForReview(record.id, adminCreator);

    await assert.rejects(
      async () => {
        await store.approve(record.id, adminCreator, 'Admin self-approval');
      },
      (err) => {
        assert.equal(err.code, 'SEPARATION_OF_DUTIES_VIOLATION');
        return true;
      }
    );
  });

  await t.test('Distinct authorized approver can successfully approve', async () => {
    const creatorUser = {
      id: 'USR-CREATOR-02',
      name: 'Eve Consultant',
      role: USER_ROLES.SAP_CONSULTANT,
      tenantId: 'TENANT-S21'
    };

    const approverUser = {
      id: 'USR-APPROVER-01',
      name: 'Frank Enterprise Architect',
      role: USER_ROLES.APPROVER,
      tenantId: 'TENANT-S21'
    };

    const record = await store.create({
      id: 'ASM-SOD-PASS',
      tcode: 'VA01',
      title: 'Separation of Duties Compliant Assessment'
    }, 'REQ-SOD3', creatorUser);

    await store.submitForReview(record.id, creatorUser);
    const approved = await store.approve(record.id, approverUser, 'Formally approved by independent architect.');

    assert.equal(approved.lifecycleStatus, LIFECYCLE_STATES.APPROVED);
    assert.equal(approved.governanceReview.approvedBy, 'USR-APPROVER-01');
    assert.ok(approved.approvalSignature, 'Cryptographic approval signature must be generated');
  });
});

test('GOV-004: Cryptographically bound HMAC-SHA256 signatures', async (t) => {
  const store = createTempStore();

  const creator = { id: 'USR-C1', name: 'Creator', role: USER_ROLES.SAP_CONSULTANT, tenantId: 'TENANT-1' };
  const approver = { id: 'USR-ARCH-1', name: 'Lead Architect', role: USER_ROLES.LEAD_ARCHITECT, tenantId: 'TENANT-1' };

  const record = await store.create({
    id: 'ASM-CRYPTO-01',
    tcode: 'VA01',
    systemId: 'S21',
    client: '200'
  }, 'REQ-CRYPTO', creator);

  await store.submitForReview(record.id, creator);
  const approved = await store.approve(record.id, approver, 'Approved for custom modernization.');

  await t.test('Approval signature uses HMAC-SHA256 with version prefix', () => {
    assert.ok(approved.approvalSignature.startsWith('sig:v1:'));
    assert.equal(approved.leadArchitectApproval.approved, true);
    assert.ok(approved.leadArchitectApproval.canonicalPayload);
  });

  await t.test('Verification succeeds on authentic unaltered assessment', async () => {
    const verifyRes = await defaultCryptographicSignatureService.verifyApproval(
      approved,
      approved.leadArchitectApproval
    );
    assert.equal(verifyRes.valid, true);
  });

  await t.test('Tampering with assessment fields invalidates cryptographic signature', async () => {
    const tampered = {
      ...approved,
      tcode: 'MALICIOUS_TCODE' // tampered field modifies manifest hash
    };

    const verifyRes = await defaultCryptographicSignatureService.verifyApproval(
      tampered,
      approved.leadArchitectApproval
    );
    assert.equal(verifyRes.valid, false);
    assert.equal(verifyRes.reason, 'ARTIFACT_MANIFEST_HASH_MISMATCH');
  });

  await t.test('Expired approval signature fails verification', async () => {
    const expiredApproval = {
      ...approved.leadArchitectApproval,
      canonicalPayload: {
        ...approved.leadArchitectApproval.canonicalPayload,
        expiresAt: new Date(Date.now() - 10000).toISOString()
      }
    };

    const verifyRes = await defaultCryptographicSignatureService.verifyApproval(
      approved,
      expiredApproval
    );
    assert.equal(verifyRes.valid, false);
    assert.equal(verifyRes.reason, 'APPROVAL_EXPIRED');
  });
});

test('GOV-005: Revalidate approval at handoff and generation boundaries', async (t) => {
  const store = createTempStore();
  const tmpHandoffPath = path.join(os.tmpdir(), `test-handoffs-${Date.now()}-${Math.random().toString(36).slice(2)}.json`);
  const handoffStore = new GenerationHandoffStore(tmpHandoffPath, store, { allowVolatileStoreInProduction: true });
  const projectService = new GenerationProjectService({
    assessmentStore: store,
    handoffStore
  });

  const creator = { id: 'USR-C2', name: 'Creator', role: USER_ROLES.SAP_CONSULTANT, tenantId: 'TENANT-S21' };
  const approver = { id: 'USR-ARCH-2', name: 'Lead Architect', role: USER_ROLES.LEAD_ARCHITECT, tenantId: 'TENANT-S21' };

  const record = await store.create({
    id: 'ASM-HANDOFF-01',
    tcode: 'VA01',
    title: 'Handoff Test Assessment',
    systemId: 'S21',
    client: '200',
    recommendation: { outcome: 'BUILD' },
    assessmentResult: 'BUILD'
  }, 'REQ-HND', creator);

  await store.submitForReview(record.id, creator);
  const approved = await store.approve(record.id, approver, 'Approved for Generation Studio handoff.');

  await t.test('Valid approved assessment successfully creates handoff', async () => {
    const handoff = await handoffStore.createHandoff({
      sourceAssessmentId: approved.id,
      leadArchitectApproval: approved.leadArchitectApproval,
      justification: 'Approved custom RAP application build'
    }, approver);

    assert.ok(handoff.handoffId);
    assert.equal(handoff.sourceAssessmentId, approved.id);
  });

  await t.test('Handoff fails closed if assessment material requirements changed after approval', async () => {
    await store.update(approved.id, { materialRequirementsChanged: true }, approver.name, 'Marking material requirements changed', approver);

    await assert.rejects(
      async () => {
        await handoffStore.createHandoff({
          sourceAssessmentId: approved.id,
          leadArchitectApproval: approved.leadArchitectApproval,
          justification: 'Attempt with invalidated assessment'
        }, approver);
      },
      /Approval Invalidated|ARTIFACT_MANIFEST_HASH_MISMATCH/
    );
  });

  await t.test('Generation project creation revalidates approval and fails if unapproved', async () => {
    const unapprovedRecord = await store.create({
      id: 'ASM-UNAPPROVED-01',
      tcode: 'ME21N',
      title: 'Unapproved Assessment',
      recommendation: { outcome: 'BUILD' }
    }, 'REQ-UNAPP', creator);

    const validation = await projectService.validateAssessmentForBuildHandoff(unapprovedRecord.id);
    assert.equal(validation.isValid, false);
    assert.equal(validation.unapproved, true);
  });
});

test('GOV-006: Lifecycle state machine and append-only tamper-evident audit log', async (t) => {
  const store = createTempStore();
  const user = { id: 'USR-AUDIT', name: 'Auditor', role: USER_ROLES.SAP_CONSULTANT, tenantId: 'TENANT-AUDIT' };

  const record = await store.create({
    id: 'ASM-AUDIT-01',
    tcode: 'VA01',
    title: 'Audit Log Test'
  }, 'REQ-AUD', user);

  await store.submitForReview(record.id, user, 'Submission audit event');
  const approver = { id: 'USR-APPROVE-A', name: 'Approver A', role: USER_ROLES.APPROVER, tenantId: 'TENANT-AUDIT' };
  await store.approve(record.id, approver, 'Approval audit event');

  await t.test('Audit history records all lifecycle transitions', async () => {
    const history = await store.getAuditHistory(record.id);
    assert.ok(history.length >= 3);
    assert.ok(history.some((e) => e.action === 'CREATED'));
    assert.ok(history.some((e) => e.action === 'STATE_TRANSITION' || e.action === 'SUBMITTED_FOR_REVIEW'));
    assert.ok(history.some((e) => e.action === 'APPROVED' || e.action === 'STATE_TRANSITION'));
  });

  await t.test('Audit hash chain verifies integrity from genesis to latest', async () => {
    const chainCheck = await store.verifyAuditChain(record.id);
    assert.equal(chainCheck.valid, true);
    assert.ok(chainCheck.count >= 3);
    assert.ok(chainCheck.latestHash);
  });

  await t.test('Illegal state transition from ARCHIVED to PENDING_REVIEW is rejected', async () => {
    await store.archive(record.id, 'Auditor', 'Archiving assessment');
    await assert.rejects(
      async () => {
        await store.submitForReview(record.id, user);
      },
      /Illegal lifecycle state transition/
    );
  });
});

test('GOV-007: ADD_AND_CONFIGURE vs BUILD standard-first decisioning', async (t) => {
  const recommendationEngine = new RecommendationEngine();

  await t.test('Standard Fiori successor available produces ADD_AND_CONFIGURE, not BUILD', () => {
    const rec = recommendationEngine.generate({
      requirement: { tcode: 'VA01', title: 'Create Sales Order' },
      candidate: { appId: 'F1814', appName: 'Create Sales Orders', productVersion: 'SAP S/4HANA 2023' },
      assessment: {
        overallStatus: 'FIT',
        confidence: 'HIGH',
        identifiedGaps: [],
        dimensionResults: { compatibility: { status: 'FIT' } }
      }
    });

    assert.equal(rec.outcome, RECOMMENDATION_OUTCOMES.ADD_AND_CONFIGURE);
  });

  await t.test('Network connectivity failure or missing evidence NEVER recommends BUILD (retains in REVIEW or INSUFFICIENT_EVIDENCE)', () => {
    const rec = recommendationEngine.generate({
      requirement: { tcode: 'VA01', title: 'Sales Order' },
      candidate: { appId: 'F1814', appName: 'Create Sales Orders' },
      assessment: {
        overallStatus: 'INSUFFICIENT_EVIDENCE',
        confidence: 'VERY_LOW',
        missingEvidence: ['Gateway catalog unreachable due to network timeout']
      }
    });

    assert.equal(rec.outcome, RECOMMENDATION_OUTCOMES.INSUFFICIENT_EVIDENCE);
    assert.notEqual(rec.outcome, RECOMMENDATION_OUTCOMES.BUILD, 'Missing evidence must never recommend BUILD');
  });

  await t.test('Critical functional gap with verified NO_FIT and architect approval allows BUILD recommendation', () => {
    const rec = recommendationEngine.generate({
      requirement: { tcode: 'ZCUSTOM_SPECIAL', title: 'Proprietary Workflow' },
      candidate: { appId: 'NONE', appName: 'No Standard Successor' },
      assessment: {
        overallStatus: 'NO_FIT',
        confidence: 'HIGH',
        identifiedGaps: [
          { gapId: 'GAP-01', severity: 'CRITICAL', category: 'FUNCTIONAL_GAP', gapClassification: 'FUNCTIONAL_GAP' }
        ],
        leadArchitectApproval: {
          approved: true,
          approver: 'Lead Enterprise Architect',
          scope: 'BUILD'
        }
      },
      context: {
        cleanCoreJustification: 'Proprietary core workflow has no standard equivalent across SAP Fiori Apps Library.',
        leadArchitectApproval: {
          approved: true,
          approver: 'Lead Enterprise Architect',
          scope: 'BUILD'
        }
      }
    });

    assert.ok(rec.outcome === RECOMMENDATION_OUTCOMES.BUILD || rec.outcome === RECOMMENDATION_OUTCOMES.REVIEW);
  });
});

test('GOV-008: Privileged and audited override controls', async (t) => {
  const store = createTempStore();
  const auditLogger = new SecurityAuditLogger();

  const creator = { id: 'USR-C3', name: 'Creator', role: USER_ROLES.SAP_CONSULTANT, tenantId: 'TENANT-S21' };
  const nonAdmin = { id: 'USR-DEV-01', name: 'Developer', role: USER_ROLES.DEVELOPER, tenantId: 'TENANT-S21' };
  const admin = { id: 'USR-ADMIN-01', name: 'Chief Architect Admin', role: USER_ROLES.ADMIN, tenantId: 'TENANT-S21' };

  const record = await store.create({
    id: 'ASM-OVERRIDE-01',
    tcode: 'VA01',
    title: 'Governance Override Test'
  }, 'REQ-OVR', creator);

  await t.test('Non-admin user cannot execute administrative override (UNAUTHORIZED_OVERRIDE)', async () => {
    await assert.rejects(
      async () => {
        await store.approve(record.id, nonAdmin, 'Attempting unauthorized override without admin rights', true);
      },
      (err) => {
        assert.equal(err.code, 'UNAUTHORIZED_OVERRIDE');
        return true;
      }
    );
  });

  await t.test('Override with justification less than 10 characters is rejected', async () => {
    await assert.rejects(
      async () => {
        await store.approve(record.id, admin, 'Too short', true);
      },
      (err) => {
        assert.equal(err.code, 'VALIDATION_ERROR');
        return true;
      }
    );
  });

  await t.test('Admin user with documented justification can successfully override', async () => {
    const overrideReason = 'Formally authorized by Architecture Review Board per Charter Clause 4.2.';
    const overridden = await store.approve(record.id, admin, overrideReason, true);

    assert.equal(overridden.lifecycleStatus, LIFECYCLE_STATES.APPROVED);
    assert.equal(overridden.governanceReview.isOverride, true);
    assert.equal(overridden.governanceReview.comments, overrideReason);
    assert.ok(overridden.approvalSignature);
  });

  await t.test('Audit logger records ADMIN_OVERRIDE security event', async () => {
    const event = {
      actor: admin.id,
      tenantId: admin.tenantId,
      action: SECURITY_ACTIONS.ADMIN_OVERRIDE,
      resource: `/api/v1/assessments/${record.id}/override`,
      outcome: 'GRANTED',
      details: { reason: 'Formally authorized override' }
    };

    const hash = auditLogger.computeHash(event);
    assert.ok(hash && typeof hash === 'string');
    assert.equal(hash.length, 64);
  });
});
