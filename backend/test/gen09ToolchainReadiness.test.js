import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { defaultToolchainScanner } from '../src/generation/toolchain/toolchainScanner.js';
import { generateDeveloperHandoverGuide } from '../src/generation/toolchain/handoverGuideGenerator.js';

describe('GEN-09: Developer Toolchain & Workstation Readiness Suite', () => {
  test('1. ToolchainScanner performs non-invasive read-only environment inspection', async () => {
    const report = await defaultToolchainScanner.scanEnvironment();

    assert.ok(report.timestamp);
    assert.ok(['READY', 'PARTIALLY_READY', 'ACTION_REQUIRED'].includes(report.overallStatus));
    assert.equal(report.targetSystem.systemId, 'S21');
    assert.equal(report.targetSystem.client, '200');

    // Check essential tools inspected
    assert.ok(report.tools.node);
    assert.equal(report.tools.node.detected, true);
    assert.ok(report.tools.node.version.startsWith('v20'));

    assert.ok(report.tools.npm);
    assert.ok(report.tools.git);
    assert.ok(report.tools.java);
    assert.ok(report.tools.eclipse);
    assert.ok(report.tools.adt);
    assert.ok(report.tools.sapGui);
    assert.ok(report.tools.ui5Cli);

    // Check port scan array
    assert.ok(Array.isArray(report.ports));
    assert.ok(report.ports.some((p) => p.port === 4004));
    assert.ok(report.ports.some((p) => p.port === 4050));
    assert.ok(Array.isArray(report.recommendations));
  });

  test('2. generateDeveloperHandoverGuide generates complete ABAP & Fiori instructions for S21', () => {
    const mockProject = {
      projectId: 'PRJ-TOOLCHAIN-TEST',
      projectName: 'Purchase Order Approval App',
      architectureSpec: {
        profile: 'MANAGED_RAP_WITH_DRAFT',
        draftDecision: { enabled: true },
        targetBaseline: { sapui5Version: '1.120.0' }
      },
      dataModelSpec: {
        entities: [
          { entityId: 'E1', name: 'PurchaseOrder', entityType: 'ROOT' }
        ]
      }
    };

    const guide = generateDeveloperHandoverGuide(mockProject);
    assert.equal(guide.projectId, 'PRJ-TOOLCHAIN-TEST');
    assert.equal(guide.targetSystem, 'S21');
    assert.equal(guide.targetClient, '200');
    assert.equal(guide.profile, 'MANAGED_RAP_WITH_DRAFT');

    // 8 ABAP steps
    assert.equal(guide.abapSteps.length, 8);
    assert.ok(guide.abapSteps[0].title.includes('Eclipse ADT'));
    assert.ok(guide.abapSteps[7].title.includes('Service Definition'));

    // 4 Fiori steps
    assert.equal(guide.fioriSteps.length, 4);
    assert.ok(guide.fioriSteps[0].title.includes('Extract & Open'));

    // Markdown content
    assert.ok(guide.markdown.includes('Developer Handover & Workstation Setup Guide'));
    assert.ok(guide.markdown.includes('System `S21`, Client `200`'));
    assert.ok(guide.markdown.includes('Zero Deployment Guarantee'));
    assert.ok(guide.markdown.includes('ZUI_PURCHASEORDER'));
  });
});
