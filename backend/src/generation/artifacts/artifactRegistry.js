/**
 * Fiorify — Shared GEN-05 / GEN-06 Artifact Registry
 *
 * Provides authoritative persistence, SHA-256 checksum tracking,
 * manual-edit preservation, diff detection, and generation-run auditing
 * within the canonical GenerationProject persistence architecture.
 */

import crypto from 'node:crypto';
import { computeSha256 } from '../abap/abapArtifactContract.js';

export class ArtifactRegistry {
  /**
   * Initializes or normalizes the artifact registry structure on a project.
   */
  static getRegistry(project) {
    if (!project.artifactRegistry || typeof project.artifactRegistry !== 'object') {
      project.artifactRegistry = {
        artifacts: {},
        generationRuns: [],
        version: 1,
        lastGeneratedAt: null
      };
    }
    if (!project.artifactRegistry.artifacts) {
      project.artifactRegistry.artifacts = {};
    }
    if (!Array.isArray(project.artifactRegistry.generationRuns)) {
      project.artifactRegistry.generationRuns = [];
    }
    return project.artifactRegistry;
  }

  /**
   * Atomically registers new or updated artifacts, safely preserving manual edits.
   *
   * @param {Object} project - The GenerationProject record
   * @param {Array<Object>} newArtifacts - List of newly generated artifacts
   * @param {Object} options - { forceOverwrite: boolean, phase: string }
   * @returns {Object} Generation run summary
   */
  static commitArtifacts(project, newArtifacts, options = {}) {
    const registry = this.getRegistry(project);
    const { forceOverwrite = false, phase = 'GEN_05_ABAP' } = options;
    const now = new Date().toISOString();
    const runId = `RUN-${Date.now()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;

    const inputHash = computeSha256(
      JSON.stringify({
        requirements: project.requirementsSpec,
        dataModel: project.dataModelSpec,
        architecture: project.architectureSpec
      })
    );

    const runRecord = {
      runId,
      projectId: project.projectId,
      phase,
      startedAt: now,
      completedAt: null,
      result: 'SUCCESS',
      inputSnapshotHash: inputHash,
      generatedArtifactIds: [],
      preservedManualEditsCount: 0,
      overwrittenCount: 0,
      errors: [],
      warnings: [],
      templateVersion: '1.0.0-S4HANA2023'
    };

    for (const newArt of newArtifacts) {
      const existing = registry.artifacts[newArt.artifactId] ||
        Object.values(registry.artifacts).find((a) => a.filePath === newArt.filePath);

      if (existing) {
        // Check if the user manually modified this artifact
        const isModified = existing.manualEditStatus === 'MODIFIED' ||
          (existing.content !== existing.templateContent && existing.originalChecksum !== computeSha256(existing.content));

        if (isModified && !forceOverwrite) {
          // Preserve developer's manual edits!
          existing.templateContent = newArt.content; // update underlying template
          existing.dependencies = newArt.dependencies;
          existing.sourceRequirementIds = newArt.sourceRequirementIds;
          existing.sourceEntityIds = newArt.sourceEntityIds;
          runRecord.preservedManualEditsCount++;
          runRecord.warnings.push(`Manual edits preserved for "${existing.objectName}" (${existing.filePath}). Template updated in background.`);
          runRecord.generatedArtifactIds.push(existing.artifactId);
          continue;
        }

        // Overwrite or update
        existing.content = newArt.content;
        existing.checksum = newArt.checksum;
        existing.originalChecksum = newArt.checksum;
        existing.templateContent = newArt.content;
        existing.manualEditStatus = 'ORIGINAL';
        existing.version = (existing.version || 1) + 1;
        existing.generatedAt = now;
        existing.dependencies = newArt.dependencies;
        existing.limitations = newArt.limitations;
        existing.validationStatus = 'PENDING_VALIDATION';
        runRecord.overwrittenCount++;
        runRecord.generatedArtifactIds.push(existing.artifactId);
      } else {
        // Completely new artifact
        newArt.templateContent = newArt.content;
        registry.artifacts[newArt.artifactId] = newArt;
        runRecord.generatedArtifactIds.push(newArt.artifactId);
      }
    }

    runRecord.completedAt = new Date().toISOString();
    registry.generationRuns.push(runRecord);
    registry.lastGeneratedAt = runRecord.completedAt;
    registry.version = (registry.version || 1) + 1;

    return runRecord;
  }

  /**
   * Applies a manual edit to an artifact, tracking differences against the generated template.
   */
  static applyManualEdit(project, artifactId, updatedContent, author = 'ABAP Developer') {
    const registry = this.getRegistry(project);
    const artifact = registry.artifacts[artifactId];
    if (!artifact) {
      const err = new Error(`Artifact "${artifactId}" does not exist in registry.`);
      err.code = 'NOT_FOUND';
      throw err;
    }

    const newChecksum = computeSha256(updatedContent);
    const isDifferentFromTemplate = updatedContent !== (artifact.templateContent || artifact.content);

    artifact.content = updatedContent;
    artifact.checksum = newChecksum;
    artifact.manualEditStatus = isDifferentFromTemplate ? 'MODIFIED' : 'ORIGINAL';
    artifact.lastEditedBy = author;
    artifact.lastEditedAt = new Date().toISOString();
    artifact.validationStatus = 'PENDING_VALIDATION';

    return {
      success: true,
      artifact,
      manualEditStatus: artifact.manualEditStatus,
      differsFromTemplate: isDifferentFromTemplate
    };
  }

  /**
   * Restores an artifact to its generated template version.
   */
  static restoreToTemplate(project, artifactId) {
    const registry = this.getRegistry(project);
    const artifact = registry.artifacts[artifactId];
    if (!artifact) {
      const err = new Error(`Artifact "${artifactId}" does not exist in registry.`);
      err.code = 'NOT_FOUND';
      throw err;
    }

    if (!artifact.templateContent) {
      const err = new Error(`No original template content saved for artifact "${artifactId}".`);
      err.code = 'BAD_REQUEST';
      throw err;
    }

    artifact.content = artifact.templateContent;
    artifact.checksum = computeSha256(artifact.content);
    artifact.manualEditStatus = 'ORIGINAL';
    artifact.lastEditedAt = new Date().toISOString();
    artifact.validationStatus = 'PENDING_VALIDATION';

    return {
      success: true,
      artifact
    };
  }
}
