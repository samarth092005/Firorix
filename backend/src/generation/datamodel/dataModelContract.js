/**
 * Fiorify — Data Model Designer Contracts & Types (GEN-04)
 *
 * Implements canonical schemas, ABAP CDS types, semantic roles,
 * and relationship structures for SAP S/4HANA 2023 On-Premise.
 */

import crypto from 'node:crypto';

export const ENTITY_TYPES = Object.freeze({
  ROOT: 'ROOT',
  CHILD: 'CHILD',
  REFERENCE: 'REFERENCE',
  VALUE_HELP: 'VALUE_HELP',
  TEXT_PROVIDER: 'TEXT_PROVIDER',
  READ_ONLY_REUSE: 'READ_ONLY_REUSE'
});

export const PERSISTENCE_STRATEGIES = Object.freeze({
  MANAGED_TABLE: 'MANAGED_TABLE',
  EXISTING_TABLE: 'EXISTING_TABLE',
  UNMANAGED: 'UNMANAGED',
  CDS_VIEW_DIRECT: 'CDS_VIEW_DIRECT'
});

export const RELATIONSHIP_TYPES = Object.freeze({
  ASSOCIATION: 'ASSOCIATION',
  COMPOSITION: 'COMPOSITION'
});

export const CARDINALITIES = Object.freeze({
  ZERO_OR_ONE: '[0..1]',
  EXACTLY_ONE: '[1..1]',
  ZERO_TO_MANY: '[0..*]',
  ONE_TO_MANY: '[1..*]'
});

export const ABAP_DATA_TYPES = Object.freeze({
  'abap.char': { category: 'CHARACTER', defaultLength: 40, maxLength: 1333, hasScale: false },
  'abap.numc': { category: 'NUMERIC_TEXT', defaultLength: 10, maxLength: 250, hasScale: false },
  'abap.int4': { category: 'INTEGER', defaultLength: 10, hasScale: false },
  'abap.int8': { category: 'BIGINT', defaultLength: 19, hasScale: false },
  'abap.dec': { category: 'DECIMAL', defaultLength: 15, defaultDecimals: 2, maxLength: 31, hasScale: true },
  'abap.curr': { category: 'CURRENCY', defaultLength: 15, defaultDecimals: 2, maxLength: 23, hasScale: true, requiresRef: 'cukyField' },
  'abap.quan': { category: 'QUANTITY', defaultLength: 13, defaultDecimals: 3, maxLength: 23, hasScale: true, requiresRef: 'unitField' },
  'abap.dats': { category: 'DATE', defaultLength: 8, hasScale: false },
  'abap.tims': { category: 'TIME', defaultLength: 6, hasScale: false },
  'abap.utclong': { category: 'TIMESTAMP', defaultLength: 27, hasScale: false },
  'abap.boolean': { category: 'BOOLEAN', defaultLength: 1, hasScale: false },
  'abap.cuky': { category: 'CURRENCY_CODE', defaultLength: 5, maxLength: 5, hasScale: false },
  'abap.unit': { category: 'UNIT_CODE', defaultLength: 3, maxLength: 3, hasScale: false },
  'sysuuid_x16': { category: 'UUID', defaultLength: 16, hasScale: false }
});

export const SEMANTIC_ROLES = Object.freeze({
  KEY: 'KEY',
  PARENT_KEY: 'PARENT_KEY',
  TEXT: 'TEXT',
  AMOUNT: 'AMOUNT',
  QUANTITY: 'QUANTITY',
  ADMIN_CREATED_BY: 'ADMIN_CREATED_BY',
  ADMIN_CREATED_AT: 'ADMIN_CREATED_AT',
  ADMIN_CHANGED_BY: 'ADMIN_CHANGED_BY',
  ADMIN_CHANGED_AT: 'ADMIN_CHANGED_AT',
  STATUS: 'STATUS',
  DESCRIPTION: 'DESCRIPTION',
  GENERAL: 'GENERAL'
});

export const DATA_SOURCE_PROVENANCE = Object.freeze({
  LIVE_SAP_S21: 'LIVE_SAP_S21',
  OFFICIAL_SAP_DOCUMENTATION: 'OFFICIAL_SAP_DOCUMENTATION',
  VERIFIED_LOCAL_METADATA: 'VERIFIED_LOCAL_METADATA',
  USER_PROVIDED: 'USER_PROVIDED',
  CURATED_REFERENCE: 'CURATED_REFERENCE',
  UNVERIFIED: 'UNVERIFIED'
});

/**
 * Creates a normalized Entity definition.
 */
export function createEntityRecord(input = {}) {
  const name = String(input.name || '').trim();
  if (!name) {
    const err = new Error('Entity name is required.');
    err.code = 'VALIDATION_ERROR';
    throw err;
  }

  // ABAP CDS Entity Name syntax: 1-30 alphanumeric characters, starts with letter or Z/Y
  if (!/^[A-Za-z][A-Za-z0-9_]{1,29}$/.test(name)) {
    const err = new Error(`Entity name "${name}" is invalid. Must be 2-30 characters, start with letter, containing only alphanumeric characters and underscores.`);
    err.code = 'VALIDATION_ERROR';
    throw err;
  }

  const randSuffix = crypto.randomBytes(3).toString('hex').toUpperCase();
  const entityId = input.entityId || `ENT-${Date.now()}-${randSuffix}`;

  const entityType = ENTITY_TYPES[input.entityType] || ENTITY_TYPES.CHILD;
  const persistenceStrategy = PERSISTENCE_STRATEGIES[input.persistenceStrategy] || PERSISTENCE_STRATEGIES.MANAGED_TABLE;
  const sourceProvenance = DATA_SOURCE_PROVENANCE[input.sourceProvenance] || DATA_SOURCE_PROVENANCE.USER_PROVIDED;

  const now = new Date().toISOString();

  const rawFields = Array.isArray(input.fields) ? input.fields : [];
  const fields = rawFields.map((f) => createFieldRecord(f));

  return {
    id: entityId,
    entityId,
    name,
    businessName: input.businessName ? String(input.businessName).trim() : name,
    entityType,
    businessPurpose: input.businessPurpose ? String(input.businessPurpose).trim() : 'Business transaction persistence.',
    dataSource: input.dataSource ? String(input.dataSource).trim() : (entityType === ENTITY_TYPES.ROOT ? `Z${name.toUpperCase()}` : ''),
    persistenceStrategy,
    parentEntityId: input.parentEntityId || null,
    isDraftEnabled: input.isDraftEnabled !== undefined ? Boolean(input.isDraftEnabled) : true,
    sourceProvenance,
    fields,
    createdAt: input.createdAt || now,
    updatedAt: now
  };
}

/**
 * Creates a normalized Field definition.
 */
export function createFieldRecord(input = {}) {
  const name = String(input.name || '').trim();
  if (!name) {
    const err = new Error('Field name is required.');
    err.code = 'VALIDATION_ERROR';
    throw err;
  }

  // ABAP Field Name syntax: 1-30 characters, alphanumeric
  if (!/^[A-Za-z][A-Za-z0-9_]{0,29}$/.test(name)) {
    const err = new Error(`Field name "${name}" is invalid. Must be 1-30 characters, starting with a letter.`);
    err.code = 'VALIDATION_ERROR';
    throw err;
  }

  const randSuffix = crypto.randomBytes(3).toString('hex').toUpperCase();
  const fieldId = input.fieldId || `FLD-${Date.now()}-${randSuffix}`;

  const type = ABAP_DATA_TYPES[input.type] ? input.type : 'abap.char';
  const typeDef = ABAP_DATA_TYPES[type];

  const length = Number.isInteger(input.length) && input.length > 0
    ? Math.min(input.length, typeDef.maxLength || 1333)
    : typeDef.defaultLength;

  const precision = Number.isInteger(input.precision) ? input.precision : (typeDef.defaultLength || null);
  const scale = Number.isInteger(input.scale) ? input.scale : (typeDef.defaultDecimals || null);

  const semanticRole = SEMANTIC_ROLES[input.semanticRole] || SEMANTIC_ROLES.GENERAL;

  return {
    id: fieldId,
    fieldId,
    name,
    label: input.label ? String(input.label).trim() : name,
    description: input.description ? String(input.description).trim() : '',
    type,
    length,
    precision,
    scale,
    isKey: Boolean(input.isKey),
    isMandatory: Boolean(input.isMandatory || input.isKey),
    isReadOnly: Boolean(input.isReadOnly),
    semanticRole,
    cukyField: input.cukyField ? String(input.cukyField).trim() : (input.currencyRef ? String(input.currencyRef).trim() : null),
    unitField: input.unitField ? String(input.unitField).trim() : (input.unitRef ? String(input.unitRef).trim() : null),
    valueHelpEntityId: input.valueHelpEntityId || null,
    textAssociationEntityId: input.textAssociationEntityId || null,
    sourceFieldReference: input.sourceFieldReference || null,
    defaultValue: input.defaultValue !== undefined ? String(input.defaultValue) : null,
    sensitiveDataClassification: input.sensitiveDataClassification || 'NONE'
  };
}

/**
 * Creates a normalized Relationship definition.
 */
export function createRelationshipRecord(input = {}) {
  const name = String(input.name || '').trim();
  if (!name) {
    const err = new Error('Relationship navigation name is required.');
    err.code = 'VALIDATION_ERROR';
    throw err;
  }

  if (!input.sourceEntityId || !input.targetEntityId) {
    const err = new Error('Source and target entity IDs are required for a relationship.');
    err.code = 'VALIDATION_ERROR';
    throw err;
  }

  const randSuffix = crypto.randomBytes(3).toString('hex').toUpperCase();
  const relationshipId = input.relationshipId || `REL-${Date.now()}-${randSuffix}`;

  const relationshipType = RELATIONSHIP_TYPES[input.relationshipType] || RELATIONSHIP_TYPES.ASSOCIATION;
  let cardinality = CARDINALITIES[input.cardinality];
  if (!cardinality) {
    const rawCard = String(input.cardinality || '').trim();
    if (rawCard === '1..*' || rawCard === '[1..*]' || rawCard === 'ONE_TO_MANY') cardinality = CARDINALITIES.ONE_TO_MANY;
    else if (rawCard === '0..*' || rawCard === '[0..*]' || rawCard === 'ZERO_TO_MANY') cardinality = CARDINALITIES.ZERO_TO_MANY;
    else if (rawCard === '1..1' || rawCard === '[1..1]' || rawCard === 'EXACTLY_ONE') cardinality = CARDINALITIES.EXACTLY_ONE;
    else if (rawCard === '0..1' || rawCard === '[0..1]' || rawCard === 'ZERO_OR_ONE') cardinality = CARDINALITIES.ZERO_OR_ONE;
    else cardinality = (relationshipType === RELATIONSHIP_TYPES.COMPOSITION ? CARDINALITIES.ZERO_TO_MANY : CARDINALITIES.ZERO_OR_ONE);
  }

  const rawMapping = Array.isArray(input.mapping) ? input.mapping : [];
  const mapping = rawMapping.map((m) => ({
    sourceField: String(m.sourceField).trim(),
    targetField: String(m.targetField).trim()
  })).filter((m) => m.sourceField && m.targetField);

  return {
    id: relationshipId,
    relationshipId,
    name, // e.g. "_Item", "_Customer", "_Currency"
    relationshipType,
    sourceEntityId: input.sourceEntityId,
    targetEntityId: input.targetEntityId,
    cardinality,
    mapping,
    onDelete: input.onDelete || (relationshipType === RELATIONSHIP_TYPES.COMPOSITION ? 'CASCADE' : 'RESTRICT'),
    rationale: input.rationale ? String(input.rationale).trim() : 'Business navigation relationship.'
  };
}
