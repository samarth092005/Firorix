/**
 * Fiorify — GEN-05: ABAP Artifact Contract & Types
 *
 * Defines canonical metadata schemas and helper utilities for ABAP/RAP generated artifacts.
 */

import crypto from 'node:crypto';

export const ABAP_ARTIFACT_TYPES = Object.freeze({
  DDL_SOURCE: 'DDL_SOURCE',
  CDS_INTERFACE_VIEW: 'CDS_INTERFACE_VIEW',
  CDS_PROJECTION_VIEW: 'CDS_PROJECTION_VIEW',
  CDS_CHILD_VIEW: 'CDS_CHILD_VIEW',
  CDS_METADATA_EXTENSION: 'CDS_METADATA_EXTENSION',
  RAP_BEHAVIOR_DEFINITION: 'RAP_BEHAVIOR_DEFINITION',
  RAP_BEHAVIOR_IMPLEMENTATION: 'RAP_BEHAVIOR_IMPLEMENTATION',
  RAP_SERVICE_DEFINITION: 'RAP_SERVICE_DEFINITION',
  RAP_SERVICE_BINDING_PROPOSAL: 'RAP_SERVICE_BINDING_PROPOSAL',
  DCL_ACCESS_CONTROL: 'DCL_ACCESS_CONTROL',
  ABAP_DOCUMENTATION: 'ABAP_DOCUMENTATION'
});

export const TEMPLATE_VERSION = '1.0.0-S4HANA2023';

/**
 * Computes a deterministic SHA-256 hex digest of a string content.
 */
export function computeSha256(content) {
  return crypto.createHash('sha256').update(content || '', 'utf8').digest('hex');
}

/**
 * Creates a normalized ABAP artifact object.
 */
export function createAbapArtifact({
  artifactId,
  projectId,
  artifactType,
  objectName,
  filePath,
  content,
  language = 'ABAP',
  sourceRequirementIds = [],
  sourceEntityIds = [],
  sourceEvidence = [],
  dependencies = [],
  limitations = [],
  version = 1,
  manualEditStatus = 'ORIGINAL',
  ...rest
}) {
  const generatedAt = new Date().toISOString();
  const checksum = computeSha256(content);

  return {
    artifactId: artifactId || `ART-ABAP-${Date.now()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`,
    projectId,
    artifactType,
    objectName,
    filePath,
    content,
    language,
    generationTemplateVersion: TEMPLATE_VERSION,
    sourceRequirementIds,
    sourceEntityIds,
    sourceEvidence,
    generatedAt,
    version,
    checksum,
    originalChecksum: checksum,
    validationStatus: 'PENDING_VALIDATION',
    manualEditStatus,
    dependencies,
    limitations,
    ...rest
  };
}
