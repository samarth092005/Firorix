import test from 'node:test';
import assert from 'node:assert/strict';
import { RecommendationEngine, RECOMMENDATION_OUTCOMES, BUSINESS_OUTCOMES, GOVERNANCE_STATES } from '../src/engine/recommendationEngine.js';
import { AuthService, USER_ROLES, PERMISSIONS } from '../src/services/authService.js';
import { GenerationHandoffStore } from '../src/services/generationHandoffStore.js';
import { AssessmentStore } from '../src/services/assessmentStore.js';

test('BUILD Governance, Architect Authorization & Catalogue Provenance Verification', async (t) => {
  const auth = new AuthService();
  const recEngine = new RecommendationEngine();

  // 1. Authorization Matrix: Only BUILD_ARCHITECT_APPROVER can approve BUILD
  await t.test('1. Authorization Matrix: Generic ADMIN cannot authorize BUILD without permission', () => {
    const adminUser = {
      id: 'USR-ADMIN-01',
      role: USER_ROLES.ADMIN,
      scopes: [PERMISSIONS.ASSESSMENT_APPROVE, PERMISSIONS.USER_ADMIN]
    };
    assert.strictEqual(auth.canApproveBuild(adminUser), false, 'Generic ADMIN must not be able to approve BUILD');
  });

  await t.test('2. Authorization Matrix: Generic APPROVER cannot authorize BUILD without permission', () => {
    const approverUser = {
      id: 'USR-APP-01',
      role: USER_ROLES.APPROVER,
      scopes: [PERMISSIONS.ASSESSMENT_APPROVE]
    };
    assert.strictEqual(auth.canApproveBuild(approverUser), false, 'Generic APPROVER must not be able to approve BUILD');
  });

  await t.test('3. Authorization Matrix: LEAD_ARCHITECT or user with BUILD_ARCHITECT_APPROVER can authorize BUILD', () => {
    const leadArchitect = {
      id: 'USR-ARCH-01',
      role: USER_ROLES.LEAD_ARCHITECT,
      scopes: [PERMISSIONS.BUILD_ARCHITECT_APPROVER]
    };
    assert.strictEqual(auth.canApproveBuild(leadArchitect), true, 'LEAD_ARCHITECT must be authorized to approve BUILD');

    const delegatedApprover = {
      id: 'USR-DELEGATE-01',
      role: USER_ROLES.APPROVER,
      scopes: [PERMISSIONS.ASSESSMENT_APPROVE, PERMISSIONS.BUILD_ARCHITECT_APPROVER]
    };
    assert.strictEqual(auth.canApproveBuild(delegatedApprover), true, 'User with explicit BUILD_ARCHITECT_APPROVER permission must be authorized');
  });

  // 2. Version Binding & Expiration in Generation Handoff
  await t.test('4. Handoff Guardrails: Rejects assessment version mismatch', async () => {
    const mockAssessmentStore = {
      getById: async () => ({
        id: 'ASM-VER-01',
        version: 2,
        matchingFioriApp: { appId: 'F0773' },
        fitGapScore: 80
      })
    };
    const handoffStore = new GenerationHandoffStore(null, mockAssessmentStore);

    await assert.rejects(
      async () => {
        await handoffStore.createHandoff({
          sourceAssessmentId: 'ASM-VER-01',
          cleanCoreJustification: 'Custom development justified',
          leadArchitectApproval: {
            approved: true,
            assessmentId: 'ASM-VER-01',
            assessmentVersion: 1, // Stale version 1 on version 2 assessment
            scope: 'BUILD',
            approver: 'Lead Architect'
          }
        });
      },
      (err) => {
        assert.strictEqual(err.code, 'APPROVAL_VERSION_MISMATCH');
        return true;
      }
    );
  });

  await t.test('5. Handoff Guardrails: Rejects expired architectural approval', async () => {
    const mockAssessmentStore = {
      getById: async () => ({
        id: 'ASM-EXP-01',
        version: 1,
        matchingFioriApp: { appId: 'F0773' },
        fitGapScore: 80
      })
    };
    const handoffStore = new GenerationHandoffStore(null, mockAssessmentStore);

    await assert.rejects(
      async () => {
        await handoffStore.createHandoff({
          sourceAssessmentId: 'ASM-EXP-01',
          cleanCoreJustification: 'Custom development justified',
          leadArchitectApproval: {
            approved: true,
            assessmentId: 'ASM-EXP-01',
            assessmentVersion: 1,
            expiresAt: '2020-01-01T00:00:00Z', // In the past!
            scope: 'BUILD',
            approver: 'Lead Architect'
          }
        });
      },
      (err) => {
        assert.strictEqual(err.code, 'APPROVAL_EXPIRED');
        return true;
      }
    );
  });

  await t.test('6. Handoff Guardrails: Rejects cross-assessment approval reuse', async () => {
    const mockAssessmentStore = {
      getById: async () => ({
        id: 'ASM-TARGET-01',
        version: 1,
        matchingFioriApp: { appId: 'F0773' },
        fitGapScore: 80
      })
    };
    const handoffStore = new GenerationHandoffStore(null, mockAssessmentStore);

    await assert.rejects(
      async () => {
        await handoffStore.createHandoff({
          sourceAssessmentId: 'ASM-TARGET-01',
          cleanCoreJustification: 'Custom development justified',
          leadArchitectApproval: {
            approved: true,
            assessmentId: 'ASM-OTHER-99', // Mismatched ID!
            scope: 'BUILD',
            approver: 'Lead Architect'
          }
        });
      },
      (err) => {
        assert.strictEqual(err.code, 'APPROVAL_ASSESSMENT_MISMATCH');
        return true;
      }
    );
  });

  await t.test('7. Handoff Guardrails: Rejects client-supplied approval flags from unauthorized user', async () => {
    const mockAssessmentStore = {
      getById: async () => ({
        id: 'ASM-UNAUTH-01',
        version: 1,
        lifecycleStatus: 'PENDING_REVIEW', // Not approved server-side
        matchingFioriApp: { appId: 'F0773' },
        fitGapScore: 80
      })
    };
    const handoffStore = new GenerationHandoffStore(null, mockAssessmentStore);

    const genericUser = {
      id: 'USR-CONS-02',
      role: USER_ROLES.SAP_CONSULTANT,
      scopes: []
    };

    await assert.rejects(
      async () => {
        await handoffStore.createHandoff(
          {
            sourceAssessmentId: 'ASM-UNAUTH-01',
            architectApproved: true, // Client trying to unilaterally approve
            cleanCoreJustification: 'Custom development justified'
          },
          genericUser
        );
      },
      (err) => {
        assert.strictEqual(err.code, 'UNAUTHORIZED_BUILD_APPROVER');
        return true;
      }
    );
  });

  // 3. Catalogue Search Provenance
  await t.test('8. Catalogue Provenance: Incomplete or failed search never defaults to BUILD', () => {
    const failedSearchAssessment = {
      id: 'ASM-SRCH-FAIL',
      tcode: 'ZFAIL_PROCESS',
      overallStatus: 'NO_FIT',
      confidence: 'HIGH',
      verificationStatus: 'VERIFIED',
      programName: 'ZFAIL_PROG',
      packageName: 'Z_PACKAGE',
      catalogueSearch: {
        officialSourceId: 'SAP_FIORI_APPS_REFERENCE_LIBRARY',
        searchExecutionId: 'SRCH-FAIL-01',
        searchCompletionStatus: 'FAILED', // Failed search!
        query: 'ZFAIL_PROCESS',
        targetRelease: 'SAP S/4HANA 2023',
        timestamp: '2026-11-13T10:00:00Z'
      }
    };

    const res = recEngine.generate({
      assessment: failedSearchAssessment,
      requirement: { tcode: 'ZFAIL_PROCESS', statement: 'Verified proprietary process' },
      candidate: null,
      context: {
        targetSystem: { systemId: 'S21', release: 'SAP S/4HANA 2023' },
        leadArchitectApproval: { approved: true, assessmentId: 'ASM-SRCH-FAIL', scope: 'BUILD', approver: 'Lead Architect' }
      }
    });

    assert.strictEqual(res.outcome, RECOMMENDATION_OUTCOMES.REVIEW);
    assert.strictEqual(res.businessOutcome, null);
    assert.strictEqual(res.governanceState, GOVERNANCE_STATES.REVIEW);
  });

  await t.test('9. Catalogue Provenance: Cached snapshot honestly recorded without claiming live API', () => {
    const cachedSearchAssessment = {
      id: 'ASM-SRCH-CACHE',
      tcode: 'ZCUSTOM_APP',
      version: 1,
      overallStatus: 'NO_FIT',
      confidence: 'HIGH',
      verificationStatus: 'VERIFIED',
      programName: 'ZCUSTOM_PROG',
      packageName: 'Z_PACKAGE',
      genericCapabilitiesEvaluated: true,
      companionAppsEvaluated: true,
      webGuiFallbackEvaluated: true,
      standardAlternativesEvaluated: true,
      configurationEvaluated: true,
      configurationInsufficient: true,
      cleanCoreExtensionEvaluated: true,
      extensionAlternativesEvaluated: true,
      catalogueSearch: {
        officialSourceId: 'SAP_FIORI_APPS_REFERENCE_LIBRARY',
        searchExecutionId: 'SRCH-CACHE-20261113-001',
        searchCompletionStatus: 'COMPLETED_ZERO_MATCHES',
        resultCount: 0,
        sourceProvenance: 'CACHED_SNAPSHOT', // Honestly marked provenance
        catalogueVersion: '2023-FPS02',
        query: 'ZCUSTOM_APP',
        targetRelease: 'SAP S/4HANA 2023',
        timestamp: '2026-11-13T10:00:00Z'
      }
    };

    const res = recEngine.generate({
      assessment: cachedSearchAssessment,
      requirement: { tcode: 'ZCUSTOM_APP', statement: 'Custom inventory reconciliation' },
      candidate: null,
      context: {
        targetSystem: { systemId: 'S21', release: 'SAP S/4HANA 2023' },
        leadArchitectApproval: { approved: true, assessmentId: 'ASM-SRCH-CACHE', assessmentVersion: 1, scope: 'BUILD', approver: 'Lead Architect' }
      }
    });

    assert.strictEqual(res.outcome, RECOMMENDATION_OUTCOMES.BUILD);
    assert.strictEqual(res.businessOutcome, BUSINESS_OUTCOMES.BUILD);
  });
});
