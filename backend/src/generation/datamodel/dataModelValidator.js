/**
 * Fiorify — Data Model Validation Engine (GEN-04)
 *
 * Implements deterministic validation for SAP S/4HANA 2023 RAP CDS data models:
 * - Structural integrity (Root entity, unique names, key presence, ABAP types)
 * - Relationship & Hierarchy (Parent-child compositions, cyclic dependency prevention, cardinalities)
 * - SAP S/4HANA 2023 Compatibility (Release contracts, CDS reuse verification)
 * - Business Integrity (Currency/Unit references, requirement mappings)
 */

import { ENTITY_TYPES, RELATIONSHIP_TYPES, ABAP_DATA_TYPES } from './dataModelContract.js';
import { defaultCdsReuseRegistry } from './cdsReuseRegistry.js';

export class DataModelValidator {
  constructor(options = {}) {
    this.cdsRegistry = options.cdsRegistry || defaultCdsReuseRegistry;
  }

  /**
   * Validates a complete Data Model Specification against architectural rules.
   */
  validate(dataModelSpec = {}, projectContext = {}) {
    const findings = [];
    let findingCounter = 1;

    const addFinding = (ruleId, category, severity, message, explanation, remediation, options = {}) => {
      findings.push({
        findingId: `FND-${findingCounter++}`,
        ruleId,
        category,
        severity,
        message,
        explanation,
        remediation,
        entityId: options.entityId || null,
        fieldId: options.fieldId || null,
        relationshipId: options.relationshipId || null,
        provenance: options.provenance || 'DATA_MODEL_VALIDATOR',
        blocksProgression: severity === 'ERROR'
      });
    };

    const entities = Array.isArray(dataModelSpec.entities) ? dataModelSpec.entities : [];
    const relationships = Array.isArray(dataModelSpec.relationships) ? dataModelSpec.relationships : [];
    const requirements = Array.isArray(projectContext.requirements) ? projectContext.requirements : [];

    // ==========================================
    // 1. STRUCTURAL VALIDATION
    // ==========================================

    // Rule S01: Entity existence
    if (entities.length === 0) {
      addFinding(
        'RULE_STRUC_NO_ENTITIES',
        'STRUCTURAL',
        'ERROR',
        'Data model contains no entities.',
        'A valid RAP business object requires at least one Root entity defining the primary business transaction.',
        'Add a Root Entity using the entity designer.'
      );
      return this._compileReport(findings);
    }

    // Rule S02: Exactly one ROOT entity for the transactional BO
    const rootEntities = entities.filter((e) => e.entityType === ENTITY_TYPES.ROOT);
    if (rootEntities.length === 0) {
      addFinding(
        'RULE_STRUC_NO_ROOT',
        'STRUCTURAL',
        'ERROR',
        'Missing Root Entity in data model.',
        'RAP Managed transactional business objects require exactly one designated Root entity to manage the transaction lifecycle and draft table.',
        'Select an entity and designate its Entity Type as ROOT, or create a new Root Entity.'
      );
    } else if (rootEntities.length > 1) {
      addFinding(
        'RULE_STRUC_MULTIPLE_ROOTS',
        'STRUCTURAL',
        'ERROR',
        `Multiple Root Entities detected (${rootEntities.map((e) => e.name).join(', ')}).`,
        'A single RAP business object can only possess one Root entity. Secondary transactional entities must be modeled as Child entities composed under the Root.',
        'Convert secondary root entities to CHILD entities and establish compositions, or separate them into distinct projects.',
        { entityId: rootEntities[1].entityId }
      );
    }

    // Rule S03: Unique entity names
    const entityNameMap = new Map();
    const entityIdMap = new Map();

    for (const entity of entities) {
      const upperName = entity.name.toUpperCase().trim();
      entityIdMap.set(entity.entityId, entity);

      if (entityNameMap.has(upperName)) {
        addFinding(
          'RULE_STRUC_DUPLICATE_ENTITY_NAME',
          'STRUCTURAL',
          'ERROR',
          `Duplicate entity name "${entity.name}".`,
          'All entity technical names must be unique within an ABAP CDS repository.',
          `Rename entity "${entity.name}" to a unique CDS view name.`,
          { entityId: entity.entityId }
        );
      } else {
        entityNameMap.set(upperName, entity);
      }

      // Validate fields for each entity
      const fields = Array.isArray(entity.fields) ? entity.fields : [];
      if (fields.length === 0 && entity.entityType !== ENTITY_TYPES.REFERENCE) {
        addFinding(
          'RULE_STRUC_NO_FIELDS',
          'STRUCTURAL',
          'ERROR',
          `Entity "${entity.name}" has no fields defined.`,
          'Every transactional or child entity must define at least one key field and relevant business fields.',
          `Add fields to entity "${entity.name}".`,
          { entityId: entity.entityId }
        );
      }

      // Check key presence
      const keyFields = fields.filter((f) => f.isKey);
      if (keyFields.length === 0 && entity.entityType !== ENTITY_TYPES.REFERENCE) {
        addFinding(
          'RULE_STRUC_NO_KEY',
          'STRUCTURAL',
          'ERROR',
          `Entity "${entity.name}" has no Key field defined.`,
          'Every RAP CDS entity must possess a primary key field for unique row identification.',
          `Designate at least one field as a Key in entity "${entity.name}".`,
          { entityId: entity.entityId }
        );
      }

      // Check duplicate fields within entity
      const fieldNameSet = new Set();
      for (const field of fields) {
        const fieldUpper = field.name.toUpperCase().trim();
        if (fieldNameSet.has(fieldUpper)) {
          addFinding(
            'RULE_STRUC_DUPLICATE_FIELD',
            'STRUCTURAL',
            'ERROR',
            `Duplicate field "${field.name}" in entity "${entity.name}".`,
            'Field technical names must be unique within an entity.',
            `Rename or remove duplicate field "${field.name}".`,
            { entityId: entity.entityId, fieldId: field.fieldId }
          );
        } else {
          fieldNameSet.add(fieldUpper);
        }

        // Validate ABAP data type
        if (!ABAP_DATA_TYPES[field.type]) {
          addFinding(
            'RULE_STRUC_INVALID_TYPE',
            'STRUCTURAL',
            'ERROR',
            `Invalid ABAP data type "${field.type}" on field "${field.name}".`,
            'Only standard ABAP Cloud / CDS data types are permitted.',
            'Select a valid ABAP data type from the registered type catalog.',
            { entityId: entity.entityId, fieldId: field.fieldId }
          );
        }

        // ==========================================
        // 4. BUSINESS INTEGRITY: Currency / Unit References
        // ==========================================
        if (field.type === 'abap.curr') {
          if (!field.cukyField) {
            addFinding(
              'RULE_INTEG_MISSING_CUKY_REF',
              'BUSINESS_INTEGRITY',
              'ERROR',
              `Currency field "${field.name}" lacks a currency reference field.`,
              'In ABAP CDS, currency amounts (@Semantics.amount.currencyCode) must reference a currency code field in the same entity.',
              `Select an existing currency code field (e.g. "Currency" or "Waers") as cukyField for "${field.name}".`,
              { entityId: entity.entityId, fieldId: field.fieldId }
            );
          } else if (!fieldNameSet.has(field.cukyField.toUpperCase()) && !fields.some((f) => f.name.toUpperCase() === field.cukyField.toUpperCase())) {
            addFinding(
              'RULE_INTEG_INVALID_CUKY_REF',
              'BUSINESS_INTEGRITY',
              'ERROR',
              `Currency reference field "${field.cukyField}" specified for "${field.name}" does not exist in entity "${entity.name}".`,
              'The referenced currency code field must exist within the same entity definition.',
              `Add currency code field "${field.cukyField}" to entity "${entity.name}" or update reference.`,
              { entityId: entity.entityId, fieldId: field.fieldId }
            );
          }
        }

        if (field.type === 'abap.quan') {
          if (!field.unitField) {
            addFinding(
              'RULE_INTEG_MISSING_UNIT_REF',
              'BUSINESS_INTEGRITY',
              'ERROR',
              `Quantity field "${field.name}" lacks a unit reference field.`,
              'In ABAP CDS, quantity fields (@Semantics.quantity.unitOfMeasure) must reference a unit of measure field in the same entity.',
              `Select an existing unit field (e.g. "UnitOfMeasure" or "Meins") as unitField for "${field.name}".`,
              { entityId: entity.entityId, fieldId: field.fieldId }
            );
          } else if (!fieldNameSet.has(field.unitField.toUpperCase()) && !fields.some((f) => f.name.toUpperCase() === field.unitField.toUpperCase())) {
            addFinding(
              'RULE_INTEG_INVALID_UNIT_REF',
              'BUSINESS_INTEGRITY',
              'ERROR',
              `Unit reference field "${field.unitField}" specified for "${field.name}" does not exist in entity "${entity.name}".`,
              'The referenced unit of measure field must exist within the same entity definition.',
              `Add unit of measure field "${field.unitField}" to entity "${entity.name}" or update reference.`,
              { entityId: entity.entityId, fieldId: field.fieldId }
            );
          }
        }
      }
    }

    // ==========================================
    // 2. RELATIONSHIP & HIERARCHY VALIDATION
    // ==========================================

    const compositionGraph = new Map(); // parent -> [children]
    for (const rel of relationships) {
      const sourceEntity = entityIdMap.get(rel.sourceEntityId) || entityNameMap.get(rel.sourceEntityId);
      const targetEntity = entityIdMap.get(rel.targetEntityId) || entityNameMap.get(rel.targetEntityId);

      // Check source and target existence
      if (!sourceEntity) {
        addFinding(
          'RULE_REL_MISSING_SOURCE',
          'RELATIONSHIP',
          'ERROR',
          `Relationship "${rel.name}" references non-existent source entity ID "${rel.sourceEntityId}".`,
          'Relationships must link valid, existing entities.',
          'Re-assign relationship source to a valid entity or delete the relationship.',
          { relationshipId: rel.relationshipId }
        );
        continue;
      }

      if (!targetEntity) {
        // Check if target is a standard CDS view in the registry
        const stdView = this.cdsRegistry.getByName(rel.targetEntityId);
        if (!stdView) {
          addFinding(
            'RULE_REL_MISSING_TARGET',
            'RELATIONSHIP',
            'ERROR',
            `Relationship "${rel.name}" references non-existent target entity ID "${rel.targetEntityId}".`,
            'Relationships must navigate to a valid custom entity or verified standard SAP CDS view.',
            'Re-assign relationship target to an existing entity.',
            { relationshipId: rel.relationshipId, entityId: sourceEntity.entityId }
          );
          continue;
        }
      }

      // Composition validation
      if (rel.relationshipType === RELATIONSHIP_TYPES.COMPOSITION) {
        if (!compositionGraph.has(rel.sourceEntityId)) {
          compositionGraph.set(rel.sourceEntityId, []);
        }
        compositionGraph.get(rel.sourceEntityId).push(rel.targetEntityId);

        // 1. Mandatory field mapping in compositions (parent key to child foreign key)
        if (!Array.isArray(rel.mapping) || rel.mapping.length === 0) {
          addFinding(
            'RULE_COMPOSITION_MISSING_MAPPING',
            'RELATIONSHIP',
            'ERROR',
            `Composition "${rel.name}" from "${sourceEntity.name}" to "${targetEntity ? targetEntity.name : rel.targetEntityId}" lacks key field mapping.`,
            'In SAP RAP, compositions require explicit join conditions between the parent primary key(s) and child foreign key(s).',
            'Define at least one field mapping linking parent key to child foreign key.',
            { relationshipId: rel.relationshipId }
          );
        }

        // 2. Target of composition cannot be ROOT entity
        if (targetEntity && targetEntity.entityType === ENTITY_TYPES.ROOT) {
          addFinding(
            'RULE_COMPOSITION_ROOT_TARGET',
            'RELATIONSHIP',
            'ERROR',
            `Target entity "${targetEntity.name}" of composition "${rel.name}" is designated as ROOT.`,
            'In SAP RAP, a ROOT entity cannot be a child node in a composition hierarchy.',
            'Change entityType of target entity to CHILD or adjust relationship structure.',
            { relationshipId: rel.relationshipId, entityId: targetEntity.entityId }
          );
        }

        // 3. Composition cardinality validation
        if (rel.cardinality !== '[0..*]' && rel.cardinality !== '[1..*]' && rel.cardinality !== '[0..1]' && rel.cardinality !== '[1..1]') {
          addFinding(
            'RULE_REL_COMPOSITION_CARDINALITY',
            'RELATIONSHIP',
            'ERROR',
            `Composition "${rel.name}" from "${sourceEntity.name}" to "${targetEntity ? targetEntity.name : ''}" has invalid cardinality "${rel.cardinality}".`,
            'RAP compositions require valid cardinality ([0..*], [1..*], [0..1], or [1..1]).',
            'Select a valid cardinality for this composition.',
            { relationshipId: rel.relationshipId }
          );
        }
      }

      // Check field mapping
      if (Array.isArray(rel.mapping) && targetEntity) {
        for (const mapItem of rel.mapping) {
          const srcField = sourceEntity.fields.find((f) => f.name.toUpperCase() === mapItem.sourceField.toUpperCase());
          const tgtField = targetEntity.fields.find((f) => f.name.toUpperCase() === mapItem.targetField.toUpperCase());

          if (!srcField) {
            addFinding(
              'RULE_REL_INVALID_SOURCE_FIELD',
              'RELATIONSHIP',
              'ERROR',
              `Field mapping in "${rel.name}" references non-existent source field "${mapItem.sourceField}".`,
              'All join mapping fields must exist on the respective entities.',
              `Select an existing field on "${sourceEntity.name}".`,
              { relationshipId: rel.relationshipId, entityId: sourceEntity.entityId }
            );
          }
          if (!tgtField) {
            addFinding(
              'RULE_REL_INVALID_TARGET_FIELD',
              'RELATIONSHIP',
              'ERROR',
              `Field mapping in "${rel.name}" references non-existent target field "${mapItem.targetField}".`,
              'All join mapping fields must exist on the respective entities.',
              `Select an existing field on "${targetEntity.name}".`,
              { relationshipId: rel.relationshipId, entityId: targetEntity.entityId }
            );
          }
        }
      }
    }

    // Cyclic composition detection
    const visited = new Set();
    const recStack = new Set();

    const checkCycle = (nodeId, path = []) => {
      visited.add(nodeId);
      recStack.add(nodeId);
      path.push(nodeId);

      const children = compositionGraph.get(nodeId) || [];
      for (const childId of children) {
        if (!visited.has(childId)) {
          if (checkCycle(childId, [...path])) return true;
        } else if (recStack.has(childId)) {
          const cycleNames = [...path, childId].map((id) => entityIdMap.get(id)?.name || id).join(' -> ');
          addFinding(
            'RULE_REL_CYCLIC_COMPOSITION',
            'RELATIONSHIP',
            'ERROR',
            `Cyclic composition detected: ${cycleNames}.`,
            'RAP composition hierarchies must be acyclic trees. An entity cannot compose its own ancestor.',
            'Remove the circular composition relationship and use an ASSOCIATION instead.',
            { entityId: childId }
          );
          return true;
        }
      }

      recStack.delete(nodeId);
      return false;
    };

    for (const [parentId] of compositionGraph) {
      if (!visited.has(parentId)) {
        checkCycle(parentId);
      }
    }

    // ==========================================
    // 3. SAP COMPATIBILITY VALIDATION
    // ==========================================
    for (const entity of entities) {
      if (entity.entityType === ENTITY_TYPES.REFERENCE || entity.sourceProvenance === 'OFFICIAL_SAP_DOCUMENTATION') {
        const stdView = this.cdsRegistry.getByName(entity.name);
        if (!stdView) {
          addFinding(
            'RULE_SAP_UNVERIFIED_CDS',
            'SAP_COMPATIBILITY',
            'WARNING',
            `Referenced SAP CDS view "${entity.name}" is not verified in target system S21.`,
            'Referencing unreleased or nonexistent CDS views may cause activation failures in SAP S/4HANA.',
            'Verify view release contract in SAP transaction SACM or ADT before deployment.',
            { entityId: entity.entityId, provenance: 'UNVERIFIED_PENDING_SCC' }
          );
        }
      }
    }

    // ==========================================
    // 4. BUSINESS REQUIREMENTS TRACEABILITY
    // ==========================================
    if (requirements.length > 0) {
      const confirmedReqs = requirements.filter((r) => r.status === 'CONFIRMED');
      if (confirmedReqs.length > 0) {
        // Collect all relatedEntities referenced by requirements
        const coveredEntities = new Set();
        for (const req of confirmedReqs) {
          if (Array.isArray(req.relatedEntities)) {
            for (const ent of req.relatedEntities) coveredEntities.add(ent.toUpperCase());
          }
        }

        // Informational check if root entity is mapped
        if (rootEntities.length > 0 && !coveredEntities.has(rootEntities[0].name.toUpperCase())) {
          addFinding(
            'RULE_REQ_ROOT_COVERAGE',
            'BUSINESS_INTEGRITY',
            'INFO',
            `Root entity "${rootEntities[0].name}" is not explicitly referenced in any confirmed requirement.`,
            'Requirements traceability ensures every modeled business object corresponds to a confirmed gap or user story.',
            'Link Root entity to the relevant functional requirement in the Requirements Designer.',
            { entityId: rootEntities[0].entityId }
          );
        }
      }
    }

    return this._compileReport(findings);
  }

  _compileReport(findings = []) {
    const errorsCount = findings.filter((f) => f.severity === 'ERROR').length;
    const warningsCount = findings.filter((f) => f.severity === 'WARNING').length;
    const infoCount = findings.filter((f) => f.severity === 'INFO').length;
    const blockingCount = findings.filter((f) => f.blocksProgression).length;

    let status = 'VALID';
    if (blockingCount > 0) {
      status = 'BLOCKED';
    } else if (warningsCount > 0) {
      const hasUnverifiedSap = findings.some((f) => f.category === 'SAP_COMPATIBILITY');
      status = hasUnverifiedSap ? 'PENDING_SAP_VERIFICATION' : 'VALID_WITH_WARNINGS';
    }

    return {
      isValid: errorsCount === 0,
      status,
      errorCount: errorsCount,
      warningCount: warningsCount,
      infoCount,
      blockingCount,
      summary: {
        totalFindings: findings.length,
        errorsCount,
        warningsCount,
        infoCount,
        blockingCount
      },
      findings,
      validatedAt: new Date().toISOString()
    };
  }
}

export const defaultDataModelValidator = new DataModelValidator();
