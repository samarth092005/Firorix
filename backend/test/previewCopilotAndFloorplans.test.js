import test from 'node:test';
import assert from 'node:assert/strict';
import { generateFioriManifest } from '../src/generation/fiori/manifestGenerator.js';
import { generateFioriAnnotationsXml } from '../src/generation/fiori/fioriAnnotationGenerator.js';
import { generateFreestyleUi5Artifacts } from '../src/generation/fiori/freestyleUi5Generator.js';
import { PreviewCopilotService } from '../src/generation/preview/previewCopilotService.js';
import { GenerationProjectStore } from '../src/generation/projects/generationProjectStore.js';
import { FioriGeneratorEngine } from '../src/generation/fiori/fioriGeneratorEngine.js';

function createSampleProject(floorplan = 'LIST_REPORT_OBJECT_PAGE', projectId = `PRJ-COPILOT-TEST-${Date.now()}`) {
  return {
    projectId,
    projectName: 'Purchase Order Messages',
    sourceTransactionCode: 'ME99',
    requirementsSpec: {
      specVersion: 1,
      items: [
        { requirementId: 'REQ-1', title: 'Action: Release Message', category: 'ACTION', status: 'CONFIRMED' }
      ],
      uiPreferences: {
        floorplan
      },
      status: 'CONFIRMED'
    },
    dataModelSpec: {
      entities: [
        {
          entityId: 'ENT-ROOT',
          name: 'POMessage',
          businessName: 'PO Message',
          entityType: 'ROOT',
          isRoot: true,
          fields: [
            { fieldId: 'F1', name: 'MessageId', label: 'Message ID', abapType: 'CHAR', isKey: true, semanticRole: 'DOCUMENT_NUMBER' },
            { fieldId: 'F2', name: 'Status', label: 'Status', abapType: 'CHAR', isKey: false, semanticRole: 'STATUS' },
            { fieldId: 'F3', name: 'NetAmount', label: 'Net Amount', abapType: 'CURR', isKey: false }
          ]
        }
      ],
      relationships: []
    },
    architectureSpec: {
      rapPattern: 'MANAGED',
      draftEnabled: true
    }
  };
}

test('Multi-Floorplan Generation produces distinct manifests, annotations, and views', () => {
  const worklistProj = createSampleProject('WORKLIST');
  const worklistManifest = JSON.parse(generateFioriManifest(worklistProj, worklistProj.architectureSpec).content);
  assert.equal(worklistManifest['sap.app'].sourceTemplate.id, 'Fiorify.fe.worklist.v4');
  assert.equal(worklistManifest['sap.ui5'].routing.targets.POMessageListReport.options.settings.hideFilterBar, true);
  assert.equal(worklistManifest['sap.ui5'].routing.targets.POMessageListReport.options.settings.tableSettings.selectionMode, 'Multi');

  const worklistAnn = generateFioriAnnotationsXml(worklistProj, worklistProj.architectureSpec).content;
  assert.equal(worklistAnn.includes('UI.SelectionFields'), false);

  const alpProj = createSampleProject('ANALYTICAL_LIST_PAGE');
  const alpManifest = JSON.parse(generateFioriManifest(alpProj, alpProj.architectureSpec).content);
  assert.equal(alpManifest['sap.app'].sourceTemplate.id, 'Fiorify.fe.alp.v4');
  assert.equal(alpManifest['sap.ui5'].routing.targets.POMessageListReport.options.settings.defaultContentView, 'ChartTable');

  const alpAnn = generateFioriAnnotationsXml(alpProj, alpProj.architectureSpec).content;
  assert.ok(alpAnn.includes('UI.Chart'));
  assert.ok(alpAnn.includes('UI.DataPoint'));
  assert.ok(alpAnn.includes('UI.SelectionPresentationVariant'));

  const ovpProj = createSampleProject('OVERVIEW_PAGE');
  const ovpArts = generateFreestyleUi5Artifacts(ovpProj, ovpProj.architectureSpec);
  const ovpView = ovpArts.find((a) => a.filePath === 'webapp/view/Main.view.xml');
  assert.ok(ovpView.content.includes('GenericTile'));
  assert.ok(ovpView.content.includes('NumericContent'));

  const wizardProj = createSampleProject('FREESTYLE_WIZARD');
  const wizardArts = generateFreestyleUi5Artifacts(wizardProj, wizardProj.architectureSpec);
  const wizardView = wizardArts.find((a) => a.filePath === 'webapp/view/Main.view.xml');
  assert.ok(wizardView.content.includes('<Wizard '));
  assert.ok(wizardView.content.includes('<WizardStep '));
});

test('PreviewCopilotService proposes unified diff and applies changes cleanly', async () => {
  const store = new GenerationProjectStore({ persistenceMode: 'memory' });
  const seeded = createSampleProject('LIST_REPORT_OBJECT_PAGE', `PRJ-COPILOT-TEST-${Date.now()}`);
  try {
    await store.createProject(seeded);
    await store.updateProject(seeded.projectId, {
      requirementsSpec: seeded.requirementsSpec,
      dataModelSpec: seeded.dataModelSpec,
      architectureSpec: seeded.architectureSpec,
      lifecycleStatus: 'READY_FOR_GENERATION',
      approvedBy: 'admin'
    });

    const fioriEngine = new FioriGeneratorEngine(store);
    const mockPreviewManager = {
      async getPreviewStatus() {
        return { previewStatus: { status: 'STOPPED' } };
      },
      async restartPreview() {
        return { session: { status: 'RUNNING' } };
      }
    };
    const copilot = new PreviewCopilotService(store, undefined, fioriEngine, mockPreviewManager);

    const proposal = await copilot.proposeChanges(seeded.projectId, {
      instruction: 'Switch floorplan to Worklist and add column Priority and add status badge'
    });

    assert.ok(proposal.proposalId.startsWith('COP-'));
    assert.ok(proposal.diffs.length >= 1);
    assert.ok(proposal.diffs.some((d) => d.unifiedDiff.includes('Action Worklist')));
    assert.ok(proposal.diffs.some((d) => d.unifiedDiff.includes('Priority')));

    const applyResult = await copilot.applyChanges(seeded.projectId, {
      approvedPatch: proposal.proposedPatch
    });

    assert.equal(applyResult.applied, true);
    assert.ok(applyResult.regeneratedCount >= 10);

    const updated = await store.getProject(seeded.projectId);
    assert.equal(updated.requirementsSpec.uiPreferences.floorplan, 'WORKLIST');
    assert.equal(updated.requirementsSpec.uiPreferences.statusBadge, true);
    assert.ok(updated.dataModelSpec.entities[0].fields.some((f) => f.name === 'Priority'));
  } finally {
    await store.deleteProject(seeded.projectId).catch(() => {});
  }
});
