/**
 * Fiorify — GEN-05: RAP Service Definition Generator
 *
 * Synthesizes the ABAP RAP Service Definition (SRVD) exposing only projection views (ZC_*).
 */

import { createAbapArtifact, ABAP_ARTIFACT_TYPES } from './abapArtifactContract.js';
import { formatCdsViewName, formatChildCdsViewName } from './cdsViewEntityGenerator.js';

export function generateServiceDefinition(project, architecture) {
  const artifacts = [];
  const entities = project.dataModelSpec?.entities || [];
  const rootEntity = entities.find((e) => e.entityType === 'ROOT' || e.isRoot) || entities[0];
  if (!rootEntity) return artifacts;

  const prefix = (rootEntity.name || 'CUSTOM').replace(/[^a-zA-Z0-9_]/g, '');
  const rootProjectionName = formatCdsViewName('ZC_', prefix);
  const serviceName = formatCdsViewName('ZUI_', prefix).toUpperCase();

  let srvd = `@EndUserText.label: '${rootEntity.businessName || rootEntity.name} Service Definition'\n`;
  srvd += `define service ${serviceName} {\n`;
  srvd += `  expose ${rootProjectionName} as ${rootEntity.name};\n`;

  const childEntities = entities.filter((e) => e.entityId !== rootEntity.entityId);
  const childProjNames = [];
  for (const child of childEntities) {
    const childProjName = formatChildCdsViewName('ZC_', prefix, child.name);
    childProjNames.push(childProjName);
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
    dependencies: [rootProjectionName, ...childProjNames]
  }));

  return artifacts;
}
