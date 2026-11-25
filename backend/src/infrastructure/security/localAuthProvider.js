/**
 * Fiorify Local Development Authentication Provider (IDP-007)
 *
 * Implements password authentication using asynchronous scrypt and RFC 7519 JWT
 * tokens for local development, testing, and CI environments.
 *
 * Strictly prohibited in production environments (fail-closed guard).
 */

import { JwtVerifier } from './jwtVerifier.js';
import { verifyPassword, hashPasswordSync, USER_ROLES, ROLE_PERMISSIONS, getDevUserPassword, DEFAULT_USERS } from '../../services/authService.js';
import crypto from 'node:crypto';

export function buildLocalDevUsers() {
  if (process.env.NODE_ENV === 'production') {
    return Object.freeze([]);
  }
  return DEFAULT_USERS;
}

export const LOCAL_DEV_USERS = buildLocalDevUsers();

export class LocalAuthenticationProvider {
  constructor(options = {}) {
    this.options = options;
    this.jwtSecret = options.jwtSecret || process.env.FIORIFY_JWT_SECRET || 'fiorify-enterprise-local-auth-secret-2026';
    this.tokenTtlSeconds = options.tokenTtlSeconds || 24 * 3600; // 24h
    this.users = new Map(
      (options.users || LOCAL_DEV_USERS).map((u) => [u.email.toLowerCase(), { ...u }])
    );
  }

  getName() {
    return 'LOCAL_AUTH';
  }

  getStatus() {
    const isProduction = process.env.NODE_ENV === 'production';
    return {
      provider: 'LOCAL_AUTH',
      status: isProduction ? 'DISABLED_IN_PRODUCTION' : 'ACTIVE',
      configured: !isProduction,
      userCount: this.users.size,
      algorithm: 'HS256 (HMAC-SHA256)',
      tokenTtlSeconds: this.tokenTtlSeconds
    };
  }

  assertProductionReadiness() {
    if (process.env.NODE_ENV === 'production') {
      const err = new Error(
        'SECURITY INVARIANT VIOLATION: Local authentication provider is strictly forbidden in production. ' +
        'Configure SAP BTP XSUAA binding or an approved enterprise OIDC provider.'
      );
      err.code = 'SECURITY_MISCONFIGURATION';
      throw err;
    }
    return true;
  }

  /**
   * Authenticate with email and password
   */
  async authenticate(identifier, password) {
    this.assertProductionReadiness();

    if (!identifier || typeof password !== 'string' || password.length === 0) {
      return { success: false, error: 'INVALID_CREDENTIALS', errorMessage: 'Identifier and password are required' };
    }

    const cleanId = String(identifier).trim().toLowerCase();
    let user = this.users.get(cleanId);
    if (!user) {
      for (const u of this.users.values()) {
        if (
          u.email.toLowerCase() === cleanId ||
          u.email.toLowerCase().startsWith(cleanId + '@') ||
          u.id.toLowerCase() === cleanId ||
          u.role.toLowerCase() === cleanId
        ) {
          user = u;
          break;
        }
      }
    }

    if (!user) {
      return { success: false, error: 'INVALID_CREDENTIALS', errorMessage: 'Invalid user credentials' };
    }

    const verification = await verifyPassword(password, user.passwordHash);

    // Development password exceptions strictly in non-production
    const isDevPass = (process.env.NODE_ENV !== 'production') && (
      ((password === (process.env.FIORIFY_DEV_ADMIN_PASSWORD || 'fiorify-dev-admin-fixture') || password === 'admin-dev-password') && user.role === USER_ROLES.ADMIN) ||
      (password === (process.env.FIORIFY_DEV_CONSULTANT_PASSWORD || 'fiorify-dev-consultant-fixture') && user.role === USER_ROLES.SAP_CONSULTANT) ||
      (password === (process.env.FIORIFY_DEV_APPROVER_PASSWORD || 'fiorify-dev-approver-fixture') && user.role === USER_ROLES.APPROVER) ||
      (password === (process.env.FIORIFY_DEV_ARCHITECT_PASSWORD || 'fiorify-dev-architect-fixture') && user.role === USER_ROLES.LEAD_ARCHITECT) ||
      (password === (process.env.FIORIFY_DEV_VIEWER_PASSWORD || 'fiorify-dev-viewer-fixture') && user.role === USER_ROLES.VIEWER)
    );

    if (!verification.valid && !isDevPass) {
      return { success: false, error: 'INVALID_CREDENTIALS', errorMessage: 'Invalid user credentials' };
    }

    const payload = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      tenantId: user.tenantId || 'DEFAULT-TENANT-S21',
      department: user.department,
      scopes: ROLE_PERMISSIONS[user.role] || [],
      authProvider: 'LOCAL_AUTH'
    };

    const token = JwtVerifier.sign(payload, this.jwtSecret, {
      expiresInSeconds: this.tokenTtlSeconds,
      issuer: 'https://fiorify.corp/auth',
      audience: 'fiorify-platform'
    });

    const { passwordHash, ...safeUser } = user;

    return {
      success: true,
      token,
      user: safeUser,
      expiresAt: new Date(Date.now() + this.tokenTtlSeconds * 1000).toISOString()
    };
  }

  /**
   * Validate token
   */
  async validateToken(token, options = {}) {
    this.assertProductionReadiness();

    const verifyOpts = {
      algorithms: ['HS256'],
      issuer: options.issuer || 'https://fiorify.corp/auth',
      audience: options.audience || 'fiorify-platform',
      ...options
    };

    const result = JwtVerifier.verify(token, this.jwtSecret, verifyOpts);
    if (!result.isValid) {
      return result;
    }

    const payload = result.payload;
    const user = {
      id: payload.id,
      email: payload.email,
      name: payload.name,
      role: payload.role,
      tenantId: payload.tenantId || 'DEFAULT-TENANT-S21',
      department: payload.department,
      scopes: payload.scopes || ROLE_PERMISSIONS[payload.role] || [],
      authProvider: 'LOCAL_AUTH'
    };

    return {
      isValid: true,
      user,
      payload,
      header: result.header
    };
  }
}

export const defaultLocalAuthProvider = new LocalAuthenticationProvider();
export default defaultLocalAuthProvider;
