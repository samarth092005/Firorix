/**
 * FioriX — GEN-06: SAP Fiori Elements Artifact Contract & Types
 *
 * Defines canonical schemas for UI5/Fiori Elements generated projects.
 */

import { computeSha256 } from '../abap/abapArtifactContract.js';

export const FIORI_ARTIFACT_TYPES = Object.freeze({
  FIORI_MANIFEST: 'FIORI_MANIFEST',
  FIORI_COMPONENT: 'FIORI_COMPONENT',
  FIORI_INDEX_HTML: 'FIORI_INDEX_HTML',
  FIORI_I18N: 'FIORI_I18N',
  FIORI_ANNOTATIONS_XML: 'FIORI_ANNOTATIONS_XML',
  FIORI_UI5_YAML: 'FIORI_UI5_YAML',
  FIORI_PACKAGE_JSON: 'FIORI_PACKAGE_JSON',
  FIORI_DOCUMENTATION: 'FIORI_DOCUMENTATION'
});

export const UI5_BASELINES = Object.freeze({
  S4HANA_2023_FPS00_INITIAL: '1.114.0', // Initial SAP S/4HANA 2023 baseline (SAP_UI 7.58 SP00)
  S4HANA_2023_FPS01_LTS: '1.120.0',     // SAP S/4HANA 2023 FPS01 / 2024 LTS release (SAP_UI 7.58 SP01)
  S4HANA_2023_FPS02: '1.124.0'          // SAP S/4HANA 2023 FPS02 (SAP_UI 7.58 SP02)
});

export const TARGET_UI5_VERSION_S4HANA2023 = '1.120.0';
export const MIN_SUPPORTED_UI5_VERSION_S4HANA2023 = '1.114.0';

export function createFioriArtifact({
  artifactId,
  projectId,
  artifactType,
  objectName,
  filePath,
  content,
  language = 'JSON',
  sourceRequirementIds = [],
  sourceEntityIds = [],
  dependencies = [],
  limitations = [],
  version = 1,
  manualEditStatus = 'ORIGINAL'
}) {
  const generatedAt = new Date().toISOString();
  const checksum = computeSha256(content);

  return {
    artifactId: artifactId || `ART-FIORI-${Date.now()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`,
    projectId,
    artifactType,
    objectName,
    filePath,
    content,
    language,
    generationTemplateVersion: '1.0.0-FE-ODATAV4',
    sourceRequirementIds,
    sourceEntityIds,
    sourceEvidence: [],
    generatedAt,
    version,
    checksum,
    originalChecksum: checksum,
    validationStatus: 'PENDING_VALIDATION',
    manualEditStatus,
    dependencies,
    limitations
  };
}
