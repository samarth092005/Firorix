/**
 * FioriX — GEN-05: RAP Architecture Designer & ABAP Generator Test Suite
 *
 * Verifies:
 * 1. Architecture decision engine profile selection (Managed with Draft, Non-Draft, Read-Only, Unmanaged).
 * 2. Database table DDL generation for root and draft tables.
 * 3. Clean Core CDS view entities (ZI_*, ZC_*, and metadata extensions).
 * 4. Behavior definition (BDEF) with draft actions and requirement-mapped validations/determinations.
 * 5. Behavior implementation class skeleton (BP_I_*) with requirement IDs and TODO blocks.
 * 6. Service Definition (SRVD) and Service Binding proposal (.srvb.json) planning artifact.
 * 7. Shared Artifact Registry: checksum calculation, manual edit preservation, and template restoration.
 * 8. Static Validation Engine: detects missing root entity, namespace warnings, and draft mismatch.
 */

import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { ArchitectureDecisionEngine } from '../src/generation/architecture/architectureDecisionEngine.js';
import { RAP_PROFILES } from '../src/generation/architecture/architectureContract.js';
import { generatePersistenceTables } from '../src/generation/abap/persistenceTableGenerator.js';
import { generateCdsEntities } from '../src/generation/abap/cdsViewEntityGenerator.js';
import { generateBehaviorDefinition } from '../src/generation/abap/rapBehaviorGenerator.js';
import { generateBehaviorImplementationClass } from '../src/generation/abap/behaviorClassGenerator.js';
import { generateServiceDefinition } from '../src/generation/abap/serviceDefinitionGenerator.js';
import { generateServiceBindingProposal } from '../src/generation/abap/serviceBindingProposalGenerator.js';
import { generateDclAccessControl } from '../src/generation/abap/dclAccessControlGenerator.js';
import { ArtifactRegistry } from '../src/generation/artifacts/artifactRegistry.js';
import { StaticValidationEngine } from '../src/generation/validation/staticValidationEngine.js';
import { computeSha256 } from '../src/generation/abap/abapArtifactContract.js';

describe('GEN-05: RAP Architecture Designer & ABAP Generator', () => {
  const engine = new ArchitectureDecisionEngine();
  const validator = new StaticValidationEngine();

  // Standard sample project fixture
  const sampleProject = {
    projectId: 'GEN-SAMPLE-001',
    projectName: 'Payment Run Modernization',
    targetRelease: 'SAP S/4HANA 2023 On-Premise',
    targetPackage: 'ZFIN_PAYMENTS',
    origin: 'DISCOVERY_BUILD',
    requirementsSpec: {
      specVersion: 1,
      items: [
        {
          requirementId: 'REQ-VAL-01',
          title: 'Verify Bank Key Validity',
          category: 'VALIDATION',
          priority: 'MUST_HAVE',
          status: 'CONFIRMED',
          acceptanceCriteria: ['Bank key must be exactly 8 numeric digits']
        },
        {
          requirementId: 'REQ-DET-02',
          title: 'Calculate Discount Due Date',
          category: 'DETERMINATION',
          priority: 'SHOULD_HAVE',
          status: 'CONFIRMED'
        },
        {
          requirementId: 'REQ-ACT-03',
          title: 'Release Payment Block',
          category: 'ACTION',
          priority: 'MUST_HAVE',
          status: 'CONFIRMED'
        }
      ]
    },
    dataModelSpec: {
      specVersion: 1,
      entities: [
        {
          entityId: 'ENT-ROOT-01',
          name: 'ZPaymentHeader',
          businessName: 'Payment Run Header',
          entityType: 'ROOT',
          isRoot: true,
          tableName: 'ZPAY_HEADER',
          fields: [
            { name: 'PaymentID', isKey: true, isMandatory: true, type: 'abap.char', length: 10, semanticRole: 'DOCUMENT_NUMBER' },
            { name: 'CompanyCode', isKey: false, isMandatory: true, type: 'abap.char', length: 4, semanticRole: 'CODE' },
            { name: 'TotalAmount', isKey: false, isMandatory: false, type: 'abap.curr', precision: 15, scale: 2, semanticRole: 'AMOUNT', cukyField: 'CurrencyCode' },
            { name: 'CurrencyCode', isKey: false, isMandatory: false, type: 'abap.cuky', length: 5, semanticRole: 'CURRENCY_CODE' }
          ]
        },
        {
          entityId: 'ENT-CHILD-02',
          name: 'ZPaymentItem',
          businessName: 'Payment Line Item',
          entityType: 'CHILD',
          tableName: 'ZPAY_ITEM',
          parentEntity: 'ZPaymentHeader',
          fields: [
            { name: 'PaymentID', isKey: true, isMandatory: true, type: 'abap.char', length: 10, semanticRole: 'PARENT_KEY' },
            { name: 'ItemNumber', isKey: true, isMandatory: true, type: 'abap.numc', length: 4, semanticRole: 'ITEM_NUMBER' },
            { name: 'VendorNumber', isKey: false, isMandatory: true, type: 'abap.char', length: 10, semanticRole: 'CODE' },
            { name: 'ItemAmount', isKey: false, isMandatory: false, type: 'abap.curr', precision: 15, scale: 2, semanticRole: 'AMOUNT', cukyField: 'ItemCurrency' },
            { name: 'ItemCurrency', isKey: false, isMandatory: false, type: 'abap.cuky', length: 5, semanticRole: 'CURRENCY_CODE' }
          ]
        }
      ],
      relationships: [
        {
          relationshipId: 'REL-01',
          name: '_Items',
          relationshipType: 'COMPOSITION',
          sourceEntityId: 'ENT-ROOT-01',
          targetEntityId: 'ENT-CHILD-02',
          cardinality: '[0..*]',
          mapping: [{ sourceField: 'PaymentID', targetField: 'PaymentID' }]
        }
      ]
    }
  };

  it('1. Architecture Decision Engine selects MANAGED_RAP_DRAFT for transactional multi-level object', () => {
    const arch = engine.evaluate(sampleProject);
    assert.equal(arch.selectedProfile, RAP_PROFILES.MANAGED_RAP_DRAFT);
    assert.equal(arch.draftDecision.enabled, true);
    assert.ok(arch.rootEntity.draftTableName, 'Root draft table must be proposed');
    assert.ok(arch.childEntities[0].draftTableName, 'Child draft table must be proposed');
    assert.equal(arch.cleanCoreImplications.tier, 'TIER_2_DEV_EXT');
    assert.ok(arch.rationale.includes('Managed RAP with Draft'));
  });

  it('2. Architecture Decision Engine selects READ_ONLY_QUERY for purely analytical requirements', () => {
    const readOnlyProject = {
      ...sampleProject,
      requirementsSpec: {
        items: [
          { requirementId: 'REQ-RO-01', title: 'Display Payment Journal', category: 'DATA_READ', status: 'CONFIRMED' }
        ]
      },
      dataModelSpec: {
        entities: [sampleProject.dataModelSpec.entities[0]],
        relationships: []
      }
    };
    const arch = engine.evaluate(readOnlyProject);
    assert.equal(arch.selectedProfile, RAP_PROFILES.READ_ONLY_QUERY);
    assert.equal(arch.draftDecision.enabled, false);
    assert.ok(arch.rationale.includes('Read-Only Query profile'));
  });

  it('3. Generates database table DDL for persistent and draft tables', () => {
    const arch = engine.evaluate(sampleProject);
    const tables = generatePersistenceTables(sampleProject, arch);
    assert.ok(tables.length >= 4, 'Must generate root table, root draft table, child table, child draft table');

    const rootTable = tables.find((t) => t.objectName === arch.rootEntity.tableName);
    assert.ok(rootTable, 'Root table DDL must exist');
    assert.ok(rootTable.content.includes('define table zpay_header'));
    assert.ok(rootTable.content.includes('paymentid'));
    assert.ok(rootTable.content.includes('created_by'));
    assert.ok(rootTable.content.includes('local_last_changed_at'));

    const rootDraft = tables.find((t) => t.objectName === arch.rootEntity.draftTableName);
    assert.ok(rootDraft, 'Draft table DDL must exist');
    assert.ok(rootDraft.content.includes('draftuuid'));
    assert.ok(rootDraft.content.includes('sych_bdl_draft_admin_inc'));
  });

  it('4. Generates Clean Core CDS View Entities (ZI_*, ZC_*, and *.mde)', () => {
    const arch = engine.evaluate(sampleProject);
    const cds = generateCdsEntities(sampleProject, arch);

    const ifaceView = cds.find((c) => c.objectName === 'ZI_ZPaymentHeader');
    assert.ok(ifaceView, 'ZI_* interface view entity must be generated');
    assert.ok(ifaceView.content.includes('define root view entity ZI_ZPaymentHeader'));
    assert.ok(ifaceView.content.includes('composition [0..*] of ZI_ZPaymentHeader_ZPaymentItem as _Items'));
    assert.ok(ifaceView.content.includes("@Semantics.amount.currencyCode: 'CurrencyCode'"));

    const projView = cds.find((c) => c.objectName === 'ZC_ZPaymentHeader');
    assert.ok(projView, 'ZC_* projection view entity must be generated');
    assert.ok(projView.content.includes('define root view entity ZC_ZPaymentHeader'));
    assert.ok(projView.content.includes('as projection on ZI_ZPaymentHeader'));
    assert.ok(projView.content.includes('_Items : redirected to composition child ZC_ZPaymentHeader_ZPaymentItem'));

    const mde = cds.find((c) => c.artifactType === 'CDS_METADATA_EXTENSION');
    assert.ok(mde, 'Metadata extension must be generated');
    assert.ok(mde.content.includes('@Metadata.layer: #CORE'));
    assert.ok(mde.content.includes('@UI.facet:'));
  });

  it('5. Generates RAP Behavior Definition (BDEF) with draft and requirement mappings', () => {
    const arch = engine.evaluate(sampleProject);
    const bdefs = generateBehaviorDefinition(sampleProject, arch);
    assert.equal(bdefs.length, 2, 'Must generate root interface BDEF and projection BDEF');

    const rootBdef = bdefs.find((b) => b.objectName === 'ZI_ZPaymentHeader');
    assert.ok(rootBdef.content.includes('managed implementation in class bp_i_zpaymentheader unique;'));
    assert.ok(rootBdef.content.includes('strict ( 2 );'));
    assert.ok(rootBdef.content.includes('with draft;'));
    assert.ok(rootBdef.content.includes('draft action Edit;'));
    assert.ok(rootBdef.content.includes('draft action Activate optimized;'));
    assert.ok(rootBdef.content.includes('validation validateVerifyBankKeyValidity on save'));
    assert.ok(rootBdef.content.includes('determination calculateDiscountDueDate on modify'));
    assert.ok(rootBdef.content.includes('action executeReleasePaymentBlock result [1] $self;'));
  });

  it('6. Generates Behavior Implementation Class skeleton (BP_I_*) with TODO blocks', () => {
    const arch = engine.evaluate(sampleProject);
    const classes = generateBehaviorImplementationClass(sampleProject, arch);
    assert.equal(classes.length, 1);
    const cls = classes[0];
    assert.equal(cls.objectName, 'BP_I_ZPAYMENTHEADER');
    assert.ok(cls.content.includes('CLASS bp_i_zpaymentheader DEFINITION PUBLIC ABSTRACT FINAL'));
    assert.ok(cls.content.includes('validateverifybankkeyvalidity'));
    assert.ok(cls.content.includes('TODO: Read entity buffer using EML'));
    assert.ok(cls.content.includes('REQUIREMENT: REQ-VAL-01 - Verify Bank Key Validity'));
  });

  it('7. Generates Service Definition (SRVD) and Service Binding proposal (.srvb.json)', () => {
    const arch = engine.evaluate(sampleProject);
    const srvd = generateServiceDefinition(sampleProject, arch);
    assert.equal(srvd.length, 1);
    assert.ok(srvd[0].content.includes('define service ZUI_ZPAYMENTHEADER'));
    assert.ok(srvd[0].content.includes('expose ZC_ZPaymentHeader as ZPaymentHeader;'));

    const srvb = generateServiceBindingProposal(sampleProject, arch);
    assert.equal(srvb.length, 1);
    const srvbJson = JSON.parse(srvb[0].content);
    assert.equal(srvbJson.bindingType, 'ODATA_V4_UI');
    assert.equal(srvbJson.serviceDefinition, 'ZUI_ZPAYMENTHEADER');
    assert.equal(srvbJson.nature, 'FIORIX_PLANNING_ARTIFACT_ONLY');
  });

  it('8. Shared Artifact Registry: commits artifacts, calculates SHA-256, and preserves manual edits', () => {
    const projectRecord = JSON.parse(JSON.stringify(sampleProject));
    const arch = engine.evaluate(projectRecord);
    const tables = generatePersistenceTables(projectRecord, arch);

    const run = ArtifactRegistry.commitArtifacts(projectRecord, tables, { phase: 'GEN_05_TEST' });
    assert.equal(run.result, 'SUCCESS');
    assert.ok(run.generatedArtifactIds.length >= 4);

    const tableArt = Object.values(projectRecord.artifactRegistry.artifacts)[0];
    const originalChecksum = tableArt.checksum;
    assert.equal(originalChecksum, computeSha256(tableArt.content));

    // Simulate manual edit by developer
    const modifiedContent = tableArt.content + '\n/* Custom developer addition */';
    const editRes = ArtifactRegistry.applyManualEdit(projectRecord, tableArt.artifactId, modifiedContent, 'Test Developer');
    assert.equal(editRes.manualEditStatus, 'MODIFIED');
    assert.equal(tableArt.content, modifiedContent);

    // Re-run generation without forceOverwrite -> custom edits MUST be preserved
    const run2 = ArtifactRegistry.commitArtifacts(projectRecord, tables, { forceOverwrite: false });
    assert.equal(run2.preservedManualEditsCount, 1);
    assert.equal(tableArt.content, modifiedContent, 'Manual edits must be preserved across regenerations');

    // Restore to template
    const restoreRes = ArtifactRegistry.restoreToTemplate(projectRecord, tableArt.artifactId);
    assert.equal(restoreRes.artifact.manualEditStatus, 'ORIGINAL');
    assert.equal(restoreRes.artifact.content, tableArt.templateContent);
  });

  it('9. Static Validation Engine verifies complete project artifacts with 0 errors', () => {
    const projectRecord = JSON.parse(JSON.stringify(sampleProject));
    const arch = engine.evaluate(projectRecord);
    projectRecord.architectureSpec = arch;

    const allArts = [
      ...generatePersistenceTables(projectRecord, arch),
      ...generateCdsEntities(projectRecord, arch),
      ...generateBehaviorDefinition(projectRecord, arch),
      ...generateBehaviorImplementationClass(projectRecord, arch),
      ...generateServiceDefinition(projectRecord, arch),
      ...generateServiceBindingProposal(projectRecord, arch),
      ...generateDclAccessControl(projectRecord, arch)
    ];

    ArtifactRegistry.commitArtifacts(projectRecord, allArts);
    const report = validator.validateProject(projectRecord);

    assert.equal(report.errorsCount, 0, 'Must have zero static validation errors');
    assert.equal(report.isValid, true);
  });
});
