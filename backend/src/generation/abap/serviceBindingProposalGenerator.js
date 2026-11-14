/**
 * Fiorify — GEN-05: Service Binding Proposal Generator (Sprint 13.3 / REM-GEN-02)
 *
 * Generates the Service Binding planning configuration (.srvb.json).
 *
 * ARCHITECTURAL CLARIFICATION:
 * This is a deployment planning artifact, NOT a TADIR binary object.
 * In SAP ABAP RAP, Service Bindings (R3TR SRVB) are binary repository objects
 * created and activated natively inside Eclipse ADT or published via Gateway.
 * This JSON manifest provides the authoritative blueprint and manual activation guide.
 */

import { createAbapArtifact, ABAP_ARTIFACT_TYPES } from './abapArtifactContract.js';

export function generateServiceBindingProposal(project, architecture) {
  const entities = project.dataModelSpec?.entities || [];
  const rootEntity = entities.find((e) => e.entityType === 'ROOT' || e.isRoot) || entities[0];
  if (!rootEntity) return [];

  const prefix = (rootEntity.name || 'CUSTOM').replace(/[^a-zA-Z0-9_]/g, '');
  const serviceDefinitionName = `ZUI_${prefix}`.toUpperCase();
  const bindingName = `ZUI_${prefix}_O4`.toUpperCase();
  const sapNamespace = project.targetPackage || 'ZCUSTOM_CORE';
  const targetRelease = project.targetRelease || 'SAP S/4HANA 2023 On-Premise';

  const proposal = {
    schemaVersion: '1.1.0',
    nature: 'Fiorify_PLANNING_ARTIFACT_ONLY',
    classification: 'DEPLOYMENT_BLUEPRINT',
    warning: 'IMPORTANT ARCHITECTURAL NOTICE: This .srvb.json file is a planning and deployment proposal. It is NOT a TADIR-activatable binary object (R3TR SRVB). Service Binding registration and local endpoint publication must be performed via Eclipse ADT or SAP Gateway (/IWFND/MAINT_SERVICE).',
    bindingName,
    bindingType: 'ODATA_V4_UI',
    serviceDefinition: serviceDefinitionName,
    package: sapNamespace,
    targetRelease,
    expectedServiceUrlPattern: `/sap/opu/odata4/sap/${serviceDefinitionName.toLowerCase()}/srvd/sap/${serviceDefinitionName.toLowerCase()}/0001/`,
    bindingSpecification: {
      bindingName,
      bindingType: 'ODATA_V4_UI',
      bindingCategory: 'WEB_API',
      serviceDefinitionName,
      serviceName: serviceDefinitionName,
      version: '0001',
      package: sapNamespace,
      targetRelease,
      expectedServiceUrlPattern: `/sap/opu/odata4/sap/${serviceDefinitionName.toLowerCase()}/srvd/sap/${serviceDefinitionName.toLowerCase()}/0001/`
    },
    entitySets: [
      {
        entitySetName: rootEntity.name,
        cdsView: `ZC_${prefix}`
      },
      ...entities.filter((e) => e.entityId !== rootEntity.entityId).map((c) => ({
        entitySetName: c.name,
        cdsView: `ZC_${prefix}_${c.name}`
      }))
    ],
    manualActivationGuide: {
      adtMethod: [
        `1. Open Eclipse with ABAP Development Tools (ADT) connected to SAP system (e.g. S21).`,
        `2. Right-click on Target Package "${sapNamespace}" -> New -> ABAP Repository Object -> Business Services -> Service Binding.`,
        `3. Enter Name: "${bindingName}" and Description: "${rootEntity.businessName || rootEntity.name} OData V4 UI Service".`,
        `4. Set Binding Type: "OData V4 - UI" and Referenced Service Definition: "${serviceDefinitionName}".`,
        `5. Click Finish, then activate the Service Binding (Ctrl+F3).`,
        `6. In the Service Binding editor, click the "Publish" button to register the local OData V4 service endpoint.`
      ],
      sapGatewayMethod: [
        `1. Log into SAP GUI on target system (e.g. S21, Client 200).`,
        `2. Execute transaction /IWFND/MAINT_SERVICE (Activate and Maintain Services).`,
        `3. Verify that service group "${serviceDefinitionName}" or "${bindingName}" is listed.`,
        `4. If unlisted, click "Add Service", select System Alias "LOCAL", and add the technical service.`,
        `5. Click "Call Browser" to verify HTTP 200 / $metadata response.`
      ]
    },
    activationStatus: 'NOT_ACTIVATED_LOCAL_PLANNING_ONLY'
  };

  return [
    createAbapArtifact({
      projectId: project.projectId,
      artifactType: ABAP_ARTIFACT_TYPES.RAP_SERVICE_BINDING_PROPOSAL,
      objectName: bindingName,
      filePath: `src/srvb/${bindingName.toLowerCase()}.srvb.json`,
      content: JSON.stringify(proposal, null, 2),
      language: 'JSON',
      sourceEntityIds: entities.map((e) => e.entityId),
      dependencies: [serviceDefinitionName],
      limitations: [
        'Planning blueprint only; R3TR SRVB binary object must be activated in Eclipse ADT on S21.'
      ],
      isPlanningArtifact: true,
      tadirObjectType: null,
      requiresManualAdtActivation: true
    })
  ];
}
