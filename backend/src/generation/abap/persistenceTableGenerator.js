/**
 * Fiorify — GEN-05: Persistence Table Generator
 *
 * Generates ABAP Dictionary table definitions (define table) for Root, Child,
 * and Draft tables in compliance with SAP S/4HANA 2023 Clean Core standards.
 */

import { createAbapArtifact, ABAP_ARTIFACT_TYPES } from './abapArtifactContract.js';

export function toDdicFieldName(name) {
  const clean = String(name || 'FIELD')
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, '_')
    .replace(/^[^a-z]+/, 'z_');
  return clean.slice(0, 16) || 'z_field';
}

function mapAbapTypeToDictionary(type, length, precision, scale) {
  switch (type) {
    case 'abap.char':
      return `abap.char(${length || 30})`;
    case 'abap.numc':
      return `abap.numc(${length || 10})`;
    case 'abap.int4':
      return 'abap.int4';
    case 'abap.int8':
      return 'abap.int8';
    case 'abap.dec':
      return `abap.dec(${precision || 15},${scale || 2})`;
    case 'abap.curr':
      return `abap.curr(${precision || 15},${scale || 2})`;
    case 'abap.quan':
      return `abap.quan(${precision || 13},${scale || 3})`;
    case 'abap.cuky':
      return 'abap.cuky';
    case 'abap.unit':
      return 'abap.unit(3)';
    case 'abap.dats':
      return 'abap.dats';
    case 'abap.tims':
      return 'abap.tims';
    case 'abap.utclong':
      return 'abap.utclong';
    case 'abap.boolean':
      return 'abap_boolean';
    case 'sysuuid_x16':
      return 'sysuuid_x16';
    default:
      return `abap.char(${length || 40})`;
  }
}

export function generatePersistenceTables(project, architecture) {
  const artifacts = [];
  const entities = project.dataModelSpec?.entities || [];
  const draftEnabled = architecture.draftDecision?.enabled === true;
  const rootEntity = entities.find((e) => e.entityType === 'ROOT' || e.isRoot) || entities[0];
  const rootKeys = (rootEntity?.fields || []).filter((f) => f.isKey);

  for (const entity of entities) {
    const isRoot = entity.entityType === 'ROOT' || entity.isRoot;
    const archEntity = isRoot
      ? architecture.rootEntity
      : architecture.childEntities?.find((c) => c.entityId === entity.entityId);

    const tableName = archEntity?.tableName || entity.tableName || `Z${entity.name.toUpperCase().slice(0, 15)}`;
    const lowerTable = tableName.toLowerCase();
    const rawFields = entity.fields || [];

    // Ensure child tables carry parent key columns for CDS association to parent
    const fields = [...rawFields];
    if (!isRoot && rootKeys.length > 0) {
      const existingCols = new Set(fields.map((f) => toDdicFieldName(f.name)));
      for (const pk of rootKeys) {
        if (!existingCols.has(toDdicFieldName(pk.name))) {
          fields.unshift({ ...pk, isKey: true, isMandatory: true });
        }
      }
    }

    // 1. Generate Persistent Database Table DDL
    let ddl = `@EndUserText.label : '${entity.businessName || entity.name} Active Table'\n`;
    ddl += `@AbapCatalog.enhancement.category : #NOT_EXTENSIBLE\n`;
    ddl += `@AbapCatalog.tableCategory : #TRANSPARENT\n`;
    ddl += `@AbapCatalog.deliveryClass : #A\n`;
    ddl += `@AbapCatalog.dataMaintenance : #RESTRICTED\n`;
    ddl += `define table ${lowerTable} {\n`;
    ddl += `  key client            : abap.clnt not null;\n`;

    for (const field of fields) {
      const fieldName = toDdicFieldName(field.name);
      const isKey = field.isKey;
      const dictType = mapAbapTypeToDictionary(field.type, field.length, field.precision, field.scale);
      const notNull = isKey || field.isMandatory ? ' not null;' : ';';
      const keyPrefix = isKey ? 'key ' : '    ';
      if (field.type === 'abap.curr' || field.semanticRole === 'AMOUNT') {
        const cukyRef = toDdicFieldName(field.cukyField || field.currencyRef || 'currency_code');
        ddl += `  @Semantics.amount.currencyCode : '${lowerTable}.${cukyRef}'\n`;
      } else if (field.type === 'abap.quan' || field.semanticRole === 'QUANTITY') {
        const unitRef = toDdicFieldName(field.unitField || field.unitRef || 'unit_code');
        ddl += `  @Semantics.quantity.unitOfMeasure : '${lowerTable}.${unitRef}'\n`;
      }
      ddl += `  ${keyPrefix}${fieldName.padEnd(18)}: ${dictType}${notNull}\n`;
    }

    // Administrative audit fields for ETag and change tracking
    ddl += `  /* Administrative & ETag Tracking Fields */\n`;
    ddl += `  created_by            : abp_creation_user;\n`;
    ddl += `  created_at            : abp_creation_utclong;\n`;
    ddl += `  last_changed_by       : abp_lastchange_user;\n`;
    ddl += `  last_changed_at       : abp_lastchange_utclong;\n`;
    ddl += `  local_last_changed_at : abp_locinst_lastchange_utclong;\n`;
    ddl += `}\n`;

    artifacts.push(createAbapArtifact({
      projectId: project.projectId,
      artifactType: ABAP_ARTIFACT_TYPES.DDL_SOURCE,
      objectName: tableName.toUpperCase(),
      filePath: `src/tables/${lowerTable}.tabl.sql`,
      content: ddl,
      sourceEntityIds: [entity.entityId],
      dependencies: []
    }));

    // 2. Generate Draft Persistence Table DDL if Draft is enabled
    if (draftEnabled && archEntity?.draftTableName) {
      const draftTableName = archEntity.draftTableName;
      const lowerDraft = draftTableName.toLowerCase();
      let draftDdl = `@EndUserText.label : '${entity.businessName || entity.name} Draft Table'\n`;
      draftDdl += `@AbapCatalog.enhancement.category : #NOT_EXTENSIBLE\n`;
      draftDdl += `@AbapCatalog.tableCategory : #TRANSPARENT\n`;
      draftDdl += `@AbapCatalog.deliveryClass : #A\n`;
      draftDdl += `@AbapCatalog.dataMaintenance : #RESTRICTED\n`;
      draftDdl += `define table ${lowerDraft} {\n`;
      draftDdl += `  key client                : abap.clnt not null;\n`;

      for (const field of fields) {
        const fieldName = toDdicFieldName(field.name);
        const dictType = mapAbapTypeToDictionary(field.type, field.length, field.precision, field.scale);
        const keyPrefix = field.isKey ? 'key ' : '    ';
        const notNull = field.isKey ? ' not null;' : ';';
        if (field.type === 'abap.curr' || field.semanticRole === 'AMOUNT') {
          const cukyRef = toDdicFieldName(field.cukyField || field.currencyRef || 'currency_code');
          draftDdl += `  @Semantics.amount.currencyCode : '${lowerDraft}.${cukyRef}'\n`;
        } else if (field.type === 'abap.quan' || field.semanticRole === 'QUANTITY') {
          const unitRef = toDdicFieldName(field.unitField || field.unitRef || 'unit_code');
          draftDdl += `  @Semantics.quantity.unitOfMeasure : '${lowerDraft}.${unitRef}'\n`;
        }
        draftDdl += `  ${keyPrefix}${fieldName.padEnd(22)}: ${dictType}${notNull}\n`;
      }

      draftDdl += `  /* Draft Administrative Key & Operational Flags */\n`;
      draftDdl += `  draftuuid                 : sysuuid_x16;\n`;
      draftDdl += `  "%admin"                  : include sych_bdl_draft_admin_inc;\n`;
      draftDdl += `}\n`;

      artifacts.push(createAbapArtifact({
        projectId: project.projectId,
        artifactType: ABAP_ARTIFACT_TYPES.DDL_SOURCE,
        objectName: draftTableName.toUpperCase(),
        filePath: `src/tables/${lowerDraft}.tabl.sql`,
        content: draftDdl,
        sourceEntityIds: [entity.entityId],
        dependencies: [tableName.toUpperCase()]
      }));
    }
  }

  return artifacts;
}
