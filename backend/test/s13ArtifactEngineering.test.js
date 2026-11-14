import test from 'node:test';
import assert from 'node:assert/strict';
import { generateBehaviorImplementationClass } from '../src/generation/abap/behaviorClassGenerator.js';
import { generateServiceBindingProposal } from '../src/generation/abap/serviceBindingProposalGenerator.js';
import { generateDclAccessControl } from '../src/generation/abap/dclAccessControlGenerator.js';
import { generatePersistenceTables } from '../src/generation/abap/persistenceTableGenerator.js';
import { generateCdsEntities } from '../src/generation/abap/cdsViewEntityGenerator.js';
import { generateBehaviorDefinition } from '../src/generation/abap/rapBehaviorGenerator.js';
import { generateServiceDefinition } from '../src/generation/abap/serviceDefinitionGenerator.js';

test('Artifact Engineering & Defensive Scaffolding (Sprint 13.3 / REM-GEN-01, REM-GEN-02, REM-GEN-03)', async (t) => {

  await t.test('1. Behavior Class Generator: Generates defensive EML scaffolding with %tky and handover markers (REM-GEN-01)', () => {
    const mockProject = {
      projectId: 'PROJ-TEST-RAP',
      dataModelSpec: {
        entities: [
          {
            entityId: 'ENT-01',
            entityType: 'ROOT',
            name: 'SalesOrder',
            businessName: 'Sales Order Header',
            fields: [
              { name: 'SalesOrder', sapField: 'VBELN', isKey: true },
              { name: 'SalesOrganization', sapField: 'VKORG' }
            ]
          }
        ]
      },
      requirementsSpec: {
        items: [
          {
            requirementId: 'REQ-VAL-01',
            category: 'VALIDATION',
            status: 'CONFIRMED',
            title: 'Validate Delivery Date',
            acceptanceCriteria: ['Delivery date must be in the future']
          },
          {
            requirementId: 'REQ-DET-01',
            category: 'DETERMINATION',
            status: 'CONFIRMED',
            title: 'Calculate Total Net Amount'
          },
          {
            requirementId: 'REQ-ACT-01',
            category: 'ACTION',
            status: 'CONFIRMED',
            title: 'Release Order'
          }
        ]
      }
    };

    const artifacts = generateBehaviorImplementationClass(mockProject, { selectedProfile: 'MANAGED_RAP' });
    assert.strictEqual(artifacts.length, 1);

    const art = artifacts[0];
    assert.strictEqual(art.artifactType, 'RAP_BEHAVIOR_IMPLEMENTATION');
    assert.strictEqual(art.requiresDeveloperCompletion, true);
    assert.ok(Array.isArray(art.developerCompletionMethods));
    assert.ok(art.developerCompletionMethods.includes('get_instance_authorizations'));
    assert.ok(art.developerCompletionMethods.includes('validatedeliverydate'));
    assert.ok(art.developerCompletionMethods.includes('calculatetotalnetamount'));
    assert.ok(art.developerCompletionMethods.includes('executereleaseorder'));

    const content = art.content;

    // Check handover markers
    assert.ok(
      content.includes('" HANDOVER STATUS: SCAFFOLD GENERATED - DOMAIN LOGIC EXTENSION REQUIRED'),
      'Must contain explicit handover marker'
    );

    // Check defensive EML scaffolding in validation
    assert.ok(content.includes('READ ENTITIES OF zi_salesorder IN LOCAL MODE'), 'Must contain local EML read');
    assert.ok(content.includes('ALL FIELDS WITH CORRESPONDING #( keys )'));
    assert.ok(content.includes('LOOP AT lt_entities ASSIGNING FIELD-SYMBOL(<ls_entity>)'));
    assert.ok(content.includes('IF <ls_entity>-%tky IS INITIAL'));
    assert.ok(content.includes('APPEND VALUE #( %tky = <ls_entity>-%tky ) TO failed-salesorder'));
    assert.ok(content.includes('reported-salesorder'));

    // Check instance authorizations default scaffolding
    assert.ok(content.includes('%update = if_abap_behv=>auth-allowed'));
    assert.ok(content.includes('%delete = if_abap_behv=>auth-allowed'));
  });

  await t.test('2. Service Binding Proposal: Generates clear planning blueprint with ADT instructions (REM-GEN-02)', () => {
    const mockProject = {
      projectId: 'PROJ-TEST-SRVB',
      targetPackage: 'ZCUSTOM_TEST',
      targetRelease: 'SAP S/4HANA 2023',
      dataModelSpec: {
        entities: [
          {
            entityId: 'ENT-01',
            entityType: 'ROOT',
            name: 'PurchaseOrder',
            businessName: 'Purchase Order'
          }
        ]
      }
    };

    const artifacts = generateServiceBindingProposal(mockProject, {});
    assert.strictEqual(artifacts.length, 1);

    const art = artifacts[0];
    assert.strictEqual(art.artifactType, 'RAP_SERVICE_BINDING_PROPOSAL');
    assert.strictEqual(art.isPlanningArtifact, true);
    assert.strictEqual(art.tadirObjectType, null);
    assert.strictEqual(art.requiresManualAdtActivation, true);

    const parsed = JSON.parse(art.content);
    assert.strictEqual(parsed.nature, 'Fiorify_PLANNING_ARTIFACT_ONLY');
    assert.ok(parsed.warning.includes('NOT a TADIR-activatable binary object'));
    assert.strictEqual(parsed.bindingSpecification.bindingType, 'ODATA_V4_UI');
    assert.strictEqual(parsed.bindingSpecification.serviceDefinitionName, 'ZUI_PURCHASEORDER');
    assert.strictEqual(parsed.bindingSpecification.package, 'ZCUSTOM_TEST');

    // Check manual activation guides
    assert.ok(Array.isArray(parsed.manualActivationGuide.adtMethod));
    assert.ok(parsed.manualActivationGuide.adtMethod.some(step => step.includes('Publish')));
    assert.ok(Array.isArray(parsed.manualActivationGuide.sapGatewayMethod));
    assert.ok(parsed.manualActivationGuide.sapGatewayMethod.some(step => step.includes('/IWFND/MAINT_SERVICE')));
  });

  await t.test('3. DCL Access Control: Maps domain-specific authorization objects (REM-GEN-03)', () => {
    // 3A. Sales Order -> V_VBAK_VKO
    const salesProject = {
      projectId: 'PROJ-VA01',
      transactionCode: 'VA01',
      dataModelSpec: {
        entities: [
          {
            entityId: 'ENT-01',
            entityType: 'ROOT',
            name: 'SalesOrder',
            fields: [
              { name: 'SalesOrder', sapField: 'VBELN' },
              { name: 'SalesOrganization', sapField: 'VKORG' }
            ]
          }
        ]
      }
    };

    const salesArts = generateDclAccessControl(salesProject, {});
    assert.strictEqual(salesArts.length, 1);
    assert.strictEqual(salesArts[0].authorizationMappingStatus, 'REALISTIC_DOMAIN_MAPPED');
    assert.strictEqual(salesArts[0].authorizationObject, 'V_VBAK_VKO');
    assert.ok(salesArts[0].content.includes('aspect pfcg_auth( V_VBAK_VKO, VKORG, ACTVT = \'03\' )'));

    // 3B. Purchase Order -> M_BEST_EKO
    const poProject = {
      projectId: 'PROJ-ME21N',
      transactionCode: 'ME21N',
      dataModelSpec: {
        entities: [
          {
            entityId: 'ENT-01',
            entityType: 'ROOT',
            name: 'PurchaseOrder',
            fields: [
              { name: 'PurchaseOrder', sapField: 'EBELN' },
              { name: 'PurchasingOrganization', sapField: 'EKORG' }
            ]
          }
        ]
      }
    };

    const poArts = generateDclAccessControl(poProject, {});
    assert.strictEqual(poArts.length, 1);
    assert.strictEqual(poArts[0].authorizationMappingStatus, 'REALISTIC_DOMAIN_MAPPED');
    assert.strictEqual(poArts[0].authorizationObject, 'M_BEST_EKO');
    assert.ok(poArts[0].content.includes('aspect pfcg_auth( M_BEST_EKO, EKORG, ACTVT = \'03\' )'));

    // 3C. Material Master -> M_MATE_WRK
    const matProject = {
      projectId: 'PROJ-MM01',
      transactionCode: 'MM01',
      dataModelSpec: {
        entities: [
          {
            entityId: 'ENT-01',
            entityType: 'ROOT',
            name: 'Material',
            fields: [
              { name: 'Material', sapField: 'MATNR' },
              { name: 'Plant', sapField: 'WERKS' }
            ]
          }
        ]
      }
    };

    const matArts = generateDclAccessControl(matProject, {});
    assert.strictEqual(matArts.length, 1);
    assert.strictEqual(matArts[0].authorizationMappingStatus, 'REALISTIC_DOMAIN_MAPPED');
    assert.strictEqual(matArts[0].authorizationObject, 'M_MATE_WRK');
    assert.ok(matArts[0].content.includes('aspect pfcg_auth( M_MATE_WRK, WERKS, ACTVT = \'03\' )'));

    // 3D. Financial Journal -> F_BKPF_BUK
    const fiProject = {
      projectId: 'PROJ-FB01',
      transactionCode: 'FB01',
      dataModelSpec: {
        entities: [
          {
            entityId: 'ENT-01',
            entityType: 'ROOT',
            name: 'JournalEntry',
            fields: [
              { name: 'DocumentNumber', sapField: 'BELNR' },
              { name: 'CompanyCode', sapField: 'BUKRS' }
            ]
          }
        ]
      }
    };

    const fiArts = generateDclAccessControl(fiProject, {});
    assert.strictEqual(fiArts.length, 1);
    assert.strictEqual(fiArts[0].authorizationMappingStatus, 'REALISTIC_DOMAIN_MAPPED');
    assert.strictEqual(fiArts[0].authorizationObject, 'F_BKPF_BUK');
    assert.ok(fiArts[0].content.includes('aspect pfcg_auth( F_BKPF_BUK, BUKRS, ACTVT = \'03\' )'));

    // 3E. Generic Unmatched Domain -> Fallback to S_TABU_DIS
    const genericProject = {
      projectId: 'PROJ-GEN',
      transactionCode: 'ZCUSTOM_UNKNOWN',
      dataModelSpec: {
        entities: [
          {
            entityId: 'ENT-01',
            entityType: 'ROOT',
            name: 'FlightSchedule',
            fields: [{ name: 'FlightId' }]
          }
        ]
      }
    };

    const genArts = generateDclAccessControl(genericProject, {});
    assert.strictEqual(genArts.length, 1);
    assert.strictEqual(genArts[0].authorizationMappingStatus, 'GENERIC_FALLBACK_REQUIRES_MAPPING');
    assert.strictEqual(genArts[0].authorizationObject, 'S_TABU_DIS');
    assert.ok(genArts[0].content.includes('S_TABU_DIS'));
    assert.ok(genArts[0].content.includes('GENERIC FALLBACK'));
  });

  await t.test('4. Full ABAP generator suite integrates all updated generators cleanly', () => {
    const fullProject = {
      projectId: 'PROJ-FULL-01',
      transactionCode: 'VA01',
      targetPackage: 'ZSALES_DEMO',
      dataModelSpec: {
        entities: [
          {
            entityId: 'ENT-01',
            entityType: 'ROOT',
            name: 'SalesOrder',
            fields: [
              { name: 'SalesOrder', sapField: 'VBELN', isKey: true },
              { name: 'SalesOrganization', sapField: 'VKORG' }
            ]
          }
        ]
      },
      requirementsSpec: {
        items: [
          {
            requirementId: 'REQ-01',
            category: 'VALIDATION',
            status: 'CONFIRMED',
            title: 'Validate Price'
          }
        ]
      }
    };

    const arch = { selectedProfile: 'MANAGED_RAP' };
    const artifacts = [
      ...generatePersistenceTables(fullProject, arch),
      ...generateCdsEntities(fullProject, arch),
      ...generateBehaviorDefinition(fullProject, arch),
      ...generateBehaviorImplementationClass(fullProject, arch),
      ...generateServiceDefinition(fullProject, arch),
      ...generateServiceBindingProposal(fullProject, arch),
      ...generateDclAccessControl(fullProject, arch)
    ];

    assert.ok(artifacts.length >= 7, 'Suite must generate comprehensive ABAP artifacts');

    const behaviorClass = artifacts.find(a => a.artifactType === 'RAP_BEHAVIOR_IMPLEMENTATION');
    assert.ok(behaviorClass);
    assert.strictEqual(behaviorClass.requiresDeveloperCompletion, true);

    const srvb = artifacts.find(a => a.artifactType === 'RAP_SERVICE_BINDING_PROPOSAL');
    assert.ok(srvb);
    assert.strictEqual(srvb.isPlanningArtifact, true);

    const dcl = artifacts.find(a => a.artifactType === 'DCL_ACCESS_CONTROL');
    assert.ok(dcl);
    assert.strictEqual(dcl.authorizationObject, 'V_VBAK_VKO');
  });
});
