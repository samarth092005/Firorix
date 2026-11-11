import {
  AssessmentRecord,
  AssessmentSummary,
  SystemHealthResponse,
  ActivityEvent,
  AssessmentFilterParams,
  AssessmentResultType,
  SystemConnectionState,
  AssessmentCreationRequest
} from '../contracts/types';

/**
 * DEMO DATASET ONLY
 * System S21 / Client 200 / SAP S/4HANA 2023 Private Edition
 * Initial Finance Pilot Transactions + Cross-functional Baselines.
 */
export const DEMO_ASSESSMENT_RECORDS: AssessmentRecord[] = [
  {
    id: 'ASM-S21-F53',
    tcode: 'F-53',
    description: 'Post Outgoing Payments',
    businessArea: 'Financial Accounting',
    subArea: 'Accounts Payable',
    classification: 'STANDARD',
    programName: 'SAPMF05A',
    screenNumber: '0100',
    packageName: 'FBAS',
    originalSystem: 'SAP',
    softwareComponent: 'S4CORE 108',
    assessmentResult: 'EXPLICIT_SUCCESSOR',
    matchingFioriApp: {
      appId: 'F0773',
      appName: 'Manage Outgoing Payments',
      appType: 'SAP Fiori elements (Transactional)',
      uiTechnology: 'SAP Fiori elements',
      releaseCompatibility: 'COMPATIBLE',
      sourceLabel: 'Official SAP Fiori Apps Reference Library',
      businessRoles: ['Accounts Payable Accountant (SAP_BR_AP_ACCOUNTANT)'],
      odataServices: ['FAR_OUTGOING_PAYMENT_SRV (OData V2)', 'C_OUTGOINGPAYMENT_CDS (OData V4)']
    },
    lastAssessed: '2026-11-10 12:30',
    status: 'PENDING_VERIFICATION',
    lifecycleStatus: 'PENDING_VERIFICATION',
    systemId: 'S21',
    client: '200',
    release: 'SAP S/4HANA 2023 Private Edition',
    isDemo: true,
    fitGapScore: 88,
    scoreCoverage: 75,
    evidenceConfidence: 'MEDIUM',
    evidenceNotes: [
      'TSTC/TSTCT verified in S21 dictionary: program SAPMF05A, package FBAS, S4CORE 108 SP0003',
      'TADIR: R3TR TRAN F-53 owned by package FBAS (SAP Standard)',
      'Catalogue Match: F0773 (Manage Outgoing Payments) documented in FAL 2023 FPS02',
      'Target compatibility confirmed for S4CORE 108 SP0003 and SAP_BASIS 758 SP0003',
      'OData service FAR_OUTGOING_PAYMENT_SRV documented in FAL; live registration PENDING_BASIS_CHECK',
      'S21 activation and PFCG role SAP_BR_AP_ACCOUNTANT pending verification'
    ],
    rationale: 'F0773 (Manage Outgoing Payments) is the verified official SAP Fiori successor for F-53. Recommendation recalculated to CONFIGURE because business requirements match standard capabilities, but S21 live Gateway service registration and PFCG role assignment require Basis enablement.',
    auditEvents: [
      {
        eventId: 'AUD-F53-GENESIS',
        timestamp: '2026-11-04T14:20:00.000Z',
        author: 'Lead SAP Architect',
        actorId: 'USR-ARCH-001',
        actorRole: 'SAP_CONSULTANT',
        previousState: null,
        newState: 'RECOMMENDATION_COMPLETED',
        action: 'CREATED',
        comment: 'Initial assessment record created for F-53.',
        details: {
          tcode: 'F-53',
          claimedVerdict: 'ADOPT',
          claimedStatus: 'COMPLETED'
        }
      },
      {
        eventId: 'AUD-CORR-F53-01',
        timestamp: '2026-11-10T12:30:00.000Z',
        author: 'FioriX Canonical Audit Engine',
        actorId: 'SYS-AUDIT-ENGINE',
        actorRole: 'SYSTEM_AUDITOR',
        previousState: 'COMPLETED',
        newState: 'PENDING_VERIFICATION',
        action: 'CORRECTION',
        comment: 'Auditable correction of F-53 assessment contradictions: (1) Re-verified DDIC metadata (SAPMF05A/FBAS); (2) Confirmed FAL match F0773; (3) Re-anchored release to S/4HANA 2023 Private Edition; (4) Reclassified OData services from ACTIVE to PENDING_BASIS_CHECK; (5) Recalculated verdict from unverified ADOPT to CONFIGURE pending S21 role and service enablement.',
        details: {
          resolvedContradictions: [
            'Contradiction 1: Replaced unverified ADOPT verdict with CONFIGURE based on verified standard match F0773.',
            'Contradiction 2: Confirmed catalogue match F0773 in FAL 2023 FPS02 (not pending catalogue).',
            'Contradiction 3: Aligned confidence (70/100) with evidence completeness score (71/100).',
            'Contradiction 4: Explicitly specified target release as SAP S/4HANA 2023 Private Edition.',
            'Contradiction 5: Reclassified OData service status from fabricated ACTIVE to PENDING_BASIS_CHECK.',
            'Contradiction 6: Reclassified audit gate from COMPLETED to PENDING_VERIFICATION pending live S21 checks.'
          ]
        }
      }
    ]
  },
  {
    id: 'ASM-S21-F28',
    tcode: 'F-28',
    description: 'Post Incoming Payments',
    businessArea: 'Financial Accounting',
    subArea: 'Accounts Receivable',
    classification: 'STANDARD',
    programName: 'SAPMF05A',
    screenNumber: '0100',
    packageName: 'FBAS',
    originalSystem: 'SAP',
    softwareComponent: 'S4CORE 108',
    assessmentResult: 'EXPLICIT_SUCCESSOR',
    matchingFioriApp: {
      appId: 'F1345',
      appName: 'Post Incoming Payments',
      appType: 'SAP Fiori elements (Transactional)',
      uiTechnology: 'SAP Fiori elements',
      releaseCompatibility: 'COMPATIBLE',
      sourceLabel: 'Official SAP Fiori Apps Reference Library',
      businessRoles: ['Accounts Receivable Accountant (SAP_BR_AR_ACCOUNTANT)'],
      odataServices: ['FAP_POST_INCOMING_PAYMENTS_SRV']
    },
    lastAssessed: '2026-11-04 13:45',
    status: 'COMPLETED',
    systemId: 'S21',
    client: '200',
    release: 'SAP S/4HANA 2023 Private Edition',
    isDemo: true,
    evidenceNotes: [
      'TSTC/TSTCT verified in S21 dictionary',
      'TADIR: R3TR TRAN F-28 owned by package FBAS (SAP Standard)',
      'Fiori Apps Reference Library verified for S/4HANA 2023'
    ],
    rationale: 'F1345 provides direct incoming payment posting with customer open-item clearing and difference handling natively in Fiori Horizon.'
  },
  {
    id: 'ASM-S21-FS00',
    tcode: 'FS00',
    description: 'Manage G/L Account Master Data',
    businessArea: 'Financial Accounting',
    subArea: 'General Ledger',
    classification: 'STANDARD',
    programName: 'SAPLGL_ACCOUNT_MASTER_MAINTAIN',
    screenNumber: '0100',
    packageName: 'GL_ACCOUNT_SERVICES',
    originalSystem: 'SAP',
    softwareComponent: 'S4CORE 108',
    assessmentResult: 'EXPLICIT_SUCCESSOR',
    matchingFioriApp: {
      appId: 'F0984A',
      appName: 'Manage G/L Account Master Data',
      appType: 'SAP Fiori elements (Transactional)',
      uiTechnology: 'SAP Fiori elements',
      releaseCompatibility: 'COMPATIBLE',
      sourceLabel: 'Official SAP Fiori Apps Reference Library',
      businessRoles: ['General Ledger Accountant (SAP_BR_GL_ACCOUNTANT)'],
      odataServices: ['GL_ACCOUNT_MD_SRV (OData V4)']
    },
    lastAssessed: '2026-11-04 11:15',
    status: 'COMPLETED',
    systemId: 'S21',
    client: '200',
    release: 'SAP S/4HANA 2023 Private Edition',
    isDemo: true,
    evidenceNotes: [
      'TSTC/TSTCT verified in S21 dictionary',
      'TADIR verified for SAP Standard G/L framework',
      'Direct successor app F0984A verified in curated S21 catalog'
    ],
    rationale: 'F0984A delivers the unified Chart of Accounts and Company Code segment maintenance with change log audit.'
  },
  {
    id: 'ASM-S21-OB08',
    tcode: 'OB08',
    description: 'Maintain Exchange Rates',
    businessArea: 'Financial Accounting',
    subArea: 'General Ledger',
    classification: 'STANDARD',
    programName: 'SAPL0S01',
    screenNumber: '0100',
    packageName: 'FIN_EXCHANGE',
    originalSystem: 'SAP',
    softwareComponent: 'S4CORE 108',
    assessmentResult: 'EXPLICIT_SUCCESSOR',
    matchingFioriApp: {
      appId: 'F3616',
      appName: 'Currency Exchange Rates',
      appType: 'SAP Fiori elements (Transactional)',
      uiTechnology: 'SAP Fiori elements',
      releaseCompatibility: 'COMPATIBLE',
      sourceLabel: 'Official SAP Fiori Apps Reference Library',
      businessRoles: ['General Ledger Accountant (SAP_BR_GL_ACCOUNTANT)'],
      odataServices: ['C_EXCHANGERATE_CDS']
    },
    lastAssessed: '2026-11-03 16:30',
    status: 'COMPLETED',
    systemId: 'S21',
    client: '200',
    release: 'SAP S/4HANA 2023 Private Edition',
    isDemo: true,
    evidenceNotes: [
      'TSTC verified (Maintain Exchange Rates)',
      'SAP-designated successor confirmed: Currency Exchange Rates (F3616)'
    ],
    rationale: 'F3616 provides table-based currency rate maintenance replacing the classic TCURR transaction view.'
  },
  {
    id: 'ASM-S21-FB03',
    tcode: 'FB03',
    description: 'Display Document',
    businessArea: 'Financial Accounting',
    subArea: 'General Ledger',
    classification: 'STANDARD',
    programName: 'SAPMF05L',
    screenNumber: '0100',
    packageName: 'FIDC',
    originalSystem: 'SAP',
    softwareComponent: 'S4CORE 108',
    assessmentResult: 'SAP_GUI_HTML',
    matchingFioriApp: {
      appId: 'FB03',
      appName: 'Display Document (SAP GUI for HTML)',
      appType: 'SAP GUI for HTML',
      uiTechnology: 'SAP GUI for HTML',
      releaseCompatibility: 'COMPATIBLE',
      sourceLabel: 'Official SAP Fiori Apps Reference Library',
      businessRoles: ['General Ledger Accountant (SAP_BR_GL_ACCOUNTANT)'],
      odataServices: []
    },
    lastAssessed: '2026-11-03 14:10',
    status: 'COMPLETED',
    systemId: 'S21',
    client: '200',
    release: 'SAP S/4HANA 2023 Private Edition',
    isDemo: true,
    evidenceNotes: [
      'TSTC verified (Display Financial Document)',
      'Classic SAP GUI transaction hosted in Fiori Launchpad via WebGUI runtime'
    ],
    rationale: 'Hosted directly inside SAP Fiori Launchpad as an embedded SAP GUI for HTML application with full screen parity.'
  },
  {
    id: 'ASM-S21-FB01',
    tcode: 'FB01',
    description: 'Post Financial Document',
    businessArea: 'Financial Accounting',
    subArea: 'General Ledger',
    classification: 'STANDARD',
    programName: 'SAPMF05A',
    screenNumber: '0100',
    packageName: 'FBAS',
    originalSystem: 'SAP',
    softwareComponent: 'S4CORE 108',
    assessmentResult: 'FUNCTIONAL_ALTERNATIVE',
    matchingFioriApp: {
      appId: 'F0717',
      appName: 'Manage Journal Entries',
      appType: 'SAP Fiori elements (Transactional)',
      uiTechnology: 'SAP Fiori elements',
      releaseCompatibility: 'COMPATIBLE',
      sourceLabel: 'Official SAP Fiori Apps Reference Library',
      businessRoles: ['General Ledger Accountant (SAP_BR_GL_ACCOUNTANT)'],
      odataServices: ['FAC_FINANCIAL_DOCUMENT_SRV']
    },
    lastAssessed: '2026-11-02 17:00',
    status: 'COMPLETED',
    systemId: 'S21',
    client: '200',
    release: 'SAP S/4HANA 2023 Private Edition',
    isDemo: true,
    evidenceNotes: [
      'Standard SAP transaction verified',
      'F0717 (Manage Journal Entries) is a functional alternative rather than a direct screen-by-screen replacement'
    ],
    rationale: 'F0717 offers comprehensive journal entry creation and review, serving as the recommended functional alternative to multi-step FB01.'
  },
  {
    id: 'ASM-S21-FBL1N',
    tcode: 'FBL1N',
    description: 'Vendor Line Items',
    businessArea: 'Financial Accounting',
    subArea: 'Accounts Payable',
    classification: 'STANDARD',
    programName: 'RFITEMAP',
    screenNumber: '1000',
    packageName: 'FI_AP_REPORTING',
    originalSystem: 'SAP',
    softwareComponent: 'S4CORE 108',
    assessmentResult: 'PENDING_VERIFICATION',
    matchingFioriApp: null,
    lastAssessed: '2026-11-04 09:30',
    status: 'PENDING_VERIFICATION',
    systemId: 'S21',
    client: '200',
    release: 'SAP S/4HANA 2023 Private Edition',
    isDemo: true,
    evidenceNotes: [
      'TSTC verified for vendor line display',
      'TADIR verified',
      'Official Fiori catalogue match pending verification in S21 client 200'
    ],
    rationale: 'Transaction exists in S21; candidate evaluation between Manage Supplier Line Items (F0712) and classic GUI is pending review.'
  },
  {
    id: 'ASM-S21-ME21N',
    tcode: 'ME21N',
    description: 'Create Purchase Order',
    businessArea: 'Sourcing & Procurement',
    subArea: 'Purchasing',
    classification: 'STANDARD',
    programName: 'SAPLMEGUI',
    screenNumber: '0100',
    packageName: 'ME',
    originalSystem: 'SAP',
    softwareComponent: 'S4CORE 108',
    assessmentResult: 'EXPLICIT_SUCCESSOR',
    matchingFioriApp: {
      appId: 'F0842A',
      appName: 'Manage Purchase Orders',
      appType: 'SAP Fiori elements (Transactional)',
      uiTechnology: 'SAP Fiori elements',
      releaseCompatibility: 'COMPATIBLE',
      sourceLabel: 'Official SAP Fiori Apps Reference Library',
      businessRoles: ['Purchaser (SAP_BR_PURCHASER)'],
      odataServices: ['MM_PUR_PO_MAINT_V2_SRV']
    },
    lastAssessed: '2026-11-01 10:15',
    status: 'COMPLETED',
    systemId: 'S21',
    client: '200',
    release: 'SAP S/4HANA 2023 Private Edition',
    isDemo: true,
    evidenceNotes: [
      'Standard MM transaction verified',
      'F0842A confirmed as target successor'
    ],
    rationale: 'F0842A represents the flagship S/4HANA procurement application covering purchase order lifecycle.'
  },
  {
    id: 'ASM-S21-ZFIN_CUSTOM',
    tcode: 'ZFIN_CUSTOM',
    description: 'Custom Bank Payment Processing',
    businessArea: 'Financial Accounting',
    subArea: 'Banking',
    classification: 'CUSTOM',
    programName: 'ZFIN_PAY_PROC',
    screenNumber: '0100',
    packageName: 'ZFIN_CORE',
    originalSystem: 'S21',
    softwareComponent: 'LOCAL_S21',
    assessmentResult: 'NO_VERIFIED_MATCH',
    matchingFioriApp: null,
    lastAssessed: '2026-10-31 15:45',
    status: 'COMPLETED',
    systemId: 'S21',
    client: '200',
    release: 'SAP S/4HANA 2023 Private Edition',
    isDemo: true,
    evidenceNotes: [
      'Customer namespace (Z prefix)',
      'Owned by package ZFIN_CORE in S21 system repository',
      'No standard SAP Fiori catalog match exists for this customer-specific business logic'
    ],
    rationale: 'Customer custom transaction with proprietary payment clearing logic. Requires custom SAP BTP RAP application blueprint in future sprint.'
  }
];

export const DEMO_SYSTEM_HEALTH: SystemHealthResponse = {
  systemId: 'S21',
  client: '200',
  platform: 'SAP S/4HANA 2023 Private Edition',
  systemName: 'S21 SAP S/4HANA 2023 Private Edition',
  connectionState: 'DEMO_MODE',
  isLiveConnection: false,
  lastSyncTimestamp: '2026-11-04 18:30 (Recorded Snapshot)',
  connectivityStatus: {
    status: 'SIMULATED',
    latencyMs: 42,
    destinationName: 'S21_RFC_DISCOVERY',
    cloudConnectorSubaccount: 'subacc-eur-s21-private',
    message: 'Local Demo Mode active. Live S21 connectivity check is unverified.'
  },
  metadataService: {
    status: 'MOCK_STANDBY',
    endpoint: '/sap/opu/odata/sap/Z_FIORIX_DISCOVERY_SRV',
    version: 'V2 / ADT 7.58'
  },
  catalogueStatus: {
    status: 'LOADED',
    version: 'SAP Fiori Apps Reference Library 2023 FPS02',
    totalAppsCatalogued: 14850
  },
  components: [
    {
      name: 'SAP_BASIS',
      release: '758',
      spLevel: 'SP0003',
      description: 'SAP Basis Component',
      status: 'RECORDED_AWAITING_REFRESH'
    },
    {
      name: 'S4CORE',
      release: '108',
      spLevel: 'SP0003',
      description: 'S/4HANA Core Component',
      status: 'RECORDED_AWAITING_REFRESH'
    },
    {
      name: 'SAP_UI',
      release: '758',
      spLevel: 'SP0003',
      description: 'User Interface Technology',
      status: 'RECORDED_AWAITING_REFRESH'
    },
    {
      name: 'SAP_GWFND',
      release: '758',
      spLevel: 'SP0003',
      description: 'SAP Gateway Foundation',
      status: 'RECORDED_AWAITING_REFRESH'
    }
  ]
};

export const DEMO_ACTIVITIES: ActivityEvent[] = [
  {
    id: 'ACT-001',
    timestamp: '2026-11-04 14:20',
    type: 'ASSESSMENT_COMPLETED',
    title: 'Assessment Completed for F-53',
    description: 'Post Outgoing Payments verified in S21. Explicit Fiori successor identified: F0773 (Manage Outgoing Payments).',
    severity: 'SUCCESS',
    tcode: 'F-53',
    systemId: 'S21'
  },
  {
    id: 'ACT-002',
    timestamp: '2026-11-04 13:45',
    type: 'ASSESSMENT_COMPLETED',
    title: 'Assessment Completed for F-28',
    description: 'Post Incoming Payments verified in S21. Explicit Fiori successor identified: F1345 (Post Incoming Payments).',
    severity: 'SUCCESS',
    tcode: 'F-28',
    systemId: 'S21'
  },
  {
    id: 'ACT-003',
    timestamp: '2026-11-04 11:15',
    type: 'ASSESSMENT_COMPLETED',
    title: 'Assessment Completed for FS00',
    description: 'Manage G/L Account Master Data verified. Explicit Fiori successor identified: F0984A.',
    severity: 'SUCCESS',
    tcode: 'FS00',
    systemId: 'S21'
  },
  {
    id: 'ACT-004',
    timestamp: '2026-11-04 09:30',
    type: 'VERIFICATION_PENDING',
    title: 'Verification Flagged for FBL1N',
    description: 'Vendor Line Items requires catalogue confirmation between Manage Supplier Line Items and classic GUI in S21.',
    severity: 'WARNING',
    tcode: 'FBL1N',
    systemId: 'S21'
  },
  {
    id: 'ACT-005',
    timestamp: '2026-11-04 08:00',
    type: 'CATALOGUE_SYNC',
    title: 'S21 Fiori Reference Baseline Synchronized',
    description: '14,850 official SAP Fiori app descriptors loaded into local assessment cache.',
    severity: 'INFO',
    systemId: 'S21'
  },
  {
    id: 'ACT-006',
    timestamp: '2026-11-03 18:30',
    type: 'SYSTEM_PROBE',
    title: 'S21 Landscape Telemetry Recorded',
    description: 'Component profile recorded: S4CORE 108 SP0003, SAP_BASIS 758 SP0003 (awaiting live refresh).',
    severity: 'INFO',
    systemId: 'S21'
  }
];

/**
 * Isolated Demo Data Provider implementation.
 * All metrics are mathematically derived from DEMO_ASSESSMENT_RECORDS.
 */
class DemoDataProvider {
  private records: AssessmentRecord[] = [...DEMO_ASSESSMENT_RECORDS];
  private systemHealth: SystemHealthResponse = { ...DEMO_SYSTEM_HEALTH };
  private activities: ActivityEvent[] = [...DEMO_ACTIVITIES];

  public getAssessments(params?: AssessmentFilterParams): AssessmentRecord[] {
    let result = [...this.records];

    if (!params) return result;

    if (params.searchTerm) {
      const q = params.searchTerm.toLowerCase().trim();
      result = result.filter(
        (r) =>
          r.tcode.toLowerCase().includes(q) ||
          r.description.toLowerCase().includes(q) ||
          r.businessArea.toLowerCase().includes(q) ||
          (r.matchingFioriApp &&
            (r.matchingFioriApp.appId.toLowerCase().includes(q) ||
              r.matchingFioriApp.appName.toLowerCase().includes(q)))
      );
    }

    if (params.businessArea && params.businessArea !== 'ALL') {
      result = result.filter((r) => r.businessArea === params.businessArea);
    }

    if (params.assessmentResult && params.assessmentResult !== 'ALL') {
      result = result.filter((r) => r.assessmentResult === params.assessmentResult);
    }

    if (params.status && params.status !== 'ALL') {
      result = result.filter((r) => r.status === params.status);
    }

    if (params.sortBy) {
      const field = params.sortBy;
      const order = params.sortOrder === 'desc' ? -1 : 1;
      result.sort((a, b) => {
        const valA = (a[field] || '').toString();
        const valB = (b[field] || '').toString();
        return valA.localeCompare(valB) * order;
      });
    }

    if (params.page && params.pageSize) {
      const start = (params.page - 1) * params.pageSize;
      result = result.slice(start, start + params.pageSize);
    }

    return result;
  }

  public getAssessmentById(id: string): AssessmentRecord | null {
    return this.records.find((r) => r.id === id) || null;
  }

  public getAssessmentByTCode(tcode: string): AssessmentRecord | null {
    const clean = tcode.trim().toUpperCase();
    return this.records.find((r) => r.tcode.toUpperCase() === clean) || null;
  }

  /**
   * Calculates comprehensive operational summary metrics.
   * STRICT GUARANTEE: Derived directly from the single assessment data source.
   */
  public getAssessmentSummary(): AssessmentSummary {
    const total = this.records.length;
    if (total === 0) {
      return {
        totalAssessed: 0,
        verifiedMatchesCount: 0,
        explicitSuccessorsCount: 0,
        pendingVerificationCount: 0,
        sapGuiHtmlCount: 0,
        functionalAlternativeCount: 0,
        releaseIncompatibleCount: 0,
        noVerifiedMatchCount: 0,
        distribution: []
      };
    }

    const explicitSuccessors = this.records.filter((r) => r.assessmentResult === 'EXPLICIT_SUCCESSOR').length;
    const sapGuiHtml = this.records.filter((r) => r.assessmentResult === 'SAP_GUI_HTML').length;
    const functionalAlt = this.records.filter((r) => r.assessmentResult === 'FUNCTIONAL_ALTERNATIVE').length;
    const pendingVerif = this.records.filter((r) => r.assessmentResult === 'PENDING_VERIFICATION').length;
    const releaseIncomp = this.records.filter((r) => r.assessmentResult === 'RELEASE_INCOMPATIBLE').length;
    const noVerifiedMatch = this.records.filter((r) => r.assessmentResult === 'NO_VERIFIED_MATCH').length;

    // Verified Fiori Matches are those where an actual standard/GUI/alternative Fiori match was verified
    const verifiedMatches = this.records.filter((r) =>
      r.matchingFioriApp !== null &&
      ['EXPLICIT_SUCCESSOR', 'SAP_GUI_HTML', 'FUNCTIONAL_ALTERNATIVE'].includes(r.assessmentResult)
    ).length;

    const distribution: {
      category: AssessmentResultType;
      label: string;
      count: number;
      percentage: number;
      color: string;
    }[] = [
      {
        category: 'EXPLICIT_SUCCESSOR',
        label: 'Explicit Successor',
        count: explicitSuccessors,
        percentage: Math.round((explicitSuccessors / total) * 100),
        color: '#188918'
      },
      {
        category: 'SAP_GUI_HTML',
        label: 'SAP GUI for HTML',
        count: sapGuiHtml,
        percentage: Math.round((sapGuiHtml / total) * 100),
        color: '#0A6ED1'
      },
      {
        category: 'FUNCTIONAL_ALTERNATIVE',
        label: 'Functional Alternative',
        count: functionalAlt,
        percentage: Math.round((functionalAlt / total) * 100),
        color: '#5C38B0'
      },
      {
        category: 'PENDING_VERIFICATION',
        label: 'Pending Verification',
        count: pendingVerif,
        percentage: Math.round((pendingVerif / total) * 100),
        color: '#E9730C'
      },
      {
        category: 'RELEASE_INCOMPATIBLE',
        label: 'Release Incompatible',
        count: releaseIncomp,
        percentage: Math.round((releaseIncomp / total) * 100),
        color: '#BB0000'
      },
      {
        category: 'NO_VERIFIED_MATCH',
        label: 'No Verified Match',
        count: noVerifiedMatch,
        percentage: Math.round((noVerifiedMatch / total) * 100),
        color: '#64748B'
      }
    ];

    return {
      totalAssessed: total,
      verifiedMatchesCount: verifiedMatches,
      explicitSuccessorsCount: explicitSuccessors,
      pendingVerificationCount: pendingVerif,
      sapGuiHtmlCount: sapGuiHtml,
      functionalAlternativeCount: functionalAlt,
      releaseIncompatibleCount: releaseIncomp,
      noVerifiedMatchCount: noVerifiedMatch,
      distribution
    };
  }

  public getSystemHealth(): SystemHealthResponse {
    return { ...this.systemHealth };
  }

  public testSystemConnection(): Promise<{
    success: boolean;
    connectionState: SystemConnectionState;
    message: string;
    testedAt: string;
    details: string;
  }> {
    return new Promise((resolve) => {
      setTimeout(() => {
        // Honest response: In frontend demo mode, S21 is not live connected.
        resolve({
          success: false,
          connectionState: 'DEMO_MODE',
          message: 'Target S21 S/4HANA Private Edition endpoint requires active Cloud Connector tunnel and BTP Destination.',
          testedAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
          details: 'RFC/ADT destination S21_RFC_DISCOVERY is not reachable in local frontend sandbox. Demo mode remains active.'
        });
      }, 600);
    });
  }

  public getRecentActivity(limit: number = 10): ActivityEvent[] {
    return this.activities.slice(0, limit);
  }

  public createAssessment(req: AssessmentCreationRequest): AssessmentRecord {
    const cleanTcode = req.tcode.trim().toUpperCase();
    const existingIndex = this.records.findIndex((r) => r.tcode.toUpperCase() === cleanTcode);
    const existing = existingIndex >= 0 ? this.records[existingIndex] : null;

    const id = existing ? existing.id : `ASM-S21-${cleanTcode.replace(/[^A-Z0-9]/g, '_')}`;
    const requestId = `REQ-${Date.now().toString().slice(-6)}-${cleanTcode}`;

    let resultType: AssessmentResultType = 'EXPLICIT_SUCCESSOR';
    if (req.catalogueReference) {
      if (req.catalogueReference.uiTechnology === 'SAP GUI for HTML') {
        resultType = 'SAP_GUI_HTML';
      } else if (cleanTcode === 'FB01') {
        resultType = 'FUNCTIONAL_ALTERNATIVE';
      } else {
        resultType = 'EXPLICIT_SUCCESSOR';
      }
    } else if (cleanTcode === 'FBL1N') {
      resultType = 'PENDING_VERIFICATION';
    } else if (req.discoveryMetadata.classification === 'CUSTOM') {
      resultType = 'NO_VERIFIED_MATCH';
    } else {
      resultType = 'PENDING_VERIFICATION';
    }

    const businessArea =
      req.businessContext.businessProcess.includes('Payable') || req.businessContext.businessProcess.includes('Outgoing')
        ? 'Financial Accounting'
        : req.businessContext.businessProcess.includes('Receivable') || req.businessContext.businessProcess.includes('Incoming')
        ? 'Financial Accounting'
        : req.businessContext.businessProcess.includes('Ledger') || req.businessContext.businessProcess.includes('Master Data')
        ? 'Financial Accounting'
        : 'Finance & Operations';

    const subArea =
      req.businessContext.businessProcess.includes('Payable') || cleanTcode === 'F-53'
        ? 'Accounts Payable'
        : req.businessContext.businessProcess.includes('Receivable') || cleanTcode === 'F-28'
        ? 'Accounts Receivable'
        : req.businessContext.businessProcess.includes('Ledger') || cleanTcode === 'FS00'
        ? 'General Ledger'
        : req.businessContext.subProcess || 'General Processing';

    const newRecord: AssessmentRecord = {
      id,
      requestId,
      tcode: cleanTcode,
      description: req.discoveryMetadata.description,
      businessArea,
      subArea,
      classification: req.discoveryMetadata.classification,
      programName: req.discoveryMetadata.programName,
      screenNumber: req.discoveryMetadata.screenNumber,
      packageName: req.discoveryMetadata.packageName,
      originalSystem: req.discoveryMetadata.originalSystem,
      softwareComponent: req.discoveryMetadata.softwareComponent,
      assessmentResult: resultType,
      matchingFioriApp: req.catalogueReference
        ? {
            appId: req.catalogueReference.appId,
            appName: req.catalogueReference.appName,
            appType: req.catalogueReference.uiTechnology,
            uiTechnology: req.catalogueReference.uiTechnology,
            releaseCompatibility: 'COMPATIBLE',
            sourceLabel: 'Official SAP Fiori Apps Reference Library',
            businessRoles: req.catalogueReference.businessRoles,
            odataServices: req.catalogueReference.odataServices
          }
        : existing?.matchingFioriApp || null,
      lastAssessed: new Date().toISOString().replace('T', ' ').substring(0, 16),
      status: 'COMPLETED',
      systemId: req.systemId,
      client: req.client,
      release: req.targetRelease,
      isDemo: true,
      evidenceNotes: [
        `Guided Discovery session completed for ${cleanTcode}`,
        `Target System: ${req.systemId} Client ${req.client} (${req.targetRelease})`,
        `Repository Object: TADIR ${req.discoveryMetadata.packageName} (${req.discoveryMetadata.classification})`,
        `Primary business scenario: ${req.businessContext.primaryScenario}`,
        req.catalogueReference
          ? `Official Fiori catalogue match verified: ${req.catalogueReference.appId} (${req.catalogueReference.appName})`
          : 'Catalogue search completed; no standard Fiori match verified'
      ],
      rationale: req.businessContext.assessmentObjective || (
        req.catalogueReference
          ? `${req.catalogueReference.appId} (${req.catalogueReference.appName}) is the recommended standard Fiori successor for ${cleanTcode}.`
          : `Assessment created for ${cleanTcode}.`
      ),
      businessContext: req.businessContext,
      applicationRequirements: req.applicationRequirements,
      catalogueReference: req.catalogueReference
    };

    if (existingIndex >= 0) {
      this.records[existingIndex] = newRecord;
    } else {
      this.records.unshift(newRecord);
    }

    // Record activity event
    const newActivity: ActivityEvent = {
      id: `ACT-${Date.now().toString().slice(-4)}`,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 16),
      type: 'ASSESSMENT_COMPLETED',
      title: `Guided Assessment Created: ${cleanTcode}`,
      description: `${newRecord.description} submitted with ${req.businessContext.primaryScenario} scenario. Result: ${resultType.replace(/_/g, ' ')}.`,
      severity: 'SUCCESS',
      tcode: cleanTcode,
      systemId: req.systemId
    };
    this.activities.unshift(newActivity);

    return newRecord;
  }
}


export const demoDataProvider = new DemoDataProvider();
