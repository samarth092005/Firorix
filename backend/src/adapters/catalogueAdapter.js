/**
 * Official Curated Fiori Catalogue Adapter for S/4HANA 2023
 */
export const FIORI_CATALOGUE = [
  {
    appId: 'DEMO_APP_PO_001',
    appName: 'Purchase Order Workbench (Demo)',
    appType: 'TRANSACTIONAL',
    uiTechnology: 'SAP Fiori elements',
    productVersion: 'S4HANA_2023_FPS_DEMO'
  },
  {
    appId: 'DEMO_APP_SO_001',
    appName: 'Sales Order Processing (Demo)',
    appType: 'TRANSACTIONAL',
    uiTechnology: 'SAP Fiori elements',
    productVersion: 'S4HANA_2023_FPS_DEMO'
  },
  {
    appId: 'DEMO_APP_PUR_002',
    appName: 'Purchase Request Monitor (Demo)',
    appType: 'ANALYTICAL',
    uiTechnology: 'SAPUI5 freestyle',
    productVersion: 'S4HANA_2023_FPS_DEMO'
  },
  {
    appId: 'DEMO_APP_OLD_001',
    appName: 'Legacy Purchasing Overview (Demo)',
    appType: 'TRANSACTIONAL',
    uiTechnology: 'SAP Fiori elements',
    productVersion: 'S4HANA_2020_DEMO'
  },
  {
    appId: 'F3616',
    appName: 'Currency Exchange Rates',
    appType: 'SAP Fiori - Transactional',
    uiTechnology: 'SAP Fiori elements',
    productVersion: 'SAP Fiori for SAP S/4HANA 2023'
  },
  {
    appId: 'FB03',
    appName: 'Display Document',
    appType: 'SAP GUI',
    uiTechnology: 'SAP GUI for HTML',
    productVersion: 'SAP Fiori for SAP S/4HANA 2023'
  },
  {
    appId: 'F0717',
    appName: 'Manage Journal Entries',
    appType: 'SAP Fiori - Transactional',
    uiTechnology: 'SAP Fiori elements',
    productVersion: 'SAP Fiori for SAP S/4HANA 2023'
  },
  {
    appId: 'F0859A',
    appName: 'Manage Supplier Invoices',
    appType: 'Transactional',
    uiTechnology: 'SAP Fiori elements',
    productVersion: 'SAP Fiori for SAP S/4HANA 2023'
  },
  {
    appId: 'FV60',
    appName: 'Park Incoming Invoices',
    appType: 'SAP GUI',
    uiTechnology: 'SAP GUI for HTML',
    productVersion: 'SAP Fiori for SAP S/4HANA 2023'
  },
  {
    appId: 'F3445',
    appName: 'Manage Number Range Intervals',
    appType: 'Transactional',
    uiTechnology: 'SAP Fiori elements',
    productVersion: 'SAP Fiori for SAP S/4HANA 2023'
  },
  {
    appId: 'FBN1',
    appName: 'Accounting Document Number Ranges (WebGUI)',
    appType: 'SAP GUI',
    uiTechnology: 'SAP GUI for HTML',
    productVersion: 'SAP Fiori for SAP S/4HANA 2023'
  }
];

export const TCODE_MAPPINGS = [
  {
    mappingId: 'MAP-001',
    systemId: 'S4H-DEV-200',
    tcode: 'ME21N',
    appId: 'DEMO_APP_PO_001',
    matchType: 'DIRECT_MATCH',
    rationale: 'Exact T-Code association in curated catalogue.',
    releaseCompatibility: 'COMPATIBLE'
  },
  {
    mappingId: 'MAP-002',
    systemId: 'S4H-DEV-200',
    tcode: 'VA01',
    appId: 'DEMO_APP_SO_001',
    matchType: 'DIRECT_MATCH',
    rationale: 'Exact T-Code association in curated catalogue.',
    releaseCompatibility: 'COMPATIBLE'
  },
  {
    mappingId: 'MAP-003',
    systemId: 'S4H-DEV-200',
    tcode: 'ZPURCHASE',
    appId: 'DEMO_APP_PUR_002',
    matchType: 'RELATED_MATCH',
    rationale: 'Curated mapping: related purchasing workflow; equivalence not established.',
    releaseCompatibility: 'COMPATIBLE'
  },
  {
    mappingId: 'MAP-004',
    systemId: 'S4H-DEV-200',
    tcode: 'ME21N',
    appId: 'DEMO_APP_OLD_001',
    matchType: 'POSSIBLE_MATCH',
    rationale: 'Legacy candidate intentionally incompatible with target release.',
    releaseCompatibility: 'INCOMPATIBLE'
  },
  {
    mappingId: 'MAP-005',
    systemId: 'S4H-DEV-200',
    tcode: 'OB08',
    appId: 'F3616',
    matchType: 'EXPLICIT_SUCCESSOR',
    rationale: 'SAP-designated successor confirmed: Currency Exchange Rates (F3616) built on SAP Fiori elements.',
    releaseCompatibility: 'COMPATIBLE'
  },
  {
    mappingId: 'MAP-006',
    systemId: 'S4H-DEV-200',
    tcode: 'FB03',
    appId: 'FB03',
    matchType: 'SAP_GUI_HTML',
    rationale: 'Classic SAP GUI transaction hosted in Fiori Launchpad via SAP GUI for HTML (WebGUI).',
    releaseCompatibility: 'COMPATIBLE'
  },
  {
    mappingId: 'MAP-007',
    systemId: 'S4H-DEV-200',
    tcode: 'FBL1N',
    appId: 'PENDING',
    matchType: 'CATALOGUE_PENDING_VERIFICATION',
    rationale: 'TSTC and TSTCT verified. TADIR classification and official Fiori catalogue matching remain pending verification.',
    releaseCompatibility: 'UNKNOWN'
  },
  {
    mappingId: 'MAP-008',
    systemId: 'S4H-DEV-200',
    tcode: 'FB01',
    appId: 'F0717',
    matchType: 'FUNCTIONAL_ALTERNATIVE',
    rationale: 'Functional alternative: Manage Journal Entries (F0717) built on SAP Fiori elements is the official modern successor workflow.',
    releaseCompatibility: 'COMPATIBLE'
  },
  {
    mappingId: 'MAP-009',
    systemId: 'S4H-DEV-200',
    tcode: 'ZNOAPP',
    appId: 'NONE',
    matchType: 'NO_STANDARD_APP_EXISTS',
    rationale: 'Customer custom finance transaction. Verified absence: no standard SAP Fiori application exists for this customer development.',
    releaseCompatibility: 'COMPATIBLE'
  },
  {
    mappingId: 'MAP-010',
    systemId: 'S4H-DEV-200',
    tcode: 'FV60',
    appId: 'F0859A',
    matchType: 'EXPLICIT_SUCCESSOR',
    rationale: 'Official modern successor: Manage Supplier Invoices (F0859A) built on SAP Fiori elements replaces legacy parking workflows.',
    releaseCompatibility: 'COMPATIBLE'
  },
  {
    mappingId: 'MAP-011',
    systemId: 'S4H-DEV-200',
    tcode: 'FV60',
    appId: 'FV60',
    matchType: 'SAP_GUI_HTML',
    rationale: 'Classic SAP GUI transaction hosted in Fiori Launchpad via SAP GUI for HTML (WebGUI).',
    releaseCompatibility: 'COMPATIBLE'
  },
  {
    mappingId: 'MAP-012',
    systemId: 'S4H-DEV-200',
    tcode: 'FBN1',
    appId: 'F3445',
    matchType: 'EXPLICIT_SUCCESSOR',
    rationale: 'Official modern successor: Manage Number Range Intervals (F3445) built on SAP Fiori elements.',
    releaseCompatibility: 'COMPATIBLE'
  },
  {
    mappingId: 'MAP-013',
    systemId: 'S4H-DEV-200',
    tcode: 'FBN1',
    appId: 'FBN1',
    matchType: 'SAP_GUI_HTML',
    rationale: 'Classic configuration transaction hosted in Fiori Launchpad via SAP GUI for HTML (WebGUI).',
    releaseCompatibility: 'COMPATIBLE'
  }
];

export class CatalogueAdapter {
  getAppById(appId) {
    return FIORI_CATALOGUE.find((a) => a.appId === appId);
  }

  getMappingsForTCode(tcode) {
    const trimmed = (tcode || '').trim().toUpperCase();
    return TCODE_MAPPINGS.filter((m) => m.tcode.toUpperCase() === trimmed);
  }
}

export const catalogueAdapter = new CatalogueAdapter();
