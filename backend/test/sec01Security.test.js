/**
 * Security & RBAC Test Suite (SEC-01)
 * 
 * Verifies:
 * - Authentication endpoints (/api/v1/auth/login, /logout, /me)
 * - Token validation & dev tokens
 * - RBAC role checks (ADMIN, SAP_CONSULTANT, REQUESTER, APPROVER, VIEWER)
 * - Protection of privileged endpoints (approve, reject, system diagnostics, catalogue sync)
 * - Separation of duties (prevent self-approval without admin override)
 * - Secret redaction
 */

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { createServer } from '../src/server.js';
import { AssessmentStore } from '../src/services/assessmentStore.js';
import { authService, USER_ROLES } from '../src/services/authService.js';

describe('SEC-01: Authentication, RBAC and Security Enforcement', () => {
  let server;
  let baseUrl;
  let testStoragePath;
  let assessmentStore;

  before(async () => {
    testStoragePath = path.join(
      os.tmpdir(),
      `fiorix-test-sec01-${Date.now()}-${Math.random().toString(36).slice(2)}.json`
    );
    assessmentStore = new AssessmentStore({ storagePath: testStoragePath });
    server = createServer({ assessmentStore });

    await new Promise((resolve) => {
      server.listen(0, () => {
        const port = server.address().port;
        baseUrl = `http://127.0.0.1:${port}`;
        resolve();
      });
    });
  });

  after(async () => {
    if (server) {
      await new Promise(resolve => server.close(resolve));
    }
    try {
      if (fs.existsSync(testStoragePath)) {
        fs.unlinkSync(testStoragePath);
      }
    } catch {
      // Ignore
    }
  });

  it('1. Rejects login with invalid credentials', async () => {
    const res = await fetch(`${baseUrl}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'wrongpassword' })
    });
    const body = await res.json();
    assert.strictEqual(res.status, 401);
    assert.strictEqual(body.success, false);
    assert.strictEqual(body.error, 'INVALID_CREDENTIALS');
  });

  it('2. Authenticates valid admin user and returns sanitized profile + token', async () => {
    const res = await fetch(`${baseUrl}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'admin-dev-password' })
    });
    const body = await res.json();
    assert.strictEqual(res.status, 200);
    assert.strictEqual(body.success, true);
    assert.ok(body.token);
    assert.strictEqual(body.user.username, 'admin');
    assert.strictEqual(body.user.role, 'ADMIN');
    // Ensure password hash is never leaked
    assert.strictEqual(body.user.passwordHash, undefined);
  });

  it('3. GET /api/v1/auth/me resolves identity from Authorization Bearer token', async () => {
    const consultantToken = 'fiorix_dev_token_sap_consultant';
    const res = await fetch(`${baseUrl}/api/v1/auth/me`, {
      headers: {
        'Authorization': `Bearer ${consultantToken}`
      }
    });
    const body = await res.json();
    assert.strictEqual(res.status, 200);
    assert.strictEqual(body.authenticated, true);
    assert.strictEqual(body.user.role, 'SAP_CONSULTANT');
  });

  it('4. Enforces RBAC: VIEWER role cannot submit review or approve', async () => {
    const created = await assessmentStore.create({
      tcode: 'VA01',
      systemId: 'S21-200',
      createdBy: 'USR-CONS-01'
    });

    await assessmentStore.update(created.id, {
      lifecycleStatus: 'RECOMMENDATION_COMPLETED'
    });

    const res = await fetch(`${baseUrl}/api/v1/assessments/${created.id}/approve`, {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer fiorix_dev_token_viewer',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ comments: 'I approve as viewer' })
    });

    const body = await res.json();
    assert.strictEqual(res.status, 403);
    assert.strictEqual(body.statusCode, 'FORBIDDEN');
    assert.ok(body.errorMessage.includes('Role "VIEWER" is not authorized'));
  });

  it('5. Enforces RBAC & Separation of Duties: Creator cannot approve own assessment', async () => {
    const created = await assessmentStore.create({
      tcode: 'ME21N',
      systemId: 'S21-200',
      createdBy: 'USR-APPR-01'
    });

    await assessmentStore.update(created.id, {
      lifecycleStatus: 'RECOMMENDATION_COMPLETED'
    });

    await fetch(`${baseUrl}/api/v1/assessments/${created.id}/submit-review`, {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer fiorix_dev_token_sap_consultant'
      }
    });

    const res = await fetch(`${baseUrl}/api/v1/assessments/${created.id}/approve`, {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer fiorix_dev_token_approver',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ comments: 'Self approval attempt' })
    });

    const body = await res.json();
    assert.strictEqual(res.status, 403);
    assert.strictEqual(body.statusCode, 'SEPARATION_OF_DUTIES_VIOLATION');
    assert.ok(body.errorMessage.toLowerCase().includes('separation of duties'));
  });

  it('6. Allows APPROVER to approve assessment created by another user', async () => {
    const created = await assessmentStore.create({
      tcode: 'FB01',
      systemId: 'S21-200',
      createdBy: 'USR-CONS-01'
    });

    await assessmentStore.update(created.id, {
      lifecycleStatus: 'RECOMMENDATION_COMPLETED'
    });

    await assessmentStore.submitForReview(created.id, 'USR-CONS-01');

    const res = await fetch(`${baseUrl}/api/v1/assessments/${created.id}/approve`, {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer fiorix_dev_token_approver',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ comments: 'Architectural compliance verified. Approved for deployment.' })
    });

    const body = await res.json();
    assert.strictEqual(res.status, 200);
    assert.strictEqual(body.assessment.lifecycleStatus, 'APPROVED');
    assert.strictEqual(body.assessment.governanceReview.approvedBy, 'USR-APPR-01');
  });

  it('7. Enforces RBAC: Only ADMIN or SAP_CONSULTANT can run system diagnostics', async () => {
    const viewerRes = await fetch(`${baseUrl}/api/v1/systems/ECC-100/diagnostics`, {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer fiorix_dev_token_viewer'
      }
    });
    assert.strictEqual(viewerRes.status, 403);

    const adminRes = await fetch(`${baseUrl}/api/v1/systems/ECC-100/diagnostics`, {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer fiorix_dev_token_admin'
      }
    });
    const adminBody = await adminRes.json();
    assert.strictEqual(adminRes.status, 200);
    assert.strictEqual(adminBody.success, true);
    assert.ok(adminBody.checks);
    assert.strictEqual(adminBody.systemId, 'ECC-100');
  });

  it('8. Enforces RBAC: Only ADMIN can perform catalogue sync', async () => {
    const consRes = await fetch(`${baseUrl}/api/v1/fiori-catalogue/sync`, {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer fiorix_dev_token_sap_consultant',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ records: [] })
    });
    assert.strictEqual(consRes.status, 403);

    const adminRes = await fetch(`${baseUrl}/api/v1/fiori-catalogue/sync`, {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer fiorix_dev_token_admin',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ records: [], dryRun: true })
    });
    const adminBody = await adminRes.json();
    assert.strictEqual(adminRes.status, 200);
    assert.strictEqual(adminBody.success, true);
  });

  it('9. Cryptographic Audit Chain Verification returns intact status', async () => {
    const assessment = await assessmentStore.create({
      tcode: 'MIGO',
      systemId: 'S21-200',
      createdBy: 'USR-CONS-01'
    });

    await assessmentStore.update(assessment.id, {
      lifecycleStatus: 'RECOMMENDATION_COMPLETED'
    });

    const verifyRes = await fetch(`${baseUrl}/api/v1/assessments/${assessment.id}/verify-audit`, {
      headers: {
        'Authorization': 'Bearer fiorix_dev_token_admin'
      }
    });

    const verifyBody = await verifyRes.json();
    assert.strictEqual(verifyRes.status, 200);
    assert.strictEqual(verifyBody.success, true);
    assert.strictEqual(verifyBody.auditChain.verified, true);
    assert.ok(verifyBody.auditChain.eventCount >= 2);
  });
});
