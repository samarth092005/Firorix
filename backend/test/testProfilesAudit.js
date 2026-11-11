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
import { RAP_PROFILES } from '../src/generation/architecture/architectureContract.js';

const mockProject = {
  projectId: 'PRJ-AUDIT-001',
  projectName: 'Purchase Order Modernization',
  description: 'S21 Modernization',
  dataModelSpec: {
    entities: [
      {
        entityId: 'ENT-PO-01',
        name: 'PurchaseOrder',
        businessName: 'Purchase Order Header',
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
        entityId: 'ENT-PO-02',
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
        sourceEntityId: 'ENT-PO-01',
        targetEntityId: 'ENT-PO-02',
        relationshipType: 'COMPOSITION',
        cardinality: '[0..*]'
      }
    ]
  },
  requirementsSpec: {
    items: [
      {
        requirementId: 'REQ-001',
        title: 'Validate Supplier Active',
        description: 'Supplier must be active in company code',
        category: 'VALIDATION',
        status: 'CONFIRMED'
      },
      {
        requirementId: 'REQ-002',
        title: 'Calculate Net Price',
        description: 'Calculate net price from quantity and unit price',
        category: 'DETERMINATION',
        status: 'CONFIRMED'
      },
      {
        requirementId: 'REQ-003',
        title: 'Release Purchase Order',
        description: 'Release PO workflow approval',
        category: 'ACTION',
        status: 'CONFIRMED'
      }
    ]
  }
};

console.log('Testing Profiles...');
for (const profile of Object.values(RAP_PROFILES)) {
  if (profile === 'ARCHITECTURE_REVIEW_REQUIRED') continue;
  console.log(`\n================== Profile: ${profile} ==================`);
  const arch = defaultArchitectureDecisionEngine.evaluate(mockProject, { rapProfile: profile });
  console.log('Arch Selected:', arch.selectedProfile, '| Draft Enabled:', arch.draftDecision.enabled, '| Persistence:', arch.persistenceApproach);
  
  const tables = generatePersistenceTables(mockProject, arch);
  console.log('Tables generated:', tables.map(t => `${t.objectName} (${t.filePath})`));
  
  const cds = generateCdsEntities(mockProject, arch);
  console.log('CDS generated:', cds.map(c => `${c.objectName} (${c.filePath})`));
  
  const bdef = generateBehaviorDefinition(mockProject, arch);
  console.log('BDEF generated count:', bdef.length);
  if (bdef.length > 0) {
    console.log('BDEF Root Header:\n' + bdef[0].content.split('\n').slice(0, 7).join('\n'));
  }
  
  const classes = bdef.length > 0 ? generateBehaviorImplementationClass(mockProject, arch) : [];
  console.log('Classes generated count:', classes.length);
  if (classes.length > 0) {
    console.log('Class Sample Definition:\n' + classes[0].content.split('\n').slice(38, 55).join('\n'));
  }
  
  const srvd = generateServiceDefinition(mockProject, arch);
  console.log('SRVD generated count:', srvd.length);
  
  const manifest = generateFioriManifest(mockProject, arch);
  const manifestData = JSON.parse(manifest.content);
  console.log('Manifest mainService:', manifestData['sap.app'].dataSources.mainService.uri);
}
