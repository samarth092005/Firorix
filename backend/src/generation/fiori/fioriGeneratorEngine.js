/**
 * Fiorify — GEN-06: SAP Fiori Elements Generator Engine
 *
 * Consumes the GEN-05 ABAP/RAP service contracts and synthesizes a complete,
 * reviewable SAP Fiori Elements (OData V4) application project.
 */

import { generateFioriManifest } from './manifestGenerator.js';
import { generateFioriAnnotationsXml } from './fioriAnnotationGenerator.js';
import { generateFioriProjectScaffolding } from './fioriProjectStructureGenerator.js';
import { ArtifactRegistry } from '../artifacts/artifactRegistry.js';
import { defaultGenerationProjectStore } from '../projects/generationProjectStore.js';
import { defaultArchitectureDecisionEngine } from '../architecture/architectureDecisionEngine.js';

export class FioriGeneratorEngine {
  constructor(projectStore = defaultGenerationProjectStore, archEngine = defaultArchitectureDecisionEngine) {
    this.projectStore = projectStore;
    this.archEngine = archEngine;
  }

  /**
   * Generates SAP Fiori Elements application files based on GEN-05 contracts.
   */
  async generateFioriApplication(projectId, uiConfig = {}, userContext = null) {
    const project = await this.projectStore.getProject(projectId, userContext);
    if (!project) {
      const err = new Error(`Generation project "${projectId}" not found.`);
      err.code = 'NOT_FOUND';
      throw err;
    }

    const architecture = project.architectureSpec || this.archEngine.evaluate(project);

    const fioriArtifacts = [];

    // 1. webapp/manifest.json
    const manifest = generateFioriManifest(project, architecture, uiConfig);
    if (manifest) fioriArtifacts.push(manifest);

    // 2. webapp/annotations/annotations.xml
    const annotations = generateFioriAnnotationsXml(project, architecture, uiConfig);
    if (annotations) fioriArtifacts.push(annotations);

    // 3. Project Scaffolding (Component.js, index.html, i18n, package.json, ui5.yaml, README)
    const scaffolding = generateFioriProjectScaffolding(project, architecture, uiConfig);
    fioriArtifacts.push(...scaffolding);

    // Commit generated artifacts into the shared registry
    const runRecord = ArtifactRegistry.commitArtifacts(project, fioriArtifacts, {
      forceOverwrite: uiConfig.forceOverwrite === true,
      phase: 'GEN_06_FIORI'
    });

    const updated = await this.projectStore.updateProject(projectId, {
      artifactRegistry: project.artifactRegistry,
      isEngineOperation: true,
      author: userContext?.name || 'Lead Architect',
      actorId: userContext?.id || 'USR-LOCAL',
      activityAction: 'FIORI_GENERATED',
      activityDetails: {
        totalArtifacts: fioriArtifacts.length,
        runId: runRecord.runId,
        appId: uiConfig.appId || `com.Fiorify.custom.${project.projectId.toLowerCase()}`
      }
    }, userContext);

    const registry = ArtifactRegistry.getRegistry(updated);

    return {
      success: true,
      projectId,
      totalGenerated: fioriArtifacts.length,
      artifacts: Object.values(registry.artifacts).filter((a) => a.filePath.startsWith('webapp/') || a.filePath.includes('ui5.yaml') || a.objectName === 'README_FIORI' || a.filePath === 'package.json'),
      runRecord
    };
  }
}

export const defaultFioriGeneratorEngine = new FioriGeneratorEngine();
