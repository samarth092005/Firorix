import test from 'node:test';
import assert from 'node:assert/strict';
import {
  SapArtifactCompatibilityEngine,
  COMPATIBILITY_RATINGS,
  SERVICE_BINDING_LIFECYCLE_STATES
} from '../src/generation/validation/sapArtifactCompatibilityEngine.js';

test('Sprint 11.3 — SAP Artifact Compatibility Engine Tests', async (t) => {
  const engine = new SapArtifactCompatibilityEngine();

  await t.test('1. Flags project with empty artifact registry as UNKNOWN_INSUFFICIENT_EVIDENCE', () => {
    const emptyProj = { artifactRegistry: { artifacts: {} } };
    const result = engine.evaluateProjectCompatibility(emptyProj);

    assert.equal(result.rating, COMPATIBILITY_RATINGS.UNKNOWN_INSUFFICIENT_EVIDENCE);
    assert.equal(result.score, 0);
    assert.equal(result.serviceBindingStatus, SERVICE_BINDING_LIFECYCLE_STATES.NOT_GENERATED);
  });

  await t.test('2. Accurately detects TODO comments in ABAP behavior classes and classifies under limitations', () => {
    const projWithTodos = {
      artifactRegistry: {
        artifacts: {
          'art-cds': {
            artifactId: 'art-cds',
            artifactType: 'CDS_VIEW_ENTITY',
            objectName: 'ZC_SalesOrder',
            filePath: 'ZC_SalesOrder.ddls.asddls',
            content: 'define root view entity ZC_SalesOrder as select from ZI_SalesOrder { key SalesOrder, Customer, TotalAmount }'
          },
          'art-bdef': {
            artifactId: 'art-bdef',
            artifactType: 'RAP_BEHAVIOR_DEFINITION',
            objectName: 'ZR_SalesOrder',
            filePath: 'ZR_SalesOrder.bdef.asbdef',
            content: 'managed implementation in class ZBP_SalesOrder unique; with draft; draft table zso_d; etag master LastChangedAt;'
          },
          'art-clas': {
            artifactId: 'art-clas',
            artifactType: 'RAP_BEHAVIOR_POOL',
            objectName: 'ZBP_SalesOrder',
            filePath: 'ZBP_SalesOrder.clas.abap',
            content: `
CLASS zbp_salesorder DEFINITION PUBLIC ABSTRACT FINAL FOR BEHAVIOR OF zr_salesorder.
ENDCLASS.
CLASS zbp_salesorder IMPLEMENTATION.
  METHOD validateStatus.
    " TODO: Implement business validation for Sales Order status transitions
  ENDMETHOD.
ENDCLASS.`
          },
          'art-srvd': {
            artifactId: 'art-srvd',
            artifactType: 'RAP_SERVICE_DEFINITION',
            objectName: 'ZUI_SALESORDER_O4',
            filePath: 'ZUI_SALESORDER_O4.srvd.srvdsrv',
            content: 'define service ZUI_SALESORDER_O4 { expose ZC_SalesOrder as SalesOrder; }'
          },
          'art-srvb': {
            artifactId: 'art-srvb',
            artifactType: 'RAP_SERVICE_BINDING_PROPOSAL',
            objectName: 'ZUI_SALESORDER_O4_BINDING',
            filePath: 'ZUI_SALESORDER_O4.srvb.json',
            content: JSON.stringify({
              serviceDefinition: 'ZUI_SALESORDER_O4',
              bindingType: 'ODATA_V4_UI'
            })
          }
        }
      }
    };

    const res = engine.evaluateProjectCompatibility(projWithTodos);
    assert.equal(res.rating, COMPATIBILITY_RATINGS.COMPATIBLE_WITH_LIMITATIONS);
    assert.equal(res.serviceBindingStatus, SERVICE_BINDING_LIFECYCLE_STATES.READY_FOR_IMPORT);
    assert.ok(res.limitations.some(l => l.includes('TODO business logic placeholder')));

    const todoFinding = res.findings.find(f => f.code === 'BEHAVIOR_IMPLEMENTATION_INCOMPLETE');
    assert.ok(todoFinding);
    assert.equal(todoFinding.details.todos.length, 1);
  });

  await t.test('3. Detects contract mismatch when Fiori manifest binds an entitySet not in RAP CDS', () => {
    const projMismatch = {
      artifactRegistry: {
        artifacts: {
          'art-cds': {
            artifactId: 'art-cds',
            artifactType: 'CDS_VIEW_ENTITY',
            objectName: 'ZC_SalesOrder',
            filePath: 'ZC_SalesOrder.ddls.asddls',
            content: 'define root view entity ZC_SalesOrder as select from ZI_SalesOrder { key SalesOrder }'
          },
          'art-srvd': {
            artifactId: 'art-srvd',
            artifactType: 'RAP_SERVICE_DEFINITION',
            objectName: 'ZUI_SALESORDER',
            filePath: 'ZUI_SALESORDER.srvd.srvdsrv',
            content: 'define service ZUI_SALESORDER { expose ZC_SalesOrder; }'
          },
          'art-manifest': {
            artifactId: 'art-manifest',
            artifactType: 'FIORI_MANIFEST',
            filePath: 'webapp/manifest.json',
            content: JSON.stringify({
              'sap.app': {
                dataSources: {
                  mainService: { uri: '/sap/opu/odata4/sap/zui_salesorder/srvd_a4/sap/zui_salesorder/0001/' }
                }
              },
              'sap.ui5': {
                routing: {
                  targets: {
                    PurchaseOrderList: {
                      options: { settings: { entitySet: 'ZC_PurchaseOrder' } } // Mismatch! Not in RAP
                    }
                  }
                }
              }
            })
          }
        }
      }
    };

    const res = engine.evaluateProjectCompatibility(projMismatch);
    assert.equal(res.rating, COMPATIBILITY_RATINGS.REQUIRES_REMEDIATION);
    const contractFinding = res.findings.find(f => f.code === 'FIORI_ENTITY_SET_NOT_IN_RAP');
    assert.ok(contractFinding);
    assert.ok(contractFinding.message.includes('ZC_PurchaseOrder'));
  });
});
