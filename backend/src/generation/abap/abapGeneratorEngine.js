/**
 * FioriX — GEN-05: ABAP Generator Engine
 *
 * Orchestrates deterministic ABAP/RAP artifact generation for S/4HANA 2023 Clean Core:
 * Tables -> CDS View Entities -> Behavior Definitions -> Implementation Skeletons ->
 * Service Definitions -> Service Binding Proposals -> DCL -> Documentation.
 */

import { generatePersistenceTables } from './persistenceTableGenerator.js';
import { generateCdsEntities } from './cdsViewEntityGenerator.js';
import { generateBehaviorDefinition } from './rapBehaviorGenerator.js';
import { generateBehaviorImplementationClass } from './behaviorClassGenerator.js';
import { generateServiceDefinition } from './serviceDefinitionGenerator.js';
import { generateServiceBindingProposal } from './serviceBindingProposalGenerator.js';
import { generateDclAccessControl } from './dclAccessControlGenerator.js';
import { generateAbapDocumentation } from './abapDocumentationGenerator.js';
import { ArtifactRegistry } from '../artifacts/artifactRegistry.js';
import { defaultGenerationProjectStore } from '../projects/generationProjectStore.js';
import { defaultArchitectureDecisionEngine } from '../architecture/architectureDecisionEngine.js';
import { LIFECYCLE_STATUSES } from '../contracts/generationProjectContract.js';

export class AbapGeneratorEngine {
  constructor(projectStore = defaultGenerationProjectStore, archEngine = defaultArchitectureDecisionEngine) {
    this.projectStore = projectStore;
    this.archEngine = archEngine;
  }

  /**
   * Generates all ABAP RAP artifacts for a project.
   *
   * @param {string} projectId
   * @param {Object} [options] - { forceOverwrite: boolean, overrides: Object }
   * @param {Object} [userContext]
   * @returns {Object} Generation result summary
   */
  async generateAbapArtifacts(projectId, options = {}, userContext = null) {
    const project = await this.projectStore.getProject(projectId, userContext);
    if (!project) {
      const err = new Error(`Generation project "${projectId}" not found.`);
      err.code = 'NOT_FOUND';
      throw err;
    }

    // Verify architecture spec exists or evaluate on-the-fly
    let architecture = project.architectureSpec;
    if (!architecture || architecture.status === 'EMPTY' || !architecture.selectedProfile) {
      architecture = this.archEngine.evaluate(project, options.overrides || {});
      project.architectureSpec = architecture;
    }

    if (architecture.selectedProfile === 'ARCHITECTURE_REVIEW_REQUIRED') {
      const err = new Error('Cannot generate ABAP artifacts: Architecture review required. Data model or confirmed requirements are incomplete.');
      err.code = 'BAD_REQUEST';
      err.issues = architecture.unresolvedDesignDecisions;
      throw err;
    }

    const generatedArtifacts = [];

    // 1. Persistence Tables
    const tables = generatePersistenceTables(project, architecture);
    generatedArtifacts.push(...tables);

    // 2. CDS View Entities (Interface, Projection, MDE)
    const cdsEntities = generateCdsEntities(project, architecture);
    generatedArtifacts.push(...cdsEntities);

    // 3. RAP Behavior Definition
    const bdefs = generateBehaviorDefinition(project, architecture);
    generatedArtifacts.push(...bdefs);

    // 4. Behavior Implementation Class Skeleton
    if (bdefs.length > 0) {
      const classSkeleton = generateBehaviorImplementationClass(project, architecture);
      generatedArtifacts.push(...classSkeleton);
    }

    // 5. Service Definition
    const srvd = generateServiceDefinition(project, architecture);
    generatedArtifacts.push(...srvd);

    // 6. Service Binding Proposal
    const srvb = generateServiceBindingProposal(project, architecture);
    generatedArtifacts.push(...srvb);

    // 7. DCL Access Control
    const dcl = generateDclAccessControl(project, architecture);
    generatedArtifacts.push(...dcl);

    // 8. ABAP Documentation
    const docs = generateAbapDocumentation(project, architecture, generatedArtifacts);
    generatedArtifacts.push(...docs);

    // Filter to selective target artifact if requested
    let artifactsToCommit = generatedArtifacts;
    if (options.artifactId) {
      const match = generatedArtifacts.filter(
        (a) => a.artifactId === options.artifactId ||
               a.filePath === options.artifactId ||
               a.objectName === options.artifactId
      );
      if (match.length > 0) {
        artifactsToCommit = match;
      }
    }

    // Commit generated artifacts into the authoritative registry
    const runRecord = ArtifactRegistry.commitArtifacts(project, artifactsToCommit, {
      forceOverwrite: options.forceOverwrite === true,
      phase: options.artifactId ? `GEN_05_SELECTIVE_${options.artifactId}` : 'GEN_05_ABAP'
    });

    // Advance project lifecycle status to GENERATED (or READY_FOR_GENERATION if UI still pending)
    const newStatus = LIFECYCLE_STATUSES.GENERATED;

    const updated = await this.projectStore.updateProject(projectId, {
      artifactRegistry: project.artifactRegistry,
      architectureSpec: architecture,
      lifecycleStatus: newStatus,
      isEngineOperation: true,
      author: userContext?.name || 'Lead Architect',
      actorId: userContext?.id || 'USR-LOCAL',
      activityAction: 'ABAP_GENERATED',
      activityDetails: {
        totalArtifacts: generatedArtifacts.length,
        runId: runRecord.runId,
        profile: architecture.selectedProfile,
        preservedManualEdits: runRecord.preservedManualEditsCount
      }
    }, userContext);

    const registry = ArtifactRegistry.getRegistry(updated);

    return {
      success: true,
      projectId,
      totalGenerated: generatedArtifacts.length,
      artifacts: Object.values(registry.artifacts).filter((a) => a.language === 'ABAP' || a.artifactType.startsWith('RAP_') || a.artifactType.startsWith('CDS_') || a.artifactType === 'DDL_SOURCE' || a.objectName === 'README_ABAP'),
      runRecord,
      lifecycleStatus: updated.lifecycleStatus
    };
  }
}

export const defaultAbapGeneratorEngine = new AbapGeneratorEngine();
