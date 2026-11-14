/**
 * Fiorify — Sprint 13.1 Application Security Hardening Test Suite
 *
 * Verifies:
 * - Scope A (REM-SEC-01): Separation of duties enforcement & admin-only override protection
 * - Scope B (REM-SEC-02): Authentication defaults, production enforcement, dev impersonation boundaries
 * - Scope C (REM-SEC-05): SAP HTTP endpoint canonicalization, path traversal, encoding & host defense
 */

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { createServer } from '../src/server.js';
import { AssessmentStore, LIFECYCLE_STATES } from '../src/services/assessmentStore.js';
import { authService, USER_ROLES } from '../src/services/authService.js';
import { SapHttpClient } from '../src/infrastructure/connectivity/sapHttpClient.js';

describe('Sprint 13.1: Application Security Hardening', () => {
  let devServer;
  let devBaseUrl;
  let prodServer;
  let prodBaseUrl;
  let testStoragePath;
  let assessmentStore;

  const DEV_ADMIN_SECRET = 'test-dev-admin-secret-2026';

  before(async () => {
    testStoragePath = path.join(
      os.tmpdir(),
      `fiorify-sec13-test-${Date.now()}-${Math.random().toString(36).slice(2)}.json`
    );
    assessmentStore = new AssessmentStore({ storagePath: testStoragePath });

    // Set dev secret for dev server
    process.env.FIORIFY_ADMIN_SECRET = DEV_ADMIN_SECRET;

    // 1. Development server (NODE_ENV !== production, enforceAuth = false)
    devServer = createServer({
      assessmentStore,
      enforceAuth: false
    });

    await new Promise((resolve) => {
      devServer.listen(0, '127.0.0.1', () => {
        const port = devServer.address().port;
        devBaseUrl = `http://127.0.0.1:${port}`;
        resolve();
      });
    });

    // 2. Simulated Production server (NODE_ENV = production)
    const prevNodeEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    prodServer = createServer({
      assessmentStore
    });
    process.env.NODE_ENV = prevNodeEnv;

    await new Promise((resolve) => {
      prodServer.listen(0, '127.0.0.1', () => {
        const port = prodServer.address().port;
        prodBaseUrl = `http://127.0.0.1:${port}`;
        resolve();
      });
    });
  });

  after(async () => {
    delete process.env.FIORIFY_ADMIN_SECRET;
    if (devServer) {
      await new Promise((resolve) => devServer.close(resolve));
    }
    if (prodServer) {
      await new Promise((resolve) => prodServer.close(resolve));
    }
    try {
      if (fs.existsSync(testStoragePath)) {
        fs.unlinkSync(testStoragePath);
      }
    } catch {}
  });

  // ==========================================
  // SCOPE A: REM-SEC-01 Separation of Duties
  // ==========================================
  describe('Scope A — REM-SEC-01: Separation of Duties & Administrative Override', () => {
    let testAssessmentId;

    before(async () => {
      const created = await assessmentStore.create({
        tcode: 'VA01',
        systemId: 'S21-200',
        createdBy: 'USR-CONS-01'
      });
      await assessmentStore.update(created.id, {
        lifecycleStatus: LIFECYCLE_STATES.RECOMMENDATION_COMPLETED
      });
      await assessmentStore.submitForReview(created.id, 'USR-CONS-01');
      testAssessmentId = created.id;
    });

    it('A1. Rejects creator attempting to approve their own assessment without override', async () => {
      const res = await fetch(`${devBaseUrl}/api/v1/assessments/${testAssessmentId}/approve`, {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer Fiorify_dev_token_sap_consultant',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ comment: 'Self approval attempt' })
      });

      assert.strictEqual(res.status, 403);
      const body = await res.json();
      assert.strictEqual(body.statusCode, 'FORBIDDEN'); // Consultant doesn't have APPROVER or ADMIN role
    });

    it('A2. Rejects non-admin (Consultant/Approver) attempting override with isOverride: true', async () => {
      // Create assessment by USR-APPR-01 to test approver self-approval with isOverride
      const approverSelfItem = await assessmentStore.create({
        tcode: 'MM01',
        systemId: 'S21-200',
        createdBy: 'USR-APPR-01'
      });
      await assessmentStore.update(approverSelfItem.id, {
        lifecycleStatus: LIFECYCLE_STATES.PENDING_REVIEW
      });

      const res = await fetch(`${devBaseUrl}/api/v1/assessments/${approverSelfItem.id}/approve`, {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer Fiorify_dev_token_approver',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          comment: 'Approver trying to self-approve with isOverride: true',
          isOverride: true
        })
      });

      assert.strictEqual(res.status, 403);
      const body = await res.json();
      assert.strictEqual(body.statusCode, 'UNAUTHORIZED_OVERRIDE');
      assert.ok(body.errorMessage.includes('Administrative override requires explicit authenticated ADMIN authorization'));
    });

    it('A3. Allows authenticated ADMIN to execute administrative override with audit trail', async () => {
      const adminSelfItem = await assessmentStore.create({
        tcode: 'ME21N',
        systemId: 'S21-200',
        createdBy: 'USR-ADMIN-01'
      });
      await assessmentStore.update(adminSelfItem.id, {
        lifecycleStatus: LIFECYCLE_STATES.PENDING_REVIEW
      });

      const res = await fetch(`${devBaseUrl}/api/v1/assessments/${adminSelfItem.id}/approve`, {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer Fiorify_dev_token_admin',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          comment: 'Chief Platform Architect emergency administrative override approved.',
          isOverride: true
        })
      });

      assert.strictEqual(res.status, 200);
      const body = await res.json();
      assert.strictEqual(body.success, true);
      assert.strictEqual(body.assessment.lifecycleStatus, LIFECYCLE_STATES.APPROVED);

      // Verify audit event details record the administrative override
      const events = body.assessment.auditEvents;
      const lastEvent = events[events.length - 1];
      assert.strictEqual(lastEvent.action, 'ADMIN_OVERRIDE_APPROVED');
      assert.strictEqual(lastEvent.details.administrativeOverride, true);
    });

    it('A4. Direct service invocation cannot bypass authorization check when isOverride: true', async () => {
      const directItem = await assessmentStore.create({
        tcode: 'IW31',
        systemId: 'S21-200',
        createdBy: 'USR-CONS-01'
      });
      await assessmentStore.update(directItem.id, {
        lifecycleStatus: LIFECYCLE_STATES.PENDING_REVIEW
      });

      // Direct invocation with unauthenticated or non-admin context must throw
      const nonAdminContext = { id: 'USR-CONS-01', name: 'Lead Consultant', role: USER_ROLES.SAP_CONSULTANT };
      await assert.rejects(
        async () => {
          await assessmentStore.approve(directItem.id, nonAdminContext, 'Direct bypass attempt', true);
        },
        (err) => {
          assert.strictEqual(err.code, 'UNAUTHORIZED_OVERRIDE');
          return true;
        }
      );
    });
  });

  // ==========================================
  // SCOPE B: REM-SEC-02 Authentication Defaults
  // ==========================================
  describe('Scope B — REM-SEC-02: Authentication Defaults & Dev Boundaries', () => {
    it('B1. Production server rejects unauthenticated requests with HTTP 401', async () => {
      const prev = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      try {
        const res = await fetch(`${prodBaseUrl}/api/v1/assessments`);
        assert.strictEqual(res.status, 401);
        const body = await res.json();
        assert.strictEqual(body.success, false);
        assert.strictEqual(body.code, 'MISSING_TOKEN');
      } finally {
        process.env.NODE_ENV = prev;
      }
    });

    it('B2. Rejects invalid tokens with HTTP 401', async () => {
      const res = await fetch(`${devBaseUrl}/api/v1/assessments`, {
        headers: {
          'Authorization': 'Bearer totally-invalid-bogus-token-xyz'
        }
      });
      assert.strictEqual(res.status, 401);
      const body = await res.json();
      assert.strictEqual(body.code, 'INVALID_TOKEN');
    });

    it('B3. Unauthenticated requests in dev receive VIEWER (minimum permission), NEVER ADMIN', async () => {
      // In dev with unenforced auth, call an endpoint that returns current user or rejects ADMIN actions
      // Calling a role-gated admin endpoint (e.g. POST /api/v1/fiori-catalogue/sync) must return 403
      const res = await fetch(`${devBaseUrl}/api/v1/fiori-catalogue/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ records: [] })
      });
      assert.strictEqual(res.status, 403);
      const body = await res.json();
      assert.strictEqual(body.statusCode, 'FORBIDDEN');
      assert.ok(body.errorMessage.includes('Role "VIEWER" is not authorized'));
    });

    it('B4. Development impersonation headers fail without valid admin secret', async () => {
      const res = await fetch(`${devBaseUrl}/api/v1/assessments`, {
        headers: {
          'x-fiorify-admin-user': 'USR-ATTACKER-01',
          'x-fiorify-dev-role': 'ADMIN'
          // Omitting x-fiorify-admin-secret
        }
      });
      assert.strictEqual(res.status, 401);
      const body = await res.json();
      assert.strictEqual(body.code, 'DEV_IMPERSONATION_REQUIRES_SECRET');
    });

    it('B5. Development impersonation is completely forbidden and rejected in production', async () => {
      const prev = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      try {
        const res = await fetch(`${prodBaseUrl}/api/v1/assessments`, {
          headers: {
            'x-fiorify-admin-secret': DEV_ADMIN_SECRET,
            'x-fiorify-admin-user': 'USR-ADMIN-01'
          }
        });
        assert.strictEqual(res.status, 401);
        const body = await res.json();
        assert.strictEqual(body.code, 'DEV_IMPERSONATION_FORBIDDEN_IN_PRODUCTION');
      } finally {
        process.env.NODE_ENV = prev;
      }
    });

    it('B6. Missing tenant context in production fails safely with 401', async () => {
      const prev = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      try {
        // Generate a token that explicitly lacks tenantId
        const tokenWithoutTenant = authService.generateToken({
          id: 'USR-NO-TENANT',
          email: 'notenant@fiorify.corp',
          role: USER_ROLES.VIEWER,
          tenantId: '' // No tenant
        }, { tenantId: '' });

        const res = await fetch(`${prodBaseUrl}/api/v1/assessments`, {
          headers: {
            'Authorization': `Bearer ${tokenWithoutTenant}`
            // Omitting x-tenant-id header
          }
        });
        assert.strictEqual(res.status, 401);
        const body = await res.json();
        assert.strictEqual(body.code, 'MISSING_TENANT_CONTEXT');
      } finally {
        process.env.NODE_ENV = prev;
      }
    });
  });

  // ==========================================
  // SCOPE C: REM-SEC-05 SAP HTTP Canonicalization
  // ==========================================
  describe('Scope C — REM-SEC-05: SAP HTTP Endpoint Canonicalization & Traversal Defense', () => {
    const client = new SapHttpClient({
      allowedHosts: ['s21.corp.internal', 'localhost', '127.0.0.1']
    });

    it('C1. Legitimate allowlisted SAP paths pass canonicalization', () => {
      assert.strictEqual(
        client.assertAllowedEndpoint('/sap/opu/odata/IWFND/CATALOGSERVICE;v=2/ServiceCollection'),
        '/sap/opu/odata/IWFND/CATALOGSERVICE;v=2/ServiceCollection'
      );
      assert.strictEqual(
        client.assertAllowedEndpoint('/sap/opu/odata4/sap/z_order/srvd/sap/z_order/0001/$metadata'),
        '/sap/opu/odata4/sap/z_order/srvd/sap/z_order/0001/$metadata'
      );
      assert.strictEqual(
        client.assertAllowedEndpoint('/sap/bc/adt/discovery'),
        '/sap/bc/adt/discovery'
      );
      assert.strictEqual(
        client.assertAllowedEndpoint('/sap/bc/echo'),
        '/sap/bc/echo'
      );
      assert.strictEqual(
        client.assertAllowedEndpoint('https://s21.corp.internal:8000/sap/opu/odata/sap/Z_DEMO_SRV/$metadata'),
        '/sap/opu/odata/sap/Z_DEMO_SRV/$metadata'
      );
    });

    it('C2. Rejects raw directory traversal attempt (/sap/bc/adt/../admin)', () => {
      assert.throws(
        () => client.assertAllowedEndpoint('/sap/bc/adt/../admin'),
        (err) => {
          assert.strictEqual(err.code, 'DISALLOWED_SAP_ENDPOINT');
          assert.ok(err.message.includes('Path traversal attempt detected') || err.message.includes('outside the Fiorify SAP Diagnostic Allowlist'));
          return true;
        }
      );
    });

    it('C3. Rejects single URL-encoded traversal (%2e%2e)', () => {
      assert.throws(
        () => client.assertAllowedEndpoint('/sap/bc/adt/%2e%2e/admin'),
        (err) => {
          assert.strictEqual(err.code, 'DISALLOWED_SAP_ENDPOINT');
          return true;
        }
      );
    });

    it('C4. Rejects double URL-encoded traversal (%252e%252e)', () => {
      assert.throws(
        () => client.assertAllowedEndpoint('/sap/bc/adt/%252e%252e/admin'),
        (err) => {
          assert.strictEqual(err.code, 'DISALLOWED_SAP_ENDPOINT');
          return true;
        }
      );
    });

    it('C5. Rejects ambiguous encoded separators (%2f, %5c) and null bytes', () => {
      assert.throws(
        () => client.assertAllowedEndpoint('/sap/bc%2fadt/discovery'),
        (err) => {
          assert.strictEqual(err.code, 'DISALLOWED_SAP_ENDPOINT');
          assert.ok(err.message.includes('Ambiguous encoded separator'));
          return true;
        }
      );

      assert.throws(
        () => client.assertAllowedEndpoint('/sap/bc/adt/discovery\0admin'),
        (err) => {
          assert.strictEqual(err.code, 'INVALID_ENDPOINT');
          return true;
        }
      );
    });

    it('C6. Rejects unapproved paths and unapproved destination hosts', () => {
      // Disallowed path
      assert.throws(
        () => client.assertAllowedEndpoint('/admin/exec-cmd'),
        /UNAUTHORIZED SAP ENDPOINT ACCESS BLOCKED/
      );

      // Disallowed host (SSRF attempt)
      assert.throws(
        () => client.assertAllowedEndpoint('https://evil-attacker.com/sap/bc/adt/discovery'),
        (err) => {
          assert.strictEqual(err.code, 'DISALLOWED_SAP_ENDPOINT');
          assert.ok(err.message.includes('is not an approved SAP destination host'));
          return true;
        }
      );

      // Disallowed protocol
      assert.throws(
        () => client.assertAllowedEndpoint('ftp://s21.corp.internal/sap/bc/echo'),
        (err) => {
          assert.strictEqual(err.code, 'DISALLOWED_SAP_ENDPOINT');
          assert.ok(err.message.includes('is forbidden. Only HTTP/HTTPS permitted'));
          return true;
        }
      );

      // Protocol-relative host change
      assert.throws(
        () => client.assertAllowedEndpoint('//evil-attacker.com/sap/bc/echo'),
        (err) => {
          assert.strictEqual(err.code, 'DISALLOWED_SAP_ENDPOINT');
          return true;
        }
      );
    });

    it('C7. Preserves read-only mutation boundary (assertReadOnly blocks POST, PUT, DELETE)', () => {
      assert.doesNotThrow(() => client.assertReadOnly('GET'));
      assert.doesNotThrow(() => client.assertReadOnly('HEAD'));
      assert.doesNotThrow(() => client.assertReadOnly('OPTIONS'));

      assert.throws(() => client.assertReadOnly('POST'), /SAP WRITE OPERATION BLOCKED/);
      assert.throws(() => client.assertReadOnly('PUT'), /SAP WRITE OPERATION BLOCKED/);
      assert.throws(() => client.assertReadOnly('DELETE'), /SAP WRITE OPERATION BLOCKED/);
      assert.throws(() => client.assertReadOnly('PATCH'), /SAP WRITE OPERATION BLOCKED/);
    });
  });
});
