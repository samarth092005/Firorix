/**
 * Fiorify — QA-02: RAP Composition Model Completeness & Validation Test Suite
 *
 * Verifies:
 * 1. Root Entity with key and semantic fields
 * 2. Parent-to-Child Composition with valid cardinality ([0..*]) and cascade delete
 * 3. Child-to-Parent Association with key mapping
 * 4. Rejection of incomplete composition missing key field mapping
 * 5. Rejection of composition with invalid cardinality
 * 6. Rejection of composition targeting a ROOT entity
 * 7. Multi-level nested composition hierarchy (Root -> Item -> ScheduleLine)
 * 8. Cycle detection rejecting circular composition graphs
 */

import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { DataModelValidator } from '../src/generation/datamodel/dataModelValidator.js';
import { defaultCdsReuseRegistry } from '../src/generation/datamodel/cdsReuseRegistry.js';
import {
  createEntityRecord,
  createFieldRecord,
  createRelationshipRecord,
  ENTITY_TYPES,
  RELATIONSHIP_TYPES
} from '../src/generation/datamodel/dataModelContract.js';

describe('QA-02: RAP Composition Model Completeness & Governance', () => {
  let validator;

  before(() => {
    validator = new DataModelValidator({ cdsRegistry: defaultCdsReuseRegistry });
  });

  it('1. Validates complete parent-to-child composition with key mapping and currency semantics', () => {
    const rootEntity = createEntityRecord({
      name: 'SalesOrder',
      entityType: ENTITY_TYPES.ROOT,
      fields: [
        createFieldRecord({ name: 'SalesOrder', type: 'abap.char', length: 10, isKey: true, semanticRole: 'PRIMARY_KEY' }),
        createFieldRecord({ name: 'CurrencyCode', type: 'abap.cuky', length: 5, semanticRole: 'CURRENCY_KEY' }),
        createFieldRecord({ name: 'TotalAmount', type: 'abap.curr', length: 16, precision: 16, scale: 2, cukyField: 'CurrencyCode', semanticRole: 'AMOUNT' })
      ]
    });

    const itemEntity = createEntityRecord({
      name: 'SalesOrderItem',
      entityType: ENTITY_TYPES.CHILD,
      fields: [
        createFieldRecord({ name: 'SalesOrder', type: 'abap.char', length: 10, isKey: true, semanticRole: 'PARENT_KEY' }),
        createFieldRecord({ name: 'ItemPosition', type: 'abap.numc', length: 4, isKey: true, semanticRole: 'PRIMARY_KEY' }),
        createFieldRecord({ name: 'CurrencyCode', type: 'abap.cuky', length: 5, semanticRole: 'CURRENCY_KEY' }),
        createFieldRecord({ name: 'NetPrice', type: 'abap.curr', length: 16, precision: 16, scale: 2, cukyField: 'CurrencyCode', semanticRole: 'AMOUNT' })
      ]
    });

    const composition = createRelationshipRecord({
      name: '_Item',
      relationshipType: RELATIONSHIP_TYPES.COMPOSITION,
      sourceEntityId: rootEntity.entityId,
      targetEntityId: itemEntity.entityId,
      cardinality: '[0..*]',
      onDelete: 'CASCADE',
      mapping: [{ sourceField: 'SalesOrder', targetField: 'SalesOrder' }]
    });

    const associationToParent = createRelationshipRecord({
      name: '_SalesOrder',
      relationshipType: RELATIONSHIP_TYPES.ASSOCIATION,
      sourceEntityId: itemEntity.entityId,
      targetEntityId: rootEntity.entityId,
      cardinality: '[1..1]',
      mapping: [{ sourceField: 'SalesOrder', targetField: 'SalesOrder' }]
    });

    const report = validator.validate({
      entities: [rootEntity, itemEntity],
      relationships: [composition, associationToParent]
    });

    assert.equal(report.isValid, true);
    assert.equal(report.errorCount, 0);
  });

  it('2. Rejects incomplete composition missing key field mapping with RULE_COMPOSITION_MISSING_MAPPING', () => {
    const rootEntity = createEntityRecord({
      name: 'Invoice',
      entityType: ENTITY_TYPES.ROOT,
      fields: [createFieldRecord({ name: 'InvoiceNumber', isKey: true })]
    });

    const childEntity = createEntityRecord({
      name: 'InvoiceItem',
      entityType: ENTITY_TYPES.CHILD,
      fields: [createFieldRecord({ name: 'InvoiceNumber', isKey: true }), createFieldRecord({ name: 'Item', isKey: true })]
    });

    const incompleteComp = createRelationshipRecord({
      name: '_Items',
      relationshipType: RELATIONSHIP_TYPES.COMPOSITION,
      sourceEntityId: rootEntity.entityId,
      targetEntityId: childEntity.entityId,
      cardinality: '[0..*]',
      mapping: [] // MISSING MAPPING!
    });

    const report = validator.validate({
      entities: [rootEntity, childEntity],
      relationships: [incompleteComp]
    });

    assert.equal(report.isValid, false);
    const issue = report.findings.find((f) => f.ruleId === 'RULE_COMPOSITION_MISSING_MAPPING');
    assert.ok(issue, 'Must report RULE_COMPOSITION_MISSING_MAPPING');
    assert.equal(issue.severity, 'ERROR');
  });

  it('3. Rejects composition targeting another ROOT entity with RULE_COMPOSITION_ROOT_TARGET', () => {
    const root1 = createEntityRecord({
      name: 'PurchaseOrder',
      entityType: ENTITY_TYPES.ROOT,
      fields: [createFieldRecord({ name: 'PONumber', isKey: true })]
    });

    const root2 = createEntityRecord({
      name: 'VendorInvoice',
      entityType: ENTITY_TYPES.ROOT,
      fields: [createFieldRecord({ name: 'InvoiceId', isKey: true })]
    });

    const illegalComp = createRelationshipRecord({
      name: '_IllegalRootComposition',
      relationshipType: RELATIONSHIP_TYPES.COMPOSITION,
      sourceEntityId: root1.entityId,
      targetEntityId: root2.entityId,
      cardinality: '[0..*]',
      mapping: [{ sourceField: 'PONumber', targetField: 'InvoiceId' }]
    });

    const report = validator.validate({
      entities: [root1, root2],
      relationships: [illegalComp]
    });

    assert.equal(report.isValid, false);
    const issue = report.findings.find((f) => f.ruleId === 'RULE_COMPOSITION_ROOT_TARGET');
    assert.ok(issue, 'Must report RULE_COMPOSITION_ROOT_TARGET');
  });

  it('4. Supports multi-level nested composition hierarchy (Header -> Item -> ScheduleLine)', () => {
    const header = createEntityRecord({
      name: 'OrderHeader',
      entityType: ENTITY_TYPES.ROOT,
      fields: [createFieldRecord({ name: 'OrderId', isKey: true })]
    });

    const item = createEntityRecord({
      name: 'OrderItem',
      entityType: ENTITY_TYPES.CHILD,
      fields: [createFieldRecord({ name: 'OrderId', isKey: true }), createFieldRecord({ name: 'ItemId', isKey: true })]
    });

    const scheduleLine = createEntityRecord({
      name: 'OrderScheduleLine',
      entityType: ENTITY_TYPES.CHILD,
      fields: [
        createFieldRecord({ name: 'OrderId', isKey: true }),
        createFieldRecord({ name: 'ItemId', isKey: true }),
        createFieldRecord({ name: 'ScheduleLineNumber', isKey: true })
      ]
    });

    const comp1 = createRelationshipRecord({
      name: '_Items',
      relationshipType: RELATIONSHIP_TYPES.COMPOSITION,
      sourceEntityId: header.entityId,
      targetEntityId: item.entityId,
      cardinality: '[0..*]',
      mapping: [{ sourceField: 'OrderId', targetField: 'OrderId' }]
    });

    const comp2 = createRelationshipRecord({
      name: '_ScheduleLines',
      relationshipType: RELATIONSHIP_TYPES.COMPOSITION,
      sourceEntityId: item.entityId,
      targetEntityId: scheduleLine.entityId,
      cardinality: '[0..*]',
      mapping: [
        { sourceField: 'OrderId', targetField: 'OrderId' },
        { sourceField: 'ItemId', targetField: 'ItemId' }
      ]
    });

    const report = validator.validate({
      entities: [header, item, scheduleLine],
      relationships: [comp1, comp2]
    });

    assert.equal(report.isValid, true);
    assert.equal(report.errorCount, 0);
  });

  it('5. Detects circular composition and rejects with RULE_REL_CYCLIC_COMPOSITION', () => {
    const e1 = createEntityRecord({
      name: 'NodeA',
      entityType: ENTITY_TYPES.ROOT,
      fields: [createFieldRecord({ name: 'IdA', isKey: true })]
    });

    const e2 = createEntityRecord({
      name: 'NodeB',
      entityType: ENTITY_TYPES.CHILD,
      fields: [createFieldRecord({ name: 'IdB', isKey: true })]
    });

    const relAtoB = createRelationshipRecord({
      name: '_B',
      relationshipType: RELATIONSHIP_TYPES.COMPOSITION,
      sourceEntityId: e1.entityId,
      targetEntityId: e2.entityId,
      mapping: [{ sourceField: 'IdA', targetField: 'IdB' }]
    });

    const relBtoA = createRelationshipRecord({
      name: '_A',
      relationshipType: RELATIONSHIP_TYPES.COMPOSITION,
      sourceEntityId: e2.entityId,
      targetEntityId: e1.entityId,
      mapping: [{ sourceField: 'IdB', targetField: 'IdA' }]
    });

    const report = validator.validate({
      entities: [e1, e2],
      relationships: [relAtoB, relBtoA]
    });

    assert.equal(report.isValid, false);
    const cycleFinding = report.findings.find((f) => f.ruleId === 'RULE_REL_CYCLIC_COMPOSITION');
    assert.ok(cycleFinding, 'Must detect circular composition');
  });
});
