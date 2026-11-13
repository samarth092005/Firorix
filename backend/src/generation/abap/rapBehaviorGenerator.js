/**
 * Fiorify — GEN-05: RAP Behavior Definition Generator
 *
 * Generates ABAP RAP Behavior Definitions (BDEF) supporting Managed with Draft,
 * Managed without Draft, and Read-Only Query profiles in compliance with S/4HANA 2023.
 */

import { createAbapArtifact, ABAP_ARTIFACT_TYPES } from './abapArtifactContract.js';
import { RAP_PROFILES } from '../architecture/architectureContract.js';

function toAbapMethodName(prefix, title) {
  let clean = (title || 'Action').replace(/[^a-zA-Z0-9]/g, '');
  if (clean.toLowerCase().startsWith(prefix.toLowerCase())) {
    clean = clean.slice(prefix.length);
  }
  return `${prefix}${clean}`.slice(0, 30);
}

export function generateBehaviorDefinition(project, architecture) {
  const artifacts = [];
  const entities = project.dataModelSpec?.entities || [];
  const relationships = project.dataModelSpec?.relationships || [];
  const requirements = project.requirementsSpec?.items || [];
  const rootEntity = entities.find((e) => e.entityType === 'ROOT' || e.isRoot) || entities[0];
  if (!rootEntity) return artifacts;

  const prefix = (rootEntity.name || 'CUSTOM').replace(/[^a-zA-Z0-9_]/g, '');
  const rootInterfaceName = `ZI_${prefix}`;
  const rootProjectionName = `ZC_${prefix}`;
  const rootImplClass = `BP_I_${prefix}`.toUpperCase();

  const draftEnabled = architecture.draftDecision?.enabled === true;
  const isReadOnly = architecture.selectedProfile === RAP_PROFILES.READ_ONLY_QUERY;

  if (isReadOnly) {
    // Read-only queries do not generate transactional BDEF
    return artifacts;
  }

  const isUnmanaged = architecture.selectedProfile === RAP_PROFILES.UNMANAGED_RAP;

  // 1. Root Entity Behavior Definition
  const implType = isUnmanaged ? 'unmanaged' : 'managed';
  let bdef = `${implType} implementation in class ${rootImplClass.toLowerCase()} unique;\n`;
  bdef += `strict ( 2 );\n`;
  if (draftEnabled) {
    bdef += `with draft;\n`;
  }
  bdef += `\n`;

  const rootTable = architecture.rootEntity?.tableName || rootEntity.tableName || `Z${rootEntity.name.toUpperCase()}`;
  const rootDraftTable = architecture.rootEntity?.draftTableName;

  bdef += `define behavior for ${rootInterfaceName} alias ${rootEntity.name}\n`;
  if (!isUnmanaged) {
    bdef += `persistent table ${rootTable.toLowerCase()}\n`;
  }
  if (draftEnabled && rootDraftTable) {
    bdef += `draft table ${rootDraftTable.toLowerCase()}\n`;
    bdef += `lock master total etag LastChangedAt\n`;
  } else {
    bdef += `lock master\n`;
  }
  bdef += `authorization master ( instance )\n`;
  bdef += `etag master LocalLastChangedAt\n`;
  bdef += `{\n`;

  // Standard CRUD operations
  bdef += `  create;\n`;
  bdef += `  update;\n`;
  bdef += `  delete;\n\n`;

  // Read-only / Mandatory fields
  const keyField = (rootEntity.fields || []).find((f) => f.isKey);
  if (keyField) {
    bdef += `  field ( readonly, numbering : managed ) ${keyField.name};\n`;
  }
  bdef += `  field ( readonly ) CreatedBy, CreatedAt, LastChangedBy, LastChangedAt, LocalLastChangedAt;\n\n`;

  // Draft lifecycle actions
  if (draftEnabled) {
    bdef += `  /* Draft Management Actions */\n`;
    bdef += `  draft action Edit;\n`;
    bdef += `  draft action Activate optimized;\n`;
    bdef += `  draft action Discard;\n`;
    bdef += `  draft action Resume;\n`;
    bdef += `  draft determine action Prepare\n`;
    bdef += `  {\n`;

    // Map confirmed validations to prepare phase
    const confirmedValidations = requirements.filter((r) => r.status === 'CONFIRMED' && r.category === 'VALIDATION');
    for (const val of confirmedValidations) {
      const valMethod = toAbapMethodName('validate', val.title);
      bdef += `    validation ${valMethod};\n`;
    }

    bdef += `  }\n\n`;
  }

  // Validations derived from confirmed requirements
  const confirmedValReqs = requirements.filter((r) => r.status === 'CONFIRMED' && r.category === 'VALIDATION');
  for (const v of confirmedValReqs) {
    const valMethod = toAbapMethodName('validate', v.title);
    bdef += `  /* REQ: ${v.requirementId} - ${v.title} */\n`;
    bdef += `  validation ${valMethod} on save { create; update; }\n`;
  }

  // Determinations derived from confirmed requirements
  const confirmedDetReqs = requirements.filter((r) => r.status === 'CONFIRMED' && r.category === 'DETERMINATION');
  for (const d of confirmedDetReqs) {
    const detMethod = toAbapMethodName('calculate', d.title);
    bdef += `  /* REQ: ${d.requirementId} - ${d.title} */\n`;
    bdef += `  determination ${detMethod} on modify { create; update; }\n`;
  }

  // Actions derived from confirmed requirements
  const confirmedActions = requirements.filter((r) => r.status === 'CONFIRMED' && r.category === 'ACTION');
  for (const a of confirmedActions) {
    const actMethod = toAbapMethodName('execute', a.title);
    bdef += `  /* REQ: ${a.requirementId} - ${a.title} */\n`;
    bdef += `  action ${actMethod} result [1] $self;\n`;
  }

  // Compositions to children
  const outgoingComps = relationships.filter((r) => r.sourceEntityId === rootEntity.entityId && r.relationshipType === 'COMPOSITION');
  for (const comp of outgoingComps) {
    const relName = comp.name.startsWith('_') ? comp.name : `_${comp.name}`;
    bdef += `\n  association ${relName} { create;`;
    if (draftEnabled) {
      bdef += ` with draft;`;
    }
    bdef += ` }\n`;
  }

  bdef += `}\n\n`;

  // 2. Child Entity Behavior Definitions
  const childEntities = entities.filter((e) => e.entityId !== rootEntity.entityId);
  for (const child of childEntities) {
    const childNames = architecture.childEntities?.find((c) => c.entityId === child.entityId);
    const childViewName = `ZI_${prefix}_${child.name}`;
    const childTable = childNames?.tableName || child.tableName || `Z${child.name.toUpperCase()}`;
    const childDraftTable = childNames?.draftTableName;

    bdef += `define behavior for ${childViewName} alias ${child.name}\n`;
    if (!isUnmanaged) {
      bdef += `persistent table ${childTable.toLowerCase()}\n`;
    }
    if (draftEnabled && childDraftTable) {
      bdef += `draft table ${childDraftTable.toLowerCase()}\n`;
    }
    bdef += `lock dependent by _${rootEntity.name}\n`;
    bdef += `authorization dependent by _${rootEntity.name}\n`;
    bdef += `etag master LocalLastChangedAt\n`;
    bdef += `{\n`;
    bdef += `  update;\n`;
    bdef += `  delete;\n\n`;

    const childKey = (child.fields || []).find((f) => f.isKey);
    if (childKey) {
      bdef += `  field ( readonly, numbering : managed ) ${childKey.name};\n`;
    }
    bdef += `  field ( readonly ) CreatedBy, CreatedAt, LastChangedBy, LastChangedAt, LocalLastChangedAt;\n`;
    bdef += `  association _${rootEntity.name}`;
    if (draftEnabled) {
      bdef += ` { with draft; }`;
    }
    bdef += `;\n`;
    bdef += `}\n\n`;
  }

  artifacts.push(createAbapArtifact({
    projectId: project.projectId,
    artifactType: ABAP_ARTIFACT_TYPES.RAP_BEHAVIOR_DEFINITION,
    objectName: rootInterfaceName,
    filePath: `src/bdef/${rootInterfaceName.toLowerCase()}.bdef.asbds`,
    content: bdef,
    sourceEntityIds: entities.map((e) => e.entityId),
    sourceRequirementIds: requirements.filter((r) => r.status === 'CONFIRMED').map((r) => r.requirementId),
    dependencies: [rootInterfaceName]
  }));

  // 3. Projection Behavior Definition (ZC_*)
  let projBdef = `projection;\n`;
  if (draftEnabled) {
    projBdef += `strict ( 2 );\n`;
    projBdef += `use draft;\n\n`;
  }
  projBdef += `define behavior for ${rootProjectionName} alias ${rootEntity.name}\n`;
  projBdef += `{\n`;
  projBdef += `  use create;\n`;
  projBdef += `  use update;\n`;
  projBdef += `  use delete;\n\n`;

  if (draftEnabled) {
    projBdef += `  use action Edit;\n`;
    projBdef += `  use action Activate;\n`;
    projBdef += `  use action Discard;\n`;
    projBdef += `  use action Resume;\n`;
    projBdef += `  use action Prepare;\n\n`;
  }

  for (const a of confirmedActions) {
    const actMethod = toAbapMethodName('execute', a.title);
    projBdef += `  use action ${actMethod};\n`;
  }

  for (const comp of outgoingComps) {
    const relName = comp.name.startsWith('_') ? comp.name : `_${comp.name}`;
    projBdef += `  use association ${relName} { create;`;
    if (draftEnabled) projBdef += ` with draft;`;
    projBdef += ` }\n`;
  }
  projBdef += `}\n\n`;

  for (const child of childEntities) {
    const childProjName = `ZC_${prefix}_${child.name}`;
    projBdef += `define behavior for ${childProjName} alias ${child.name}\n`;
    projBdef += `{\n`;
    projBdef += `  use update;\n`;
    projBdef += `  use delete;\n\n`;
    projBdef += `  use association _${rootEntity.name}`;
    if (draftEnabled) projBdef += ` { with draft; }`;
    projBdef += `;\n`;
    projBdef += `}\n\n`;
  }

  artifacts.push(createAbapArtifact({
    projectId: project.projectId,
    artifactType: ABAP_ARTIFACT_TYPES.RAP_BEHAVIOR_DEFINITION,
    objectName: rootProjectionName,
    filePath: `src/bdef/${rootProjectionName.toLowerCase()}.bdef.asbds`,
    content: projBdef,
    sourceEntityIds: entities.map((e) => e.entityId),
    dependencies: [rootProjectionName, rootInterfaceName]
  }));

  return artifacts;
}
