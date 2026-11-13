/**
 * FioriX — GEN-05: RAP Architecture Decision Engine
 *
 * Deterministically evaluates confirmed project requirements, data model entities,
 * and assessment provenance to formulate an authoritative RAP architectural profile.
 */

import {
  RAP_PROFILES,
  PERSISTENCE_APPROACHES,
  LOCK_STRATEGIES,
  ETAG_STRATEGIES,
  AUTHORIZATION_STRATEGIES,
  SERVICE_PROTOCOLS,
  CLEAN_CORE_TIERS
} from './architectureContract.js';

export class ArchitectureDecisionEngine {
  /**
   * Evaluates project state and derives a deterministic RAP architecture recommendation.
   *
   * @param {Object} project - Complete GenerationProject record
   * @param {Object} [overrides] - User-supplied architecture overrides
   * @returns {Object} Architecture specification & decision record
   */
  evaluate(project, overrides = {}) {
    if (!project) {
      throw new Error('Project record is required for architecture evaluation.');
    }

    const requirements = project.requirementsSpec?.items || [];
    const dataModel = project.dataModelSpec || {};
    const entities = dataModel.entities || [];
    const relationships = dataModel.relationships || [];
    const origin = project.origin || 'STANDALONE';
    const assessmentContext = project.assessmentContext || {};

    const rootEntity = entities.find((e) => e.entityType === 'ROOT' || e.isRoot) || entities[0] || null;
    const childEntities = entities.filter((e) => e.entityId !== rootEntity?.entityId);

    // Analyze operations required from confirmed requirements
    const confirmedReqs = requirements.filter((r) => r.status === 'CONFIRMED');
    const categories = new Set(confirmedReqs.map((r) => r.category));

    const hasCreate = categories.has('DATA_CREATE') || confirmedReqs.some((r) => /create|insert|new|add/i.test(r.title));
    const hasUpdate = categories.has('DATA_UPDATE') || categories.has('ACTION') || confirmedReqs.some((r) => /update|modify|change|edit/i.test(r.title));
    const hasDelete = categories.has('DATA_DELETE') || confirmedReqs.some((r) => /delete|remove|cancel/i.test(r.title));
    const isTransactional = hasCreate || hasUpdate || hasDelete;

    const hasDraftNeed = isTransactional && (
      confirmedReqs.some((r) => /draft|approval|workflow|multi-step|temporary save/i.test(`${r.title} ${r.description}`)) ||
      childEntities.length > 0 || // Multi-level compositions strongly warrant draft in SAP Fiori Elements
      overrides.draftEnabled === true
    );

    const requiresLegacyBapi = confirmedReqs.some((r) =>
      /legacy|bapi|idoc|custom function module|existing logic/i.test(`${r.title} ${r.description}`)
    );

    const sourceTcode = (project.sourceTransactionCode || '').toUpperCase().trim();
    const isMonitoringOrReporting =
      /^(ST22|SM21|SM59|SM50|SM66|SLG1|AL08|ST03|DB02|STAT)/i.test(sourceTcode) ||
      /dump|monitor|analysis|audit log|system trace|runtime error/i.test(`${project.projectName} ${project.description || ''}`);

    // Check evidence sufficiency
    const unresolvedDecisions = [];
    const evidenceReferences = [];

    if (entities.length === 0) {
      unresolvedDecisions.push({
        id: 'DEC-01-ENTITIES',
        category: 'DATA_MODEL',
        description: 'No business entities defined in CDS data model.',
        severity: 'BLOCKING',
        resolution: 'Define at least one ROOT entity in Data Model Designer before generation.'
      });
    }

    if (confirmedReqs.length === 0) {
      unresolvedDecisions.push({
        id: 'DEC-02-REQUIREMENTS',
        category: 'SCOPE',
        description: 'Zero functional requirements are in CONFIRMED status.',
        severity: 'WARNING',
        resolution: 'Confirm at least one business requirement in Requirements Designer to ensure requirements traceability.'
      });
    }

    if (assessmentContext.identifiedGaps?.length > 0) {
      evidenceReferences.push({
        type: 'ASSESSMENT_GAP',
        reference: project.sourceAssessmentId || 'DISCOVERY_ASSESSMENT',
        summary: `Identified ${assessmentContext.identifiedGaps.length} functional gaps requiring custom RAP modernisation.`
      });
    }

    // Determine Profile
    let selectedProfile;
    let rationale;
    let persistenceApproach;
    let draftEnabled = false;

    if (entities.length === 0) {
      selectedProfile = RAP_PROFILES.ARCHITECTURE_REVIEW_REQUIRED;
      rationale = 'Cannot formulate architecture profile: Data model is empty. At least one ROOT entity is required.';
      persistenceApproach = PERSISTENCE_APPROACHES.CUSTOM_TABLES;
    } else if (overrides.rapProfile && Object.values(RAP_PROFILES).includes(overrides.rapProfile)) {
      selectedProfile = overrides.rapProfile;
      rationale = `User selected profile override: "${selectedProfile}".`;
      draftEnabled = overrides.draftEnabled ?? (selectedProfile === RAP_PROFILES.MANAGED_RAP_DRAFT);
      persistenceApproach = overrides.persistenceApproach || PERSISTENCE_APPROACHES.CUSTOM_TABLES;
    } else if (requiresLegacyBapi) {
      selectedProfile = RAP_PROFILES.UNMANAGED_RAP;
      rationale = 'Confirmed requirements require integration with existing legacy business logic / BAPIs. Unmanaged RAP profile selected to delegate transactional buffer and save execution.';
      persistenceApproach = PERSISTENCE_APPROACHES.UNMANAGED_LEGACY_API;
      draftEnabled = false;
    } else if (isMonitoringOrReporting && !hasCreate && !hasDelete) {
      selectedProfile = RAP_PROFILES.READ_ONLY_QUERY;
      rationale = `Administrative diagnostics / monitoring transaction (${sourceTcode || 'Report'}): Read-Only Query profile recommended to avoid unnecessary draft tables and mutation overhead under Clean Core.`;
      persistenceApproach = PERSISTENCE_APPROACHES.CUSTOM_TABLES;
      draftEnabled = false;
    } else if (!isTransactional) {
      selectedProfile = RAP_PROFILES.READ_ONLY_QUERY;
      rationale = 'Confirmed requirements are strictly analytical or query-based with no create, update, or delete operations. Read-Only Query profile avoids unnecessary transactional runtime overhead.';
      persistenceApproach = PERSISTENCE_APPROACHES.CUSTOM_TABLES;
      draftEnabled = false;
    } else if (hasDraftNeed) {
      selectedProfile = RAP_PROFILES.MANAGED_RAP_DRAFT;
      rationale = 'Transactional business object with multi-level compositions / multi-step workflow. Managed RAP with Draft is the standard SAP Fiori Elements transactional baseline for S/4HANA 2023, enabling stateless client interaction with durable draft persistence.';
      persistenceApproach = PERSISTENCE_APPROACHES.CUSTOM_TABLES;
      draftEnabled = true;
    } else {
      selectedProfile = RAP_PROFILES.MANAGED_RAP_NON_DRAFT;
      rationale = 'Transactional operations required without multi-step draft requirements. Standard Managed RAP without draft provides low-latency transactional execution with direct persistence.';
      persistenceApproach = PERSISTENCE_APPROACHES.CUSTOM_TABLES;
      draftEnabled = false;
    }

    // Determine Lock & ETag strategies
    const lockStrategy = selectedProfile === RAP_PROFILES.READ_ONLY_QUERY
      ? LOCK_STRATEGIES.NONE_READ_ONLY
      : LOCK_STRATEGIES.LOCK_MASTER;

    const etagStrategy = selectedProfile === RAP_PROFILES.READ_ONLY_QUERY
      ? ETAG_STRATEGIES.NONE
      : ETAG_STRATEGIES.ETAG_MASTER_LOCAL_LAST_CHANGED_AT;

    const authStrategy = AUTHORIZATION_STRATEGIES.CHECK_DCL_AND_RAP_MASTER;
    const serviceProtocol = overrides.serviceProtocol || SERVICE_PROTOCOLS.ODATA_V4_UI;

    // Propose table names following clean core conventions
    const baseName = (rootEntity?.name || 'CUSTOM').replace(/[^a-zA-Z0-9_]/g, '').toUpperCase();
    const cleanPrefix = baseName.startsWith('Z') ? baseName : `Z${baseName}`;
    const rootPersistenceTable = overrides.rootPersistenceTable || rootEntity?.tableName || `${cleanPrefix.slice(0, 15)}_ROOT`;
    const draftPersistenceTable = draftEnabled
      ? (overrides.draftPersistenceTable || (rootEntity?.tableName ? `${rootEntity.tableName.slice(0, 14)}_D` : `${cleanPrefix.slice(0, 14)}_DRAFT`))
      : null;

    const cleanCoreImplications = {
      tier: CLEAN_CORE_TIERS.TIER_2_DEV_EXT,
      guideline: 'ABAP Cloud On-Stack Developer Extensibility',
      notes: [
        'Use CDS View Entities (DEF_VIEW_ENTITY) exclusively.',
        'Use RAP Managed / Draft runtime to ensure strict state separation.',
        'Reference released C1 SAP CDS views for cross-domain dependencies.',
        'No direct modifications to SAP standard tables or unreleased internal BAPIs.'
      ]
    };

    return {
      specVersion: 1,
      selectedProfile,
      rationale,
      rootEntity: rootEntity ? {
        entityId: rootEntity.entityId,
        name: rootEntity.name,
        businessName: rootEntity.businessName || rootEntity.name,
        tableName: rootPersistenceTable,
        draftTableName: draftPersistenceTable
      } : null,
      childEntities: childEntities.map((c) => ({
        entityId: c.entityId,
        name: c.name,
        businessName: c.businessName || c.name,
        tableName: `${cleanPrefix.slice(0, 12)}_${c.name.toUpperCase().slice(0, 6)}`,
        draftTableName: draftEnabled ? `${cleanPrefix.slice(0, 11)}D_${c.name.toUpperCase().slice(0, 5)}` : null,
        compositionParent: rootEntity?.name || null
      })),
      persistenceApproach,
      draftDecision: {
        enabled: draftEnabled,
        draftTableName: draftPersistenceTable,
        reason: draftEnabled
          ? 'Draft persistence enabled for Fiori Elements List Report & Object Page editing.'
          : 'Draft disabled: Application operates in direct transactional or read-only mode.'
      },
      lockStrategy,
      etagStrategy,
      authorizationStrategy: authStrategy,
      serviceProtocol,
      cleanCoreImplications,
      unresolvedDesignDecisions: unresolvedDecisions,
      supportingEvidenceReferences: evidenceReferences,
      evaluatedAt: new Date().toISOString(),
      status: unresolvedDecisions.some((d) => d.severity === 'BLOCKING') ? 'REQUIRES_REVIEW' : 'CONFIRMED'
    };
  }
}

export const defaultArchitectureDecisionEngine = new ArchitectureDecisionEngine();
