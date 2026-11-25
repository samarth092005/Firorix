/**
 * Fiorify Enterprise Authentication & Identity Integration Test Suite
 * Scope: AUTH-001 through IDP-012
 *
 * Verifies:
 * - Provider selection & production fail-closed guard (AUTH-001, IDP-001)
 * - Role taxonomy & centralized permissions (AUTH-002)
 * - Insecure fallback elimination in production (AUTH-003)
 * - Token revocation lifecycle & logout (AUTH-004)
 * - Route authorization & deny-by-default enforcement (AUTH-005)
 * - Cryptographic RS256 JWT signature verification & claims validation (IDP-002, IDP-003)
 * - XSUAA scope-to-role and enterprise permission mapping (IDP-004)
 * - User identity resolution (IDP-005)
 * - Tenant isolation & boundary enforcement (IDP-006)
 * - Local auth provider isolation (IDP-007)
 * - Demo auth provider isolation (IDP-008)
 * - Tamper-evident security audit event logging with secret redaction (IDP-009)
 */

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { createServer } from '../src/server.js';
import { AssessmentStore } from '../src/services/assessmentStore.js';
import { authService, USER_ROLES, PERMISSIONS } from '../src/services/authService.js';
import { JwtVerifier } from '../src/infrastructure/security/jwtVerifier.js';
import { XsuaaAuthenticationProvider } from '../src/infrastructure/security/xsuaaProvider.js';
import { LocalAuthenticationProvider } from '../src/infrastructure/security/localAuthProvider.js';
import { DemoAuthenticationProvider } from '../src/infrastructure/security/demoAuthProvider.js';
import { AuthProviderFactory } from '../src/infrastructure/security/authProviderFactory.js';
import { SecurityAuditLogger, SECURITY_ACTIONS } from '../src/infrastructure/security/securityAuditLogger.js';

describe('Fiorify Milestone 2: Enterprise Authentication & Identity (AUTH-001 to IDP-012)', () => {
  let server;
  let baseUrl;
  let testStoragePath;
  let assessmentStore;
  let auditLogger;
  let rsaKeyPair;

  before(async () => {
    // Generate an RSA key pair for testing SAP BTP XSUAA RS256 signature verification
    rsaKeyPair = crypto.generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
    });

    testStoragePath = path.join(
      os.tmpdir(),
      `fiorify-test-auth-${Date.now()}-${Math.random().toString(36).slice(2)}.json`
    );
    assessmentStore = new AssessmentStore({ storagePath: testStoragePath });
    auditLogger = new SecurityAuditLogger();

    server = createServer({
      assessmentStore,
      securityAuditLogger: auditLogger,
      enforceAuth: true // Strict authentication enforcement for all protected routes
    });

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
      await new Promise((resolve) => server.close(resolve));
    }
    try {
      if (fs.existsSync(testStoragePath)) {
        fs.unlinkSync(testStoragePath);
      }
    } catch {}
  });

  // ==========================================
  // AUTH-001 & IDP-001: Provider Strategy & Readiness
  // ==========================================
  describe('AUTH-001 & IDP-001: Authentication Provider Strategy & Readiness', () => {
    it('1. AuthProviderFactory resolves LOCAL_AUTH in development by default', () => {
      const origEnv = process.env.NODE_ENV;
      const origProvider = process.env.FIORIFY_AUTH_PROVIDER;
      try {
        process.env.NODE_ENV = 'development';
        delete process.env.FIORIFY_AUTH_PROVIDER;
        delete process.env.VCAP_SERVICES;

        const factory = new AuthProviderFactory();
        const active = factory.getActiveProvider();
        assert.strictEqual(active.getName(), 'LOCAL_AUTH');
      } finally {
        process.env.NODE_ENV = origEnv;
        if (origProvider) process.env.FIORIFY_AUTH_PROVIDER = origProvider;
      }
    });

    it('2. AuthProviderFactory resolves DEMO_SANDBOX when FIORIFY_AUTH_PROVIDER=DEMO', () => {
      const origEnv = process.env.NODE_ENV;
      const origProvider = process.env.FIORIFY_AUTH_PROVIDER;
      try {
        process.env.NODE_ENV = 'development';
        process.env.FIORIFY_AUTH_PROVIDER = 'DEMO';

        const factory = new AuthProviderFactory();
        const active = factory.getActiveProvider();
        assert.strictEqual(active.getName(), 'DEMO_SANDBOX');
      } finally {
        process.env.NODE_ENV = origEnv;
        if (origProvider) process.env.FIORIFY_AUTH_PROVIDER = origProvider;
        else delete process.env.FIORIFY_AUTH_PROVIDER;
      }
    });

    it('3. AuthProviderFactory strictly rejects LOCAL_AUTH in production (fail-closed)', () => {
      const origEnv = process.env.NODE_ENV;
      const origProvider = process.env.FIORIFY_AUTH_PROVIDER;
      try {
        process.env.NODE_ENV = 'production';
        process.env.FIORIFY_AUTH_PROVIDER = 'LOCAL';

        const factory = new AuthProviderFactory();
        assert.throws(() => {
          factory.getActiveProvider();
        }, /strictly prohibited in production/i);
      } finally {
        process.env.NODE_ENV = origEnv;
        if (origProvider) process.env.FIORIFY_AUTH_PROVIDER = origProvider;
        else delete process.env.FIORIFY_AUTH_PROVIDER;
      }
    });

    it('4. Production XSUAA provider throws SECURITY_MISCONFIGURATION when unbound', () => {
      const origEnv = process.env.NODE_ENV;
      try {
        process.env.NODE_ENV = 'production';
        const unboundProvider = new XsuaaAuthenticationProvider({ xsuaaBinding: null });
        assert.strictEqual(unboundProvider.getStatus().configured, false);
        assert.throws(() => {
          unboundProvider.assertProductionReadiness();
        }, /Production deployment requires bound SAP BTP XSUAA service/i);
      } finally {
        process.env.NODE_ENV = origEnv;
      }
    });

    it('5. GET /api/v1/auth/provider-info exposes diagnostic status without leaking secrets', async () => {
      const res = await fetch(`${baseUrl}/api/v1/auth/provider-info`);
      const body = await res.json();
      assert.strictEqual(res.status, 200);
      assert.strictEqual(body.success, true);
      assert.ok(body.activeProvider);
      assert.ok(body.providers);
      // Ensure client secrets are never exposed in diagnostics
      assert.strictEqual(body.providers.xsuaa.clientSecret, undefined);
    });
  });

  // ==========================================
  // AUTH-002: Role Taxonomy & Centralized Permissions
  // ==========================================
  describe('AUTH-002: Role Taxonomy & RBAC Consolidation', () => {
    it('1. Confirms canonical roles: ADMIN, APPROVER, CONSULTANT, VIEWER', () => {
      assert.ok(USER_ROLES.ADMIN);
      assert.ok(USER_ROLES.APPROVER);
      assert.ok(USER_ROLES.CONSULTANT);
      assert.ok(USER_ROLES.VIEWER);
      // Backward compatibility aliases
      assert.ok(USER_ROLES.SAP_CONSULTANT);
      assert.ok(USER_ROLES.LEAD_ARCHITECT);
    });

    it('2. Confirms role permission hierarchy', () => {
      // ADMIN holds full administrative permissions
      assert.ok(authService.hasPermission(USER_ROLES.ADMIN, PERMISSIONS.ASSESSMENT_APPROVE));
      assert.ok(authService.hasPermission(USER_ROLES.ADMIN, PERMISSIONS.USER_ADMIN));
      assert.ok(authService.hasPermission(USER_ROLES.ADMIN, PERMISSIONS.CATALOGUE_IMPORT));

      // CONSULTANT holds discovery and creation permissions, but NOT USER_ADMIN
      assert.ok(authService.hasPermission(USER_ROLES.CONSULTANT, PERMISSIONS.ASSESSMENT_CREATE));
      assert.ok(authService.hasPermission(USER_ROLES.CONSULTANT, PERMISSIONS.RECOMMENDATION_GENERATE));
      assert.strictEqual(authService.hasPermission(USER_ROLES.CONSULTANT, PERMISSIONS.USER_ADMIN), false);

      // APPROVER holds approval permissions, but NOT ASSESSMENT_CREATE
      assert.ok(authService.hasPermission(USER_ROLES.APPROVER, PERMISSIONS.ASSESSMENT_APPROVE));
      assert.strictEqual(authService.hasPermission(USER_ROLES.APPROVER, PERMISSIONS.ASSESSMENT_CREATE), false);

      // VIEWER holds read-only permissions
      assert.ok(authService.hasPermission(USER_ROLES.VIEWER, PERMISSIONS.ASSESSMENT_VIEW));
      assert.strictEqual(authService.hasPermission(USER_ROLES.VIEWER, PERMISSIONS.ASSESSMENT_CREATE), false);
      assert.strictEqual(authService.hasPermission(USER_ROLES.VIEWER, PERMISSIONS.ASSESSMENT_APPROVE), false);
    });
  });

  // ==========================================
  // AUTH-003: Insecure Fallback Elimination
  // ==========================================
  describe('AUTH-003: Insecure Fallback Elimination', () => {
    it('1. Login rejects invalid password and does NOT return fake admin user', async () => {
      const res = await fetch(`${baseUrl}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'admin@fiorify.corp', password: 'incorrect-password' })
      });
      const body = await res.json();
      assert.strictEqual(res.status, 401);
      assert.strictEqual(body.success, false);
      assert.strictEqual(body.statusCode, 'UNAUTHORIZED');
      assert.strictEqual(body.token, undefined);
    });

    it('2. Login rejects empty password without bypassing', async () => {
      const res = await fetch(`${baseUrl}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'admin@fiorify.corp', password: '' })
      });
      assert.strictEqual(res.status, 401);
    });

    it('3. In production mode, dev tokens (fiorify_dev_token_*) are strictly rejected', () => {
      const origEnv = process.env.NODE_ENV;
      try {
        process.env.NODE_ENV = 'production';
        const result = authService.verifyToken('fiorify_dev_token_ADMIN');
        assert.strictEqual(result, null);
      } finally {
        process.env.NODE_ENV = origEnv;
      }
    });
  });

  // ==========================================
  // AUTH-004: Token & Session Security Lifecycle
  // ==========================================
  describe('AUTH-004: Token Revocation & Session Lifecycle', () => {
    const adminPass = process.env.FIORIFY_DEV_ADMIN_PASSWORD || 'fiorify-dev-admin-fixture';

    it('1. Successful login produces signed JWT token with valid exp claim', async () => {
      const res = await fetch(`${baseUrl}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'admin@fiorify.corp', password: adminPass })
      });
      const body = await res.json();
      assert.strictEqual(res.status, 200);
      assert.strictEqual(body.success, true);
      assert.ok(body.token);

      const verified = authService.verifyToken(body.token);
      assert.ok(verified);
      assert.strictEqual(verified.email.toLowerCase(), 'admin@fiorify.corp');
      assert.strictEqual(verified.role, USER_ROLES.ADMIN);
    });

    it('2. POST /api/v1/auth/logout revokes token; subsequent requests with revoked token return 401', async () => {
      // 1. Login to obtain token
      const loginRes = await fetch(`${baseUrl}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'admin@fiorify.corp', password: adminPass })
      });
      const loginBody = await loginRes.json();
      const token = loginBody.token;

      // 2. Verify token works before logout
      const beforeRes = await fetch(`${baseUrl}/api/v1/auth/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      assert.strictEqual(beforeRes.status, 200);

      // 3. Call logout endpoint
      const logoutRes = await fetch(`${baseUrl}/api/v1/auth/logout`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      const logoutBody = await logoutRes.json();
      assert.strictEqual(logoutRes.status, 200);
      assert.strictEqual(logoutBody.success, true);

      // 4. Verify token is revoked in authService
      assert.strictEqual(authService.isRevoked(token), true);

      // 5. Subsequent request with revoked token must be rejected with 401
      const afterRes = await fetch(`${baseUrl}/api/v1/auth/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const afterBody = await afterRes.json();
      assert.strictEqual(afterRes.status, 401);
      assert.strictEqual(afterBody.code, 'TOKEN_REVOKED');
    });
  });

  // ==========================================
  // AUTH-005: Route Authorization & Deny-by-Default
  // ==========================================
  describe('AUTH-005: Route Authorization & Deny-by-Default', () => {
    it('1. Rejects unauthenticated request to protected endpoint with 401 MISSING_TOKEN', async () => {
      const res = await fetch(`${baseUrl}/api/v1/assessments`);
      const body = await res.json();
      assert.strictEqual(res.status, 401);
      assert.strictEqual(body.code, 'MISSING_TOKEN');
      assert.strictEqual(body.statusCode, 'UNAUTHORIZED');
    });

    it('2. Rejects malformed Bearer token with 401 INVALID_TOKEN', async () => {
      const res = await fetch(`${baseUrl}/api/v1/assessments`, {
        headers: { Authorization: 'Bearer this.is.not.a.valid.jwt' }
      });
      const body = await res.json();
      assert.strictEqual(res.status, 401);
      assert.strictEqual(body.code, 'INVALID_TOKEN');
    });

    it('3. Rejects user with insufficient role on privileged route with 403 FORBIDDEN', async () => {
      // Login as VIEWER
      const viewerPass = process.env.FIORIFY_DEV_VIEWER_PASSWORD || 'fiorify-dev-viewer-fixture';
      const loginRes = await fetch(`${baseUrl}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'viewer@fiorify.corp', password: viewerPass })
      });
      const loginBody = await loginRes.json();
      const viewerToken = loginBody.token;

      // Attempt privileged catalogue sync (ADMIN only)
      const res = await fetch(`${baseUrl}/api/v1/fiori-catalogue/sync`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${viewerToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ records: [] })
      });
      const body = await res.json();
      assert.strictEqual(res.status, 403);
      assert.strictEqual(body.statusCode, 'FORBIDDEN');
    });
  });

  // ==========================================
  // IDP-002, IDP-003, IDP-004, IDP-005: XSUAA Token & Claim Validation
  // ==========================================
  describe('IDP-002 to IDP-005: SAP BTP XSUAA Cryptographic JWT Validation & Identity', () => {
    let xsuaaProvider;

    before(() => {
      xsuaaProvider = new XsuaaAuthenticationProvider({
        xsuaaBinding: {
          clientid: 'fiorify-cloud-client!b1234',
          clientsecret: 'mock-btp-secret-not-logged',
          url: 'https://fiorify-subdomain.authentication.eu30.hana.ondemand.com',
          identityzone: 'fiorify-zone-prod',
          verificationkey: rsaKeyPair.publicKey,
          xsappname: 'Fiorify'
        }
      });
    });

    it('1. Cryptographically verifies RS256 JWT signature using XSUAA verification key', async () => {
      const now = Math.floor(Date.now() / 1000);
      const token = JwtVerifier.sign(
        {
          user_name: 'S0012345678',
          email: 'sap.architect@customer.corp',
          given_name: 'Klaus',
          family_name: 'Schmidt',
          scope: ['Fiorify!b1234.FiorifyAdmin'],
          'xs.user.attributes': { tenantId: ['TENANT-ACME-01'] }
        },
        rsaKeyPair.privateKey,
        {
          algorithm: 'RS256',
          issuer: 'https://fiorify-subdomain.authentication.eu30.hana.ondemand.com',
          audience: 'fiorify-cloud-client!b1234',
          expiresInSeconds: 3600
        }
      );

      const validation = await xsuaaProvider.validateToken(token);
      assert.strictEqual(validation.isValid, true);
      assert.strictEqual(validation.user.id, 'S0012345678');
      assert.strictEqual(validation.user.name, 'Klaus Schmidt');
      assert.strictEqual(validation.user.email, 'sap.architect@customer.corp');
      assert.strictEqual(validation.user.role, USER_ROLES.ADMIN);
      assert.strictEqual(validation.user.tenantId, 'TENANT-ACME-01');
      assert.strictEqual(validation.user.isXsuaa, true);
    });

    it('2. Maps XSUAA scope FiorifyArchitect to CONSULTANT role', async () => {
      const token = JwtVerifier.sign(
        {
          user_name: 'CONS_USER_01',
          email: 'consultant@customer.corp',
          name: 'Consultant User',
          scope: ['Fiorify!b1234.FiorifyArchitect'],
          'xs.user.attributes': { tenantId: ['TENANT-ACME-01'] }
        },
        rsaKeyPair.privateKey,
        {
          algorithm: 'RS256',
          audience: 'fiorify-cloud-client!b1234',
          expiresInSeconds: 3600
        }
      );

      const validation = await xsuaaProvider.validateToken(token);
      assert.strictEqual(validation.isValid, true);
      assert.strictEqual(validation.user.role, USER_ROLES.SAP_CONSULTANT);
      assert.ok(validation.user.scopes.includes(PERMISSIONS.ASSESSMENT_CREATE));
    });

    it('3. Rejects token with invalid RSA signature', async () => {
      // Sign with a different RSA key
      const rogueKey = crypto.generateKeyPairSync('rsa', {
        modulusLength: 2048,
        publicKeyEncoding: { type: 'spki', format: 'pem' },
        privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
      });

      const rogueToken = JwtVerifier.sign(
        { user_name: 'hacker', scope: ['Fiorify!b1234.FiorifyAdmin'] },
        rogueKey.privateKey,
        { algorithm: 'RS256', audience: 'fiorify-cloud-client!b1234' }
      );

      const validation = await xsuaaProvider.validateToken(rogueToken);
      assert.strictEqual(validation.isValid, false);
      assert.ok(validation.error.includes('signature'));
    });

    it('4. Rejects token with alg: none attack', async () => {
      const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
      const payload = Buffer.from(JSON.stringify({ user_name: 'admin', scope: ['FiorifyAdmin'] })).toString('base64url');
      const unsignedToken = `${header}.${payload}.`;

      const validation = await xsuaaProvider.validateToken(unsignedToken);
      assert.strictEqual(validation.isValid, false);
      assert.ok(validation.error.toLowerCase().includes('forbidden') || validation.error.toLowerCase().includes('not permitted'));
    });

    it('5. Rejects expired token', async () => {
      const expiredExp = Math.floor(Date.now() / 1000) - 100;
      const expiredToken = JwtVerifier.sign(
        { user_name: 'user', exp: expiredExp },
        rsaKeyPair.privateKey,
        { algorithm: 'RS256', expiresInSeconds: -100, audience: 'fiorify-cloud-client!b1234' }
      );

      const validation = await xsuaaProvider.validateToken(expiredToken);
      assert.strictEqual(validation.isValid, false);
      assert.ok(validation.error.includes('expired'));
    });

    it('6. Rejects token with mismatched audience', async () => {
      const wrongAudToken = JwtVerifier.sign(
        { user_name: 'user', scope: ['FiorifyAdmin'] },
        rsaKeyPair.privateKey,
        { algorithm: 'RS256', audience: 'completely-different-application!b999' }
      );

      const validation = await xsuaaProvider.validateToken(wrongAudToken);
      assert.strictEqual(validation.isValid, false);
      assert.ok(validation.error.includes('Invalid audience'));
    });
  });

  // ==========================================
  // IDP-006: Tenant Isolation & Boundary Enforcement
  // ==========================================
  describe('IDP-006: Tenant Isolation & Boundary Enforcement', () => {
    const consultantPass = process.env.FIORIFY_DEV_CONSULTANT_PASSWORD || 'fiorify-dev-consultant-fixture';
    const adminPass = process.env.FIORIFY_DEV_ADMIN_PASSWORD || 'fiorify-dev-admin-fixture';

    it('1. Rejects cross-tenant spoofing attempt via x-tenant-id for non-admin user', async () => {
      // Login as CONSULTANT (tenant: DEFAULT-TENANT-S21)
      const loginRes = await fetch(`${baseUrl}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'consultant@fiorify.corp', password: consultantPass })
      });
      const loginBody = await loginRes.json();
      const token = loginBody.token;

      // Attempt to access another customer's tenant
      const res = await fetch(`${baseUrl}/api/v1/assessments`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'X-Tenant-Id': 'FOREIGN-TENANT-XYZ'
        }
      });
      const body = await res.json();
      assert.strictEqual(res.status, 401);
      assert.strictEqual(body.code, 'TENANT_SPOOFING_FORBIDDEN');
    });

    it('2. Permits cross-tenant administrative governance for ADMIN user', async () => {
      // Login as ADMIN
      const loginRes = await fetch(`${baseUrl}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'admin@fiorify.corp', password: adminPass })
      });
      const loginBody = await loginRes.json();
      const adminToken = loginBody.token;

      // ADMIN can administer specific customer tenant
      const res = await fetch(`${baseUrl}/api/v1/assessments`, {
        headers: {
          Authorization: `Bearer ${adminToken}`,
          'X-Tenant-Id': 'CUSTOMER-TENANT-42'
        }
      });
      const body = await res.json();
      assert.strictEqual(res.status, 200, `Expected 200 but got ${res.status}: ${JSON.stringify(body)}`);
    });
  });

  // ==========================================
  // IDP-007 & IDP-008: Local & Demo Provider Isolation
  // ==========================================
  describe('IDP-007 & IDP-008: Local & Demo Provider Isolation', () => {
    it('1. LocalAuthenticationProvider verifies scrypt password asynchronously', async () => {
      const localProvider = new LocalAuthenticationProvider();
      const consultantPass = process.env.FIORIFY_DEV_CONSULTANT_PASSWORD || 'fiorify-dev-consultant-fixture';
      const result = await localProvider.authenticate('consultant@fiorify.corp', consultantPass);
      assert.strictEqual(result.success, true);
      assert.ok(result.token);
      assert.strictEqual(result.user.email, 'consultant@fiorify.corp');

      // Validates token
      const valid = await localProvider.validateToken(result.token);
      assert.strictEqual(valid.isValid, true);
      assert.strictEqual(valid.user.role, USER_ROLES.SAP_CONSULTANT);
    });

    it('2. DemoAuthenticationProvider tags user with isDemo: true and demo tenant', async () => {
      const demoProvider = new DemoAuthenticationProvider();
      const result = await demoProvider.authenticate('admin@fiorify.corp');
      assert.strictEqual(result.success, true);
      assert.strictEqual(result.user.isDemo, true);
      assert.strictEqual(result.user.tenantId, 'DEMO-SANDBOX-S21');

      const valid = await demoProvider.validateToken(result.token);
      assert.strictEqual(valid.isValid, true);
      assert.strictEqual(valid.user.isDemo, true);
    });
  });

  // ==========================================
  // IDP-009: Tamper-Evident Security Audit Event Logging
  // ==========================================
  describe('IDP-009: Tamper-Evident Security Audit Logging', () => {
    it('1. Logs security events with redacted secrets and intact SHA-256 cryptographic chain', async () => {
      const logger = new SecurityAuditLogger();
      const tenantId = `TEST-TENANT-${Date.now()}`;

      // 1. Log event 1
      const e1 = await logger.logEvent({
        actor: 'USR-ADMIN-01',
        tenantId,
        action: SECURITY_ACTIONS.LOGIN_SUCCESS,
        resource: '/api/v1/auth/login',
        outcome: 'SUCCESS',
        details: {
          password: 'SecretPlainPassword123!',
          token: 'sensitive-jwt-token-sample',
          clientIp: '127.0.0.1'
        }
      });

      // Verify secrets are redacted
      const saved1 = logger._fallbackEvents.find(e => e.eventId === e1.event_id || e.eventId === e1.eventId);
      assert.ok(saved1);
      assert.strictEqual(saved1.details.password, '[REDACTED]');
      assert.strictEqual(saved1.details.token, '[REDACTED]');
      assert.strictEqual(saved1.details.clientIp, '127.0.0.1');

      // 2. Log event 2 (Chained)
      const e2 = await logger.logEvent({
        actor: 'USR-CONS-01',
        tenantId,
        action: SECURITY_ACTIONS.PERMISSION_DENIED,
        resource: '/api/v1/fiori-catalogue/sync',
        outcome: 'DENIED',
        details: { userRole: 'CONSULTANT' }
      });

      // 3. Verify cryptographic chain integrity
      const chain = await logger.verifyChain(tenantId);
      assert.strictEqual(chain.valid, true);
      assert.ok(chain.count >= 2);
      assert.ok(chain.latestHash);
    });
  });
});
