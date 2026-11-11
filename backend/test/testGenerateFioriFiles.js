import fs from 'node:fs';
import path from 'node:path';
import { generateFioriManifest } from '../src/generation/fiori/manifestGenerator.js';
import { generateFioriAnnotationsXml } from '../src/generation/fiori/fioriAnnotationGenerator.js';
import { generateFioriProjectScaffolding } from '../src/generation/fiori/fioriProjectStructureGenerator.js';

const mockProject = {
  projectId: 'PRJ-FIORI-TEST',
  projectName: 'Purchase Order Modernization',
  description: 'SAP S/4HANA 2023 Modernization',
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
      }
    ],
    relationships: []
  }
};

const outputDir = path.resolve('data', 'generated_sample_fiori_app');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// 1. Generate Manifest
const manifestArt = generateFioriManifest(mockProject, {});
fs.mkdirSync(path.join(outputDir, 'webapp'), { recursive: true });
fs.writeFileSync(path.join(outputDir, manifestArt.filePath), manifestArt.content, 'utf-8');

// 2. Generate Annotations
const annotArt = generateFioriAnnotationsXml(mockProject, {});
fs.mkdirSync(path.join(outputDir, 'webapp', 'annotations'), { recursive: true });
fs.writeFileSync(path.join(outputDir, annotArt.filePath), annotArt.content, 'utf-8');

// 3. Generate Scaffolding
const scaffoldArts = generateFioriProjectScaffolding(mockProject, {});
for (const art of scaffoldArts) {
  const p = path.join(outputDir, art.filePath);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, art.content, 'utf-8');
}

console.log('Generated Fiori App artifacts in:', outputDir);
console.log('Files:');
function listFiles(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const res = path.resolve(dir, e.name);
    if (e.isDirectory()) {
      listFiles(res);
    } else {
      console.log(' -', path.relative(outputDir, res));
    }
  }
}
listFiles(outputDir);
