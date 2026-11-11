/**
 * FioriX — Data Model Service (GEN-04)
 *
 * Implements CRUD operations, relationship modeling, and validation
 * orchestration for Generation Studio CDS data models.
 */

import {
  createEntityRecord,
  createFieldRecord,
  createRelationshipRecord,
  ENTITY_TYPES
} from './dataModelContract.js';
import { defaultDataModelValidator } from './dataModelValidator.js';
import { defaultGenerationProjectStore } from '../projects/generationProjectStore.js';
import { LIFECYCLE_STATUSES } from '../contracts/generationProjectContract.js';

export class DataModelService {
  constructor(options = {}) {
    this.projectStore = options.projectStore || defaultGenerationProjectStore;
    this.validator = options.validator || defaultDataModelValidator;
  }

  /**
   * Retrieves the current data model specification for a project.
   */
  async getDataModel(projectId, userContext = null) {
    const project = await this.projectStore.getProject(projectId, userContext);
    if (!project) {
      const err = new Error(`Project "${projectId}" was not found.`);
      err.code = 'NOT_FOUND';
      throw err;
    }

    const rawSpec = project.dataModelSpec || {};
    const spec = {
      specVersion: rawSpec.specVersion || 1,
      rootEntity: rawSpec.rootEntity || null,
      entities: Array.isArray(rawSpec.entities) ? rawSpec.entities : [],
      relationships: Array.isArray(rawSpec.relationships) ? rawSpec.relationships : [],
      validationReport: rawSpec.validationReport || null,
      status: rawSpec.status || 'EMPTY'
    };

    return {
      success: true,
      projectId,
      dataModel: spec
    };
  }

  /**
   * Saves the entire data model specification atomically.
   */
  async saveDataModel(projectId, dataModelSpec = {}, userContext = null) {
    const project = await this.projectStore.getProject(projectId, userContext);
    if (!project) {
      const err = new Error(`Project "${projectId}" was not found.`);
      err.code = 'NOT_FOUND';
      throw err;
    }

    const currentSpec = project.dataModelSpec || { specVersion: 1, entities: [], relationships: [] };

    const rawEntities = Array.isArray(dataModelSpec.entities) ? dataModelSpec.entities : currentSpec.entities || [];
    const entities = rawEntities.map((e) => createEntityRecord(e));

    const rawRelationships = Array.isArray(dataModelSpec.relationships) ? dataModelSpec.relationships : currentSpec.relationships || [];
    const relationships = rawRelationships.map((r) => createRelationshipRecord(r));

    const nextSpec = {
      ...currentSpec,
      specVersion: (currentSpec.specVersion || 1) + 1,
      entities,
      relationships,
      status: entities.length > 0 ? 'DRAFT_IN_PROGRESS' : 'EMPTY'
    };

    const patch = { dataModelSpec: nextSpec };

    // Advance lifecycle to DATA_MODEL_IN_PROGRESS if currently REQUIREMENTS_CONFIRMED
    if (project.lifecycleStatus === LIFECYCLE_STATUSES.REQUIREMENTS_CONFIRMED) {
      patch.lifecycleStatus = LIFECYCLE_STATUSES.DATA_MODEL_IN_PROGRESS;
      patch.currentPhase = 'PHASE_3_DATA_MODEL';
    }

    await this.projectStore.updateProject(projectId, patch, userContext);

    return {
      success: true,
      dataModel: nextSpec
    };
  }

  /**
   * Adds a new entity to the project data model.
   */
  async addEntity(projectId, entityPayload = {}, userContext = null) {
    const project = await this.projectStore.getProject(projectId, userContext);
    if (!project) {
      const err = new Error(`Project "${projectId}" was not found.`);
      err.code = 'NOT_FOUND';
      throw err;
    }

    const currentSpec = project.dataModelSpec || { specVersion: 1, entities: [], relationships: [] };
    const entities = [...(currentSpec.entities || [])];
    const relationships = [...(currentSpec.relationships || [])];

    const newEntity = createEntityRecord(entityPayload);

    // If no fields provided and entity is ROOT, provide standard key and admin fields
    if (newEntity.fields.length === 0) {
      if (newEntity.entityType === ENTITY_TYPES.ROOT) {
        newEntity.fields.push(
          createFieldRecord({ name: `${newEntity.name}ID`, label: 'Identifier', type: 'abap.char', length: 10, isKey: true, semanticRole: 'KEY' }),
          createFieldRecord({ name: 'Description', label: 'Description', type: 'abap.char', length: 60, semanticRole: 'DESCRIPTION' }),
          createFieldRecord({ name: 'Status', label: 'Overall Status', type: 'abap.char', length: 2, semanticRole: 'STATUS' }),
          createFieldRecord({ name: 'CreatedAt', label: 'Created At', type: 'abap.utclong', isReadOnly: true, semanticRole: 'ADMIN_CREATED_AT' }),
          createFieldRecord({ name: 'CreatedBy', label: 'Created By', type: 'abap.char', length: 12, isReadOnly: true, semanticRole: 'ADMIN_CREATED_BY' })
        );
      } else if (newEntity.entityType === ENTITY_TYPES.CHILD) {
        newEntity.fields.push(
          createFieldRecord({ name: 'ItemNumber', label: 'Item Number', type: 'abap.numc', length: 4, isKey: true, semanticRole: 'KEY' }),
          createFieldRecord({ name: 'Material', label: 'Material Code', type: 'abap.char', length: 18, isMandatory: true }),
          createFieldRecord({ name: 'Quantity', label: 'Quantity', type: 'abap.quan', length: 13, precision: 13, scale: 3, unitField: 'UnitOfMeasure', semanticRole: 'QUANTITY' }),
          createFieldRecord({ name: 'UnitOfMeasure', label: 'Base Unit', type: 'abap.char', length: 3 }),
          createFieldRecord({ name: 'NetPrice', label: 'Net Price', type: 'abap.curr', length: 15, precision: 15, scale: 2, cukyField: 'Currency', semanticRole: 'AMOUNT' }),
          createFieldRecord({ name: 'Currency', label: 'Currency Key', type: 'abap.char', length: 5 })
        );
      }
    }

    entities.push(newEntity);

    const nextSpec = {
      ...currentSpec,
      specVersion: (currentSpec.specVersion || 1) + 1,
      entities,
      relationships,
      status: 'DRAFT_IN_PROGRESS'
    };

    const patch = { dataModelSpec: nextSpec };
    if (project.lifecycleStatus === LIFECYCLE_STATUSES.REQUIREMENTS_CONFIRMED) {
      patch.lifecycleStatus = LIFECYCLE_STATUSES.DATA_MODEL_IN_PROGRESS;
      patch.currentPhase = 'PHASE_3_DATA_MODEL';
    }

    await this.projectStore.updateProject(projectId, patch, userContext);
    return newEntity;
  }

  /**
   * Updates an existing entity.
   */
  async updateEntity(projectId, entityId, patch = {}, userContext = null) {
    const project = await this.projectStore.getProject(projectId, userContext);
    if (!project) {
      const err = new Error(`Project "${projectId}" was not found.`);
      err.code = 'NOT_FOUND';
      throw err;
    }

    const currentSpec = project.dataModelSpec || { specVersion: 1, entities: [] };
    const entities = [...(currentSpec.entities || [])];
    const index = entities.findIndex((e) => e.entityId === entityId);

    if (index === -1) {
      const err = new Error(`Entity "${entityId}" was not found in project "${projectId}".`);
      err.code = 'NOT_FOUND';
      throw err;
    }

    const existing = entities[index];
    const updated = {
      ...existing,
      ...patch,
      entityId: existing.entityId, // Immutable
      updatedAt: new Date().toISOString()
    };

    entities[index] = updated;

    const nextSpec = {
      ...currentSpec,
      specVersion: (currentSpec.specVersion || 1) + 1,
      entities
    };

    await this.projectStore.updateProject(projectId, { dataModelSpec: nextSpec }, userContext);
    return updated;
  }

  /**
   * Deletes an entity and cleans up associated relationships.
   */
  async deleteEntity(projectId, entityId, userContext = null) {
    const project = await this.projectStore.getProject(projectId, userContext);
    if (!project) {
      const err = new Error(`Project "${projectId}" was not found.`);
      err.code = 'NOT_FOUND';
      throw err;
    }

    const currentSpec = project.dataModelSpec || { specVersion: 1, entities: [], relationships: [] };
    const entities = currentSpec.entities || [];
    const relationships = currentSpec.relationships || [];

    const index = entities.findIndex((e) => e.entityId === entityId);
    if (index === -1) {
      const err = new Error(`Entity "${entityId}" was not found in project "${projectId}".`);
      err.code = 'NOT_FOUND';
      throw err;
    }

    // Remove entity and any relationship where this entity is source or target
    const removedEntity = entities.splice(index, 1)[0];
    const survivingRelationships = relationships.filter(
      (r) => r.sourceEntityId !== entityId && r.targetEntityId !== entityId
    );

    const nextSpec = {
      ...currentSpec,
      specVersion: (currentSpec.specVersion || 1) + 1,
      entities,
      relationships: survivingRelationships,
      status: entities.length > 0 ? currentSpec.status : 'EMPTY'
    };

    await this.projectStore.updateProject(projectId, { dataModelSpec: nextSpec }, userContext);
    return {
      success: true,
      deletedEntityId: entityId,
      remainingEntitiesCount: entities.length,
      remainingRelationshipsCount: survivingRelationships.length
    };
  }

  /**
   * Adds a field to an entity.
   */
  async addField(projectId, entityId, fieldPayload = {}, userContext = null) {
    const project = await this.projectStore.getProject(projectId, userContext);
    if (!project) {
      const err = new Error(`Project "${projectId}" was not found.`);
      err.code = 'NOT_FOUND';
      throw err;
    }

    const currentSpec = project.dataModelSpec || { specVersion: 1, entities: [] };
    const entities = [...(currentSpec.entities || [])];
    const entity = entities.find((e) => e.entityId === entityId);

    if (!entity) {
      const err = new Error(`Entity "${entityId}" was not found.`);
      err.code = 'NOT_FOUND';
      throw err;
    }

    const newField = createFieldRecord(fieldPayload);
    entity.fields = [...(entity.fields || []), newField];
    entity.updatedAt = new Date().toISOString();

    const nextSpec = {
      ...currentSpec,
      specVersion: (currentSpec.specVersion || 1) + 1,
      entities
    };

    await this.projectStore.updateProject(projectId, { dataModelSpec: nextSpec }, userContext);
    return newField;
  }

  /**
   * Updates a field in an entity.
   */
  async updateField(projectId, entityId, fieldId, patch = {}, userContext = null) {
    const project = await this.projectStore.getProject(projectId, userContext);
    if (!project) {
      const err = new Error(`Project "${projectId}" was not found.`);
      err.code = 'NOT_FOUND';
      throw err;
    }

    const currentSpec = project.dataModelSpec || { specVersion: 1, entities: [] };
    const entities = [...(currentSpec.entities || [])];
    const entity = entities.find((e) => e.entityId === entityId);

    if (!entity) {
      const err = new Error(`Entity "${entityId}" was not found.`);
      err.code = 'NOT_FOUND';
      throw err;
    }

    const fields = [...(entity.fields || [])];
    const fIdx = fields.findIndex((f) => f.fieldId === fieldId);
    if (fIdx === -1) {
      const err = new Error(`Field "${fieldId}" was not found in entity "${entityId}".`);
      err.code = 'NOT_FOUND';
      throw err;
    }

    const existing = fields[fIdx];
    const updated = {
      ...existing,
      ...patch,
      fieldId: existing.fieldId // Immutable
    };

    fields[fIdx] = updated;
    entity.fields = fields;
    entity.updatedAt = new Date().toISOString();

    const nextSpec = {
      ...currentSpec,
      specVersion: (currentSpec.specVersion || 1) + 1,
      entities
    };

    await this.projectStore.updateProject(projectId, { dataModelSpec: nextSpec }, userContext);
    return updated;
  }

  /**
   * Deletes a field from an entity.
   */
  async deleteField(projectId, entityId, fieldId, userContext = null) {
    const project = await this.projectStore.getProject(projectId, userContext);
    if (!project) {
      const err = new Error(`Project "${projectId}" was not found.`);
      err.code = 'NOT_FOUND';
      throw err;
    }

    const currentSpec = project.dataModelSpec || { specVersion: 1, entities: [] };
    const entities = [...(currentSpec.entities || [])];
    const entity = entities.find((e) => e.entityId === entityId);

    if (!entity) {
      const err = new Error(`Entity "${entityId}" was not found.`);
      err.code = 'NOT_FOUND';
      throw err;
    }

    const fields = entity.fields || [];
    const fIdx = fields.findIndex((f) => f.fieldId === fieldId);
    if (fIdx === -1) {
      const err = new Error(`Field "${fieldId}" was not found in entity "${entityId}".`);
      err.code = 'NOT_FOUND';
      throw err;
    }

    fields.splice(fIdx, 1);
    entity.updatedAt = new Date().toISOString();

    const nextSpec = {
      ...currentSpec,
      specVersion: (currentSpec.specVersion || 1) + 1,
      entities
    };

    await this.projectStore.updateProject(projectId, { dataModelSpec: nextSpec }, userContext);
    return {
      success: true,
      deletedFieldId: fieldId,
      remainingFieldsCount: fields.length
    };
  }

  /**
   * Adds a relationship between entities.
   */
  async addRelationship(projectId, relationshipPayload = {}, userContext = null) {
    const project = await this.projectStore.getProject(projectId, userContext);
    if (!project) {
      const err = new Error(`Project "${projectId}" was not found.`);
      err.code = 'NOT_FOUND';
      throw err;
    }

    const currentSpec = project.dataModelSpec || { specVersion: 1, entities: [], relationships: [] };
    const entities = currentSpec.entities || [];
    const relationships = [...(currentSpec.relationships || [])];

    const payload = { ...relationshipPayload };
    if (payload.sourceEntityId) {
      const found = entities.find(e => e.entityId === payload.sourceEntityId || e.name === payload.sourceEntityId);
      if (found) payload.sourceEntityId = found.entityId;
    } else if (payload.sourceEntity || payload.sourceEntityName) {
      const srcName = payload.sourceEntity || payload.sourceEntityName;
      const found = entities.find(e => e.entityId === srcName || e.name === srcName);
      if (found) payload.sourceEntityId = found.entityId;
    }

    if (payload.targetEntityId) {
      const found = entities.find(e => e.entityId === payload.targetEntityId || e.name === payload.targetEntityId);
      if (found) payload.targetEntityId = found.entityId;
    } else if (payload.targetEntity || payload.targetEntityName) {
      const tgtName = payload.targetEntity || payload.targetEntityName;
      const found = entities.find(e => e.entityId === tgtName || e.name === tgtName);
      if (found) payload.targetEntityId = found.entityId;
    }

    if (!payload.mapping && (payload.fieldMappings || payload.mappings)) {
      payload.mapping = payload.fieldMappings || payload.mappings;
    }

    const newRel = createRelationshipRecord(payload);

    // Check for circular composition
    if (newRel.relationshipType === 'COMPOSITION') {
      const compGraph = new Map();
      for (const rel of relationships) {
        if (rel.relationshipType === 'COMPOSITION') {
          if (!compGraph.has(rel.sourceEntityId)) compGraph.set(rel.sourceEntityId, []);
          compGraph.get(rel.sourceEntityId).push(rel.targetEntityId);
        }
      }
      if (!compGraph.has(newRel.sourceEntityId)) compGraph.set(newRel.sourceEntityId, []);
      compGraph.get(newRel.sourceEntityId).push(newRel.targetEntityId);

      // Check if targetEntityId can reach sourceEntityId
      const visited = new Set();
      const canReach = (current, target) => {
        if (current === target) return true;
        visited.add(current);
        const nexts = compGraph.get(current) || [];
        for (const n of nexts) {
          if (!visited.has(n) && canReach(n, target)) return true;
        }
        return false;
      };

      if (canReach(newRel.targetEntityId, newRel.sourceEntityId)) {
        const err = new Error(`Circular composition detected between entity "${newRel.sourceEntityId}" and "${newRel.targetEntityId}".`);
        err.code = 'VALIDATION_ERROR';
        throw err;
      }
    }

    relationships.push(newRel);

    const nextSpec = {
      ...currentSpec,
      specVersion: (currentSpec.specVersion || 1) + 1,
      relationships
    };

    await this.projectStore.updateProject(projectId, { dataModelSpec: nextSpec }, userContext);
    return newRel;
  }

  /**
   * Deletes a relationship.
   */
  async deleteRelationship(projectId, relationshipId, userContext = null) {
    const project = await this.projectStore.getProject(projectId, userContext);
    if (!project) {
      const err = new Error(`Project "${projectId}" was not found.`);
      err.code = 'NOT_FOUND';
      throw err;
    }

    const currentSpec = project.dataModelSpec || { specVersion: 1, relationships: [] };
    const relationships = currentSpec.relationships || [];
    const rIdx = relationships.findIndex((r) => r.relationshipId === relationshipId);

    if (rIdx === -1) {
      const err = new Error(`Relationship "${relationshipId}" was not found in project "${projectId}".`);
      err.code = 'NOT_FOUND';
      throw err;
    }

    relationships.splice(rIdx, 1);

    const nextSpec = {
      ...currentSpec,
      specVersion: (currentSpec.specVersion || 1) + 1,
      relationships
    };

    await this.projectStore.updateProject(projectId, { dataModelSpec: nextSpec }, userContext);
    return {
      success: true,
      deletedRelationshipId: relationshipId,
      remainingCount: relationships.length
    };
  }

  /**
   * Runs the full validation engine over the project's data model.
   * If validation produces zero blocking errors, marks lifecycle as DATA_MODEL_VALIDATED.
   */
  async validateDataModel(projectId, userContext = null) {
    const project = await this.projectStore.getProject(projectId, userContext);
    if (!project) {
      const err = new Error(`Project "${projectId}" was not found.`);
      err.code = 'NOT_FOUND';
      throw err;
    }

    const spec = project.dataModelSpec || { entities: [], relationships: [] };
    const requirements = project.requirementsSpec?.items || [];

    const report = this.validator.validate(spec, { requirements, project });

    const nextSpec = {
      ...spec,
      validationReport: report,
      status: report.status
    };

    const patch = {
      dataModelSpec: nextSpec,
      validationReport: report
    };

    // If validation succeeds without blocking errors:
    if (report.summary.blockingCount === 0 && (project.lifecycleStatus === LIFECYCLE_STATUSES.DATA_MODEL_IN_PROGRESS || project.lifecycleStatus === LIFECYCLE_STATUSES.REQUIREMENTS_CONFIRMED)) {
      patch.lifecycleStatus = LIFECYCLE_STATUSES.DATA_MODEL_VALIDATED;
    }

    await this.projectStore.updateProject(projectId, patch, userContext);

    return {
      success: true,
      projectId,
      report,
      validationReport: report
    };
  }
}

export const defaultDataModelService = new DataModelService();
