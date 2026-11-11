import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { defaultArchitectureDecisionEngine } from '../src/generation/architecture/architectureDecisionEngine.js';
import { generatePersistenceTables } from '../src/generation/abap/persistenceTableGenerator.js';
import { generateCdsEntities } from '../src/generation/abap/cdsViewEntityGenerator.js';
import { generateBehaviorDefinition } from '../src/generation/abap/rapBehaviorGenerator.js';
import { generateBehaviorImplementationClass } from '../src/generation/abap/behaviorClassGenerator.js';
import { generateServiceDefinition } from '../src/generation/abap/serviceDefinitionGenerator.js';
import { generateServiceBindingProposal } from '../src/generation/abap/serviceBindingProposalGenerator.js';
import { generateDclAccessControl } from '../src/generation/abap/dclAccessControlGenerator.js';
import { generateFioriManifest } from '../src/generation/fiori/manifestGenerator.js';
import { generateFioriAnnotationsXml } from '../src/generation/fiori/fioriAnnotationGenerator.js';
import { generateFioriProjectScaffolding } from '../src/generation/fiori/fioriProjectStructureGenerator.js';
import { ArtifactRegistry } from '../src/generation/artifacts/artifactRegistry.js';
import { defaultStaticValidationEngine } from '../src/generation/validation/staticValidationEngine.js';
import { RAP_PROFILES } from '../src/generation/architecture/architectureContract.js';
import { UI5_BASELINES } from '../src/generation/fiori/fioriArtifactContract.js';

describe('GEN-05 & GEN-06 Post-Implementation Deep Audit', () => {
  const sampleProject = {
    projectId: 'PRJ-AUDIT-SAMPLE',
    projectName: 'Purchase Order Modernization',
    description: 'S/4HANA 2023 S21 PO Modernization Project',
    dataModelSpec: {
      entities: [
        {
          entityId: 'ENT-01',
          name: 'PurchaseOrder',
          businessName: 'Purchase Order',
          tableName: 'ZPURCH_ORDER',
          entityType: 'ROOT',
          isRoot: true,
          fields: [
            { name: 'PurchaseOrderNumber', type: 'abap.char', length: 10, isKey: true, semanticRole: 'DOCUMENT_NUMBER' },
            { name: 'CompanyCode', type: 'abap.char', length: 4, isMandatory: true },
            { name: 'Supplier', type: 'abap.char', length: 10, isMandatory: true },
            { name: 'TotalNetAmount', type: 'abap.curr', precision: 15, scale: 2, semanticRole: 'AMOUNT', cukyField: 'DocumentCurrency' },
            { name: 'DocumentCurrency', type: 'abap.cuky' }
          ]
        },
        {
          entityId: 'ENT-02',
          name: 'PurchaseOrderItem',
          businessName: 'Purchase Order Item',
          tableName: 'ZPURCH_ITEM',
          entityType: 'CHILD',
          isRoot: false,
          fields: [
            { name: 'PurchaseOrderNumber', type: 'abap.char', length: 10, isKey: true },
            { name: 'PurchaseOrderItem', type: 'abap.numc', length: 5, isKey: true },
            { name: 'Material', type: 'abap.char', length: 40 },
            { name: 'OrderQuantity', type: 'abap.quan', precision: 13, scale: 3, semanticRole: 'QUANTITY', unitField: 'OrderUnit' },
            { name: 'OrderUnit', type: 'abap.unit' },
            { name: 'NetPriceAmount', type: 'abap.curr', precision: 15, scale: 2, semanticRole: 'AMOUNT', cukyField: 'DocumentCurrency' },
            { name: 'DocumentCurrency', type: 'abap.cuky' }
          ]
        }
      ],
      relationships: [
        {
          relationshipId: 'REL-01',
          name: '_Items',
          sourceEntityId: 'ENT-01',
          targetEntityId: 'ENT-02',
          relationshipType: 'COMPOSITION',
          cardinality: '[0..*]'
        }
      ]
    },
    requirementsSpec: {
      items: [
        {
          requirementId: 'REQ-01',
          title: 'Validate Supplier Active',
          description: 'Ensure supplier is unblocked',
          category: 'VALIDATION',
          status: 'CONFIRMED'
        },
        {
          requirementId: 'REQ-02',
          title: 'Calculate Discount Due Date',
          description: 'Derive discount terms',
          category: 'DETERMINATION',
          status: 'CONFIRMED'
        },
        {
          requirementId: 'REQ-03',
          title: 'Release Purchase Order',
          description: 'Trigger workflow release',
          category: 'ACTION',
          status: 'CONFIRMED'
        }
      ]
    }
  };

  test('1. Architecture Profiles Distinction: All 4 profiles produce appropriate, distinct artifacts', () => {
    // 1. MANAGED_RAP_DRAFT
    const archDraft = defaultArchitectureDecisionEngine.evaluate(sampleProject, { rapProfile: RAP_PROFILES.MANAGED_RAP_DRAFT });
    assert.equal(archDraft.selectedProfile, 'MANAGED_RAP_DRAFT');
    assert.equal(archDraft.draftDecision.enabled, true);
    const tablesDraft = generatePersistenceTables(sampleProject, archDraft);
    assert.ok(tablesDraft.some((t) => t.objectName === 'ZPURCH_ORDER_D'), 'Draft table must be generated');
    const bdefDraft = generateBehaviorDefinition(sampleProject, archDraft);
    assert.ok(bdefDraft[0].content.includes('with draft;'));
    assert.ok(bdefDraft[0].content.includes('draft action Edit;'));

    // 2. MANAGED_RAP_NON_DRAFT
    const archNonDraft = defaultArchitectureDecisionEngine.evaluate(sampleProject, { rapProfile: RAP_PROFILES.MANAGED_RAP_NON_DRAFT });
    assert.equal(archNonDraft.selectedProfile, 'MANAGED_RAP_NON_DRAFT');
    assert.equal(archNonDraft.draftDecision.enabled, false);
    const tablesNonDraft = generatePersistenceTables(sampleProject, archNonDraft);
    assert.ok(!tablesNonDraft.some((t) => t.objectName.endsWith('_D')), 'Draft table must not be generated');
    const bdefNonDraft = generateBehaviorDefinition(sampleProject, archNonDraft);
    assert.ok(!bdefNonDraft[0].content.includes('with draft;'));
    assert.ok(!bdefNonDraft[0].content.includes('draft action Edit;'));

    // 3. UNMANAGED_RAP
    const archUnmanaged = defaultArchitectureDecisionEngine.evaluate(sampleProject, { rapProfile: RAP_PROFILES.UNMANAGED_RAP });
    assert.equal(archUnmanaged.selectedProfile, 'UNMANAGED_RAP');
    const bdefUnmanaged = generateBehaviorDefinition(sampleProject, archUnmanaged);
    assert.ok(bdefUnmanaged[0].content.includes('unmanaged implementation in class'), 'Must declare unmanaged implementation');
    assert.ok(!bdefUnmanaged[0].content.includes('persistent table'), 'Unmanaged BDEF must not declare managed persistent table');
    const classUnmanaged = generateBehaviorImplementationClass(sampleProject, archUnmanaged);
    assert.ok(classUnmanaged[0].content.includes('METHODS create FOR MODIFY'), 'Must provide create handler signature');
    assert.ok(classUnmanaged[0].content.includes('METHODS update FOR MODIFY'), 'Must provide update handler signature');
    assert.ok(classUnmanaged[0].content.includes('METHODS delete FOR MODIFY'), 'Must provide delete handler signature');
    assert.ok(classUnmanaged[0].content.includes('cl_abap_behavior_saver'), 'Must provide saver class skeleton');
    assert.ok(classUnmanaged[0].content.includes('WARNING: UNMANAGED_RAP'), 'Must explicitly warn that BAPI/buffer code is developer responsibility');

    // 4. READ_ONLY_QUERY
    const archReadOnly = defaultArchitectureDecisionEngine.evaluate(sampleProject, { rapProfile: RAP_PROFILES.READ_ONLY_QUERY });
    assert.equal(archReadOnly.selectedProfile, 'READ_ONLY_QUERY');
    const bdefReadOnly = generateBehaviorDefinition(sampleProject, archReadOnly);
    assert.equal(bdefReadOnly.length, 0, 'READ_ONLY_QUERY must not generate behavior definition');
    const cdsReadOnly = generateCdsEntities(sampleProject, archReadOnly);
    const projView = cdsReadOnly.find((c) => c.objectName === 'ZC_PurchaseOrder');
    assert.ok(!projView.content.includes('provider contract transactional_query'), 'Read-only projection view must not claim transactional query contract');
  });

  test('2. SAP S/4HANA 2023 UI5 Compatibility Baselines (1.114.0 vs 1.120.0)', () => {
    assert.equal(UI5_BASELINES.S4HANA_2023_FPS00_INITIAL, '1.114.0');
    assert.equal(UI5_BASELINES.S4HANA_2023_FPS01_LTS, '1.120.0');

    // Default target
    const defaultManifest = generateFioriManifest(sampleProject, {});
    const defaultJson = JSON.parse(defaultManifest.content);
    assert.equal(defaultJson['sap.ui5'].dependencies.minUI5Version, '1.120.0');

    // Explicit S4HANA 2023 FPS00 initial baseline configuration
    const fps00Manifest = generateFioriManifest(sampleProject, {}, { minUI5Version: UI5_BASELINES.S4HANA_2023_FPS00_INITIAL });
    const fps00Json = JSON.parse(fps00Manifest.content);
    assert.equal(fps00Json['sap.ui5'].dependencies.minUI5Version, '1.114.0');
  });

  test('3. Stale Field Detection: Static validation flags annotations referencing removed CDS fields', () => {
    const project = JSON.parse(JSON.stringify(sampleProject));
    const arch = defaultArchitectureDecisionEngine.evaluate(project, {});
    
    // Generate valid annotation artifact
    const validAnnot = generateFioriAnnotationsXml(project, arch);
    
    // Now simulate user or schema removing 'Supplier' field from CDS entity
    project.dataModelSpec.entities[0].fields = project.dataModelSpec.entities[0].fields.filter((f) => f.name !== 'Supplier');

    // Commit to registry
    ArtifactRegistry.commitArtifacts(project, [validAnnot]);

    // Validate
    const report = defaultStaticValidationEngine.validateProject(project);
    const staleFinding = report.findings.find((f) => f.ruleId === 'RULE_GEN06_ANNOTATION_FIELD_NOT_FOUND');
    assert.ok(staleFinding, 'Validation engine must detect stale field reference in annotations');
    assert.ok(staleFinding.message.includes('Supplier'), 'Finding must name the missing field');
    assert.equal(staleFinding.severity, 'ERROR');
  });

  test('4. Manual Edit Preservation and Restoration Lifecycle', () => {
    const project = JSON.parse(JSON.stringify(sampleProject));
    const arch = defaultArchitectureDecisionEngine.evaluate(project, {});
    const tables = generatePersistenceTables(project, arch);

    // Initial commit
    ArtifactRegistry.commitArtifacts(project, tables);
    const rootTable = Object.values(project.artifactRegistry.artifacts).find((a) => a.objectName === 'ZPURCH_ORDER');
    assert.equal(rootTable.manualEditStatus, 'ORIGINAL');

    // Developer modifies table definition
    const modifiedContent = rootTable.content + '\n/* Custom developer index instruction */\n';
    ArtifactRegistry.applyManualEdit(project, rootTable.artifactId, modifiedContent, 'Senior ABAP Developer');
    assert.equal(rootTable.manualEditStatus, 'MODIFIED');
    assert.equal(rootTable.content, modifiedContent);

    // Regenerate tables - manual edits MUST be preserved
    const freshTables = generatePersistenceTables(project, arch);
    const runRecord = ArtifactRegistry.commitArtifacts(project, freshTables);
    assert.equal(runRecord.preservedManualEditsCount, 1);
    assert.equal(rootTable.content, modifiedContent, 'Modified content must not be overwritten by regeneration');
    assert.equal(rootTable.manualEditStatus, 'MODIFIED');

    // Restore to template
    ArtifactRegistry.restoreToTemplate(project, rootTable.artifactId);
    assert.equal(rootTable.manualEditStatus, 'ORIGINAL');
    assert.ok(!rootTable.content.includes('Custom developer index instruction'));
  });

  test('5. Inspection of Generated ABAP Syntax Patterns & Explicit TODO Inventory', () => {
    const arch = defaultArchitectureDecisionEngine.evaluate(sampleProject, {});
    const tables = generatePersistenceTables(sampleProject, arch);
    const cds = generateCdsEntities(sampleProject, arch);
    const bdef = generateBehaviorDefinition(sampleProject, arch);
    const classes = generateBehaviorImplementationClass(sampleProject, arch);
    const srvd = generateServiceDefinition(sampleProject, arch);
    const srvb = generateServiceBindingProposal(sampleProject, arch);
    const dcl = generateDclAccessControl(sampleProject, arch);

    // 1. Table DDL has client key and ETag audit fields
    const hdrTable = tables.find((t) => t.objectName === 'ZPURCH_ORDER');
    assert.ok(hdrTable.content.includes('key client            : abap.clnt not null;'));
    assert.ok(hdrTable.content.includes('local_last_changed_at : abp_locinst_lastchange_utclong;'));

    // 2. CDS View Entity uses define view entity, no sqlViewName
    const ifaceView = cds.find((c) => c.objectName === 'ZI_PurchaseOrder');
    assert.ok(ifaceView.content.includes('define root view entity ZI_PurchaseOrder'));
    assert.ok(!ifaceView.content.includes('@AbapCatalog.sqlViewName'));

    // 3. Metadata Extension has @Metadata.layer: and lineItem
    const mde = cds.find((c) => c.objectName === 'ZC_PurchaseOrder_MDE');
    assert.ok(mde.content.includes('@Metadata.layer:'));
    assert.ok(mde.content.includes('lineItem:'));

    // 4. Behavior implementation has explicit TODO items mapped to requirements
    const handler = classes[0];
    assert.ok(handler.content.includes('/* REQUIREMENT: REQ-01 - Validate Supplier Active'));
    assert.ok(handler.content.includes('/* REQUIREMENT: REQ-02 - Calculate Discount Due Date'));
    assert.ok(handler.content.includes('/* REQUIREMENT: REQ-03 - Release Purchase Order'));
    assert.ok(handler.content.includes('/* TODO: Read entity buffer using EML'));
    assert.ok(handler.content.includes('/* TODO: Modify entity fields via EML'));

    // 5. Service Definition exposes projections
    assert.ok(srvd[0].content.includes('expose ZC_PurchaseOrder as PurchaseOrder;'));
    assert.ok(srvd[0].content.includes('expose ZC_PurchaseOrder_PurchaseOrderItem as PurchaseOrderItem;'));

    // 6. DCL role has PFCG authorization aspect
    assert.ok(dcl[0].content.includes('define role Z_PURCHASEORDER_DCL'));
    assert.ok(dcl[0].content.includes('ZI_PurchaseOrder'));
    assert.ok(dcl[0].content.includes('aspect pfcg_auth'));

    // 7. Limitations metadata explicitly notes uncompiled/unactivated state
    assert.ok(handler.limitations.some((l) => l.includes('Requires real ABAP developer implementation in Eclipse ADT before activation in S21')));
  });
});
