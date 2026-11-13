import { describe, it, expect } from 'vitest';
import { assessmentService } from '../../../services/assessmentService';
import { evidenceEngine } from '../services/evidenceEngine';
import { assessmentExportService } from '../services/assessmentExportService';
import { fioriCatalogueAdapter } from '../../../services/catalogue/catalogueAdapter';
import { AssessmentRecord } from '../../../services/contracts/types';

describe('Fiorify Sprint 4 - Assessment Workspace, Evidence Engine & Fiori Recommendations', () => {
  // 1. F-53 Post Outgoing Payments Assessment
  it('correctly evaluates F-53 Post Outgoing Payments with F0773 successor, multi-candidates and OData tracking', async () => {
    const assessment = await assessmentService.getAssessmentByTCode('F-53');
    expect(assessment).toBeDefined();
    if (!assessment) return;

    expect(assessment.tcode).toBe('F-53');
    expect(assessment.classification).toBe('STANDARD');
    expect(assessment.programName).toBe('SAPMF05A');
    expect(assessment.packageName).toBe('FBAS');
    expect(assessment.assessmentResult).toBe('EXPLICIT_SUCCESSOR');

    // Evidence compilation
    const evidence = evidenceEngine.compileDetailedEvidence(assessment);
    expect(evidence.length).toBeGreaterThanOrEqual(8);
    expect(evidence.some(e => e.category === 'TRANSACTION_EXISTENCE' && e.verificationStatus === 'VERIFIED')).toBe(true);
    expect(evidence.some(e => e.category === 'APPLICATION_MATCH' && e.finding.includes('F0773'))).toBe(true);

    // Multi-candidate discovery (F0773 + F1367)
    const candidates = await fioriCatalogueAdapter.getAppsByTCode('F-53');
    expect(candidates.length).toBeGreaterThanOrEqual(2);
    expect(candidates[0].appId).toBe('F0773');
    expect(candidates[1].appId).toBe('F1367');
    expect(candidates[0].officialSourceUrl).toBe('https://fal.cloud.sap/apps/F0773');

    // OData Discrepancy Tracking (User provided FAR_PAYMENT_POST_SRV vs Official FAR_OUTGOING_PAYMENT_SRV)
    const odataValidation = evidenceEngine.evaluateODataValidation(assessment, candidates[0]);
    expect(odataValidation.some(o => o.serviceName === 'FAR_OUTGOING_PAYMENT_SRV' && o.provenance === 'OFFICIAL_CATALOGUE')).toBe(true);

    // 4-Way Role Separation (SAP_BR_AP_ACCOUNTANT)
    const roleValidation = evidenceEngine.evaluateRoleValidation(assessment, candidates[0]);
    const apRole = roleValidation.find(r => r.roleName.includes('AP_ACCOUNTANT'));
    expect(apRole).toBeDefined();
    expect(apRole?.documentedInOfficialCatalogue).toBe(true);
    expect(apRole?.assignedInS21Status).toBe('PENDING_BASIS_CHECK');

    // Final Recommendation
    const compat = evidenceEngine.evaluateReleaseCompatibility(assessment, candidates[0]);
    const avail = evidenceEngine.evaluateSystemAvailability(assessment, candidates[0]);
    const rec = evidenceEngine.generateRecommendation(assessment, candidates[0], compat, avail);
    expect(rec.outcome).toBe('USE_STANDARD_FIORI_SUCCESSOR');
    expect(rec.recommendedAction).toContain('F0773');
    expect(rec.supportingEvidence.length).toBeGreaterThan(0);
    expect(rec.requiredNextSteps.length).toBeGreaterThan(0);
  });

  // 2. F-28 Post Incoming Payments Assessment
  it('correctly evaluates F-28 Post Incoming Payments with F1345 successor', async () => {
    const assessment = await assessmentService.getAssessmentByTCode('F-28');
    expect(assessment).toBeDefined();
    if (!assessment) return;

    expect(assessment.tcode).toBe('F-28');
    expect(assessment.assessmentResult).toBe('EXPLICIT_SUCCESSOR');
    expect(assessment.matchingFioriApp?.appId).toBe('F1345');

    const candidates = await fioriCatalogueAdapter.getAppsByTCode('F-28');
    expect(candidates.length).toBeGreaterThanOrEqual(1);
    expect(candidates[0].appId).toBe('F1345');
    expect(candidates[0].uiTechnology).toBe('SAP Fiori elements');

    const roles = evidenceEngine.evaluateRoleValidation(assessment, candidates[0]);
    expect(roles.some(r => r.roleName.includes('AR_ACCOUNTANT'))).toBe(true);

    const odata = evidenceEngine.evaluateODataValidation(assessment, candidates[0]);
    expect(odata.some(o => o.serviceName === 'FAP_POST_INCOMING_PAYMENTS_SRV')).toBe(true);

    const compat = evidenceEngine.evaluateReleaseCompatibility(assessment, candidates[0]);
    const avail = evidenceEngine.evaluateSystemAvailability(assessment, candidates[0]);
    const rec = evidenceEngine.generateRecommendation(assessment, candidates[0], compat, avail);
    expect(rec.outcome).toBe('USE_STANDARD_FIORI_SUCCESSOR');
  });

  // 3. FS00 Manage G/L Account Master Data Assessment
  it('correctly evaluates FS00 Manage G/L Account Master Data with F0984A successor and OData V4', async () => {
    const assessment = await assessmentService.getAssessmentByTCode('FS00');
    expect(assessment).toBeDefined();
    if (!assessment) return;

    expect(assessment.tcode).toBe('FS00');
    expect(assessment.packageName).toBe('GL_ACCOUNT_SERVICES');
    expect(assessment.matchingFioriApp?.appId).toBe('F0984A');

    const candidates = await fioriCatalogueAdapter.getAppsByTCode('FS00');
    expect(candidates[0].appId).toBe('F0984A');
    expect(candidates[0].odataServices.some(s => s.includes('GL_ACCOUNT_MD_SRV'))).toBe(true);

    const odata = evidenceEngine.evaluateODataValidation(assessment, candidates[0]);
    expect(odata.some(o => o.serviceName === 'GL_ACCOUNT_MD_SRV' && o.version.includes('V4'))).toBe(true);
    expect(odata.some(o => o.serviceName === 'FAC_MANAGE_GLACCOUNT_SRV')).toBe(true);
  });

  // 4. OB08 Regression Scenario
  it('correctly assesses OB08 Maintain Exchange Rates with F3616 successor', async () => {
    const assessment = await assessmentService.getAssessmentByTCode('OB08');
    expect(assessment).toBeDefined();
    if (!assessment) return;

    expect(assessment.tcode).toBe('OB08');
    expect(assessment.packageName).toBe('FIN_EXCHANGE');
    expect(assessment.matchingFioriApp?.appId).toBe('F3616');
    expect(assessment.matchingFioriApp?.appName).toBe('Currency Exchange Rates');
  });

  // 5. FB03 Regression Scenario (SAP GUI for HTML / WebGUI)
  it('correctly assesses FB03 Display Document as SAP GUI for HTML without inventing OData services', async () => {
    const assessment = await assessmentService.getAssessmentByTCode('FB03');
    expect(assessment).toBeDefined();
    if (!assessment) return;

    expect(assessment.tcode).toBe('FB03');
    expect(assessment.assessmentResult).toBe('SAP_GUI_HTML');
    expect(assessment.matchingFioriApp?.uiTechnology).toBe('SAP GUI for HTML');

    const candidates = await fioriCatalogueAdapter.getAppsByTCode('FB03');
    const odata = evidenceEngine.evaluateODataValidation(assessment, candidates[0] || null);
    expect(odata[0].serviceName).toContain('None (Classic WebGUI');

    const compat = evidenceEngine.evaluateReleaseCompatibility(assessment, candidates[0] || null);
    const avail = evidenceEngine.evaluateSystemAvailability(assessment, candidates[0] || null);
    const rec = evidenceEngine.generateRecommendation(assessment, candidates[0] || null, compat, avail);
    expect(rec.outcome).toBe('USE_CLASSIC_TRANSACTION_LAUNCHPAD');
  });

  // 6. FBL1N Scenario (Pending Verification)
  it('correctly assesses FBL1N as Pending Verification without claiming unverified success', async () => {
    const assessment = await assessmentService.getAssessmentByTCode('FBL1N');
    expect(assessment).toBeDefined();
    if (!assessment) return;

    expect(assessment.tcode).toBe('FBL1N');
    expect(assessment.assessmentResult).toBe('PENDING_VERIFICATION');

    const compat = evidenceEngine.evaluateReleaseCompatibility(assessment, null);
    const avail = evidenceEngine.evaluateSystemAvailability(assessment, null);
    const rec = evidenceEngine.generateRecommendation(assessment, null, compat, avail);
    expect(rec.outcome).toBe('INVESTIGATE_CATALOGUE_INFO');
  });

  // 7. Custom Transaction Scenario (ZFIN_CUSTOM)
  it('correctly classifies custom transaction ZFIN_CUSTOM and avoids inventing standard app IDs', async () => {
    const assessment = await assessmentService.getAssessmentByTCode('ZFIN_CUSTOM');
    expect(assessment).toBeDefined();
    if (!assessment) return;

    expect(assessment.classification).toBe('CUSTOM');
    expect(assessment.assessmentResult).toBe('NO_VERIFIED_MATCH');
    expect(assessment.matchingFioriApp).toBeNull();

    const candidates = await fioriCatalogueAdapter.getAppsByTCode('ZFIN_CUSTOM');
    expect(candidates.length).toBe(0);

    const compat = evidenceEngine.evaluateReleaseCompatibility(assessment, null);
    const avail = evidenceEngine.evaluateSystemAvailability(assessment, null);
    const rec = evidenceEngine.generateRecommendation(assessment, null, compat, avail);
    expect(rec.outcome).toBe('BUILD');
    expect(rec.canonicalOutcome).toBe('BUILD');
    expect(rec.recommendedAction).toContain('RAP');
  });

  // 8. Evidence Scoring Engine Formula
  it('calculates evidence score formulaically without pretending to be arbitrary SAP confidence', async () => {
    const assessment = await assessmentService.getAssessmentByTCode('F-53');
    if (!assessment) return;

    const evidence = evidenceEngine.compileDetailedEvidence(assessment);
    const score = evidenceEngine.calculateEvidenceScore(assessment, evidence);

    expect(score.totalScore).toBeGreaterThanOrEqual(70);
    expect(score.completenessLabel).toMatch(/COMPLETE|SUBSTANTIAL/);
    expect(score.breakdown.dictionaryScore).toBe(25);
    expect(score.breakdown.catalogueScore).toBe(25);
    expect(score.breakdown.compatibilityScore).toBe(20);
    expect(score.explanation).toContain('verified audit artifact completeness');
  });

  // 9. Full Consultation Export Service
  it('generates complete exportable consultation package preserving provenance', async () => {
    const assessment = await assessmentService.getAssessmentByTCode('F-53');
    if (!assessment) return;

    const details = await assessmentService.getAssessmentDetails(assessment.id);
    expect(details).toBeDefined();
    if (!details) return;

    const exportData = assessmentExportService.generateFullExportData(
      details.assessment,
      details.evidence,
      details.evidenceScore,
      details.candidates,
      details.roleValidation,
      details.odataValidation,
      details.compatibility,
      details.systemAvailability,
      details.recommendation
    );

    expect(exportData.exportMetadata.platform).toContain('S21 Client 200');
    expect(exportData.exportMetadata.disclaimer).toContain('fal.cloud.sap');

    const markdown = assessmentExportService.generateMarkdownReport(exportData);
    expect(markdown).toContain('# SAP TRANSACTION DISCOVERY & FIORI ASSESSMENT REPORT');
    expect(markdown).toContain('F-53');
    expect(markdown).toContain('F0773');
    expect(markdown).toContain('FAR_OUTGOING_PAYMENT_SRV');
    expect(markdown).toContain('4-Way Fact Separation');

    const pdfDoc = assessmentExportService.generatePdf(exportData);
    expect(pdfDoc).toBeDefined();
    expect(pdfDoc.getNumberOfPages()).toBeGreaterThan(0);
  });

  // 10. Backend Readiness Contracts (GET /api/assessments/:id)
  it('fulfills future CAP endpoint contracts for assessment details, evidence, and candidates', async () => {
    const details = await assessmentService.getAssessmentDetails('ASM-S21-F53');
    expect(details).not.toBeNull();
    expect(details?.assessment.id).toBe('ASM-S21-F53');
    expect(details?.evidence.length).toBeGreaterThan(0);
    expect(details?.candidates.length).toBeGreaterThan(0);
    expect(details?.recommendation.outcome).toBe('USE_STANDARD_FIORI_SUCCESSOR');

    const evidenceOnly = await assessmentService.getAssessmentEvidence('ASM-S21-F53');
    expect(evidenceOnly.length).toBeGreaterThan(0);

    const candidatesOnly = await assessmentService.getAssessmentCandidates('ASM-S21-F53');
    expect(candidatesOnly.some(c => c.appId === 'F0773')).toBe(true);
  });
});
