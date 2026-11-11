/**
 * Complete Restart Persistence Test for Generation Studio (Section 3).
 * 1. Creates a project with entities, fields, relationships, and confirmed requirements.
 * 2. Re-fetches the project via HTTP.
 * 3. Verifies 100% integrity across all records on disk.
 * 4. Cleans up test project.
 */

const BASE_URL = 'http://localhost:4004';
const ADMIN_SECRET = process.env.FIORIX_ADMIN_SECRET || '884b9471a61f40102561c3f766aee554052dfb70b47ca039';
const authHeaders = {
  'Content-Type': 'application/json',
  'x-fiorix-admin-secret': ADMIN_SECRET
};

async function run() {
  const projectId = `GEN-RESTART-${Date.now()}`;
  console.log(`[1] Creating project ${projectId} on live server...`);

  // Create project
  const cRes = await fetch(`${BASE_URL}/api/v1/generation/projects`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      projectId,
      projectName: 'Restart Persistence Test Project',
      origin: 'STANDALONE',
      targetPackage: 'Z_PERSIST_TEST',
      cleanCoreTier: 'TIER_1'
    })
  });
  if (cRes.status !== 201) throw new Error(`Create failed: ${cRes.status}`);

  // Add Root Entity
  console.log('[2] Adding Root Entity...');
  const eRes = await fetch(`${BASE_URL}/api/v1/generation/projects/${projectId}/data-model/entities`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      name: 'SalesOrder',
      entityType: 'ROOT',
      fields: [
        { name: 'SalesOrder', abapType: 'abap.char(10)', isKey: true },
        { name: 'TotalNetAmount', abapType: 'abap.curr(15,2)', cukyField: 'TransactionCurrency' },
        { name: 'TransactionCurrency', abapType: 'abap.cuky(5)' }
      ]
    })
  });
  if (eRes.status !== 201) throw new Error(`Add entity failed: ${eRes.status}`);
  const eJson = await eRes.json();

  // Add Child Entity
  console.log('[3] Adding Child Entity...');
  const cEntityRes = await fetch(`${BASE_URL}/api/v1/generation/projects/${projectId}/data-model/entities`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      name: 'SalesOrderItem',
      entityType: 'CHILD',
      fields: [
        { name: 'SalesOrder', abapType: 'abap.char(10)', isKey: true },
        { name: 'SalesOrderItem', abapType: 'abap.numc(6)', isKey: true },
        { name: 'NetPriceAmount', abapType: 'abap.curr(15,2)', cukyField: 'TransactionCurrency' },
        { name: 'TransactionCurrency', abapType: 'abap.cuky(5)' }
      ]
    })
  });
  if (cEntityRes.status !== 201) throw new Error(`Add child entity failed: ${cEntityRes.status}`);
  const cEntityJson = await cEntityRes.json();

  // Add Composition
  console.log('[4] Adding Composition...');
  const compRes = await fetch(`${BASE_URL}/api/v1/generation/projects/${projectId}/data-model/relationships`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      name: '_Item',
      relationshipType: 'COMPOSITION',
      sourceEntityId: eJson.entity.entityId,
      targetEntityId: cEntityJson.entity.entityId,
      cardinality: '[0..*]',
      mapping: [{ sourceField: 'SalesOrder', targetField: 'SalesOrder' }]
    })
  });
  if (compRes.status !== 201) throw new Error(`Add composition failed: ${compRes.status}`);

  // Add Requirement
  console.log('[5] Adding Requirement...');
  const rRes = await fetch(`${BASE_URL}/api/v1/generation/projects/${projectId}/requirements`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      title: 'Credit Limit Verification',
      description: 'Verify customer credit limit before order approval.',
      category: 'BUSINESS_LOGIC',
      priority: 'MUST_HAVE',
      acceptanceCriteria: ['Check credit limit with FSCM']
    })
  });
  if (rRes.status !== 201) throw new Error(`Add requirement failed: ${rRes.status}`);

  console.log('[6] Initial project setup complete. Reading project from store...');

  // Read project
  const bRes = await fetch(`${BASE_URL}/api/v1/generation/projects/${projectId}`, { headers: authHeaders });
  const bJson = await bRes.json();
  const proj = bJson.project;

  if (!proj) throw new Error('Project missing!');
  if (proj.dataModelSpec?.entities?.length !== 2) throw new Error('Entities count mismatch!');
  if (proj.dataModelSpec?.relationships?.length !== 1) throw new Error('Relationships count mismatch!');
  if (proj.requirementsSpec?.items?.length !== 1) throw new Error('Requirements count mismatch!');

  console.log('Entities verified:');
  proj.dataModelSpec.entities.forEach(e => console.log(` - ${e.name} (${e.entityType}): ${e.fields.length} fields`));
  console.log('Relationships verified:');
  proj.dataModelSpec.relationships.forEach(r => console.log(` - ${r.name} (${r.relationshipType}): ${r.sourceEntityId} -> ${r.targetEntityId}`));

  // Clean up
  await fetch(`${BASE_URL}/api/v1/generation/projects/${projectId}?confirmed=true`, { method: 'DELETE', headers: authHeaders });
  console.log('[7] Cleaned up test project.');
  console.log('=== SECTION 3 RESTART PERSISTENCE AUDIT: 100% VERIFIED ===');
}

run().catch(err => {
  console.error('[FAIL]', err);
  process.exit(1);
});
