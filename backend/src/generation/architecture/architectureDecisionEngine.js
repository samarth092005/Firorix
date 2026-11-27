/**
 * Fiorify — GEN-05: RAP Architecture Decision Engine
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

    // Analyze operations required from confirmed requirements (fall back to draft requirements if none confirmed yet)
    const confirmedReqs = requirements.filter((r) => r.status === 'CONFIRMED');
    const evalReqs = confirmedReqs.length > 0 ? confirmedReqs : requirements;
    const categories = new Set(evalReqs.map((r) => r.category));

    const hasCreate = categories.has('DATA_CREATE') || evalReqs.some((r) => /create|insert|new|add/i.test(r.title));
    const hasUpdate = categories.has('DATA_UPDATE') || categories.has('ACTION') || evalReqs.some((r) => /update|modify|change|edit/i.test(r.title));
    const hasDelete = categories.has('DATA_DELETE') || evalReqs.some((r) => /delete|remove|cancel/i.test(r.title));
    const sourceTcode = (project.sourceTransactionCode || '').toUpperCase().trim();
    const isTransactionalTcode =
      /^(CR01|CR02|VA01|VA02|ME21N|ME22N|FB01|FB02|FB50|FB60|FB70|MM01|MM02|IW21|IW22|IW31|IW32|XK01|XK02|XD01|XD02|BP|MIGO|MIRO)$/i.test(sourceTcode) ||
      (/^[A-Z]{1,3}0[12]N?$/i.test(sourceTcode) && !/^(ST|SM|SL|AL|DB|SE)/i.test(sourceTcode));
    const isTransactional = hasCreate || hasUpdate || hasDelete || (confirmedReqs.length === 0 && isTransactionalTcode);

    const hasDraftNeed = isTransactional && (
      evalReqs.some((r) => /draft|approval|workflow|multi-step|temporary save/i.test(`${r.title} ${r.description}`)) ||
      childEntities.length > 0 || // Multi-level compositions strongly warrant draft in SAP Fiori Elements
      (confirmedReqs.length === 0 && isTransactionalTcode) ||
      overrides.draftEnabled === true
    );

    const requiresLegacyBapi = evalReqs.some((r) =>
      /legacy|bapi|idoc|custom function module|existing logic/i.test(`${r.title} ${r.description}`)
    );

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
      rationale = this._getProfileRationale(selectedProfile, sourceTcode, confirmedReqs.length > 0, true);
      draftEnabled = selectedProfile === RAP_PROFILES.READ_ONLY_QUERY
        ? false
        : (selectedProfile === RAP_PROFILES.MANAGED_RAP_DRAFT ? (overrides.draftEnabled ?? true) : Boolean(overrides.draftEnabled && selectedProfile !== RAP_PROFILES.MANAGED_RAP_NON_DRAFT));
      persistenceApproach = overrides.persistenceApproach || (
        selectedProfile === RAP_PROFILES.READ_ONLY_QUERY
          ? PERSISTENCE_APPROACHES.ANALYTICAL_QUERY_ONLY
          : (selectedProfile === RAP_PROFILES.UNMANAGED_RAP ? PERSISTENCE_APPROACHES.UNMANAGED_LEGACY_API : PERSISTENCE_APPROACHES.CUSTOM_TABLES)
      );
    } else if (requiresLegacyBapi) {
      selectedProfile = RAP_PROFILES.UNMANAGED_RAP;
      rationale = 'Requirements integrate with existing legacy business logic / BAPIs. Unmanaged RAP delegates transactional buffer and save execution to the existing API.';
      persistenceApproach = PERSISTENCE_APPROACHES.UNMANAGED_LEGACY_API;
      draftEnabled = false;
    } else if (isMonitoringOrReporting && !hasCreate && !hasDelete) {
      selectedProfile = RAP_PROFILES.READ_ONLY_QUERY;
      rationale = `Administrative diagnostics / monitoring transaction (${sourceTcode || 'Report'}): Read-Only Query profile recommended to avoid unnecessary draft tables and mutation overhead under Clean Core.`;
      persistenceApproach = PERSISTENCE_APPROACHES.ANALYTICAL_QUERY_ONLY;
      draftEnabled = false;
    } else if (!isTransactional) {
      selectedProfile = RAP_PROFILES.READ_ONLY_QUERY;
      rationale = 'Confirmed requirements are strictly analytical or query-based with no create, update, or delete operations. Read-Only Query profile avoids unnecessary transactional runtime overhead.';
      persistenceApproach = PERSISTENCE_APPROACHES.ANALYTICAL_QUERY_ONLY;
      draftEnabled = false;
    } else if (hasDraftNeed) {
      selectedProfile = RAP_PROFILES.MANAGED_RAP_DRAFT;
      rationale = confirmedReqs.length === 0 && isTransactionalTcode
        ? `Inferred from transactional source T-Code (${sourceTcode}) while requirements are still in draft: Managed RAP with Draft is the standard SAP Fiori Elements transactional baseline for S/4HANA 2023.`
        : 'Transactional business object with multi-level compositions / multi-step workflow. Managed RAP with Draft is the standard SAP Fiori Elements transactional baseline for S/4HANA 2023, enabling stateless client interaction with durable draft persistence.';
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

    const authStrategy = selectedProfile === RAP_PROFILES.READ_ONLY_QUERY
      ? AUTHORIZATION_STRATEGIES.CHECK_DCL_ONLY
      : AUTHORIZATION_STRATEGIES.CHECK_DCL_AND_RAP_MASTER;
    const serviceProtocol = overrides.serviceProtocol || SERVICE_PROTOCOLS.ODATA_V4_UI;

    // Propose table names following clean core conventions (clamped strictly to 16 chars for SAP DDIC TABNAME)
    const rawEntityName = (rootEntity?.name || sourceTcode || 'CUSTOM').replace(/[^a-zA-Z0-9_]/g, '');
    const strippedStem = rawEntityName.replace(/^(Z_I_|Z_C_|ZI_|ZC_|ZBP_I_|ZUI_|Z_)/i, '') || rawEntityName;
    const baseName = rawEntityName.toUpperCase();
    const cleanPrefix = baseName.startsWith('Z') ? baseName : `Z${baseName}`;
    const safeBase = cleanPrefix.slice(0, 14);
    const rootPersistenceTable = (overrides.rootPersistenceTable || rootEntity?.tableName || `${safeBase}_ROOT`).slice(0, 16);
    const draftPersistenceTable = draftEnabled
      ? (overrides.draftPersistenceTable || (rootEntity?.tableName ? `${rootEntity.tableName.slice(0, 14)}_D` : `${safeBase}_D`)).slice(0, 16)
      : null;

    const cleanCoreImplications = this._buildCleanCoreImplications(selectedProfile);
    const stemUpper = strippedStem.toUpperCase();
    const protocolSuffix = serviceProtocol === SERVICE_PROTOCOLS.ODATA_V2_UI ? 'O2' : 'O4';
    const namingBlueprint = {
      interfaceView: `ZI_${stemUpper}`.slice(0, 30),
      projectionView: `ZC_${stemUpper}`.slice(0, 30),
      behaviorPool: selectedProfile === RAP_PROFILES.READ_ONLY_QUERY ? null : `ZBP_I_${stemUpper}`.slice(0, 30),
      serviceDefinition: `ZUI_${stemUpper}_${protocolSuffix}`.slice(0, 30),
      serviceBinding: `ZUI_${stemUpper}_${protocolSuffix}`.slice(0, 30),
      persistenceTable: selectedProfile === RAP_PROFILES.READ_ONLY_QUERY ? null : rootPersistenceTable,
      draftTable: draftEnabled ? draftPersistenceTable : null
    };

    return {
      specVersion: 1,
      selectedProfile,
      rationale,
      legacyDelegate: selectedProfile === RAP_PROFILES.UNMANAGED_RAP ? (overrides.legacyDelegate || '') : null,
      namingBlueprint,
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
        tableName: `${cleanPrefix.slice(0, 10)}_${c.name.toUpperCase().slice(0, 5)}`.slice(0, 16),
        draftTableName: draftEnabled ? `${cleanPrefix.slice(0, 9)}D_${c.name.toUpperCase().slice(0, 5)}`.slice(0, 16) : null,
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

  _getProfileRationale(selectedProfile, sourceTcode, hasConfirmedReqs, isOverride = false) {
    const prefix = isOverride ? 'Architect selected ' : '';
    switch (selectedProfile) {
      case RAP_PROFILES.MANAGED_RAP_DRAFT:
        return `${prefix}Managed RAP with Draft: Best for Fiori Elements apps with Create/Edit/Delete and temporary draft saving.`;
      case RAP_PROFILES.MANAGED_RAP_NON_DRAFT:
        return `${prefix}Managed RAP (Direct Save): Best for simple transactional apps where changes save immediately without draft tables.`;
      case RAP_PROFILES.UNMANAGED_RAP:
        return `${prefix}Unmanaged RAP: Wraps existing BAPIs or custom function modules while exposing a modern OData V4 RAP service.`;
      case RAP_PROFILES.READ_ONLY_QUERY:
        return `${prefix}Read-Only Query: Best for list reports, dashboards, and lookup apps with no create/update/delete actions.`;
      default:
        return `${prefix}Manual Architecture Review required${sourceTcode ? ` for ${sourceTcode}` : ''}${hasConfirmedReqs ? '' : ' (confirm requirements in Stage 1)'}.`;
    }
  }

  _buildCleanCoreImplications(selectedProfile) {
    if (selectedProfile === RAP_PROFILES.READ_ONLY_QUERY) {
      return {
        tier: CLEAN_CORE_TIERS.TIER_2_DEV_EXT,
        guideline: 'ABAP Cloud Read-Only Analytical / Query Extensibility',
        notes: [
          'Use CDS View Entities (DEF_VIEW_ENTITY) exclusively for read-only projection.',
          'Enforce data-level security via CDS Access Control (DCL) without transactional lock overhead.',
          'Reference released C1 SAP CDS views; no custom persistence or draft tables needed.',
          'No direct modifications to SAP standard tables.'
        ]
      };
    }
    if (selectedProfile === RAP_PROFILES.UNMANAGED_RAP) {
      return {
        tier: CLEAN_CORE_TIERS.TIER_2_DEV_EXT,
        guideline: 'ABAP Cloud Tier 2 Wrapper for Legacy BAPIs',
        notes: [
          'Use CDS View Entities (DEF_VIEW_ENTITY) for the OData projection layer.',
          'Encapsulate legacy BAPI / Function Module calls strictly inside the Behavior Pool save sequence.',
          'Prefer C1-released SAP APIs over classic unreleased BAPIs wherever available.',
          'No direct modifications to SAP standard tables.'
        ]
      };
    }
    if (selectedProfile === RAP_PROFILES.MANAGED_RAP_NON_DRAFT) {
      return {
        tier: CLEAN_CORE_TIERS.TIER_2_DEV_EXT,
        guideline: 'ABAP Cloud On-Stack Direct Transactional RAP',
        notes: [
          'Use CDS View Entities (DEF_VIEW_ENTITY) exclusively.',
          'Use Managed RAP runtime with direct persistence (no draft table overhead).',
          'Enforce pessimistic lock master and ETag optimistic concurrency control.',
          'Reference released C1 SAP CDS views for cross-domain dependencies.'
        ]
      };
    }
    return {
      tier: CLEAN_CORE_TIERS.TIER_2_DEV_EXT,
      guideline: 'ABAP Cloud On-Stack Developer Extensibility',
      notes: [
        'Use CDS View Entities (DEF_VIEW_ENTITY) exclusively.',
        'Use RAP Managed / Draft runtime to ensure strict state separation.',
        'Reference released C1 SAP CDS views for cross-domain dependencies.',
        'No direct modifications to SAP standard tables or unreleased internal BAPIs.'
      ]
    };
  }
}

export const defaultArchitectureDecisionEngine = new ArchitectureDecisionEngine();
