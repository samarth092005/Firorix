/**
 * Fiorify — Generation Handoff Persistence Store (MW-03)
 *
 * Implements server-side authoritative persistence for Generation Studio handoffs.
 * Ensures project context survives page refreshes, enforces Clean Core standard-first guardrails,
 * and maintains atomic, serialized file and PostgreSQL storage.
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { defaultAssessmentStore, LIFECYCLE_STATES } from './assessmentStore.js';
import { STANDARD_TRANSACTION_CATALOG } from './standardTransactionKnowledge.js';
import { authService, USER_ROLES, PERMISSIONS } from './authService.js';
import { GenerationHandoffRepository } from '../infrastructure/db/repositories/generationHandoffRepository.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_STORAGE_PATH = path.resolve(__dirname, '../../data/generationHandoffs.json');

export class GenerationHandoffStore {
  constructor(storagePath = DEFAULT_STORAGE_PATH, assessmentStore = defaultAssessmentStore, options = {}) {
    if (typeof storagePath === 'object' && storagePath !== null && !options.assessmentStore && !(storagePath instanceof String)) {
      options = storagePath;
      storagePath = options.storagePath || DEFAULT_STORAGE_PATH;
      assessmentStore = options.assessmentStore || defaultAssessmentStore;
    }
    this.storagePath = typeof storagePath === 'string' ? storagePath : DEFAULT_STORAGE_PATH;
    this.assessmentStore = assessmentStore;
    this._handoffs = new Map();
    this._writeLock = Promise.resolve();
    this._isLoaded = false;
    this.tenantId = options.tenantId || 'DEFAULT-TENANT-S21';

    const persistenceEnv = (process.env.FIORIFY_PERSISTENCE || process.env.Fiorify_PERSISTENCE || process.env.FIORIX_PERSISTENCE || '').toLowerCase();
    this.useDatabase = options.useDatabase !== undefined ? options.useDatabase : (persistenceEnv === 'postgres');
    this.repository = options.repository || (this.useDatabase ? new GenerationHandoffRepository() : null);
  }

  async _withWriteLock(operation) {
    const nextLock = this._writeLock.then(async () => {
      return await operation();
    });
    this._writeLock = nextLock.catch(() => {});
    return nextLock;
  }

  async _ensureLoaded() {
    if (this._isLoaded) return;
    try {
      if (this.storagePath && fs.existsSync(this.storagePath)) {
        const raw = await fs.promises.readFile(this.storagePath, 'utf8');
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          this._handoffs.clear();
          for (const item of parsed) {
            if (item && item.handoffId) {
              this._handoffs.set(item.handoffId, item);
            }
          }
        }
      }
    } catch (err) {
      console.warn('[GenerationHandoffStore] Warning reading storage file:', err.message);
    }
    this._isLoaded = true;
  }

  async _persist() {
    if (!this.storagePath) return;
    const dir = path.dirname(this.storagePath);
    if (!fs.existsSync(dir)) {
      await fs.promises.mkdir(dir, { recursive: true });
    }
    const all = Array.from(this._handoffs.values());
    const json = JSON.stringify(all, null, 2);

    if (fs.existsSync(this.storagePath)) {
      try {
        await fs.promises.copyFile(this.storagePath, `${this.storagePath}.bak`);
      } catch {
        // Non-fatal backup
      }
    }

    const tempPath = `${this.storagePath}.${Date.now()}.${Math.random().toString(36).slice(2)}.tmp`;
    try {
      await fs.promises.writeFile(tempPath, json, 'utf8');
      await fs.promises.rename(tempPath, this.storagePath);
    } finally {
      if (fs.existsSync(tempPath)) {
        try {
          await fs.promises.unlink(tempPath);
        } catch {
          // ignore
        }
      }
    }
  }

  /**
   * Creates and persists a Generation Studio Handoff.
   * Validates assessment existence, Clean Core standard-first guardrails, and architect approval.
   */
  async createHandoff(payload = {}, userContext = null) {
    const assessmentId = payload.sourceAssessmentId || payload.assessmentId;
    if (!assessmentId) {
      const err = new Error('Source Assessment ID is required to initiate generation handoff.');
      err.code = 'VALIDATION_ERROR';
      throw err;
    }

    const assessment = await this.assessmentStore.getById(assessmentId);
    if (!assessment) {
      const err = new Error(`Assessment with ID "${assessmentId}" does not exist.`);
      err.code = 'NOT_FOUND';
      throw err;
    }

    // Check Clean Core guardrail:
    const hasStandardCandidate = Boolean(
      (assessment.matchingFioriApp && assessment.matchingFioriApp.appId) ||
      (assessment.candidateApps && assessment.candidateApps.length > 0) ||
      assessment.fitGapScore >= 50
    );

    // 1. Cross-assessment approval check
    if (payload.leadArchitectApproval?.assessmentId && payload.leadArchitectApproval.assessmentId !== assessment.id) {
      const err = new Error(
        `Architectural Approval Mismatch: Provided approval is linked to assessment "${payload.leadArchitectApproval.assessmentId}", which does not match target assessment "${assessment.id}". Cross-assessment approval reuse is strictly prohibited.`
      );
      err.code = 'APPROVAL_ASSESSMENT_MISMATCH';
      throw err;
    }

    // 2. Explicit rejection check
    if (payload.architectApproved === false || payload.leadArchitectApproval?.approved === false) {
      const err = new Error(
        'Clean Core Guardrail Violation: Initiating custom Generation Studio build requires documented justification and Lead Enterprise Architect sign-off.'
      );
      err.code = 'UNAUTHORIZED_BUILD';
      throw err;
    }

    // 3. Approval Invalidation Check: If material requirements or evidence changed after approval was granted
    if (assessment.materialRequirementsChanged === true || assessment.evidenceModifiedAfterApproval === true) {
      const err = new Error(
        'Approval Invalidated: Material requirements or technical evidence changed after architect approval was granted. Fresh architect review and re-approval are required.'
      );
      err.code = 'APPROVAL_INVALIDATED';
      throw err;
    }

    const targetVersion = assessment.version !== undefined ? assessment.version : 1;

    // 4. Validate approval object (scope, version binding, expiration)
    const approvalObj = assessment.leadArchitectApproval || payload.leadArchitectApproval;
    if (approvalObj && approvalObj.approved === true) {
      if (approvalObj.assessmentId && approvalObj.assessmentId !== assessment.id) {
        const err = new Error(
          `Architectural Approval Mismatch: Provided approval is linked to assessment "${approvalObj.assessmentId}", which does not match target assessment "${assessment.id}". Cross-assessment approval reuse is strictly prohibited.`
        );
        err.code = 'APPROVAL_ASSESSMENT_MISMATCH';
        throw err;
      }

      const scope = String(approvalObj.scope || approvalObj.approvalScope || approvalObj.decision || 'BUILD').toUpperCase();
      if (!['BUILD', 'CUSTOM_DEVELOPMENT'].includes(scope)) {
        const err = new Error(
          `Invalid Approval Scope: Approval was scoped to "${scope}", not BUILD. Custom Generation Studio handoff requires explicit BUILD authorization.`
        );
        err.code = 'INVALID_APPROVAL_SCOPE';
        throw err;
      }

      if (approvalObj.assessmentVersion !== undefined && approvalObj.assessmentVersion !== targetVersion) {
        const err = new Error(
          `Approval Version Mismatch: Approval is bound to assessment version ${approvalObj.assessmentVersion}, but target assessment version is ${targetVersion}. Fresh architect approval required.`
        );
        err.code = 'APPROVAL_VERSION_MISMATCH';
        throw err;
      }

      if (approvalObj.expiresAt) {
        const expiresAt = new Date(approvalObj.expiresAt).getTime();
        if (!isNaN(expiresAt) && expiresAt < Date.now()) {
          const err = new Error(
            `Approval Expired: Architectural approval expired at ${approvalObj.expiresAt}. Fresh architect review required.`
          );
          err.code = 'APPROVAL_EXPIRED';
          throw err;
        }
      }
    }

    // Server-Authoritative Actor Authorization Check
    // Never trust client-provided author, architectName, or approvalObj.approver strings!
    const isActorAuthorizedArchitect = Boolean(
      userContext && !userContext.isUnauthenticated && (
        authService.canApproveBuild(userContext) ||
        userContext.role === USER_ROLES.LEAD_ARCHITECT ||
        userContext.role === 'CHIEF_ARCHITECT'
      )
    );

    const isAssessmentAuthoritativelyApproved = Boolean(
      assessment.lifecycleStatus === LIFECYCLE_STATES.APPROVED ||
      assessment.leadArchitectApproval?.approved === true ||
      assessment.approvalStatus === 'APPROVED' ||
      assessment.buildProject?.architectApproved === true
    );

    const isClientSuppliedApproval = Boolean(
      payload.architectApproved === true ||
      payload.leadArchitectApproval?.approved === true ||
      payload.approvalStatus === 'APPROVED'
    );

    // Reject client-supplied approval flags if actor is not an authorized architect
    if (isClientSuppliedApproval && !isAssessmentAuthoritativelyApproved && !isActorAuthorizedArchitect) {
      const err = new Error(
        'Unauthorized Approval: Client-supplied BUILD approval flags are rejected. User does not possess explicit BUILD_ARCHITECT_APPROVER authorization.'
      );
      err.code = 'UNAUTHORIZED_BUILD_APPROVER';
      throw err;
    }

    // Strict rule: BUILD handoff requires either an authoritatively approved assessment or an authorized architect actor
    const isArchitectApproved = isAssessmentAuthoritativelyApproved || (isClientSuppliedApproval && isActorAuthorizedArchitect);

    const justification = String(
      payload.cleanCoreJustification ||
      payload.justification ||
      payload.fitGapSummary?.justification ||
      ''
    ).trim();

    if (hasStandardCandidate && !isArchitectApproved) {
      const err = new Error(
        'Clean Core Guardrail Violation: Standard SAP Fiori candidates exist. Initiating custom Generation Studio build requires documented justification and Lead Enterprise Architect sign-off.'
      );
      err.code = 'UNAUTHORIZED_BUILD';
      throw err;
    }

    if (!isArchitectApproved) {
      const err = new Error(
        'Clean Core Guardrail Violation: Initiating custom Generation Studio build requires documented justification and Lead Enterprise Architect sign-off.'
      );
      err.code = 'UNAUTHORIZED_BUILD';
      throw err;
    }

    if (hasStandardCandidate && !justification) {
      const err = new Error(
        'Documented business justification is mandatory to build custom applications when standard Fiori candidates exist.'
      );
      err.code = 'VALIDATION_ERROR';
      throw err;
    }

    return await this._withWriteLock(async () => {
      await this._ensureLoaded();

      const now = new Date().toISOString();
      const handoffId = payload.handoffId || `HND-${Date.now()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;

      // Idempotency check: if exact handoff already exists by handoffId or by sourceAssessmentId, return it
      if (this._handoffs.has(handoffId)) {
        return this._handoffs.get(handoffId);
      }

      for (const existingHandoff of this._handoffs.values()) {
        if (existingHandoff.sourceAssessmentId === assessment.id) {
          return existingHandoff;
        }
      }

      // Authoritative actor identity resolution (never forge from client strings)
      const actorName = (userContext && !userContext.isUnauthenticated && (userContext.name || userContext.id))
        ? (userContext.name || userContext.id)
        : (isAssessmentAuthoritativelyApproved ? (assessment.leadArchitectApproval?.approver || assessment.governanceReview?.approvedByName || 'Authorized Lead Architect') : 'Authorized Lead Architect');
      const actorId = (userContext && !userContext.isUnauthenticated && userContext.id)
        ? userContext.id
        : (isAssessmentAuthoritativelyApproved ? (assessment.leadArchitectApproval?.approverId || assessment.governanceReview?.approvedBy || 'USR-ARCH-01') : 'USR-ARCH-01');

      const handoffRecord = {
        handoffId,
        sourceAssessmentId: assessment.id,
        tcode: assessment.tcode,
        transactionDescription: (
          (payload.transactionDescription && !payload.transactionDescription.startsWith('Assessment for '))
            ? payload.transactionDescription
            : (assessment.description && !assessment.description.startsWith('Assessment for '))
            ? assessment.description
            : STANDARD_TRANSACTION_CATALOG[assessment.tcode]?.description || `Transaction ${assessment.tcode}`
        ),
        targetRelease: payload.targetRelease || assessment.targetRelease || 'SAP S/4HANA 2023 Private Edition',
        systemId: payload.systemId || assessment.systemId || 'S21',
        client: payload.client || assessment.client || '200',
        programName: payload.programName || assessment.programName || 'SAPMF05A',
        packageName: payload.packageName || assessment.packageName || 'FBAS',
        classification: payload.classification || assessment.classification || 'STANDARD',
        currentStage: 'DRAFT', // Mandatory initial stage for Generation Studio project
        proposedAppType: payload.proposedAppType || 'RAP_MANAGED',
        approvalStatus: isArchitectApproved ? 'APPROVED' : 'PENDING_APPROVAL',
        leadArchitectApproval: {
          approved: isArchitectApproved,
          approver: actorName,
          approverId: actorId,
          approvedAt: now,
          timestamp: now,
          scope: 'BUILD',
          assessmentId: assessment.id,
          assessmentVersion: targetVersion,
          justification: justification || 'Custom RAP Managed Application approved by Lead Architect.'
        },
        cleanCoreJustification: justification,
        businessRequirements: payload.businessRequirements || {
          process: assessment.businessArea || 'Core Business Process',
          scenario: assessment.subArea || 'Standard Workflow',
          requiredCapabilities: assessment.verifiedCapabilities || ['Data Processing', 'Standard Posting']
        },
        identifiedGaps: payload.identifiedGaps || payload.fitGapSummary?.identifiedGaps || [
          'No standard SAP Fiori application exists or matches proprietary customer requirements.',
          'Custom RAP Managed Business Object required for Clean Core compliance.'
        ],
        architectureBaseline: {
          backendModel: payload.architectureBaseline?.backendModel || 'RAP_MANAGED',
          cdsViewType: payload.architectureBaseline?.cdsViewType || 'VIEW_ENTITY',
          odataVersion: payload.architectureBaseline?.odataVersion || 'ODATA_V4',
          uiPattern: payload.architectureBaseline?.uiPattern || 'FIORI_ELEMENTS_LIST_REPORT_OBJECT_PAGE',
          cleanCoreTier: payload.architectureBaseline?.cleanCoreTier || 'TIER_2_CLOUD_DEVELOPER'
        },
        verifiedMetadata: payload.verifiedMetadata || {
          programName: assessment.programName || 'SAPMF05A',
          screenNumber: assessment.screenNumber || '0100',
          packageName: assessment.packageName || 'FBAS',
          softwareComponent: assessment.softwareComponent || 'S4CORE 108 SP0003'
        },
        createdAt: now,
        updatedAt: now,
        createdBy: actorId,
        creatorName: actorName
      };

      // 1. Authoritative persistence in PostgreSQL if active
      if (this.repository) {
        try {
          const tenantId = userContext?.tenantId || this.tenantId;
          await this.repository.createHandoff(handoffRecord, tenantId);
        } catch (dbErr) {
          console.warn('[GenerationHandoffStore] DB persistence notice:', dbErr.message);
        }
      }

      // 2. Persistence in memory/file store
      this._handoffs.set(handoffId, handoffRecord);
      await this._persist();

      // Synchronize approval state directly onto the assessment record
      try {
        if (assessment.lifecycleStatus === 'RECOMMENDATION_COMPLETED') {
          await this.assessmentStore.update(
            assessment.id,
            { lifecycleStatus: 'PENDING_REVIEW' },
            actorName,
            'Submitted for architectural review prior to handoff approval',
            userContext
          );
        }
        await this.assessmentStore.update(
          assessment.id,
          {
            leadArchitectApproval: handoffRecord.leadArchitectApproval,
            approvalStatus: 'APPROVED',
            lifecycleStatus: 'APPROVED',
            handoffId
          },
          actorName,
          `Synchronized architect approval from generation handoff ${handoffId}`,
          userContext
        );
      } catch (err) {
        try {
          await this.assessmentStore.update(
            assessment.id,
            {
              leadArchitectApproval: handoffRecord.leadArchitectApproval,
              approvalStatus: 'APPROVED',
              handoffId,
              assessmentResult: 'CUSTOM_RAP_REQUIRED',
              recommendation: assessment.recommendation ? { ...assessment.recommendation, outcome: 'BUILD' } : {
                outcome: 'BUILD',
                canonicalOutcome: 'BUILD',
                recommendationType: 'BUILD',
                rationale: handoffRecord.architectureBaseline?.justification || 'Custom Clean Core RAP development approved by Enterprise Architect.',
                targetTier: handoffRecord.architectureBaseline?.cleanCoreTier || 'TIER_2_CLOUD_DEVELOPER'
              }
            },
            actorName,
            `Recorded architect approval from generation handoff ${handoffId}`,
            userContext
          );
        } catch {
          // non-blocking
        }
      }

      // Record audit event in assessment
      try {
        await this.assessmentStore.recordModernizationAction(
          assessment.id,
          {
            actionType: 'BUILD_PROJECT',
            details: {
              handoffId,
              proposedAppType: handoffRecord.proposedAppType,
              stage: handoffRecord.currentStage,
              approvalStatus: handoffRecord.approvalStatus,
              cleanCoreTier: handoffRecord.architectureBaseline.cleanCoreTier
            },
            author: actorName,
            comment: `Generation Studio handoff ${handoffId} created in stage DRAFT. Architect sign-off recorded.`
          },
          userContext
        );
      } catch (err) {
        console.warn('[GenerationHandoffStore] Warning appending modernization action:', err.message);
      }

      return handoffRecord;
    });
  }

  /**
   * Retrieves a handoff by its ID.
   */
  async getHandoff(handoffId, userContext = null) {
    if (!handoffId) return null;
    const tenantId = userContext?.tenantId || this.tenantId;

    if (this.repository) {
      try {
        const fromDb = await this.repository.getHandoff(handoffId, tenantId);
        if (fromDb) return fromDb;
      } catch (err) {
        console.warn('[GenerationHandoffStore] DB read fallback:', err.message);
      }
    }

    await this._ensureLoaded();
    return this._handoffs.get(handoffId) || null;
  }

  /**
   * Lists all handoffs matching optional query filters.
   */
  async listHandoffs(filters = {}, userContext = null) {
    const tenantId = userContext?.tenantId || this.tenantId;

    if (this.repository) {
      try {
        return await this.repository.listHandoffs(filters, tenantId);
      } catch (err) {
        console.warn('[GenerationHandoffStore] DB list fallback:', err.message);
      }
    }

    await this._ensureLoaded();
    let all = Array.from(this._handoffs.values());

    if (filters.assessmentId || filters.sourceAssessmentId) {
      const aid = filters.assessmentId || filters.sourceAssessmentId;
      all = all.filter((h) => h.sourceAssessmentId === aid);
    }

    if (filters.tcode) {
      all = all.filter((h) => h.tcode && h.tcode.toUpperCase() === filters.tcode.toUpperCase());
    }

    if (filters.approvalStatus) {
      all = all.filter((h) => h.approvalStatus && h.approvalStatus.toUpperCase() === filters.approvalStatus.toUpperCase());
    }

    return all;
  }

  /**
   * Clears the store (used for test isolation).
   */
  async clear() {
    return await this._withWriteLock(async () => {
      this._handoffs.clear();
      await this._persist();
    });
  }
}

export const defaultGenerationHandoffStore = new GenerationHandoffStore();
