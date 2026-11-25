/**
 * Fiorify Milestone 2.1: Security Hardening, Token Lifecycle & Production Architecture Tests
 *
 * Verifies:
 * 1. TokenRevocationStore SHA-256 hashing, expiration, and purge.
 * 2. RefreshTokenService family tracking, rotation, and reuse attack defense.
 * 3. AuthProviderFactory fail-closed production invariants (rejection of LOCAL & DEMO in production).
 * 4. Comprehensive secret redaction across nested objects and audit logs.
 * 5. SecurityAuditLogger event constants and cryptographic chain verification.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import crypto from 'node:crypto';

import { TokenRevocationStore, MemoryTokenRevocationStore } from '../src/infrastructure/security/tokenRevocationStore.js';
import { RefreshTokenService } from '../src/infrastructure/security/refreshTokenService.js';
import { AuthProviderFactory } from '../src/infrastructure/security/authProviderFactory.js';
import { AuthService } from '../src/services/authService.js';
import { SecurityAuditLogger, SECURITY_ACTIONS } from '../src/infrastructure/security/securityAuditLogger.js';

describe('Fiorify Milestone 2.1: Enterprise Security Hardening & Architecture Verification', () => {

  describe('1. TokenRevocationStore (SEC-004 Distributed Invalidation Design)', () => {
    it('hashes tokens via SHA-256 and does not store plaintext tokens in memory keys', async () => {
      const store = new MemoryTokenRevocationStore();
      const plaintextToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.dummy_token_sample';
      const expectedHash = crypto.createHash('sha256').update(plaintextToken).digest('hex');

      await store.revoke(plaintextToken, { userId: 'USR-01', reason: 'USER_LOGOUT' });

      assert.strictEqual(await store.isRevoked(plaintextToken), true);
      assert.strictEqual(store._revocations.has(expectedHash), true);
      assert.strictEqual(store._revocations.has(plaintextToken), false);
    });

    it('returns false for unrevoked tokens', async () => {
      const store = new MemoryTokenRevocationStore();
      assert.strictEqual(await store.isRevoked('unrevoked_token_xyz'), false);
    });

    it('purges expired revocation entries correctly', async () => {
      const store = new MemoryTokenRevocationStore();
      const expiredToken = 'expired_token_123';
      const activeToken = 'active_token_456';

      // Revoke with past expiration
      await store.revoke(expiredToken, { expiresAt: Date.now() - 10000 });
      // Revoke with future expiration
      await store.revoke(activeToken, { expiresAt: Date.now() + 60000 });

      const purgedCount = await store.purgeExpired();
      assert.strictEqual(purgedCount, 1);
      assert.strictEqual(await store.isRevoked(expiredToken), false);
      assert.strictEqual(await store.isRevoked(activeToken), true);
    });

    it('getStatus() reports storage durability status and notes SEC-001 dependency', () => {
      const store = new MemoryTokenRevocationStore();
      const status = store.getStatus();
      assert.strictEqual(status.storeType, 'MEMORY_VOLATILE');
      assert.strictEqual(status.distributed, false);
      assert.strictEqual(status.milestoneDependency, 'SEC-001 to DB-010');
    });
  });

  describe('2. RefreshTokenService (Token Family Rotation & Reuse Detection)', () => {
    it('creates a token family with hashed token and UUID family identifier', async () => {
      const service = new RefreshTokenService();
      const user = { id: 'USR-ADMIN-01', email: 'admin@fiorify.corp', role: 'ADMIN', tenantId: 'T1' };

      const result = await service.createTokenFamily(user);
      assert.ok(result.refreshToken.startsWith('fiorify_rt_'));
      assert.ok(result.familyId.startsWith('fam_'));
      assert.ok(result.expiresAt);
    });

    it('rotates refresh token cleanly upon legitimate refresh request', async () => {
      const service = new RefreshTokenService();
      const user = { id: 'USR-CONS-01', email: 'consultant@fiorify.corp', role: 'CONSULTANT' };

      const initial = await service.createTokenFamily(user);
      const rotated = await service.rotateRefreshToken(initial.refreshToken);

      assert.strictEqual(rotated.success, true);
      assert.notStrictEqual(rotated.newRefreshToken, initial.refreshToken);
      assert.strictEqual(rotated.familyId, initial.familyId);
      assert.strictEqual(rotated.user.email, user.email);
    });

    it('detects replay attack when old refresh token is reused, revoking entire family', async () => {
      const service = new RefreshTokenService();
      const user = { id: 'USR-VIEW-01', email: 'viewer@fiorify.corp', role: 'VIEWER' };

      const initial = await service.createTokenFamily(user);
      // Legitimate client consumes token
      const rotation1 = await service.rotateRefreshToken(initial.refreshToken);
      assert.strictEqual(rotation1.success, true);

      // Attacker tries to reuse the intercepted initial token!
      const replayAttempt = await service.rotateRefreshToken(initial.refreshToken);
      assert.strictEqual(replayAttempt.success, false);
      assert.strictEqual(replayAttempt.error, 'REFRESH_TOKEN_REUSE_DETECTED');
      assert.strictEqual(replayAttempt.reuseDetected, true);

      // Invariant: The new legitimate token is now also revoked due to family invalidation
      const subsequentAttempt = await service.rotateRefreshToken(rotation1.newRefreshToken);
      assert.strictEqual(subsequentAttempt.success, false);
      assert.strictEqual(subsequentAttempt.error, 'TOKEN_FAMILY_REVOKED');
    });

    it('revokes entire token family upon explicit logout', async () => {
      const service = new RefreshTokenService();
      const user = { id: 'USR-APPR-01', email: 'approver@fiorify.corp', role: 'APPROVER' };

      const initial = await service.createTokenFamily(user);
      await service.revokeToken(initial.refreshToken, 'LOGOUT');

      const attempt = await service.rotateRefreshToken(initial.refreshToken);
      assert.strictEqual(attempt.success, false);
      assert.strictEqual(attempt.error, 'TOKEN_FAMILY_REVOKED');
    });
  });

  describe('3. Production Fail-Closed Provider Invariants', () => {
    it('strictly rejects FIORIFY_AUTH_PROVIDER=DEMO in production mode', () => {
      const origEnv = process.env.NODE_ENV;
      const origProvider = process.env.FIORIFY_AUTH_PROVIDER;
      try {
        process.env.NODE_ENV = 'production';
        process.env.FIORIFY_AUTH_PROVIDER = 'DEMO';

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

    it('strictly rejects FIORIFY_AUTH_PROVIDER=LOCAL in production mode', () => {
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

    it('assertProductionReadiness() enforces that active provider is SAP_BTP_XSUAA', () => {
      const origEnv = process.env.NODE_ENV;
      try {
        process.env.NODE_ENV = 'production';
        const unboundFactory = new AuthProviderFactory({
          xsuaaProvider: {
            getName: () => 'SAP_BTP_XSUAA',
            assertProductionReadiness: () => {
              const err = new Error('Unbound XSUAA');
              err.code = 'SECURITY_MISCONFIGURATION';
              throw err;
            }
          }
        });

        assert.throws(() => {
          unboundFactory.assertProductionReadiness();
        }, /Unbound XSUAA/);
      } finally {
        process.env.NODE_ENV = origEnv;
      }
    });
  });

  describe('4. Enhanced Secret Redaction (AuthService.redactSecrets)', () => {
    it('redacts all sensitive keys including refresh tokens, private keys, and authorization headers', () => {
      const payload = {
        username: 'admin',
        password: 'superSecretPassword123',
        token: 'eyJhbGciOi...',
        refreshToken: 'fiorify_rt_xyz987',
        privateKey: '-----BEGIN PRIVATE KEY-----...',
        verificationKey: '-----BEGIN PUBLIC KEY-----...',
        client_secret: 'btp-client-secret-value',
        apiKey: 'api-secret-key',
        nested: {
          authorization: 'Bearer sensitive-token',
          normalData: 'visible-value'
        }
      };

      const redacted = AuthService.redactSecrets(payload);
      assert.strictEqual(redacted.password, '[REDACTED]');
      assert.strictEqual(redacted.token, '[REDACTED]');
      assert.strictEqual(redacted.refreshToken, '[REDACTED]');
      assert.strictEqual(redacted.privateKey, '[REDACTED]');
      assert.strictEqual(redacted.verificationKey, '[REDACTED]');
      assert.strictEqual(redacted.client_secret, '[REDACTED]');
      assert.strictEqual(redacted.apiKey, '[REDACTED]');
      assert.strictEqual(redacted.nested.authorization, '[REDACTED]');
      assert.strictEqual(redacted.nested.normalData, 'visible-value');
    });
  });

  describe('5. SecurityAuditLogger Event Completeness & Cryptographic Chain', () => {
    it('defines all required Milestone 2.1 security actions', () => {
      const required = [
        'LOGIN_SUCCESS',
        'LOGIN_FAILURE',
        'LOGOUT',
        'TOKEN_REFRESH',
        'TOKEN_REVOKED',
        'TOKEN_VERIFICATION_FAILED',
        'RBAC_DENIED',
        'TENANT_ACCESS_DENIED',
        'SECURITY_CONFIGURATION_FAILURE'
      ];

      for (const action of required) {
        assert.ok(SECURITY_ACTIONS[action], `Missing required action: ${action}`);
        assert.strictEqual(SECURITY_ACTIONS[action], action);
      }
    });

    it('logs audit events and verifies unbroken SHA-256 hash chain', async () => {
      const logger = new SecurityAuditLogger({
        getClient: async () => { throw new Error('DB offline - use fallback'); },
        query: async () => { throw new Error('DB offline - use fallback'); }
      });

      const tenantId = `TEST-TENANT-${Date.now()}`;

      await logger.logEvent({
        actor: 'user1',
        tenantId,
        action: SECURITY_ACTIONS.LOGIN_SUCCESS,
        resource: '/api/v1/auth/login'
      });

      await logger.logEvent({
        actor: 'user1',
        tenantId,
        action: SECURITY_ACTIONS.RBAC_DENIED,
        resource: '/api/v1/system/reset-demo',
        outcome: 'DENIED'
      });

      await logger.logEvent({
        actor: 'user1',
        tenantId,
        action: SECURITY_ACTIONS.LOGOUT,
        resource: '/api/v1/auth/logout'
      });

      const verification = await logger.verifyChain(tenantId);
      assert.strictEqual(verification.valid, true);
      assert.strictEqual(verification.count, 3);
      assert.ok(verification.latestHash);
    });
  });
});
