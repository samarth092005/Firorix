import { describe, it, expect } from 'vitest';
import { sapDiscoveryAdapter } from '../../../services/sap/sapDiscoveryAdapter';
import { fioriCatalogueAdapter } from '../../../services/catalogue/catalogueAdapter';
import { assessmentService } from '../../../services/assessmentService';
import { activityService } from '../../../services/activityService';
import { PRESET_SCENARIOS } from '../types';

describe('FioriX Sprint 3 - Guided Transaction Discovery & SAP Reference Integration', () => {
  const S21_SYSTEM = 'S21-200';
  const CLIENT_200 = '200';
  const S4HANA_RELEASE = 'SAP S/4HANA 2023 Private Edition';

  // 1. F-53 Discovery Test
  it('discovers F-53 Post Outgoing Payments with full DDIC metadata and F0773 successor', async () => {
    const res = await sapDiscoveryAdapter.inspectTransaction({
      requestId: 'REQ-TEST-F53',
      tcode: 'F-53',
      systemId: S21_SYSTEM,
      client: CLIENT_200,
      targetRelease: S4HANA_RELEASE,
      timestamp: new Date().toISOString()
    });

    expect(res.tcode).toBe('F-53');
    expect(res.exists).toBe(true);
    expect(res.classification).toBe('STANDARD');
    expect(res.programName).toBe('SAPMF05A');
    expect(res.screenNumber).toBe('0100');
    expect(res.packageName).toBe('FBAS');
    expect(res.provenance).toBe('CURATED_DEMO_FIXTURE');

    // Official Fiori candidate match verification
    expect(res.catalogueCandidates.length).toBeGreaterThanOrEqual(1);
    const candidate = res.catalogueCandidates[0];
    expect(candidate.appId).toBe('F0773');
    expect(candidate.appName).toBe('Manage Outgoing Payments');
    expect(candidate.uiTechnology).toBe('SAP Fiori elements');
    expect(candidate.officialSourceUrl).toBe('https://fal.cloud.sap/apps/F0773');
  });

  // 2. F-28 Discovery Test
  it('discovers F-28 Post Incoming Payments with full DDIC metadata and F1345 successor', async () => {
    const res = await sapDiscoveryAdapter.inspectTransaction({
      requestId: 'REQ-TEST-F28',
      tcode: 'F-28',
      systemId: S21_SYSTEM,
      client: CLIENT_200,
      targetRelease: S4HANA_RELEASE,
      timestamp: new Date().toISOString()
    });

    expect(res.tcode).toBe('F-28');
    expect(res.exists).toBe(true);
    expect(res.classification).toBe('STANDARD');
    expect(res.programName).toBe('SAPMF05A');
    expect(res.screenNumber).toBe('0100');

    expect(res.catalogueCandidates.length).toBeGreaterThanOrEqual(1);
    const candidate = res.catalogueCandidates[0];
    expect(candidate.appId).toBe('F1345');
    expect(candidate.appName).toBe('Post Incoming Payments');
    expect(candidate.officialSourceUrl).toBe('https://fal.cloud.sap/apps/F1345');
  });

  // 3. FS00 Discovery Test
  it('discovers FS00 Manage G/L Account Master Data with GL_ACCOUNT_SERVICES and F0984A successor', async () => {
    const res = await sapDiscoveryAdapter.inspectTransaction({
      requestId: 'REQ-TEST-FS00',
      tcode: 'FS00',
      systemId: S21_SYSTEM,
      client: CLIENT_200,
      targetRelease: S4HANA_RELEASE,
      timestamp: new Date().toISOString()
    });

    expect(res.tcode).toBe('FS00');
    expect(res.exists).toBe(true);
    expect(res.classification).toBe('STANDARD');
    expect(res.packageName).toBe('GL_ACCOUNT_SERVICES');

    expect(res.catalogueCandidates.length).toBeGreaterThanOrEqual(1);
    const candidate = res.catalogueCandidates[0];
    expect(candidate.appId).toBe('F0984A');
    expect(candidate.appName).toBe('Manage G/L Account Master Data');
    expect(candidate.officialSourceUrl).toBe('https://fal.cloud.sap/apps/F0984A');
  });

  // 4. Regression scenarios: OB08, FB03, FBL1N
  it('correctly assesses regression scenarios (OB08, FB03, FBL1N)', async () => {
    // OB08
    const ob08 = await sapDiscoveryAdapter.inspectTransaction({
      requestId: 'REQ-TEST-OB08',
      tcode: 'OB08',
      systemId: S21_SYSTEM,
      client: CLIENT_200,
      targetRelease: S4HANA_RELEASE,
      timestamp: new Date().toISOString()
    });
    expect(ob08.exists).toBe(true);
    expect(ob08.catalogueCandidates.some((c) => c.appId === 'F3616')).toBe(true);

    // FB03 (SAP GUI for HTML)
    const fb03 = await sapDiscoveryAdapter.inspectTransaction({
      requestId: 'REQ-TEST-FB03',
      tcode: 'FB03',
      systemId: S21_SYSTEM,
      client: CLIENT_200,
      targetRelease: S4HANA_RELEASE,
      timestamp: new Date().toISOString()
    });
    expect(fb03.exists).toBe(true);
    expect(fb03.catalogueCandidates.some((c) => c.uiTechnology === 'SAP GUI for HTML')).toBe(true);

    // FBL1N (Pending Catalogue)
    const fbl1n = await sapDiscoveryAdapter.inspectTransaction({
      requestId: 'REQ-TEST-FBL1N',
      tcode: 'FBL1N',
      systemId: S21_SYSTEM,
      client: CLIENT_200,
      targetRelease: S4HANA_RELEASE,
      timestamp: new Date().toISOString()
    });
    expect(fbl1n.exists).toBe(true);
  });

  // 5. Preset scenario configuration completeness
  it('validates preset scenario configurations for all pilot transactions', () => {
    const requiredPresets = ['F-53', 'F-28', 'FS00', 'OB08', 'FB03', 'FBL1N'];
    for (const key of requiredPresets) {
      const preset = PRESET_SCENARIOS[key];
      expect(preset).toBeDefined();
      expect(preset.tcode).toBe(key);
      expect(preset.businessProcess).toBeTruthy();
      expect(preset.defaultScenario).toBeTruthy();
      expect(preset.defaultRequirements.length).toBeGreaterThan(0);
      expect(preset.defaultFunctionality.length).toBeGreaterThan(0);
      expect(preset.defaultObjective).toBeTruthy();
      expect(preset.defaultRole).toContain('SAP_BR_');
    }
  });

  // 6. Invalid T-Code & Non-existent T-Code handling
  it('handles non-existent or custom unmapped transactions gracefully', async () => {
    const res = await sapDiscoveryAdapter.inspectTransaction({
      requestId: 'REQ-TEST-UNKNOWN',
      tcode: 'ZDOES_NOT_EXIST_99',
      systemId: S21_SYSTEM,
      client: CLIENT_200,
      targetRelease: S4HANA_RELEASE,
      timestamp: new Date().toISOString()
    });

    expect(res.tcode).toBe('ZDOES_NOT_EXIST_99');
    expect(res.exists).toBe(false);
    expect(res.metadataStatus).toBe('NOT_AVAILABLE');
    expect(res.catalogueCandidates).toEqual([]);
  });

  // 7. Assessment creation and registration lifecycle
  it('successfully creates and persists an assessment from the discovery wizard', async () => {
    const created = await assessmentService.createAssessment({
      tcode: 'F-53',
      systemId: S21_SYSTEM,
      client: CLIENT_200,
      targetRelease: S4HANA_RELEASE,
      businessContext: {
        businessProcess: 'Financial Accounting — Outgoing Payment Processing',
        primaryScenario: 'Standard vendor invoice clearing and payment run reconciliation',
        selectedRequirements: ['Multi-currency payments', 'Cash discount deduction'],
        expectedFunctionality: ['Open-item filtering', 'Difference posting'],
        assessmentObjective: 'Migrate to F0773 Manage Outgoing Payments',
        businessCriticality: 'HIGH'
      },
      applicationRequirements: {
        relevantBusinessRole: 'Accounts Payable Accountant (SAP_BR_AP_ACCOUNTANT)',
        knownODataService: 'FAR_OUTGOING_PAYMENT_SRV (OData V2)',
        requiredFunctionality: ['Open-item Selection', 'Audit Logging'],
        knownLimitations: 'Custom exit in SAPMF05A for payment reason code',
        targetReleaseProfile: S4HANA_RELEASE,
        isUserProvidedUnverified: true
      },
      discoveryMetadata: {
        description: 'Post Outgoing Payments',
        programName: 'SAPMF05A',
        screenNumber: '0100',
        packageName: 'FBAS',
        classification: 'STANDARD',
        originalSystem: 'SAP',
        softwareComponent: 'S4CORE 108'
      },
      catalogueReference: {
        appId: 'F0773',
        appName: 'Manage Outgoing Payments',
        description: 'Enables accounts payable accountants to search, review, and execute outgoing payments.',
        relatedTCodes: ['F-53'],
        supportedProductRelease: S4HANA_RELEASE,
        uiTechnology: 'SAP Fiori elements',
        businessRoles: ['SAP_BR_AP_ACCOUNTANT'],
        businessCatalogues: ['SAP_FIN_BC_AP_PAYMENTS_PC'],
        odataServices: ['FAR_OUTGOING_PAYMENT_SRV'],
        technicalComponent: 'FIN_AP_OUTPAY',
        implementationInfo: 'Requires active OData service',
        officialSourceUrl: 'https://fal.cloud.sap/apps/F0773',
        sourceVerificationDate: '2026-11-04',
        importVersion: 'FAL_2023_FPS02_EXPORT_V1',
        isCuratedDemoData: true
      }
    });

    expect(created.id).toBe('ASM-S21-F53');
    expect(created.tcode).toBe('F-53');
    expect(created.assessmentResult).toBe('EXPLICIT_SUCCESSOR');
    expect(created.businessContext?.primaryScenario).toContain('Standard vendor invoice clearing');
    expect(created.applicationRequirements?.knownODataService).toBe('FAR_OUTGOING_PAYMENT_SRV (OData V2)');
    expect(created.matchingFioriApp?.appId).toBe('F0773');

    // Confirm it is retrievable by ID and by T-Code
    const retrieved = await assessmentService.getAssessmentById(created.id);
    expect(retrieved).toBeDefined();
    expect(retrieved?.id).toBe(created.id);

    // Confirm activity feed recorded event
    const activities = await activityService.getRecentActivity(5);
    expect(activities.some((a) => a.tcode === 'F-53' && a.title.includes('Guided Assessment Created'))).toBe(true);
  });

  // 8. Official Fiori Catalogue Adapter Interface Tests
  it('verifies the official Fiori catalogue adapter and deep links', async () => {
    const status = await fioriCatalogueAdapter.getCatalogueStatus();
    expect(status.source).toBe('SAP Fiori Apps Reference Library (FAL)');
    expect(status.officialPortalUrl).toBe('https://fal.cloud.sap');
    expect(status.status).toBe('LOADED');
    expect(status.apiAvailabilityNote).toContain('FAL provides batch Excel/CSV export');

    const app = await fioriCatalogueAdapter.getAppById('F0773');
    expect(app).toBeDefined();
    expect(app?.appId).toBe('F0773');
    expect(app?.officialSourceUrl).toBe('https://fal.cloud.sap/apps/F0773');

    const searchResults = await fioriCatalogueAdapter.searchApps('Incoming Payments');
    expect(searchResults.some((a) => a.appId === 'F1345')).toBe(true);
  });
});
