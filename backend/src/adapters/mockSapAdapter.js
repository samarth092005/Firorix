import { EvidenceClassifier } from '../evidenceClassifier.js';
import { STANDARD_TRANSACTION_CATALOG } from '../services/standardTransactionKnowledge.js';

export const SYSTEMS = [
  {
    systemId: 'S21-200',
    systemName: 'S21 SAP S/4HANA 2023 Private Edition (Live Target)',
    client: '200',
    release: 'SAP S/4HANA 2023 Private Edition',
    mode: 'LIVE_SAP',
    active: true,
    softwareComponents: ['S4CORE 108', 'SAP_BASIS 758', 'SAP_UI 758', 'SAP_GWFND 758'],
    rfcDestination: 'S21_RFC_DISCOVERY',
    odataServiceUrl: '/sap/opu/odata/sap/Z_FIORIX_DISCOVERY_SRV'
  },
  {
    systemId: 'S21-200-DEMO',
    systemName: 'S21 SAP S/4HANA 2023 (Curated Demo Snapshot)',
    client: '200',
    release: 'SAP S/4HANA 2023 Private Edition',
    mode: 'MOCK',
    active: true,
    softwareComponents: ['S4CORE 108', 'SAP_BASIS 758', 'SAP_UI 758', 'SAP_GWFND 758']
  },
  {
    systemId: 'S4H-DEV-200',
    systemName: 'S/4HANA Development (Demo)',
    client: '200',
    release: 'S4HANA_2023_FPS_DEMO',
    mode: 'MOCK',
    active: true
  },
  {
    systemId: 'S4H-QAS-200',
    systemName: 'S/4HANA Quality (Demo)',
    client: '200',
    release: 'S4HANA_2023_FPS_DEMO',
    mode: 'MOCK',
    active: true
  }
];

export const TRANSACTIONS = [
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
    tadir: { devclass: 'DEMO_MM_CORE', srcsystem: 'SAP', softwareComponent: 'S4CORE 108' },
    evidence: ['TSTC fixture', 'TSTCT fixture', 'repository fixture (srcsystem SAP, package DEMO_MM_CORE)']
  },
  {
    systemId: 'S4H-DEV-200',
    tcode: 'FB50',
    exists: true,
    classification: 'STANDARD',
    description: 'Enter G/L Account Document',
    program: 'SAPMF05A',
    screenNumber: '0100',
    packageName: 'FBAS',
    originalSystem: 'SAP',
    softwareComponent: 'S4CORE 108',
    metadataStatus: 'COMPLETE',
    lookupBehavior: 'SUCCESS',
    authorizationObject: 'F_BKPF_BUK',
    tadir: { devclass: 'FBAS', srcsystem: 'SAP', softwareComponent: 'S4CORE 108' },
    evidence: ['TSTC verified', 'TSTCT verified', 'TADIR verified (standard SAP package FBAS, srcsystem SAP)', 'Catalogue confirms leading standard app: F0705']
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
    authorizationObject: 'F_BKPF_BUK',
    tadir: { devclass: 'FBAS', srcsystem: 'SAP', softwareComponent: 'S4CORE 108' },
    evidence: ['TSTC verified', 'TSTCT verified', 'TADIR verified (standard SAP package FBAS, srcsystem SAP)', 'Catalogue confirms partial fit standard app: F1612']
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
    tadir: { devclass: 'DEMO_SD_CORE', srcsystem: 'SAP', softwareComponent: 'S4CORE 108' },
    evidence: ['TSTC fixture', 'TSTCT fixture', 'repository fixture (srcsystem SAP, package DEMO_SD_CORE)']
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
    tadir: { devclass: 'FIN_EXCHANGE', srcsystem: 'SAP', softwareComponent: 'S4CORE 108' },
    evidence: ['TSTC verified', 'TSTCT verified', 'TADIR verified (standard SAP package FIN_EXCHANGE, srcsystem SAP)', 'SAP-designated successor confirmed: F3616']
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
    tadir: { devclass: 'FIDC', srcsystem: 'SAP', softwareComponent: 'S4CORE 108' },
    evidence: ['TSTC verified', 'TSTCT verified', 'TADIR verified (standard SAP package FIDC, srcsystem SAP)', 'Catalogue entry confirms SAP GUI transaction']
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
    tadir: { devclass: 'FBAS', srcsystem: 'SAP', softwareComponent: 'S4CORE 108' },
    evidence: ['TSTC verified', 'TSTCT verified', 'TADIR verified (standard SAP package FBAS, srcsystem SAP)', 'Catalogue confirms functional alternative: F0717']
  },
  {
    systemId: 'S4H-DEV-200',
    tcode: 'FV60',
    exists: true,
    classification: 'STANDARD',
    description: 'Park Incoming Invoices',
    program: 'SAPMF05A',
    screenNumber: '0100',
    packageName: 'FBAS',
    originalSystem: 'SAP',
    softwareComponent: 'S4CORE 108',
    metadataStatus: 'COMPLETE',
    lookupBehavior: 'SUCCESS',
    authorizationObject: 'F_BKPF_BUK',
    tadir: { devclass: 'FBAS', srcsystem: 'SAP', softwareComponent: 'S4CORE 108' },
    evidence: ['TSTC verified', 'TSTCT verified', 'TADIR verified (standard SAP package FBAS, srcsystem SAP)', 'Catalogue confirms modern successor: F0859A']
  },
  {
    systemId: 'S4H-DEV-200',
    tcode: 'FB60',
    exists: true,
    classification: 'STANDARD',
    description: 'Enter Incoming Invoices',
    program: 'SAPMF05A',
    screenNumber: '0100',
    packageName: 'FBAS',
    originalSystem: 'SAP',
    softwareComponent: 'S4CORE 108',
    metadataStatus: 'COMPLETE',
    lookupBehavior: 'SUCCESS',
    authorizationObject: 'F_BKPF_BUK',
    tadir: { devclass: 'FBAS', srcsystem: 'SAP', softwareComponent: 'S4CORE 108' },
    evidence: ['TSTC verified', 'TSTCT verified', 'TADIR verified (standard SAP package FBAS, srcsystem SAP)', 'Catalogue confirms WebGUI and modern successor: F0859A']
  },
  {
    systemId: 'S4H-DEV-200',
    tcode: 'FBN1',
    exists: true,
    classification: 'STANDARD',
    description: 'Accounting Document Number Ranges',
    program: 'SAPMSNUM',
    screenNumber: '0100',
    packageName: 'FBAS',
    originalSystem: 'SAP',
    softwareComponent: 'S4CORE 108',
    metadataStatus: 'COMPLETE',
    lookupBehavior: 'SUCCESS',
    authorizationObject: 'F_BKPF_BUK',
    tadir: { devclass: 'FBAS', srcsystem: 'SAP', softwareComponent: 'S4CORE 108' },
    evidence: ['TSTC verified', 'TSTCT verified', 'TADIR verified (standard SAP package FBAS, srcsystem SAP)', 'Catalogue confirms modern successor: F3445 (Manage Number Range Intervals)']
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
    evidence: ['TSTC verified', 'TSTCT verified', 'TADIR classification: Pending verification', 'Catalogue matching: Pending verification']
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
    tadir: { devclass: 'ZFIN_DEV', srcsystem: 'S21', softwareComponent: 'LOCAL_S21' },
    evidence: ['TSTC verified', 'TSTCT verified', 'TADIR verified (customer package ZFIN_DEV, srcsystem S21)', 'Classified as CUSTOM by multi-evidence consensus']
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
    tadir: { devclass: 'ZFIN_DEV', srcsystem: 'S21', softwareComponent: 'LOCAL_S21' },
    evidence: ['TSTC verified', 'TSTCT verified', 'TADIR verified (customer package ZFIN_DEV, srcsystem S21)', 'Catalogue confirms NO standard SAP Fiori app exists']
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
    tadir: { devclass: 'FIDC', srcsystem: 'SAP', softwareComponent: 'S4CORE 108' },
    evidence: ['TSTC verified', 'Conflicting evidence: Z-prefix used but TADIR srcsystem is SAP and package is FIDC', 'Classified as UNKNOWN due to evidence conflict']
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
    tadir: { devclass: 'DEMO_MISC', srcsystem: 'SAP', softwareComponent: 'S4CORE 108' },
    evidence: ['Synthetic standard repository fixture']
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
    tadir: { devclass: 'ZDEMO_INCOMPLETE', srcsystem: 'S21', softwareComponent: 'LOCAL_S21' },
    evidence: ['Transaction exists; optional description/program omitted']
  },
  {
    systemId: 'S4H-DEV-200',
    tcode: 'ZCONNERR',
    exists: false,
    classification: 'UNKNOWN',
    metadataStatus: 'NOT_AVAILABLE',
    lookupBehavior: 'CONNECTION_ERROR',
    evidence: ['Synthetic adapter fault']
  },
  {
    systemId: 'S4H-DEV-200',
    tcode: 'ZDENIED',
    exists: false,
    classification: 'UNKNOWN',
    metadataStatus: 'NOT_AVAILABLE',
    lookupBehavior: 'ACCESS_DENIED',
    evidence: ['Synthetic adapter fault']
  }
];

export class MockSapAdapter {
  getAvailableSystems() {
    return [...SYSTEMS];
  }

  getSystemById(systemId) {
    return SYSTEMS.find((s) => s.systemId === systemId);
  }

  queryTransaction(systemId, rawTcode) {
    const system = this.getSystemById(systemId);
    if (!system || !system.active) {
      return {
        success: false,
        statusCode: 'SYSTEM_NOT_CONFIGURED',
        errorMessage: `System "${systemId}" is not configured or recognized in the landscape registry.`
      };
    }

    if (!rawTcode || typeof rawTcode !== 'string') {
      return {
        success: false,
        statusCode: 'INVALID_INPUT',
        system,
        errorMessage: 'Transaction code must not be empty.'
      };
    }

    const trimmed = rawTcode.trim().toUpperCase();
    if (trimmed.length === 0) {
      return {
        success: false,
        statusCode: 'INVALID_INPUT',
        system,
        errorMessage: 'Transaction code cannot be blank whitespace.'
      };
    }

    const sapTcodeRegex = /^[A-Z0-9_\-\/]{1,20}$/;
    if (!sapTcodeRegex.test(trimmed)) {
      return {
        success: false,
        statusCode: 'INVALID_INPUT',
        system,
        errorMessage: `Transaction code "${trimmed}" violates SAP naming conventions.`
      };
    }

    const fixture = TRANSACTIONS.find((t) => t.tcode.toUpperCase() === trimmed);

    if (fixture) {
      if (fixture.lookupBehavior === 'CONNECTION_ERROR') {
        return {
          success: false,
          statusCode: 'CONNECTION_ERROR',
          system,
          errorMessage: 'Simulated connection error: RFC/ADT destination communication timed out.'
        };
      }

      if (fixture.lookupBehavior === 'ACCESS_DENIED') {
        return {
          success: false,
          statusCode: 'ACCESS_DENIED',
          system,
          errorMessage: 'Simulated authorization failure: User lacks S_TCODE authorization for this transaction in the mock system.'
        };
      }

      const classificationEval = EvidenceClassifier.classify({
        tcode: fixture.tcode,
        program: fixture.program,
        packageName: fixture.packageName,
        originalSystem: fixture.originalSystem,
        softwareComponent: fixture.softwareComponent,
        tadir: fixture.tadir,
        existingClassification: fixture.classification
      });

      const combinedEvidence = [...fixture.evidence];
      if (
        classificationEval.details.conflictsDetected.length > 0 &&
        !combinedEvidence.some((e) => e.includes('Conflicting evidence'))
      ) {
        combinedEvidence.push(...classificationEval.details.conflictsDetected);
      }

      return {
        success: true,
        system,
        transaction: {
          tcode: fixture.tcode,
          exists: fixture.exists,
          classification: classificationEval.classification,
          description: fixture.description,
          program: fixture.program,
          screenNumber: fixture.screenNumber,
          packageName: fixture.packageName,
          originalSystem: fixture.originalSystem,
          softwareComponent: fixture.softwareComponent,
          authorizationObject: fixture.authorizationObject || null,
          metadataStatus: fixture.metadataStatus,
          evidence: combinedEvidence,
          tadir: fixture.tadir,
          classificationDetails: classificationEval.details
        }
      };
    }

    // 2. Check Authoritative Standard Catalog
    const standardKnown = STANDARD_TRANSACTION_CATALOG[trimmed];
    if (standardKnown) {
      return {
        success: true,
        system,
        transaction: {
          tcode: trimmed,
          exists: true,
          classification: 'STANDARD',
          description: standardKnown.description,
          program: standardKnown.program,
          screenNumber: standardKnown.screenNumber || '0100',
          packageName: standardKnown.packageName,
          originalSystem: 'SAP',
          softwareComponent: standardKnown.softwareComponent,
          metadataStatus: 'COMPLETE',
          evidence: [
            'Authoritative DDIC Master Index verified',
            `Standard SAP package ${standardKnown.packageName}`,
            `Modern Fiori successor: ${standardKnown.primaryFioriAppId}`
          ],
          tadir: { devclass: standardKnown.packageName, srcsystem: 'SAP', softwareComponent: standardKnown.softwareComponent }
        }
      };
    }

    // 3. Known Curated Custom Transactions
    if (trimmed === 'ZPAY_CUSTOM') {
      return {
        success: true,
        system,
        transaction: {
          tcode: trimmed,
          exists: true,
          classification: 'CUSTOM',
          description: 'Custom Supplier Payment Portal (ZPAY)',
          program: 'ZPAY_CUSTOM_PROG',
          screenNumber: '0100',
          packageName: 'ZPAY_DEV',
          originalSystem: system.systemId.split('-')[0] || 'S21',
          softwareComponent: 'LOCAL_CUSTOMER',
          metadataStatus: 'COMPLETE',
          evidence: [
            'TSTC verified: customer namespace transaction registered',
            'Customer package ZPAY_DEV in customer namespace',
            'Classified as CUSTOM (BUILD recommended)'
          ],
          tadir: { devclass: 'ZPAY_DEV', srcsystem: 'S21', softwareComponent: 'LOCAL_CUSTOMER' }
        }
      };
    }

    return {
      success: false,
      statusCode: 'NOT_FOUND',
      system,
      errorMessage: `Transaction code "${trimmed}" does not exist in mock system ${system.systemId}.`,
      transaction: {
        tcode: trimmed,
        exists: false,
        classification: 'UNKNOWN',
        metadataStatus: 'NOT_AVAILABLE',
        evidence: [
          'Synthetic TSTC fixture queried: 0 records found',
          'Synthetic TADIR catalog: no package registration found'
        ]
      }
    };
  }
}

export const mockSapAdapter = new MockSapAdapter();
