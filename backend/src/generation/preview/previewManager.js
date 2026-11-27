/**
 * Fiorify — GEN-07: Preview Manager
 *
 * Coordinates lifecycle management, synthetic data generation, port allocation,
 * and session state for isolated in-process mock preview servers.
 */

import { verifyAdminAccess, validateProjectId, isSafePort } from './previewSecurity.js';
import { defaultPreviewSessionStore } from './previewSessionStore.js';
import { startMockODataServer } from './mockODataServer.js';
import { defaultGenerationProjectStore } from '../projects/generationProjectStore.js';
import { defaultArchitectureDecisionEngine } from '../architecture/architectureDecisionEngine.js';

export class PreviewManager {
  constructor(projectStore = defaultGenerationProjectStore, sessionStore = defaultPreviewSessionStore) {
    this.projectStore = projectStore;
    this.sessionStore = sessionStore;
  }

  /**
   * Generates realistic, fictional synthetic mock records based on entity definitions.
   *
   * @param {Object} project - The GenerationProject record
   * @returns {Object} { [entityName]: Array<Object> }
   */
  generateSyntheticRecords(project) {
    const syntheticStore = {};
    const entities = project.dataModelSpec?.entities || [];
    const rootEntity = entities.find((e) => e.entityType === 'ROOT' || e.isRoot) || entities[0];
    if (!rootEntity) return syntheticStore;

    // Generate root entities first
    const rootRecords = [];
    const rootKeyField = (rootEntity.fields || []).find((f) => f.isKey) || { name: 'ID' };
    const rootBizKeyField = (rootEntity.fields || []).find((f) => f.semanticRole === 'BUSINESS_KEY');

    for (let i = 1; i <= 5; i++) {
      const record = {};
      for (const f of rootEntity.fields || []) {
        record[f.name] = this._generateSyntheticFieldValue(f, i, rootEntity, null, null);
      }
      const now = new Date().toISOString();
      record.CreatedBy = 'MOCK_ADMIN';
      record.CreatedAt = now;
      record.LastChangedBy = 'MOCK_ADMIN';
      record.LastChangedAt = now;
      record.LocalLastChangedAt = now;
      rootRecords.push(record);
    }
    syntheticStore[rootEntity.name] = rootRecords;

    // Generate child entities linked to parent records
    const childEntities = entities.filter((e) => e.entityId !== rootEntity.entityId);
    for (const child of childEntities) {
      const childRecords = [];
      const parentKeyField = (child.fields || []).find((f) => f.semanticRole === 'PARENT_KEY');
      let itemSeq = 1;

      for (let pIdx = 0; pIdx < rootRecords.length; pIdx++) {
        const parentRec = rootRecords[pIdx];
        const parentKeyValue = parentRec[rootKeyField.name];

        // 2 items per parent
        for (let itemIdx = 1; itemIdx <= 2; itemIdx++) {
          const childRec = {};
          for (const f of child.fields || []) {
            if (f.semanticRole === 'PARENT_KEY' || (parentKeyField && f.name === parentKeyField.name)) {
              childRec[f.name] = parentKeyValue;
            } else {
              childRec[f.name] = this._generateSyntheticFieldValue(f, itemSeq, child, rootEntity, parentRec);
            }
          }
          const numField = child.fields.find((f) => f.semanticRole === 'ITEM_NUMBER');
          if (numField && childRec[numField.name] !== undefined) {
            childRec[numField.name] = String(itemIdx * 10).padStart(numField.length || 3, '0');
          }

          // Balance debit / credit for Finance line items:
          // Item 10: Debit 'S' 1000 EUR
          // Item 20: Credit 'H' 1000 EUR
          if (childRec.DebitCreditCode) {
            childRec.DebitCreditCode = itemIdx === 1 ? 'S' : 'H';
            childRec.Amount = 1000.00;
          }

          const now = new Date().toISOString();
          childRec.CreatedBy = 'MOCK_ADMIN';
          childRec.CreatedAt = now;
          childRec.LastChangedBy = 'MOCK_ADMIN';
          childRec.LastChangedAt = now;
          childRec.LocalLastChangedAt = now;
          childRecords.push(childRec);
          itemSeq++;
        }
      }
      syntheticStore[child.name] = childRecords;
    }

    return syntheticStore;
  }

  _generateSyntheticFieldValue(field, index, entity, rootEntity, parentRecord = null) {
    const nameLower = field.name.toLowerCase();

    // Primary or semantic key
    if (field.isKey) {
      if (field.semanticRole === 'PARENT_KEY' && parentRecord && rootEntity) {
        const parentKeyField = (rootEntity.fields || []).find((f) => f.isKey);
        return parentRecord[parentKeyField?.name] || `KEY-${1000 + index}`;
      }
      return `MOCK-${1000 + index}`;
    }

    // SAP Business Keys
    if (nameLower === 'purchaseorder' || nameLower === 'ebeln') {
      return `450001${String(index).padStart(4, '0')}`;
    }
    if (nameLower === 'salesorder' || nameLower === 'vbeln') {
      return `000001${String(index).padStart(4, '0')}`;
    }
    if (nameLower === 'productionorder' || (nameLower === 'ordernumber' && entity?.name?.toLowerCase().includes('order') && !nameLower.includes('maint'))) {
      return `00010000${String(index).padStart(4, '0')}`;
    }
    if (nameLower === 'accountingdocument' || nameLower === 'belnr') {
      return `100000${String(index).padStart(4, '0')}`;
    }
    if (nameLower === 'inspectionlot' || nameLower === 'prueflos') {
      return `010000000${String(index).padStart(3, '0')}`;
    }
    if (nameLower === 'ordernumber' || nameLower === 'aufnr') {
      return `400000000${String(index).padStart(3, '0')}`;
    }
    if (nameLower === 'transferorder' || nameLower === 'tanum') {
      return `00000189${String(index).padStart(2, '0')}`;
    }
    if (nameLower === 'personnelnumber' || nameLower === 'pernr') {
      return `001004${String(index).padStart(2, '0')}`;
    }

    // Amounts & Currencies
    if (field.semanticRole === 'AMOUNT' || field.type === 'abap.curr' || nameLower.includes('amount') || nameLower.includes('price') || nameLower.includes('cost')) {
      return parseFloat((index * 1250.50).toFixed(2));
    }
    if (field.semanticRole === 'CURRENCY_CODE' || field.type === 'abap.cuky' || nameLower.includes('currency')) {
      const currencies = ['EUR', 'USD', 'GBP', 'CHF'];
      return currencies[index % currencies.length];
    }

    // Quantities & Units
    if (field.semanticRole === 'QUANTITY' || field.type === 'abap.quan' || nameLower.includes('quantity') || nameLower.includes('hours') || nameLower.includes('work')) {
      if (nameLower.includes('hour') || nameLower.includes('work')) return 8.0;
      return index * 10;
    }
    if (field.type === 'abap.unit' || nameLower.includes('unit')) {
      if (nameLower.includes('hour') || nameLower.includes('arbeh')) return 'H';
      return 'EA';
    }

    // Organization Units
    if (nameLower.includes('companycode') || nameLower.includes('bukrs')) {
      return '1000';
    }
    if (nameLower.includes('plant') || nameLower.includes('werks')) {
      return '1010';
    }
    if (nameLower.includes('workcenter') || nameLower.includes('arbpl')) {
      const centers = ['MECH_01', 'ELEC_02', 'ASSM_03', 'LINE_04'];
      return centers[index % centers.length];
    }
    if (nameLower.includes('warehousenumber') || nameLower.includes('lgnum')) {
      return 'W01';
    }
    if (nameLower.includes('storagebin') || nameLower.includes('vlpla') || nameLower.includes('nlpla')) {
      return `BIN-0${(index % 4) + 1}-A-${String(index * 2).padStart(2, '0')}`;
    }
    if (nameLower.includes('storagetype') || nameLower.includes('vltyp') || nameLower.includes('nltyp')) {
      return index % 2 === 0 ? '001' : '002';
    }
    if (nameLower.includes('salesorganization') || nameLower.includes('vkorg')) {
      return '1000';
    }
    if (nameLower.includes('distributionchannel') || nameLower.includes('vtweg')) {
      return '10';
    }
    if (nameLower.includes('purchasingorg') || nameLower.includes('ekorg')) {
      return '1000';
    }
    if (nameLower.includes('purchasinggroup') || nameLower.includes('ekgrp')) {
      return '001';
    }

    // Master Data: Equipment & Functional Locations
    if (nameLower.includes('equipment') || nameLower.includes('equnr')) {
      const equips = ['10002145', '10003890', '10004921', '10005510'];
      return equips[index % equips.length];
    }
    if (nameLower.includes('functionallocation') || nameLower.includes('tplnr')) {
      const floc = ['US01-PL01-BLD02', 'DE01-PL10-ENG01', 'FR02-PL05-LINE3'];
      return floc[index % floc.length];
    }

    // Supplier / Customer / Vendor / Employee
    if (nameLower.includes('supplier') || nameLower.includes('vendor') || nameLower.includes('lifnr')) {
      const supps = ['100001', '100002', '100003', '100004'];
      return supps[index % supps.length];
    }
    if (nameLower.includes('suppliername')) {
      const names = ['Acme Industrial Parts GmbH', 'Apex Logistics Corp', 'Titan Components SE', 'Precision Tools Ltd'];
      return names[index % names.length];
    }
    if (nameLower.includes('customer') || nameLower.includes('kunnr')) {
      const custs = ['0000010001', '0000010002', '0000010003'];
      return custs[index % custs.length];
    }
    if (nameLower.includes('customername')) {
      const names = ['Global Systems Inc.', 'Nordic Manufacturing AS', 'Bavaria Motors AG'];
      return names[index % names.length];
    }
    if (nameLower.includes('employeename') || nameLower.includes('ename') || nameLower.includes('requester')) {
      const names = ['Marcus Vance', 'Sarah Jenkins', 'David Mueller', 'Elena Rostova', 'Kenji Sato'];
      return names[index % names.length];
    }

    // Status / Code
    if (field.semanticRole === 'STATUS' || nameLower.includes('status')) {
      const statuses = ['APPROVED', 'PENDING_REVIEW', 'IN_PROCESS', 'DRAFT'];
      return statuses[index % statuses.length];
    }
    if (nameLower.includes('usagedecision')) {
      return index % 3 === 0 ? 'R' : 'A'; // A = Accepted, R = Rejected
    }

    // Dates & Times
    if (field.type === 'abap.dats' || nameLower.includes('date')) {
      return new Date(Date.now() - (index - 1) * 86400000).toISOString().split('T')[0];
    }
    if (field.type === 'abap.tims' || nameLower.includes('time')) {
      const hours = String((10 + index) % 24).padStart(2, '0');
      const mins = String((index * 13) % 60).padStart(2, '0');
      return `${hours}:${mins}:00`;
    }

    // Diagnostics & Basis (ST22 / Logs)
    if (nameLower.includes('runtimeerror') || nameLower.includes('errorcode')) {
      const errs = ['TSV_TNEW_PAGE_ALLOC_FAILED', 'CX_SY_OPEN_SQL_ERROR', 'TIME_OUT', 'DYNPRO_NOT_FOUND', 'MESSAGE_TYPE_X'];
      return errs[index % errs.length];
    }
    if (nameLower.includes('exceptionclass')) {
      const ex = ['CX_SY_SQL_ERROR', 'CX_SY_ARITHMETIC_OVERFLOW', 'CX_SY_REF_IS_INITIAL', 'CX_ROOT', 'CX_SY_NO_HANDLER'];
      return ex[index % ex.length];
    }
    if (nameLower.includes('programname') || nameLower.includes('repid')) {
      const progs = ['SAPMS380', 'SAPLMEGUI', 'SAPMV45A', 'SAPF110V', 'ZCUSTOM_BATCH_PRC'];
      return progs[index % progs.length];
    }
    if (nameLower.includes('username') || nameLower.includes('uname')) {
      const users = ['BCUSER', 'DEVELOPER01', 'SAP_BATCH', 'FIN_ANALYST', 'PURCH_LEAD'];
      return users[index % users.length];
    }
    if (nameLower.includes('client') && field.length === 3) {
      return '200';
    }
    if (nameLower.includes('servername') || nameLower.includes('server')) {
      return `s21app0${(index % 2) + 1}_S21_00`;
    }
    if (nameLower.includes('shorttext') || nameLower.includes('errortext')) {
      const texts = [
        'Memory allocation error while fetching records',
        'Open SQL statement threw an unexpected database exception',
        'Maximum runtime of work process exceeded',
        'Screen layout 0100 not found in program buffer',
        'Critical runtime message type X triggered by SAP core'
      ];
      return texts[index % texts.length];
    }

    // Materials Management & Sales (MM & SD)
    if (nameLower.includes('material') && !nameLower.includes('desc')) {
      const mats = ['DXTR1000', 'EPAD1000', 'RAW_MAT_42', 'FG_PACK_01', 'CMP_MOTOR_99'];
      return mats[index % mats.length];
    }
    if (nameLower.includes('materialdescription') || (nameLower.includes('description') && entity?.name?.toLowerCase().includes('item'))) {
      const descs = ['Deluxe Touring Bicycle', 'Electronic Control Unit', 'Raw Casting Alloy', 'Protective Packaging Casing', 'Heavy Duty Stepper Motor'];
      return descs[index % descs.length];
    }

    // Finance (FI)
    if (nameLower.includes('glaccount') || nameLower.includes('hkont')) {
      const gls = ['0000113100', '0000400000', '0000600000', '0000211000', '0000160000'];
      return gls[index % gls.length];
    }
    if (nameLower.includes('debitcredit') || nameLower.includes('shkzg')) {
      return index % 2 === 0 ? 'S' : 'H';
    }
    if (nameLower.includes('fiscalyear') || nameLower.includes('gjahr')) {
      return '2026';
    }
    if (nameLower.includes('documenttype') || nameLower.includes('blart')) {
      return 'SA';
    }

    // Quality Management Characteristics
    if (nameLower.includes('characteristictxt') || nameLower.includes('specification')) {
      const specs = ['Diameter Outer Tolerance', 'Tensile Strength ISO', 'Surface Roughness Ra', 'Chemical Purity Index'];
      return specs[index % specs.length];
    }
    if (nameLower.includes('targetvalue')) return 25.000;
    if (nameLower.includes('lowerlimit')) return 24.850;
    if (nameLower.includes('upperlimit')) return 25.150;
    if (nameLower.includes('recordedresult')) return (25.020 + (index * 0.01));

    // Default string
    return `Mock ${field.label || field.name} ${index}`;
  }

  /**
   * Starts a local mock OData preview session.
   */
  async startPreview(projectId, options = {}, userContext = null) {
    if (options && (options.role || options.id || options.tenantId) && !userContext) {
      userContext = options;
      options = {};
    }
    verifyAdminAccess(userContext);
    const cleanId = validateProjectId(projectId);

    const project = await this.projectStore.getProject(cleanId, userContext);
    if (!project) {
      const err = new Error(`Project "${cleanId}" not found.`);
      err.code = 'NOT_FOUND';
      err.statusCode = 404;
      throw err;
    }

    // Check if session is already running
    let existingSession = this.sessionStore.getSession(cleanId);
    if (existingSession && existingSession.status === 'RUNNING') {
      return {
        success: true,
        session: {
          projectId: cleanId,
          port: existingSession.port,
          url: existingSession.url,
          status: 'RUNNING',
          startedAt: existingSession.startedAt
        },
        message: 'Preview server is already running.'
      };
    }

    // Ensure architecture spec is evaluated
    let architecture = project.architectureSpec;
    if (!architecture || !architecture.selectedProfile) {
      architecture = defaultArchitectureDecisionEngine.evaluate(project);
      project.architectureSpec = architecture;
    }

    // Initialize or load synthetic data
    const syntheticStore = this.generateSyntheticRecords(project);

    // Allocate safe port (4050-4099), retrying on EADDRINUSE so concurrent processes never collide
    const attemptedPorts = [];
    let port = null;
    let server = null;
    let lastErr = null;

    for (let attempt = 0; attempt < 20; attempt++) {
      const candidatePort = this.sessionStore.allocatePort();
      try {
        server = await startMockODataServer(project, architecture, candidatePort, syntheticStore);
        port = candidatePort;
        break;
      } catch (err) {
        lastErr = err;
        if (err && err.code === 'EADDRINUSE') {
          attemptedPorts.push(candidatePort);
          continue;
        }
        this.sessionStore.releasePort(candidatePort);
        attemptedPorts.forEach((p) => this.sessionStore.releasePort(p));
        throw err;
      }
    }

    // Release ports that were occupied by external processes only after binding succeeded
    attemptedPorts.forEach((p) => this.sessionStore.releasePort(p));

    if (!server || port === null) {
      throw lastErr || new Error('Failed to bind any available preview port in 4050-4099.');
    }

    try {
      const session = this.sessionStore.setSession(cleanId, {
        port,
        server,
        syntheticStore
      });

      const relativePreviewUrl = `/api/v1/generation/projects/${cleanId}/preview/content/webapp/index.html`;
      const sessionInfo = {
        sessionId: `PREV-${cleanId}-${port}`,
        projectId: cleanId,
        port: session.port,
        host: '127.0.0.1',
        url: session.url,
        previewUrl: relativePreviewUrl,
        directUrl: `${session.url}/webapp/index.html`,
        serviceBasePath: `/api/v1/generation/projects/${cleanId}/preview/content/odata/v4/service`,
        metadataUrl: `/api/v1/generation/projects/${cleanId}/preview/content/odata/v4/service/$metadata`,
        status: 'RUNNING',
        startedAt: session.startedAt,
        recordCounts: Object.fromEntries(
          Object.entries(syntheticStore).map(([k, v]) => [k, v.length])
        )
      };

      return {
        success: true,
        session: sessionInfo,
        message: `Preview server started on ${session.url}`
      };
    } catch (err) {
      this.sessionStore.releasePort(port);
      throw err;
    }
  }

  /**
   * Stops an active preview session.
   */
  async stopPreview(projectId, userContext = null) {
    verifyAdminAccess(userContext);
    const cleanId = validateProjectId(projectId);

    const closed = this.sessionStore.closeSession(cleanId);
    return {
      success: true,
      projectId: cleanId,
      status: 'STOPPED',
      message: closed ? 'Preview server stopped successfully.' : 'Preview server was not running.'
    };
  }

  /**
   * Restarts an active preview session.
   */
  async restartPreview(projectId, options = {}, userContext = null) {
    if (options && (options.role || options.id || options.tenantId) && !userContext) {
      userContext = options;
      options = {};
    }
    verifyAdminAccess(userContext);
    const cleanId = validateProjectId(projectId);

    await this.stopPreview(cleanId, userContext);
    return this.startPreview(cleanId, options, userContext);
  }

  /**
   * Retrieves the current preview status and telemetry for a project.
   */
  async getPreviewStatus(projectId, userContext = null) {
    verifyAdminAccess(userContext);
    const cleanId = validateProjectId(projectId);

    const session = this.sessionStore.getSession(cleanId);
    if (!session) {
      return {
        projectId: cleanId,
        status: 'STOPPED',
        url: null,
        port: null,
        activeRequests: 0,
        errorCount: 0
      };
    }

    const relativePreviewUrl = `/api/v1/generation/projects/${cleanId}/preview/content/webapp/index.html`;
    return {
      sessionId: `PREV-${cleanId}-${session.port}`,
      projectId: cleanId,
      status: session.status,
      host: '127.0.0.1',
      url: session.url,
      previewUrl: relativePreviewUrl,
      directUrl: `${session.url}/webapp/index.html`,
      serviceBasePath: `/api/v1/generation/projects/${cleanId}/preview/content/odata/v4/service`,
      metadataUrl: `/api/v1/generation/projects/${cleanId}/preview/content/odata/v4/service/$metadata`,
      port: session.port,
      startedAt: session.startedAt,
      lastActivityAt: session.lastActivityAt,
      totalRequests: session.requestsLog.length,
      errorCount: session.errorCount,
      recordCounts: Object.fromEntries(
        Object.entries(session.syntheticStore).map(([k, v]) => [k, v.length])
      )
    };
  }

  /**
   * Retrieves recent request telemetry logs from the preview server.
   */
  async getPreviewRequests(projectId, userContext = null) {
    verifyAdminAccess(userContext);
    const cleanId = validateProjectId(projectId);

    const session = this.sessionStore.getSession(cleanId);
    return {
      projectId: cleanId,
      requests: session ? session.requestsLog : []
    };
  }

  /**
   * Resets the synthetic mock records for a project.
   */
  async resetSyntheticData(projectId, userContext = null) {
    verifyAdminAccess(userContext);
    const cleanId = validateProjectId(projectId);

    const project = await this.projectStore.getProject(cleanId, userContext);
    if (!project) {
      const err = new Error(`Project "${cleanId}" not found.`);
      err.code = 'NOT_FOUND';
      err.statusCode = 404;
      throw err;
    }

    const session = this.sessionStore.getSession(cleanId);
    const freshData = this.generateSyntheticRecords(project);

    if (session) {
      session.syntheticStore = freshData;
    }

    return {
      success: true,
      projectId: cleanId,
      recordCounts: Object.fromEntries(
        Object.entries(freshData).map(([k, v]) => [k, v.length])
      ),
      message: 'Synthetic mock records reset to initial baseline.'
    };
  }
}

export const defaultPreviewManager = new PreviewManager();
