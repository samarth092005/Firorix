import { describe, it, expect } from 'vitest';
import { demoDataProvider, DEMO_ASSESSMENT_RECORDS, DEMO_SYSTEM_HEALTH } from '../../../services/mock/demoAssessmentProvider';
import { assessmentService } from '../../../services/assessmentService';
import { systemHealthService } from '../../../services/systemHealthService';

describe('Fiorify Sprint 2 - Overview Dashboard Metric Calculations & Services', { timeout: 15000 }, () => {
  it('derives all KPI metrics mathematically from the common assessment data source', async () => {
    const summary = await assessmentService.getAssessmentSummary();
    const rawRecords = DEMO_ASSESSMENT_RECORDS;

    // Total transactions assessed
    expect(summary.totalAssessed).toBe(rawRecords.length);

    // Explicit successors count
    const expectedExplicit = rawRecords.filter(
      (r) => r.assessmentResult === 'EXPLICIT_SUCCESSOR'
    ).length;
    expect(summary.explicitSuccessorsCount).toBe(expectedExplicit);

    // Pending verification count
    const expectedPending = rawRecords.filter(
      (r) => r.assessmentResult === 'PENDING_VERIFICATION'
    ).length;
    expect(summary.pendingVerificationCount).toBe(expectedPending);

    // Verified Fiori Matches count (standard apps or WebGUI matches verified)
    const expectedVerifiedMatches = rawRecords.filter(
      (r) =>
        r.matchingFioriApp !== null &&
        ['EXPLICIT_SUCCESSOR', 'SAP_GUI_HTML', 'FUNCTIONAL_ALTERNATIVE'].includes(r.assessmentResult)
    ).length;
    expect(summary.verifiedMatchesCount).toBe(expectedVerifiedMatches);

    // Sum of distribution counts matches totalAssessed
    const sumOfDistribution = summary.distribution.reduce((acc, curr) => acc + curr.count, 0);
    expect(sumOfDistribution).toBe(summary.totalAssessed);
  });

  it('contains the initial Finance pilot transactions (F-53, F-28, FS00, OB08, FB03)', async () => {
    const f53 = await assessmentService.getAssessmentByTCode('F-53');
    expect(f53).toBeDefined();
    expect(f53?.tcode).toBe('F-53');
    expect(f53?.description).toBe('Post Outgoing Payments');
    expect(f53?.assessmentResult).toBe('EXPLICIT_SUCCESSOR');
    expect(f53?.matchingFioriApp?.appId).toBe('F0773');

    const f28 = await assessmentService.getAssessmentByTCode('F-28');
    expect(f28).toBeDefined();
    expect(f28?.tcode).toBe('F-28');
    expect(f28?.description).toBe('Post Incoming Payments');
    expect(f28?.assessmentResult).toBe('EXPLICIT_SUCCESSOR');
    expect(f28?.matchingFioriApp?.appId).toBe('F1345');

    const fs00 = await assessmentService.getAssessmentByTCode('FS00');
    expect(fs00).toBeDefined();
    expect(fs00?.tcode).toBe('FS00');
    expect(fs00?.description).toBe('Manage G/L Account Master Data');
    expect(fs00?.assessmentResult).toBe('EXPLICIT_SUCCESSOR');
    expect(fs00?.matchingFioriApp?.appId).toBe('F0984A');

    const ob08 = await assessmentService.getAssessmentByTCode('OB08');
    expect(ob08).toBeDefined();
    expect(ob08?.tcode).toBe('OB08');
    expect(ob08?.assessmentResult).toBe('EXPLICIT_SUCCESSOR');

    const fb03 = await assessmentService.getAssessmentByTCode('FB03');
    expect(fb03).toBeDefined();
    expect(fb03?.tcode).toBe('FB03');
    expect(fb03?.assessmentResult).toBe('SAP_GUI_HTML');
  });

  it('filters assessment records accurately without altering source data', async () => {
    const all = await assessmentService.getAssessments();
    expect(all.length).toBeGreaterThan(0);

    const accountsPayable = await assessmentService.getAssessments({
      businessArea: 'Financial Accounting'
    });
    expect(accountsPayable.every((r) => r.businessArea === 'Financial Accounting')).toBe(true);

    const explicitSuccessors = await assessmentService.getAssessments({
      assessmentResult: 'EXPLICIT_SUCCESSOR'
    });
    expect(explicitSuccessors.every((r) => r.assessmentResult === 'EXPLICIT_SUCCESSOR')).toBe(true);

    const searched = await assessmentService.getAssessments({
      searchTerm: 'payment'
    });
    expect(searched.length).toBeGreaterThan(0);
    expect(
      searched.every(
        (r) =>
          r.description.toLowerCase().includes('payment') ||
          r.tcode.toLowerCase().includes('payment') ||
          (r.matchingFioriApp?.appName.toLowerCase().includes('payment'))
      )
    ).toBe(true);
  });

  it('correctly provides S21 system profile with components awaiting refresh', async () => {
    const health = await systemHealthService.getSystemHealth('S21');

    expect(health.systemId).toBe('S21');
    expect(health.client).toBe('200');
    expect(health.platform).toBe('SAP S/4HANA 2023 Private Edition');
    expect(health.connectionState).toBe('DEMO_MODE');
    expect(health.isLiveConnection).toBe(false);

    // Verify mandatory components
    const componentNames = health.components.map((c) => c.name);
    expect(componentNames).toContain('SAP_BASIS');
    expect(componentNames).toContain('S4CORE');
    expect(componentNames).toContain('SAP_UI');
    expect(componentNames).toContain('SAP_GWFND');

    // Verify all software components are marked as RECORDED_AWAITING_REFRESH
    expect(health.components.every((c) => c.status === 'RECORDED_AWAITING_REFRESH')).toBe(true);
  });

  it('returns an honest diagnostic response on connection test in demo mode', async () => {
    const testRes = await systemHealthService.testConnection('S21');
    expect(testRes.success).toBe(false);
    expect(testRes.connectionState).toBe('DEMO_MODE');
    expect(testRes.message).toContain('Cloud Connector');
  });
});
