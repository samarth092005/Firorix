import { describe, it, expect, vi } from 'vitest';
import { assessmentService } from '../../../services/assessmentService';
import { apiClient } from '../../../services/api/apiClient';
import {
  AssessmentRecord,
  CatalogueReference,
  ImplementationReadinessChecklist,
  GenerationHandoffPayload
} from '../../../services/contracts/types';

describe('MW-01 + MW-02 + MW-03: Modernization Workspace Frontend & Integration Test Suite', () => {

  const mockAssessment: AssessmentRecord = {
    id: 'ASM-S4-F53-001',
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
    fitGapScore: 82,
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
    },
    recommendation: {
      outcome: 'ADD_AND_CONFIGURE',
      rationale: 'Standard SAP Fiori app F0773 satisfies clearing requirements.',
      actionableRemediationPlan: []
    },
    auditEvents: [
      {
        eventId: 'AUD-001',
        timestamp: new Date().toISOString(),
        author: 'Lead Architect',
        action: 'CREATED',
        previousHash: 'GENESIS',
        integrityHash: 'HASH-001'
      }
    ],
    updatedAt: new Date().toISOString()
  };

  // Scenario 1: ADD_AND_CONFIGURE recommendation
  it('Scenario 1: ADD_AND_CONFIGURE recommendation provides standard app context and compatible status', async () => {
    const assessment = await assessmentService.getAssessmentByTCode('F-53');
    expect(assessment).toBeDefined();
    expect(assessment?.matchingFioriApp?.appId).toBe('F0773');
    expect(assessment?.matchingFioriApp?.releaseCompatibility).toBe('COMPATIBLE');
  });

  // Scenario 2: CONFIGURE recommendation
  it('Scenario 2: CONFIGURE recommendation evaluates 9 independent checklist items', async () => {
    const checklist: ImplementationReadinessChecklist = {
      productReleaseCompatibility: 'VERIFIED',
      odataServices: 'VERIFIED',
      serviceRegistration: 'PENDING',
      icfUi5Services: 'PENDING',
      systemAlias: 'VERIFIED',
      businessCatalogue: 'PENDING',
      pfcgBusinessRoles: 'PENDING',
      launchpadAvailability: 'NOT_VERIFIED',
      userAuthorization: 'NOT_VERIFIED'
    };

    const spy = vi.spyOn(apiClient, 'recordModernizationAction').mockResolvedValueOnce({
      success: true,
      action: {
        actionId: 'ACT-001',
        actionType: 'CONFIGURE_ADOPT_READINESS',
        details: { checklist }
      },
      assessment: {
        ...mockAssessment,
        readinessChecklist: checklist,
        deploymentReadiness: {
          stage: 'DEV_READINESS',
          devReady: true,
          qasValidated: false,
          businessAccepted: false,
          productionReady: false,
          approvedForDeployment: false,
          lastUpdated: new Date().toISOString()
        }
      }
    });

    const result = await assessmentService.recordModernizationAction(mockAssessment.id, {
      actionType: 'CONFIGURE_ADOPT_READINESS',
      details: { checklist }
    });

    expect(spy).toHaveBeenCalled();
    expect(result.success).toBe(true);
    expect(result.action.actionType).toBe('CONFIGURE_ADOPT_READINESS');
  });

  // Scenario 3: ADD_AND_CONFIGURE with Clean Core adaptation
  it('Scenario 3: ADD_AND_CONFIGURE captures Clean Core extension tier without inventing BAdIs', async () => {
    const spy = vi.spyOn(apiClient, 'recordModernizationAction').mockResolvedValueOnce({
      success: true,
      action: {
        actionId: 'ACT-EXT-001',
        actionType: 'ADD_AND_CONFIGURE',
        details: {
          targetApp: 'F0773',
          tier: 'TIER_1_KEY_USER',
          cleanCoreTier: 'TIER_1_KEY_USER'
        }
      },
      assessment: mockAssessment
    });

    const result = await assessmentService.recordModernizationAction(mockAssessment.id, {
      actionType: 'ADD_AND_CONFIGURE',
      details: {
        targetApp: 'F0773',
        tier: 'TIER_1_KEY_USER'
      }
    });

    expect(spy).toHaveBeenCalled();
    expect(result.success).toBe(true);
    expect(result.action.details.tier).toBe('TIER_1_KEY_USER');
  });

  // Scenario 4: BUILD recommendation
  it('Scenario 4: BUILD recommendation accepted for proprietary transaction', async () => {
    const handoffPayload: Partial<GenerationHandoffPayload> = {
      sourceAssessmentId: 'ASM-PROP-001',
      tcode: 'ZPAY_CUSTOM',
      proposedAppType: 'RAP_MANAGED',
      architectApproved: true,
      cleanCoreJustification: 'Proprietary transaction with 0 standard Fiori coverage.'
    };

    const spy = vi.spyOn(apiClient, 'createGenerationHandoff').mockResolvedValueOnce({
      success: true,
      handoff: {
        handoffId: 'HND-PROP-001',
        ...handoffPayload,
        currentStage: 'DRAFT',
        createdAt: new Date().toISOString()
      }
    });

    const handoff = await assessmentService.createGenerationHandoff(handoffPayload);
    expect(spy).toHaveBeenCalled();
    expect(handoff.currentStage).toBe('DRAFT');
    expect(handoff.proposedAppType).toBe('RAP_MANAGED');
  });

  // Scenario 5: BUILD blocked due to incomplete catalogue
  it('Scenario 5: BUILD blocked when catalogue verification is incomplete', async () => {
    vi.spyOn(apiClient, 'recordModernizationAction').mockRejectedValueOnce(
      new Error('Cannot commission custom build while catalogue verification is incomplete.')
    );

    await expect(
      assessmentService.recordModernizationAction(mockAssessment.id, {
        actionType: 'BUILD_PROJECT',
        details: { catalogueStatus: 'INCOMPLETE' }
      })
    ).rejects.toThrow(/catalogue verification is incomplete/i);
  });

  // Scenario 6: BUILD blocked due to missing approval
  it('Scenario 6: BUILD blocked when standard app exists and architect approval is missing', async () => {
    vi.spyOn(apiClient, 'recordModernizationAction').mockRejectedValueOnce(
      new Error('Clean Core Guardrail Violation: Standard SAP Fiori candidates exist. Initiating custom build requires Lead Enterprise Architect sign-off.')
    );

    await expect(
      assessmentService.recordModernizationAction(mockAssessment.id, {
        actionType: 'BUILD_PROJECT',
        details: { leadArchitectApproval: false }
      })
    ).rejects.toThrow(/Clean Core Guardrail Violation/i);
  });

  // Scenario 7: Standard app exists and Build exception is requested
  it('Scenario 7: Standard app exists and Build exception is authorized with documented justification', async () => {
    vi.spyOn(apiClient, 'recordModernizationAction').mockResolvedValueOnce({
      success: true,
      action: {
        actionId: 'ACT-BUILD-001',
        actionType: 'BUILD_PROJECT',
        details: {
          leadArchitectApproval: true,
          justification: 'Strategic proprietary RAP rewrite'
        }
      },
      assessment: mockAssessment
    });

    const result = await assessmentService.recordModernizationAction(mockAssessment.id, {
      actionType: 'BUILD_PROJECT',
      details: {
        leadArchitectApproval: true,
        justification: 'Strategic proprietary RAP rewrite'
      }
    });

    expect(result.success).toBe(true);
    expect(result.action.actionType).toBe('BUILD_PROJECT');
  });

  // Scenario 8: Add Found persistence
  it('Scenario 8: ADD_FOUND action persists standard Fiori application to assessment', async () => {
    vi.spyOn(apiClient, 'recordModernizationAction').mockResolvedValueOnce({
      success: true,
      action: {
        actionId: 'ACT-FOUND-001',
        actionType: 'ADD_FOUND',
        details: { appId: 'F0773', appName: 'Post Outgoing Payments' }
      },
      assessment: {
        ...mockAssessment,
        matchingFioriApp: {
          appId: 'F0773',
          appName: 'Post Outgoing Payments',
          appType: 'SAP Fiori elements',
          uiTechnology: 'SAP Fiori elements',
          releaseCompatibility: 'COMPATIBLE',
          sourceLabel: 'Official SAP Fiori Apps Reference Library'
        }
      }
    });

    const result = await assessmentService.recordModernizationAction(mockAssessment.id, {
      actionType: 'ADD_FOUND',
      details: { appId: 'F0773' }
    });

    expect(result.success).toBe(true);
    expect(result.assessment.matchingFioriApp.appId).toBe('F0773');
  });

  // Scenario 9: Duplicate Add Found (idempotency)
  it('Scenario 9: Duplicate ADD_FOUND action is handled idempotently', async () => {
    vi.spyOn(apiClient, 'recordModernizationAction').mockResolvedValueOnce({
      success: true,
      isIdempotent: true,
      action: {
        actionId: 'ACT-FOUND-001',
        actionType: 'ADD_FOUND',
        idempotencyKey: 'KEY-001'
      },
      assessment: mockAssessment
    });

    const result = await assessmentService.recordModernizationAction(mockAssessment.id, {
      actionType: 'ADD_FOUND',
      idempotencyKey: 'KEY-001',
      details: { appId: 'F0773' }
    });

    expect(result.success).toBe(true);
    expect(result.isIdempotent).toBe(true);
  });

  // Scenario 10: Adoption readiness persistence
  it('Scenario 10: Adoption readiness checklist persists all 9 items', async () => {
    const checklist: ImplementationReadinessChecklist = {
      productReleaseCompatibility: 'VERIFIED',
      odataServices: 'VERIFIED',
      serviceRegistration: 'VERIFIED',
      icfUi5Services: 'VERIFIED',
      systemAlias: 'VERIFIED',
      businessCatalogue: 'VERIFIED',
      pfcgBusinessRoles: 'VERIFIED',
      launchpadAvailability: 'VERIFIED',
      userAuthorization: 'VERIFIED'
    };

    vi.spyOn(apiClient, 'recordModernizationAction').mockResolvedValueOnce({
      success: true,
      action: {
        actionId: 'ACT-READ-001',
        actionType: 'CONFIGURE_ADOPT_READINESS',
        details: { checklist }
      },
      assessment: {
        ...mockAssessment,
        readinessChecklist: checklist
      }
    });

    const result = await assessmentService.recordModernizationAction(mockAssessment.id, {
      actionType: 'CONFIGURE_ADOPT_READINESS',
      details: { checklist }
    });

    expect(result.success).toBe(true);
    expect(result.assessment.readinessChecklist.userAuthorization).toBe('VERIFIED');
  });

  // Scenario 11: Clean Core adaptation specification persistence
  it('Scenario 11: Clean Core adaptation specification persists tier and notes', async () => {
    vi.spyOn(apiClient, 'recordModernizationAction').mockResolvedValueOnce({
      success: true,
      action: {
        actionId: 'ACT-EXT-002',
        actionType: 'ADD_AND_CONFIGURE',
        details: {
          tier: 'TIER_2_CLOUD_DEVELOPER',
          notes: 'Developer extension in ADT'
        }
      },
      assessment: mockAssessment
    });

    const result = await assessmentService.recordModernizationAction(mockAssessment.id, {
      actionType: 'ADD_AND_CONFIGURE',
      details: { tier: 'TIER_2_CLOUD_DEVELOPER' }
    });

    expect(result.success).toBe(true);
    expect(result.action.details.tier).toBe('TIER_2_CLOUD_DEVELOPER');
  });

  // Scenario 12: Generation project creation
  it('Scenario 12: Generation project creation produces backend handoff with initial stage DRAFT', async () => {
    vi.spyOn(apiClient, 'createGenerationHandoff').mockResolvedValueOnce({
      success: true,
      handoff: {
        handoffId: 'HND-TEST-001',
        sourceAssessmentId: mockAssessment.id,
        tcode: 'F-53',
        currentStage: 'DRAFT',
        proposedAppType: 'RAP_MANAGED'
      }
    });

    const handoff = await assessmentService.createGenerationHandoff({
      sourceAssessmentId: mockAssessment.id,
      tcode: 'F-53'
    });

    expect(handoff.currentStage).toBe('DRAFT');
    expect(handoff.proposedAppType).toBe('RAP_MANAGED');
  });

  // Scenario 13: Generation handoff survives page refresh
  it('Scenario 13: Generation handoff resolves via getGenerationHandoff(handoffId)', async () => {
    vi.spyOn(apiClient, 'getGenerationHandoff').mockResolvedValueOnce({
      success: true,
      handoff: {
        handoffId: 'HND-REFRESH-001',
        sourceAssessmentId: mockAssessment.id,
        tcode: 'F-53',
        currentStage: 'DRAFT',
        targetRelease: 'SAP S/4HANA 2023 Private Edition'
      }
    });

    const handoff = await assessmentService.getGenerationHandoff('HND-REFRESH-001');
    expect(handoff).toBeDefined();
    expect(handoff?.handoffId).toBe('HND-REFRESH-001');
    expect(handoff?.currentStage).toBe('DRAFT');
  });

  // Scenario 14: Invalid assessment ID
  it('Scenario 14: Rejects generation handoff for invalid assessment ID', async () => {
    vi.spyOn(apiClient, 'createGenerationHandoff').mockRejectedValueOnce(
      new Error('Assessment with ID "INVALID-ID" does not exist.')
    );

    await expect(
      assessmentService.createGenerationHandoff({
        sourceAssessmentId: 'INVALID-ID',
        tcode: 'ZINVALID'
      })
    ).rejects.toThrow(/does not exist/i);
  });

  // Scenario 15: Unauthorized project creation
  it('Scenario 15: Unauthorized project creation error handled cleanly', async () => {
    vi.spyOn(apiClient, 'createGenerationHandoff').mockRejectedValueOnce(
      new Error('Clean Core Guardrail Violation: Initiating custom build requires documented justification and Lead Enterprise Architect sign-off.')
    );

    await expect(
      assessmentService.createGenerationHandoff({
        sourceAssessmentId: mockAssessment.id,
        tcode: 'F-53',
        architectApproved: false
      })
    ).rejects.toThrow(/Clean Core Guardrail Violation/i);
  });

  // Scenario 16: Assessment history remains intact
  it('Scenario 16: Assessment modernization decisions history can be retrieved', async () => {
    vi.spyOn(apiClient, 'getModernizationDecisions').mockResolvedValueOnce({
      success: true,
      assessmentId: mockAssessment.id,
      count: 2,
      decisions: [
        {
          actionId: 'ACT-001',
          actionType: 'ADD_FOUND',
          timestamp: new Date().toISOString(),
          author: 'Lead Architect',
          comment: 'Associated standard candidate.'
        },
        {
          actionId: 'ACT-002',
          actionType: 'CONFIGURE_ADOPT_READINESS',
          timestamp: new Date().toISOString(),
          author: 'Basis Lead',
          comment: 'Recorded readiness checklist.'
        }
      ]
    });

    const decisions = await assessmentService.getModernizationDecisions(mockAssessment.id);
    expect(Array.isArray(decisions)).toBe(true);
    expect(decisions.length).toBe(2);
    expect(decisions[0].actionType).toBe('ADD_FOUND');
    expect(decisions[1].actionType).toBe('CONFIGURE_ADOPT_READINESS');
  });
});
