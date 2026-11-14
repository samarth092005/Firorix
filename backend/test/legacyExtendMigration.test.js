import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { AssessmentStore, resolveLegacyExtendRecord, normalizeAssessmentRecord } from '../src/services/assessmentStore.js';
import { AssessmentRepository } from '../src/infrastructure/db/repositories/assessmentRepository.js';

test('Fiorify Phase 3 — Legacy EXTEND Migration & Hydration Suite', async (t) => {
  // Scenario 1: Legacy EXTEND with standard-app fit
  await t.test('1. Legacy EXTEND with standard-app fit maps to ADD_AND_CONFIGURE', () => {
    const input = {
      tcode: 'F-53',
      matchingFioriApp: { appId: 'F0773', appName: 'Manage Outgoing Payments' },
      verificationStatus: 'VERIFIED',
      identifiedGaps: [
        { id: 'GAP-01', category: 'TECHNICAL_DEPENDENCY', severity: 'MEDIUM', title: 'OData registration needed' }
      ]
    };

    const res = resolveLegacyExtendRecord(input, 'EXTEND', 'EXTEND');
    assert.ok(res, 'Must return resolution');
    assert.strictEqual(res.outcome, 'ADD_AND_CONFIGURE');
    assert.strictEqual(res.canonicalOutcome, 'ADD_AND_CONFIGURE');
    assert.strictEqual(res.businessOutcome, 'ADD_AND_CONFIGURE');
    assert.strictEqual(res.governanceState, null);
    assert.strictEqual(res.isBusinessOutcome, true);
    assert.strictEqual(res.legacyOriginalOutcome, 'EXTEND');
  });

  // Scenario 2: Legacy EXTEND with critical gaps and no approval
  await t.test('2. Legacy EXTEND with critical gaps and no approval maps to REVIEW with requiresFreshApproval', () => {
    const input = {
      tcode: 'ZPAY_CUSTOM',
      lifecycleStatus: 'IN_PROGRESS',
      approvalStatus: 'PENDING',
      identifiedGaps: [
        { id: 'GAP-01', category: 'FUNCTIONAL_CAPABILITY', severity: 'CRITICAL', title: 'Proprietary bank clearing engine' }
      ]
    };

    const res = resolveLegacyExtendRecord(input, 'EXTEND', 'EXTEND');
    assert.ok(res, 'Must return resolution');
    assert.strictEqual(res.outcome, 'REVIEW');
    assert.strictEqual(res.canonicalOutcome, 'REVIEW');
    assert.strictEqual(res.businessOutcome, null);
    assert.strictEqual(res.governanceState, 'REVIEW');
    assert.strictEqual(res.isBusinessOutcome, false);
    assert.strictEqual(res.legacyOriginalOutcome, 'EXTEND');
    assert.strictEqual(res.requiresFreshApproval, true);
    assert.match(res.migrationRationale, /architect approval for custom development is missing/i);
  });

  // Scenario 3: Legacy EXTEND with an approval explicitly scoped to BUILD
  await t.test('3. Legacy EXTEND with an approval explicitly scoped to BUILD maps to BUILD', () => {
    const input = {
      tcode: 'ZPAY_CUSTOM_APPROVED',
      lifecycleStatus: 'APPROVED',
      leadArchitectApproval: {
        approved: true,
        approver: 'ARCHITECT-01',
        scope: 'BUILD',
        timestamp: '2026-01-15T10:00:00Z'
      },
      identifiedGaps: [
        { id: 'GAP-01', category: 'FUNCTIONAL_CAPABILITY', severity: 'CRITICAL', title: 'Proprietary bank clearing engine' }
      ]
    };

    const res = resolveLegacyExtendRecord(input, 'EXTEND', 'EXTEND');
    assert.ok(res, 'Must return resolution');
    assert.strictEqual(res.outcome, 'BUILD');
    assert.strictEqual(res.canonicalOutcome, 'BUILD');
    assert.strictEqual(res.businessOutcome, 'BUILD');
    assert.strictEqual(res.governanceState, null);
    assert.strictEqual(res.isBusinessOutcome, true);
    assert.strictEqual(res.legacyOriginalOutcome, 'EXTEND');
  });

  // Scenario 4: Legacy EXTEND with approval scoped only to old EXTEND decision
  await t.test('4. Legacy EXTEND with approval scoped only to old EXTEND decision maps to REVIEW (not silently promoted to BUILD)', () => {
    const input = {
      tcode: 'ZPAY_EXTEND_OLD_APP',
      lifecycleStatus: 'APPROVED',
      approvalStatus: 'APPROVED',
      leadArchitectApproval: {
        approved: true,
        approver: 'ARCHITECT-02',
        scope: 'EXTEND',
        decision: 'EXTEND',
        timestamp: '2025-11-20T14:30:00Z',
        justification: 'Approved for in-app extension only'
      },
      identifiedGaps: [
        { id: 'GAP-01', category: 'FUNCTIONAL_CAPABILITY', severity: 'CRITICAL', title: 'Custom payroll calculation engine' }
      ]
    };

    const res = resolveLegacyExtendRecord(input, 'EXTEND', 'EXTEND');
    assert.ok(res, 'Must return resolution');
    assert.strictEqual(res.outcome, 'REVIEW');
    assert.strictEqual(res.canonicalOutcome, 'REVIEW');
    assert.strictEqual(res.businessOutcome, null);
    assert.strictEqual(res.governanceState, 'REVIEW');
    assert.strictEqual(res.isBusinessOutcome, false);
    assert.strictEqual(res.legacyOriginalOutcome, 'EXTEND');
    assert.strictEqual(res.requiresFreshApproval, true);
    assert.match(res.migrationRationale, /historical approval was scoped to EXTEND/i);
    // Verify approval metadata is preserved without fabrication
    assert.strictEqual(input.leadArchitectApproval.approver, 'ARCHITECT-02');
    assert.strictEqual(input.leadArchitectApproval.timestamp, '2025-11-20T14:30:00Z');
  });

  // Scenario 5: Legacy EXTEND with incomplete evidence
  await t.test('5. Legacy EXTEND with incomplete evidence maps to REVIEW', () => {
    const input = {
      tcode: 'VA01_CUSTOM',
      matchingFioriApp: null,
      verificationStatus: 'UNVERIFIED',
      missingEvidence: ['OData service schema not retrieved'],
      identifiedGaps: []
    };

    const res = resolveLegacyExtendRecord(input, 'EXTEND', 'EXTEND');
    assert.ok(res, 'Must return resolution');
    assert.strictEqual(res.outcome, 'REVIEW');
    assert.strictEqual(res.canonicalOutcome, 'REVIEW');
    assert.strictEqual(res.businessOutcome, null);
    assert.strictEqual(res.governanceState, 'REVIEW');
    assert.strictEqual(res.isBusinessOutcome, false);
    assert.strictEqual(res.legacyOriginalOutcome, 'EXTEND');
  });

  await t.test('4. JSON storage persistence preserves migration audit and is idempotent', async () => {
    const tempStorage = path.join(os.tmpdir(), `test-extend-mig-${Date.now()}-${Math.random().toString(36).slice(2)}.json`);
    try {
      const store = new AssessmentStore({ storagePath: tempStorage });

      // Create an assessment with legacy EXTEND recommendation
      const record = await store.create({
        id: 'ASM-EXT-TEST-001',
        tcode: 'F-53',
        matchingFioriApp: { appId: 'F0773', appName: 'Manage Outgoing Payments' },
        verificationStatus: 'VERIFIED',
        recommendation: {
          outcome: 'EXTEND',
          canonicalOutcome: 'EXTEND',
          rationale: 'Legacy extension proposal.'
        }
      });

      assert.strictEqual(record.recommendation.outcome, 'ADD_AND_CONFIGURE');
      assert.strictEqual(record.recommendation.businessOutcome, 'ADD_AND_CONFIGURE');
      assert.strictEqual(record.legacyOriginalOutcome, 'EXTEND');

      // Reload store and retrieve
      const reloadedStore = new AssessmentStore({ storagePath: tempStorage });
      const loaded = await reloadedStore.getById('ASM-EXT-TEST-001');
      assert.ok(loaded);
      assert.strictEqual(loaded.recommendation.outcome, 'ADD_AND_CONFIGURE');
      assert.strictEqual(loaded.legacyOriginalOutcome, 'EXTEND');

      // Idempotency: re-normalizing loaded record does not overwrite or corrupt
      const normalizedAgain = normalizeAssessmentRecord(loaded);
      assert.strictEqual(normalizedAgain.recommendation.outcome, 'ADD_AND_CONFIGURE');
      assert.strictEqual(normalizedAgain.legacyOriginalOutcome, 'EXTEND');
    } finally {
      if (fs.existsSync(tempStorage)) fs.unlinkSync(tempStorage);
    }
  });

  await t.test('5. PostgreSQL repository hydration correctly applies legacy EXTEND logic', async () => {
    // Mock db client to test repository row hydration
    const repo = new AssessmentRepository(null);

    // Case A: EXTEND with candidate and verified status -> ADD_AND_CONFIGURE
    const rowA = {
      id: 'ASM-DB-EXT-01',
      transaction_code: 'F-53',
      description: 'Post Outgoing Payments',
      business_area: 'Finance',
      system_id: 'S21',
      client: '200',
      target_release: 'S/4HANA 2023',
      lifecycle_status: 'IN_PROGRESS',
      recommendation_action: 'EXTEND',
      candidate_app_id: 'F0773',
      candidate_app_name: 'Post Outgoing Payments',
      verification_status: 'VERIFIED',
      gaps_count: 0,
      created_by: 'ARCHITECT-01',
      created_at: new Date(),
      updated_at: new Date()
    };

    const auditMock = { rows: [] };
    const dimMock = { rows: [] };

    // Test hydration logic via direct method or pool query mock
    const mockPool = {
      query: async (sql, params) => {
        if (sql.includes('FROM assessment_audit_events')) return auditMock;
        if (sql.includes('FROM fit_gap_dimensions')) return dimMock;
        if (sql.includes('FROM assessments WHERE id')) return { rows: [rowA] };
        return { rows: [] };
      }
    };

    const hydratedRepo = new AssessmentRepository(mockPool);
    const hydratedA = await hydratedRepo.getById('ASM-DB-EXT-01');

    assert.ok(hydratedA);
    assert.strictEqual(hydratedA.recommendation.outcome, 'ADD_AND_CONFIGURE');
    assert.strictEqual(hydratedA.recommendation.businessOutcome, 'ADD_AND_CONFIGURE');
    assert.strictEqual(hydratedA.legacyOriginalOutcome, 'EXTEND');

    // Case B: EXTEND with gaps and explicit BUILD approval -> BUILD
    const rowB = {
      id: 'ASM-DB-EXT-02',
      transaction_code: 'ZPAY_CUSTOM',
      description: 'Custom Payment Clearing',
      business_area: 'Finance',
      system_id: 'S21',
      client: '200',
      target_release: 'S/4HANA 2023',
      lifecycle_status: 'APPROVED',
      recommendation_action: 'EXTEND',
      verification_status: 'VERIFIED',
      gaps_count: 3,
      lead_architect_approval: JSON.stringify({ approved: true, scope: 'BUILD', approver: 'ARCHITECT-01' }),
      created_by: 'ARCHITECT-01',
      created_at: new Date(),
      updated_at: new Date()
    };

    const mockPoolB = {
      query: async (sql) => {
        if (sql.includes('FROM assessment_audit_events')) return auditMock;
        if (sql.includes('FROM fit_gap_dimensions')) return dimMock;
        if (sql.includes('FROM assessments WHERE id')) return { rows: [rowB] };
        return { rows: [] };
      }
    };
    const hydratedRepoB = new AssessmentRepository(mockPoolB);
    const hydratedB = await hydratedRepoB.getById('ASM-DB-EXT-02');
    assert.ok(hydratedB);
    assert.strictEqual(hydratedB.recommendation.outcome, 'BUILD');
    assert.strictEqual(hydratedB.recommendation.businessOutcome, 'BUILD');
    assert.strictEqual(hydratedB.legacyOriginalOutcome, 'EXTEND');

    // Case C: EXTEND with gaps and legacy approval scoped only to EXTEND -> REVIEW
    const rowC = {
      id: 'ASM-DB-EXT-03',
      transaction_code: 'ZPAY_CUSTOM_OLD',
      description: 'Legacy Extended Payment',
      business_area: 'Finance',
      system_id: 'S21',
      client: '200',
      target_release: 'S/4HANA 2023',
      lifecycle_status: 'APPROVED',
      recommendation_action: 'EXTEND',
      verification_status: 'VERIFIED',
      gaps_count: 2,
      lead_architect_approval: JSON.stringify({ approved: true, scope: 'EXTEND', approver: 'ARCHITECT-02' }),
      created_by: 'ARCHITECT-02',
      created_at: new Date(),
      updated_at: new Date()
    };

    const mockPoolC = {
      query: async (sql) => {
        if (sql.includes('FROM assessment_audit_events')) return auditMock;
        if (sql.includes('FROM fit_gap_dimensions')) return dimMock;
        if (sql.includes('FROM assessments WHERE id')) return { rows: [rowC] };
        return { rows: [] };
      }
    };
    const hydratedRepoC = new AssessmentRepository(mockPoolC);
    const hydratedC = await hydratedRepoC.getById('ASM-DB-EXT-03');
    assert.ok(hydratedC);
    assert.strictEqual(hydratedC.recommendation.outcome, 'REVIEW');
    assert.strictEqual(hydratedC.recommendation.businessOutcome, null);
    assert.strictEqual(hydratedC.recommendation.governanceState, 'REVIEW');
    assert.strictEqual(hydratedC.legacyOriginalOutcome, 'EXTEND');
  });
});
