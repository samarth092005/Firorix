import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  WizardStepId,
  DiscoveryWizardState,
  PRESET_SCENARIOS
} from '../types';
import { Step1Identification } from './Step1Identification';
import { Step2Information } from './Step2Information';
import { Step3Context } from './Step3Context';
import { Step4Requirements } from './Step4Requirements';
import { Step5Review } from './Step5Review';
import { SubmissionSuccessModal } from './SubmissionSuccessModal';
import { sapDiscoveryAdapter } from '../../../services/sap/sapDiscoveryAdapter';
import { fioriCatalogueAdapter } from '../../../services/catalogue/catalogueAdapter';
import { assessmentService } from '../../../services/assessmentService';
import { Check, ChevronRight, Server } from 'lucide-react';

export interface DiscoveryWizardProps {
  initialTcode?: string;
  initialSystemId?: string;
}

export const DiscoveryWizard: React.FC<DiscoveryWizardProps> = ({
  initialTcode = '',
  initialSystemId = 'S21-200'
}) => {
  const navigate = useNavigate();

  const [state, setState] = useState<DiscoveryWizardState>({
    currentStep: 1,
    tcode: initialTcode,
    systemId: initialSystemId,
    client: '200',
    targetRelease: 'SAP S/4HANA 2023 Private Edition',
    sapMetadata: null,
    businessContext: {
      businessProcess: 'Financial Accounting',
      primaryScenario: '',
      selectedRequirements: [],
      expectedFunctionality: [],
      assessmentObjective: '',
      businessCriticality: 'HIGH'
    },
    applicationRequirements: {
      relevantBusinessRole: '',
      knownODataService: '',
      requiredFunctionality: ['Open-Item Selection', 'Audit Logging', 'Real-time Validation'],
      knownLimitations: '',
      targetReleaseProfile: 'SAP S/4HANA 2023 Private Edition',
      isUserProvidedUnverified: true
    },
    selectedCatalogueApp: null,
    isValidating: false,
    isSubmitting: false,
    validationErrors: {},
    submittedAssessmentId: null,
    submittedRequestId: null
  });

  // Apply preset configuration when tcode changes to a known scenario
  const applyPresetForTcode = (tc: string) => {
    const clean = tc.trim().toUpperCase();
    const preset = PRESET_SCENARIOS[clean];
    if (preset) {
      setState((prev) => ({
        ...prev,
        tcode: clean,
        businessContext: {
          ...prev.businessContext,
          businessProcess: preset.businessProcess,
          primaryScenario: preset.defaultScenario,
          selectedRequirements: [...preset.defaultRequirements],
          expectedFunctionality: [...preset.defaultFunctionality],
          assessmentObjective: preset.defaultObjective,
          businessCriticality: 'HIGH'
        },
        applicationRequirements: {
          ...prev.applicationRequirements,
          relevantBusinessRole: preset.defaultRole,
          knownODataService: preset.defaultODataService,
          requiredFunctionality: [...preset.defaultFunctionality]
        }
      }));
    } else {
      setState((prev) => ({
        ...prev,
        tcode: clean,
        businessContext: {
          ...prev.businessContext,
          businessProcess: clean.startsWith('Z') ? 'Custom Development' : 'General SAP Processing',
          primaryScenario: `Operational execution of transaction ${clean}`,
          selectedRequirements: ['Real-time dictionary validation', 'Authorization check'],
          expectedFunctionality: ['Screen navigation', 'Data persistence'],
          assessmentObjective: `Evaluate modern Fiori alternative or WebGUI feasibility for transaction ${clean} in S21.`,
          businessCriticality: 'MEDIUM'
        },
        applicationRequirements: {
          ...prev.applicationRequirements,
          relevantBusinessRole: 'SAP_BR_BUSINESS_PROCESS_SPECIALIST',
          knownODataService: 'Service binding to be determined'
        }
      }));
    }
  };

  useEffect(() => {
    // Check if an assessment handoff payload exists from Candidate Comparison Matrix
    const handoffJson = sessionStorage.getItem('fiorix_pending_assessment_handoff');
    if (handoffJson) {
      try {
        const handoff = JSON.parse(handoffJson);
        sessionStorage.removeItem('fiorix_pending_assessment_handoff');
        if (handoff.requirement?.tcode) {
          const tcodeClean = handoff.requirement.tcode;
          applyPresetForTcode(tcodeClean);
          fioriCatalogueAdapter.getAppsByTCode(tcodeClean).then((candidates) => {
            const match = candidates.find((c) => c.appId === handoff.candidate?.appId) || candidates[0] || null;
            if (match) {
              setState((prev) => ({
                ...prev,
                tcode: tcodeClean,
                selectedCatalogueApp: match
              }));
            }
          }).catch((err) => {
            console.error('Failed to load catalogue app for handoff:', err);
          });
          return;
        }
      } catch (e) {
        console.error('Failed to parse assessment handoff payload:', e);
      }
    }

    if (initialTcode) {
      applyPresetForTcode(initialTcode);
    }
  }, [initialTcode]);

  // Step 1 -> Step 2: Fetch SAP DDIC metadata
  const handleProceedToStep2 = async () => {
    if (!state.tcode.trim()) {
      setState((s) => ({ ...s, validationErrors: { tcode: 'Please enter a valid transaction code.' } }));
      return;
    }

    setState((s) => ({ ...s, isValidating: true, validationErrors: {} }));

    try {
      const requestId = `REQ-${Date.now().toString().slice(-6)}-${state.tcode}`;
      const response = await sapDiscoveryAdapter.inspectTransaction({
        requestId,
        tcode: state.tcode,
        systemId: state.systemId,
        client: state.client,
        targetRelease: state.targetRelease,
        timestamp: new Date().toISOString()
      });

      // Find top matching catalogue app if available
      const topApp = response.catalogueCandidates[0] || null;

      setState((s) => ({
        ...s,
        sapMetadata: response,
        selectedCatalogueApp: topApp,
        currentStep: 2,
        isValidating: false
      }));
    } catch (err) {
      console.error('Error fetching SAP metadata:', err);
      setState((s) => ({ ...s, isValidating: false }));
    }
  };

  // Step 5: Submit assessment
  const handleSubmitAssessment = async () => {
    setState((s) => ({ ...s, isSubmitting: true }));

    try {
      const created = await assessmentService.createAssessment({
        tcode: state.tcode,
        systemId: state.systemId,
        client: state.client,
        targetRelease: state.targetRelease,
        businessContext: state.businessContext,
        applicationRequirements: state.applicationRequirements,
        discoveryMetadata: {
          description: state.sapMetadata?.description || 'SAP Transaction',
          programName: state.sapMetadata?.programName || 'UNKNOWN',
          screenNumber: state.sapMetadata?.screenNumber || '0100',
          packageName: state.sapMetadata?.packageName || 'ZCORE',
          classification: state.sapMetadata?.classification || 'STANDARD',
          originalSystem: state.sapMetadata?.originalSystem || 'SAP',
          softwareComponent: state.sapMetadata?.softwareComponent || 'S4CORE 108'
        },
        catalogueReference: state.selectedCatalogueApp
      });

      setState((s) => ({
        ...s,
        isSubmitting: false,
        submittedAssessmentId: created.id,
        submittedRequestId: created.requestId || `REQ-${Date.now().toString().slice(-6)}`
      }));
    } catch (err) {
      console.error('Failed to submit assessment:', err);
      setState((s) => ({ ...s, isSubmitting: false }));
    }
  };

  const handleResetWizard = () => {
    setState({
      currentStep: 1,
      tcode: '',
      systemId: 'S21-200',
      client: '200',
      targetRelease: 'SAP S/4HANA 2023 Private Edition',
      sapMetadata: null,
      businessContext: {
        businessProcess: 'Financial Accounting',
        primaryScenario: '',
        selectedRequirements: [],
        expectedFunctionality: [],
        assessmentObjective: '',
        businessCriticality: 'HIGH'
      },
      applicationRequirements: {
        relevantBusinessRole: '',
        knownODataService: '',
        requiredFunctionality: ['Open-Item Selection', 'Audit Logging', 'Real-time Validation'],
        knownLimitations: '',
        targetReleaseProfile: 'SAP S/4HANA 2023 Private Edition',
        isUserProvidedUnverified: true
      },
      selectedCatalogueApp: null,
      isValidating: false,
      isSubmitting: false,
      validationErrors: {},
      submittedAssessmentId: null,
      submittedRequestId: null
    });
  };

  const stepsList: { id: WizardStepId; label: string }[] = [
    { id: 1, label: 'Identification' },
    { id: 2, label: 'SAP Information' },
    { id: 3, label: 'Business Context' },
    { id: 4, label: 'Requirements' },
    { id: 5, label: 'Review & Submit' }
  ];

  return (
    <div
      style={{
        backgroundColor: '#FFFFFF',
        border: '1px solid var(--fiori-border, #E2E8F0)',
        borderRadius: 'var(--radius-lg, 12px)',
        boxShadow: 'var(--fiori-shadow-card)',
        overflow: 'hidden'
      }}
    >
      {/* Step Indicator Header */}
      <div
        style={{
          padding: '18px 24px',
          backgroundColor: '#FFFFFF',
          borderBottom: '1px solid var(--fiori-border, #E2E8F0)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h2 style={{ fontSize: '16px', fontWeight: 600, margin: 0, color: 'var(--fiori-text-primary, #0F172A)' }}>
              Transaction Discovery &amp; Assessment Wizard
            </h2>
            <div style={{ fontSize: '13px', color: 'var(--fiori-text-secondary, #64748B)', marginTop: '2px' }}>
              Follow guided steps to inspect transaction metadata and find matching Fiori applications.
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--fiori-text-secondary, #64748B)' }}>
            <Server size={13} color="var(--fiori-primary, #0066FF)" />
            <span>Target:</span>
            <strong style={{ color: 'var(--fiori-text-primary, #0F172A)' }}>{state.systemId}</strong>
            <span style={{ color: '#CBD5E1' }}>|</span>
            <span>Client:</span>
            <strong style={{ color: 'var(--fiori-text-primary, #0F172A)' }}>{state.client}</strong>
          </div>
        </div>

        {/* Wizard Step Progress Tracker */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginTop: '16px',
            overflowX: 'auto',
            paddingBottom: '4px'
          }}
        >
          {stepsList.map((step, idx) => {
            const isCompleted = state.currentStep > step.id;
            const isCurrent = state.currentStep === step.id;

            return (
              <React.Fragment key={step.id}>
                <div
                  onClick={() => {
                    if (isCompleted) {
                      setState((s) => ({ ...s, currentStep: step.id }));
                    }
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    cursor: isCompleted ? 'pointer' : 'default',
                    opacity: isCurrent || isCompleted ? 1 : 0.65
                  }}
                >
                  <div
                    style={{
                      width: '26px',
                      height: '26px',
                      borderRadius: '50%',
                      backgroundColor: isCurrent
                        ? 'var(--fiori-primary, #0066FF)'
                        : isCompleted
                        ? '#DCFCE7'
                        : '#F8FAFC',
                      color: isCurrent
                        ? '#FFFFFF'
                        : isCompleted
                        ? '#15803D'
                        : '#94A3B8',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '11px',
                      fontWeight: 700,
                      border: isCurrent
                        ? 'none'
                        : isCompleted
                        ? '1px solid #BBF7D0'
                        : '1px solid #E2E8F0',
                      boxShadow: isCurrent ? '0 2px 6px rgba(0, 102, 255, 0.3)' : 'none'
                    }}
                  >
                    {isCompleted ? <Check size={13} /> : step.id}
                  </div>
                  <span
                    style={{
                      fontSize: '12px',
                      fontWeight: isCurrent ? 600 : 500,
                      color: isCurrent
                        ? 'var(--fiori-primary, #0066FF)'
                        : 'var(--fiori-text-primary, #0F172A)',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    {step.label}
                  </span>
                </div>

                {idx < stepsList.length - 1 && (
                  <ChevronRight size={14} color="#CBD5E1" style={{ flexShrink: 0 }} />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Wizard Content Body */}
      <div style={{ padding: '24px' }}>
        {state.currentStep === 1 && (
          <Step1Identification
            tcode={state.tcode}
            systemId={state.systemId}
            client={state.client}
            targetRelease={state.targetRelease}
            onTcodeChange={(tc) => applyPresetForTcode(tc)}
            onSystemChange={(sysId, cl, rel) => setState((s) => ({ ...s, systemId: sysId, client: cl, targetRelease: rel }))}
            onSelectPreset={(tc) => applyPresetForTcode(tc)}
            onNext={handleProceedToStep2}
            validationError={state.validationErrors.tcode}
          />
        )}

        {state.currentStep === 2 && (
          <Step2Information
            metadata={state.sapMetadata}
            isLoading={state.isValidating}
            onBack={() => setState((s) => ({ ...s, currentStep: 1 }))}
            onNext={() => setState((s) => ({ ...s, currentStep: 3 }))}
            onQuickAssess={handleSubmitAssessment}
          />
        )}

        {state.currentStep === 3 && (
          <Step3Context
            tcode={state.tcode}
            context={state.businessContext}
            onChange={(ctx) => setState((s) => ({ ...s, businessContext: ctx }))}
            onBack={() => setState((s) => ({ ...s, currentStep: 2 }))}
            onNext={() => setState((s) => ({ ...s, currentStep: 4 }))}
          />
        )}

        {state.currentStep === 4 && (
          <Step4Requirements
            tcode={state.tcode}
            requirements={state.applicationRequirements}
            onChange={(req) => setState((s) => ({ ...s, applicationRequirements: req }))}
            onBack={() => setState((s) => ({ ...s, currentStep: 3 }))}
            onNext={() => setState((s) => ({ ...s, currentStep: 5 }))}
          />
        )}

        {state.currentStep === 5 && (
          <Step5Review
            tcode={state.tcode}
            systemId={state.systemId}
            client={state.client}
            targetRelease={state.targetRelease}
            sapMetadata={state.sapMetadata}
            businessContext={state.businessContext}
            applicationRequirements={state.applicationRequirements}
            catalogueApp={state.selectedCatalogueApp}
            isSubmitting={state.isSubmitting}
            onEditStep={(step) => setState((s) => ({ ...s, currentStep: step }))}
            onBack={() => setState((s) => ({ ...s, currentStep: 4 }))}
            onSubmit={handleSubmitAssessment}
          />
        )}
      </div>

      {/* Submission Confirmation Modal */}
      {state.submittedAssessmentId && (
        <SubmissionSuccessModal
          isOpen={true}
          tcode={state.tcode}
          systemId={state.systemId}
          client={state.client}
          assessmentId={state.submittedAssessmentId}
          requestId={state.submittedRequestId || 'REQ-2026'}
          assessmentResult={state.selectedCatalogueApp ? 'EXPLICIT_SUCCESSOR' : 'PENDING_VERIFICATION'}
          onReset={handleResetWizard}
        />
      )}
    </div>
  );
};
