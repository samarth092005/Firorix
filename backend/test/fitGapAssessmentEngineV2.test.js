import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  FitGapAssessmentEngine,
  fitGapAssessmentEngine,
  DEFAULT_DIMENSION_WEIGHTS,
  DIMENSION_STATUSES,
  ASSESSMENT_STATUSES,
  GAP_SEVERITIES,
  GAP_CATEGORIES
} from '../src/engine/fitGapAssessmentEngine.js';

describe('FioriX FITGAP-02 — Advanced Fit-Gap Assessment Engine 10-Dimension Tests', () => {
  const sampleRequirement = {
    id: 'REQ-MM-001',
    title: 'Create and Approve Purchase Requisitions',
    statement: 'Manage purchase requisitions with approval workflows, line item details, and account assignment.',
    businessProcess: 'Sourcing and Procurement',
    tcode: 'ME51N',
    requiredCapabilities: [
      'PURCHASE_REQUISITION_CREATION',
      'ITEM_ACCOUNT_ASSIGNMENT',
      'APPROVAL_WORKFLOW'
    ],
    requiredOperations: ['CreateRequisition', 'SimulateApproval'],
    mandatoryConditions: ['Mobile approval notification support'],
    priority: 'MANDATORY'
  };

  const sampleCandidate = {
    appId: 'F1643',
    appName: 'Manage Purchase Requisitions',
    appType: 'Transactional',
    uiTechnology: 'SAP Fiori elements (SAPUI5)',
    productVersion: 'SAP S/4HANA 2023',
    businessProcess: 'Sourcing and Procurement',
    businessRoles: ['Purchaser', 'Approver'],
    supportedCapabilities: [
      'PURCHASE_REQUISITION_CREATION',
      'ITEM_ACCOUNT_ASSIGNMENT',
      'APPROVAL_WORKFLOW'
    ],
    odataDependencies: ['MM_PUR_REQUISITION_SRV'],
    verifiedODataServices: [
      {
        serviceName: 'MM_PUR_REQUISITION_SRV',
        technicalAlias: 'MM_PUR_REQUISITION_SRV',
        availableOperations: ['CreateRequisition', 'SimulateApproval'],
        isAliasVerified: true
      }
    ]
  };

  const sampleContext = {
    targetSystem: { systemId: 'S21', release: 'SAP S/4HANA 2023' },
    activeServices: ['MM_PUR_REQUISITION_SRV'],
    userAuthorizations: ['PURCHASER', 'APPROVER'],
    customVariantActive: false
  };

  it('evaluates all 10 distinct dimensions with structured statuses and normalized weights', () => {
    const result = fitGapAssessmentEngine.evaluate({
      requirement: sampleRequirement,
      candidate: sampleCandidate,
      context: sampleContext
    });

    assert.strictEqual(result.overallStatus, ASSESSMENT_STATUSES.VERIFIED_FIT);
    assert.strictEqual(result.dimensions.length, 10);

    const dimKeys = result.dimensions.map((d) => d.dimensionKey);
    assert.ok(dimKeys.includes('functionalCoverage'));
    assert.ok(dimKeys.includes('businessProcessAlignment'));
    assert.ok(dimKeys.includes('uxAppTypeSuitability'));
    assert.ok(dimKeys.includes('technicalIntegrationReadiness'));
    assert.ok(dimKeys.includes('odataGatewayReadiness'));
    assert.ok(dimKeys.includes('authorizationAndRoles'));
    assert.ok(dimKeys.includes('releaseCompatibility'));
    assert.ok(dimKeys.includes('extensibilityAndCustomization'));
    assert.ok(dimKeys.includes('cleanCoreAlignment'));
    assert.ok(dimKeys.includes('operationalAndDeploymentReadiness'));

    // Check each dimension has valid status and normalizedWeight
    for (const d of result.dimensions) {
      assert.ok(d.status, `Dimension ${d.dimensionKey} must have status`);
      assert.ok(typeof d.normalizedWeight === 'number');
      assert.ok(d.normalizedWeight > 0);
    }

    assert.ok(result.scoreCoverage >= 80, `Expected high score coverage, got ${result.scoreCoverage}`);
    assert.strictEqual(result.evidenceConfidence, 'HIGH');
  });

  it('normalizes weights across remaining applicable dimensions when a dimension is NOT_APPLICABLE', () => {
    // Classic GUI tile has odataGatewayReadiness marked NOT_APPLICABLE
    const classicGuiCandidate = {
      appId: 'ME51N',
      appName: 'Create Purchase Requisition - Classic GUI',
      appType: 'SAP GUI',
      uiTechnology: 'SAP GUI for HTML',
      productVersion: 'SAP S/4HANA 2023',
      businessProcess: 'Sourcing and Procurement',
      businessRoles: ['Purchaser'],
      supportedCapabilities: [
        'PURCHASE_REQUISITION_CREATION',
        'ITEM_ACCOUNT_ASSIGNMENT',
        'APPROVAL_WORKFLOW'
      ]
    };

    const result = fitGapAssessmentEngine.evaluate({
      requirement: sampleRequirement,
      candidate: classicGuiCandidate,
      context: sampleContext
    });

    const odataDim = result.dimensions.find((d) => d.dimensionKey === 'odataGatewayReadiness');
    assert.strictEqual(odataDim.status, DIMENSION_STATUSES.NOT_APPLICABLE);
    assert.strictEqual(odataDim.isApplicable, false);

    // Sum of normalized weights of applicable dimensions must sum to ~1.0
    const applicableDims = result.dimensions.filter((d) => d.isApplicable && d.status !== DIMENSION_STATUSES.NOT_APPLICABLE);
    const sumNormalizedWeights = applicableDims.reduce((acc, d) => acc + d.normalizedWeight, 0);
    assert.ok(Math.abs(sumNormalizedWeights - 1.0) < 0.05, `Expected sum close to 1.0, got ${sumNormalizedWeights}`);
  });

  it('does NOT treat UNKNOWN or missing evidence as a confirmed FAIL', () => {
    const unverifiedContext = {
      targetSystem: { systemId: 'S21' } // release is missing, authorizations missing, active services missing
    };

    const candWithoutServices = {
      ...sampleCandidate,
      verifiedODataServices: []
    };

    const result = fitGapAssessmentEngine.evaluate({
      requirement: sampleRequirement,
      candidate: candWithoutServices,
      context: unverifiedContext
    });

    const authDim = result.dimensions.find((d) => d.dimensionKey === 'authorizationAndRoles');
    assert.strictEqual(authDim.status, DIMENSION_STATUSES.PENDING_VERIFICATION);
    assert.strictEqual(authDim.score, 50, 'Pending verification should have neutral score (50), not 0');

    const actDim = result.dimensions.find((d) => d.dimensionKey === 'operationalAndDeploymentReadiness');
    assert.strictEqual(actDim.status, DIMENSION_STATUSES.PENDING_VERIFICATION);
    assert.strictEqual(actDim.score, 50);

    // Overall status must not be NO_FIT simply due to missing evidence
    assert.notStrictEqual(result.overallStatus, ASSESSMENT_STATUSES.NO_FIT);
  });

  it('evaluates Clean Core Alignment correctly for standard Fiori elements vs Classic GUI', () => {
    // 1. Standard Fiori elements
    const fioriResult = fitGapAssessmentEngine.evaluate({
      requirement: sampleRequirement,
      candidate: sampleCandidate,
      context: sampleContext
    });
    const cleanCoreDimFiori = fioriResult.dimensions.find((d) => d.dimensionKey === 'cleanCoreAlignment');
    assert.strictEqual(cleanCoreDimFiori.status, DIMENSION_STATUSES.VERIFIED_FIT);
    assert.strictEqual(cleanCoreDimFiori.cleanCoreRating, 'GREEN');
    assert.strictEqual(cleanCoreDimFiori.score, 100);

    // 2. Classic GUI tile
    const classicCandidate = {
      appId: 'ME51N',
      appName: 'Create Purchase Requisition - Classic GUI',
      appType: 'SAP GUI',
      uiTechnology: 'SAP GUI for HTML',
      productVersion: 'SAP S/4HANA 2023',
      businessProcess: 'Sourcing and Procurement',
      supportedCapabilities: ['PURCHASE_REQUISITION_CREATION']
    };
    const guiResult = fitGapAssessmentEngine.evaluate({
      requirement: sampleRequirement,
      candidate: classicCandidate,
      context: sampleContext
    });
    const cleanCoreDimGui = guiResult.dimensions.find((d) => d.dimensionKey === 'cleanCoreAlignment');
    assert.strictEqual(cleanCoreDimGui.status, DIMENSION_STATUSES.PARTIAL_FIT);
    assert.strictEqual(cleanCoreDimGui.cleanCoreRating, 'AMBER');
    assert.strictEqual(cleanCoreDimGui.score, 55);
    assert.ok(guiResult.identifiedGaps.some((g) => g.category === GAP_CATEGORIES.CLEAN_CORE_VIOLATION));
  });

  it('identifies UX disparity and flags mobile unsuitability for Classic GUI when mobile is mandatory', () => {
    const classicCandidate = {
      appId: 'ME51N',
      appName: 'Create Purchase Requisition - Classic GUI',
      appType: 'SAP GUI',
      uiTechnology: 'SAP GUI for HTML',
      productVersion: 'SAP S/4HANA 2023',
      businessProcess: 'Sourcing and Procurement',
      supportedCapabilities: ['PURCHASE_REQUISITION_CREATION']
    };

    const result = fitGapAssessmentEngine.evaluate({
      requirement: sampleRequirement, // Has mandatoryCondition: 'Mobile approval notification support'
      candidate: classicCandidate,
      context: sampleContext
    });

    const uxDim = result.dimensions.find((d) => d.dimensionKey === 'uxAppTypeSuitability');
    assert.strictEqual(uxDim.status, DIMENSION_STATUSES.NO_FIT);
    assert.ok(result.identifiedGaps.some((g) => g.gapClassification === 'UX_DISPARITY' && g.severity === GAP_SEVERITIES.CRITICAL));
  });
});
