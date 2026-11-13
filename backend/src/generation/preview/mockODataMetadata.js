/**
 * Fiorify — GEN-07: Dynamic OData V4 Metadata & Service Document Generator
 *
 * Synthesizes EDMX V4 XML and Service Document JSON purely from the project's
 * authoritative dataModelSpec, entity definitions, and architecture specification.
 */

function mapToEdmType(type) {
  switch (type) {
    case 'abap.char':
      return 'Edm.String';
    case 'abap.numc':
      return 'Edm.String';
    case 'abap.int4':
      return 'Edm.Int32';
    case 'abap.int8':
      return 'Edm.Int64';
    case 'abap.dec':
    case 'abap.curr':
    case 'abap.quan':
      return 'Edm.Decimal';
    case 'abap.cuky':
    case 'abap.unit':
      return 'Edm.String';
    case 'abap.dats':
      return 'Edm.Date';
    case 'abap.tims':
      return 'Edm.TimeOfDay';
    case 'abap.utclong':
      return 'Edm.DateTimeOffset';
    case 'abap.boolean':
      return 'Edm.Boolean';
    case 'sysuuid_x16':
      return 'Edm.Guid';
    default:
      return 'Edm.String';
  }
}

/**
 * Builds the OData V4 Service Document JSON.
 *
 * @param {Object} project - The GenerationProject record
 * @param {Object} architecture - Evaluated architecture spec
 * @returns {Object} Service Document
 */
export function buildServiceDocument(project, architecture) {
  const entities = project.dataModelSpec?.entities || [];
  const rootEntity = entities.find((e) => e.entityType === 'ROOT' || e.isRoot) || entities[0];
  const prefix = (rootEntity?.name || 'CUSTOM').replace(/[^a-zA-Z0-9_]/g, '');
  const serviceName = `ZUI_${prefix}`.toUpperCase();

  const value = entities.map((ent) => ({
    name: ent.name,
    kind: 'EntitySet',
    url: ent.name
  }));

  return {
    '@odata.context': '$metadata',
    value
  };
}

/**
 * Synthesizes OData V4 EDMX XML ($metadata) dynamically matching the project model.
 *
 * @param {Object} project - The GenerationProject record
 * @param {Object} architecture - Evaluated architecture spec
 * @returns {string} EDMX XML String
 */
export function buildODataMetadataXml(project, architecture) {
  const entities = project.dataModelSpec?.entities || [];
  const relationships = project.dataModelSpec?.relationships || [];
  const rootEntity = entities.find((e) => e.entityType === 'ROOT' || e.isRoot) || entities[0];
  const prefix = (rootEntity?.name || 'CUSTOM').replace(/[^a-zA-Z0-9_]/g, '');
  const serviceName = `ZUI_${prefix}`.toUpperCase();
  const namespace = `${serviceName}`;

  let xml = `<?xml version="1.0" encoding="utf-8"?>\n`;
  xml += `<edmx:Edmx Version="4.0" xmlns:edmx="http://docs.oasis-open.org/odata/ns/edmx">\n`;
  xml += `  <edmx:DataServices>\n`;
  xml += `    <Schema Namespace="${namespace}" xmlns="http://docs.oasis-open.org/odata/ns/edm">\n`;

  // 1. EntityTypes
  for (const ent of entities) {
    const isRoot = ent.entityId === rootEntity?.entityId;
    xml += `      <EntityType Name="${ent.name}">\n`;
    
    // Key properties
    const keyFields = (ent.fields || []).filter((f) => f.isKey);
    if (keyFields.length > 0) {
      xml += `        <Key>\n`;
      for (const k of keyFields) {
        xml += `          <PropertyRef Name="${k.name}"/>\n`;
      }
      xml += `        </Key>\n`;
    }

    // Properties
    for (const f of ent.fields || []) {
      const edmType = mapToEdmType(f.type);
      const nullable = f.isMandatory || f.isKey ? 'Nullable="false"' : 'Nullable="true"';
      let extra = '';
      if (edmType === 'Edm.Decimal' && f.precision) {
        extra = ` Precision="${f.precision}" Scale="${f.scale || 2}"`;
      } else if (edmType === 'Edm.String' && f.length) {
        extra = ` MaxLength="${f.length}"`;
      }
      xml += `        <Property Name="${f.name}" Type="${edmType}" ${nullable}${extra}/>\n`;
    }

    // Administrative ETag / Audit properties
    xml += `        <Property Name="CreatedBy" Type="Edm.String" MaxLength="12" Nullable="true"/>\n`;
    xml += `        <Property Name="CreatedAt" Type="Edm.DateTimeOffset" Nullable="true"/>\n`;
    xml += `        <Property Name="LastChangedBy" Type="Edm.String" MaxLength="12" Nullable="true"/>\n`;
    xml += `        <Property Name="LastChangedAt" Type="Edm.DateTimeOffset" Nullable="true"/>\n`;
    xml += `        <Property Name="LocalLastChangedAt" Type="Edm.DateTimeOffset" Nullable="true"/>\n`;

    // Navigation properties for relationships
    const outgoingRels = relationships.filter((r) => r.sourceEntityId === ent.entityId);
    for (const rel of outgoingRels) {
      const targetEnt = entities.find((e) => e.entityId === rel.targetEntityId);
      if (targetEnt) {
        const relName = rel.name.startsWith('_') ? rel.name : `_${rel.name}`;
        const targetType = rel.relationshipType === 'COMPOSITION'
          ? `Collection(${namespace}.${targetEnt.name})`
          : `${namespace}.${targetEnt.name}`;
        xml += `        <NavigationProperty Name="${relName}" Type="${targetType}"/>\n`;
      }
    }

    // If child entity, navigation to parent
    const incomingRels = relationships.filter((r) => r.targetEntityId === ent.entityId && r.relationshipType === 'COMPOSITION');
    if (incomingRels.length > 0 && rootEntity && !isRoot) {
      xml += `        <NavigationProperty Name="_${rootEntity.name}" Type="${namespace}.${rootEntity.name}"/>\n`;
    }

    xml += `      </EntityType>\n`;
  }

  // 2. EntityContainer
  xml += `      <EntityContainer Name="EntityContainer">\n`;
  for (const ent of entities) {
    xml += `        <EntitySet Name="${ent.name}" EntityType="${namespace}.${ent.name}">\n`;
    const outgoingRels = relationships.filter((r) => r.sourceEntityId === ent.entityId);
    for (const rel of outgoingRels) {
      const targetEnt = entities.find((e) => e.entityId === rel.targetEntityId);
      if (targetEnt) {
        const relName = rel.name.startsWith('_') ? rel.name : `_${rel.name}`;
        xml += `          <NavigationPropertyBinding Path="${relName}" Target="${targetEnt.name}"/>\n`;
      }
    }
    xml += `        </EntitySet>\n`;
  }
  xml += `      </EntityContainer>\n`;

  xml += `    </Schema>\n`;
  xml += `  </edmx:DataServices>\n`;
  xml += `</edmx:Edmx>\n`;

  return xml;
}
