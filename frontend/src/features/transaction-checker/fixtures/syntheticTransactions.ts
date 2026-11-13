import { TransactionFixture } from '../types';

/**
 * Synthetic Transaction Fixtures
 * Canonical source: data/transactions.csv
 * Strictly deterministic demo data.
 */
export const SYNTHETIC_TRANSACTIONS: TransactionFixture[] = [
  {
    systemId: 'S4H-DEV-200',
    tcode: 'ME21N',
    exists: true,
    classification: 'STANDARD',
    description: 'Create Purchase Order (synthetic demo description)',
    program: 'SAPLMEGUI_DEMO',
    screenNumber: '0100',
    packageName: 'DEMO_MM_CORE',
    originalSystem: 'SAP',
    softwareComponent: 'S4CORE 108',
    metadataStatus: 'COMPLETE',
    lookupBehavior: 'SUCCESS',
    tadir: {
      pgmid: 'R3TR',
      object: 'TRAN',
      objName: 'ME21N',
      devclass: 'DEMO_MM_CORE',
      srcsystem: 'SAP',
      softwareComponent: 'S4CORE 108'
    },
    evidence: ['TSTC fixture', 'TSTCT fixture', 'repository fixture (srcsystem SAP, package DEMO_MM_CORE)']
  },
  {
    systemId: 'S4H-DEV-200',
    tcode: 'VA01',
    exists: true,
    classification: 'STANDARD',
    description: 'Create Sales Order (synthetic demo description)',
    program: 'SAPMV45A_DEMO',
    screenNumber: '0100',
    packageName: 'DEMO_SD_CORE',
    originalSystem: 'SAP',
    softwareComponent: 'S4CORE 108',
    metadataStatus: 'COMPLETE',
    lookupBehavior: 'SUCCESS',
    tadir: {
      pgmid: 'R3TR',
      object: 'TRAN',
      objName: 'VA01',
      devclass: 'DEMO_SD_CORE',
      srcsystem: 'SAP',
      softwareComponent: 'S4CORE 108'
    },
    evidence: ['TSTC fixture', 'TSTCT fixture', 'repository fixture (srcsystem SAP, package DEMO_SD_CORE)']
  },
  {
    systemId: 'S4H-DEV-200',
    tcode: 'ZPURCHASE',
    exists: true,
    classification: 'CUSTOM',
    description: 'Custom Purchase Request Overview (synthetic)',
    program: 'ZFiorify_PURCHASE_DEMO',
    screenNumber: '0100',
    packageName: 'ZDEMO_PURCHASE',
    originalSystem: 'S21',
    softwareComponent: 'LOCAL_S21',
    metadataStatus: 'COMPLETE',
    lookupBehavior: 'SUCCESS',
    tadir: {
      pgmid: 'R3TR',
      object: 'TRAN',
      objName: 'ZPURCHASE',
      devclass: 'ZDEMO_PURCHASE',
      srcsystem: 'S21',
      softwareComponent: 'LOCAL_S21'
    },
    evidence: ['Customer namespace', 'customer package ZDEMO_PURCHASE', 'srcsystem S21 repository ownership']
  },
  {
    systemId: 'S4H-DEV-200',
    tcode: 'ZREPORT01',
    exists: true,
    classification: 'CUSTOM',
    description: 'Custom Operational Report (synthetic)',
    program: 'ZFiorify_REPORT_DEMO',
    screenNumber: '0100',
    packageName: 'ZDEMO_REPORTS',
    originalSystem: 'S21',
    softwareComponent: 'LOCAL_S21',
    metadataStatus: 'COMPLETE',
    lookupBehavior: 'SUCCESS',
    tadir: {
      pgmid: 'R3TR',
      object: 'TRAN',
      objName: 'ZREPORT01',
      devclass: 'ZDEMO_REPORTS',
      srcsystem: 'S21',
      softwareComponent: 'LOCAL_S21'
    },
    evidence: ['Customer namespace', 'customer package ZDEMO_REPORTS', 'srcsystem S21 repository ownership']
  },
  {
    systemId: 'S4H-DEV-200',
    tcode: 'ZNOMATCH',
    exists: true,
    classification: 'STANDARD',
    description: 'Demo Transaction Without Curated App Mapping (synthetic)',
    program: 'SAPLDEMO_NOMATCH',
    screenNumber: '0100',
    packageName: 'DEMO_MISC',
    originalSystem: 'SAP',
    softwareComponent: 'S4CORE 108',
    metadataStatus: 'COMPLETE',
    lookupBehavior: 'SUCCESS',
    tadir: {
      pgmid: 'R3TR',
      object: 'TRAN',
      objName: 'ZNOMATCH',
      devclass: 'DEMO_MISC',
      srcsystem: 'SAP',
      softwareComponent: 'S4CORE 108'
    },
    evidence: ['Synthetic standard repository fixture (srcsystem SAP, package DEMO_MISC)']
  },
  {
    systemId: 'S4H-DEV-200',
    tcode: 'ZINCOMPLETE',
    exists: true,
    classification: 'CUSTOM',
    description: undefined,
    program: undefined,
    screenNumber: '0100',
    packageName: 'ZDEMO_INCOMPLETE',
    originalSystem: 'S21',
    softwareComponent: 'LOCAL_S21',
    metadataStatus: 'INCOMPLETE',
    lookupBehavior: 'SUCCESS',
    tadir: {
      pgmid: 'R3TR',
      object: 'TRAN',
      objName: 'ZINCOMPLETE',
      devclass: 'ZDEMO_INCOMPLETE',
      srcsystem: 'S21',
      softwareComponent: 'LOCAL_S21'
    },
    evidence: ['Transaction exists; optional description/program omitted', 'customer package ZDEMO_INCOMPLETE']
  },
  {
    systemId: 'S4H-DEV-200',
    tcode: 'ZCONNERR',
    exists: false,
    classification: 'UNKNOWN',
    description: undefined,
    program: undefined,
    screenNumber: undefined,
    packageName: undefined,
    metadataStatus: 'NOT_AVAILABLE',
    lookupBehavior: 'CONNECTION_ERROR',
    evidence: ['Synthetic adapter fault']
  },
  {
    systemId: 'S4H-DEV-200',
    tcode: 'ZDENIED',
    exists: false,
    classification: 'UNKNOWN',
    description: undefined,
    program: undefined,
    screenNumber: undefined,
    packageName: undefined,
    metadataStatus: 'NOT_AVAILABLE',
    lookupBehavior: 'ACCESS_DENIED',
    evidence: ['Synthetic adapter fault']
  },
  {
    systemId: 'S4H-DEV-200',
    tcode: 'OB08',
    exists: true,
    classification: 'STANDARD',
    description: 'Maintain Exchange Rates',
    program: 'SAPL0S01',
    screenNumber: '0100',
    packageName: 'FIN_EXCHANGE',
    originalSystem: 'SAP',
    softwareComponent: 'S4CORE 108',
    metadataStatus: 'COMPLETE',
    lookupBehavior: 'SUCCESS',
    tadir: {
      pgmid: 'R3TR',
      object: 'TRAN',
      objName: 'OB08',
      devclass: 'FIN_EXCHANGE',
      srcsystem: 'SAP',
      softwareComponent: 'S4CORE 108'
    },
    evidence: [
      'TSTC verified (active transaction record)',
      'TSTCT verified (Maintain Exchange Rates)',
      'TADIR verified (standard SAP package FIN_EXCHANGE, srcsystem SAP)',
      'SAP-designated successor confirmed: F3616 (Currency Exchange Rates)'
    ]
  },
  {
    systemId: 'S4H-DEV-200',
    tcode: 'FB03',
    exists: true,
    classification: 'STANDARD',
    description: 'Display Document',
    program: 'SAPMF05L',
    screenNumber: '100',
    packageName: 'FIDC',
    originalSystem: 'SAP',
    softwareComponent: 'S4CORE 108',
    metadataStatus: 'COMPLETE',
    lookupBehavior: 'SUCCESS',
    tadir: {
      pgmid: 'R3TR',
      object: 'TRAN',
      objName: 'FB03',
      devclass: 'FIDC',
      srcsystem: 'SAP',
      softwareComponent: 'S4CORE 108'
    },
    evidence: [
      'TSTC verified (active transaction record)',
      'TSTCT verified (Display Document)',
      'TADIR verified (standard SAP package FIDC, srcsystem SAP)',
      'Catalogue entry confirms SAP GUI transaction availability through Fiori Launchpad'
    ]
  },
  {
    systemId: 'S4H-DEV-200',
    tcode: 'FBL1N',
    exists: true,
    classification: 'UNKNOWN',
    description: 'Vendor Line Items',
    program: 'RFITEMAP',
    screenNumber: '1000',
    packageName: undefined,
    originalSystem: undefined,
    softwareComponent: undefined,
    metadataStatus: 'INCOMPLETE',
    lookupBehavior: 'SUCCESS',
    evidence: [
      'TSTC verified (active transaction record)',
      'TSTCT verified (Vendor Line Items)',
      'TADIR classification: Pending verification (do not assume until TADIR verification)',
      'Official SAP Fiori catalogue matching: Pending verification'
    ]
  },
  {
    systemId: 'S4H-DEV-200',
    tcode: 'FB01',
    exists: true,
    classification: 'STANDARD',
    description: 'Post Document',
    program: 'SAPMF05A',
    screenNumber: '100',
    packageName: 'FBAS',
    originalSystem: 'SAP',
    softwareComponent: 'S4CORE 108',
    metadataStatus: 'COMPLETE',
    lookupBehavior: 'SUCCESS',
    tadir: {
      pgmid: 'R3TR',
      object: 'TRAN',
      objName: 'FB01',
      devclass: 'FBAS',
      srcsystem: 'SAP',
      softwareComponent: 'S4CORE 108'
    },
    evidence: [
      'TSTC verified (active transaction record)',
      'TSTCT verified (Post Document)',
      'TADIR verified (standard SAP package FBAS, srcsystem SAP)',
      'Catalogue entry confirms functional alternative: F0717 (Manage Journal Entries)'
    ]
  },
  {
    systemId: 'S4H-DEV-200',
    tcode: 'ZFIN_CUSTOM',
    exists: true,
    classification: 'CUSTOM',
    description: 'Custom Financial Posting Workbench',
    program: 'ZFIN_POST_DEMO',
    screenNumber: '100',
    packageName: 'ZFIN_DEV',
    originalSystem: 'S21',
    softwareComponent: 'LOCAL_S21',
    metadataStatus: 'COMPLETE',
    lookupBehavior: 'SUCCESS',
    tadir: {
      pgmid: 'R3TR',
      object: 'TRAN',
      objName: 'ZFIN_CUSTOM',
      devclass: 'ZFIN_DEV',
      srcsystem: 'S21',
      softwareComponent: 'LOCAL_S21'
    },
    evidence: [
      'TSTC verified (active custom transaction)',
      'TSTCT verified (Custom Financial Posting Workbench)',
      'TADIR verified (customer development package ZFIN_DEV, srcsystem S21)',
      'Classified as CUSTOM by multi-evidence consensus'
    ]
  },
  {
    systemId: 'S4H-DEV-200',
    tcode: 'ZCONFLICT',
    exists: true,
    classification: 'UNKNOWN',
    description: 'Conflict Test: Z-Prefix with Standard TADIR Package',
    program: 'ZTEST_PROG',
    screenNumber: '100',
    packageName: 'FIDC',
    originalSystem: 'SAP',
    softwareComponent: 'S4CORE 108',
    metadataStatus: 'COMPLETE',
    lookupBehavior: 'SUCCESS',
    tadir: {
      pgmid: 'R3TR',
      object: 'TRAN',
      objName: 'ZCONFLICT',
      devclass: 'FIDC',
      srcsystem: 'SAP',
      softwareComponent: 'S4CORE 108'
    },
    evidence: [
      'TSTC verified (transaction exists)',
      'TSTCT verified (Conflict Test: Z-Prefix with Standard TADIR Package)',
      'Conflicting evidence: Z-prefix used but TADIR srcsystem is SAP and package is FIDC',
      'Classified as UNKNOWN due to evidence conflict'
    ]
  },
  {
    systemId: 'S4H-DEV-200',
    tcode: 'ZNOAPP',
    exists: true,
    classification: 'CUSTOM',
    description: 'Customer Finance Transaction Without Standard App',
    program: 'ZNOAPP_DEMO',
    screenNumber: '100',
    packageName: 'ZFIN_DEV',
    originalSystem: 'S21',
    softwareComponent: 'LOCAL_S21',
    metadataStatus: 'COMPLETE',
    lookupBehavior: 'SUCCESS',
    tadir: {
      pgmid: 'R3TR',
      object: 'TRAN',
      objName: 'ZNOAPP',
      devclass: 'ZFIN_DEV',
      srcsystem: 'S21',
      softwareComponent: 'LOCAL_S21'
    },
    evidence: [
      'TSTC verified (active custom transaction)',
      'TSTCT verified (Customer Finance Transaction Without Standard App)',
      'TADIR verified (customer package ZFIN_DEV, original system S21)',
      'Curated catalogue check confirms NO standard SAP Fiori app exists'
    ]
  },
  {
    systemId: 'S4H-DEV-200',
    tcode: 'F-53',
    exists: true,
    classification: 'STANDARD',
    description: 'Post Outgoing Payments',
    program: 'SAPMF05A',
    screenNumber: '0100',
    packageName: 'FBAS',
    originalSystem: 'SAP',
    softwareComponent: 'S4CORE 108',
    metadataStatus: 'COMPLETE',
    lookupBehavior: 'SUCCESS',
    tadir: {
      pgmid: 'R3TR',
      object: 'TRAN',
      objName: 'F-53',
      devclass: 'FBAS',
      srcsystem: 'SAP',
      softwareComponent: 'S4CORE 108'
    },
    evidence: [
      'TSTC verified (Post Outgoing Payments exists)',
      'TSTCT verified (Post Outgoing Payments)',
      'TADIR verified (package FBAS, original system SAP)',
      'SAP standard payment transaction'
    ]
  },
  {
    systemId: 'S4H-DEV-200',
    tcode: 'F-28',
    exists: true,
    classification: 'STANDARD',
    description: 'Post Incoming Payments',
    program: 'SAPMF05A',
    screenNumber: '0100',
    packageName: 'FBAS',
    originalSystem: 'SAP',
    softwareComponent: 'S4CORE 108',
    metadataStatus: 'COMPLETE',
    lookupBehavior: 'SUCCESS',
    tadir: {
      pgmid: 'R3TR',
      object: 'TRAN',
      objName: 'F-28',
      devclass: 'FBAS',
      srcsystem: 'SAP',
      softwareComponent: 'S4CORE 108'
    },
    evidence: [
      'TSTC verified (Post Incoming Payments exists)',
      'TSTCT verified (Post Incoming Payments)',
      'TADIR verified (package FBAS, original system SAP)',
      'SAP standard payment transaction'
    ]
  },
  {
    systemId: 'S4H-DEV-200',
    tcode: 'FS00',
    exists: true,
    classification: 'STANDARD',
    description: 'Manage G/L Account Master Data',
    program: 'SAPLGL_ACCOUNT_MASTER_MAINTAIN',
    screenNumber: '0100',
    packageName: 'GL_ACCOUNT_SERVICES',
    originalSystem: 'SAP',
    softwareComponent: 'S4CORE 108',
    metadataStatus: 'COMPLETE',
    lookupBehavior: 'SUCCESS',
    tadir: {
      pgmid: 'R3TR',
      object: 'TRAN',
      objName: 'FS00',
      devclass: 'GL_ACCOUNT_SERVICES',
      srcsystem: 'SAP',
      softwareComponent: 'S4CORE 108'
    },
    evidence: [
      'TSTC verified (Manage G/L Account Master Data exists)',
      'TSTCT verified (G/L Master Maintenance)',
      'TADIR verified (package GL_ACCOUNT_SERVICES, original system SAP)',
      'SAP standard G/L transaction'
    ]
  }
];
