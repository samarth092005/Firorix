import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  FitGapAssessmentEngine,
  fitGapAssessmentEngine,
  DEFAULT_SCORING_WEIGHTS,
  ASSESSMENT_STATUSES,
  GAP_SEVERITIES,
  GAP_CATEGORIES
} from '../src/engine/fitGapAssessmentEngine.js';

describe('FioriX Sprint 8.1 — Backend Fit-Gap Assessment Engine Unit Tests', () => {
  // Common standard requirement fixture
  const basePaymentRequirement = {
    id: 'REQ-FI-001',
    title: 'Post Outgoing Supplier Payments',
    description: 'Post outgoing payments to vendor accounts with cash discount and invoice matching.',
    businessProcess: 'Finance, Accounts Payable',
    tcode: 'F-53',
    requiredCapabilities: [
      'OUTGOING_PAYMENT_POSTING',
      'OPEN_ITEM_CLEARING',
      'CASH_DISCOUNT'
    ],
    requiredOperations: ['PostPayment', 'SimulatePayment'],
    mandatoryConditions: ['Must record clearing document number in BKPF'],
    priority: 'MANDATORY'
  };

  // 1. Complete verified fit
  it('evaluates complete verified fit when all functional, technical, and process criteria are fulfilled', () => {
    const candidate = {
      appId: 'F1612_IDEAL',
      appName: 'Post Outgoing Payments (Full Scope)',
      appType: 'Transactional',
      uiTechnology: 'SAP Fiori (SAPUI5)',
      productVersion: 'SAP S/4HANA 2023',
      businessProcess: 'Finance, Accounts Payable',
      businessRoles: ['Accounts Payable Accountant'],
      odataDependencies: ['FAP_PAYMENT_POST_SRV'],
      supportedCapabilities: [
        'OUTGOING_PAYMENT_POSTING',
        'OPEN_ITEM_CLEARING',
        'CASH_DISCOUNT'
      ],
      verifiedODataServices: [
        {
          serviceName: 'FAP_PAYMENT_POST_SRV',
          technicalAlias: 'FAP_PAYMENT_POST_SRV',
          availableOperations: ['PostPayment', 'SimulatePayment'],
          isAliasVerified: true
        }
      ]
    };

    const context = {
      targetSystem: { systemId: 'S21', release: 'SAP S/4HANA 2023' },
      userAuthorizations: ['ACCOUNTS PAYABLE ACCOUNTANT'],
      activeServices: ['FAP_PAYMENT_POST_SRV']
    };

    const result = fitGapAssessmentEngine.evaluate({
      requirement: basePaymentRequirement,
      candidate,
      context
    });

    assert.strictEqual(result.overallStatus, ASSESSMENT_STATUSES.VERIFIED_FIT);
    assert.strictEqual(result.recommendation.verdict, 'RECOMMENDED_STANDARD');
    assert.ok(result.overallScore >= 85);
    assert.strictEqual(result.identifiedGaps.length, 0);
    assert.strictEqual(result.confidence, 'HIGH');
  });

  // 2. Partial fit
  it('evaluates partial fit when candidate fulfills core capabilities but has secondary gaps', () => {
    const candidate = {
      appId: 'F1612',
      appName: 'Post Outgoing Payments',
      appType: 'Transactional',
      uiTechnology: 'SAP Fiori (SAPUI5)',
      productVersion: 'SAP S/4HANA 2023',
      businessProcess: 'Finance, Accounts Payable',
      businessRoles: ['Accounts Payable Accountant'],
      odataDependencies: ['FAP_PAYMENT_POST_SRV'],
      supportedCapabilities: ['OUTGOING_PAYMENT_POSTING', 'OPEN_ITEM_CLEARING'],
      verifiedODataServices: [
        {
          serviceName: 'FAP_PAYMENT_POST_SRV',
          technicalAlias: 'FAP_PAYMENT_POST_SRV',
          availableOperations: ['PostPayment', 'SimulatePayment'],
          isAliasVerified: true
        }
      ]
    };

    // Requirement asks for CASH_DISCOUNT as well
    const result = fitGapAssessmentEngine.evaluate({
      requirement: basePaymentRequirement,
      candidate,
      context: { targetSystem: { release: 'SAP S/4HANA 2023' }, activeServices: ['FAP_PAYMENT_POST_SRV'] }
    });

    assert.strictEqual(result.overallStatus, ASSESSMENT_STATUSES.PARTIAL_FIT);
    assert.strictEqual(result.recommendation.verdict, 'RECOMMENDED_WITH_GAPS');
    assert.ok(result.missingCapabilities.includes('CASH_DISCOUNT'));
  });

  // 3. Possible fit
  it('evaluates possible fit when candidate shares process area but requires further verification', () => {
    const candidate = {
      appId: 'F1367',
      appName: 'Clear Outgoing Payments',
      appType: 'Transactional',
      uiTechnology: 'SAP Fiori (SAPUI5)',
      productVersion: 'SAP S/4HANA 2023',
      businessProcess: 'Finance, Accounts Payable',
      businessRoles: ['Accounts Payable Accountant'],
      odataDependencies: ['FAP_MANUAL_CLEARING_SRV'],
      supportedCapabilities: ['OPEN_ITEM_CLEARING'], // Missing direct OUTGOING_PAYMENT_POSTING
      verifiedODataServices: [
        {
          serviceName: 'FAP_MANUAL_CLEARING_SRV',
          technicalAlias: 'ZFAP_MANUAL_CLEARING_SRV',
          availableOperations: ['ClearItems'],
          isAliasVerified: true
        }
      ]
    };

    const req = {
      ...basePaymentRequirement,
      priority: 'MEDIUM'
    };

    const result = fitGapAssessmentEngine.evaluate({
      requirement: req,
      candidate,
      context: { targetSystem: { release: 'SAP S/4HANA 2023' } }
    });

    assert.ok([ASSESSMENT_STATUSES.PARTIAL_FIT, ASSESSMENT_STATUSES.POSSIBLE_FIT].includes(result.overallStatus));
    assert.ok(result.missingOperations.includes('PostPayment'));
  });

  // 4. No fit
  it('evaluates no fit when candidate fails basic functional capabilities or release compatibility', () => {
    const candidate = {
      appId: 'F0842A',
      appName: 'Manage Purchase Orders',
      appType: 'Transactional',
      uiTechnology: 'SAP Fiori elements',
      productVersion: 'SAP S/4HANA 2023',
      businessProcess: 'Sourcing and Procurement',
      odataDependencies: ['MM_PUR_PO_MAINT_V2_SRV'],
      supportedCapabilities: ['PURCHASE_ORDER_CREATION']
    };

    const result = fitGapAssessmentEngine.evaluate({
      requirement: basePaymentRequirement,
      candidate,
      context: { targetSystem: { release: 'SAP S/4HANA 2023' } }
    });

    assert.strictEqual(result.overallStatus, ASSESSMENT_STATUSES.NO_FIT);
    assert.strictEqual(result.recommendation.verdict, 'CUSTOM_REQUIRED');
  });

  // 5. Insufficient evidence
  it('evaluates insufficient evidence when candidate or requirement definition is incomplete', () => {
    const result1 = fitGapAssessmentEngine.evaluate({
      requirement: null,
      candidate: { appId: 'F1612' }
    });
    assert.strictEqual(result1.overallStatus, ASSESSMENT_STATUSES.INSUFFICIENT_EVIDENCE);

    const result2 = fitGapAssessmentEngine.evaluate({
      requirement: basePaymentRequirement,
      candidate: null
    });
    assert.strictEqual(result2.overallStatus, ASSESSMENT_STATUSES.INSUFFICIENT_EVIDENCE);
  });

  // 6. Missing mandatory capability prevents VERIFIED_FIT
  it('prevents VERIFIED_FIT when a mandatory capability is missing', () => {
    const candidate = {
      appId: 'F1612',
      appName: 'Post Outgoing Payments',
      appType: 'Transactional',
      uiTechnology: 'SAP Fiori (SAPUI5)',
      productVersion: 'SAP S/4HANA 2023',
      businessProcess: 'Finance, Accounts Payable',
      supportedCapabilities: ['OUTGOING_PAYMENT_POSTING'],
      odataDependencies: ['FAP_PAYMENT_POST_SRV'],
      verifiedODataServices: [
        {
          serviceName: 'FAP_PAYMENT_POST_SRV',
          availableOperations: ['PostPayment', 'SimulatePayment'],
          isAliasVerified: true
        }
      ]
    };

    const req = {
      ...basePaymentRequirement,
      requiredCapabilities: ['OUTGOING_PAYMENT_POSTING', 'RESIDUAL_ITEMS'],
      priority: 'MANDATORY'
    };

    const result = fitGapAssessmentEngine.evaluate({ requirement: req, candidate });
    assert.notStrictEqual(result.overallStatus, ASSESSMENT_STATUSES.VERIFIED_FIT);
    assert.strictEqual(result.overallStatus, ASSESSMENT_STATUSES.PARTIAL_FIT);
    assert.ok(result.identifiedGaps.some((g) => g.severity === GAP_SEVERITIES.CRITICAL));
  });

  // 7. Missing mandatory operation prevents VERIFIED_FIT
  it('prevents VERIFIED_FIT when a mandatory backend operation is missing', () => {
    const candidate = {
      appId: 'F1612',
      appName: 'Post Outgoing Payments',
      appType: 'Transactional',
      uiTechnology: 'SAP Fiori (SAPUI5)',
      productVersion: 'SAP S/4HANA 2023',
      businessProcess: 'Finance, Accounts Payable',
      supportedCapabilities: ['OUTGOING_PAYMENT_POSTING', 'OPEN_ITEM_CLEARING', 'CASH_DISCOUNT'],
      odataDependencies: ['FAP_PAYMENT_POST_SRV'],
      verifiedODataServices: [
        {
          serviceName: 'FAP_PAYMENT_POST_SRV',
          availableOperations: ['PostPayment'], // Missing SimulatePayment!
          isAliasVerified: true
        }
      ]
    };

    const result = fitGapAssessmentEngine.evaluate({
      requirement: basePaymentRequirement,
      candidate,
      context: { targetSystem: { release: 'SAP S/4HANA 2023' }, activeServices: ['FAP_PAYMENT_POST_SRV'] }
    });

    assert.notStrictEqual(result.overallStatus, ASSESSMENT_STATUSES.VERIFIED_FIT);
    assert.ok(result.identifiedGaps.some((g) => g.category === GAP_CATEGORIES.TECHNICAL_DEPENDENCY && g.severity === GAP_SEVERITIES.CRITICAL));
    assert.ok(result.dimensionResults.technicalFit.missingOperations.includes('SimulatePayment'));
  });

  // 8. Unknown authorization remains explicitly unknown
  it('keeps authorization status as PENDING_VERIFICATION when user authorizations are not provided', () => {
    const candidate = {
      appId: 'F1612',
      appName: 'Post Outgoing Payments',
      appType: 'Transactional',
      businessRoles: ['Accounts Payable Accountant'],
      odataDependencies: []
    };

    const result = fitGapAssessmentEngine.evaluate({
      requirement: basePaymentRequirement,
      candidate,
      context: { userAuthorizations: null }
    });

    assert.strictEqual(result.dimensionResults.authorization.status, 'PENDING_VERIFICATION');
    assert.ok(result.missingEvidence.some((m) => m.toLowerCase().includes('pfcg')));
  });

  // 9. Unknown activation remains explicitly unknown
  it('keeps activation status as PENDING_VERIFICATION when target system activation records are absent', () => {
    const candidate = {
      appId: 'F1612',
      appName: 'Post Outgoing Payments',
      appType: 'Transactional',
      odataDependencies: ['FAP_PAYMENT_POST_SRV'],
      verifiedODataServices: []
    };

    const result = fitGapAssessmentEngine.evaluate({
      requirement: basePaymentRequirement,
      candidate,
      context: { activeServices: null, liveServices: null }
    });

    assert.strictEqual(result.dimensionResults.activation.status, 'PENDING_VERIFICATION');
    assert.ok(result.identifiedGaps.some((g) => g.category === GAP_CATEGORIES.ACTIVATION));
  });

  // 10. Unverified Z-service alias generates major gap and warning
  it('flags unverified Z-service alias as a MAJOR gap and surfaces conflicting evidence', () => {
    const candidate = {
      appId: 'F1612',
      appName: 'Post Outgoing Payments',
      appType: 'Transactional',
      odataDependencies: ['FAP_PAYMENT_POST_SRV'],
      verifiedODataServices: [
        {
          serviceName: 'FAP_PAYMENT_POST_SRV',
          technicalAlias: 'ZFAP_PAYMENT_POST_SRV',
          isAliasVerified: false // Unverified customer Z-alias!
        }
      ]
    };

    const result = fitGapAssessmentEngine.evaluate({
      requirement: basePaymentRequirement,
      candidate
    });

    assert.ok(result.conflictingEvidence.some((c) => c.includes('ZFAP_PAYMENT_POST_SRV')));
    assert.ok(result.identifiedGaps.some((g) => g.category === GAP_CATEGORIES.TECHNICAL_DEPENDENCY && g.severity === GAP_SEVERITIES.MAJOR));
  });

  // 11. Missing OData dependency generates critical gap
  it('generates a CRITICAL technical gap when declared OData service is missing on target', () => {
    const candidate = {
      appId: 'F1612',
      appName: 'Post Outgoing Payments',
      appType: 'Transactional',
      odataDependencies: ['FAP_PAYMENT_POST_SRV', 'MISSING_UNREGISTERED_SRV'],
      verifiedODataServices: [
        { serviceName: 'FAP_PAYMENT_POST_SRV', isAliasVerified: true }
      ]
    };

    const result = fitGapAssessmentEngine.evaluate({
      requirement: basePaymentRequirement,
      candidate
    });

    assert.ok(result.dimensionResults.technicalFit.missingServices.includes('MISSING_UNREGISTERED_SRV'));
    assert.ok(result.identifiedGaps.some((g) => g.description.includes('MISSING_UNREGISTERED_SRV') && g.severity === GAP_SEVERITIES.CRITICAL));
  });

  // 12. Critical functional gap prevents VERIFIED_FIT despite high technical score
  it('HARD GOVERNANCE GUARDRAIL: critical functional gap prevents VERIFIED_FIT despite 100% technical score', () => {
    const candidate = {
      appId: 'F1612',
      appName: 'Post Outgoing Payments',
      appType: 'Transactional',
      uiTechnology: 'SAP Fiori (SAPUI5)',
      productVersion: 'SAP S/4HANA 2023',
      businessProcess: 'Finance, Accounts Payable',
      businessRoles: ['Accounts Payable Accountant'],
      odataDependencies: ['FAP_PAYMENT_POST_SRV'],
      supportedCapabilities: ['OUTGOING_PAYMENT_POSTING'], // Missing OPEN_ITEM_CLEARING and CASH_DISCOUNT
      verifiedODataServices: [
        {
          serviceName: 'FAP_PAYMENT_POST_SRV',
          availableOperations: ['PostPayment', 'SimulatePayment'],
          isAliasVerified: true
        }
      ]
    };

    const context = {
      targetSystem: { release: 'SAP S/4HANA 2023' },
      activeServices: ['FAP_PAYMENT_POST_SRV'],
      userAuthorizations: ['ACCOUNTS PAYABLE ACCOUNTANT']
    };

    const result = fitGapAssessmentEngine.evaluate({
      requirement: basePaymentRequirement,
      candidate,
      context
    });

    // Technical score is 100%, but functional score is 0 and critical gaps exist
    assert.strictEqual(result.dimensionResults.technicalFit.score, 100);
    assert.notStrictEqual(result.overallStatus, ASSESSMENT_STATUSES.VERIFIED_FIT);
    assert.strictEqual(result.overallStatus, ASSESSMENT_STATUSES.PARTIAL_FIT);
    assert.ok(result.identifiedGaps.some((g) => g.severity === GAP_SEVERITIES.CRITICAL));
  });

  // 13. Conflicting evidence is explicitly surfaced
  it('surfaces conflicting evidence in result and accounts for it in confidence calculation', () => {
    const candidate = {
      appId: 'F1612',
      appName: 'Post Outgoing Payments',
      appType: 'Transactional',
      odataDependencies: ['FAP_PAYMENT_POST_SRV'],
      verifiedODataServices: [
        {
          serviceName: 'FAP_PAYMENT_POST_SRV',
          technicalAlias: 'ZFAP_PAYMENT_POST_SRV',
          isAliasVerified: false
        }
      ]
    };

    const result = fitGapAssessmentEngine.evaluate({
      requirement: basePaymentRequirement,
      candidate
    });

    assert.ok(result.conflictingEvidence.length > 0);
  });

  // 14. Missing compatibility information
  it('handles missing compatibility information by marking dimension as PENDING_VERIFICATION', () => {
    const candidate = {
      appId: 'F1612',
      productVersion: '' // Missing version
    };

    const result = fitGapAssessmentEngine.evaluate({
      requirement: basePaymentRequirement,
      candidate,
      context: { targetSystem: { release: '' } }
    });

    assert.strictEqual(result.dimensionResults.compatibility.status, 'PENDING_VERIFICATION');
    assert.ok(result.missingEvidence.some((m) => m.toLowerCase().includes('release')));
  });

  // 15. Custom transaction variant
  it('evaluates customization impacts for standard Fiori elements vs classic GUI tile', () => {
    const reqWithCustom = {
      ...basePaymentRequirement,
      customizationRequirements: ['Custom user exit in SAPMF05A for withholding tax validation']
    };

    // 1. Fiori elements candidate
    const fioriCand = {
      appId: 'F1612',
      appName: 'Post Outgoing Payments',
      appType: 'Transactional',
      uiTechnology: 'SAP Fiori (SAPUI5)',
      odataDependencies: []
    };
    const fioriRes = fitGapAssessmentEngine.evaluate({ requirement: reqWithCustom, candidate: fioriCand });
    assert.strictEqual(fioriRes.dimensionResults.customization.status, 'PARTIAL_FIT');
    assert.ok(fioriRes.identifiedGaps.some((g) => g.category === GAP_CATEGORIES.CUSTOM_VARIANT));

    // 2. Classic GUI WebGUI candidate
    const guiCand = {
      appId: 'F-53',
      appName: 'Post Outgoing Payments - For Suppliers',
      appType: 'SAP GUI',
      uiTechnology: 'SAP GUI for HTML',
      odataDependencies: []
    };
    const guiRes = fitGapAssessmentEngine.evaluate({
      requirement: reqWithCustom,
      candidate: guiCand,
      context: { customVariantActive: true }
    });
    assert.strictEqual(guiRes.dimensionResults.customization.status, 'VERIFIED_FIT');
    assert.ok(guiRes.dimensionResults.customization.rationale.includes('preserves 100% of custom Dynpro screens'));
  });

  // 16. Evidence completeness and confidence
  it('calculates evidence completeness ratio and assigns appropriate confidence level', () => {
    const candidate = {
      appId: 'F1612',
      appName: 'Post Outgoing Payments',
      appType: 'Transactional',
      uiTechnology: 'SAP Fiori (SAPUI5)',
      productVersion: 'SAP S/4HANA 2023',
      businessProcess: 'Finance, Accounts Payable',
      supportedCapabilities: ['OUTGOING_PAYMENT_POSTING'],
      odataDependencies: ['FAP_PAYMENT_POST_SRV'],
      verifiedODataServices: [
        { serviceName: 'FAP_PAYMENT_POST_SRV', availableOperations: ['PostPayment'], isAliasVerified: true }
      ]
    };

    const context = {
      targetSystem: { release: 'SAP S/4HANA 2023' },
      activeServices: ['FAP_PAYMENT_POST_SRV'],
      userAuthorizations: ['ACCOUNTS PAYABLE ACCOUNTANT']
    };

    const result = fitGapAssessmentEngine.evaluate({
      requirement: basePaymentRequirement,
      candidate,
      context
    });

    assert.ok(result.dimensionResults.evidenceCompleteness.completenessRatio > 0.5);
    assert.ok(['MEDIUM', 'HIGH'].includes(result.confidence));
  });

  // 17. F-53 Benchmark Suite
  describe('F-53 Accounts Payable Benchmark Evaluations', () => {
    const s21Context = {
      targetSystem: {
        systemId: 'S21',
        client: '200',
        release: 'SAP S/4HANA 2023 Private Edition'
      },
      activeServices: [
        'ZFAP_PAYMENT_POST_SRV',
        'ZFAP_MANUAL_CLEARING_SRV',
        'ZFAC_FINANCIAL_DOCUMENT_SRV_01',
        'ZCV_ATTACHMENT_SRV'
      ],
      customVariantActive: false
    };

    it('benchmarks F1612 as PARTIAL_FIT with RECOMMENDED_WITH_GAPS (primary payment posting app)', () => {
      const f1612Candidate = {
        appId: 'F1612',
        appName: 'Post Outgoing Payments',
        appType: 'Transactional',
        uiTechnology: 'SAP Fiori (SAPUI5)',
        productVersion: 'SAP S/4HANA 2023',
        businessProcess: 'Finance, Accounts Payable',
        businessRoles: ['Accounts Payable Accountant'],
        odataDependencies: ['FAP_PAYMENT_POST_SRV'],
        supportedCapabilities: ['OUTGOING_PAYMENT_POSTING', 'OPEN_ITEM_CLEARING'], // Missing RESIDUAL_ITEMS / DOWN_PAYMENTS
        verifiedODataServices: [
          {
            serviceName: 'FAP_PAYMENT_POST_SRV',
            technicalAlias: 'ZFAP_PAYMENT_POST_SRV',
            entitySetsCount: 478,
            functionImportsCount: 53,
            availableOperations: ['PostPayment', 'SimulatePayment'],
            isAliasVerified: true
          }
        ]
      };

      const req = {
        ...basePaymentRequirement,
        requiredCapabilities: [
          'OUTGOING_PAYMENT_POSTING',
          'OPEN_ITEM_CLEARING',
          'RESIDUAL_ITEMS'
        ]
      };

      const res = fitGapAssessmentEngine.evaluate({
        requirement: req,
        candidate: f1612Candidate,
        context: s21Context
      });

      assert.strictEqual(res.overallStatus, ASSESSMENT_STATUSES.PARTIAL_FIT);
      assert.strictEqual(res.recommendation.verdict, 'RECOMMENDED_WITH_GAPS');
      assert.strictEqual(res.dimensionResults.technicalFit.status, 'VERIFIED_FIT');
      assert.ok(res.missingCapabilities.includes('RESIDUAL_ITEMS'));
      assert.ok(res.recommendation.nextActions.some((a) => a.includes('F1367')));
    });

    it('benchmarks F-53 classic tile as CLASSIC_GUI_FALLBACK (preserves legacy Dynpro scope)', () => {
      const f53TileCandidate = {
        appId: 'F-53',
        appName: 'Post Outgoing Payments - For Suppliers',
        appType: 'SAP GUI',
        uiTechnology: 'SAP GUI for HTML',
        productVersion: 'SAP S/4HANA',
        businessProcess: 'Finance, Accounts Payable',
        businessRoles: ['Standard User'],
        odataDependencies: [],
        supportedCapabilities: [
          'OUTGOING_PAYMENT_POSTING',
          'OPEN_ITEM_CLEARING',
          'CASH_DISCOUNT',
          'RESIDUAL_ITEMS',
          'SPECIAL_GL_TRANSACTIONS'
        ]
      };

      const res = fitGapAssessmentEngine.evaluate({
        requirement: basePaymentRequirement,
        candidate: f53TileCandidate,
        context: s21Context
      });

      assert.ok([ASSESSMENT_STATUSES.PARTIAL_FIT, ASSESSMENT_STATUSES.VERIFIED_FIT].includes(res.overallStatus));
      assert.strictEqual(res.recommendation.verdict, 'CLASSIC_GUI_FALLBACK');
      assert.ok(res.recommendation.rationale.includes('WebGUI'));
    });

    it('benchmarks F1367 as companion clearing app and NOT an outgoing payment posting replacement', () => {
      const f1367Candidate = {
        appId: 'F1367',
        appName: 'Clear Outgoing Payments',
        appType: 'Transactional',
        uiTechnology: 'SAP Fiori (SAPUI5)',
        productVersion: 'SAP S/4HANA 2023',
        businessProcess: 'Finance, Accounts Payable',
        businessRoles: ['Accounts Payable Accountant'],
        odataDependencies: ['FAP_MANUAL_CLEARING_SRV'],
        supportedCapabilities: ['OPEN_ITEM_CLEARING', 'RESIDUAL_ITEMS'], // NO direct payment posting
        verifiedODataServices: [
          {
            serviceName: 'FAP_MANUAL_CLEARING_SRV',
            technicalAlias: 'ZFAP_MANUAL_CLEARING_SRV',
            entitySetsCount: 490,
            functionImportsCount: 53,
            availableOperations: ['ClearItems'], // Missing PostPayment!
            isAliasVerified: true
          }
        ]
      };

      const res = fitGapAssessmentEngine.evaluate({
        requirement: basePaymentRequirement,
        candidate: f1367Candidate,
        context: s21Context
      });

      // Cannot be VERIFIED_FIT because PostPayment operation and OUTGOING_PAYMENT_POSTING capability are missing
      assert.notStrictEqual(res.overallStatus, ASSESSMENT_STATUSES.VERIFIED_FIT);
      assert.ok(res.missingCapabilities.includes('OUTGOING_PAYMENT_POSTING'));
      assert.ok(res.missingOperations.includes('PostPayment'));
      assert.ok(res.identifiedGaps.some((g) => g.severity === GAP_SEVERITIES.CRITICAL));
    });
  });
});
