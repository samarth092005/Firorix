import {
  SapSystem,
  TransactionCode,
  TechnicalObject,
  BusinessRequirement,
  FioriApplication,
  FitGapResult,
  Recommendation,
  GeneratedApplicationBlueprint,
  ValidationFinding,
  Assessment,
  DiscoveryJob,
  AuditEvent
} from '../../types';

export const INITIAL_SYSTEMS: SapSystem[] = [
  {
    id: 'SYS-001',
    alias: 'S4H_DEV_100',
    environment: 'DEVELOPMENT',
    destinationReference: 'S4H_DEV_ONPREM_DEST',
    host: 's4h-dev.corp.internal',
    client: '100',
    targetReleaseProfile: 'SAP S/4HANA 2022 FPS02 (ABAP 7.57)',
    connectionStatus: 'CONNECTED_SIMULATED',
    lastVerifiedTimestamp: '2026-11-02 18:30:00',
    adtEndpoint: 'https://s4h-dev.corp.internal:44300/sap/bc/adt',
    cloudConnectorSubaccount: 'subacc-eur-btp-prod-01',
    description: 'Primary On-Premise S/4HANA Development & Prototyping Sandbox',
    isDemoRecord: true
  },
  {
    id: 'SYS-002',
    alias: 'S4H_QAS_200',
    environment: 'QUALITY',
    destinationReference: 'S4H_QAS_ONPREM_DEST',
    host: 's4h-qas.corp.internal',
    client: '200',
    targetReleaseProfile: 'SAP S/4HANA 2022 FPS02 (ABAP 7.57)',
    connectionStatus: 'CONNECTED_SIMULATED',
    lastVerifiedTimestamp: '2026-11-02 16:15:00',
    adtEndpoint: 'https://s4h-qas.corp.internal:44300/sap/bc/adt',
    cloudConnectorSubaccount: 'subacc-eur-btp-prod-01',
    description: 'Quality Assurance & Functional Acceptance System',
    isDemoRecord: true
  },
  {
    id: 'SYS-003',
    alias: 'S4H_SBX_300',
    environment: 'SANDBOX',
    destinationReference: 'S4H_SBX_ISOLATED_DEST',
    host: 's4h-sbx.corp.internal',
    client: '300',
    targetReleaseProfile: 'SAP S/4HANA 2023 (ABAP 7.58 / ABAP Cloud)',
    connectionStatus: 'OFFLINE',
    lastVerifiedTimestamp: '2026-10-28 09:12:00',
    adtEndpoint: 'https://s4h-sbx.corp.internal:44300/sap/bc/adt',
    cloudConnectorSubaccount: 'subacc-eur-btp-trial',
    description: 'Next-Gen 2023 Sandbox for Clean-Core Experimentation',
    isDemoRecord: true
  }
];

export const INITIAL_TRANSACTIONS: TransactionCode[] = [
  {
    id: 'TX-001',
    tcode: 'VA01',
    description: 'Create Sales Order',
    module: 'SD',
    type: 'STANDARD',
    programName: 'SAPMV45A',
    packageName: 'VA',
    assessmentStatus: 'REVIEW_READY',
    linkedTables: ['VBAK', 'VBAP', 'VBEP', 'VBPA', 'VBUK'],
    linkedCdsViews: ['I_SalesOrder', 'I_SalesOrderItem', 'C_SalesOrderManage'],
    linkedAuthObjects: ['V_VBAK_VKO', 'V_VBAK_AAT', 'B_USERST_ACT'],
    objectsCount: 42,
    lastScanned: '2026-11-02 14:20:00',
    isDemoRecord: true
  },
  {
    id: 'TX-002',
    tcode: 'ME21N',
    description: 'Create Purchase Order',
    module: 'MM',
    type: 'STANDARD',
    programName: 'SAPLMEGUI',
    packageName: 'ME',
    assessmentStatus: 'IN_PROGRESS',
    linkedTables: ['EKKO', 'EKPO', 'EKET', 'EKKN'],
    linkedCdsViews: ['I_PurchaseOrderAPI01', 'C_PurchaseOrderManage'],
    linkedAuthObjects: ['M_BEST_BSA', 'M_BEST_EKG', 'M_BEST_EKO'],
    objectsCount: 38,
    lastScanned: '2026-11-01 11:05:00',
    isDemoRecord: true
  },
  {
    id: 'TX-003',
    tcode: 'FB01',
    description: 'Post Financial Accounting Document',
    module: 'FI',
    type: 'STANDARD',
    programName: 'SAPMF05A',
    packageName: 'FB',
    assessmentStatus: 'APPROVED',
    linkedTables: ['BKPF', 'BSEG', 'BSET'],
    linkedCdsViews: ['I_JournalEntry', 'I_JournalEntryItem'],
    linkedAuthObjects: ['F_BKPF_BUK', 'F_BKPF_KOA'],
    objectsCount: 29,
    lastScanned: '2026-10-30 17:45:00',
    isDemoRecord: true
  },
  {
    id: 'TX-004',
    tcode: 'ZSD_CUSTOM_BILLING',
    description: 'Consolidated Plant Billing & Dispute Cockpit',
    module: 'CUSTOM',
    type: 'CUSTOM',
    programName: 'ZPROG_PLANT_BILLING',
    packageName: 'ZSD_DISTRIBUTION',
    assessmentStatus: 'APPROVED',
    linkedTables: ['VBRK', 'VBRP', 'ZVBRK_DISPUTE_EXT', 'ZPLANT_CONFIG'],
    linkedCdsViews: ['ZI_CustomPlantBilling', 'ZC_CustomPlantBillingManage'],
    linkedAuthObjects: ['Z_SD_PLANT', 'V_VBRK_FKA'],
    objectsCount: 16,
    lastScanned: '2026-11-02 10:00:00',
    isDemoRecord: true
  },
  {
    id: 'TX-005',
    tcode: 'MM01',
    description: 'Create Material Master Record',
    module: 'MM',
    type: 'STANDARD',
    programName: 'SAPMM03G',
    packageName: 'MG',
    assessmentStatus: 'NOT_ASSESSED',
    linkedTables: ['MARA', 'MAKT', 'MARC', 'MBEW'],
    linkedCdsViews: ['I_Product', 'I_ProductPlant'],
    linkedAuthObjects: ['M_MATE_MAN', 'M_MATE_STA'],
    objectsCount: 54,
    isDemoRecord: true
  }
];

export const INITIAL_ASSESSMENTS: Assessment[] = [
  {
    id: 'ASM-2026-001',
    title: 'VA01 Standard Order Creation Transition',
    tcode: 'VA01',
    systemId: 'SYS-001',
    systemAlias: 'S4H_DEV_100',
    status: 'REVIEW_READY',
    currentStep: 'RECOMMENDATION',
    progressPercent: 78,
    ownerName: 'Elena Rostova (Lead SAP Consultant)',
    createdDate: '2026-11-01 09:30:00',
    updatedDate: '2026-11-02 17:45:00',
    recommendationOutcome: 'ADD_AND_CONFIGURE',
    businessProcess: 'Order-to-Cash (O2C)',
    targetRelease: 'SAP S/4HANA 2022 FPS02',
    isDemoRecord: true
  },
  {
    id: 'ASM-2026-002',
    title: 'ME21N Modern Procurement Workbench Assessment',
    tcode: 'ME21N',
    systemId: 'SYS-001',
    systemAlias: 'S4H_DEV_100',
    status: 'IN_PROGRESS',
    currentStep: 'FIT_GAP',
    progressPercent: 55,
    ownerName: 'Marcus Vance (Procurement Architect)',
    createdDate: '2026-11-01 14:15:00',
    updatedDate: '2026-11-02 11:20:00',
    recommendationOutcome: null,
    governanceState: 'REVIEW',
    businessProcess: 'Procure-to-Pay (P2P)',
    targetRelease: 'SAP S/4HANA 2022 FPS02',
    isDemoRecord: true
  },
  {
    id: 'ASM-2026-003',
    title: 'ZSD_CUSTOM_BILLING Custom App Build Blueprint',
    tcode: 'ZSD_CUSTOM_BILLING',
    systemId: 'SYS-001',
    systemAlias: 'S4H_DEV_100',
    status: 'APPROVED',
    currentStep: 'BLUEPRINT',
    progressPercent: 100,
    ownerName: 'David Chen (Senior ABAP Lead)',
    createdDate: '2026-10-28 11:00:00',
    updatedDate: '2026-11-02 18:00:00',
    recommendationOutcome: 'BUILD',
    businessProcess: 'Billing & Dispute Settlement',
    targetRelease: 'SAP S/4HANA 2022 FPS02',
    isDemoRecord: true
  }
];

export const INITIAL_TECHNICAL_OBJECTS: TechnicalObject[] = [
  {
    id: 'TO-001',
    name: 'SAPMV45A',
    type: 'PROGRAM',
    description: 'Main Order Processing Module Pool',
    packageName: 'VA',
    status: 'VERIFIED',
    linesOfCode: 14200,
    evidence: {
      id: 'EV-001',
      sourceInterface: '/sap/bc/adt/programs/programs/SAPMV45A',
      confidence: 'VERIFIED',
      extractedTimestamp: '2026-11-02 14:20:10',
      details: 'Discovered as direct executable pointer in table TSTC for transaction VA01.'
    }
  },
  {
    id: 'TO-002',
    name: 'MV45AFZZ',
    type: 'INCLUDE',
    description: 'Customer Enhancements Subroutines (USEREXIT_SAVE_DOCUMENT_PREPARE)',
    packageName: 'VA',
    status: 'VERIFIED',
    linesOfCode: 2840,
    evidence: {
      id: 'EV-002',
      sourceInterface: '/sap/bc/adt/programs/includes/MV45AFZZ',
      confidence: 'VERIFIED',
      extractedTimestamp: '2026-11-02 14:20:12',
      details: 'Identified 3 active custom field assignments modifying VBAK-ZZ_DISPUTE_FLAG.'
    }
  },
  {
    id: 'TO-003',
    name: 'I_SalesOrder',
    type: 'CDS_VIEW',
    description: 'Released Core Data Services View for Sales Order Header',
    packageName: 'SD_FAG_SO',
    status: 'VERIFIED',
    evidence: {
      id: 'EV-003',
      sourceInterface: '/sap/bc/adt/ddic/ddls/sources/I_SALESORDER',
      confidence: 'VERIFIED',
      extractedTimestamp: '2026-11-02 14:20:15',
      details: 'SAP standard CDS Entity C1 Released for Key User & Developer Extensibility.'
    }
  },
  {
    id: 'TO-004',
    name: 'V_VBAK_VKO',
    type: 'AUTH_OBJECT',
    description: 'Sales Organization Authorization Check Object',
    packageName: 'VA',
    status: 'VERIFIED',
    evidence: {
      id: 'EV-004',
      sourceInterface: '/sap/bc/adt/repository/informationsystem/search',
      confidence: 'VERIFIED',
      extractedTimestamp: '2026-11-02 14:20:18',
      details: 'SU24 check proposal: Sales Org (VKORG), Dist Channel (VTWEG), Division (SPART).'
    }
  },
  {
    id: 'TO-005',
    name: 'SUBMIT_DYNAMIC_PRICING',
    type: 'FUNCTION_MODULE',
    description: 'Dynamic Pricing Call (lv_func_name)',
    packageName: 'PRICING',
    status: 'UNKNOWN',
    evidence: {
      id: 'EV-005',
      sourceInterface: 'Static Code Inspection Parser',
      confidence: 'UNKNOWN',
      extractedTimestamp: '2026-11-02 14:20:22',
      details: 'Dynamic call detected: CALL FUNCTION lv_pricing_func. Target function cannot be statically resolved.'
    }
  }
];

export const INITIAL_REQUIREMENTS: BusinessRequirement[] = [
  {
    id: 'REQ-001',
    assessmentId: 'ASM-2026-001',
    title: 'Standard Sales Order Creation with Item Schedule Lines',
    statement: 'System must allow internal sales representatives to enter customer purchase orders with multi-item delivery schedules.',
    businessRule: 'Order value > $50,000 requires automatic credit block status.',
    actorRole: 'Internal Sales Representative',
    inputOutput: 'Input: Sold-To, Material, Quantity, Delivery Date. Output: Confirmed SO Document #.',
    validationLogic: 'Customer master credit check via VBUK and credit limit table KNKK.',
    exceptionHandling: 'If credit exceeded, mark header as Credit Blocked and send workflow alert.',
    priority: 'MUST',
    acceptanceCriteria: 'Order creates successfully in S/4HANA with confirmed ATP dates.',
    evidenceSource: 'Functional Spec FS-O2C-101 / Consultant Confirmation',
    reviewStatus: 'CONFIRMED',
    reviewedBy: 'Elena Rostova',
    reviewedDate: '2026-11-02 15:00:00',
    isConfirmed: true
  },
  {
    id: 'REQ-002',
    assessmentId: 'ASM-2026-001',
    title: 'Custom Plant-Specific Dispute Reason Flagging',
    statement: 'Order lines marked with dispute reason code 401 must route through specialized regional approval.',
    businessRule: 'Custom field ZZ_DISPUTE_CODE must be populated if customer has active dispute note.',
    actorRole: 'Regional Sales Manager',
    inputOutput: 'Input: Dispute Code (01-99). Output: Blocked Line Item with dispute tag.',
    validationLogic: 'Validate code against custom table ZSD_DISPUTE_REASONS.',
    exceptionHandling: 'Display error if invalid code entered; prevent order confirmation.',
    priority: 'MUST',
    acceptanceCriteria: 'Dispute reason appears in header facets and triggers custom notification.',
    evidenceSource: 'Legacy User Exit MV45AFZZ Code Inspection',
    reviewStatus: 'CONFIRMED',
    reviewedBy: 'Elena Rostova',
    reviewedDate: '2026-11-02 15:30:00',
    isConfirmed: true
  },
  {
    id: 'REQ-003',
    assessmentId: 'ASM-2026-001',
    title: 'Real-time Hazardous Goods Compliance Verification',
    statement: 'When hazardous chemicals are ordered, verify regional environmental transport regulations.',
    businessRule: 'Chemical class 3 materials require verified carrier license number.',
    actorRole: 'Compliance Specialist',
    inputOutput: 'Input: UN Number, Carrier ID. Output: Compliance Clearance Certificate.',
    validationLogic: 'Lookup external regulatory database via chemical compliance table.',
    exceptionHandling: 'Prevent delivery creation if carrier certification expired.',
    priority: 'SHOULD',
    acceptanceCriteria: 'Carrier check executes automatically during line item entry.',
    evidenceSource: 'Interview with Logistics Lead',
    reviewStatus: 'DRAFT',
    isConfirmed: false
  }
];

export const INITIAL_FIORI_CATALOGUE: FioriApplication[] = [
  {
    id: 'APP-001',
    appId: 'F1814',
    appName: 'Manage Sales Orders (Version 2)',
    appType: 'Fiori Elements',
    lineOfBusiness: 'Sales',
    businessRole: 'Internal Sales Representative (SAP_BR_INTERNAL_SALES_REP)',
    supportedReleases: ['S/4HANA 2020', 'S/4HANA 2021', 'S/4HANA 2022', 'S/4HANA 2023'],
    softwareComponents: ['S4CORE 107', 'SAP_UI 757'],
    odataServices: ['C_SALESORDER_TX_SRV (OData V2)', 'API_SALES_ORDER_SRV (OData V4)'],
    prerequisites: [
      { id: 'PR-1', type: 'SOFTWARE_COMPONENT', name: 'S4CORE', version: '>= 105', verified: true },
      { id: 'PR-2', type: 'ODATA_SERVICE', name: 'C_SALESORDER_TX_SRV', version: '0001', verified: true }
    ],
    extensibilityStatus: 'IN_APP_EXTENSIBILITY',
    sourceReferenceUrl: 'https://fal.cloud.sap/app/F1814',
    verifiedDate: '2026-10-15',
    isCuratedDemoData: true
  },
  {
    id: 'APP-002',
    appId: 'F0842A',
    appName: 'Create Sales Orders - Fast Entry',
    appType: 'Transactional',
    lineOfBusiness: 'Sales',
    businessRole: 'Internal Sales Representative (SAP_BR_INTERNAL_SALES_REP)',
    supportedReleases: ['S/4HANA 2021', 'S/4HANA 2022'],
    softwareComponents: ['S4CORE 107'],
    odataServices: ['SD_SO_FAST_ENTRY_SRV'],
    prerequisites: [
      { id: 'PR-3', type: 'BUSINESS_ROLE', name: 'SAP_BR_INTERNAL_SALES_REP', version: 'Current', verified: true }
    ],
    extensibilityStatus: 'EXTENSIBLE_BADI',
    sourceReferenceUrl: 'https://fal.cloud.sap/app/F0842A',
    verifiedDate: '2026-10-15',
    isCuratedDemoData: true
  },
  {
    id: 'APP-003',
    appId: 'F0843',
    appName: 'Manage Purchase Orders',
    appType: 'Fiori Elements',
    lineOfBusiness: 'Sourcing and Procurement',
    businessRole: 'Purchaser (SAP_BR_PURCHASER)',
    supportedReleases: ['S/4HANA 2020', 'S/4HANA 2021', 'S/4HANA 2022', 'S/4HANA 2023'],
    softwareComponents: ['S4CORE 107'],
    odataServices: ['MM_PUR_PO_MAINT_V2_SRV'],
    prerequisites: [
      { id: 'PR-4', type: 'ODATA_SERVICE', name: 'MM_PUR_PO_MAINT_V2_SRV', version: '0001', verified: true }
    ],
    extensibilityStatus: 'IN_APP_EXTENSIBILITY',
    sourceReferenceUrl: 'https://fal.cloud.sap/app/F0843',
    verifiedDate: '2026-10-15',
    isCuratedDemoData: true
  },
  {
    id: 'APP-004',
    appId: 'F2358',
    appName: 'Manage Journal Entries',
    appType: 'Fiori Elements',
    lineOfBusiness: 'Finance',
    businessRole: 'General Ledger Accountant (SAP_BR_GL_ACCOUNTANT)',
    supportedReleases: ['S/4HANA 2021', 'S/4HANA 2022', 'S/4HANA 2023'],
    softwareComponents: ['S4CORE 107'],
    odataServices: ['FAC_FINANCIAL_DOCUMENT_SRV'],
    prerequisites: [
      { id: 'PR-5', type: 'SOFTWARE_COMPONENT', name: 'S4CORE', version: '107', verified: true }
    ],
    extensibilityStatus: 'EXTENSIBLE_BADI',
    sourceReferenceUrl: 'https://fal.cloud.sap/app/F2358',
    verifiedDate: '2026-10-15',
    isCuratedDemoData: true
  }
];

export const INITIAL_FIT_GAP: FitGapResult[] = [
  {
    id: 'FG-001',
    assessmentId: 'ASM-2026-001',
    requirementId: 'REQ-001',
    requirementTitle: 'Standard Sales Order Creation with Item Schedule Lines',
    candidateAppId: 'F1814',
    candidateAppName: 'Manage Sales Orders',
    coverageStatus: 'SUPPORTED',
    evidence: 'Official FAL capability specification confirms native Schedule Line creation in F1814.',
    gapExplanation: 'None. Standard Fiori elements Object Page provides dedicated Schedule Lines table facet.',
    reviewerNotes: 'Verified in SAP standard help documentation for S/4HANA 2022.',
    reviewerName: 'Elena Rostova',
    reviewedTimestamp: '2026-11-02 16:00:00'
  },
  {
    id: 'FG-002',
    assessmentId: 'ASM-2026-001',
    requirementId: 'REQ-002',
    requirementTitle: 'Custom Plant-Specific Dispute Reason Flagging',
    candidateAppId: 'F1814',
    candidateAppName: 'Manage Sales Orders',
    coverageStatus: 'PARTIAL',
    evidence: 'F1814 supports custom fields via app Custom Fields and Logic (Business Context: Sales Document Item).',
    gapExplanation: 'Standard app lacks dispute reason field out of box, but supports adding ZZ_DISPUTE_CODE via key-user extensibility and BAdI BADI_SD_SALES_ITEM.',
    reviewerNotes: 'Can be resolved via supported Clean-Core in-app extension without custom app build.',
    reviewerName: 'Elena Rostova',
    reviewedTimestamp: '2026-11-02 16:15:00'
  },
  {
    id: 'FG-003',
    assessmentId: 'ASM-2026-001',
    requirementId: 'REQ-003',
    requirementTitle: 'Real-time Hazardous Goods Compliance Verification',
    candidateAppId: 'F1814',
    candidateAppName: 'Manage Sales Orders',
    coverageStatus: 'UNKNOWN',
    evidence: 'No verified published documentation in FAL regarding real-time chemical license checks in F1814.',
    gapExplanation: 'Requires sandbox testing to verify if Product Compliance integration is enabled in target client.',
    reviewerNotes: 'Must NOT be treated as Unsupported. Requires functional spike with EHS consultant.',
    reviewerName: 'Elena Rostova',
    reviewedTimestamp: '2026-11-02 16:20:00'
  }
];

export const INITIAL_RECOMMENDATIONS: Recommendation[] = [
  {
    assessmentId: 'ASM-2026-001',
    outcome: 'ADD_AND_CONFIGURE',
    rationale: 'Standard SAP Fiori application F1814 (Manage Sales Orders) satisfies 100% of critical core order creation requirements. The custom dispute reason flagging is fully feasible via SAP standard in-app custom fields and Clean Core adaptation (BADI_SD_SALES_ITEM). Custom application generation is NOT justified.',
    criticalRequirementsMet: 2,
    totalRequirements: 2,
    unresolvedQuestions: [
      'Confirm whether target client 100 has SAP S/4HANA Product Compliance module active for hazardous goods check.'
    ],
    evidenceCitations: [
      'SAP Fiori Apps Reference Library entry F1814',
      'Extensibility documentation for Business Context: Sales Document Item'
    ],
    reviewerName: 'Elena Rostova (Lead Consultant) & Arthur Pendelton (Enterprise Architect)',
    approvalStatus: 'PENDING_REVIEW',
    decidedTimestamp: '2026-11-02 16:45:00'
  },
  {
    assessmentId: 'ASM-2026-003',
    outcome: 'BUILD',
    rationale: 'No standard SAP Fiori application covers multi-plant consolidated billing with dispute settlement and automated credit reconciliation. 3 core proprietary business rules cannot be mapped to standard apps. Custom Fiori Elements draft generation is approved under Clean-Core Tier 1 guidelines.',
    criticalRequirementsMet: 0,
    totalRequirements: 4,
    unresolvedQuestions: [
      'Verify target RAP behavior definition managed vs unmanaged implementation options for plant lock table.'
    ],
    evidenceCitations: [
      'Fit-Gap evaluation against F0842A and F1814 yielding 0% coverage on dispute aggregation.',
      'Approved business justification charter signed by Global Finance Director.'
    ],
    reviewerName: 'David Chen (Senior ABAP Lead)',
    approvalStatus: 'APPROVED',
    decidedTimestamp: '2026-11-01 11:30:00'
  }
];

export const INITIAL_BLUEPRINTS: Record<string, GeneratedApplicationBlueprint> = {
  'ASM-2026-003': {
    projectId: 'GEN-2026-003',
    assessmentId: 'ASM-2026-003',
    targetReleaseProfile: 'SAP S/4HANA 2022 FPS02 (ABAP 7.57)',
    applicationPattern: 'LIST_REPORT_OBJECT_PAGE',
    dataModelProposal: {
      rootEntity: 'Z_I_PlantBillingDispute',
      compositionEntities: ['Z_I_PlantBillingItem', 'Z_I_DisputeHistory'],
      associations: ['I_Customer', 'I_Plant', 'I_Currency'],
      keyFields: ['BillingDocument', 'Plant', 'DisputeId']
    },
    serviceProposal: {
      serviceDefinitionName: 'ZSD_PLANT_BILLING_DISPUTE',
      serviceBindingName: 'ZSB_PLANT_BILLING_V4',
      protocol: 'ODATA_V4'
    },
    uiProposal: {
      floorplan: 'SAP Fiori Elements List Report & Object Page (OData V4)',
      listReportFields: ['BillingDocument', 'Plant', 'CustomerName', 'DisputeStatus', 'NetValue', 'Currency'],
      objectPageSections: ['General Information', 'Dispute Valuation', 'Line Items', 'Approval History'],
      actions: ['ResolveDispute', 'EscalateToManager', 'ReleaseBillingHold']
    },
    validationStatus: 'PASS',
    generatedTimestamp: '2026-11-02 17:00:00',
    artifacts: [
      {
        id: 'ART-01',
        fileName: 'Z_I_PlantBillingDispute.cds',
        filePath: 'abap/cds/Z_I_PlantBillingDispute.cds',
        fileType: 'CDS',
        sizeBytes: 1840,
        checksum: 'sha256:7f8a9e10283bc8d1',
        contentSnippet: `@AccessControl.authorizationCheck: #CHECK
@EndUserText.label: 'Plant Consolidated Billing & Dispute Root'
define root view entity Z_I_PlantBillingDispute
  as select from vbrk as Header
  composition [0..*] of Z_I_PlantBillingItem as _Items
  association [1..1] to I_Customer as _Customer on $projection.Customer = _Customer.Customer
{
  key Header.vbeln as BillingDocument,
  key Header.bukrs as CompanyCode,
      Header.kunrg as Customer,
      Header.netwr as NetValue,
      Header.waerk as Currency,
      _Items,
      _Customer
}`
      },
      {
        id: 'ART-02',
        fileName: 'ZSD_PLANT_BILLING_DISPUTE.srvd',
        filePath: 'abap/srvd/ZSD_PLANT_BILLING_DISPUTE.srvd',
        fileType: 'SRVD',
        sizeBytes: 620,
        checksum: 'sha256:3a1b9c8e223fd740',
        contentSnippet: `@EndUserText.label: 'Service Definition for Plant Billing Cockpit'
define service ZSD_PLANT_BILLING_DISPUTE {
  expose Z_I_PlantBillingDispute as BillingCockpit;
  expose Z_I_PlantBillingItem    as BillingItems;
  expose I_Customer              as CustomerLookup;
}`
      },
      {
        id: 'ART-03',
        fileName: 'manifest.json',
        filePath: 'ui5/webapp/manifest.json',
        fileType: 'JSON',
        sizeBytes: 3120,
        checksum: 'sha256:b8d7c2a1e940f812',
        contentSnippet: `{
  "_version": "1.49.0",
  "sap.app": {
    "id": "zsd.plantbilling.manage",
    "type": "application",
    "i18n": "i18n/i18n.properties",
    "title": "{{appTitle}}",
    "description": "{{appDescription}}",
    "dataSources": {
      "mainService": {
        "uri": "/sap/opu/odata4/sap/zsd_plant_billing_v4/srvd/sap/zsd_plant_billing_dispute/0001/",
        "type": "OData",
        "settings": {
          "odataVersion": "4.0"
        }
      }
    }
  },
  "sap.ui5": {
    "dependencies": {
      "libs": {
        "sap.fe.templates": {}
      }
    },
    "routing": {
      "routes": [
        {
          "name": "BillingList",
          "pattern": ":?query:",
          "target": "BillingList"
        }
      ]
    }
  }
}`
      }
    ]
  }
};

export const INITIAL_VALIDATION_FINDINGS: ValidationFinding[] = [
  {
    id: 'VF-001',
    category: 'CLEAN_CORE',
    ruleId: 'RULE-CC-001',
    title: 'Released CDS Entity Usage Check',
    description: 'Verify that all associations target C1-released CDS entities.',
    severity: 'INFO',
    status: 'PASS',
    evidence: 'Associations to I_Customer and I_Plant use standard C1-released SAP CDS entities.',
    suggestedRemediation: 'None required.',
    sapGuidelineReference: 'SAP Clean Core Guide — Chapter 3: Extensibility Model'
  },
  {
    id: 'VF-002',
    category: 'ARCHITECTURE',
    ruleId: 'RULE-ARCH-004',
    title: 'OData V4 Protocol Usage for Fiori Elements',
    description: 'Service definition and binding must use OData V4 for modern List Report floorplans.',
    severity: 'INFO',
    status: 'PASS',
    evidence: 'Service Binding ZSB_PLANT_BILLING_V4 configured with OData V4 - UI.',
    suggestedRemediation: 'None required.',
    sapGuidelineReference: 'SAP Fiori Elements OData V4 Guidelines'
  },
  {
    id: 'VF-003',
    category: 'SECURITY',
    ruleId: 'RULE-SEC-002',
    title: 'Authorization Check Annotation on Root CDS Entity',
    description: 'Every root view entity must declare authorizationCheck #CHECK or #PRIVILEGED_ONLY.',
    severity: 'WARNING',
    status: 'PASS',
    evidence: '@AccessControl.authorizationCheck: #CHECK declared with matching DCL file generated.',
    suggestedRemediation: 'Ensure DCL rule is maintained in DEV system before transport.',
    sapGuidelineReference: 'ABAP CDS Access Control Guidelines'
  },
  {
    id: 'VF-004',
    category: 'RELEASE_COMPATIBILITY',
    ruleId: 'RULE-REL-003',
    title: 'View Entity Syntax Verification (S/4HANA 2022+)',
    description: 'Ensure "DEFINE ROOT VIEW ENTITY" is used instead of deprecated DDIC-based "DEFINE VIEW".',
    severity: 'CRITICAL',
    status: 'PASS',
    evidence: 'Syntactic validation confirms valid "define root view entity" structure.',
    suggestedRemediation: 'None required.',
    sapGuidelineReference: 'SAP Note 3015497 — CDS View Entities'
  }
];

export const INITIAL_DISCOVERY_JOBS: DiscoveryJob[] = [
  {
    id: 'JOB-2026-081',
    jobType: 'DISCOVERY_SCAN',
    systemAlias: 'S4H_DEV_100',
    targetTCode: 'VA01',
    status: 'COMPLETED',
    progressPercent: 100,
    createdDate: '2026-11-02 14:19:00',
    startedDate: '2026-11-02 14:19:02',
    finishedDate: '2026-11-02 14:20:25',
    executedBy: 'Elena Rostova',
    stageDetails: 'Completed: Extracted TSTC, TADIR, 5 linked tables, 3 CDS views, and SU24 authorization records.'
  },
  {
    id: 'JOB-2026-082',
    jobType: 'WHERE_USED_ANALYSIS',
    systemAlias: 'S4H_DEV_100',
    targetTCode: 'ME21N',
    status: 'RUNNING',
    progressPercent: 65,
    createdDate: '2026-11-02 17:30:00',
    startedDate: '2026-11-02 17:30:05',
    executedBy: 'Marcus Vance',
    stageDetails: 'In Progress: Scanning ADT Cross-References for Function Pool SAPLMEGUI...'
  },
  {
    id: 'JOB-2026-079',
    jobType: 'DRAFT_GENERATION',
    systemAlias: 'S4H_DEV_100',
    targetTCode: 'ZSD_CUSTOM_BILLING',
    status: 'COMPLETED',
    progressPercent: 100,
    createdDate: '2026-11-02 16:58:00',
    startedDate: '2026-11-02 16:58:02',
    finishedDate: '2026-11-02 17:00:15',
    executedBy: 'David Chen',
    stageDetails: 'Generated 3 draft files: CDS Entity DDL, Service Definition SRVD, and UI5 manifest.json.'
  }
];

export const INITIAL_AUDIT_EVENTS: AuditEvent[] = [
  {
    id: 'AUD-001',
    timestamp: '2026-11-02 17:45:00',
    userId: 'elena.rostova@corp.internal',
    userRole: 'SAP Functional Consultant',
    action: 'CONFIRM_REQUIREMENT',
    entityType: 'BusinessRequirement',
    entityId: 'REQ-002',
    systemId: 'SYS-001',
    outcome: 'SUCCESS',
    details: 'Requirement REQ-002 confirmed with status CONFIRMED after functional review.',
    correlationId: 'corr-8f92b104-e2'
  },
  {
    id: 'AUD-002',
    timestamp: '2026-11-02 17:00:15',
    userId: 'david.chen@corp.internal',
    userRole: 'Senior ABAP Lead',
    action: 'GENERATE_DRAFT_BLUEPRINT',
    entityType: 'GenerationProject',
    entityId: 'GEN-2026-003',
    systemId: 'SYS-001',
    outcome: 'SUCCESS',
    details: 'Draft blueprint generated for ZSD_CUSTOM_BILLING (Pattern: LIST_REPORT_OBJECT_PAGE).',
    correlationId: 'corr-1a4c789d-09'
  },
  {
    id: 'AUD-003',
    timestamp: '2026-11-02 16:45:00',
    userId: 'elena.rostova@corp.internal',
    userRole: 'SAP Functional Consultant',
    action: 'RECORD_RECOMMENDATION',
    entityType: 'Recommendation',
    entityId: 'ASM-2026-001',
    systemId: 'SYS-001',
    outcome: 'SUCCESS',
    details: 'Recorded decision ADD_AND_CONFIGURE for VA01 based on standard F1814.',
    correlationId: 'corr-5d3e218a-f4'
  },
  {
    id: 'AUD-004',
    timestamp: '2026-11-02 14:19:00',
    userId: 'elena.rostova@corp.internal',
    userRole: 'SAP Functional Consultant',
    action: 'DISPATCH_DISCOVERY_JOB',
    entityType: 'DiscoveryJob',
    entityId: 'JOB-2026-081',
    systemId: 'SYS-001',
    outcome: 'SUCCESS',
    details: 'Dispatched automated read-only metadata discovery for T-Code VA01 on system S4H_DEV_100.',
    correlationId: 'corr-9c8a123f-44'
  }
];
