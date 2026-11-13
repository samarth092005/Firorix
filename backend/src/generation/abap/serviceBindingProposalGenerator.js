/**
 * Fiorify — GEN-05: Service Binding Proposal Generator
 *
 * Generates the Service Binding planning configuration (.srvb.json)
 * defining OData V4 UI service endpoints and manual activation instructions.
 */

import { createAbapArtifact, ABAP_ARTIFACT_TYPES } from './abapArtifactContract.js';

export function generateServiceBindingProposal(project, architecture) {
  const entities = project.dataModelSpec?.entities || [];
  const rootEntity = entities.find((e) => e.entityType === 'ROOT' || e.isRoot) || entities[0];
  if (!rootEntity) return [];

  const prefix = (rootEntity.name || 'CUSTOM').replace(/[^a-zA-Z0-9_]/g, '');
  const serviceName = `ZUI_${prefix}`.toUpperCase();
  const bindingName = `ZUI_${prefix}_O4`.toUpperCase();
  const sapNamespace = project.targetPackage || 'ZCUSTOM_CORE';

  const proposal = {
    schemaVersion: '1.0.0',
    nature: 'Fiorify_PLANNING_ARTIFACT_ONLY',
    warning: 'This is a planning/configuration artifact. It is NOT an activatable ABAP SRVB object. Creation and activation must be performed in Eclipse ADT.',
    bindingName,
    bindingType: 'ODATA_V4_UI',
    serviceDefinition: serviceName,
    package: sapNamespace,
    targetRelease: project.targetRelease || 'SAP S/4HANA 2023 On-Premise',
    expectedServiceUrlPattern: `/sap/opu/odata4/sap/${serviceName.toLowerCase()}/srvd/sap/${serviceName.toLowerCase()}/0001/`,
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
    activationInstructions: [
      `1. Open Eclipse with ABAP Development Tools (ADT) connected to SAP system (e.g. S21).`,
      `2. Right-click on Package "${sapNamespace}" -> New -> ABAP Repository Object -> Business Services -> Service Binding.`,
      `3. Enter Name: "${bindingName}" and Description: "${rootEntity.businessName || rootEntity.name} OData V4 UI Service".`,
      `4. Select Binding Type: "OData V4 - UI" and Referenced Service Definition: "${serviceName}".`,
      `5. Click Finish, then click the "Activate" button (Ctrl+F3).`,
      `6. Click the "Publish" button to register the local service endpoint.`
    ],
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
      dependencies: [serviceName],
      limitations: [
        'Planning configuration only; ABAP service binding publication must be executed in Eclipse ADT on S21.'
      ]
    })
  ];
}
