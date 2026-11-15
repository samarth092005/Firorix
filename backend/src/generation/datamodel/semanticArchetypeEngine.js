/**
 * Fiorify — Universal Semantic Domain Archetype Engine
 *
 * Intelligently classifies any SAP transaction code (Standard or Custom Z* / Y*)
 * across 10 core enterprise domains:
 * 1. MM (Materials Management & Purchasing: ME21N, MM01, MIGO, MIRO)
 * 2. FI (Financial Accounting & Controlling: FB50, F-53, FBL3N, FS00)
 * 3. SD (Sales & Distribution: VA01, VF01, VL01N)
 * 4. PP (Production Planning & Manufacturing: CO01, MD04, CS01)
 * 5. PM (Plant Maintenance & Asset Management: IW31, IW21, IE01)
 * 6. QM (Quality Management: QA01, QE51N, QA32)
 * 7. WM (Warehouse Management & Logistics: LT01, LS24, /SCWM/*)
 * 8. HCM (Human Capital & Time Recording: CAT2, PA30, PA20)
 * 9. BASIS (System Diagnostics & Administration: ST22, SM50, SM21, SLG1)
 * 10. UNIVERSAL (Universal Clean Core Business Workflow: Z* / Y* custom transactions)
 *
 * Synthesizes production-grade Clean Core Tier 2 RAP specifications:
 * - Multi-entity data models with Parent Header and Child Item composition
 * - Authentic SAP DDIC types, semantic roles, and UI lineItem/selection annotations
 * - Enterprise-grade business requirements (Validations, Determinations, Actions) with status 'CONFIRMED'
 * - C1-released value help metadata (I_CompanyCode, I_Currency, I_Supplier, etc.)
 */

export const DOMAIN_ARCHETYPES = Object.freeze({
  MM: 'MATERIALS_MANAGEMENT',
  PP: 'PRODUCTION_PLANNING',
  BASIS: 'SYSTEM_ADMIN_DIAGNOSTICS',
  FI: 'FINANCIAL_ACCOUNTING',
  SD: 'SALES_DISTRIBUTION',
  PM: 'PLANT_MAINTENANCE',
  QM: 'QUALITY_MANAGEMENT',
  WM: 'WAREHOUSE_MANAGEMENT',
  HCM: 'HUMAN_CAPITAL_MANAGEMENT',
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
    const combined = `${cleanDesc} ${cleanArea}`;

    // 1. ABAP / Basis / System Diagnostics
    if (
      /^(ST|SM|SLG|DB|AL|RZ|STAT|SU01|PFCG|SM12|SM21|SM50|SM66|ST03|ST04|ST05|ST12)/i.test(cleanT) ||
      /dump|runtime error|system log|diagnostic|lock entry|work process|job monitor|buffer|spool|abap basis/i.test(combined)
    ) {
      return DOMAIN_ARCHETYPES.BASIS;
    }

    // 2. PM - Plant Maintenance & Asset Operations
    if (
      /^(IW|IE|IL|IH|IP|IB|IA|IR)/i.test(cleanT) ||
      /maintenance order|plant maintenance|equipment master|functional location|maintenance notification|asset maintenance|preventive maintenance|work order/i.test(combined)
    ) {
      return DOMAIN_ARCHETYPES.PM;
    }

    // 3. QM - Quality Management
    if (
      /^(QA|QE|QN|QP|QS|QDB)/i.test(cleanT) ||
      /quality|inspection lot|quality notification|usage decision|inspection characteristic|sampling|defect/i.test(combined)
    ) {
      return DOMAIN_ARCHETYPES.QM;
    }

    // 4. WM / EWM - Warehouse Management & Logistics
    if (
      /^(LT|LS|LU|LB|LX|\/SCWM\/)/i.test(cleanT) ||
      /warehouse|transfer order|storage bin|storage type|goods movement|picking|putaway|warehouse task/i.test(combined)
    ) {
      return DOMAIN_ARCHETYPES.WM;
    }

    // 5. HCM - Human Capital Management & Time Recording
    if (
      /^(CAT|PA[0-9]|PB[0-9]|PT[0-9]|PU[0-9]|PPOME)/i.test(cleanT) ||
      /time sheet|timesheet|personnel|employee master|labor|payroll|attendance|cross-application time/i.test(combined)
    ) {
      return DOMAIN_ARCHETYPES.HCM;
    }

    // 6. MM - Materials Management & Purchasing
    if (
      /^(ME|MM|MIGO|MIRO|MB|MR|MN|EBAN|EKKO)/i.test(cleanT) ||
      /purchas|procure|material master|goods receipt|inventory|supplier invoice|requisition|sourcing/i.test(combined)
    ) {
      return DOMAIN_ARCHETYPES.MM;
    }

    // 7. PP - Production Planning & Manufacturing
    if (
      /^(CO0|CO1|CO2|MD0|MD1|CR0|CR1|CS0|CS1|PL0|C2)/i.test(cleanT) ||
      /production order|manufacturing|bill of material|bom|routing|work center|mrp|order confirmation/i.test(combined)
    ) {
      return DOMAIN_ARCHETYPES.PP;
    }

    // 8. FI - Financial Accounting & Controlling
    if (
      /^(FB|F-|FS|BK|BS|KO0|KS0|FBL|FK|FD)/i.test(cleanT) ||
      /financ|general ledger|gl account|journal entry|accounts payable|accounts receivable|payment|clearing|controlling|cost center|profit center/i.test(combined)
    ) {
      return DOMAIN_ARCHETYPES.FI;
    }

    // 9. SD - Sales & Distribution
    if (
      /^(VA|VF|VL|XD|VK|VD|VBAK|VBAP)/i.test(cleanT) ||
      /sales order|sales and distribution|billing|outbound delivery|shipping|customer quote|customer contract/i.test(combined)
    ) {
      return DOMAIN_ARCHETYPES.SD;
    }

    // 10. Universal Custom Business Object (Z* / Y* or general)
    return DOMAIN_ARCHETYPES.UNIVERSAL;
  }

  /**
   * Synthesizes full multi-entity data model, requirements, and architecture baseline.
   */
  synthesizeArchetype(context = {}) {
    const { tcode = 'ZCUSTOM', description = '', businessArea = '', targetRelease = 'SAP S/4HANA 2023 Private Edition' } = context;
    const cleanTcode = tcode.replace(/[^a-zA-Z0-9]/g, '').toUpperCase() || 'CUSTOM';
    const domain = this.classifyDomain(tcode, description, businessArea);

    switch (domain) {
      case DOMAIN_ARCHETYPES.BASIS:
        return this._buildBasisArchetype(cleanTcode, tcode, description, targetRelease);
      case DOMAIN_ARCHETYPES.PM:
        return this._buildPlantMaintenanceArchetype(cleanTcode, tcode, description, targetRelease);
      case DOMAIN_ARCHETYPES.QM:
        return this._buildQualityManagementArchetype(cleanTcode, tcode, description, targetRelease);
      case DOMAIN_ARCHETYPES.WM:
        return this._buildWarehouseManagementArchetype(cleanTcode, tcode, description, targetRelease);
      case DOMAIN_ARCHETYPES.HCM:
        return this._buildHCMArchetype(cleanTcode, tcode, description, targetRelease);
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
        sourceType: 'DISCOVERY_ASSESSMENT',
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
        sourceType: 'DISCOVERY_ASSESSMENT',
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
        sourceType: 'DISCOVERY_ASSESSMENT',
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
        sourceType: 'DISCOVERY_ASSESSMENT',
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
        sourceType: 'DISCOVERY_ASSESSMENT',
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
        cardinality: '[0..*]',
        mapping: [{ sourceField: 'DumpUUID', targetField: 'DumpUUID' }],
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
  // 2. PLANT MAINTENANCE & ASSET OPERATIONS ARCHETYPE (IW31, IW21, IE01, etc.)
  // =========================================================================
  _buildPlantMaintenanceArchetype(cleanTcode, tcode, desc, release) {
    const rootName = `Z_I_${cleanTcode}Order`;
    const childName = `Z_I_${cleanTcode}Operation`;
    const rootId = `ENT-${cleanTcode}-ORD`;
    const childId = `ENT-${cleanTcode}-OPR`;
    const relId = `REL-${cleanTcode}-COMP`;

    const requirements = [
      {
        requirementId: `REQ-${cleanTcode}-001`,
        title: `Plant Maintenance Order Lifecycle (${tcode})`,
        category: 'FUNCTIONAL',
        priority: 'MUST_HAVE',
        status: 'CONFIRMED',
        sourceType: 'DISCOVERY_ASSESSMENT',
        source: 'DOMAIN_ARCHETYPE',
        description: 'Manage maintenance work orders, equipment tracking, work centers, and execution priority.',
        acceptanceCriteria: [
          'Filter by Order Number, Maintenance Plant, Work Center, and Order Status.',
          'Object page displays technical asset structure (Equipment / Functional Location) and planned costs.'
        ]
      },
      {
        requirementId: `REQ-${cleanTcode}-002`,
        title: 'Maintenance Operation Scheduling & Work Allocation',
        category: 'FUNCTIONAL',
        priority: 'MUST_HAVE',
        status: 'CONFIRMED',
        sourceType: 'DISCOVERY_ASSESSMENT',
        source: 'DOMAIN_ARCHETYPE',
        description: 'Provide tabular management of work steps, required craft disciplines, planned hours, and control keys.',
        acceptanceCriteria: [
          'Operations composed under parent maintenance order with cascade lifecycle.',
          'Enforces tracking of planned work hours and execution duration.'
        ]
      },
      {
        requirementId: `REQ-${cleanTcode}-003`,
        title: 'Action: Release Maintenance Order',
        category: 'ACTION',
        priority: 'MUST_HAVE',
        status: 'CONFIRMED',
        sourceType: 'DISCOVERY_ASSESSMENT',
        source: 'DOMAIN_ARCHETYPE',
        description: 'Implement instance action "releaseMaintenanceOrder" to transition order from CRTD to REL.',
        acceptanceCriteria: [
          'Sets system status to REL and enables material reservation and technician assignment.'
        ]
      },
      {
        requirementId: `REQ-${cleanTcode}-004`,
        title: 'Action: Technical Completion (TECO)',
        category: 'ACTION',
        priority: 'MUST_HAVE',
        status: 'CONFIRMED',
        sourceType: 'DISCOVERY_ASSESSMENT',
        source: 'DOMAIN_ARCHETYPE',
        description: 'Implement instance action "completeTechnically" to close maintenance activities and confirm actual downtime.',
        acceptanceCriteria: [
          'Flags order as TECO and locks operations from further manual time entries.'
        ]
      },
      {
        requirementId: `REQ-${cleanTcode}-005`,
        title: 'Validation: Equipment & Plant Consistency',
        category: 'VALIDATION',
        priority: 'MUST_HAVE',
        status: 'CONFIRMED',
        sourceType: 'DISCOVERY_ASSESSMENT',
        source: 'DOMAIN_ARCHETYPE',
        description: 'Validate that the selected Equipment belongs to the designated Maintenance Plant.',
        acceptanceCriteria: [
          'Returns error if Equipment is installed at a different plant location.'
        ]
      }
    ];

    const entities = [
      {
        id: rootId,
        entityId: rootId,
        name: rootName,
        label: `${tcode} Maintenance Order`,
        description: `Root Header Entity for ${tcode} Maintenance Operations`,
        entityType: 'ROOT',
        isRoot: true,
        persistenceStrategy: 'MANAGED_TABLE',
        tableName: `Z${cleanTcode.slice(0, 8)}ORD`,
        fields: [
          { id: 'FLD-UUID', name: 'OrderUUID', label: 'Technical Key', abapType: 'UUID', type: 'sysuuid_x16', isKey: true, isMandatory: true, semanticRole: 'KEY' },
          { id: 'FLD-AUFNR', name: 'OrderNumber', label: 'Order Number', abapType: 'CHAR', type: 'abap.char', length: 12, isMandatory: true, semanticRole: 'BUSINESS_KEY' },
          { id: 'FLD-AUFART', name: 'OrderType', label: 'Order Type', abapType: 'CHAR', type: 'abap.char', length: 4, isMandatory: true, semanticRole: 'GENERAL' },
          { id: 'FLD-KTEXT', name: 'OrderDescription', label: 'Description', abapType: 'CHAR', type: 'abap.char', length: 40, isMandatory: true, semanticRole: 'TEXT' },
          { id: 'FLD-EQUNR', name: 'Equipment', label: 'Equipment Number', abapType: 'CHAR', type: 'abap.char', length: 18, semanticRole: 'GENERAL', valueHelp: 'I_Equipment' },
          { id: 'FLD-TPLNR', name: 'FunctionalLocation', label: 'Functional Location', abapType: 'CHAR', type: 'abap.char', length: 30, semanticRole: 'GENERAL' },
          { id: 'FLD-WERKS', name: 'MaintenancePlant', label: 'Maintenance Plant', abapType: 'CHAR', type: 'abap.char', length: 4, isMandatory: true, semanticRole: 'ORG_UNIT', valueHelp: 'I_Plant' },
          { id: 'FLD-ARBPL', name: 'MainWorkCenter', label: 'Main Work Center', abapType: 'CHAR', type: 'abap.char', length: 8, isMandatory: true, semanticRole: 'ORG_UNIT' },
          { id: 'FLD-PRIOK', name: 'Priority', label: 'Priority', abapType: 'CHAR', type: 'abap.char', length: 1, semanticRole: 'GENERAL' },
          { id: 'FLD-START', name: 'PlannedStartDate', label: 'Start Date', abapType: 'DATS', type: 'abap.dats', isMandatory: true, semanticRole: 'DATE' },
          { id: 'FLD-END', name: 'PlannedEndDate', label: 'End Date', abapType: 'DATS', type: 'abap.dats', isMandatory: true, semanticRole: 'DATE' },
          { id: 'FLD-STATUS', name: 'OrderStatus', label: 'System Status', abapType: 'CHAR', type: 'abap.char', length: 8, semanticRole: 'STATUS' },
          { id: 'FLD-COST', name: 'TotalEstimatedCost', label: 'Estimated Cost', abapType: 'CURR', type: 'abap.curr', length: 15, precision: 15, scale: 2, cukyField: 'Currency', semanticRole: 'AMOUNT' },
          { id: 'FLD-CUKY', name: 'Currency', label: 'Currency', abapType: 'CUKY', type: 'abap.cuky', length: 5, isMandatory: true, semanticRole: 'CURRENCY_CODE', valueHelp: 'I_Currency' },
          { id: 'FLD-CRDAT', name: 'CreatedAt', label: 'Created At', abapType: 'TIMESTAMPL', type: 'abap.utclong', isReadOnly: true, semanticRole: 'ADMIN_CREATED_AT' }
        ],
        relationships: []
      },
      {
        id: childId,
        entityId: childId,
        name: childName,
        label: `${tcode} Maintenance Operation`,
        description: `Child Operation Entity composed under ${rootName}`,
        entityType: 'CHILD',
        isRoot: false,
        persistenceStrategy: 'MANAGED_TABLE',
        tableName: `Z${cleanTcode.slice(0, 8)}OPR`,
        fields: [
          { id: 'FLD-OPR-UUID', name: 'OperationUUID', label: 'Operation Key', abapType: 'UUID', type: 'sysuuid_x16', isKey: true, isMandatory: true, semanticRole: 'KEY' },
          { id: 'FLD-OPR-PAR', name: 'OrderUUID', label: 'Parent Order Key', abapType: 'UUID', type: 'sysuuid_x16', isMandatory: true, semanticRole: 'PARENT_KEY' },
          { id: 'FLD-OPR-VORNR', name: 'OperationNumber', label: 'Operation', abapType: 'NUMC', type: 'abap.numc', length: 4, isMandatory: true, semanticRole: 'ITEM_NUMBER' },
          { id: 'FLD-OPR-ARBPL', name: 'WorkCenter', label: 'Work Center', abapType: 'CHAR', type: 'abap.char', length: 8, isMandatory: true, semanticRole: 'ORG_UNIT' },
          { id: 'FLD-OPR-STEUS', name: 'ControlKey', label: 'Control Key', abapType: 'CHAR', type: 'abap.char', length: 4, isMandatory: true, semanticRole: 'GENERAL' },
          { id: 'FLD-OPR-LTXA1', name: 'OperationText', label: 'Operation Text', abapType: 'CHAR', type: 'abap.char', length: 40, isMandatory: true, semanticRole: 'TEXT' },
          { id: 'FLD-OPR-ARBEI', name: 'PlannedWork', label: 'Planned Work', abapType: 'QUAN', type: 'abap.quan', length: 7, precision: 7, scale: 1, unitField: 'WorkUnit', semanticRole: 'QUANTITY' },
          { id: 'FLD-OPR-ARBEH', name: 'WorkUnit', label: 'Unit of Work', abapType: 'UNIT', type: 'abap.unit', length: 3, isMandatory: true, semanticRole: 'UNIT_OF_MEASURE' },
          { id: 'FLD-OPR-DAUNO', name: 'DurationNormal', label: 'Duration', abapType: 'QUAN', type: 'abap.quan', length: 5, precision: 5, scale: 1, unitField: 'DurationUnit', semanticRole: 'QUANTITY' },
          { id: 'FLD-OPR-DAUNE', name: 'DurationUnit', label: 'Duration Unit', abapType: 'UNIT', type: 'abap.unit', length: 3, semanticRole: 'UNIT_OF_MEASURE' }
        ],
        relationships: []
      }
    ];

    const relationships = [
      {
        relationshipId: relId,
        sourceEntityId: rootId,
        targetEntityId: childId,
        name: '_Operations',
        relationshipType: 'COMPOSITION',
        cardinality: '[0..*]',
        mapping: [{ sourceField: 'OrderUUID', targetField: 'OrderUUID' }],
        description: `Composition from ${rootName} to ${childName}`,
        onDelete: 'CASCADE'
      }
    ];

    return {
      domain: DOMAIN_ARCHETYPES.PM,
      domainTitle: 'Plant Maintenance & Asset Operations',
      rootEntityName: rootName,
      childEntityName: childName,
      initialRequirements: requirements,
      starterDataModel: {
        specVersion: 1,
        rootEntity: rootName,
        entities,
        relationships,
        validationReport: { isValid: true, summary: { totalEntities: 2, totalFields: 25, totalRelationships: 1, errorCount: 0, warningCount: 0 }, issues: [] },
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
  // 3. QUALITY MANAGEMENT ARCHETYPE (QA01, QE51N, QA32, etc.)
  // =========================================================================
  _buildQualityManagementArchetype(cleanTcode, tcode, desc, release) {
    const rootName = `Z_I_${cleanTcode}Lot`;
    const childName = `Z_I_${cleanTcode}Char`;
    const rootId = `ENT-${cleanTcode}-LOT`;
    const childId = `ENT-${cleanTcode}-CHR`;
    const relId = `REL-${cleanTcode}-COMP`;

    const requirements = [
      {
        requirementId: `REQ-${cleanTcode}-001`,
        title: `Quality Inspection Lot Management (${tcode})`,
        category: 'FUNCTIONAL',
        priority: 'MUST_HAVE',
        status: 'CONFIRMED',
        sourceType: 'DISCOVERY_ASSESSMENT',
        source: 'DOMAIN_ARCHETYPE',
        description: 'Track inspection lots, material origins, sample sizes, and Usage Decisions.',
        acceptanceCriteria: [
          'Filter by Inspection Lot, Material, Plant, Inspection Type, and Lot Status.',
          'Object page summarizes inspection specifications and valuation decision.'
        ]
      },
      {
        requirementId: `REQ-${cleanTcode}-002`,
        title: 'Inspection Characteristics & Results Recording',
        category: 'FUNCTIONAL',
        priority: 'MUST_HAVE',
        status: 'CONFIRMED',
        sourceType: 'DISCOVERY_ASSESSMENT',
        source: 'DOMAIN_ARCHETYPE',
        description: 'Record quantitative and qualitative sample measurements against tolerance limits.',
        acceptanceCriteria: [
          'Characteristics composed under inspection lot with real-time valuation indicators.',
          'Evaluates if measured result falls within Lower and Upper specification limits.'
        ]
      },
      {
        requirementId: `REQ-${cleanTcode}-003`,
        title: 'Action: Record Usage Decision (UD)',
        category: 'ACTION',
        priority: 'MUST_HAVE',
        status: 'CONFIRMED',
        sourceType: 'DISCOVERY_ASSESSMENT',
        source: 'DOMAIN_ARCHETYPE',
        description: 'Implement instance action "makeUsageDecision" to accept (A) or reject (R) the inspection lot.',
        acceptanceCriteria: [
          'Updates UsageDecisionCode and stock posting status upon quality manager authorization.'
        ]
      },
      {
        requirementId: `REQ-${cleanTcode}-004`,
        title: 'Validation: Mandatory Inspection Results Prior to UD',
        category: 'VALIDATION',
        priority: 'MUST_HAVE',
        status: 'CONFIRMED',
        sourceType: 'DISCOVERY_ASSESSMENT',
        source: 'DOMAIN_ARCHETYPE',
        description: 'Enforce that all required characteristics are completed before making a Usage Decision.',
        acceptanceCriteria: [
          'Rejects UD posting if any mandatory characteristic remains without recorded value.'
        ]
      }
    ];

    const entities = [
      {
        id: rootId,
        entityId: rootId,
        name: rootName,
        label: `${tcode} Inspection Lot`,
        description: `Root Header Entity for ${tcode} Quality Inspection`,
        entityType: 'ROOT',
        isRoot: true,
        persistenceStrategy: 'MANAGED_TABLE',
        tableName: `Z${cleanTcode.slice(0, 8)}LOT`,
        fields: [
          { id: 'FLD-UUID', name: 'LotUUID', label: 'Technical Key', abapType: 'UUID', type: 'sysuuid_x16', isKey: true, isMandatory: true, semanticRole: 'KEY' },
          { id: 'FLD-PRUEF', name: 'InspectionLot', label: 'Inspection Lot', abapType: 'NUMC', type: 'abap.numc', length: 12, isMandatory: true, semanticRole: 'BUSINESS_KEY' },
          { id: 'FLD-MATNR', name: 'Material', label: 'Material Number', abapType: 'CHAR', type: 'abap.char', length: 40, isMandatory: true, semanticRole: 'PRODUCT_ID', valueHelp: 'I_Material' },
          { id: 'FLD-WERKS', name: 'Plant', label: 'Inspection Plant', abapType: 'CHAR', type: 'abap.char', length: 4, isMandatory: true, semanticRole: 'ORG_UNIT', valueHelp: 'I_Plant' },
          { id: 'FLD-CHARG', name: 'Batch', label: 'Material Batch', abapType: 'CHAR', type: 'abap.char', length: 10, semanticRole: 'GENERAL' },
          { id: 'FLD-ART', name: 'InspectionType', label: 'Inspection Type', abapType: 'CHAR', type: 'abap.char', length: 8, isMandatory: true, semanticRole: 'GENERAL' },
          { id: 'FLD-MENGE', name: 'LotQuantity', label: 'Lot Quantity', abapType: 'QUAN', type: 'abap.quan', length: 13, precision: 13, scale: 3, unitField: 'QuantityUnit', semanticRole: 'QUANTITY' },
          { id: 'FLD-UNIT', name: 'QuantityUnit', label: 'Base Unit', abapType: 'UNIT', type: 'abap.unit', length: 3, isMandatory: true, semanticRole: 'UNIT_OF_MEASURE' },
          { id: 'FLD-DATE', name: 'InspectionDate', label: 'Inspection Date', abapType: 'DATS', type: 'abap.dats', isMandatory: true, semanticRole: 'DATE' },
          { id: 'FLD-STATUS', name: 'LotStatus', label: 'Lot Status', abapType: 'CHAR', type: 'abap.char', length: 8, semanticRole: 'STATUS' },
          { id: 'FLD-UD', name: 'UsageDecisionCode', label: 'Usage Decision', abapType: 'CHAR', type: 'abap.char', length: 4, semanticRole: 'STATUS' },
          { id: 'FLD-CRDAT', name: 'CreatedAt', label: 'Created At', abapType: 'TIMESTAMPL', type: 'abap.utclong', isReadOnly: true, semanticRole: 'ADMIN_CREATED_AT' }
        ],
        relationships: []
      },
      {
        id: childId,
        entityId: childId,
        name: childName,
        label: `${tcode} Inspection Characteristic`,
        description: `Child Characteristic Entity composed under ${rootName}`,
        entityType: 'CHILD',
        isRoot: false,
        persistenceStrategy: 'MANAGED_TABLE',
        tableName: `Z${cleanTcode.slice(0, 8)}CHR`,
        fields: [
          { id: 'FLD-CHR-UUID', name: 'CharUUID', label: 'Characteristic Key', abapType: 'UUID', type: 'sysuuid_x16', isKey: true, isMandatory: true, semanticRole: 'KEY' },
          { id: 'FLD-CHR-PAR', name: 'LotUUID', label: 'Parent Lot Key', abapType: 'UUID', type: 'sysuuid_x16', isMandatory: true, semanticRole: 'PARENT_KEY' },
          { id: 'FLD-CHR-NUM', name: 'CharacteristicNumber', label: 'Char Number', abapType: 'NUMC', type: 'abap.numc', length: 4, isMandatory: true, semanticRole: 'ITEM_NUMBER' },
          { id: 'FLD-CHR-TXT', name: 'CharacteristicText', label: 'Specification Name', abapType: 'CHAR', type: 'abap.char', length: 40, isMandatory: true, semanticRole: 'TEXT' },
          { id: 'FLD-CHR-TGT', name: 'TargetValue', label: 'Target Spec', abapType: 'DEC', type: 'abap.dec', length: 10, precision: 10, scale: 3, semanticRole: 'GENERAL' },
          { id: 'FLD-CHR-LOW', name: 'LowerLimit', label: 'Lower Limit', abapType: 'DEC', type: 'abap.dec', length: 10, precision: 10, scale: 3, semanticRole: 'GENERAL' },
          { id: 'FLD-CHR-UPP', name: 'UpperLimit', label: 'Upper Limit', abapType: 'DEC', type: 'abap.dec', length: 10, precision: 10, scale: 3, semanticRole: 'GENERAL' },
          { id: 'FLD-CHR-VAL', name: 'RecordedResult', label: 'Measured Value', abapType: 'DEC', type: 'abap.dec', length: 10, precision: 10, scale: 3, semanticRole: 'GENERAL' },
          { id: 'FLD-CHR-EVAL', name: 'EvaluationResult', label: 'Valuation', abapType: 'CHAR', type: 'abap.char', length: 4, semanticRole: 'STATUS' }
        ],
        relationships: []
      }
    ];

    const relationships = [
      {
        relationshipId: relId,
        sourceEntityId: rootId,
        targetEntityId: childId,
        name: '_Characteristics',
        relationshipType: 'COMPOSITION',
        cardinality: '[0..*]',
        mapping: [{ sourceField: 'LotUUID', targetField: 'LotUUID' }],
        description: `Composition from ${rootName} to ${childName}`,
        onDelete: 'CASCADE'
      }
    ];

    return {
      domain: DOMAIN_ARCHETYPES.QM,
      domainTitle: 'Quality Management & Inspection',
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
  // 4. WAREHOUSE MANAGEMENT & LOGISTICS ARCHETYPE (LT01, LS24, /SCWM/*, etc.)
  // =========================================================================
  _buildWarehouseManagementArchetype(cleanTcode, tcode, desc, release) {
    const rootName = `Z_I_${cleanTcode}Task`;
    const childName = `Z_I_${cleanTcode}Item`;
    const rootId = `ENT-${cleanTcode}-TSK`;
    const childId = `ENT-${cleanTcode}-ITM`;
    const relId = `REL-${cleanTcode}-COMP`;

    const requirements = [
      {
        requirementId: `REQ-${cleanTcode}-001`,
        title: `Warehouse Task & Movement Header (${tcode})`,
        category: 'FUNCTIONAL',
        priority: 'MUST_HAVE',
        status: 'CONFIRMED',
        sourceType: 'DISCOVERY_ASSESSMENT',
        source: 'DOMAIN_ARCHETYPE',
        description: 'Coordinate warehouse tasks, storage bin allocations, and goods putaway / picking.',
        acceptanceCriteria: [
          'Filter by Warehouse Number, Transfer Order, Source Bin, and Target Bin.',
          'Object page provides bin topology and movement status.'
        ]
      },
      {
        requirementId: `REQ-${cleanTcode}-002`,
        title: 'Warehouse Task Line Items & Quantity Handling',
        category: 'FUNCTIONAL',
        priority: 'MUST_HAVE',
        status: 'CONFIRMED',
        sourceType: 'DISCOVERY_ASSESSMENT',
        source: 'DOMAIN_ARCHETYPE',
        description: 'Manage material quantities, batch splits, and confirmed weights.',
        acceptanceCriteria: [
          'Line items represent distinct handling units or material allocations.',
          'Maintains target vs actual confirmed quantity.'
        ]
      },
      {
        requirementId: `REQ-${cleanTcode}-003`,
        title: 'Action: Confirm Warehouse Task',
        category: 'ACTION',
        priority: 'MUST_HAVE',
        status: 'CONFIRMED',
        sourceType: 'DISCOVERY_ASSESSMENT',
        source: 'DOMAIN_ARCHETYPE',
        description: 'Implement instance action "confirmWarehouseTask" upon physical inventory movement.',
        acceptanceCriteria: [
          'Transitions task status to CONFIRMED and updates inventory balances in destination storage bin.'
        ]
      },
      {
        requirementId: `REQ-${cleanTcode}-004`,
        title: 'Validation: Destination Storage Bin Capacity',
        category: 'VALIDATION',
        priority: 'MUST_HAVE',
        status: 'CONFIRMED',
        sourceType: 'DISCOVERY_ASSESSMENT',
        source: 'DOMAIN_ARCHETYPE',
        description: 'Verify destination storage bin is active and not blocked for putaway.',
        acceptanceCriteria: [
          'Rejects transfer task if destination bin is locked or over capacity.'
        ]
      }
    ];

    const entities = [
      {
        id: rootId,
        entityId: rootId,
        name: rootName,
        label: `${tcode} Warehouse Task Header`,
        description: `Root Header Entity for ${tcode} Warehouse Logistics`,
        entityType: 'ROOT',
        isRoot: true,
        persistenceStrategy: 'MANAGED_TABLE',
        tableName: `Z${cleanTcode.slice(0, 8)}TSK`,
        fields: [
          { id: 'FLD-UUID', name: 'TaskUUID', label: 'Technical Key', abapType: 'UUID', type: 'sysuuid_x16', isKey: true, isMandatory: true, semanticRole: 'KEY' },
          { id: 'FLD-LGNUM', name: 'WarehouseNumber', label: 'Warehouse Number', abapType: 'CHAR', type: 'abap.char', length: 4, isMandatory: true, semanticRole: 'ORG_UNIT' },
          { id: 'FLD-TANUM', name: 'TransferOrder', label: 'Transfer Order', abapType: 'NUMC', type: 'abap.numc', length: 10, isMandatory: true, semanticRole: 'BUSINESS_KEY' },
          { id: 'FLD-BWLVS', name: 'MovementType', label: 'Movement Type', abapType: 'CHAR', type: 'abap.char', length: 3, isMandatory: true, semanticRole: 'GENERAL' },
          { id: 'FLD-VLTYP', name: 'SourceStorageType', label: 'Source Type', abapType: 'CHAR', type: 'abap.char', length: 4, semanticRole: 'GENERAL' },
          { id: 'FLD-VLPLA', name: 'SourceStorageBin', label: 'Source Bin', abapType: 'CHAR', type: 'abap.char', length: 18, isMandatory: true, semanticRole: 'GENERAL' },
          { id: 'FLD-NLTYP', name: 'TargetStorageType', label: 'Target Type', abapType: 'CHAR', type: 'abap.char', length: 4, semanticRole: 'GENERAL' },
          { id: 'FLD-NLPLA', name: 'TargetStorageBin', label: 'Target Bin', abapType: 'CHAR', type: 'abap.char', length: 18, isMandatory: true, semanticRole: 'GENERAL' },
          { id: 'FLD-STATUS', name: 'TaskStatus', label: 'Confirmation Status', abapType: 'CHAR', type: 'abap.char', length: 10, semanticRole: 'STATUS' },
          { id: 'FLD-CRDAT', name: 'CreatedAt', label: 'Created At', abapType: 'TIMESTAMPL', type: 'abap.utclong', isReadOnly: true, semanticRole: 'ADMIN_CREATED_AT' }
        ],
        relationships: []
      },
      {
        id: childId,
        entityId: childId,
        name: childName,
        label: `${tcode} Warehouse Task Item`,
        description: `Child Item Entity composed under ${rootName}`,
        entityType: 'CHILD',
        isRoot: false,
        persistenceStrategy: 'MANAGED_TABLE',
        tableName: `Z${cleanTcode.slice(0, 8)}ITM`,
        fields: [
          { id: 'FLD-ITM-UUID', name: 'ItemUUID', label: 'Item Key', abapType: 'UUID', type: 'sysuuid_x16', isKey: true, isMandatory: true, semanticRole: 'KEY' },
          { id: 'FLD-ITM-PAR', name: 'TaskUUID', label: 'Parent Task Key', abapType: 'UUID', type: 'sysuuid_x16', isMandatory: true, semanticRole: 'PARENT_KEY' },
          { id: 'FLD-ITM-POS', name: 'ItemNumber', label: 'Item Number', abapType: 'NUMC', type: 'abap.numc', length: 4, isMandatory: true, semanticRole: 'ITEM_NUMBER' },
          { id: 'FLD-ITM-MAT', name: 'Material', label: 'Material Number', abapType: 'CHAR', type: 'abap.char', length: 40, isMandatory: true, semanticRole: 'PRODUCT_ID', valueHelp: 'I_Material' },
          { id: 'FLD-ITM-DESC', name: 'MaterialDescription', label: 'Description', abapType: 'CHAR', type: 'abap.char', length: 80, semanticRole: 'TEXT' },
          { id: 'FLD-ITM-BATCH', name: 'Batch', label: 'Batch', abapType: 'CHAR', type: 'abap.char', length: 10, semanticRole: 'GENERAL' },
          { id: 'FLD-ITM-QTY', name: 'TargetQuantity', label: 'Target Qty', abapType: 'QUAN', type: 'abap.quan', length: 13, precision: 13, scale: 3, unitField: 'QuantityUnit', semanticRole: 'QUANTITY' },
          { id: 'FLD-ITM-ACT', name: 'ActualQuantity', label: 'Actual Qty', abapType: 'QUAN', type: 'abap.quan', length: 13, precision: 13, scale: 3, unitField: 'QuantityUnit', semanticRole: 'QUANTITY' },
          { id: 'FLD-ITM-UNIT', name: 'QuantityUnit', label: 'Unit', abapType: 'UNIT', type: 'abap.unit', length: 3, isMandatory: true, semanticRole: 'UNIT_OF_MEASURE' }
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
        cardinality: '[0..*]',
        mapping: [{ sourceField: 'TaskUUID', targetField: 'TaskUUID' }],
        description: `Composition from ${rootName} to ${childName}`,
        onDelete: 'CASCADE'
      }
    ];

    return {
      domain: DOMAIN_ARCHETYPES.WM,
      domainTitle: 'Warehouse Management & Logistics',
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
  // 5. HUMAN CAPITAL MANAGEMENT & TIME RECORDING ARCHETYPE (CAT2, PA30, etc.)
  // =========================================================================
  _buildHCMArchetype(cleanTcode, tcode, desc, release) {
    const rootName = `Z_I_${cleanTcode}TimeSheet`;
    const childName = `Z_I_${cleanTcode}Entry`;
    const rootId = `ENT-${cleanTcode}-TS`;
    const childId = `ENT-${cleanTcode}-ENT`;
    const relId = `REL-${cleanTcode}-COMP`;

    const requirements = [
      {
        requirementId: `REQ-${cleanTcode}-001`,
        title: `Time Sheet & Employee Assignment (${tcode})`,
        category: 'FUNCTIONAL',
        priority: 'MUST_HAVE',
        status: 'CONFIRMED',
        sourceType: 'DISCOVERY_ASSESSMENT',
        source: 'DOMAIN_ARCHETYPE',
        description: 'Record work hours, employee cost centers, and overall approval status.',
        acceptanceCriteria: [
          'Filter by Personnel Number, Work Date, Company Code, and Approval Status.',
          'Object page aggregates weekly total hours and overtime thresholds.'
        ]
      },
      {
        requirementId: `REQ-${cleanTcode}-002`,
        title: 'Activity Assignment & WBS Allocation Line Items',
        category: 'FUNCTIONAL',
        priority: 'MUST_HAVE',
        status: 'CONFIRMED',
        sourceType: 'DISCOVERY_ASSESSMENT',
        source: 'DOMAIN_ARCHETYPE',
        description: 'Provide detailed allocation of hours to WBS elements, internal orders, or cost centers.',
        acceptanceCriteria: [
          'Line items capture specific activity type, task code, and recorded duration.',
          'Cascading updates reflect in weekly sheet summary.'
        ]
      },
      {
        requirementId: `REQ-${cleanTcode}-003`,
        title: 'Action: Submit Time Sheet for Approval',
        category: 'ACTION',
        priority: 'MUST_HAVE',
        status: 'CONFIRMED',
        sourceType: 'DISCOVERY_ASSESSMENT',
        source: 'DOMAIN_ARCHETYPE',
        description: 'Implement instance action "submitTimeSheet" to route recorded hours to manager workflow.',
        acceptanceCriteria: [
          'Transitions status from DRAFT to SUBMITTED and prevents subsequent employee modification.'
        ]
      },
      {
        requirementId: `REQ-${cleanTcode}-004`,
        title: 'Validation: Daily Working Time Limit (12h)',
        category: 'VALIDATION',
        priority: 'MUST_HAVE',
        status: 'CONFIRMED',
        sourceType: 'DISCOVERY_ASSESSMENT',
        source: 'DOMAIN_ARCHETYPE',
        description: 'Enforce statutory labor limit: maximum 12 working hours per single calendar day.',
        acceptanceCriteria: [
          'Rejects save operation if aggregate hours on any date exceed 12 hours.'
        ]
      }
    ];

    const entities = [
      {
        id: rootId,
        entityId: rootId,
        name: rootName,
        label: `${tcode} Time Sheet Header`,
        description: `Root Header Entity for ${tcode} Time Recording`,
        entityType: 'ROOT',
        isRoot: true,
        persistenceStrategy: 'MANAGED_TABLE',
        tableName: `Z${cleanTcode.slice(0, 8)}TS`,
        fields: [
          { id: 'FLD-UUID', name: 'SheetUUID', label: 'Technical Key', abapType: 'UUID', type: 'sysuuid_x16', isKey: true, isMandatory: true, semanticRole: 'KEY' },
          { id: 'FLD-PERNR', name: 'PersonnelNumber', label: 'Personnel Number', abapType: 'NUMC', type: 'abap.numc', length: 8, isMandatory: true, semanticRole: 'BUSINESS_KEY' },
          { id: 'FLD-ENAME', name: 'EmployeeName', label: 'Employee Name', abapType: 'CHAR', type: 'abap.char', length: 40, semanticRole: 'TEXT' },
          { id: 'FLD-BUKRS', name: 'CompanyCode', label: 'Company Code', abapType: 'CHAR', type: 'abap.char', length: 4, isMandatory: true, semanticRole: 'ORG_UNIT', valueHelp: 'I_CompanyCode' },
          { id: 'FLD-KOSTL', name: 'MasterCostCenter', label: 'Cost Center', abapType: 'CHAR', type: 'abap.char', length: 10, semanticRole: 'ORG_UNIT', valueHelp: 'I_CostCenter' },
          { id: 'FLD-DATE', name: 'WorkDate', label: 'Reference Date', abapType: 'DATS', type: 'abap.dats', isMandatory: true, semanticRole: 'DATE' },
          { id: 'FLD-TOT', name: 'TotalHours', label: 'Total Recorded Hours', abapType: 'QUAN', type: 'abap.quan', length: 6, precision: 6, scale: 2, unitField: 'HourUnit', semanticRole: 'QUANTITY' },
          { id: 'FLD-UNIT', name: 'HourUnit', label: 'Unit', abapType: 'UNIT', type: 'abap.unit', length: 3, isMandatory: true, semanticRole: 'UNIT_OF_MEASURE' },
          { id: 'FLD-STATUS', name: 'ApprovalStatus', label: 'Approval Status', abapType: 'CHAR', type: 'abap.char', length: 12, semanticRole: 'STATUS' },
          { id: 'FLD-CRDAT', name: 'CreatedAt', label: 'Created At', abapType: 'TIMESTAMPL', type: 'abap.utclong', isReadOnly: true, semanticRole: 'ADMIN_CREATED_AT' }
        ],
        relationships: []
      },
      {
        id: childId,
        entityId: childId,
        name: childName,
        label: `${tcode} Time Entry Item`,
        description: `Child Entry Entity composed under ${rootName}`,
        entityType: 'CHILD',
        isRoot: false,
        persistenceStrategy: 'MANAGED_TABLE',
        tableName: `Z${cleanTcode.slice(0, 8)}ENT`,
        fields: [
          { id: 'FLD-ENT-UUID', name: 'EntryUUID', label: 'Entry Key', abapType: 'UUID', type: 'sysuuid_x16', isKey: true, isMandatory: true, semanticRole: 'KEY' },
          { id: 'FLD-ENT-PAR', name: 'SheetUUID', label: 'Parent Sheet Key', abapType: 'UUID', type: 'sysuuid_x16', isMandatory: true, semanticRole: 'PARENT_KEY' },
          { id: 'FLD-ENT-NUM', name: 'ItemNumber', label: 'Item Number', abapType: 'NUMC', type: 'abap.numc', length: 4, isMandatory: true, semanticRole: 'ITEM_NUMBER' },
          { id: 'FLD-ENT-POSID', name: 'WBSElement', label: 'WBS Element', abapType: 'CHAR', type: 'abap.char', length: 24, semanticRole: 'GENERAL' },
          { id: 'FLD-ENT-LSTAR', name: 'ActivityType', label: 'Activity Type', abapType: 'CHAR', type: 'abap.char', length: 6, isMandatory: true, semanticRole: 'GENERAL' },
          { id: 'FLD-ENT-HRS', name: 'RecordedHours', label: 'Hours', abapType: 'QUAN', type: 'abap.quan', length: 5, precision: 5, scale: 2, unitField: 'HourUnit', semanticRole: 'QUANTITY' },
          { id: 'FLD-ENT-UNIT', name: 'HourUnit', label: 'Unit', abapType: 'UNIT', type: 'abap.unit', length: 3, isMandatory: true, semanticRole: 'UNIT_OF_MEASURE' },
          { id: 'FLD-ENT-RKOST', name: 'ReceiverCostCenter', label: 'Receiver Cost Center', abapType: 'CHAR', type: 'abap.char', length: 10, semanticRole: 'ORG_UNIT', valueHelp: 'I_CostCenter' },
          { id: 'FLD-ENT-TXT', name: 'TaskNotes', label: 'Activity Description', abapType: 'CHAR', type: 'abap.char', length: 80, semanticRole: 'TEXT' }
        ],
        relationships: []
      }
    ];

    const relationships = [
      {
        relationshipId: relId,
        sourceEntityId: rootId,
        targetEntityId: childId,
        name: '_Entries',
        relationshipType: 'COMPOSITION',
        cardinality: '[0..*]',
        mapping: [{ sourceField: 'SheetUUID', targetField: 'SheetUUID' }],
        description: `Composition from ${rootName} to ${childName}`,
        onDelete: 'CASCADE'
      }
    ];

    return {
      domain: DOMAIN_ARCHETYPES.HCM,
      domainTitle: 'Human Capital & Time Recording',
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
  // 6. MATERIALS MANAGEMENT & PURCHASING ARCHETYPE (ME21N, MM, etc.)
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
        sourceType: 'DISCOVERY_ASSESSMENT',
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
        sourceType: 'DISCOVERY_ASSESSMENT',
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
        sourceType: 'DISCOVERY_ASSESSMENT',
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
        sourceType: 'DISCOVERY_ASSESSMENT',
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
          { id: 'FLD-BUKRS', name: 'CompanyCode', label: 'Company Code', abapType: 'CHAR', type: 'abap.char', length: 4, isMandatory: true, semanticRole: 'ORG_UNIT', valueHelp: 'I_CompanyCode' },
          { id: 'FLD-EKORG', name: 'PurchasingOrg', label: 'Purchasing Org', abapType: 'CHAR', type: 'abap.char', length: 4, isMandatory: true, semanticRole: 'ORG_UNIT' },
          { id: 'FLD-EKGRP', name: 'PurchasingGroup', label: 'Purchasing Group', abapType: 'CHAR', type: 'abap.char', length: 3, isMandatory: false, semanticRole: 'ORG_UNIT' },
          { id: 'FLD-LIFNR', name: 'Supplier', label: 'Supplier Account', abapType: 'CHAR', type: 'abap.char', length: 10, isMandatory: true, semanticRole: 'BUSINESS_PARTNER', valueHelp: 'I_Supplier' },
          { id: 'FLD-NAME', name: 'SupplierName', label: 'Supplier Name', abapType: 'CHAR', type: 'abap.char', length: 80, semanticRole: 'TEXT' },
          { id: 'FLD-DATE', name: 'DocumentDate', label: 'Document Date', abapType: 'DATS', type: 'abap.dats', isMandatory: true, semanticRole: 'DATE' },
          { id: 'FLD-STATUS', name: 'OverallStatus', label: 'Approval Status', abapType: 'CHAR', type: 'abap.char', length: 12, semanticRole: 'STATUS' },
          { id: 'FLD-AMT', name: 'TotalNetAmount', label: 'Total Net Amount', abapType: 'CURR', type: 'abap.curr', length: 15, precision: 15, scale: 2, cukyField: 'Currency', semanticRole: 'AMOUNT' },
          { id: 'FLD-CUKY', name: 'Currency', label: 'Document Currency', abapType: 'CUKY', type: 'abap.cuky', length: 5, isMandatory: true, semanticRole: 'CURRENCY_CODE', valueHelp: 'I_Currency' },
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
          { id: 'FLD-ITM-MAT', name: 'Material', label: 'Material Number', abapType: 'CHAR', type: 'abap.char', length: 40, isMandatory: true, semanticRole: 'PRODUCT_ID', valueHelp: 'I_Material' },
          { id: 'FLD-ITM-DESC', name: 'MaterialDescription', label: 'Description', abapType: 'CHAR', type: 'abap.char', length: 80, semanticRole: 'TEXT' },
          { id: 'FLD-ITM-PLANT', name: 'Plant', label: 'Plant', abapType: 'CHAR', type: 'abap.char', length: 4, isMandatory: true, semanticRole: 'ORG_UNIT', valueHelp: 'I_Plant' },
          { id: 'FLD-ITM-QTY', name: 'OrderQuantity', label: 'Order Quantity', abapType: 'QUAN', type: 'abap.quan', length: 13, precision: 13, scale: 3, unitField: 'OrderQuantityUnit', semanticRole: 'QUANTITY' },
          { id: 'FLD-ITM-UNIT', name: 'OrderQuantityUnit', label: 'Unit of Measure', abapType: 'UNIT', type: 'abap.unit', length: 3, isMandatory: true, semanticRole: 'UNIT_OF_MEASURE' },
          { id: 'FLD-ITM-PRICE', name: 'NetPrice', label: 'Net Unit Price', abapType: 'CURR', type: 'abap.curr', length: 11, precision: 11, scale: 2, cukyField: 'Currency', semanticRole: 'AMOUNT' },
          { id: 'FLD-ITM-TOT', name: 'ItemNetAmount', label: 'Item Net Amount', abapType: 'CURR', type: 'abap.curr', length: 15, precision: 15, scale: 2, cukyField: 'Currency', semanticRole: 'AMOUNT' },
          { id: 'FLD-ITM-CUKY', name: 'Currency', label: 'Currency', abapType: 'CUKY', type: 'abap.cuky', length: 5, semanticRole: 'CURRENCY_CODE', valueHelp: 'I_Currency' }
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
        cardinality: '[0..*]',
        mapping: [{ sourceField: 'PurchaseOrderUUID', targetField: 'PurchaseOrderUUID' }],
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
  // 7. PRODUCTION PLANNING & MANUFACTURING ARCHETYPE (CO01, PP, etc.)
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
        sourceType: 'DISCOVERY_ASSESSMENT',
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
        sourceType: 'DISCOVERY_ASSESSMENT',
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
        sourceType: 'DISCOVERY_ASSESSMENT',
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
        sourceType: 'DISCOVERY_ASSESSMENT',
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
          { id: 'FLD-MAT', name: 'Material', label: 'Produced Material', abapType: 'CHAR', type: 'abap.char', length: 40, isMandatory: true, semanticRole: 'PRODUCT_ID', valueHelp: 'I_Material' },
          { id: 'FLD-PLANT', name: 'ProductionPlant', label: 'Plant', abapType: 'CHAR', type: 'abap.char', length: 4, isMandatory: true, semanticRole: 'ORG_UNIT', valueHelp: 'I_Plant' },
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
          { id: 'FLD-CMP-MAT', name: 'ComponentMaterial', label: 'Part Material', abapType: 'CHAR', type: 'abap.char', length: 40, isMandatory: true, semanticRole: 'PRODUCT_ID', valueHelp: 'I_Material' },
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
        cardinality: '[0..*]',
        mapping: [{ sourceField: 'OrderUUID', targetField: 'OrderUUID' }],
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
  // 8. FINANCIAL ACCOUNTING & CONTROLLING ARCHETYPE (FB50, F-53, FI, etc.)
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
        sourceType: 'DISCOVERY_ASSESSMENT',
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
        sourceType: 'DISCOVERY_ASSESSMENT',
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
        sourceType: 'DISCOVERY_ASSESSMENT',
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
        sourceType: 'DISCOVERY_ASSESSMENT',
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
          { id: 'FLD-BUKRS', name: 'CompanyCode', label: 'Company Code', abapType: 'CHAR', type: 'abap.char', length: 4, isMandatory: true, semanticRole: 'ORG_UNIT', valueHelp: 'I_CompanyCode' },
          { id: 'FLD-GJAHR', name: 'FiscalYear', label: 'Fiscal Year', abapType: 'NUMC', type: 'abap.numc', length: 4, isMandatory: true, semanticRole: 'NUMBER' },
          { id: 'FLD-BELNR', name: 'AccountingDocument', label: 'Doc Number', abapType: 'CHAR', type: 'abap.char', length: 10, isMandatory: true, semanticRole: 'BUSINESS_KEY' },
          { id: 'FLD-BLART', name: 'DocumentType', label: 'Document Type', abapType: 'CHAR', type: 'abap.char', length: 2, isMandatory: true, semanticRole: 'GENERAL' },
          { id: 'FLD-BLDAT', name: 'DocumentDate', label: 'Document Date', abapType: 'DATS', type: 'abap.dats', isMandatory: true, semanticRole: 'DATE' },
          { id: 'FLD-BUDAT', name: 'PostingDate', label: 'Posting Date', abapType: 'DATS', type: 'abap.dats', isMandatory: true, semanticRole: 'DATE' },
          { id: 'FLD-STATUS', name: 'DocumentStatus', label: 'Status', abapType: 'CHAR', type: 'abap.char', length: 10, semanticRole: 'STATUS' },
          { id: 'FLD-AMT', name: 'TotalAmount', label: 'Total Amount', abapType: 'CURR', type: 'abap.curr', length: 15, precision: 15, scale: 2, cukyField: 'Currency', semanticRole: 'AMOUNT' },
          { id: 'FLD-CUKY', name: 'Currency', label: 'Currency', abapType: 'CUKY', type: 'abap.cuky', length: 5, isMandatory: true, semanticRole: 'CURRENCY_CODE', valueHelp: 'I_Currency' },
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
          { id: 'FLD-LIN-HKONT', name: 'GLAccount', label: 'G/L Account', abapType: 'CHAR', type: 'abap.char', length: 10, isMandatory: true, semanticRole: 'GENERAL', valueHelp: 'I_GLAccount' },
          { id: 'FLD-LIN-SHKZG', name: 'DebitCreditCode', label: 'Debit/Credit (S/H)', abapType: 'CHAR', type: 'abap.char', length: 1, isMandatory: true, semanticRole: 'GENERAL' },
          { id: 'FLD-LIN-DMBTR', name: 'Amount', label: 'Item Amount', abapType: 'CURR', type: 'abap.curr', length: 15, precision: 15, scale: 2, cukyField: 'Currency', semanticRole: 'AMOUNT' },
          { id: 'FLD-LIN-CUKY', name: 'Currency', label: 'Currency', abapType: 'CUKY', type: 'abap.cuky', length: 5, semanticRole: 'CURRENCY_CODE', valueHelp: 'I_Currency' },
          { id: 'FLD-LIN-KOSTL', name: 'CostCenter', label: 'Cost Center', abapType: 'CHAR', type: 'abap.char', length: 10, semanticRole: 'ORG_UNIT', valueHelp: 'I_CostCenter' },
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
        cardinality: '[0..*]',
        mapping: [{ sourceField: 'DocumentUUID', targetField: 'DocumentUUID' }],
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
  // 9. SALES & DISTRIBUTION ARCHETYPE (VA01, SD, etc.)
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
        sourceType: 'DISCOVERY_ASSESSMENT',
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
        sourceType: 'DISCOVERY_ASSESSMENT',
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
        sourceType: 'DISCOVERY_ASSESSMENT',
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
        sourceType: 'DISCOVERY_ASSESSMENT',
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
          { id: 'FLD-KUNNR', name: 'SoldToParty', label: 'Customer Account', abapType: 'CHAR', type: 'abap.char', length: 10, isMandatory: true, semanticRole: 'BUSINESS_PARTNER', valueHelp: 'I_Customer' },
          { id: 'FLD-NAME', name: 'CustomerName', label: 'Customer Name', abapType: 'CHAR', type: 'abap.char', length: 80, semanticRole: 'TEXT' },
          { id: 'FLD-DATE', name: 'DocumentDate', label: 'Order Date', abapType: 'DATS', type: 'abap.dats', isMandatory: true, semanticRole: 'DATE' },
          { id: 'FLD-DELDATE', name: 'RequestedDeliveryDate', label: 'Delivery Date', abapType: 'DATS', type: 'abap.dats', semanticRole: 'DATE' },
          { id: 'FLD-STATUS', name: 'OverallStatus', label: 'Status', abapType: 'CHAR', type: 'abap.char', length: 12, semanticRole: 'STATUS' },
          { id: 'FLD-AMT', name: 'TotalNetAmount', label: 'Total Net Value', abapType: 'CURR', type: 'abap.curr', length: 15, precision: 15, scale: 2, cukyField: 'Currency', semanticRole: 'AMOUNT' },
          { id: 'FLD-CUKY', name: 'Currency', label: 'Currency', abapType: 'CUKY', type: 'abap.cuky', length: 5, isMandatory: true, semanticRole: 'CURRENCY_CODE', valueHelp: 'I_Currency' },
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
          { id: 'FLD-ITM-MAT', name: 'Material', label: 'Material Number', abapType: 'CHAR', type: 'abap.char', length: 40, isMandatory: true, semanticRole: 'PRODUCT_ID', valueHelp: 'I_Material' },
          { id: 'FLD-ITM-DESC', name: 'MaterialDescription', label: 'Description', abapType: 'CHAR', type: 'abap.char', length: 80, semanticRole: 'TEXT' },
          { id: 'FLD-ITM-QTY', name: 'OrderQuantity', label: 'Quantity', abapType: 'QUAN', type: 'abap.quan', length: 13, precision: 13, scale: 3, unitField: 'OrderQuantityUnit', semanticRole: 'QUANTITY' },
          { id: 'FLD-ITM-UNIT', name: 'OrderQuantityUnit', label: 'Unit', abapType: 'UNIT', type: 'abap.unit', length: 3, isMandatory: true, semanticRole: 'UNIT_OF_MEASURE' },
          { id: 'FLD-ITM-PRICE', name: 'NetPrice', label: 'Net Unit Price', abapType: 'CURR', type: 'abap.curr', length: 11, precision: 11, scale: 2, cukyField: 'Currency', semanticRole: 'AMOUNT' },
          { id: 'FLD-ITM-TOT', name: 'ItemNetAmount', label: 'Item Total', abapType: 'CURR', type: 'abap.curr', length: 15, precision: 15, scale: 2, cukyField: 'Currency', semanticRole: 'AMOUNT' },
          { id: 'FLD-ITM-CUKY', name: 'Currency', label: 'Currency', abapType: 'CUKY', type: 'abap.cuky', length: 5, semanticRole: 'CURRENCY_CODE', valueHelp: 'I_Currency' },
          { id: 'FLD-ITM-PLANT', name: 'Plant', label: 'Delivering Plant', abapType: 'CHAR', type: 'abap.char', length: 4, semanticRole: 'ORG_UNIT', valueHelp: 'I_Plant' }
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
        cardinality: '[0..*]',
        mapping: [{ sourceField: 'SalesOrderUUID', targetField: 'SalesOrderUUID' }],
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
  // 10. UNIVERSAL CUSTOM BUSINESS OBJECT (Z* / Y* or any other transaction)
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
        sourceType: 'DISCOVERY_ASSESSMENT',
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
        sourceType: 'DISCOVERY_ASSESSMENT',
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
        sourceType: 'DISCOVERY_ASSESSMENT',
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
        sourceType: 'DISCOVERY_ASSESSMENT',
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
          { id: 'FLD-CUKY', name: 'Currency', label: 'Currency', abapType: 'CUKY', type: 'abap.cuky', length: 5, isMandatory: true, semanticRole: 'CURRENCY_CODE', valueHelp: 'I_Currency' },
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
          { id: 'FLD-ITM-CUKY', name: 'Currency', label: 'Currency', abapType: 'CUKY', type: 'abap.cuky', length: 5, semanticRole: 'CURRENCY_CODE', valueHelp: 'I_Currency' }
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
        cardinality: '[0..*]',
        mapping: [{ sourceField: 'DocumentUUID', targetField: 'DocumentUUID' }],
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
