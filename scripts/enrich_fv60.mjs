import fs from 'node:fs';

// 1. Enrich fiori_app_catalog_cache.json
const catFile = 'backend/data/fiori_app_catalog_cache.json';
const cat = JSON.parse(fs.readFileSync(catFile, 'utf8'));

const appsToAdd = [
  {
    appId: 'FV60',
    appName: 'Park Incoming Invoices',
    description: 'Accounts Payable Accountant : Carries out the most important functions in accounts payable accounting with a special focus on parking and verifying supplier invoices.',
    appType: 'SAP GUI',
    uiTechnology: 'SAP GUI for HTML',
    businessProcess: 'Sourcing and Procurement, Finance',
    lineOfBusiness: 'Finance',
    productVersion: 'SAP S/4HANA Cloud Private Edition 2025',
    softwareComponent: 'S4CORE 109',
    businessRole: 'SAP_BR_AP_ACCOUNTANT',
    businessCatalog: 'SAP_SFIN_BC_AP_INVOICES',
    technicalCatalog: 'SAP_TC_FIN_FO_BE_APPS:S4FIN',
    odataServices: [],
    documentationUrl: "https://fioriappslibrary.hana.ondemand.com/sap/fix/externalViewer/#/detail/Apps('FV60')/",
    provenance: 'OFFICIAL_CATALOGUE_LIVE',
    retrievalTimestamp: new Date().toISOString()
  },
  {
    appId: 'F0859A',
    appName: 'Manage Supplier Invoices',
    description: 'Accounts Payable Accountant : Allows parking, creating, and displaying supplier invoices with optical character recognition and automated line matching.',
    appType: 'Transactional',
    uiTechnology: 'SAP Fiori elements',
    businessProcess: 'Sourcing and Procurement, Finance',
    lineOfBusiness: 'Finance',
    productVersion: 'SAP S/4HANA Cloud Private Edition 2025',
    softwareComponent: 'S4CORE 109',
    businessRole: 'SAP_BR_AP_ACCOUNTANT',
    businessCatalog: 'SAP_SFIN_BC_AP_INVOICES',
    technicalCatalog: 'SAP_TC_FIN_FO_COMMON',
    odataServices: ['MM_SUPPLIER_INVOICE_PROCESS_SRV'],
    sapui5Component: 'ui.ssuite.s2p.mm.pur.inv.manage.s1',
    documentationUrl: "https://fioriappslibrary.hana.ondemand.com/sap/fix/externalViewer/#/detail/Apps('F0859A')/",
    provenance: 'OFFICIAL_CATALOGUE_LIVE',
    retrievalTimestamp: new Date().toISOString()
  }
];

for (const a of appsToAdd) {
  if (!cat.some((x) => x.appId === a.appId)) {
    cat.push(a);
    console.log('Added to catalogue cache:', a.appId);
  }
}
fs.writeFileSync(catFile, JSON.stringify(cat, null, 2), 'utf8');

// 2. Enrich transaction_master_snapshot.json
const snapFile = 'backend/data/transaction_master_snapshot.json';
const snap = JSON.parse(fs.readFileSync(snapFile, 'utf8'));
const records = snap.records || snap;

const fv60Tx = {
  tcode: 'FV60',
  description: 'Park Incoming Invoices',
  program: 'SAPMF05A',
  screenNumber: '0100',
  packageName: 'FBAS',
  originalSystem: 'SAP',
  softwareComponent: 'S4CORE 108',
  classification: 'STANDARD',
  systemId: 'S21-200',
  client: '200',
  language: 'EN',
  extractionDate: '2026-11-04T08:00:00.000Z',
  snapshotVersion: 'S21_2023_FPS02_V1',
  provenance: 'AUTHORITATIVE_DDIC_SNAPSHOT',
  sourceTables: ['TSTC', 'TSTCT', 'TADIR', 'TDEVC', 'CVERS']
};

if (!records.some((x) => x.tcode === 'FV60')) {
  records.push(fv60Tx);
  console.log('Added FV60 to transaction master snapshot');
}
fs.writeFileSync(snapFile, JSON.stringify(snap, null, 2), 'utf8');
console.log('Enrichment complete!');
