/**
 * FioriX — GEN-05: CDS View Entity Generator
 *
 * Synthesizes Clean Core ABAP CDS View Entities (define view entity)
 * separating Interface views (ZI_*), Consumption projection views (ZC_*),
 * and Metadata Extensions (.mde) for S/4HANA 2023.
 */

import { createAbapArtifact, ABAP_ARTIFACT_TYPES } from './abapArtifactContract.js';
import { RAP_PROFILES } from '../architecture/architectureContract.js';

export function generateCdsEntities(project, architecture) {
  const artifacts = [];
  const entities = project.dataModelSpec?.entities || [];
  const relationships = project.dataModelSpec?.relationships || [];
  const rootEntity = entities.find((e) => e.entityType === 'ROOT' || e.isRoot) || entities[0];
  if (!rootEntity) return artifacts;

  const prefix = (rootEntity.name || 'CUSTOM').replace(/[^a-zA-Z0-9_]/g, '');
  const rootInterfaceName = `ZI_${prefix}`;
  const rootProjectionName = `ZC_${prefix}`;

  // Helper map for entity interface and projection names
  const entityNames = new Map();
  for (const ent of entities) {
    const isRoot = ent.entityId === rootEntity.entityId;
    const suffix = isRoot ? '' : `_${ent.name}`;
    entityNames.set(ent.entityId, {
      interfaceName: isRoot ? rootInterfaceName : `ZI_${prefix}${suffix}`,
      projectionName: isRoot ? rootProjectionName : `ZC_${prefix}${suffix}`,
      tableName: (isRoot ? architecture.rootEntity?.tableName : architecture.childEntities?.find((c) => c.entityId === ent.entityId)?.tableName) || ent.tableName || `Z${ent.name.toUpperCase()}`
    });
  }

  // -----------------------------------------------------------
  // 1. Generate Interface View Entities (ZI_*)
  // -----------------------------------------------------------
  for (const ent of entities) {
    const isRoot = ent.entityId === rootEntity.entityId;
    const names = entityNames.get(ent.entityId);
    const viewName = names.interfaceName;
    const tableName = names.tableName.toLowerCase();

    // Outgoing compositions & associations
    const outgoingRels = relationships.filter((r) => r.sourceEntityId === ent.entityId);
    const incomingCompositions = relationships.filter((r) => r.targetEntityId === ent.entityId && r.relationshipType === 'COMPOSITION');
    const parentRel = incomingCompositions[0] || null;

    let cds = `@AccessControl.authorizationCheck: #CHECK\n`;
    cds += `@EndUserText.label: '${ent.businessName || ent.name} Interface View'\n`;
    cds += `@Metadata.ignorePropagatedAnnotations: true\n`;
    cds += `@ObjectModel.usageType: {\n`;
    cds += `  serviceQuality: #X,\n`;
    cds += `  sizeCategory: #S,\n`;
    cds += `  dataClass: #TRANSACTIONAL\n`;
    cds += `}\n`;

    if (isRoot) {
      cds += `define root view entity ${viewName}\n`;
    } else {
      cds += `define view entity ${viewName}\n`;
    }

    cds += `  as select from ${tableName}\n`;

    // Add associations and compositions headers
    for (const rel of outgoingRels) {
      const targetNames = entityNames.get(rel.targetEntityId);
      const targetCds = targetNames ? targetNames.interfaceName : (rel.targetEntity || 'I_Currency');
      const relName = rel.name.startsWith('_') ? rel.name : `_${rel.name}`;

      if (rel.relationshipType === 'COMPOSITION') {
        cds += `  composition [0..*] of ${targetCds} as ${relName}\n`;
      } else {
        const card = rel.cardinality || '[0..1]';
        const sourceF = rel.mapping?.[0]?.sourceField || 'CurrencyCode';
        const targetF = rel.mapping?.[0]?.targetField || 'Currency';
        cds += `  association ${card} to ${targetCds} as ${relName}\n`;
        cds += `    on $projection.${sourceF} = ${relName}.${targetF}\n`;
      }
    }

    // If child, add association to parent
    if (!isRoot && parentRel) {
      const parentNames = entityNames.get(parentRel.sourceEntityId);
      const parentCds = parentNames?.interfaceName || rootInterfaceName;
      const parentField = parentRel.mapping?.[0]?.sourceField || `${rootEntity.name}ID`;
      const childField = parentRel.mapping?.[0]?.targetField || `${rootEntity.name}ID`;
      cds += `  association to parent ${parentCds} as _${rootEntity.name}\n`;
      cds += `    on $projection.${childField} = _${rootEntity.name}.${parentField}\n`;
    }

    cds += `{\n`;

    // Fields
    for (const f of ent.fields || []) {
      const isKey = f.isKey;
      const keyPrefix = isKey ? 'key ' : '    ';
      const alias = f.name;
      const colName = f.name.toLowerCase();

      // Check semantic currency / unit annotations
      if (f.semanticRole === 'AMOUNT' && (f.cukyField || f.currencyRef)) {
        const ref = f.cukyField || f.currencyRef;
        cds += `  @Semantics.amount.currencyCode: '${ref}'\n`;
      } else if (f.semanticRole === 'QUANTITY' && (f.unitField || f.unitRef)) {
        const ref = f.unitField || f.unitRef;
        cds += `  @Semantics.quantity.unitOfMeasure: '${ref}'\n`;
      }

      cds += `  ${keyPrefix}${colName.padEnd(20)} as ${alias},\n`;
    }

    // Administrative audit fields
    cds += `  /* Audit fields */\n`;
    cds += `  @Semantics.user.createdBy: true\n`;
    cds += `  created_by           as CreatedBy,\n`;
    cds += `  @Semantics.systemDateTime.createdAt: true\n`;
    cds += `  created_at           as CreatedAt,\n`;
    cds += `  @Semantics.user.lastChangedBy: true\n`;
    cds += `  last_changed_by      as LastChangedBy,\n`;
    cds += `  @Semantics.systemDateTime.lastChangedAt: true\n`;
    cds += `  last_changed_at      as LastChangedAt,\n`;
    cds += `  @Semantics.systemDateTime.localInstanceLastChangedAt: true\n`;
    cds += `  local_last_changed_at as LocalLastChangedAt,\n\n`;

    // Association exposures
    cds += `  /* Associations & Compositions */\n`;
    for (const rel of outgoingRels) {
      const relName = rel.name.startsWith('_') ? rel.name : `_${rel.name}`;
      cds += `  ${relName},\n`;
    }
    if (!isRoot && parentRel) {
      cds += `  _${rootEntity.name}\n`;
    } else {
      // Remove trailing comma if no parent association
      cds = cds.replace(/,\n$/, '\n');
    }

    cds += `}\n`;

    artifacts.push(createAbapArtifact({
      projectId: project.projectId,
      artifactType: isRoot ? ABAP_ARTIFACT_TYPES.CDS_INTERFACE_VIEW : ABAP_ARTIFACT_TYPES.CDS_CHILD_VIEW,
      objectName: viewName,
      filePath: `src/cds/${viewName.toLowerCase()}.ddls.asddls`,
      content: cds,
      sourceEntityIds: [ent.entityId],
      dependencies: [tableName.toUpperCase()]
    }));
  }

  // -----------------------------------------------------------
  // 2. Generate Consumption / Projection Views (ZC_*)
  // -----------------------------------------------------------
  for (const ent of entities) {
    const isRoot = ent.entityId === rootEntity.entityId;
    const names = entityNames.get(ent.entityId);
    const projName = names.projectionName;
    const ifaceName = names.interfaceName;

    const outgoingRels = relationships.filter((r) => r.sourceEntityId === ent.entityId);
    const incomingCompositions = relationships.filter((r) => r.targetEntityId === ent.entityId && r.relationshipType === 'COMPOSITION');
    const parentRel = incomingCompositions[0] || null;

    let projCds = `@AccessControl.authorizationCheck: #CHECK\n`;
    projCds += `@EndUserText.label: '${ent.businessName || ent.name} Projection View'\n`;
    projCds += `@Metadata.allowExtensions: true\n`;
    projCds += `@Search.searchable: true\n`;

    if (isRoot) {
      projCds += `define root view entity ${projName}\n`;
      if (architecture.selectedProfile !== RAP_PROFILES.READ_ONLY_QUERY) {
        projCds += `  provider contract transactional_query\n`;
      }
    } else {
      projCds += `define view entity ${projName}\n`;
    }

    projCds += `  as projection on ${ifaceName}\n`;
    projCds += `{\n`;

    // Projected fields
    for (const f of ent.fields || []) {
      const isKey = f.isKey;
      const keyPrefix = isKey ? 'key ' : '    ';
      const alias = f.name;

      if (f.semanticRole === 'DOCUMENT_NUMBER' || f.isKey) {
        projCds += `  @Search.defaultSearchElement: true\n`;
        projCds += `  @Search.fuzzinessThreshold: 0.8\n`;
      }
      if (f.semanticRole === 'AMOUNT' && (f.cukyField || f.currencyRef)) {
        const ref = f.cukyField || f.currencyRef;
        projCds += `  @Semantics.amount.currencyCode: '${ref}'\n`;
      }

      projCds += `  ${keyPrefix}${alias},\n`;
    }

    projCds += `  LocalLastChangedAt,\n\n`;

    // Compositions redirected to child projections
    for (const rel of outgoingRels) {
      const relName = rel.name.startsWith('_') ? rel.name : `_${rel.name}`;
      const targetNames = entityNames.get(rel.targetEntityId);

      if (rel.relationshipType === 'COMPOSITION' && targetNames) {
        projCds += `  /* Redirected Composition */\n`;
        projCds += `  ${relName} : redirected to composition child ${targetNames.projectionName},\n`;
      } else {
        projCds += `  ${relName},\n`;
      }
    }

    if (!isRoot && parentRel) {
      projCds += `  /* Redirected Parent */\n`;
      projCds += `  _${rootEntity.name} : redirected to parent ${rootProjectionName}\n`;
    } else {
      projCds = projCds.replace(/,\n$/, '\n');
    }

    projCds += `}\n`;

    artifacts.push(createAbapArtifact({
      projectId: project.projectId,
      artifactType: ABAP_ARTIFACT_TYPES.CDS_PROJECTION_VIEW,
      objectName: projName,
      filePath: `src/cds/${projName.toLowerCase()}.ddls.asddls`,
      content: projCds,
      sourceEntityIds: [ent.entityId],
      dependencies: [ifaceName]
    }));

    // -----------------------------------------------------------
    // 3. Generate Metadata Extension (ZC_*.mde)
    // -----------------------------------------------------------
    let mde = `@Metadata.layer: #CORE\n`;
    mde += `@UI: {\n`;
    mde += `  headerInfo: {\n`;
    mde += `    typeName: '${ent.businessName || ent.name}',\n`;
    mde += `    typeNamePlural: '${ent.businessName || ent.name}s',\n`;
    const titleField = (ent.fields || []).find((f) => f.semanticRole === 'DOCUMENT_NUMBER' || f.isKey)?.name || ent.fields?.[0]?.name || 'ID';
    mde += `    title: { type: #STANDARD, value: '${titleField}' }\n`;
    mde += `  }\n`;
    mde += `}\n`;
    mde += `annotate view ${projName} with {\n`;

    // Facet annotations for Object Page
    if (isRoot) {
      mde += `  @UI.facet: [\n`;
      mde += `    { id: 'GeneralData', purpose: #STANDARD, type: #IDENTIFICATION_REFERENCE, label: 'General Information', position: 10 }\n`;
      const childRels = outgoingRels.filter((r) => r.relationshipType === 'COMPOSITION');
      let facetPos = 20;
      for (const cr of childRels) {
        const targetEnt = entities.find((e) => e.entityId === cr.targetEntityId);
        const relName = cr.name.startsWith('_') ? cr.name : `_${cr.name}`;
        mde += `   ,{ id: 'ItemsData', purpose: #STANDARD, type: #LINEITEM_REFERENCE, label: '${targetEnt?.businessName || 'Items'}', position: ${facetPos}, targetElement: '${relName}' }\n`;
        facetPos += 10;
      }
      mde += `  ]\n\n`;
    }

    let lineItemPos = 10;
    let identPos = 10;
    for (const f of ent.fields || []) {
      mde += `  @UI: {\n`;
      mde += `    lineItem: [ { position: ${lineItemPos}, label: '${f.label || f.name}' } ],\n`;
      mde += `    identification: [ { position: ${identPos}, label: '${f.label || f.name}' } ]\n`;
      if (f.semanticRole === 'DOCUMENT_NUMBER' || f.isKey || lineItemPos <= 20) {
        mde += `   ,selectionField: [ { position: ${lineItemPos} } ]\n`;
      }
      mde += `  }\n`;
      mde += `  ${f.name};\n\n`;
      lineItemPos += 10;
      identPos += 10;
    }

    mde += `}\n`;

    artifacts.push(createAbapArtifact({
      projectId: project.projectId,
      artifactType: ABAP_ARTIFACT_TYPES.CDS_METADATA_EXTENSION,
      objectName: `${projName}_MDE`,
      filePath: `src/mde/${projName.toLowerCase()}.bdef.asddlxs`,
      content: mde,
      sourceEntityIds: [ent.entityId],
      dependencies: [projName]
    }));
  }

  return artifacts;
}
