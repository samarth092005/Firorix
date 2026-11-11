/**
 * FioriX — Generation Handoff Persistence Store (MW-03)
 *
 * Implements server-side authoritative persistence for Generation Studio handoffs.
 * Ensures project context survives page refreshes, enforces Clean Core standard-first guardrails,
 * and maintains atomic, serialized file storage.
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { defaultAssessmentStore } from './assessmentStore.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_STORAGE_PATH = path.resolve(__dirname, '../../data/generationHandoffs.json');

export class GenerationHandoffStore {
  constructor(storagePath = DEFAULT_STORAGE_PATH, assessmentStore = defaultAssessmentStore) {
    this.storagePath = storagePath;
    this.assessmentStore = assessmentStore;
    this._handoffs = new Map();
    this._writeLock = Promise.resolve();
    this._isLoaded = false;
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
      if (fs.existsSync(this.storagePath)) {
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
    await fs.promises.writeFile(tempPath, json, 'utf8');
    await fs.promises.rename(tempPath, this.storagePath);
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
    // If standard Fiori app candidate exists or assessment fit-gap outcome is not strictly BUILD,
    // custom build requires explicit Lead Enterprise Architect approval and documented justification.
    const hasStandardCandidate = Boolean(
      (assessment.matchingFioriApp && assessment.matchingFioriApp.appId) ||
      (assessment.candidateApps && assessment.candidateApps.length > 0) ||
      assessment.fitGapScore >= 50
    );

    const isArchitectApproved = Boolean(
      payload.architectApproved ||
      payload.leadArchitectApproval?.approved ||
      payload.approvalStatus === 'APPROVED' ||
      userContext?.role === 'ENTERPRISE_ARCHITECT' ||
      userContext?.role === 'APPROVER' ||
      userContext?.role === 'ADMIN'
    );

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

      // Idempotency check: if exact handoff already exists, return it
      if (this._handoffs.has(handoffId)) {
        return this._handoffs.get(handoffId);
      }

      const actorName = userContext?.name || payload.architectName || payload.createdBy || 'Lead SAP Architect';
      const actorId = userContext?.id || payload.actorId || `USR-${crypto.createHash('md5').update(actorName).digest('hex').slice(0, 8).toUpperCase()}`;

      const handoffRecord = {
        handoffId,
        sourceAssessmentId: assessment.id,
        tcode: assessment.tcode,
        transactionDescription: payload.transactionDescription || assessment.description || `Transaction ${assessment.tcode}`,
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
          timestamp: now,
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

      this._handoffs.set(handoffId, handoffRecord);
      await this._persist();

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
   * Retrieves a Generation Studio Handoff by its unique ID.
   */
  async getHandoff(handoffId) {
    if (!handoffId || typeof handoffId !== 'string') {
      return null;
    }
    await this._ensureLoaded();
    return this._handoffs.get(handoffId.trim()) || null;
  }

  /**
   * Lists all persisted Generation Studio handoffs.
   */
  async listHandoffs(filters = {}) {
    await this._ensureLoaded();
    let records = Array.from(this._handoffs.values());
    if (filters.assessmentId) {
      records = records.filter((h) => h.sourceAssessmentId === filters.assessmentId);
    }
    if (filters.tcode) {
      records = records.filter((h) => h.tcode.toUpperCase() === filters.tcode.toUpperCase());
    }
    return records;
  }
}

export const defaultGenerationHandoffStore = new GenerationHandoffStore();
