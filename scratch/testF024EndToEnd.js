/**
 * scratch/testF024EndToEnd.js
 *
 * Internal end-to-end pipeline test for T-Code F024 without modifying codebase.
 * Tests:
 * 1. Discovery & Evidence Matching
 * 2. Fit-Gap Assessment Formulation (synthesizing BUILD recommendation)
 * 3. Assessment Record Persistence (PERSIST-01)
 * 4. Governance & Lead Architect Approval (PERSIST-02)
 * 5. Generation Handoff Creation (GHF-*)
 * 6. Generation Studio Project Provisioning (GEN-F024)
 * 7. Requirements Confirmation & Scope Locking
 * 8. Clean Core Architecture Evaluation
 * 9. ABAP Cloud Code Generation (CDS, BDEF, Classes, SRVD)
 * 10. Fiori Elements UI5 Generation (Manifest, Annotations, UI5 config)
 * 11. Local Mock Preview Server Launch
 */

const BASE_URL = 'http://localhost:4004/api/v1';

async function request(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = { raw: text };
  }
  return { status: res.status, ok: res.ok, data: json };
}

async function run() {
  console.log('=======================================================');
  console.log('🚀 FIORIX INTERNAL PIPELINE TEST: T-CODE F024');
  console.log('=======================================================\n');

  // STEP 1: AUTHENTICATION
  console.log('--- Step 1: Admin Authentication ---');
  const loginRes = await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: 'admin@fiorix.corp', password: 'AdminPass@2026' })
  });
  if (!loginRes.ok) {
    throw new Error(`Login failed (${loginRes.status}): ${JSON.stringify(loginRes.data)}`);
  }
  const token = loginRes.data.token;
  const authHeaders = { Authorization: `Bearer ${token}` };
  console.log(`✓ Authenticated as: ${loginRes.data.user?.name} (${loginRes.data.user?.role})\n`);

  // STEP 2: DISCOVERY & MATCHING
  console.log('--- Step 2: Unified Discovery & Matching for F024 ---');
  const matchRes = await request('/discovery/match', {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ tcode: 'F024', systemId: 'S21-200' })
  });
  if (!matchRes.ok) {
    throw new Error(`Discovery Match failed (${matchRes.status}): ${JSON.stringify(matchRes.data)}`);
  }
  const matchData = matchRes.data;
  console.log(`✓ Discovery Status: ${matchData.discovery?.verificationStatus} (${matchData.discovery?.description})`);
  console.log(`✓ Standard Fiori Candidates: ${matchData.candidates?.length} (${matchData.matching?.matchClassification})`);
  console.log(`✓ Recommendation Readiness: ${matchData.matching?.recommendationReadiness}\n`);

  // STEP 3: FIT-GAP ASSESSMENT
  console.log('--- Step 3: Fit-Gap Assessment Formulation ---');
  const fitGapPayload = {
    requirement: matchData.assessmentHandoff?.requirement || {
      title: 'Modernise custom transaction F024',
      tcode: 'F024',
      statement: 'Proprietary transaction F024 requires Clean Core RAP modernization.',
      businessProcess: 'Finance & Document Clearing',
      capabilities: ['Document Clearing', 'Line Item Display', 'Fiori Elements UI'],
      isCustom: true
    },
    candidate: null,
    context: {
      systemId: 'S21-200',
      client: '200',
      systemRelease: 'SAP S/4HANA 2023 Private Edition'
    }
  };

  const fitGapRes = await request('/fitgap/assess', {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify(fitGapPayload)
  });
  if (!fitGapRes.ok) {
    throw new Error(`Fit-Gap Assessment failed (${fitGapRes.status}): ${JSON.stringify(fitGapRes.data)}`);
  }
  console.log(`✓ Fit-Gap Score: ${fitGapRes.data.overallScore}`);
  console.log(`✓ Candidate Assigned: ${fitGapRes.data.assessment?.candidateAppId} (${fitGapRes.data.assessment?.candidateAppName})\n`);

  // STEP 4: PERSIST ASSESSMENT RECORD
  console.log('--- Step 4: Persist Assessment Record ---');
  const assessmentPayload = {
    tcode: 'F024',
    description: 'Post Document / Financial Clearing F024',
    businessArea: 'Finance',
    subArea: 'General Ledger',
    complexity: 'MEDIUM',
    systemId: 'S21-200',
    targetRelease: 'SAP S/4HANA 2023 Private Edition',
    packageName: 'FBAS',
    programName: 'SAPMF05A',
    matchingFioriApp: null,
    candidateApps: [],
    assessmentResult: 'BUILD',
    status: 'PENDING_REVIEW',
    recommendation: {
      outcome: 'BUILD',
      type: 'BUILD',
      action: 'BUILD',
      title: 'Clean Core RAP Modernization Required',
      description: 'Transaction F024 has 0 standard Fiori application candidates. Build custom RAP Managed Application with Fiori Elements List Report and Object Page.',
      cleanCoreRating: 'GREEN',
      extensibilityTier: 'TIER_2',
      outstandingChecks: [
        'Define CDS View Entity for financial document header and line items.',
        'Implement RAP Managed behavior definition with draft capability.',
        'Publish OData V4 service binding.'
      ]
    },
    identifiedGaps: [
      'No standard SAP Fiori application exists for F024.',
      'Classical Dynpro UI requires modern responsive Fiori Elements floorplan.'
    ],
    fitGapFindings: fitGapRes.data.assessment || {}
  };

  const persistRes = await request('/assessments', {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify(assessmentPayload)
  });
  if (!persistRes.ok) {
    throw new Error(`Assessment persistence failed (${persistRes.status}): ${JSON.stringify(persistRes.data)}`);
  }
  const savedAssessment = persistRes.data.assessment || persistRes.data;
  const assessmentId = savedAssessment.id || savedAssessment.assessmentId;
  console.log(`✓ Assessment Created: ID = ${assessmentId} (Outcome = ${savedAssessment.assessmentResult || savedAssessment.recommendation?.outcome})\n`);

  // STEP 5: GOVERNANCE & LEAD ARCHITECT SIGN-OFF
  console.log('--- Step 5: Lead Architect Sign-Off & Approval ---');
  const approveRes = await request(`/assessments/${assessmentId}`, {
    method: 'PUT',
    headers: authHeaders,
    body: JSON.stringify({
      status: 'APPROVED',
      lifecycleStatus: 'APPROVED',
      leadArchitectApproval: {
        approved: true,
        approver: 'Marcus Vance (Lead Enterprise Architect)',
        approverId: 'USR-ADMIN-01',
        approvedAt: new Date().toISOString(),
        justification: 'Approved custom Clean Core RAP build for F024 due to 0 standard Fiori candidates.'
      }
    })
  });
  if (!approveRes.ok) {
    throw new Error(`Assessment approval failed (${approveRes.status}): ${JSON.stringify(approveRes.data)}`);
  }
  console.log(`✓ Assessment ${assessmentId} status advanced to: APPROVED\n`);

  // STEP 6: ISSUE GENERATION HANDOFF
  console.log('--- Step 6: Create Generation Handoff Token ---');
  const handoffRes = await request('/generation/handoff', {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      sourceAssessmentId: assessmentId,
      tcode: 'F024',
      architectApproved: true,
      cleanCoreJustification: 'Zero standard Fiori apps exist. Clean Core Tier 2 custom build approved.'
    })
  });
  if (!handoffRes.ok) {
    throw new Error(`Handoff creation failed (${handoffRes.status}): ${JSON.stringify(handoffRes.data)}`);
  }
  const handoffId = handoffRes.data.handoff?.handoffId || handoffRes.data.handoffId;
  console.log(`✓ Handoff Token Generated: ${handoffId}\n`);

  // STEP 7: PROVISION GENERATION STUDIO PROJECT
  console.log('--- Step 7: Provision Generation Studio Project ---');
  const projectRes = await request('/generation/projects', {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      handoffId: handoffId,
      sourceAssessmentId: assessmentId,
      projectName: 'F024 — Financial Clearing & Document Posting',
      description: 'Clean Core RAP modernization for classical transaction F024',
      rootEntityName: 'Z_I_F024Doc'
    })
  });
  if (!projectRes.ok) {
    throw new Error(`Project provisioning failed (${projectRes.status}): ${JSON.stringify(projectRes.data)}`);
  }
  const project = projectRes.data.project;
  const projectId = project.projectId;
  console.log(`✓ Project Provisioned: ID = ${projectId} (Name: "${project.projectName}")`);
  console.log(`✓ Root Entity: ${project.rootEntityName}`);
  console.log(`✓ Imported Requirements Count: ${project.requirementsSpec?.items?.length || 0}\n`);

  // STEP 8: CONFIRM ALL REQUIREMENTS
  console.log('--- Step 8: Confirm Scope Requirements ---');
  const reqs = project.requirementsSpec?.items || [];
  for (const r of reqs) {
    const confirmRes = await request(`/generation/projects/${projectId}/requirements/${r.requirementId}/confirm`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ action: 'CONFIRM', reason: 'Verified for automated RAP generation.' })
    });
    if (confirmRes.ok) {
      console.log(`  ✓ Confirmed requirement: ${r.requirementId} — ${r.title}`);
    }
  }
  console.log();

  // STEP 9: DATA MODEL INITIALIZATION / SUGGESTION
  console.log('--- Step 9: Synthesize Data Model Entities ---');
  const suggestRes = await request(`/generation/projects/${projectId}/datamodel/suggest`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({})
  });
  if (suggestRes.ok && suggestRes.data.suggestedDataModel) {
    const saveModelRes = await request(`/generation/projects/${projectId}/datamodel`, {
      method: 'PUT',
      headers: authHeaders,
      body: JSON.stringify(suggestRes.data.suggestedDataModel)
    });
    console.log(`✓ Data Model Entities Saved: ${suggestRes.data.suggestedDataModel.entities?.map(e => e.name).join(', ')}\n`);
  }

  // STEP 10: ARCHITECTURE EVALUATION
  console.log('--- Step 10: Evaluate RAP Architecture Profile ---');
  const archRes = await request(`/generation/projects/${projectId}/architecture/evaluate`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({})
  });
  if (!archRes.ok) {
    throw new Error(`Architecture evaluation failed (${archRes.status}): ${JSON.stringify(archRes.data)}`);
  }
  const arch = archRes.data.architecture;
  console.log(`✓ Architecture Profile: ${arch.selectedProfile}`);
  console.log(`✓ Persistence Strategy: ${arch.persistenceApproach}`);
  console.log(`✓ Rationale: ${arch.rationale}\n`);

  // STEP 11: GENERATE ABAP ARTIFACTS
  console.log('--- Step 11: Synthesize Clean Core ABAP Artifacts ---');
  const abapRes = await request(`/generation/projects/${projectId}/abap/generate`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ forceOverwrite: true })
  });
  if (!abapRes.ok) {
    throw new Error(`ABAP generation failed (${abapRes.status}): ${JSON.stringify(abapRes.data)}`);
  }
  console.log(`✓ ABAP Generation Complete! Total artifacts: ${abapRes.data.totalGenerated}`);
  (abapRes.data.artifacts || []).forEach(a => {
    console.log(`  - [${a.artifactType}] ${a.objectName || a.filePath} (${a.language || 'ABAP'})`);
  });
  console.log();

  // STEP 12: GENERATE FIORI UI5 ARTIFACTS
  console.log('--- Step 12: Synthesize Fiori Elements UI Application ---');
  const fioriRes = await request(`/generation/projects/${projectId}/fiori/generate`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      appId: 'f024.manage.payments',
      pageTitle: 'Manage Financial Clearings (F024)'
    })
  });
  if (!fioriRes.ok) {
    throw new Error(`Fiori UI generation failed (${fioriRes.status}): ${JSON.stringify(fioriRes.data)}`);
  }
  console.log(`✓ Fiori UI Generation Complete! Total artifacts: ${fioriRes.data.totalGenerated}`);
  (fioriRes.data.artifacts || []).forEach(a => {
    console.log(`  - [${a.artifactType}] ${a.filePath}`);
  });
  console.log();

  // STEP 13: LAUNCH IN-PROCESS LOCAL MOCK PREVIEW SERVER
  console.log('--- Step 13: Boot Local Mock Preview Server ---');
  const previewRes = await request(`/generation/projects/${projectId}/preview/start`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({})
  });
  if (!previewRes.ok) {
    console.warn(`Preview start returned status ${previewRes.status}:`, previewRes.data);
  } else {
    const session = previewRes.data.session;
    console.log(`✓ Preview Server Running!`);
    console.log(`  - Port: ${session.port}`);
    console.log(`  - Preview URL: ${session.previewUrl}`);
    console.log(`  - OData Service Root: ${session.serviceBasePath}`);
  }
  console.log();

  console.log('=======================================================');
  console.log('🎉 PIPELINE COMPLETED SUCCESSFULLY FOR T-CODE F024!');
  console.log('=======================================================');
  console.log(`Assessment Record:  http://localhost:5173/assessment-results/${assessmentId}`);
  console.log(`Generation Studio:  http://localhost:5173/generation-studio?projectId=${projectId}&view=abap-generator`);
  console.log(`Live Fiori Preview: http://localhost:5173/generation-studio?projectId=${projectId}&view=preview-validation`);
  console.log('=======================================================\n');
}

run().catch(err => {
  console.error('\n❌ PIPELINE FAILED AT STEP:');
  console.error(err);
  process.exit(1);
});
