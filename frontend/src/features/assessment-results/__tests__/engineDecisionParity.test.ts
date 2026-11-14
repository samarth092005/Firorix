import { describe, it, expect } from 'vitest';
import scenarios from '../../../../../shared/test-fixtures/engineParityScenarios.json';
import { evidenceEngine } from '../services/evidenceEngine';
import {
  AssessmentRecord,
  CatalogueReference,
  ReleaseCompatibilityRecord,
  SystemAvailabilityAudit
} from '../../../services/contracts/types';

describe('Engine Decision Parity: Backend / Frontend 14-Scenario Matrix (Shared Fixture Driven)', () => {
  expect(Array.isArray(scenarios)).toBe(true);
  expect(scenarios.length).toBe(14);

  const baseAssessment: AssessmentRecord = {
    id: 'ASM-PARITY-BASE',
    tcode: 'F-53',
    description: 'Post Outgoing Payments',
    systemId: 'S21',
    client: '200',
    originalSystem: 'S21',
    softwareComponent: 'S4CORE 108 SP0003',
    programName: 'SAPMF05A',
    screenNumber: '0100',
    packageName: 'FBAS',
    release: 'SAP S/4HANA 2023 Private Edition',
    targetRelease: 'SAP S/4HANA 2023 Private Edition',
    businessArea: 'Financial Accounting',
    subArea: 'Accounts Payable',
    classification: 'STANDARD',
    fitGapScore: 90,
    status: 'RECOMMENDATION_COMPLETED',
    lifecycleStatus: 'RECOMMENDATION_COMPLETED',
    assessmentResult: 'EXPLICIT_SUCCESSOR',
    lastAssessed: new Date().toISOString(),
    isDemo: false,
    evidenceNotes: ['Verified via FAL catalogue'],
    rationale: 'Standard SAP Fiori app F0773 satisfies clearing requirements.',
    matchingFioriApp: {
      appId: 'F0773',
      appName: 'Post Outgoing Payments',
      appType: 'SAP Fiori elements',
      uiTechnology: 'SAP Fiori elements',
      releaseCompatibility: 'COMPATIBLE',
      sourceLabel: 'Official SAP Fiori Apps Reference Library',
      businessRoles: ['SAP_BR_AP_ACCOUNTANT'],
      odataServices: ['FAR_OUTGOING_PAYMENT_SRV']
    }
  };

  const compatibleRecord: ReleaseCompatibilityRecord = {
    targetRelease: 'SAP S/4HANA 2023 Private Edition',
    requiredProductVersion: 'SAP S/4HANA 2023',
    status: 'COMPATIBLE',
    minimumRelease: 'S4CORE 108 SP0003',
    componentChecks: [],
    details: 'Fully compatible'
  };

  const availableAudit: SystemAvailabilityAudit = {
    catalogueMatchStatus: 'CATALOGUE_VERIFIED',
    activationStatus: 'ACTIVATED',
    serviceRegistrationStatus: 'REGISTERED',
    roleAssignmentStatus: 'ASSIGNED',
    launchpadVisibilityStatus: 'CONFIRMED',
    overallS21Availability: 'VERIFIED_READY'
  };

  for (const scn of scenarios) {
    it(`${scn.index}. ${scn.name}`, () => {
      // Construct merged assessment record
      const mergedAssessment: AssessmentRecord = {
        ...baseAssessment,
        ...scn.inputs.assessment,
        requirementStatement: scn.inputs.requirement?.statement,
        rationale: scn.inputs.requirement?.statement || (scn.inputs.assessment as any)?.rationale || baseAssessment.rationale,
        matchingFioriApp: scn.inputs.candidate
          ? {
              appId: scn.inputs.candidate.appId,
              appName: scn.inputs.candidate.appName,
              appType: (scn.inputs.candidate as any).appType || 'SAP Fiori elements',
              uiTechnology: (scn.inputs.candidate as any).uiTechnology || 'SAP Fiori elements',
              releaseCompatibility: scn.inputs.candidate.releaseCompatibility || 'COMPATIBLE'
            }
          : (scn.inputs.assessment.matchingFioriApp || null),
        leadArchitectApproval: scn.inputs.context?.leadArchitectApproval || (scn.inputs.assessment as any)?.leadArchitectApproval
      } as any;

      const compRecord: ReleaseCompatibilityRecord = {
        ...compatibleRecord,
        status: (scn.inputs.candidate?.releaseCompatibility === 'UNVERIFIED' || scn.inputs.candidate?.releaseCompatibility === 'INCOMPATIBLE')
          ? 'INCOMPATIBLE'
          : 'COMPATIBLE'
      };

      const rec = evidenceEngine.generateRecommendation(
        mergedAssessment,
        scn.inputs.candidate as CatalogueReference | null,
        compRecord,
        availableAudit
      );

      expect(rec.businessOutcome).toBe(scn.expected.businessOutcome);
      expect(rec.governanceState).toBe(scn.expected.governanceState);
      expect(rec.isBusinessOutcome).toBe(scn.expected.isBusinessOutcome);
      expect(rec.outcome).toBe(scn.expected.outcome);
    });
  }
});
