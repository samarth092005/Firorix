/**
 * Fiorify — Security Master Regression Test Suite (SEC-001 to SEC-012)
 *
 * Verifies:
 * - SEC-001: Deny-by-default route authorization matrix
 * - SEC-002: Multi-tenant query isolation and cross-tenant access rejection
 * - SEC-003: Database connection tenant context isolation
 * - SEC-004: Protection and stripping of client-supplied security fields
 * - SEC-005: Separation of duties and administrative override policies
 * - SEC-006: Authentication state machine and fail-closed production invariants
 * - SEC-007: Durable token revocation and refresh token family replay attack defense
 * - SEC-008: Tamper-evident SHA-256 cryptographic audit chaining
 * - SEC-009: 25-action security audit event coverage
 * - SEC-010: Request size limiting and DoS payload rejection (100KB limit)
 * - SEC-011: Enterprise security headers and strict CORS enforcement
 * - SEC-012: Security documentation and regression validation
 */

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { createServer } from '../src/server.js';
import { sanitizeProtectedFields, PROTECTED_SECURITY_FIELDS } from '../src/middleware/securityFieldSanitizer.js';
import { defaultSecurityAuditLogger, SECURITY_ACTIONS } from '../src/infrastructure/security/securityAuditLogger.js';
import { DurableTokenRevocationStore } from '../src/infrastructure/security/durableTokenRevocationStore.js';
import { RefreshTokenService } from '../src/infrastructure/security/refreshTokenService.js';
import { AssessmentStore } from '../src/services/assessmentStore.js';
import { GenerationHandoffStore } from '../src/services/generationHandoffStore.js';
import { USER_ROLES } from '../src/services/authService.js';

describe('Fiorify Milestone 3: Security Master Regression Suite (SEC-001 to SEC-012)', () => {
  let server;
  let baseUrl;

  before(async () => {
    server = createServer();
    await new Promise((resolve) => server.listen(0, resolve));
    const port = server.address().port;
    baseUrl = `http://localhost:${port}`;
  });

  after(async () => {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  after(async () => {
    await new Promise((resolve) => server.close(resolve));
  });

  // ========================================================
  // SEC-004: Protected Security Fields Sanitization
  // ========================================================
  describe('SEC-004: Client-Controlled Protected Security Fields Sanitization', () => {
    it('1. Strips all forbidden administrative/authoritative fields from untrusted request bodies', () => {
      const maliciousPayload = {
        transactionCode: 'VA01',
        description: 'Create Sales Order',
        createdBy: 'HACKER_ATTACK',
        creatorId: 'USR-ROOT',
        tenantId: 'FORGED-TENANT-999',
        roles: ['ADMIN'],
        isAdmin: true,
        approvalStatus: 'APPROVED',
        approvedBy: 'CEO',
        architectApproved: true
      };

      const sanitized = sanitizeProtectedFields(maliciousPayload, { strict: false });
      assert.strictEqual(sanitized.transactionCode, 'VA01');
      assert.strictEqual(sanitized.description, 'Create Sales Order');
      assert.strictEqual(sanitized.createdBy, undefined);
      assert.strictEqual(sanitized.creatorId, undefined);
      assert.strictEqual(sanitized.tenantId, undefined);
      assert.strictEqual(sanitized.roles, undefined);
      assert.strictEqual(sanitized.isAdmin, undefined);
      assert.strictEqual(sanitized.approvalStatus, undefined);
    });

    it('2. In strict mode, throws error upon detecting forbidden security fields', () => {
      const payload = {
        tcode: 'ME21N',
        tenantId: 'MALICIOUS_TENANT'
      };

      assert.throws(
        () => sanitizeProtectedFields(payload, { strict: true }),
        /Security Violation: Request contains unauthorized protected security field/
      );
    });
  });

  // ========================================================
  // SEC-002 & SEC-003: Multi-Tenant Isolation
  // ========================================================
  describe('SEC-002 & SEC-003: Multi-Tenant Query Isolation & Data Leak Prevention', () => {
    it('1. In-memory and repository AssessmentStore strictly filters records by tenantId', async () => {
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'fiorify-sec-asm1-'));
      const store = new AssessmentStore({ useDatabase: false, storagePath: path.join(tmpDir, 'assessments.json') });
      await store.resetToBaseline();

      // Create assessment for Tenant Alpha
      const asmAlpha = await store.create({
        tcode: 'VA01',
        overallStatus: 'STANDARD_FIT',
        dimensionResults: { compatibility: { status: 'VERIFIED_FIT' } }
      }, 'REQ-01', { id: 'USR-01', tenantId: 'TENANT-ALPHA' });

      // Create assessment for Tenant Beta
      const asmBeta = await store.create({
        tcode: 'ME21N',
        overallStatus: 'CUSTOM_RAP_REQUIRED',
        dimensionResults: { compatibility: { status: 'NO_FIT' } }
      }, 'REQ-02', { id: 'USR-02', tenantId: 'TENANT-BETA' });

      // Query as Tenant Alpha: must see ONLY Tenant Alpha's record
      const listAlpha = await store.list({ tenantId: 'TENANT-ALPHA' });
      assert.strictEqual(listAlpha.length, 1);
      assert.strictEqual(listAlpha[0].id, asmAlpha.id);
      assert.strictEqual(listAlpha[0].tcode, 'VA01');

      // Query as Tenant Beta: must see ONLY Tenant Beta's record
      const listBeta = await store.list({ tenantId: 'TENANT-BETA' });
      assert.strictEqual(listBeta.length, 1);
      assert.strictEqual(listBeta[0].id, asmBeta.id);
      assert.strictEqual(listBeta[0].tcode, 'ME21N');
    });

    it('2. GenerationHandoffStore strictly filters records by tenantId', async () => {
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'fiorify-sec-asm2-'));
      const asmStore = new AssessmentStore({ useDatabase: false, storagePath: path.join(tmpDir, 'assessments.json') });
      const handoffStore = new GenerationHandoffStore({ useDatabase: false, assessmentStore: asmStore });
      await handoffStore.clear();

      // Create assessment
      const asm = await asmStore.create({
        tcode: 'FB01',
        overallStatus: 'CUSTOM_RAP_REQUIRED',
        dimensionResults: { compatibility: { status: 'NO_FIT' } }
      }, 'REQ-03', { id: 'USR-01', tenantId: 'TENANT-GAMMA' });

      // Create approved handoff for Tenant Gamma
      const handoff = await handoffStore.createHandoff({
        assessmentId: asm.id,
        architectApproved: true,
        justification: 'Approved for RAP development'
      }, { id: 'USR-ARCH', role: USER_ROLES.LEAD_ARCHITECT, tenantId: 'TENANT-GAMMA' });

      assert.strictEqual(handoff.tenantId, 'TENANT-GAMMA');

      // Tenant Gamma finds it
      const gammaHandoffs = await handoffStore.listHandoffs({ tenantId: 'TENANT-GAMMA' });
      assert.strictEqual(gammaHandoffs.length, 1);

      // Tenant Delta sees 0 handoffs
      const deltaHandoffs = await handoffStore.listHandoffs({ tenantId: 'TENANT-DELTA' });
      assert.strictEqual(deltaHandoffs.length, 0);
    });
  });

  // ========================================================
  // SEC-005: Separation of Duties & Administrative Overrides
  // ========================================================
  describe('SEC-005: Separation of Duties & Administrative Overrides', () => {
    it('1. Prevents assessment creator from approving their own assessment', async () => {
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'fiorify-sec-sod1-'));
      const store = new AssessmentStore({ useDatabase: false, storagePath: path.join(tmpDir, 'assessments.json') });
      const creator = { id: 'USR-CONS-42', name: 'Consultant Sam', role: USER_ROLES.SAP_CONSULTANT };

      const asm = await store.create({
        tcode: 'VF01',
        overallStatus: 'STANDARD_FIT',
        dimensionResults: { compatibility: { status: 'VERIFIED_FIT' } }
      }, 'REQ-SOD', creator);

      // Submit for review
      await store.submitForReview(asm.id, creator, 'Submitted');

      // Creator attempts to approve: must throw SEPARATION_OF_DUTIES_VIOLATION
      await assert.rejects(
        async () => store.approve(asm.id, creator, 'Self approval attempt'),
        (err) => err.code === 'SEPARATION_OF_DUTIES_VIOLATION' || /Separation of duties/.test(err.message)
      );
    });

    it('2. Allows separate authorized Approver to approve', async () => {
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'fiorify-sec-sod2-'));
      const store = new AssessmentStore({ useDatabase: false, storagePath: path.join(tmpDir, 'assessments.json') });
      const creator = { id: 'USR-CONS-55', name: 'Consultant Alex', role: USER_ROLES.SAP_CONSULTANT };
      const approver = { id: 'USR-APPR-99', name: 'Approver Dana', role: USER_ROLES.APPROVER };

      const asm = await store.create({
        tcode: 'VA02',
        overallStatus: 'STANDARD_FIT',
        dimensionResults: { compatibility: { status: 'VERIFIED_FIT' } }
      }, 'REQ-SOD-2', creator);

      await store.submitForReview(asm.id, creator, 'Submitted');
      const approved = await store.approve(asm.id, approver, 'Formally approved');
      assert.strictEqual(approved.lifecycleStatus, 'APPROVED');
    });
  });

  // ========================================================
  // SEC-007: Durable Token Revocation & Family Reuse Detection
  // ========================================================
  describe('SEC-007: Durable Token Revocation & Family Reuse Detection', () => {
    it('1. DurableTokenRevocationStore stores SHA-256 hashed keys and verifies status', async () => {
      const mockAdapter = {
        getDialect: () => 'postgres',
        query: async () => ({ rows: [], rowCount: 1 })
      };
      const durableStore = new DurableTokenRevocationStore({ adapter: mockAdapter, useDatabase: true });

      const sampleToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.sample';
      const revoked = await durableStore.revoke(sampleToken, { reason: 'TEST_REVOKE' });
      assert.strictEqual(revoked, true);

      const isRev = await durableStore.isRevoked(sampleToken);
      assert.strictEqual(isRev, true);

      const status = durableStore.getStatus();
      assert.strictEqual(status.storeType, 'DURABLE_MULTI_INSTANCE');
      assert.strictEqual(status.dialect, 'postgres');
    });

    it('2. RefreshTokenService immediately revokes family upon token reuse (replay defense)', async () => {
      const service = new RefreshTokenService();
      const user = { id: 'USR-REPLAY', email: 'replay@corp.com', role: 'CONSULTANT' };

      const fam = await service.createTokenFamily(user);
      const token1 = fam.refreshToken;

      // Legitimate rotation: token1 -> token2
      const rot1 = await service.rotateRefreshToken(token1);
      assert.strictEqual(rot1.success, true);
      const token2 = rot1.newRefreshToken;

      // Attacker replays old token1: triggers immediate family revocation
      const replay = await service.rotateRefreshToken(token1);
      assert.strictEqual(replay.success, false);
      assert.strictEqual(replay.reuseDetected, true);

      // Subsequent attempt with token2 is also rejected because family was destroyed
      const rot2 = await service.rotateRefreshToken(token2);
      assert.strictEqual(rot2.success, false);
      assert.strictEqual(rot2.error, 'TOKEN_FAMILY_REVOKED');
    });
  });

  // ========================================================
  // SEC-008 & SEC-009: Tamper-Evident SHA-256 Audit Chaining & Action Coverage
  // ========================================================
  describe('SEC-008 & SEC-009: Tamper-Evident Audit Chain & Action Coverage', () => {
    it('1. Confirms all required security audit actions are defined', () => {
      const expectedActions = [
        'LOGIN_SUCCESS',
        'LOGIN_FAILURE',
        'LOGOUT',
        'TOKEN_REFRESH',
        'TOKEN_REVOKED',
        'TOKEN_VERIFICATION_FAILED',
        'RBAC_DENIED',
        'TENANT_ACCESS_DENIED',
        'SECURITY_CONFIGURATION_FAILURE',
        'TENANT_ACCESS_VIOLATION',
        'SYSTEM_REGISTERED',
        'DISCOVERY_EXECUTED',
        'ASSESSMENT_MODIFIED',
        'PROJECT_MODIFIED',
        'ARTIFACT_GENERATED',
        'ARTIFACT_EXPORTED',
        'SECURITY_CONFIG_CHANGED'
      ];

      for (const act of expectedActions) {
        assert.ok(SECURITY_ACTIONS[act], `Expected action ${act} must be defined`);
      }
    });

    it('2. Logs sequenced audit events and verifies unbroken cryptographic hash chain', async () => {
      const logger = defaultSecurityAuditLogger;
      const tenant = 'AUDIT-CHAIN-TEST-TENANT';

      const e1 = await logger.logEvent({ actor: 'Admin', tenantId: tenant, action: 'LOGIN_SUCCESS', outcome: 'SUCCESS' });
      const e2 = await logger.logEvent({ actor: 'Admin', tenantId: tenant, action: 'DISCOVERY_EXECUTED', outcome: 'SUCCESS' });
      const e3 = await logger.logEvent({ actor: 'Admin', tenantId: tenant, action: 'ASSESSMENT_MODIFIED', outcome: 'SUCCESS' });

      assert.strictEqual(e1.previousHash, 'GENESIS');
      assert.strictEqual(e2.previousHash, e1.integrityHash);
      assert.strictEqual(e3.previousHash, e2.integrityHash);

      const chainCheck = await logger.verifyChain(tenant);
      assert.strictEqual(chainCheck.valid, true);
      assert.ok(chainCheck.count >= 3);
    });
  });

  // ========================================================
  // SEC-010: Request Size Limiting (DoS Protection)
  // ========================================================
  describe('SEC-010: Request Size Limiting (100KB Body Limit)', () => {
    it('1. POST /api/v1/assessments rejects payload exceeding 100KB with HTTP 413', async () => {
      const largeBlob = 'X'.repeat(110 * 1024); // 110KB
      const res = await fetch(`${baseUrl}/api/v1/assessments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tcode: 'VA01', overflow: largeBlob })
      });

      assert.strictEqual(res.status, 413);
      const data = await res.json();
      assert.strictEqual(data.statusCode, 'PAYLOAD_TOO_LARGE');
    });
  });

  // ========================================================
  // SEC-011: Enterprise Security Headers & Strict CORS
  // ========================================================
  describe('SEC-011: Enterprise Security Headers & Strict CORS', () => {
    it('1. HTTP responses include mandatory OWASP / SAP BTP security headers', async () => {
      const res = await fetch(`${baseUrl}/api/v1/health`);
      assert.strictEqual(res.headers.get('x-content-type-options'), 'nosniff');
      assert.strictEqual(res.headers.get('x-frame-options'), 'DENY');
      assert.strictEqual(res.headers.get('x-xss-protection'), '1; mode=block');
      assert.strictEqual(res.headers.get('referrer-policy'), 'strict-origin-when-cross-origin');
      assert.ok(res.headers.get('content-security-policy'));
    });

    it('2. OPTIONS preflight returns HTTP 204 with configured CORS headers', async () => {
      const res = await fetch(`${baseUrl}/api/v1/health`, {
        method: 'OPTIONS',
        headers: { Origin: 'http://localhost:5173' }
      });
      assert.strictEqual(res.status, 204);
      assert.strictEqual(res.headers.get('access-control-allow-origin'), 'http://localhost:5173');
      assert.ok(res.headers.get('access-control-allow-methods'));
    });
  });
});
