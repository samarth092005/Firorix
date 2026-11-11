/**
 * FioriX — GEN-05: Persistence Table Generator
 *
 * Generates ABAP Dictionary table definitions (define table) for Root, Child,
 * and Draft tables in compliance with SAP S/4HANA 2023 Clean Core standards.
 */

import { createAbapArtifact, ABAP_ARTIFACT_TYPES } from './abapArtifactContract.js';

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

  for (const entity of entities) {
    const isRoot = entity.entityType === 'ROOT' || entity.isRoot;
    const archEntity = isRoot
      ? architecture.rootEntity
      : architecture.childEntities?.find((c) => c.entityId === entity.entityId);

    const tableName = archEntity?.tableName || entity.tableName || `Z${entity.name.toUpperCase().slice(0, 15)}`;
    const fields = entity.fields || [];

    // 1. Generate Persistent Database Table DDL
    let ddl = `@EndUserText.label : '${entity.businessName || entity.name} Active Table'\n`;
    ddl += `@AbapCatalog.enhancement.category : #NOT_EXTENSIBLE\n`;
    ddl += `@AbapCatalog.tableCategory : #TRANSPARENT\n`;
    ddl += `@AbapCatalog.deliveryClass : #A\n`;
    ddl += `@AbapCatalog.dataMaintenance : #RESTRICTED\n`;
    ddl += `define table ${tableName.toLowerCase()} {\n`;
    ddl += `  key client            : abap.clnt not null;\n`;

    for (const field of fields) {
      const fieldName = field.name.toLowerCase();
      const isKey = field.isKey;
      const dictType = mapAbapTypeToDictionary(field.type, field.length, field.precision, field.scale);
      const notNull = isKey || field.isMandatory ? ' not null;' : ';';
      const keyPrefix = isKey ? 'key ' : '    ';
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
      filePath: `src/tables/${tableName.toLowerCase()}.tabl.sql`,
      content: ddl,
      sourceEntityIds: [entity.entityId],
      dependencies: []
    }));

    // 2. Generate Draft Persistence Table DDL if Draft is enabled
    if (draftEnabled && archEntity?.draftTableName) {
      const draftTableName = archEntity.draftTableName;
      let draftDdl = `@EndUserText.label : '${entity.businessName || entity.name} Draft Table'\n`;
      draftDdl += `@AbapCatalog.enhancement.category : #NOT_EXTENSIBLE\n`;
      draftDdl += `@AbapCatalog.tableCategory : #TRANSPARENT\n`;
      draftDdl += `@AbapCatalog.deliveryClass : #A\n`;
      draftDdl += `@AbapCatalog.dataMaintenance : #RESTRICTED\n`;
      draftDdl += `define table ${draftTableName.toLowerCase()} {\n`;
      draftDdl += `  key mandt                 : abap.clnt not null;\n`;
      draftDdl += `  /* Draft Administrative Keys */\n`;
      draftDdl += `  key draftuuid             : sysuuid_x16 not null;\n`;

      for (const field of fields) {
        const fieldName = field.name.toLowerCase();
        const dictType = mapAbapTypeToDictionary(field.type, field.length, field.precision, field.scale);
        draftDdl += `      ${fieldName.padEnd(22)}: ${dictType};\n`;
      }

      draftDdl += `  /* Draft Operational Flags */\n`;
      draftDdl += `  "%admin"                  : include sych_bdl_draft_admin_inc;\n`;
      draftDdl += `}\n`;

      artifacts.push(createAbapArtifact({
        projectId: project.projectId,
        artifactType: ABAP_ARTIFACT_TYPES.DDL_SOURCE,
        objectName: draftTableName.toUpperCase(),
        filePath: `src/tables/${draftTableName.toLowerCase()}.tabl.sql`,
        content: draftDdl,
        sourceEntityIds: [entity.entityId],
        dependencies: [tableName.toUpperCase()]
      }));
    }
  }

  return artifacts;
}
