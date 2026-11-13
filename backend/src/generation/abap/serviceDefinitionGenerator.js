/**
 * Fiorify — GEN-05: RAP Service Definition Generator
 *
 * Synthesizes the ABAP RAP Service Definition (SRVD) exposing only projection views (ZC_*).
 */

import { createAbapArtifact, ABAP_ARTIFACT_TYPES } from './abapArtifactContract.js';

export function generateServiceDefinition(project, architecture) {
  const artifacts = [];
  const entities = project.dataModelSpec?.entities || [];
  const rootEntity = entities.find((e) => e.entityType === 'ROOT' || e.isRoot) || entities[0];
  if (!rootEntity) return artifacts;

  const prefix = (rootEntity.name || 'CUSTOM').replace(/[^a-zA-Z0-9_]/g, '');
  const rootProjectionName = `ZC_${prefix}`;
  const serviceName = `ZUI_${prefix}`.toUpperCase();

  let srvd = `@EndUserText.label: '${rootEntity.businessName || rootEntity.name} Service Definition'\n`;
  srvd += `define service ${serviceName} {\n`;
  srvd += `  expose ${rootProjectionName} as ${rootEntity.name};\n`;

  const childEntities = entities.filter((e) => e.entityId !== rootEntity.entityId);
  for (const child of childEntities) {
    const childProjName = `ZC_${prefix}_${child.name}`;
    srvd += `  expose ${childProjName} as ${child.name};\n`;
  }

  srvd += `}\n`;

  artifacts.push(createAbapArtifact({
    projectId: project.projectId,
    artifactType: ABAP_ARTIFACT_TYPES.RAP_SERVICE_DEFINITION,
    objectName: serviceName,
    filePath: `src/srvd/${serviceName.toLowerCase()}.srvd.asrvds`,
    content: srvd,
    sourceEntityIds: entities.map((e) => e.entityId),
    dependencies: [rootProjectionName, ...childEntities.map((c) => `ZC_${prefix}_${c.name}`)]
  }));

  return artifacts;
}
