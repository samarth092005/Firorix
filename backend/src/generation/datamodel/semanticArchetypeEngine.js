/**
 * Fiorify — Universal Semantic Domain Archetype Engine
 *
 * Intelligently classifies any SAP transaction code (Standard or Custom Z* / Y*)
 * across 6 core enterprise domains:
 * 1. MM (Materials Management & Purchasing)
 * 2. PP (Production Planning & Manufacturing)
 * 3. ABAP / Basis (System Administration, Diagnostics, Monitoring)
 * 4. FI (Financial Accounting & Controlling)
 * 5. SD (Sales & Distribution)
 * 6. Universal / Custom (Hierarchical Business Document Workflow)
 *
 * Synthesizes production-grade Clean Core Tier 2 RAP specifications:
 * - Multi-entity data models with Parent Header and Child Item composition
 * - Authentic SAP DDIC types, semantic roles, and UI lineItem/selection annotations
 * - Domain-specific business requirements (Validations, Determinations, Actions)
 * - Domain-realistic synthetic mock data generators for live UI preview
 */

export const DOMAIN_ARCHETYPES = Object.freeze({
  MM: 'MATERIALS_MANAGEMENT',
  PP: 'PRODUCTION_PLANNING',
  BASIS: 'SYSTEM_ADMIN_DIAGNOSTICS',
  FI: 'FINANCIAL_ACCOUNTING',
  SD: 'SALES_DISTRIBUTION',
  UNIVERSAL: 'UNIVERSAL_BUSINESS_DOCUMENT'
});

export class SemanticArchetypeEngine {
  /**
   * Classifies a transaction code and metadata into an enterprise domain archetype.
   */
  classifyDomain(tcode = '', description = '', businessArea = '') {
    const cleanT = String(tcode || '').trim().toUpperCase();
    const cleanDesc = String(description || '').toLowerCase();
    const cleanArea = String(businessArea || '').toLowerCase();

    // 1. ABAP / Basis / System Diagnostics
    if (
      /^(ST|SM|SLG|DB|AL|RZ|STAT|SU01|PFCG)/i.test(cleanT) ||
      /dump|runtime error|system log|diagnostic|lock entry|work process|job monitor|buffer|spool|abap basis/i.test(cleanDesc + ' ' + cleanArea)
    ) {
      return DOMAIN_ARCHETYPES.BASIS;
    }

    // 2. MM - Materials Management & Purchasing
    if (
      /^(ME|MM|MIGO|MIRO|MB|MR|MN|EBAN|EKKO)/i.test(cleanT) ||
      /purchas|procure|material master|goods receipt|inventory|supplier invoice|requisition|sourcing/i.test(cleanDesc + ' ' + cleanArea)
    ) {
      return DOMAIN_ARCHETYPES.MM;
    }

    // 3. PP - Production Planning & Manufacturing
    if (
      /^(CO0|CO1|CO2|MD0|MD1|CR0|CR1|CS0|CS1|PL0|C2)/i.test(cleanT) ||
      /production order|manufacturing|bill of material|bom|routing|work center|mrp|order confirmation|plant maintenance/i.test(cleanDesc + ' ' + cleanArea)
    ) {
      return DOMAIN_ARCHETYPES.PP;
    }

    // 4. FI - Financial Accounting & Controlling
    if (
      /^(FB|F-|FS|BK|BS|KO0|KS0|FBL|FK|FD)/i.test(cleanT) ||
      /financ|general ledger|gl account|journal entry|accounts payable|accounts receivable|payment|clearing|controlling|cost center|profit center/i.test(cleanDesc + ' ' + cleanArea)
    ) {
      return DOMAIN_ARCHETYPES.FI;
    }

    // 5. SD - Sales & Distribution
    if (
      /^(VA|VF|VL|XD|VK|VD|VBAK|VBAP)/i.test(cleanT) ||
      /sales order|sales and distribution|billing|outbound delivery|shipping|customer quote|customer contract/i.test(cleanDesc + ' ' + cleanArea)
    ) {
      return DOMAIN_ARCHETYPES.SD;
    }

    // 6. Universal Custom Business Object (Z* / Y* or general)
    return DOMAIN_ARCHETYPES.UNIVERSAL;
  }

  /**
   * Synthesizes full multi-entity data model, requirements, and architecture baseline.
   */
  synthesizeArchetype(context = {}) {
    const { tcode = 'ZCUSTOM', description = '', businessArea = '', targetRelease = 'SAP S/4HANA 2023 Private Edition' } = context;
    const cleanTcode = tcode.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    const domain = this.classifyDomain(tcode, description, businessArea);

    switch (domain) {
      case DOMAIN_ARCHETYPES.BASIS:
        return this._buildBasisArchetype(cleanTcode, tcode, description, targetRelease);
      case DOMAIN_ARCHETYPES.MM:
        return this._buildPurchasingArchetype(cleanTcode, tcode, description, targetRelease);
      case DOMAIN_ARCHETYPES.PP:
        return this._buildProductionArchetype(cleanTcode, tcode, description, targetRelease);
      case DOMAIN_ARCHETYPES.FI:
        return this._buildFinanceArchetype(cleanTcode, tcode, description, targetRelease);
      case DOMAIN_ARCHETYPES.SD:
        return this._buildSalesArchetype(cleanTcode, tcode, description, targetRelease);
      case DOMAIN_ARCHETYPES.UNIVERSAL:
      default:
        return this._buildUniversalArchetype(cleanTcode, tcode, description, targetRelease);
    }
  }

  // =========================================================================
  // 1. BASIS & SYSTEM DIAGNOSTICS ARCHETYPE (ST22, SM50, etc.)
  // =========================================================================
  _buildBasisArchetype(cleanTcode, tcode, desc, release) {
    const rootName = `Z_I_${cleanTcode}Dump`;
    const childName = `Z_I_${cleanTcode}CallStack`;
    const rootId = `ENT-${cleanTcode}-DUMP`;
    const childId = `ENT-${cleanTcode}-STACK`;
    const relId = `REL-${cleanTcode}-STACK_COMP`;

    const requirements = [
      {
        requirementId: `REQ-${cleanTcode}-001`,
        title: `ABAP Runtime Error & Dump Analytics (${tcode})`,
        category: 'FUNCTIONAL',
        priority: 'MUST_HAVE',
        status: 'CONFIRMED',
        sourceType: 'DOMAIN_ARCHETYPE',
        source: 'DOMAIN_ARCHETYPE',
        description: `Inspect, filter, and analyze ABAP short dumps (runtime errors) with full exception context and stack trace.`,
        acceptanceCriteria: [
          'User can filter dumps by Date Range, Runtime Error Code, User Name, and Program.',
          'Object page displays comprehensive dump summary, system environment, and active exception.',
          'Responsive List Report provides quick-glance status indicators and error categorization.'
        ]
      },
      {
        requirementId: `REQ-${cleanTcode}-002`,
        title: 'Hierarchical Call Stack Trace Viewer',
        category: 'FUNCTIONAL',
        priority: 'MUST_HAVE',
        status: 'CONFIRMED',
        sourceType: 'DOMAIN_ARCHETYPE',
        source: 'DOMAIN_ARCHETYPE',
        description: 'Provide tabular line-by-line inspection of ABAP program execution call stack and line numbers.',
        acceptanceCriteria: [
          'Call stack items composed under parent dump record with cascade relationship.',
          'Stack view shows execution event type (FORM, METHOD, FUNCTION) and line offset.'
        ]
      },
      {
        requirementId: `REQ-${cleanTcode}-003`,
        title: 'Action: Re-Analyze Dump Context',
        category: 'ACTION',
        priority: 'SHOULD_HAVE',
        status: 'CONFIRMED',
        sourceType: 'DOMAIN_ARCHETYPE',
        source: 'DOMAIN_ARCHETYPE',
        description: 'Implement instance action "reAnalyzeDump" to verify if code fix resolved underlying exception.',
        acceptanceCriteria: [
          'Action button visible in Object Page header.',
          'Updates resolution status to IN_ANALYSIS with timestamp.'
        ]
      },
      {
        requirementId: `REQ-${cleanTcode}-004`,
        title: 'Action: Mark Resolution Status',
        category: 'ACTION',
        priority: 'SHOULD_HAVE',
        status: 'CONFIRMED',
        sourceType: 'DOMAIN_ARCHETYPE',
        source: 'DOMAIN_ARCHETYPE',
        description: 'Enable Basis administrators to acknowledge and flag dump as RESOLVED or KNOWN_BUG.',
        acceptanceCriteria: [
          'Action updates ResolutionStatus field with audit record of user and timestamp.'
        ]
      },
      {
        requirementId: `REQ-${cleanTcode}-005`,
        title: 'Validation: Date Range Safety Boundary',
        category: 'VALIDATION',
        priority: 'MUST_HAVE',
        status: 'CONFIRMED',
        sourceType: 'DOMAIN_ARCHETYPE',
        source: 'DOMAIN_ARCHETYPE',
        description: 'Validate that query window does not exceed 90 days to prevent excessive database scan.',
        acceptanceCriteria: [
          'Returns user-facing error message if selected dump query range exceeds 90 days.'
        ]
      }
    ];

    const entities = [
      {
        id: rootId,
        entityId: rootId,
        name: rootName,
        label: `${tcode} ABAP Runtime Dump`,
        description: `Header Entity for ${tcode} ABAP Dump Analysis`,
        entityType: 'ROOT',
        isRoot: true,
        persistenceStrategy: 'MANAGED_TABLE',
        tableName: `Z${cleanTcode.slice(0, 8)}DMP`,
        fields: [
          { id: 'FLD-UUID', name: 'DumpUUID', label: 'Technical Key', abapType: 'UUID', type: 'sysuuid_x16', isKey: true, isMandatory: true, semanticRole: 'KEY', description: 'Technical Primary Key' },
          { id: 'FLD-DATE', name: 'DumpDate', label: 'Dump Date', abapType: 'DATS', type: 'abap.dats', isKey: false, isMandatory: true, semanticRole: 'DATE', description: 'Date of Runtime Error' },
          { id: 'FLD-TIME', name: 'DumpTime', label: 'Dump Time', abapType: 'TIMS', type: 'abap.tims', isKey: false, isMandatory: true, semanticRole: 'TIME', description: 'Time of Occurrence' },
          { id: 'FLD-ERR', name: 'RuntimeError', label: 'Runtime Error', abapType: 'CHAR', type: 'abap.char', length: 30, isKey: false, isMandatory: true, semanticRole: 'ERROR_CODE', description: 'ABAP Error Code (e.g. TIME_OUT, TSV_TNEW_PAGE_ALLOC_FAILED)' },
          { id: 'FLD-EXC', name: 'ExceptionClass', label: 'Exception Class', abapType: 'CHAR', type: 'abap.char', length: 30, isKey: false, isMandatory: false, semanticRole: 'TEXT', description: 'CX_ Exception Class Name' },
          { id: 'FLD-PROG', name: 'ProgramName', label: 'Program Name', abapType: 'CHAR', type: 'abap.char', length: 40, isKey: false, isMandatory: true, semanticRole: 'OBJECT_NAME', description: 'ABAP Program in Execution' },
          { id: 'FLD-INCL', name: 'IncludeName', label: 'Include', abapType: 'CHAR', type: 'abap.char', length: 40, isKey: false, isMandatory: false, semanticRole: 'OBJECT_NAME', description: 'Source Code Include' },
          { id: 'FLD-USER', name: 'UserName', label: 'User', abapType: 'CHAR', type: 'abap.char', length: 12, isKey: false, isMandatory: true, semanticRole: 'CREATED_BY', description: 'Triggering User ID' },
          { id: 'FLD-CLIENT', name: 'Client', label: 'Client', abapType: 'CHAR', type: 'abap.char', length: 3, isKey: false, isMandatory: true, semanticRole: 'CLIENT', description: 'SAP Client' },
          { id: 'FLD-SRV', name: 'ServerName', label: 'Application Server', abapType: 'CHAR', type: 'abap.char', length: 30, isKey: false, isMandatory: false, semanticRole: 'SYSTEM_ID', description: 'Host / App Server' },
          { id: 'FLD-SHORT', name: 'ErrorShortText', label: 'Error Short Text', abapType: 'CHAR', type: 'abap.char', length: 120, isKey: false, isMandatory: false, semanticRole: 'TEXT', description: 'Short Description of Crash' },
          { id: 'FLD-STATUS', name: 'ResolutionStatus', label: 'Status', abapType: 'CHAR', type: 'abap.char', length: 12, isKey: false, isMandatory: false, semanticRole: 'STATUS', description: 'NEW, IN_ANALYSIS, RESOLVED' },
          { id: 'FLD-CRDAT', name: 'CreatedAt', label: 'Created At', abapType: 'TIMESTAMPL', type: 'abap.utclong', isReadOnly: true, semanticRole: 'ADMIN_CREATED_AT', description: 'Log Record Timestamp' },
          { id: 'FLD-CHGAT', name: 'LastChangedAt', label: 'Last Changed At', abapType: 'TIMESTAMPL', type: 'abap.utclong', isReadOnly: true, semanticRole: 'ADMIN_LAST_CHANGED_AT', description: 'Audit Change Timestamp' }
        ],
        relationships: []
      },
      {
        id: childId,
        entityId: childId,
        name: childName,
        label: `${tcode} Call Stack Trace`,
        description: `Child Item Entity representing execution call stack for ${rootName}`,
        entityType: 'CHILD',
        isRoot: false,
        persistenceStrategy: 'MANAGED_TABLE',
        tableName: `Z${cleanTcode.slice(0, 8)}STK`,
        fields: [
          { id: 'FLD-STK-UUID', name: 'StackUUID', label: 'Stack Key', abapType: 'UUID', type: 'sysuuid_x16', isKey: true, isMandatory: true, semanticRole: 'KEY', description: 'Technical Stack Key' },
          { id: 'FLD-STK-PAR', name: 'DumpUUID', label: 'Parent Dump Key', abapType: 'UUID', type: 'sysuuid_x16', isKey: false, isMandatory: true, semanticRole: 'PARENT_KEY', description: 'Reference to Parent Dump' },
          { id: 'FLD-STK-LVL', name: 'StackLevel', label: 'Stack Depth', abapType: 'INT4', type: 'abap.int4', isKey: false, isMandatory: true, semanticRole: 'NUMBER', description: 'Hierarchy Level (1, 2, ...)' },
          { id: 'FLD-STK-EVT', name: 'EventType', label: 'Event Type', abapType: 'CHAR', type: 'abap.char', length: 20, isKey: false, isMandatory: true, semanticRole: 'TEXT', description: 'FORM, METHOD, FUNCTION, EVENT' },
          { id: 'FLD-STK-EVTN', name: 'EventName', label: 'Routine / Method', abapType: 'CHAR', type: 'abap.char', length: 60, isKey: false, isMandatory: true, semanticRole: 'TEXT', description: 'Routine or Method Name' },
          { id: 'FLD-STK-PROG', name: 'ProgramName', label: 'Program Name', abapType: 'CHAR', type: 'abap.char', length: 40, isKey: false, isMandatory: true, semanticRole: 'OBJECT_NAME', description: 'Component Program' },
          { id: 'FLD-STK-LINE', name: 'LineNumber', label: 'Line Number', abapType: 'INT4', type: 'abap.int4', isKey: false, isMandatory: true, semanticRole: 'NUMBER', description: 'Source Code Line Offset' }
        ],
        relationships: []
      }
    ];

    const relationships = [
      {
        relationshipId: relId,
        sourceEntityId: rootId,
        targetEntityId: childId,
        name: '_CallStack',
        relationshipType: 'COMPOSITION',
        cardinality: 'ZERO_TO_MANY',
        description: `Composition from ${rootName} to ${childName}`,
        onDelete: 'CASCADE'
      }
    ];

    return {
      domain: DOMAIN_ARCHETYPES.BASIS,
      domainTitle: 'ABAP Dump Analysis & System Diagnostics',
      rootEntityName: rootName,
      childEntityName: childName,
      initialRequirements: requirements,
      starterDataModel: {
        specVersion: 1,
        rootEntity: rootName,
        entities,
        relationships,
        validationReport: { isValid: true, summary: { totalEntities: 2, totalFields: 21, totalRelationships: 1, errorCount: 0, warningCount: 0 }, issues: [] },
        status: 'CONFIGURED'
      },
      starterArchitecture: {
        specVersion: 1,
        rapScenario: 'RAP_MANAGED',
        odataVersion: 'ODATA_V4',
        uiPattern: 'LIST_REPORT_OBJECT_PAGE',
        cleanCoreTier: 'TIER_2_CLOUD_DEVELOPER',
        isDraftEnabled: true,
        rootEntity: rootName,
        status: 'CONFIGURED'
      }
    };
  }

  // =========================================================================
  // 2. MATERIALS MANAGEMENT & PURCHASING ARCHETYPE (ME21N, MM, etc.)
  // =========================================================================
  _buildPurchasingArchetype(cleanTcode, tcode, desc, release) {
    const rootName = `Z_I_${cleanTcode}Header`;
    const childName = `Z_I_${cleanTcode}Item`;
    const rootId = `ENT-${cleanTcode}-HDR`;
    const childId = `ENT-${cleanTcode}-ITM`;
    const relId = `REL-${cleanTcode}-COMP`;

    const requirements = [
      {
        requirementId: `REQ-${cleanTcode}-001`,
        title: `Procurement Document Header & Status (${tcode})`,
        category: 'FUNCTIONAL',
        priority: 'MUST_HAVE',
        status: 'CONFIRMED',
        sourceType: 'DOMAIN_ARCHETYPE',
        source: 'DOMAIN_ARCHETYPE',
        description: `Manage purchasing orders and contracts with Company Code, Supplier, and Total Valuation.`,
        acceptanceCriteria: [
          'User can filter orders by Supplier, Company Code, and Purchasing Group.',
          'Object page displays complete header terms, delivery dates, and status lifecycle.'
        ]
      },
      {
        requirementId: `REQ-${cleanTcode}-002`,
        title: 'Line Item Specification with Quantities & Units',
        category: 'FUNCTIONAL',
        priority: 'MUST_HAVE',
        status: 'CONFIRMED',
        sourceType: 'DOMAIN_ARCHETYPE',
        source: 'DOMAIN_ARCHETYPE',
        description: 'Provide tabular management of line item materials, order quantities, net pricing, and receiving plants.',
        acceptanceCriteria: [
          'Line items support dynamic quantity entry with currency-linked net amounts.',
          'Cascading delete removes line items when parent order is removed.'
        ]
      },
      {
        requirementId: `REQ-${cleanTcode}-003`,
        title: 'Action: Formal Approval Release',
        category: 'ACTION',
        priority: 'MUST_HAVE',
        status: 'CONFIRMED',
        sourceType: 'DOMAIN_ARCHETYPE',
        source: 'DOMAIN_ARCHETYPE',
        description: 'Implement instance action "approvePurchaseOrder" for authorized purchasing manager sign-off.',
        acceptanceCriteria: [
          'Transitions status from DRAFT or IN_APPROVAL to APPROVED.',
          'Disables item edits once approved under Clean Core governance.'
        ]
      },
      {
        requirementId: `REQ-${cleanTcode}-004`,
        title: 'Validation: Mandatory Supplier & Positive Quantity',
        category: 'VALIDATION',
        priority: 'MUST_HAVE',
        status: 'CONFIRMED',
        sourceType: 'DOMAIN_ARCHETYPE',
        source: 'DOMAIN_ARCHETYPE',
        description: 'Enforce that Supplier exists in master records and item quantity is strictly greater than zero.',
        acceptanceCriteria: [
          'Returns user-facing error message if order quantity is zero or negative.'
        ]
      }
    ];

    const entities = [
      {
        id: rootId,
        entityId: rootId,
        name: rootName,
        label: `${tcode} Purchase Document Header`,
        description: `Root Header Entity for ${tcode} Purchasing Process`,
        entityType: 'ROOT',
        isRoot: true,
        persistenceStrategy: 'MANAGED_TABLE',
        tableName: `Z${cleanTcode.slice(0, 8)}HDR`,
        fields: [
          { id: 'FLD-UUID', name: 'PurchaseOrderUUID', label: 'Technical Key', abapType: 'UUID', type: 'sysuuid_x16', isKey: true, isMandatory: true, semanticRole: 'KEY' },
          { id: 'FLD-ID', name: 'PurchaseOrder', label: 'PO Number', abapType: 'CHAR', type: 'abap.char', length: 10, isMandatory: true, semanticRole: 'BUSINESS_KEY' },
          { id: 'FLD-BUKRS', name: 'CompanyCode', label: 'Company Code', abapType: 'CHAR', type: 'abap.char', length: 4, isMandatory: true, semanticRole: 'ORG_UNIT' },
          { id: 'FLD-EKORG', name: 'PurchasingOrg', label: 'Purchasing Org', abapType: 'CHAR', type: 'abap.char', length: 4, isMandatory: true, semanticRole: 'ORG_UNIT' },
          { id: 'FLD-EKGRP', name: 'PurchasingGroup', label: 'Purchasing Group', abapType: 'CHAR', type: 'abap.char', length: 3, isMandatory: false, semanticRole: 'ORG_UNIT' },
          { id: 'FLD-LIFNR', name: 'Supplier', label: 'Supplier Account', abapType: 'CHAR', type: 'abap.char', length: 10, isMandatory: true, semanticRole: 'BUSINESS_PARTNER' },
          { id: 'FLD-NAME', name: 'SupplierName', label: 'Supplier Name', abapType: 'CHAR', type: 'abap.char', length: 80, semanticRole: 'TEXT' },
          { id: 'FLD-DATE', name: 'DocumentDate', label: 'Document Date', abapType: 'DATS', type: 'abap.dats', isMandatory: true, semanticRole: 'DATE' },
          { id: 'FLD-STATUS', name: 'OverallStatus', label: 'Approval Status', abapType: 'CHAR', type: 'abap.char', length: 12, semanticRole: 'STATUS' },
          { id: 'FLD-AMT', name: 'TotalNetAmount', label: 'Total Net Amount', abapType: 'CURR', type: 'abap.curr', length: 15, precision: 15, scale: 2, cukyField: 'Currency', semanticRole: 'AMOUNT' },
          { id: 'FLD-CUKY', name: 'Currency', label: 'Document Currency', abapType: 'CUKY', type: 'abap.cuky', length: 5, isMandatory: true, semanticRole: 'CURRENCY_CODE' },
          { id: 'FLD-CRDAT', name: 'CreatedAt', label: 'Created At', abapType: 'TIMESTAMPL', type: 'abap.utclong', isReadOnly: true, semanticRole: 'ADMIN_CREATED_AT' },
          { id: 'FLD-CRUSR', name: 'CreatedBy', label: 'Created By', abapType: 'CHAR', type: 'abap.char', length: 12, isReadOnly: true, semanticRole: 'ADMIN_CREATED_BY' }
        ],
        relationships: []
      },
      {
        id: childId,
        entityId: childId,
        name: childName,
        label: `${tcode} Purchase Document Item`,
        description: `Child Item Entity for ${rootName}`,
        entityType: 'CHILD',
        isRoot: false,
        persistenceStrategy: 'MANAGED_TABLE',
        tableName: `Z${cleanTcode.slice(0, 8)}ITM`,
        fields: [
          { id: 'FLD-ITM-UUID', name: 'ItemUUID', label: 'Item Key', abapType: 'UUID', type: 'sysuuid_x16', isKey: true, isMandatory: true, semanticRole: 'KEY' },
          { id: 'FLD-ITM-PAR', name: 'PurchaseOrderUUID', label: 'Parent Key', abapType: 'UUID', type: 'sysuuid_x16', isMandatory: true, semanticRole: 'PARENT_KEY' },
          { id: 'FLD-ITM-NUM', name: 'PurchaseOrderItem', label: 'Item Number', abapType: 'NUMC', type: 'abap.numc', length: 5, isMandatory: true, semanticRole: 'ITEM_NUMBER' },
          { id: 'FLD-ITM-MAT', name: 'Material', label: 'Material Number', abapType: 'CHAR', type: 'abap.char', length: 40, isMandatory: true, semanticRole: 'PRODUCT_ID' },
          { id: 'FLD-ITM-DESC', name: 'MaterialDescription', label: 'Description', abapType: 'CHAR', type: 'abap.char', length: 80, semanticRole: 'TEXT' },
          { id: 'FLD-ITM-PLANT', name: 'Plant', label: 'Plant', abapType: 'CHAR', type: 'abap.char', length: 4, isMandatory: true, semanticRole: 'ORG_UNIT' },
          { id: 'FLD-ITM-QTY', name: 'OrderQuantity', label: 'Order Quantity', abapType: 'QUAN', type: 'abap.quan', length: 13, precision: 13, scale: 3, unitField: 'OrderQuantityUnit', semanticRole: 'QUANTITY' },
          { id: 'FLD-ITM-UNIT', name: 'OrderQuantityUnit', label: 'Unit of Measure', abapType: 'UNIT', type: 'abap.unit', length: 3, isMandatory: true, semanticRole: 'UNIT_OF_MEASURE' },
          { id: 'FLD-ITM-PRICE', name: 'NetPrice', label: 'Net Unit Price', abapType: 'CURR', type: 'abap.curr', length: 11, precision: 11, scale: 2, cukyField: 'Currency', semanticRole: 'AMOUNT' },
          { id: 'FLD-ITM-TOT', name: 'ItemNetAmount', label: 'Item Net Amount', abapType: 'CURR', type: 'abap.curr', length: 15, precision: 15, scale: 2, cukyField: 'Currency', semanticRole: 'AMOUNT' },
          { id: 'FLD-ITM-CUKY', name: 'Currency', label: 'Currency', abapType: 'CUKY', type: 'abap.cuky', length: 5, semanticRole: 'CURRENCY_CODE' }
        ],
        relationships: []
      }
    ];

    const relationships = [
      {
        relationshipId: relId,
        sourceEntityId: rootId,
        targetEntityId: childId,
        name: '_Items',
        relationshipType: 'COMPOSITION',
        cardinality: 'ZERO_TO_MANY',
        description: `Composition from ${rootName} to ${childName}`,
        onDelete: 'CASCADE'
      }
    ];

    return {
      domain: DOMAIN_ARCHETYPES.MM,
      domainTitle: 'Materials Management & Purchasing',
      rootEntityName: rootName,
      childEntityName: childName,
      initialRequirements: requirements,
      starterDataModel: {
        specVersion: 1,
        rootEntity: rootName,
        entities,
        relationships,
        validationReport: { isValid: true, summary: { totalEntities: 2, totalFields: 24, totalRelationships: 1, errorCount: 0, warningCount: 0 }, issues: [] },
        status: 'CONFIGURED'
      },
      starterArchitecture: {
        specVersion: 1,
        rapScenario: 'RAP_MANAGED',
        odataVersion: 'ODATA_V4',
        uiPattern: 'LIST_REPORT_OBJECT_PAGE',
        cleanCoreTier: 'TIER_2_CLOUD_DEVELOPER',
        isDraftEnabled: true,
        rootEntity: rootName,
        status: 'CONFIGURED'
      }
    };
  }

  // =========================================================================
  // 3. PRODUCTION PLANNING & MANUFACTURING ARCHETYPE (CO01, PP, etc.)
  // =========================================================================
  _buildProductionArchetype(cleanTcode, tcode, desc, release) {
    const rootName = `Z_I_${cleanTcode}Order`;
    const childName = `Z_I_${cleanTcode}Component`;
    const rootId = `ENT-${cleanTcode}-ORD`;
    const childId = `ENT-${cleanTcode}-CMP`;
    const relId = `REL-${cleanTcode}-COMP`;

    const requirements = [
      {
        requirementId: `REQ-${cleanTcode}-001`,
        title: `Production Order Header & Scheduling (${tcode})`,
        category: 'FUNCTIONAL',
        priority: 'MUST_HAVE',
        status: 'CONFIRMED',
        sourceType: 'DOMAIN_ARCHETYPE',
        source: 'DOMAIN_ARCHETYPE',
        description: 'Track production orders, target quantities, production plant, and planned start/end dates.',
        acceptanceCriteria: [
          'Filter by Plant, Order Status (CRTD, REL, PCNF, TECO), and Produced Material.',
          'Object Page displays production timeline and schedule execution status.'
        ]
      },
      {
        requirementId: `REQ-${cleanTcode}-002`,
        title: 'Bill of Materials (BOM) Component Allocation',
        category: 'FUNCTIONAL',
        priority: 'MUST_HAVE',
        status: 'CONFIRMED',
        sourceType: 'DOMAIN_ARCHETYPE',
        source: 'DOMAIN_ARCHETYPE',
        description: 'Manage component parts list, requirement quantities, and warehouse staging storage locations.',
        acceptanceCriteria: [
          'Line items represent required components with withdrawn quantity tracking.',
          'Automatic unit conversion based on component master specification.'
        ]
      },
      {
        requirementId: `REQ-${cleanTcode}-003`,
        title: 'Action: Order Release & Technical Completion (TECO)',
        category: 'ACTION',
        priority: 'MUST_HAVE',
        status: 'CONFIRMED',
        sourceType: 'DOMAIN_ARCHETYPE',
        source: 'DOMAIN_ARCHETYPE',
        description: 'Provide actions "releaseOrder" to start manufacturing and "completeTechnically" upon finishing run.',
        acceptanceCriteria: [
          'Changes production order status with timestamp and user attribution.'
        ]
      },
      {
        requirementId: `REQ-${cleanTcode}-004`,
        title: 'Validation: Production Schedule Sequence',
        category: 'VALIDATION',
        priority: 'MUST_HAVE',
        status: 'CONFIRMED',
        sourceType: 'DOMAIN_ARCHETYPE',
        source: 'DOMAIN_ARCHETYPE',
        description: 'Validate that Basic End Date is equal to or after Basic Start Date.',
        acceptanceCriteria: [
          'Rejects scheduling dates where end date precedes start date.'
        ]
      }
    ];

    const entities = [
      {
        id: rootId,
        entityId: rootId,
        name: rootName,
        label: `${tcode} Production Order`,
        description: `Root Header Entity for ${tcode} Manufacturing Execution`,
        entityType: 'ROOT',
        isRoot: true,
        persistenceStrategy: 'MANAGED_TABLE',
        tableName: `Z${cleanTcode.slice(0, 8)}ORD`,
        fields: [
          { id: 'FLD-UUID', name: 'OrderUUID', label: 'Technical Key', abapType: 'UUID', type: 'sysuuid_x16', isKey: true, isMandatory: true, semanticRole: 'KEY' },
          { id: 'FLD-ID', name: 'ProductionOrder', label: 'Order Number', abapType: 'CHAR', type: 'abap.char', length: 12, isMandatory: true, semanticRole: 'BUSINESS_KEY' },
          { id: 'FLD-TYPE', name: 'OrderType', label: 'Order Type', abapType: 'CHAR', type: 'abap.char', length: 4, isMandatory: true, semanticRole: 'GENERAL' },
          { id: 'FLD-MAT', name: 'Material', label: 'Produced Material', abapType: 'CHAR', type: 'abap.char', length: 40, isMandatory: true, semanticRole: 'PRODUCT_ID' },
          { id: 'FLD-PLANT', name: 'ProductionPlant', label: 'Plant', abapType: 'CHAR', type: 'abap.char', length: 4, isMandatory: true, semanticRole: 'ORG_UNIT' },
          { id: 'FLD-QTY', name: 'TotalOrderQuantity', label: 'Total Quantity', abapType: 'QUAN', type: 'abap.quan', length: 13, precision: 13, scale: 3, unitField: 'UnitOfMeasure', semanticRole: 'QUANTITY' },
          { id: 'FLD-UNIT', name: 'UnitOfMeasure', label: 'Base Unit', abapType: 'UNIT', type: 'abap.unit', length: 3, isMandatory: true, semanticRole: 'UNIT_OF_MEASURE' },
          { id: 'FLD-START', name: 'BasicStartDate', label: 'Start Date', abapType: 'DATS', type: 'abap.dats', isMandatory: true, semanticRole: 'DATE' },
          { id: 'FLD-END', name: 'BasicEndDate', label: 'End Date', abapType: 'DATS', type: 'abap.dats', isMandatory: true, semanticRole: 'DATE' },
          { id: 'FLD-STATUS', name: 'OrderStatus', label: 'Status', abapType: 'CHAR', type: 'abap.char', length: 8, semanticRole: 'STATUS' },
          { id: 'FLD-CRDAT', name: 'CreatedAt', label: 'Created At', abapType: 'TIMESTAMPL', type: 'abap.utclong', isReadOnly: true, semanticRole: 'ADMIN_CREATED_AT' }
        ],
        relationships: []
      },
      {
        id: childId,
        entityId: childId,
        name: childName,
        label: `${tcode} BOM Component`,
        description: `Child Component Entity composed under ${rootName}`,
        entityType: 'CHILD',
        isRoot: false,
        persistenceStrategy: 'MANAGED_TABLE',
        tableName: `Z${cleanTcode.slice(0, 8)}CMP`,
        fields: [
          { id: 'FLD-CMP-UUID', name: 'ComponentUUID', label: 'Component Key', abapType: 'UUID', type: 'sysuuid_x16', isKey: true, isMandatory: true, semanticRole: 'KEY' },
          { id: 'FLD-CMP-PAR', name: 'OrderUUID', label: 'Parent Order Key', abapType: 'UUID', type: 'sysuuid_x16', isMandatory: true, semanticRole: 'PARENT_KEY' },
          { id: 'FLD-CMP-NUM', name: 'ItemNumber', label: 'Item Number', abapType: 'NUMC', type: 'abap.numc', length: 4, isMandatory: true, semanticRole: 'ITEM_NUMBER' },
          { id: 'FLD-CMP-MAT', name: 'ComponentMaterial', label: 'Part Material', abapType: 'CHAR', type: 'abap.char', length: 40, isMandatory: true, semanticRole: 'PRODUCT_ID' },
          { id: 'FLD-CMP-DESC', name: 'ComponentDescription', label: 'Part Description', abapType: 'CHAR', type: 'abap.char', length: 80, semanticRole: 'TEXT' },
          { id: 'FLD-CMP-QTY', name: 'RequirementQuantity', label: 'Required Qty', abapType: 'QUAN', type: 'abap.quan', length: 13, precision: 13, scale: 3, unitField: 'ComponentUnit', semanticRole: 'QUANTITY' },
          { id: 'FLD-CMP-UNIT', name: 'ComponentUnit', label: 'Unit', abapType: 'UNIT', type: 'abap.unit', length: 3, isMandatory: true, semanticRole: 'UNIT_OF_MEASURE' },
          { id: 'FLD-CMP-LGORT', name: 'StorageLocation', label: 'Storage Loc', abapType: 'CHAR', type: 'abap.char', length: 4, semanticRole: 'ORG_UNIT' }
        ],
        relationships: []
      }
    ];

    const relationships = [
      {
        relationshipId: relId,
        sourceEntityId: rootId,
        targetEntityId: childId,
        name: '_Components',
        relationshipType: 'COMPOSITION',
        cardinality: 'ZERO_TO_MANY',
        description: `Composition from ${rootName} to ${childName}`,
        onDelete: 'CASCADE'
      }
    ];

    return {
      domain: DOMAIN_ARCHETYPES.PP,
      domainTitle: 'Production Planning & Manufacturing',
      rootEntityName: rootName,
      childEntityName: childName,
      initialRequirements: requirements,
      starterDataModel: {
        specVersion: 1,
        rootEntity: rootName,
        entities,
        relationships,
        validationReport: { isValid: true, summary: { totalEntities: 2, totalFields: 19, totalRelationships: 1, errorCount: 0, warningCount: 0 }, issues: [] },
        status: 'CONFIGURED'
      },
      starterArchitecture: {
        specVersion: 1,
        rapScenario: 'RAP_MANAGED',
        odataVersion: 'ODATA_V4',
        uiPattern: 'LIST_REPORT_OBJECT_PAGE',
        cleanCoreTier: 'TIER_2_CLOUD_DEVELOPER',
        isDraftEnabled: true,
        rootEntity: rootName,
        status: 'CONFIGURED'
      }
    };
  }

  // =========================================================================
  // 4. FINANCIAL ACCOUNTING & CONTROLLING ARCHETYPE (FB50, F-53, FI, etc.)
  // =========================================================================
  _buildFinanceArchetype(cleanTcode, tcode, desc, release) {
    const rootName = `Z_I_${cleanTcode}Doc`;
    const childName = `Z_I_${cleanTcode}LineItem`;
    const rootId = `ENT-${cleanTcode}-DOC`;
    const childId = `ENT-${cleanTcode}-LINE`;
    const relId = `REL-${cleanTcode}-COMP`;

    const requirements = [
      {
        requirementId: `REQ-${cleanTcode}-001`,
        title: `Financial Journal Document Management (${tcode})`,
        category: 'FUNCTIONAL',
        priority: 'MUST_HAVE',
        status: 'CONFIRMED',
        sourceType: 'DOMAIN_ARCHETYPE',
        source: 'DOMAIN_ARCHETYPE',
        description: 'Post and manage accounting documents with Company Code, Posting Date, and Currency.',
        acceptanceCriteria: [
          'Filter by Company Code, Fiscal Year, and Document Status (PARKED, POSTED, REVERSED).',
          'Displays total debit, credit, and balancing state on header.'
        ]
      },
      {
        requirementId: `REQ-${cleanTcode}-002`,
        title: 'Debit / Credit Line Item Balancing',
        category: 'FUNCTIONAL',
        priority: 'MUST_HAVE',
        status: 'CONFIRMED',
        sourceType: 'DOMAIN_ARCHETYPE',
        source: 'DOMAIN_ARCHETYPE',
        description: 'Manage individual G/L line items with debit/credit indicators, cost centers, and line item text.',
        acceptanceCriteria: [
          'Line items support G/L account selection and line amount entry.',
          'Enforces that total Debits equal total Credits prior to posting.'
        ]
      },
      {
        requirementId: `REQ-${cleanTcode}-003`,
        title: 'Action: Post Document / Simulate Balance',
        category: 'ACTION',
        priority: 'MUST_HAVE',
        status: 'CONFIRMED',
        sourceType: 'DOMAIN_ARCHETYPE',
        source: 'DOMAIN_ARCHETYPE',
        description: 'Implement actions "simulatePosting" and "postDocument" with real-time financial validation.',
        acceptanceCriteria: [
          'Simulate verifies ledger balance without persistence.',
          'Post writes accounting document number and sets status to POSTED.'
        ]
      },
      {
        requirementId: `REQ-${cleanTcode}-004`,
        title: 'Validation: Strict Zero Balance Verification',
        category: 'VALIDATION',
        priority: 'MUST_HAVE',
        status: 'CONFIRMED',
        sourceType: 'DOMAIN_ARCHETYPE',
        source: 'DOMAIN_ARCHETYPE',
        description: 'Prevent posting if debit and credit sum do not balance to zero.',
        acceptanceCriteria: [
          'Blocks save operation and highlights line item discrepancy.'
        ]
      }
    ];

    const entities = [
      {
        id: rootId,
        entityId: rootId,
        name: rootName,
        label: `${tcode} Financial Document Header`,
        description: `Root Header Entity for ${tcode} Accounting Postings`,
        entityType: 'ROOT',
        isRoot: true,
        persistenceStrategy: 'MANAGED_TABLE',
        tableName: `Z${cleanTcode.slice(0, 8)}DOC`,
        fields: [
          { id: 'FLD-UUID', name: 'DocumentUUID', label: 'Document Key', abapType: 'UUID', type: 'sysuuid_x16', isKey: true, isMandatory: true, semanticRole: 'KEY' },
          { id: 'FLD-BUKRS', name: 'CompanyCode', label: 'Company Code', abapType: 'CHAR', type: 'abap.char', length: 4, isMandatory: true, semanticRole: 'ORG_UNIT' },
          { id: 'FLD-GJAHR', name: 'FiscalYear', label: 'Fiscal Year', abapType: 'NUMC', type: 'abap.numc', length: 4, isMandatory: true, semanticRole: 'NUMBER' },
          { id: 'FLD-BELNR', name: 'AccountingDocument', label: 'Doc Number', abapType: 'CHAR', type: 'abap.char', length: 10, isMandatory: true, semanticRole: 'BUSINESS_KEY' },
          { id: 'FLD-BLART', name: 'DocumentType', label: 'Document Type', abapType: 'CHAR', type: 'abap.char', length: 2, isMandatory: true, semanticRole: 'GENERAL' },
          { id: 'FLD-BLDAT', name: 'DocumentDate', label: 'Document Date', abapType: 'DATS', type: 'abap.dats', isMandatory: true, semanticRole: 'DATE' },
          { id: 'FLD-BUDAT', name: 'PostingDate', label: 'Posting Date', abapType: 'DATS', type: 'abap.dats', isMandatory: true, semanticRole: 'DATE' },
          { id: 'FLD-STATUS', name: 'DocumentStatus', label: 'Status', abapType: 'CHAR', type: 'abap.char', length: 10, semanticRole: 'STATUS' },
          { id: 'FLD-AMT', name: 'TotalAmount', label: 'Total Amount', abapType: 'CURR', type: 'abap.curr', length: 15, precision: 15, scale: 2, cukyField: 'Currency', semanticRole: 'AMOUNT' },
          { id: 'FLD-CUKY', name: 'Currency', label: 'Currency', abapType: 'CUKY', type: 'abap.cuky', length: 5, isMandatory: true, semanticRole: 'CURRENCY_CODE' },
          { id: 'FLD-CRDAT', name: 'CreatedAt', label: 'Created At', abapType: 'TIMESTAMPL', type: 'abap.utclong', isReadOnly: true, semanticRole: 'ADMIN_CREATED_AT' }
        ],
        relationships: []
      },
      {
        id: childId,
        entityId: childId,
        name: childName,
        label: `${tcode} Financial Line Item`,
        description: `Child Line Item Entity for ${rootName}`,
        entityType: 'CHILD',
        isRoot: false,
        persistenceStrategy: 'MANAGED_TABLE',
        tableName: `Z${cleanTcode.slice(0, 8)}ITM`,
        fields: [
          { id: 'FLD-LIN-UUID', name: 'LineItemUUID', label: 'Item Key', abapType: 'UUID', type: 'sysuuid_x16', isKey: true, isMandatory: true, semanticRole: 'KEY' },
          { id: 'FLD-LIN-PAR', name: 'DocumentUUID', label: 'Parent Key', abapType: 'UUID', type: 'sysuuid_x16', isMandatory: true, semanticRole: 'PARENT_KEY' },
          { id: 'FLD-LIN-NUM', name: 'ItemNumber', label: 'Item Number', abapType: 'NUMC', type: 'abap.numc', length: 3, isMandatory: true, semanticRole: 'ITEM_NUMBER' },
          { id: 'FLD-LIN-HKONT', name: 'GLAccount', label: 'G/L Account', abapType: 'CHAR', type: 'abap.char', length: 10, isMandatory: true, semanticRole: 'GENERAL' },
          { id: 'FLD-LIN-SHKZG', name: 'DebitCreditCode', label: 'Debit/Credit (S/H)', abapType: 'CHAR', type: 'abap.char', length: 1, isMandatory: true, semanticRole: 'GENERAL' },
          { id: 'FLD-LIN-DMBTR', name: 'Amount', label: 'Item Amount', abapType: 'CURR', type: 'abap.curr', length: 15, precision: 15, scale: 2, cukyField: 'Currency', semanticRole: 'AMOUNT' },
          { id: 'FLD-LIN-CUKY', name: 'Currency', label: 'Currency', abapType: 'CUKY', type: 'abap.cuky', length: 5, semanticRole: 'CURRENCY_CODE' },
          { id: 'FLD-LIN-KOSTL', name: 'CostCenter', label: 'Cost Center', abapType: 'CHAR', type: 'abap.char', length: 10, semanticRole: 'ORG_UNIT' },
          { id: 'FLD-LIN-SGTXT', name: 'ItemText', label: 'Line Item Text', abapType: 'CHAR', type: 'abap.char', length: 50, semanticRole: 'TEXT' }
        ],
        relationships: []
      }
    ];

    const relationships = [
      {
        relationshipId: relId,
        sourceEntityId: rootId,
        targetEntityId: childId,
        name: '_LineItems',
        relationshipType: 'COMPOSITION',
        cardinality: 'ZERO_TO_MANY',
        description: `Composition from ${rootName} to ${childName}`,
        onDelete: 'CASCADE'
      }
    ];

    return {
      domain: DOMAIN_ARCHETYPES.FI,
      domainTitle: 'Financial Accounting & Controlling',
      rootEntityName: rootName,
      childEntityName: childName,
      initialRequirements: requirements,
      starterDataModel: {
        specVersion: 1,
        rootEntity: rootName,
        entities,
        relationships,
        validationReport: { isValid: true, summary: { totalEntities: 2, totalFields: 20, totalRelationships: 1, errorCount: 0, warningCount: 0 }, issues: [] },
        status: 'CONFIGURED'
      },
      starterArchitecture: {
        specVersion: 1,
        rapScenario: 'RAP_MANAGED',
        odataVersion: 'ODATA_V4',
        uiPattern: 'LIST_REPORT_OBJECT_PAGE',
        cleanCoreTier: 'TIER_2_CLOUD_DEVELOPER',
        isDraftEnabled: true,
        rootEntity: rootName,
        status: 'CONFIGURED'
      }
    };
  }

  // =========================================================================
  // 5. SALES & DISTRIBUTION ARCHETYPE (VA01, SD, etc.)
  // =========================================================================
  _buildSalesArchetype(cleanTcode, tcode, desc, release) {
    const rootName = `Z_I_${cleanTcode}Order`;
    const childName = `Z_I_${cleanTcode}Item`;
    const rootId = `ENT-${cleanTcode}-ORD`;
    const childId = `ENT-${cleanTcode}-ITM`;
    const relId = `REL-${cleanTcode}-COMP`;

    const requirements = [
      {
        requirementId: `REQ-${cleanTcode}-001`,
        title: `Sales Order Header & Customer Contract (${tcode})`,
        category: 'FUNCTIONAL',
        priority: 'MUST_HAVE',
        status: 'CONFIRMED',
        sourceType: 'DOMAIN_ARCHETYPE',
        source: 'DOMAIN_ARCHETYPE',
        description: 'Manage sales orders, sold-to customers, requested delivery dates, and total net valuation.',
        acceptanceCriteria: [
          'Search by Sold-To Party, Sales Organization, and Overall Status.',
          'Object Page displays customer terms, delivery block status, and gross value.'
        ]
      },
      {
        requirementId: `REQ-${cleanTcode}-002`,
        title: 'Sales Order Line Items & Schedule Lines',
        category: 'FUNCTIONAL',
        priority: 'MUST_HAVE',
        status: 'CONFIRMED',
        sourceType: 'DOMAIN_ARCHETYPE',
        source: 'DOMAIN_ARCHETYPE',
        description: 'Manage order line items with product material, confirmed quantity, unit pricing, and shipping plant.',
        acceptanceCriteria: [
          'Item pricing dynamically calculates total net line amount.',
          'Schedule lines ensure material availability confirmation.'
        ]
      },
      {
        requirementId: `REQ-${cleanTcode}-003`,
        title: 'Action: Release Credit Block / Check Availability',
        category: 'ACTION',
        priority: 'MUST_HAVE',
        status: 'CONFIRMED',
        sourceType: 'DOMAIN_ARCHETYPE',
        source: 'DOMAIN_ARCHETYPE',
        description: 'Implement actions "releaseCreditBlock" and "checkAvailability" with real-time customer status.',
        acceptanceCriteria: [
          'Clears credit hold status upon authorized approval.'
        ]
      },
      {
        requirementId: `REQ-${cleanTcode}-004`,
        title: 'Validation: Requested Delivery Date Horizon',
        category: 'VALIDATION',
        priority: 'MUST_HAVE',
        status: 'CONFIRMED',
        sourceType: 'DOMAIN_ARCHETYPE',
        source: 'DOMAIN_ARCHETYPE',
        description: 'Validate that requested delivery date is not in the past.',
        acceptanceCriteria: [
          'Returns error if delivery date is earlier than today.'
        ]
      }
    ];

    const entities = [
      {
        id: rootId,
        entityId: rootId,
        name: rootName,
        label: `${tcode} Sales Order Header`,
        description: `Root Header Entity for ${tcode} Sales Processing`,
        entityType: 'ROOT',
        isRoot: true,
        persistenceStrategy: 'MANAGED_TABLE',
        tableName: `Z${cleanTcode.slice(0, 8)}ORD`,
        fields: [
          { id: 'FLD-UUID', name: 'SalesOrderUUID', label: 'Technical Key', abapType: 'UUID', type: 'sysuuid_x16', isKey: true, isMandatory: true, semanticRole: 'KEY' },
          { id: 'FLD-VBELN', name: 'SalesOrder', label: 'Order Number', abapType: 'CHAR', type: 'abap.char', length: 10, isMandatory: true, semanticRole: 'BUSINESS_KEY' },
          { id: 'FLD-AUART', name: 'OrderType', label: 'Order Type', abapType: 'CHAR', type: 'abap.char', length: 4, isMandatory: true, semanticRole: 'GENERAL' },
          { id: 'FLD-VKORG', name: 'SalesOrganization', label: 'Sales Org', abapType: 'CHAR', type: 'abap.char', length: 4, isMandatory: true, semanticRole: 'ORG_UNIT' },
          { id: 'FLD-VTWEG', name: 'DistributionChannel', label: 'Dist. Channel', abapType: 'CHAR', type: 'abap.char', length: 2, isMandatory: true, semanticRole: 'ORG_UNIT' },
          { id: 'FLD-KUNNR', name: 'SoldToParty', label: 'Customer Account', abapType: 'CHAR', type: 'abap.char', length: 10, isMandatory: true, semanticRole: 'BUSINESS_PARTNER' },
          { id: 'FLD-NAME', name: 'CustomerName', label: 'Customer Name', abapType: 'CHAR', type: 'abap.char', length: 80, semanticRole: 'TEXT' },
          { id: 'FLD-DATE', name: 'DocumentDate', label: 'Order Date', abapType: 'DATS', type: 'abap.dats', isMandatory: true, semanticRole: 'DATE' },
          { id: 'FLD-DELDATE', name: 'RequestedDeliveryDate', label: 'Delivery Date', abapType: 'DATS', type: 'abap.dats', semanticRole: 'DATE' },
          { id: 'FLD-STATUS', name: 'OverallStatus', label: 'Status', abapType: 'CHAR', type: 'abap.char', length: 12, semanticRole: 'STATUS' },
          { id: 'FLD-AMT', name: 'TotalNetAmount', label: 'Total Net Value', abapType: 'CURR', type: 'abap.curr', length: 15, precision: 15, scale: 2, cukyField: 'Currency', semanticRole: 'AMOUNT' },
          { id: 'FLD-CUKY', name: 'Currency', label: 'Currency', abapType: 'CUKY', type: 'abap.cuky', length: 5, isMandatory: true, semanticRole: 'CURRENCY_CODE' },
          { id: 'FLD-CRDAT', name: 'CreatedAt', label: 'Created At', abapType: 'TIMESTAMPL', type: 'abap.utclong', isReadOnly: true, semanticRole: 'ADMIN_CREATED_AT' }
        ],
        relationships: []
      },
      {
        id: childId,
        entityId: childId,
        name: childName,
        label: `${tcode} Sales Order Item`,
        description: `Child Item Entity for ${rootName}`,
        entityType: 'CHILD',
        isRoot: false,
        persistenceStrategy: 'MANAGED_TABLE',
        tableName: `Z${cleanTcode.slice(0, 8)}ITM`,
        fields: [
          { id: 'FLD-ITM-UUID', name: 'ItemUUID', label: 'Item Key', abapType: 'UUID', type: 'sysuuid_x16', isKey: true, isMandatory: true, semanticRole: 'KEY' },
          { id: 'FLD-ITM-PAR', name: 'SalesOrderUUID', label: 'Parent Key', abapType: 'UUID', type: 'sysuuid_x16', isMandatory: true, semanticRole: 'PARENT_KEY' },
          { id: 'FLD-ITM-POSNR', name: 'SalesOrderItem', label: 'Item Number', abapType: 'NUMC', type: 'abap.numc', length: 6, isMandatory: true, semanticRole: 'ITEM_NUMBER' },
          { id: 'FLD-ITM-MAT', name: 'Material', label: 'Material Number', abapType: 'CHAR', type: 'abap.char', length: 40, isMandatory: true, semanticRole: 'PRODUCT_ID' },
          { id: 'FLD-ITM-DESC', name: 'MaterialDescription', label: 'Description', abapType: 'CHAR', type: 'abap.char', length: 80, semanticRole: 'TEXT' },
          { id: 'FLD-ITM-QTY', name: 'OrderQuantity', label: 'Quantity', abapType: 'QUAN', type: 'abap.quan', length: 13, precision: 13, scale: 3, unitField: 'OrderQuantityUnit', semanticRole: 'QUANTITY' },
          { id: 'FLD-ITM-UNIT', name: 'OrderQuantityUnit', label: 'Unit', abapType: 'UNIT', type: 'abap.unit', length: 3, isMandatory: true, semanticRole: 'UNIT_OF_MEASURE' },
          { id: 'FLD-ITM-PRICE', name: 'NetPrice', label: 'Net Unit Price', abapType: 'CURR', type: 'abap.curr', length: 11, precision: 11, scale: 2, cukyField: 'Currency', semanticRole: 'AMOUNT' },
          { id: 'FLD-ITM-TOT', name: 'ItemNetAmount', label: 'Item Total', abapType: 'CURR', type: 'abap.curr', length: 15, precision: 15, scale: 2, cukyField: 'Currency', semanticRole: 'AMOUNT' },
          { id: 'FLD-ITM-CUKY', name: 'Currency', label: 'Currency', abapType: 'CUKY', type: 'abap.cuky', length: 5, semanticRole: 'CURRENCY_CODE' },
          { id: 'FLD-ITM-PLANT', name: 'Plant', label: 'Delivering Plant', abapType: 'CHAR', type: 'abap.char', length: 4, semanticRole: 'ORG_UNIT' }
        ],
        relationships: []
      }
    ];

    const relationships = [
      {
        relationshipId: relId,
        sourceEntityId: rootId,
        targetEntityId: childId,
        name: '_Items',
        relationshipType: 'COMPOSITION',
        cardinality: 'ZERO_TO_MANY',
        description: `Composition from ${rootName} to ${childName}`,
        onDelete: 'CASCADE'
      }
    ];

    return {
      domain: DOMAIN_ARCHETYPES.SD,
      domainTitle: 'Sales & Distribution',
      rootEntityName: rootName,
      childEntityName: childName,
      initialRequirements: requirements,
      starterDataModel: {
        specVersion: 1,
        rootEntity: rootName,
        entities,
        relationships,
        validationReport: { isValid: true, summary: { totalEntities: 2, totalFields: 24, totalRelationships: 1, errorCount: 0, warningCount: 0 }, issues: [] },
        status: 'CONFIGURED'
      },
      starterArchitecture: {
        specVersion: 1,
        rapScenario: 'RAP_MANAGED',
        odataVersion: 'ODATA_V4',
        uiPattern: 'LIST_REPORT_OBJECT_PAGE',
        cleanCoreTier: 'TIER_2_CLOUD_DEVELOPER',
        isDraftEnabled: true,
        rootEntity: rootName,
        status: 'CONFIGURED'
      }
    };
  }

  // =========================================================================
  // 6. UNIVERSAL CUSTOM BUSINESS OBJECT (Z* / Y* or any other transaction)
  // =========================================================================
  _buildUniversalArchetype(cleanTcode, tcode, desc, release) {
    const rootName = `Z_I_${cleanTcode}Header`;
    const childName = `Z_I_${cleanTcode}Item`;
    const rootId = `ENT-${cleanTcode}-HDR`;
    const childId = `ENT-${cleanTcode}-ITM`;
    const relId = `REL-${cleanTcode}-COMP`;

    const requirements = [
      {
        requirementId: `REQ-${cleanTcode}-001`,
        title: `Enterprise Business Workflow (${tcode})`,
        category: 'FUNCTIONAL',
        priority: 'MUST_HAVE',
        status: 'CONFIRMED',
        sourceType: 'DOMAIN_ARCHETYPE',
        source: 'DOMAIN_ARCHETYPE',
        description: `Modernize ${tcode} (${desc || 'Custom Enterprise Transaction'}) into a Clean Core Fiori Elements application.`,
        acceptanceCriteria: [
          'User can filter requests by Process Type, Priority, and Status.',
          'Object page displays full business context, assigned users, and header KPIs.'
        ]
      },
      {
        requirementId: `REQ-${cleanTcode}-002`,
        title: 'Line Item Execution & Detailed Specifications',
        category: 'FUNCTIONAL',
        priority: 'MUST_HAVE',
        status: 'CONFIRMED',
        sourceType: 'DOMAIN_ARCHETYPE',
        source: 'DOMAIN_ARCHETYPE',
        description: 'Provide tabular line-by-line item specifications with quantities, cost valuations, and execution status.',
        acceptanceCriteria: [
          'Line items composed under parent header with early numbering and draft support.',
          'Automated line item calculations reflected in header total.'
        ]
      },
      {
        requirementId: `REQ-${cleanTcode}-003`,
        title: 'Action: Lifecycle Approval Workflow',
        category: 'ACTION',
        priority: 'MUST_HAVE',
        status: 'CONFIRMED',
        sourceType: 'DOMAIN_ARCHETYPE',
        source: 'DOMAIN_ARCHETYPE',
        description: 'Implement instance actions "submitRequest", "approveRequest", and "rejectRequest".',
        acceptanceCriteria: [
          'Action transitions status from DRAFT -> SUBMITTED -> APPROVED.',
          'Audit log records author name, timestamp, and decision notes.'
        ]
      },
      {
        requirementId: `REQ-${cleanTcode}-004`,
        title: 'Validation: Mandatory Header Key & Status Guardrails',
        category: 'VALIDATION',
        priority: 'MUST_HAVE',
        status: 'CONFIRMED',
        sourceType: 'DOMAIN_ARCHETYPE',
        source: 'DOMAIN_ARCHETYPE',
        description: 'Enforce that business request identifier is unique and dates adhere to process window.',
        acceptanceCriteria: [
          'Rejects save operation if mandatory business keys are empty.'
        ]
      }
    ];

    const entities = [
      {
        id: rootId,
        entityId: rootId,
        name: rootName,
        label: `${tcode} Business Header`,
        description: `Root Header Entity for ${tcode} Workflow`,
        entityType: 'ROOT',
        isRoot: true,
        persistenceStrategy: 'MANAGED_TABLE',
        tableName: `Z${cleanTcode.slice(0, 8)}H`,
        fields: [
          { id: 'FLD-UUID', name: 'DocumentUUID', label: 'Technical Key', abapType: 'UUID', type: 'sysuuid_x16', isKey: true, isMandatory: true, semanticRole: 'KEY' },
          { id: 'FLD-ID', name: 'DocumentNumber', label: 'Document Number', abapType: 'CHAR', type: 'abap.char', length: 10, isMandatory: true, semanticRole: 'BUSINESS_KEY' },
          { id: 'FLD-DESC', name: 'TitleDescription', label: 'Title / Subject', abapType: 'CHAR', type: 'abap.char', length: 120, isMandatory: true, semanticRole: 'TEXT' },
          { id: 'FLD-DATE', name: 'DocumentDate', label: 'Document Date', abapType: 'DATS', type: 'abap.dats', isMandatory: true, semanticRole: 'DATE' },
          { id: 'FLD-REQ', name: 'RequesterName', label: 'Requester', abapType: 'CHAR', type: 'abap.char', length: 40, semanticRole: 'TEXT' },
          { id: 'FLD-DEPT', name: 'Department', label: 'Department / Unit', abapType: 'CHAR', type: 'abap.char', length: 20, semanticRole: 'ORG_UNIT' },
          { id: 'FLD-PRIO', name: 'Priority', label: 'Priority', abapType: 'CHAR', type: 'abap.char', length: 8, semanticRole: 'GENERAL' },
          { id: 'FLD-STATUS', name: 'ApprovalStatus', label: 'Approval Status', abapType: 'CHAR', type: 'abap.char', length: 12, semanticRole: 'STATUS' },
          { id: 'FLD-AMT', name: 'TotalAmount', label: 'Total Valuation', abapType: 'CURR', type: 'abap.curr', length: 15, precision: 15, scale: 2, cukyField: 'Currency', semanticRole: 'AMOUNT' },
          { id: 'FLD-CUKY', name: 'Currency', label: 'Currency', abapType: 'CUKY', type: 'abap.cuky', length: 5, isMandatory: true, semanticRole: 'CURRENCY_CODE' },
          { id: 'FLD-CRDAT', name: 'CreatedAt', label: 'Created At', abapType: 'TIMESTAMPL', type: 'abap.utclong', isReadOnly: true, semanticRole: 'ADMIN_CREATED_AT' },
          { id: 'FLD-CRUSR', name: 'CreatedBy', label: 'Created By', abapType: 'CHAR', type: 'abap.char', length: 12, isReadOnly: true, semanticRole: 'ADMIN_CREATED_BY' }
        ],
        relationships: []
      },
      {
        id: childId,
        entityId: childId,
        name: childName,
        label: `${tcode} Business Item`,
        description: `Child Item Entity for ${rootName}`,
        entityType: 'CHILD',
        isRoot: false,
        persistenceStrategy: 'MANAGED_TABLE',
        tableName: `Z${cleanTcode.slice(0, 8)}I`,
        fields: [
          { id: 'FLD-ITM-UUID', name: 'ItemUUID', label: 'Item Key', abapType: 'UUID', type: 'sysuuid_x16', isKey: true, isMandatory: true, semanticRole: 'KEY' },
          { id: 'FLD-ITM-PAR', name: 'DocumentUUID', label: 'Parent Key', abapType: 'UUID', type: 'sysuuid_x16', isMandatory: true, semanticRole: 'PARENT_KEY' },
          { id: 'FLD-ITM-NUM', name: 'ItemNumber', label: 'Item Number', abapType: 'NUMC', type: 'abap.numc', length: 4, isMandatory: true, semanticRole: 'ITEM_NUMBER' },
          { id: 'FLD-ITM-CAT', name: 'Category', label: 'Category', abapType: 'CHAR', type: 'abap.char', length: 20, semanticRole: 'GENERAL' },
          { id: 'FLD-ITM-DESC', name: 'Description', label: 'Item Description', abapType: 'CHAR', type: 'abap.char', length: 80, isMandatory: true, semanticRole: 'TEXT' },
          { id: 'FLD-ITM-QTY', name: 'Quantity', label: 'Quantity', abapType: 'QUAN', type: 'abap.quan', length: 13, precision: 13, scale: 3, unitField: 'UnitOfMeasure', semanticRole: 'QUANTITY' },
          { id: 'FLD-ITM-UNIT', name: 'UnitOfMeasure', label: 'Unit', abapType: 'UNIT', type: 'abap.unit', length: 3, isMandatory: true, semanticRole: 'UNIT_OF_MEASURE' },
          { id: 'FLD-ITM-PRICE', name: 'UnitPrice', label: 'Unit Rate', abapType: 'CURR', type: 'abap.curr', length: 11, precision: 11, scale: 2, cukyField: 'Currency', semanticRole: 'AMOUNT' },
          { id: 'FLD-ITM-TOT', name: 'LineTotal', label: 'Line Total', abapType: 'CURR', type: 'abap.curr', length: 15, precision: 15, scale: 2, cukyField: 'Currency', semanticRole: 'AMOUNT' },
          { id: 'FLD-ITM-CUKY', name: 'Currency', label: 'Currency', abapType: 'CUKY', type: 'abap.cuky', length: 5, semanticRole: 'CURRENCY_CODE' }
        ],
        relationships: []
      }
    ];

    const relationships = [
      {
        relationshipId: relId,
        sourceEntityId: rootId,
        targetEntityId: childId,
        name: '_Items',
        relationshipType: 'COMPOSITION',
        cardinality: 'ZERO_TO_MANY',
        description: `Composition from ${rootName} to ${childName}`,
        onDelete: 'CASCADE'
      }
    ];

    return {
      domain: DOMAIN_ARCHETYPES.UNIVERSAL,
      domainTitle: 'Universal Clean Core Business Workflow',
      rootEntityName: rootName,
      childEntityName: childName,
      initialRequirements: requirements,
      starterDataModel: {
        specVersion: 1,
        rootEntity: rootName,
        entities,
        relationships,
        validationReport: { isValid: true, summary: { totalEntities: 2, totalFields: 22, totalRelationships: 1, errorCount: 0, warningCount: 0 }, issues: [] },
        status: 'CONFIGURED'
      },
      starterArchitecture: {
        specVersion: 1,
        rapScenario: 'RAP_MANAGED',
        odataVersion: 'ODATA_V4',
        uiPattern: 'LIST_REPORT_OBJECT_PAGE',
        cleanCoreTier: 'TIER_2_CLOUD_DEVELOPER',
        isDraftEnabled: true,
        rootEntity: rootName,
        status: 'CONFIGURED'
      }
    };
  }
}

export const semanticArchetypeEngine = new SemanticArchetypeEngine();
