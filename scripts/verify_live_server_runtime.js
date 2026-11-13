/**
 * Live Runtime Verification Script for Generation Studio Milestones GEN-02 to GEN-04.
 * Tests actual HTTP responses against http://localhost:4004.
 */

const BASE_URL = 'http://localhost:4004';
const ADMIN_SECRET = process.env.FIORIFY_ADMIN_SECRET || '884b9471a61f40102561c3f766aee554052dfb70b47ca039';

const authHeaders = {
  'Content-Type': 'application/json',
  'x-fiorify-admin-secret': ADMIN_SECRET
};

async function runVerification() {
  console.log('=== STARTING LIVE SERVER VERIFICATION ===');
  const results = [];

  function check(name, condition, detail = '') {
    if (condition) {
      console.log(`[PASS] ${name} ${detail}`);
      results.push({ name, status: 'PASS', detail });
    } else {
      console.error(`[FAIL] ${name} ${detail}`);
      results.push({ name, status: 'FAIL', detail });
      throw new Error(`Verification step failed: ${name}`);
    }
  }

  // 1. Health Endpoint
  const statusRes = await fetch(`${BASE_URL}/api/v1/health`);
  const statusJson = await statusRes.json();
  check('1. Health Endpoint', statusRes.status === 200, `Status: ${statusRes.status}, BTP Mode: ${statusJson.mode}`);

  // 2. Admin Authentication
  const noAuthRes = await fetch(`${BASE_URL}/api/v1/generation/projects`);
  check('2a. Rejects unauthenticated generation access', noAuthRes.status === 403 || noAuthRes.status === 401, `Status: ${noAuthRes.status}`);

  const authListRes = await fetch(`${BASE_URL}/api/v1/generation/projects`, { headers: authHeaders });
  const authListJson = await authListRes.json();
  check('2b. Accepts valid admin secret', authListRes.status === 200 && authListJson.success === true, `Projects count: ${authListJson.count}`);

  // 3. Project List
  check('3. Project list returns structured array', Array.isArray(authListJson.projects), `Count: ${authListJson.projects.length}`);

  // 4. BUILD Assessment Context
  const contextRes = await fetch(`${BASE_URL}/api/v1/generation/context/ASM-PROP-ZPAY-001`, { headers: authHeaders });
  const contextJson = await contextRes.json();
  check('4. BUILD assessment context resolution', contextRes.status === 200 && contextJson.isEligibleForBuild === true, `TCode: ${contextJson.tcode}, Rec: ${contextJson.recommendation?.outcome || contextJson.recommendation?.action}`);

  // 5. Project Creation
  let testProjectId = `GEN-QA-TEST-${Date.now()}`;
  const createRes = await fetch(`${BASE_URL}/api/v1/generation/projects`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      projectId: testProjectId,
      projectName: 'QA Live Verification Project',
      description: 'End-to-end verification project for QA-01 acceptance',
      sourceAssessmentId: 'ASM-PROP-ZPAY-001',
      sourceTCode: 'ZPAY_CUSTOM',
      targetPackage: 'Z_FI_POST_PAYMENTS',
      cleanCoreTier: 'TIER_1'
    })
  });
  const createJson = await createRes.json();
  testProjectId = createJson.project?.projectId || testProjectId;
  check('5. Project creation with provenance', (createRes.status === 201 || createRes.status === 200) && Boolean(createJson.project?.projectId), `ID: ${testProjectId}`);

  // 6. Requirement Import
  const importRes = await fetch(`${BASE_URL}/api/v1/generation/projects/${testProjectId}/requirements/import-assessment`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ sourceAssessmentId: 'ASM-PROP-ZPAY-001' })
  });
  const importJson = await importRes.json();
  check('6. Requirement import with provenance', importRes.status === 200 && importJson.success === true, `Imported: ${importJson.importedCount || importJson.requirements?.length}`);

  // 7. Requirement Creation & Editing
  const addReqRes = await fetch(`${BASE_URL}/api/v1/generation/projects/${testProjectId}/requirements`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      title: 'Manual Bank Statement Posting Validation',
      description: 'Validate electronic bank statement against SAP open line items',
      category: 'VALIDATION',
      priority: 'MUST_HAVE',
      acceptanceCriteria: ['Must verify house bank ID and account ID exist']
    })
  });
  const addReqJson = await addReqRes.json();
  check('7a. Manual requirement creation', addReqRes.status === 201 && Boolean(addReqJson.requirement?.requirementId), `ReqId: ${addReqJson.requirement?.requirementId}`);

  const reqId = addReqJson.requirement.requirementId;
  const updateReqRes = await fetch(`${BASE_URL}/api/v1/generation/projects/${testProjectId}/requirements/${reqId}`, {
    method: 'PUT',
    headers: authHeaders,
    body: JSON.stringify({
      title: 'Updated Bank Statement Posting Validation',
      cleanCoreTier: 'TIER_1',
      acceptanceCriteria: [
        'Must verify house bank ID and account ID exist in T012',
        'Check currency match with company code currency'
      ]
    })
  });
  const updateReqJson = await updateReqRes.json();
  check('7b. Manual requirement editing', updateReqRes.status === 200 && updateReqJson.requirement.acceptanceCriteria.length === 2, 'Criteria updated');

  // 8. Confirmation Gate
  const confirmRes = await fetch(`${BASE_URL}/api/v1/generation/projects/${testProjectId}/requirements/${reqId}/action`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      action: 'CONFIRM',
      acceptanceCriteria: updateReqJson.requirement.acceptanceCriteria,
      cleanCoreTier: 'TIER_1',
      notes: 'Reviewed and confirmed by Enterprise Architect'
    })
  });
  const confirmJson = await confirmRes.json();
  check('8. Requirement confirmation gate', confirmRes.status === 200 && confirmJson.requirement.status === 'CONFIRMED', `Status: ${confirmJson.requirement.status}`);

  // 9. Entity Creation (Root & Child)
  const rootEntityRes = await fetch(`${BASE_URL}/api/v1/generation/projects/${testProjectId}/data-model/entities`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      name: 'OutgoingPayment',
      entityType: 'ROOT',
      description: 'Root Outgoing Payment Transactional Header',
      fields: [
        { name: 'PaymentDocNum', abapType: 'abap.char(10)', isKey: true, semanticRole: 'KEY' },
        { name: 'CompanyCode', abapType: 'abap.char(4)', isKey: false },
        { name: 'TotalAmount', abapType: 'abap.curr(15,2)', cukyField: 'CurrencyCode' },
        { name: 'CurrencyCode', abapType: 'abap.cuky(5)' }
      ]
    })
  });
  const rootEntityJson = await rootEntityRes.json();
  check('9a. Root entity creation', rootEntityRes.status === 201 && rootEntityJson.entity.entityType === 'ROOT', `Root: ${rootEntityJson.entity.name}`);

  const childEntityRes = await fetch(`${BASE_URL}/api/v1/generation/projects/${testProjectId}/data-model/entities`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      name: 'PaymentItem',
      entityType: 'CHILD',
      description: 'Child Outgoing Payment Line Item',
      fields: [
        { name: 'PaymentDocNum', abapType: 'abap.char(10)', isKey: true, semanticRole: 'PARENT_KEY' },
        { name: 'ItemNum', abapType: 'abap.numc(4)', isKey: true, semanticRole: 'KEY' },
        { name: 'ItemAmount', abapType: 'abap.curr(15,2)', cukyField: 'CurrencyCode' },
        { name: 'CurrencyCode', abapType: 'abap.cuky(5)' }
      ]
    })
  });
  const childEntityJson = await childEntityRes.json();
  check('9b. Child entity creation', childEntityRes.status === 201 && childEntityJson.entity.entityType === 'CHILD', `Child: ${childEntityJson.entity.name}`);

  // 10. Field Editing
  const addFieldRes = await fetch(`${BASE_URL}/api/v1/generation/projects/${testProjectId}/data-model/entities/${childEntityJson.entity.entityId}/fields`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      name: 'GlAccount',
      abapType: 'abap.char(10)',
      label: 'G/L Account Number',
      description: 'General Ledger Account'
    })
  });
  const addFieldJson = await addFieldRes.json();
  check('10. Field editing / addition', addFieldRes.status === 201 && addFieldJson.field.name === 'GlAccount', `Field: ${addFieldJson.field.name}`);

  // 11. Composition Creation
  const compRes = await fetch(`${BASE_URL}/api/v1/generation/projects/${testProjectId}/data-model/relationships`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      name: '_PaymentItem',
      relationshipType: 'COMPOSITION',
      sourceEntityId: rootEntityJson.entity.entityId,
      targetEntityId: childEntityJson.entity.entityId,
      cardinality: '[0..*]',
      mapping: [{ sourceField: 'PaymentDocNum', targetField: 'PaymentDocNum' }]
    })
  });
  const compJson = await compRes.json();
  check('11. Composition creation', compRes.status === 201 && compJson.relationship.relationshipType === 'COMPOSITION', `Comp: ${compJson.relationship.name}`);

  // 12. Association Creation (Standard CDS View I_Currency)
  const assocRes = await fetch(`${BASE_URL}/api/v1/generation/projects/${testProjectId}/data-model/relationships`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      name: '_Currency',
      relationshipType: 'ASSOCIATION',
      sourceEntityId: rootEntityJson.entity.entityId,
      targetEntityId: 'I_Currency',
      cardinality: '[0..1]',
      mapping: [{ sourceField: 'CurrencyCode', targetField: 'Currency' }]
    })
  });
  const assocJson = await assocRes.json();
  check('12. Association creation to standard CDS view', assocRes.status === 201 && assocJson.relationship.relationshipType === 'ASSOCIATION', `Assoc: ${assocJson.relationship.name}`);

  // 13. Data Model Validation
  const validateRes = await fetch(`${BASE_URL}/api/v1/generation/projects/${testProjectId}/data-model/validate`, {
    method: 'POST',
    headers: authHeaders
  });
  const validateJson = await validateRes.json();
  check('13. Multi-category data model validation', validateRes.status === 200 && validateJson.validationReport.errorCount === 0, `Status: ${validateJson.validationReport.status}, Errors: ${validateJson.validationReport.errorCount}`);

  // 14. Project Reload
  const reloadRes = await fetch(`${BASE_URL}/api/v1/generation/projects/${testProjectId}`, { headers: authHeaders });
  const reloadJson = await reloadRes.json();
  check('14. Project reload with state integrity', reloadRes.status === 200 && reloadJson.project.projectId === testProjectId, `Lifecycle: ${reloadJson.project.lifecycleStatus}`);

  // Cleanup test project
  await fetch(`${BASE_URL}/api/v1/generation/projects/${testProjectId}?confirmed=true`, { method: 'DELETE', headers: authHeaders });

  console.log('=== ALL 14 LIVE SERVER VERIFICATION STEPS PASSED SUCCESSFULLY ===');
}

runVerification().catch((err) => {
  console.error('VERIFICATION FAILED:', err);
  process.exit(1);
});
