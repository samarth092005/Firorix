/**
 * FioriX — GEN-06: SAP Fiori Elements Generator Test Suite
 *
 * Verifies:
 * 1. Fiori Elements manifest.json generation (OData V4, S/4HANA 2023 baseline, targets, entitySet binding).
 * 2. XML annotations.xml generation (UI.HeaderInfo, UI.LineItem, UI.SelectionFields, UI.Facets).
 * 3. Application project structure (Component.js, index.html, i18n, package.json, ui5.yaml).
 * 4. Cross-artifact consistency: manifest entitysets match GEN-05 CDS views.
 * 5. End-to-end integration: GEN-05 ABAP + GEN-06 Fiori synthesis into shared Artifact Registry.
 * 6. Static validation engine evaluates complete multi-artifact project as VALID.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { generateFioriManifest } from '../src/generation/fiori/manifestGenerator.js';
import { generateFioriAnnotationsXml } from '../src/generation/fiori/fioriAnnotationGenerator.js';
import { generateFioriProjectScaffolding } from '../src/generation/fiori/fioriProjectStructureGenerator.js';
import { FioriGeneratorEngine } from '../src/generation/fiori/fioriGeneratorEngine.js';
import { AbapGeneratorEngine } from '../src/generation/abap/abapGeneratorEngine.js';
import { ArchitectureDecisionEngine } from '../src/generation/architecture/architectureDecisionEngine.js';
import { StaticValidationEngine } from '../src/generation/validation/staticValidationEngine.js';
import { ArtifactRegistry } from '../src/generation/artifacts/artifactRegistry.js';
import { generatePersistenceTables } from '../src/generation/abap/persistenceTableGenerator.js';
import { generateCdsEntities } from '../src/generation/abap/cdsViewEntityGenerator.js';
import { generateBehaviorDefinition } from '../src/generation/abap/rapBehaviorGenerator.js';
import { generateBehaviorImplementationClass } from '../src/generation/abap/behaviorClassGenerator.js';
import { generateServiceDefinition } from '../src/generation/abap/serviceDefinitionGenerator.js';
import { generateServiceBindingProposal } from '../src/generation/abap/serviceBindingProposalGenerator.js';
import { generateDclAccessControl } from '../src/generation/abap/dclAccessControlGenerator.js';

describe('GEN-06: SAP Fiori Elements Generator & Cross-Artifact Validation', () => {
  const archEngine = new ArchitectureDecisionEngine();
  const validator = new StaticValidationEngine();

  const sampleProject = {
    projectId: 'GEN-FIORI-001',
    projectName: 'Vendor Invoice Processing',
    targetRelease: 'SAP S/4HANA 2023 On-Premise',
    targetPackage: 'ZFI_INVOICES',
    origin: 'DISCOVERY_BUILD',
    requirementsSpec: {
      specVersion: 1,
      items: [
        { requirementId: 'REQ-01', title: 'Invoice Approval Workflow', category: 'ACTION', status: 'CONFIRMED' },
        { requirementId: 'REQ-02', title: 'Tax Amount Verification', category: 'VALIDATION', status: 'CONFIRMED' }
      ]
    },
    dataModelSpec: {
      specVersion: 1,
      entities: [
        {
          entityId: 'E-INV-01',
          name: 'ZVendorInvoice',
          businessName: 'Vendor Invoice',
          entityType: 'ROOT',
          isRoot: true,
          tableName: 'ZINV_HEADER',
          fields: [
            { name: 'InvoiceID', isKey: true, isMandatory: true, type: 'abap.char', length: 10, semanticRole: 'DOCUMENT_NUMBER', label: 'Invoice Number' },
            { name: 'VendorNumber', isKey: false, isMandatory: true, type: 'abap.char', length: 10, semanticRole: 'CODE', label: 'Supplier ID' },
            { name: 'GrossAmount', isKey: false, isMandatory: false, type: 'abap.curr', precision: 15, scale: 2, semanticRole: 'AMOUNT', cukyField: 'DocCurrency', label: 'Total Amount' },
            { name: 'DocCurrency', isKey: false, isMandatory: false, type: 'abap.cuky', length: 5, semanticRole: 'CURRENCY_CODE', label: 'Currency' }
          ]
        },
        {
          entityId: 'E-INV-02',
          name: 'ZInvoiceItem',
          businessName: 'Invoice Line Item',
          entityType: 'CHILD',
          tableName: 'ZINV_ITEM',
          parentEntity: 'ZVendorInvoice',
          fields: [
            { name: 'InvoiceID', isKey: true, isMandatory: true, type: 'abap.char', length: 10, semanticRole: 'PARENT_KEY' },
            { name: 'ItemNumber', isKey: true, isMandatory: true, type: 'abap.numc', length: 4, semanticRole: 'ITEM_NUMBER' },
            { name: 'ItemAmount', isKey: false, isMandatory: false, type: 'abap.curr', precision: 15, scale: 2, semanticRole: 'AMOUNT', cukyField: 'ItemCurrency' },
            { name: 'ItemCurrency', isKey: false, isMandatory: false, type: 'abap.cuky', length: 5, semanticRole: 'CURRENCY_CODE' }
          ]
        }
      ],
      relationships: [
        {
          relationshipId: 'R-INV-01',
          name: '_InvoiceItems',
          relationshipType: 'COMPOSITION',
          sourceEntityId: 'E-INV-01',
          targetEntityId: 'E-INV-02',
          cardinality: '[0..*]',
          mapping: [{ sourceField: 'InvoiceID', targetField: 'InvoiceID' }]
        }
      ]
    }
  };

  it('1. Generates webapp/manifest.json conforming to SAP Fiori Elements for OData V4 standards', () => {
    const arch = archEngine.evaluate(sampleProject);
    const manifestArt = generateFioriManifest(sampleProject, arch, {
      appId: 'com.fiorix.vendor.invoices',
      pageTitle: 'Manage Vendor Invoices'
    });

    assert.ok(manifestArt);
    assert.equal(manifestArt.filePath, 'webapp/manifest.json');
    assert.equal(manifestArt.language, 'JSON');

    const manifest = JSON.parse(manifestArt.content);
    assert.equal(manifest['sap.app'].id, 'com.fiorix.vendor.invoices');
    assert.equal(manifest['sap.app'].title, 'Manage Vendor Invoices');
    assert.equal(manifest['sap.app'].dataSources.mainService.settings.odataVersion, '4.0');
    assert.equal(manifest['sap.app'].dataSources.mainService.uri, '/sap/opu/odata4/sap/zui_zvendorinvoice/srvd/sap/zui_zvendorinvoice/0001/');
    assert.equal(manifest['sap.ui5'].dependencies.minUI5Version, '1.120.0');

    // Routing & Targets
    assert.ok(manifest['sap.ui5'].routing.targets.ZVendorInvoiceListReport);
    assert.equal(manifest['sap.ui5'].routing.targets.ZVendorInvoiceListReport.options.settings.entitySet, 'ZVendorInvoice');
    assert.ok(manifest['sap.ui5'].routing.targets.ZVendorInvoiceObjectPage);
  });

  it('2. Generates webapp/annotations/annotations.xml with valid OData V4 XML vocabularies', () => {
    const arch = archEngine.evaluate(sampleProject);
    const annotArt = generateFioriAnnotationsXml(sampleProject, arch);

    assert.ok(annotArt);
    assert.equal(annotArt.filePath, 'webapp/annotations/annotations.xml');
    assert.equal(annotArt.language, 'XML');

    assert.ok(annotArt.content.startsWith('<?xml version="1.0" encoding="utf-8"?>'));
    assert.ok(annotArt.content.includes('<edmx:Edmx'));
    assert.ok(annotArt.content.includes('Term="UI.HeaderInfo"'));
    assert.ok(annotArt.content.includes('Term="UI.LineItem"'));
    assert.ok(annotArt.content.includes('Term="UI.SelectionFields"'));
    assert.ok(annotArt.content.includes('Term="UI.Facets"'));
    assert.ok(annotArt.content.includes('Path="InvoiceID"'));
    assert.ok(annotArt.content.includes('Path="GrossAmount"'));
    assert.ok(annotArt.content.endsWith('</edmx:Edmx>\n'));
  });

  it('3. Generates complete frontend scaffolding (Component.js, index.html, i18n, package.json, ui5.yaml, README)', () => {
    const arch = archEngine.evaluate(sampleProject);
    const scaffolding = generateFioriProjectScaffolding(sampleProject, arch, {
      appId: 'com.fiorix.vendor.invoices'
    });

    assert.equal(scaffolding.length, 6);

    const comp = scaffolding.find((s) => s.objectName === 'Component.js');
    assert.ok(comp.content.includes('AppComponent.extend("com.fiorix.vendor.invoices.Component"'));

    const html = scaffolding.find((s) => s.objectName === 'index.html');
    assert.ok(html.content.includes('data-sap-ui-theme="sap_horizon"'));
    assert.ok(html.content.includes('data-name="com.fiorix.vendor.invoices"'));

    const i18n = scaffolding.find((s) => s.objectName === 'i18n.properties');
    assert.ok(i18n.content.includes('entity.ZVendorInvoice=Vendor Invoice'));
    assert.ok(i18n.content.includes('field.ZVendorInvoice.InvoiceID=Invoice Number'));

    const pkg = scaffolding.find((s) => s.objectName === 'package.json');
    const pkgJson = JSON.parse(pkg.content);
    assert.equal(pkgJson.name, 'fiorix-zvendorinvoice-ui');

    const yaml = scaffolding.find((s) => s.objectName === 'ui5.yaml');
    assert.ok(yaml.content.includes('version: "1.120.0"'));
    assert.ok(yaml.content.includes('themelib_sap_horizon'));
  });

  it('4. Cross-Artifact Validation: verifies full GEN-05 and GEN-06 integration in shared ArtifactRegistry', () => {
    const project = JSON.parse(JSON.stringify(sampleProject));
    const arch = archEngine.evaluate(project);
    project.architectureSpec = arch;

    // 1. Generate GEN-05 artifacts
    const abapArts = [
      ...generatePersistenceTables(project, arch),
      ...generateCdsEntities(project, arch),
      ...generateBehaviorDefinition(project, arch),
      ...generateBehaviorImplementationClass(project, arch),
      ...generateServiceDefinition(project, arch),
      ...generateServiceBindingProposal(project, arch),
      ...generateDclAccessControl(project, arch)
    ];

    ArtifactRegistry.commitArtifacts(project, abapArts, { phase: 'GEN_05_ABAP' });

    // 2. Generate GEN-06 artifacts
    const fioriArts = [
      generateFioriManifest(project, arch, { appId: 'com.fiorix.vendor.invoices' }),
      generateFioriAnnotationsXml(project, arch),
      ...generateFioriProjectScaffolding(project, arch, { appId: 'com.fiorix.vendor.invoices' })
    ];

    ArtifactRegistry.commitArtifacts(project, fioriArts, { phase: 'GEN_06_FIORI' });

    assert.equal(project.artifactRegistry.generationRuns.length, 2);
    assert.ok(Object.keys(project.artifactRegistry.artifacts).length >= 15);

    // 3. Run Static Validation Engine across all artifacts
    const report = validator.validateProject(project);
    assert.equal(report.errorsCount, 0, 'Cross-artifact validation must have 0 errors');
    assert.equal(report.isValid, true);
  });
});
