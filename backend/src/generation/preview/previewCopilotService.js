/**
 * Fiorify — Preview "Request Changes & Review Diff" Copilot Service
 *
 * Parses natural-language UI/spec change requests in the Live Fiori Sandbox,
 * generates a dry-run unified diff against Fiori artifacts, and applies
 * approved patches cleanly with automatic Fiori artifact regeneration.
 */

import crypto from 'node:crypto';
import { defaultGenerationProjectStore } from '../projects/generationProjectStore.js';
import { defaultArchitectureDecisionEngine } from '../architecture/architectureDecisionEngine.js';
import { defaultFioriGeneratorEngine } from '../fiori/fioriGeneratorEngine.js';
import { defaultPreviewManager } from './previewManager.js';
import { generateFioriManifest } from '../fiori/manifestGenerator.js';
import { generateFioriAnnotationsXml } from '../fiori/fioriAnnotationGenerator.js';
import { generateFreestyleUi5Artifacts } from '../fiori/freestyleUi5Generator.js';

function computeUnifiedDiff(beforeText = '', afterText = '', filePath = 'file') {
  const beforeLines = String(beforeText).split('\n');
  const afterLines = String(afterText).split('\n');

  if (beforeText === afterText) return null;

  const hunks = [`--- a/${filePath}`, `+++ b/${filePath}`];
  let additions = 0;
  let deletions = 0;

  const maxLen = Math.max(beforeLines.length, afterLines.length);
  for (let i = 0; i < maxLen; i++) {
    const b = beforeLines[i];
    const a = afterLines[i];
    if (b === a) continue;
    if (b !== undefined) {
      hunks.push(`- ${b}`);
      deletions++;
    }
    if (a !== undefined) {
      hunks.push(`+ ${a}`);
      additions++;
    }
  }

  return {
    filePath,
    additions,
    deletions,
    unifiedDiff: hunks.join('\n')
  };
}

function parseInstructionToPatch(instruction, project) {
  const text = String(instruction || '').trim();
  const lower = text.toLowerCase();
  const rootEntity =
    project.dataModelSpec?.entities?.find((e) => e.entityType === 'ROOT' || e.isRoot) ||
    project.dataModelSpec?.entities?.[0];

  const currentPrefs = { ...(project.requirementsSpec?.uiPreferences || {}) };
  const uiPreferencesPatch = {};
  const newFields = [];
  const newActions = [];
  const renamedLabels = { ...(currentPrefs.renamedLabels || {}) };
  const impactedLayers = new Set();
  const summaryParts = [];

  // 1. Floorplan switching
  if (lower.includes('worklist')) {
    uiPreferencesPatch.floorplan = 'WORKLIST';
    uiPreferencesPatch.bulkActions = true;
    impactedLayers.add('Fiori Manifest');
    impactedLayers.add('UI Annotations');
    summaryParts.push('Switch floorplan to Action-Oriented Worklist');
  } else if (lower.includes('analytical') || lower.includes('alp') || lower.includes('chart') || lower.includes('kpi')) {
    uiPreferencesPatch.floorplan = 'ANALYTICAL_LIST_PAGE';
    uiPreferencesPatch.viewMode = 'CHART_TABLE';
    uiPreferencesPatch.kpiHeader = true;
    impactedLayers.add('Fiori Manifest');
    impactedLayers.add('UI Annotations (Chart & KPI)');
    summaryParts.push('Enable Analytical List Page with KPI & Chart');
  } else if (lower.includes('overview') || lower.includes('cockpit') || lower.includes('ovp')) {
    uiPreferencesPatch.floorplan = 'OVERVIEW_PAGE';
    impactedLayers.add('UI5 Overview Cockpit');
    summaryParts.push('Switch floorplan to Executive Overview Cockpit');
  } else if (lower.includes('wizard') || lower.includes('guided')) {
    uiPreferencesPatch.floorplan = 'FREESTYLE_WIZARD';
    impactedLayers.add('UI5 Guided Wizard');
    summaryParts.push('Switch floorplan to Guided Step-by-Step Wizard');
  } else if (lower.includes('list report')) {
    uiPreferencesPatch.floorplan = 'LIST_REPORT_OBJECT_PAGE';
    impactedLayers.add('Fiori Manifest');
    summaryParts.push('Switch floorplan to List Report & Object Page');
  }

  // 2. Status Badge / Criticality
  if (lower.includes('badge') || lower.includes('criticality') || lower.includes('status color')) {
    uiPreferencesPatch.statusBadge = true;
    impactedLayers.add('UI Annotations');
    summaryParts.push('Enable semantic criticality badges on status fields');
  }

  // 3. Bulk Actions
  if (lower.includes('bulk') || lower.includes('multi select') || lower.includes('multiselect')) {
    uiPreferencesPatch.bulkActions = true;
    impactedLayers.add('Fiori Manifest');
    summaryParts.push('Enable multi-select bulk actions on table');
  }

  // 4. Add Column / Field (e.g. "Add column CreatedBy" or "Add field Priority")
  const addColMatch = text.match(/add\s+(?:column|field)\s+['"]?([a-zA-Z0-9_]+(?:\s+[a-zA-Z0-9_]+)?)(?=\s+(?:and|with|to|in|on)\b|,|$|['"])/i);
  if (addColMatch) {
    const rawLabel = addColMatch[1].trim().replace(/['"]/g, '');
    const fieldName = rawLabel.replace(/[^a-zA-Z0-9]/g, '').slice(0, 24) || 'CustomField';
    const exists = (rootEntity?.fields || []).some((f) => f.name.toLowerCase() === fieldName.toLowerCase());
    if (!exists) {
      newFields.push({
        fieldId: `FLD-${crypto.randomUUID().slice(0, 6).toUpperCase()}`,
        name: fieldName,
        label: rawLabel,
        abapType: 'CHAR',
        length: 40,
        edmType: 'Edm.String',
        isKey: false,
        nullable: true,
        semanticRole: /status|state/i.test(fieldName) ? 'STATUS' : 'ATTRIBUTE'
      });
      impactedLayers.add('CDS Data Model');
      impactedLayers.add('UI Annotations');
      summaryParts.push(`Add column "${rawLabel}" (${fieldName}) to ${rootEntity?.name || 'Root Entity'}`);
    }
  }

  // 5. Add Action Button (e.g. "Add action Approve" or "Add button Release")
  const addActMatch = text.match(/add\s+(?:action|button)\s+['"]?([a-zA-Z0-9_]+(?:\s+[a-zA-Z0-9_]+)?)(?=\s+(?:and|with|to|in|on)\b|,|$|['"])/i);
  if (addActMatch) {
    const actLabel = addActMatch[1].trim().replace(/['"]/g, '').slice(0, 32) || 'Approve';
    newActions.push({ label: actLabel });
    impactedLayers.add('UI Annotations');
    summaryParts.push(`Add "${actLabel}" action button to toolbar`);
  }

  // 6. Rename Label (e.g. "Rename OrderId to PO Number")
  const renameMatch = text.match(/rename\s+(?:label\s+)?([a-zA-Z0-9_]+)\s+(?:to|as)\s+(['"]?)([^'"]+)\2/i);
  if (renameMatch && rootEntity) {
    const targetKey = renameMatch[1].trim();
    const newLabel = renameMatch[3].trim();
    const matchedField = (rootEntity.fields || []).find(
      (f) => f.name.toLowerCase() === targetKey.toLowerCase() || (f.label || '').toLowerCase() === targetKey.toLowerCase()
    );
    if (matchedField) {
      renamedLabels[matchedField.name] = newLabel;
      uiPreferencesPatch.renamedLabels = renamedLabels;
      impactedLayers.add('UI Annotations');
      summaryParts.push(`Rename "${matchedField.name}" label to "${newLabel}"`);
    }
  }

  // Fallback if instruction didn't match a specific pattern
  if (summaryParts.length === 0) {
    uiPreferencesPatch.statusBadge = true;
    uiPreferencesPatch.bulkActions = true;
    impactedLayers.add('Fiori Manifest');
    impactedLayers.add('UI Annotations');
    summaryParts.push(`Apply UI refinement requested: "${text}"`);
  }

  return {
    summary: summaryParts.join(' · '),
    impactedLayers: Array.from(impactedLayers),
    uiPreferencesPatch,
    newFields,
    newActions
  };
}

function applyPatchToProjectClone(project, patch) {
  const cloned = JSON.parse(JSON.stringify(project));
  cloned.requirementsSpec = cloned.requirementsSpec || { items: [] };
  const prevPrefs = cloned.requirementsSpec.uiPreferences || {};
  const nextCustomActions = [
    ...(Array.isArray(prevPrefs.customActions) ? prevPrefs.customActions : []),
    ...(patch.newActions || [])
  ];

  cloned.requirementsSpec.uiPreferences = {
    ...prevPrefs,
    ...(patch.uiPreferencesPatch || {}),
    ...(nextCustomActions.length > 0 ? { customActions: nextCustomActions } : {})
  };

  if (Array.isArray(patch.newFields) && patch.newFields.length > 0) {
    const entities = cloned.dataModelSpec?.entities || [];
    const rootEntity = entities.find((e) => e.entityType === 'ROOT' || e.isRoot) || entities[0];
    if (rootEntity) {
      rootEntity.fields = [...(rootEntity.fields || []), ...patch.newFields];
    }
  }

  return cloned;
}

function renderPreviewArtifactMap(project, archEngine) {
  const architecture = project.architectureSpec || archEngine.evaluate(project);
  const prefs = project.requirementsSpec?.uiPreferences || {};
  const floorplan = String(prefs.floorplan || '').toUpperCase();
  const isFreestyle =
    floorplan === 'WORKLIST' ||
    floorplan === 'ANALYTICAL_LIST_PAGE' ||
    floorplan === 'OVERVIEW_PAGE' ||
    floorplan === 'FREESTYLE_WIZARD';

  const map = new Map();
  if (isFreestyle) {
    const arts = generateFreestyleUi5Artifacts(project, architecture, prefs);
    for (const a of arts) {
      map.set(a.filePath, a.content);
    }
  } else {
    const manifest = generateFioriManifest(project, architecture, prefs);
    if (manifest) map.set(manifest.filePath, manifest.content);
    const ann = generateFioriAnnotationsXml(project, architecture, prefs);
    if (ann) map.set(ann.filePath, ann.content);
  }
  return map;
}

export class PreviewCopilotService {
  constructor(
    projectStore = defaultGenerationProjectStore,
    archEngine = defaultArchitectureDecisionEngine,
    fioriEngine = defaultFioriGeneratorEngine,
    previewManager = defaultPreviewManager
  ) {
    this.projectStore = projectStore;
    this.archEngine = archEngine;
    this.fioriEngine = fioriEngine;
    this.previewManager = previewManager;
  }

  async proposeChanges(projectId, { instruction }, userContext = null) {
    if (!instruction || !String(instruction).trim()) {
      const err = new Error('Please describe the change you want to make in the preview.');
      err.code = 'VALIDATION_ERROR';
      throw err;
    }

    const project = await this.projectStore.getProject(projectId, userContext);
    if (!project) {
      const err = new Error(`Generation project "${projectId}" not found.`);
      err.code = 'NOT_FOUND';
      throw err;
    }

    const patch = parseInstructionToPatch(instruction, project);
    const updatedClone = applyPatchToProjectClone(project, patch);

    const beforeMap = renderPreviewArtifactMap(project, this.archEngine);
    const afterMap = renderPreviewArtifactMap(updatedClone, this.archEngine);
    const allPaths = new Set([...beforeMap.keys(), ...afterMap.keys()]);

    const diffs = [];
    for (const filePath of allPaths) {
      const d = computeUnifiedDiff(beforeMap.get(filePath) || '', afterMap.get(filePath) || '', filePath);
      if (d) diffs.push(d);
    }

    return {
      proposalId: `COP-${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
      instruction: String(instruction).trim(),
      summary: patch.summary,
      impactedLayers: patch.impactedLayers,
      diffs,
      proposedPatch: patch
    };
  }

  async applyChanges(projectId, { approvedPatch }, userContext = null) {
    if (!approvedPatch || typeof approvedPatch !== 'object') {
      const err = new Error('approvedPatch payload is required.');
      err.code = 'VALIDATION_ERROR';
      throw err;
    }

    const project = await this.projectStore.getProject(projectId, userContext);
    if (!project) {
      const err = new Error(`Generation project "${projectId}" not found.`);
      err.code = 'NOT_FOUND';
      throw err;
    }

    const updatedProject = applyPatchToProjectClone(project, approvedPatch);
    await this.projectStore.updateProject(
      projectId,
      {
        requirementsSpec: updatedProject.requirementsSpec,
        dataModelSpec: updatedProject.dataModelSpec
      },
      userContext
    );

    const genResult = await this.fioriEngine.generateFioriApplication(
      projectId,
      { forceOverwrite: true },
      userContext
    );

    let restarted = false;
    try {
      const status = await this.previewManager.getPreviewStatus(projectId, userContext);
      if (status?.previewStatus?.status === 'RUNNING') {
        await this.previewManager.restartPreview(projectId, {}, userContext);
        restarted = true;
      }
    } catch {
      // Non-fatal if preview session wasn't running
    }

    return {
      applied: true,
      summary: approvedPatch.summary || 'Applied Copilot changes',
      regeneratedCount: genResult?.totalGenerated || 0,
      restarted
    };
  }
}

export const defaultPreviewCopilotService = new PreviewCopilotService();
