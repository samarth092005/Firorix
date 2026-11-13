/**
 * FioriX — GEN-07: Preview Manager
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

    for (const ent of entities) {
      const isRoot = ent.entityId === rootEntity?.entityId;
      const count = isRoot ? 5 : 12; // 5 headers, 12 items
      const records = [];

      for (let i = 1; i <= count; i++) {
        const record = {};
        for (const f of ent.fields || []) {
          record[f.name] = this._generateSyntheticFieldValue(f, i, ent, rootEntity);
        }

        // Administrative audit fields
        const now = new Date().toISOString();
        record.CreatedBy = 'MOCK_ADMIN';
        record.CreatedAt = now;
        record.LastChangedBy = 'MOCK_ADMIN';
        record.LastChangedAt = now;
        record.LocalLastChangedAt = now;

        records.push(record);
      }

      syntheticStore[ent.name] = records;
    }

    return syntheticStore;
  }

  _generateSyntheticFieldValue(field, index, entity, rootEntity) {
    const nameLower = field.name.toLowerCase();

    // Primary or semantic key
    if (field.isKey) {
      if (field.semanticRole === 'PARENT_KEY' && rootEntity) {
        // Child matching parent key
        const parentKeyField = (rootEntity.fields || []).find((f) => f.isKey);
        const parentIndex = Math.ceil(index / 3); // 3 items per parent
        return `MOCK-${1000 + parentIndex}`;
      }
      return `MOCK-${1000 + index}`;
    }

    // Amounts & Currencies
    if (field.semanticRole === 'AMOUNT' || field.type === 'abap.curr' || nameLower.includes('amount') || nameLower.includes('price')) {
      return parseFloat((index * 1250.50).toFixed(2));
    }
    if (field.semanticRole === 'CURRENCY_CODE' || field.type === 'abap.cuky' || nameLower.includes('currency')) {
      const currencies = ['EUR', 'USD', 'GBP', 'CHF'];
      return currencies[index % currencies.length];
    }

    // Quantities & Units
    if (field.semanticRole === 'QUANTITY' || field.type === 'abap.quan' || nameLower.includes('quantity')) {
      return index * 10;
    }
    if (field.type === 'abap.unit' || nameLower.includes('unit')) {
      return 'EA';
    }

    // Company Code / Plant
    if (nameLower.includes('companycode') || nameLower.includes('bukrs')) {
      return '1000';
    }
    if (nameLower.includes('plant') || nameLower.includes('werks')) {
      return '1010';
    }

    // Supplier / Customer / Vendor
    if (nameLower.includes('supplier') || nameLower.includes('vendor') || nameLower.includes('lifnr')) {
      return `MOCK-SUPP-0${(index % 4) + 1}`;
    }
    if (nameLower.includes('customer') || nameLower.includes('kunnr')) {
      return `MOCK-CUST-0${(index % 4) + 1}`;
    }

    // Status / Code
    if (field.semanticRole === 'STATUS' || nameLower.includes('status')) {
      const statuses = ['APPROVED', 'PENDING_REVIEW', 'IN_PROCESS', 'DRAFT'];
      return statuses[index % statuses.length];
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

    // Allocate safe port (4050-4099)
    const port = this.sessionStore.allocatePort();

    // Initialize or load synthetic data
    const syntheticStore = this.generateSyntheticRecords(project);

    try {
      const server = await startMockODataServer(project, architecture, port, syntheticStore);
      const session = this.sessionStore.setSession(cleanId, {
        port,
        server,
        syntheticStore
      });

      const sessionInfo = {
        sessionId: `PREV-${cleanId}-${port}`,
        projectId: cleanId,
        port: session.port,
        host: '127.0.0.1',
        url: session.url,
        previewUrl: `${session.url}/webapp/index.html`,
        serviceBasePath: `${session.url}/odata/v4/service`,
        metadataUrl: `${session.url}/odata/v4/service/$metadata`,
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

    return {
      sessionId: `PREV-${cleanId}-${session.port}`,
      projectId: cleanId,
      status: session.status,
      host: '127.0.0.1',
      url: session.url,
      previewUrl: `${session.url}/webapp/index.html`,
      serviceBasePath: `${session.url}/odata/v4/service`,
      metadataUrl: `${session.url}/odata/v4/service/$metadata`,
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
