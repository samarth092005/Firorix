/**
 * Fiorify — GEN-05: DCL Access Control Generator
 *
 * Generates ABAP CDS Access Control (DCL) for Root Interface View
 * enforcing Clean Core PFCG authorization checks.
 */

import { createAbapArtifact, ABAP_ARTIFACT_TYPES } from './abapArtifactContract.js';

export function generateDclAccessControl(project, architecture) {
  const entities = project.dataModelSpec?.entities || [];
  const rootEntity = entities.find((e) => e.entityType === 'ROOT' || e.isRoot) || entities[0];
  if (!rootEntity) return [];

  const prefix = (rootEntity.name || 'CUSTOM').replace(/[^a-zA-Z0-9_]/g, '');
  const rootInterfaceName = `ZI_${prefix}`;
  const dclRoleName = `Z_${prefix}_DCL`.toUpperCase();

  let dcl = `@EndUserText.label: 'Access Control for ${rootEntity.businessName || rootEntity.name}'\n`;
  dcl += `@MappingRole: true\n`;
  dcl += `define role ${dclRoleName} {\n`;
  dcl += `  grant\n`;
  dcl += `    select\n`;
  dcl += `      on\n`;
  dcl += `        ${rootInterfaceName}\n`;
  dcl += `          where\n`;
  dcl += `            /* Standard authorization aspect check */\n`;
  dcl += `            ( ) = aspect pfcg_auth( S_TABU_DIS, ACTVT = '03', DICBERCLS = '&NC&' );\n`;
  dcl += `}\n`;

  return [
    createAbapArtifact({
      projectId: project.projectId,
      artifactType: ABAP_ARTIFACT_TYPES.DCL_ACCESS_CONTROL,
      objectName: dclRoleName,
      filePath: `src/dcl/${dclRoleName.toLowerCase()}.dcls.asdcls`,
      content: dcl,
      sourceEntityIds: [rootEntity.entityId],
      dependencies: [rootInterfaceName],
      limitations: [
        'Enforces default S_TABU_DIS authorization check.',
        'Requires ABAP security review to configure custom authorization objects (e.g. S_PROGRAM, Z_CUSTOM_AUTH).'
      ]
    })
  ];
}
