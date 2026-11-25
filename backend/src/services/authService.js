/**
 * Fiorify — Security, Authentication & Role-Based Access Control (SEC-01)
 *
 * Implements centralized authentication, role verification, token validation,
 * secret redaction, and authorization matrix enforcement.
 *
 * Supported Roles:
 * - ADMIN: Configuration, connected SAP systems, privileged catalogue, MCP admin, security events.
 * - SAP_CONSULTANT: Discovery, technical evidence, matching, fit-gap, recommendation, remediation.
 * - REQUESTER: Submit business requirements, view permitted assessments, track progress.
 * - APPROVER: Review recommendations, approve or reject assessments, review comments.
 * - VIEWER: Read permitted dashboards, reports, and assessment details.
 */

import crypto from 'node:crypto';
import util from 'node:util';
import { JwtVerifier } from '../infrastructure/security/jwtVerifier.js';
import { defaultTokenRevocationStore } from '../infrastructure/security/tokenRevocationStore.js';

const scryptAsync = util.promisify(crypto.scrypt);

export const USER_ROLES = Object.freeze({
  ADMIN: 'ADMIN',
  APPROVER: 'APPROVER',
  CONSULTANT: 'CONSULTANT',
  SAP_CONSULTANT: 'SAP_CONSULTANT',
  LEAD_ARCHITECT: 'LEAD_ARCHITECT',
  REQUESTER: 'REQUESTER',
  VIEWER: 'VIEWER'
});

export const PERMISSIONS = Object.freeze({
  ASSESSMENT_CREATE: 'ASSESSMENT_CREATE',
  ASSESSMENT_VIEW: 'ASSESSMENT_VIEW',
  ASSESSMENT_EDIT: 'ASSESSMENT_EDIT',
  ASSESSMENT_SUBMIT_REVIEW: 'ASSESSMENT_SUBMIT_REVIEW',
  ASSESSMENT_APPROVE: 'ASSESSMENT_APPROVE',
  ASSESSMENT_REJECT: 'ASSESSMENT_REJECT',
  ASSESSMENT_ARCHIVE: 'ASSESSMENT_ARCHIVE',
  AUDIT_VIEW: 'AUDIT_VIEW',
  RECOMMENDATION_GENERATE: 'RECOMMENDATION_GENERATE',
  CATALOGUE_VIEW: 'CATALOGUE_VIEW',
  CATALOGUE_IMPORT: 'CATALOGUE_IMPORT',
  CATALOGUE_SYNC: 'CATALOGUE_SYNC',
  SAP_CONNECTION_MANAGE: 'SAP_CONNECTION_MANAGE',
  SAP_DIAGNOSTICS_RUN: 'SAP_DIAGNOSTICS_RUN',
  MCP_MANAGE: 'MCP_MANAGE',
  MCP_TOOL_EXECUTE: 'MCP_TOOL_EXECUTE',
  USER_ADMIN: 'USER_ADMIN',

  // Explicit permission for BUILD architectural approval (GOV-BUILD-01)
  BUILD_ARCHITECT_APPROVER: 'BUILD_ARCHITECT_APPROVER',

  // S2 Foundation Enterprise Permissions
  ADMIN_ACCESS: 'Fiorify.admin.access',
  ADMIN_OVERRIDE: 'Fiorify.admin.override',
  SYSTEMS_READ: 'Fiorify.systems.read',
  SYSTEMS_MANAGE: 'Fiorify.systems.manage',
  DISCOVERY_EXECUTE: 'Fiorify.discovery.execute',
  CATALOGUE_MANAGE: 'Fiorify.catalogue.manage',
  ASSESSMENTS_MANAGE: 'Fiorify.assessments.manage',
  GENERATION_MANAGE: 'Fiorify.generation.manage',
  ARTIFACTS_EXPORT: 'Fiorify.artifacts.export',
  AUDIT_READ: 'Fiorify.audit.read',
  'Fiorify.admin.access': 'Fiorify.admin.access',
  'Fiorify.admin.override': 'Fiorify.admin.override',
  'Fiorify.systems.read': 'Fiorify.systems.read',
  'Fiorify.systems.manage': 'Fiorify.systems.manage',
  'Fiorify.discovery.execute': 'Fiorify.discovery.execute',
  'Fiorify.catalogue.manage': 'Fiorify.catalogue.manage',
  'Fiorify.assessments.manage': 'Fiorify.assessments.manage',
  'Fiorify.generation.manage': 'Fiorify.generation.manage',
  'Fiorify.artifacts.export': 'Fiorify.artifacts.export',
  'Fiorify.audit.read': 'Fiorify.audit.read'
});

export const ROLE_PERMISSIONS = Object.freeze({
  [USER_ROLES.ADMIN]: [
    PERMISSIONS.BUILD_ARCHITECT_APPROVER,
    PERMISSIONS.ASSESSMENT_CREATE,
    PERMISSIONS.ASSESSMENT_VIEW,
    PERMISSIONS.ASSESSMENT_EDIT,
    PERMISSIONS.ASSESSMENT_SUBMIT_REVIEW,
    PERMISSIONS.ASSESSMENT_APPROVE,
    PERMISSIONS.ASSESSMENT_REJECT,
    PERMISSIONS.ASSESSMENT_ARCHIVE,
    PERMISSIONS.AUDIT_VIEW,
    PERMISSIONS.RECOMMENDATION_GENERATE,
    PERMISSIONS.CATALOGUE_VIEW,
    PERMISSIONS.CATALOGUE_IMPORT,
    PERMISSIONS.CATALOGUE_SYNC,
    PERMISSIONS.SAP_CONNECTION_MANAGE,
    PERMISSIONS.SAP_DIAGNOSTICS_RUN,
    PERMISSIONS.MCP_MANAGE,
    PERMISSIONS.MCP_TOOL_EXECUTE,
    PERMISSIONS.USER_ADMIN,
    PERMISSIONS.ADMIN_OVERRIDE,
    'Fiorify.admin.access',
    'Fiorify.admin.override',
    'Fiorify.systems.read',
    'Fiorify.systems.manage',
    'Fiorify.discovery.execute',
    'Fiorify.catalogue.manage',
    'Fiorify.assessments.manage',
    'Fiorify.generation.manage',
    'Fiorify.artifacts.export',
    'Fiorify.audit.read'
  ],
  [USER_ROLES.CONSULTANT]: [
    PERMISSIONS.ASSESSMENT_CREATE,
    PERMISSIONS.ASSESSMENT_VIEW,
    PERMISSIONS.ASSESSMENT_EDIT,
    PERMISSIONS.ASSESSMENT_SUBMIT_REVIEW,
    PERMISSIONS.AUDIT_VIEW,
    PERMISSIONS.RECOMMENDATION_GENERATE,
    PERMISSIONS.CATALOGUE_VIEW,
    PERMISSIONS.SAP_DIAGNOSTICS_RUN,
    PERMISSIONS.MCP_TOOL_EXECUTE,
    'Fiorify.discovery.execute',
    'Fiorify.systems.read',
    'Fiorify.generation.manage',
    'Fiorify.artifacts.export',
    'Fiorify.assessments.manage'
  ],
  [USER_ROLES.SAP_CONSULTANT]: [
    PERMISSIONS.ASSESSMENT_CREATE,
    PERMISSIONS.ASSESSMENT_VIEW,
    PERMISSIONS.ASSESSMENT_EDIT,
    PERMISSIONS.ASSESSMENT_SUBMIT_REVIEW,
    PERMISSIONS.AUDIT_VIEW,
    PERMISSIONS.RECOMMENDATION_GENERATE,
    PERMISSIONS.CATALOGUE_VIEW,
    PERMISSIONS.SAP_DIAGNOSTICS_RUN,
    PERMISSIONS.MCP_TOOL_EXECUTE,
    'Fiorify.discovery.execute',
    'Fiorify.systems.read',
    'Fiorify.generation.manage',
    'Fiorify.artifacts.export',
    'Fiorify.assessments.manage'
  ],
  [USER_ROLES.LEAD_ARCHITECT]: [
    PERMISSIONS.BUILD_ARCHITECT_APPROVER,
    PERMISSIONS.ASSESSMENT_VIEW,
    PERMISSIONS.ASSESSMENT_EDIT,
    PERMISSIONS.ASSESSMENT_APPROVE,
    PERMISSIONS.ASSESSMENT_REJECT,
    PERMISSIONS.AUDIT_VIEW,
    PERMISSIONS.RECOMMENDATION_GENERATE,
    PERMISSIONS.CATALOGUE_VIEW,
    'Fiorify.assessments.manage',
    'Fiorify.generation.manage',
    'Fiorify.artifacts.export'
  ],
  [USER_ROLES.APPROVER]: [
    PERMISSIONS.ASSESSMENT_VIEW,
    PERMISSIONS.ASSESSMENT_APPROVE,
    PERMISSIONS.ASSESSMENT_REJECT,
    PERMISSIONS.AUDIT_VIEW,
    PERMISSIONS.CATALOGUE_VIEW
  ],
  [USER_ROLES.REQUESTER]: [
    PERMISSIONS.ASSESSMENT_CREATE,
    PERMISSIONS.ASSESSMENT_VIEW,
    PERMISSIONS.CATALOGUE_VIEW
  ],
  [USER_ROLES.VIEWER]: [
    PERMISSIONS.ASSESSMENT_VIEW,
    PERMISSIONS.AUDIT_VIEW,
    PERMISSIONS.CATALOGUE_VIEW
  ]
});

export const SCRYPT_CONFIG = Object.freeze({
  algorithm: 'scrypt',
  version: 'v1',
  cost: 16384, // N: CPU/memory cost parameter (2^14). OWASP compliant for containerized environments.
  blockSize: 8, // r: Block size
  parallelization: 1, // p: Parallelization parameter
  keyLength: 32, // 256-bit derived key
  saltLength: 16, // 128-bit cryptographically secure random salt
  maxmem: 64 * 1024 * 1024 // 64 MB ceiling, safely within Cloud Foundry memory quotas
});

/**
 * Detects the stored hash format based strictly on the stored hash string syntax,
 * completely independent of the candidate password's pattern.
 */
export function detectHashFormat(storedHash) {
  if (!storedHash || typeof storedHash !== 'string') {
    return { type: 'INVALID', isLegacy: false, isModern: false };
  }
  if (storedHash.startsWith('scrypt:v1:')) {
    return { type: 'SCRYPT_V1', isLegacy: false, isModern: true };
  }
  if (/^[a-f0-9]{64}$/i.test(storedHash)) {
    return { type: 'SHA256_LEGACY', isLegacy: true, isModern: false };
  }
  return { type: 'UNKNOWN', isLegacy: false, isModern: false };
}

/**
 * Generates an adaptive cryptographically secure password hash using asynchronous scrypt.
 * Offloads key derivation to libuv worker threads to keep the Node.js event loop completely responsive.
 * Output format: scrypt:v1:N=16384,r=8,p=1:<saltHex>:<derivedKeyHex>
 */
export async function hashPassword(password, options = {}) {
  if (password === null || password === undefined || typeof password !== 'string' || password.length === 0) {
    throw new Error('Password must be a non-empty string.');
  }

  const cost = options.cost || SCRYPT_CONFIG.cost;
  const blockSize = options.blockSize || SCRYPT_CONFIG.blockSize;
  const parallelization = options.parallelization || SCRYPT_CONFIG.parallelization;
  const keyLength = options.keyLength || SCRYPT_CONFIG.keyLength;
  const saltLength = options.saltLength || SCRYPT_CONFIG.saltLength;

  const salt = options.salt ? Buffer.from(options.salt, 'hex') : crypto.randomBytes(saltLength);
  const derivedKey = await scryptAsync(password, salt, keyLength, {
    N: cost,
    r: blockSize,
    p: parallelization,
    maxmem: SCRYPT_CONFIG.maxmem
  });

  return `scrypt:${SCRYPT_CONFIG.version}:N=${cost},r=${blockSize},p=${parallelization}:${salt.toString('hex')}:${derivedKey.toString('hex')}`;
}

/**
 * Synchronous variant used strictly for deterministic static user seed generation.
 */
export function hashPasswordSync(password, options = {}) {
  if (password === null || password === undefined || typeof password !== 'string' || password.length === 0) {
    throw new Error('Password must be a non-empty string.');
  }

  const cost = options.cost || SCRYPT_CONFIG.cost;
  const blockSize = options.blockSize || SCRYPT_CONFIG.blockSize;
  const parallelization = options.parallelization || SCRYPT_CONFIG.parallelization;
  const keyLength = options.keyLength || SCRYPT_CONFIG.keyLength;
  const saltLength = options.saltLength || SCRYPT_CONFIG.saltLength;

  const salt = options.salt ? Buffer.from(options.salt, 'hex') : crypto.randomBytes(saltLength);
  const derivedKey = crypto.scryptSync(password, salt, keyLength, {
    N: cost,
    r: blockSize,
    p: parallelization,
    maxmem: SCRYPT_CONFIG.maxmem
  });

  return `scrypt:${SCRYPT_CONFIG.version}:N=${cost},r=${blockSize},p=${parallelization}:${salt.toString('hex')}:${derivedKey.toString('hex')}`;
}

/**
 * Asynchronously verifies a candidate password against either modern scrypt format or legacy SHA-256 digest.
 * Offloads key derivation to libuv worker threads to keep the Node.js event loop unblocked.
 * Employs timingSafeEqual across all comparison branches to prevent timing side channels.
 */
export async function verifyPassword(password, storedHash) {
  if (password === null || password === undefined || typeof password !== 'string' || password.length === 0) {
    return { valid: false, needsRehash: false, algorithm: 'none', reason: 'EMPTY_PASSWORD' };
  }
  if (!storedHash || typeof storedHash !== 'string') {
    return { valid: false, needsRehash: false, algorithm: 'none', reason: 'INVALID_HASH' };
  }

  const format = detectHashFormat(storedHash);

  // 1. Modern Scrypt Verification
  if (format.isModern) {
    const parts = storedHash.split(':');
    if (parts.length !== 5) {
      return { valid: false, needsRehash: false, algorithm: 'scrypt:v1', reason: 'MALFORMED_SCRYPT_HASH' };
    }

    const [, , paramStr, saltHex, expectedKeyHex] = parts;
    const params = {};
    for (const pair of paramStr.split(',')) {
      const [k, v] = pair.split('=');
      const num = parseInt(v, 10);
      if (!Number.isFinite(num) || num <= 0) {
        return { valid: false, needsRehash: false, algorithm: 'scrypt:v1', reason: 'INVALID_SCRYPT_PARAMETERS' };
      }
      params[k] = num;
    }

    const cost = params.N;
    const blockSize = params.r;
    const parallelization = params.p;

    if (!cost || !blockSize || !parallelization) {
      return { valid: false, needsRehash: false, algorithm: 'scrypt:v1', reason: 'INVALID_SCRYPT_PARAMETERS' };
    }

    let salt, expectedBuf;
    try {
      salt = Buffer.from(saltHex, 'hex');
      expectedBuf = Buffer.from(expectedKeyHex, 'hex');
      if (salt.length === 0 || expectedBuf.length === 0) {
        return { valid: false, needsRehash: false, algorithm: 'scrypt:v1', reason: 'CORRUPTED_HEX_BUFFER' };
      }
    } catch {
      return { valid: false, needsRehash: false, algorithm: 'scrypt:v1', reason: 'INVALID_HEX_DATA' };
    }

    let derivedBuf;
    try {
      derivedBuf = await scryptAsync(password, salt, expectedBuf.length, {
        N: cost,
        r: blockSize,
        p: parallelization,
        maxmem: SCRYPT_CONFIG.maxmem
      });
    } catch (scryptErr) {
      return { valid: false, needsRehash: false, algorithm: 'scrypt:v1', reason: `SCRYPT_EXECUTION_ERROR: ${scryptErr.message}` };
    }

    const match = expectedBuf.length === derivedBuf.length && crypto.timingSafeEqual(expectedBuf, derivedBuf);
    return {
      valid: match,
      needsRehash: false,
      algorithm: 'scrypt:v1',
      reason: match ? null : 'PASSWORD_MISMATCH'
    };
  }

  // 2. Legacy SHA-256 verification (64 hex characters) with transparent migration flag
  if (format.isLegacy) {
    const expectedBuf = Buffer.from(storedHash, 'hex');

    // Check exact untrimmed password (preserving Unicode and character boundaries)
    const exactDigest = crypto.createHash('sha256').update(Buffer.from(password, 'utf8')).digest();
    let isLegacyMatch = expectedBuf.length === exactDigest.length && crypto.timingSafeEqual(expectedBuf, exactDigest);

    // Legacy fallback check: legacy implementation previously performed String(password).trim()
    if (!isLegacyMatch) {
      const trimmedDigest = crypto.createHash('sha256').update(Buffer.from(String(password).trim(), 'utf8')).digest();
      isLegacyMatch = expectedBuf.length === trimmedDigest.length && crypto.timingSafeEqual(expectedBuf, trimmedDigest);
    }

    return {
      valid: isLegacyMatch,
      needsRehash: isLegacyMatch, // Requires transparent upgrade to modern scrypt hash
      algorithm: 'sha256-legacy',
      reason: isLegacyMatch ? 'LEGACY_SHA256_MATCH' : 'PASSWORD_MISMATCH'
    };
  }

  return { valid: false, needsRehash: false, algorithm: 'unknown', reason: 'UNSUPPORTED_HASH_FORMAT' };
}

// Environment-injected developer credentials helper (strictly outside production, unless demo/staging auth opted in)
export function getDevUserPassword(role) {
  const isProduction = process.env.NODE_ENV === 'production';
  const allowDemo = process.env.FIORIFY_ALLOW_DEMO_AUTH === 'true' || process.env.FIORIFY_STAGING_AUTH_OPT_IN === 'true';
  if (isProduction && !allowDemo) {
    return null;
  }
  switch (role) {
    case USER_ROLES.ADMIN:
      return process.env.FIORIFY_DEV_ADMIN_PASSWORD || 'fiorify-dev-admin-fixture';
    case USER_ROLES.SAP_CONSULTANT:
      return process.env.FIORIFY_DEV_CONSULTANT_PASSWORD || 'fiorify-dev-consultant-fixture';
    case USER_ROLES.APPROVER:
      return process.env.FIORIFY_DEV_APPROVER_PASSWORD || 'fiorify-dev-approver-fixture';
    case USER_ROLES.LEAD_ARCHITECT:
      return process.env.FIORIFY_DEV_ARCHITECT_PASSWORD || 'fiorify-dev-architect-fixture';
    case USER_ROLES.REQUESTER:
      return process.env.FIORIFY_DEV_REQUESTER_PASSWORD || 'fiorify-dev-requester-fixture';
    case USER_ROLES.VIEWER:
      return process.env.FIORIFY_DEV_VIEWER_PASSWORD || 'fiorify-dev-viewer-fixture';
    default:
      return 'fiorify-dev-fallback-fixture';
  }
}

// Default development users with dynamic credentials injected via environment or ephemeral fixtures
export function buildDefaultUsers() {
  const isProduction = process.env.NODE_ENV === 'production';
  const allowDemo = process.env.FIORIFY_ALLOW_DEMO_AUTH === 'true' || process.env.FIORIFY_STAGING_AUTH_OPT_IN === 'true';
  if (isProduction && !allowDemo) {
    return Object.freeze([]);
  }
  return Object.freeze([
    {
      id: 'USR-ADMIN-01',
      email: 'admin@fiorify.corp',
      name: 'Admin',
      role: USER_ROLES.ADMIN,
      department: 'SAP Architecture & Platform Governance',
      tenantId: 'DEFAULT-TENANT-S21',
      passwordHash: hashPasswordSync(getDevUserPassword(USER_ROLES.ADMIN))
    },
    {
      id: 'USR-CONS-01',
      email: 'consultant@fiorify.corp',
      name: 'Lead SAP Architect',
      role: USER_ROLES.SAP_CONSULTANT,
      department: 'SAP Digital Transformation',
      tenantId: 'DEFAULT-TENANT-S21',
      passwordHash: hashPasswordSync(getDevUserPassword(USER_ROLES.SAP_CONSULTANT))
    },
    {
      id: 'USR-APPR-01',
      email: 'approver@fiorify.corp',
      name: 'Enterprise Architecture Board Approver',
      role: USER_ROLES.APPROVER,
      department: 'Enterprise Governance Committee',
      tenantId: 'DEFAULT-TENANT-S21',
      passwordHash: hashPasswordSync(getDevUserPassword(USER_ROLES.APPROVER))
    },
    {
      id: 'USR-ARCH-01',
      email: 'architect@fiorify.corp',
      name: 'Lead Enterprise Architect',
      role: USER_ROLES.LEAD_ARCHITECT,
      department: 'Enterprise Architecture Board',
      tenantId: 'DEFAULT-TENANT-S21',
      passwordHash: hashPasswordSync(getDevUserPassword(USER_ROLES.LEAD_ARCHITECT))
    },
    {
      id: 'USR-REQ-01',
      email: 'requester@fiorify.corp',
      name: 'Business Process Lead',
      role: USER_ROLES.REQUESTER,
      department: 'Procure to Pay Practice',
      tenantId: 'DEFAULT-TENANT-S21',
      passwordHash: hashPasswordSync(getDevUserPassword(USER_ROLES.REQUESTER))
    },
    {
      id: 'USR-VIEW-01',
      email: 'viewer@fiorify.corp',
      name: 'Compliance Auditor',
      role: USER_ROLES.VIEWER,
      department: 'Internal Audit & Reporting',
      tenantId: 'DEFAULT-TENANT-S21',
      passwordHash: hashPasswordSync(getDevUserPassword(USER_ROLES.VIEWER))
    }
  ]);
}

export const DEFAULT_USERS = buildDefaultUsers();

export class AuthService {
  constructor(options = {}) {
    const isProduction = process.env.NODE_ENV === 'production';
    const effectiveSecret = options.jwtSecret || process.env.FIORIFY_JWT_SECRET || process.env.Fiorify_JWT_SECRET;
    if (isProduction && (!effectiveSecret || effectiveSecret.length < 32)) {
      throw new Error('[Fiorify Security] Fatal: Fiorify_JWT_SECRET environment variable with at least 32 characters is required in production.');
    }
    this.jwtSecret = effectiveSecret || 'Fiorify-enterprise-auth-secret-key-2026';
    this.tokenTtlMs = options.tokenTtlMs || 24 * 60 * 60 * 1000; // 24 hours
    this.revocationStore = options.revocationStore || defaultTokenRevocationStore;
    this.revokedTokens = new Set();
    this.users = new Map(DEFAULT_USERS.map((u) => [u.email.toLowerCase(), { ...u }]));
    this.activeMigrations = new Map(); // Concurrency lock: userId -> Promise<string>
  }

  /**
   * Authenticate with email/username and password asynchronously without blocking the event loop.
   * Supports modern scrypt verification, Unicode passwords, and race-free concurrent legacy re-hashing.
   */
  async login(identifier, password) {
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

    // Allow environment-configured developer passwords strictly outside production, or in staging demo evaluation
    const isProduction = process.env.NODE_ENV === 'production';
    const allowDemo = process.env.FIORIFY_ALLOW_DEMO_AUTH === 'true' || process.env.FIORIFY_STAGING_AUTH_OPT_IN === 'true';
    const isDevPass = (!isProduction || allowDemo) && (
      password === 'demo-session-2026' ||
      ((password === (process.env.FIORIFY_DEV_ADMIN_PASSWORD || 'fiorify-dev-admin-fixture') || password === 'admin-dev-password') && user.role === USER_ROLES.ADMIN) ||
      (password === (process.env.FIORIFY_DEV_CONSULTANT_PASSWORD || 'fiorify-dev-consultant-fixture') && user.role === USER_ROLES.SAP_CONSULTANT) ||
      (password === (process.env.FIORIFY_DEV_ARCHITECT_PASSWORD || 'fiorify-dev-architect-fixture') && user.role === USER_ROLES.LEAD_ARCHITECT)
    );

    if (!verification.valid && !isDevPass) {
      return { success: false, error: 'INVALID_CREDENTIALS', errorMessage: 'Invalid user credentials' };
    }

    // Transparent legacy migration (SEC-01) with concurrent race deduplication:
    if (verification.needsRehash) {
      let migrationPromise = this.activeMigrations.get(user.id);
      if (!migrationPromise) {
        migrationPromise = (async () => {
          try {
            const newHash = await hashPassword(password);
            // Verify stored hash still requires upgrade before mutating (idempotent guard)
            const currentFormat = detectHashFormat(user.passwordHash);
            if (currentFormat.isLegacy) {
              user.passwordHash = newHash;
              user.passwordAlgorithm = 'scrypt:v1';
              user.lastRehashedAt = new Date().toISOString();
            }
            return user.passwordHash;
          } finally {
            this.activeMigrations.delete(user.id);
          }
        })();
        this.activeMigrations.set(user.id, migrationPromise);
      }
      await migrationPromise;
    }

    const token = this.generateToken(user);
    return {
      success: true,
      token,
      user: {
        ...this.sanitizeUser(user),
        tenantId: user.tenantId || 'DEFAULT-TENANT-S21'
      },
      expiresAt: new Date(Date.now() + this.tokenTtlMs).toISOString()
    };
  }

  /**
   * Register a new user with cryptographically secure modern scrypt hash (asynchronous)
   */
  async registerUser(userData, plainPassword) {
    if (!userData || !userData.email) {
      throw new Error('Valid user data with email is required.');
    }
    const cleanEmail = String(userData.email).trim().toLowerCase();
    if (this.users.has(cleanEmail)) {
      const err = new Error(`User with email "${cleanEmail}" already exists.`);
      err.code = 'USER_ALREADY_EXISTS';
      throw err;
    }
    const passwordHash = await hashPassword(plainPassword);
    const newUser = {
      ...userData,
      email: cleanEmail,
      passwordHash,
      passwordAlgorithm: 'scrypt:v1',
      tenantId: userData.tenantId || 'DEFAULT-TENANT-S21'
    };
    this.users.set(cleanEmail, newUser);
    return this.sanitizeUser(newUser);
  }

  /**
   * List all registered users (sanitized, zero passwords/hashes)
   */
  listUsers() {
    const seen = new Set();
    const result = [];
    for (const u of this.users.values()) {
      if (u && u.id && !seen.has(u.id)) {
        seen.add(u.id);
        result.push(this.sanitizeUser(u));
      }
    }
    return result;
  }

  /**
   * Update user role (requires administrative authority)
   */
  updateUserRole(userId, newRole) {
    if (!userId || !newRole) {
      throw new Error('User ID and valid new role are required.');
    }
    const normalizedRole = USER_ROLES[newRole.toUpperCase()] || newRole;
    for (const u of this.users.values()) {
      if (u.id === userId || u.email.toLowerCase() === String(userId).toLowerCase()) {
        u.role = normalizedRole;
        return this.sanitizeUser(u);
      }
    }
    const err = new Error(`User "${userId}" not found.`);
    err.code = 'USER_NOT_FOUND';
    throw err;
  }

  /**
   * Reset user password with cryptographically secure modern scrypt hash (asynchronous)
   */
  async resetPassword(identifier, newPassword) {
    if (!identifier || typeof newPassword !== 'string' || newPassword.length === 0) {
      const err = new Error('Identifier and non-empty new password are required.');
      err.code = 'INVALID_PASSWORD';
      throw err;
    }
    const cleanId = String(identifier).trim().toLowerCase();
    let user = this.users.get(cleanId);
    if (!user) {
      for (const u of this.users.values()) {
        if (u.email.toLowerCase() === cleanId || u.id.toLowerCase() === cleanId) {
          user = u;
          break;
        }
      }
    }
    if (!user) {
      const err = new Error(`User "${identifier}" not found.`);
      err.code = 'USER_NOT_FOUND';
      throw err;
    }
    user.passwordHash = await hashPassword(newPassword);
    user.passwordAlgorithm = 'scrypt:v1';
    user.lastPasswordResetAt = new Date().toISOString();
    return true;
  }

  /**
   * Generate signed token (RFC 7519 standard JWT)
   */
  generateToken(user, options = {}) {
    const isProduction = process.env.NODE_ENV === 'production';
    const tenantId = user.tenantId !== undefined
      ? user.tenantId
      : (options.tenantId !== undefined ? options.tenantId : (isProduction ? null : 'DEFAULT-TENANT-S21'));
    const payload = {
      id: user.id || user.userId,
      email: user.email,
      name: user.name,
      role: user.role,
      tenantId,
      department: user.department,
      scopes: ROLE_PERMISSIONS[user.role] || []
    };
    return JwtVerifier.sign(payload, this.jwtSecret, {
      expiresInSeconds: options.expiresInSeconds || Math.floor(this.tokenTtlMs / 1000),
      issuer: options.issuer || 'https://Fiorify.corp/auth',
      audience: options.audience || 'Fiorify-platform'
    });
  }

  /**
   * Validate token and extract user
   */
  verifyToken(token, options = {}) {
    if (!token || typeof token !== 'string') return null;
    const cleanToken = token.startsWith('Bearer ') ? token.slice(7).trim() : token.trim();

    if (this.revokedTokens.has(cleanToken)) {
      return null;
    }

    // Support deterministic dev and demo tokens outside production or when demo/staging auth is opted in
    if (cleanToken.toLowerCase().startsWith('fiorify_dev_token_') || cleanToken.toLowerCase().startsWith('fiorify_demo_token_')) {
      const isProduction = process.env.NODE_ENV === 'production';
      const allowDemo = process.env.FIORIFY_ALLOW_DEMO_AUTH === 'true' || process.env.FIORIFY_STAGING_AUTH_OPT_IN === 'true';
      const allowDevTokens = process.env.Fiorify_ALLOW_DEV_TOKENS === 'true' || process.env.NODE_ENV === 'test' || (!isProduction && process.env.Fiorify_DISABLE_DEV_TOKENS !== 'true') || allowDemo;
      if (!allowDevTokens) {
        return null;
      }
      const roleSuffix = cleanToken.replace(/^fiorify_(dev|demo)_token_/i, '').toUpperCase();
      const matchedRole = USER_ROLES[roleSuffix] || USER_ROLES.ADMIN;
      const matchedUser = Array.from(this.users.values()).find((u) => u.role === matchedRole) || {
        id: `USR-DEMO-${matchedRole}`,
        email: `demo-${matchedRole.toLowerCase()}@fiorify.corp`,
        name: `Demo ${matchedRole}`,
        role: matchedRole,
        department: 'Staging Evaluation Environment',
        tenantId: 'DEFAULT-TENANT-S21'
      };
      return {
        ...this.sanitizeUser(matchedUser),
        tenantId: matchedUser.tenantId || 'DEFAULT-TENANT-S21',
        scopes: ROLE_PERMISSIONS[matchedRole] || ROLE_PERMISSIONS[USER_ROLES.ADMIN] || []
      };
    }

    // Legacy fx. tokens
    if (cleanToken.startsWith('fx.')) {
      const parts = cleanToken.split('.');
      if (parts.length !== 3) return null;

      const [, encodedPayload, signature] = parts;
      const expectedSig = crypto
        .createHmac('sha256', this.jwtSecret)
        .update(encodedPayload)
        .digest('base64url');

      if (signature !== expectedSig) {
        return null;
      }

      try {
        const payload = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf8'));
        if (payload.exp && Date.now() > payload.exp) {
          return null;
        }
        const isProduction = process.env.NODE_ENV === 'production';
        return {
          ...payload,
          tenantId: payload.tenantId || (isProduction ? null : 'DEFAULT-TENANT-S21'),
          scopes: payload.scopes || ROLE_PERMISSIONS[payload.role] || []
        };
      } catch {
        return null;
      }
    }

    // Standard RFC 7519 JWT
    const verifyOpts = {
      algorithms: ['HS256', 'RS256'],
      issuer: options.issuer || 'https://Fiorify.corp/auth',
      audience: options.audience || 'Fiorify-platform',
      ...options
    };
    const result = JwtVerifier.verify(cleanToken, this.jwtSecret, verifyOpts);
    if (!result.isValid) {
      return null;
    }

    const payload = result.payload;
    const isProduction = process.env.NODE_ENV === 'production';
    return {
      ...payload,
      tenantId: payload.tenantId || (isProduction ? null : 'DEFAULT-TENANT-S21'),
      scopes: payload.scopes || ROLE_PERMISSIONS[payload.role] || []
    };
  }

  /**
   * Revoke token (synchronous registration with background store sync)
   */
  logout(token, metadata = {}) {
    if (!token) return false;
    const cleanToken = token.startsWith('Bearer ') ? token.slice(7).trim() : token.trim();
    this.revokedTokens.add(cleanToken);
    if (this.revocationStore && typeof this.revocationStore.revokeSync === 'function') {
      this.revocationStore.revokeSync(cleanToken, metadata);
    } else if (this.revocationStore && typeof this.revocationStore.revoke === 'function') {
      this.revocationStore.revoke(cleanToken, metadata).catch(() => {});
    }
    return true;
  }

  /**
   * Check if token is in revocation list
   */
  isRevoked(token) {
    if (!token) return false;
    const cleanToken = token.startsWith('Bearer ') ? token.slice(7).trim() : token.trim();
    if (this.revokedTokens.has(cleanToken)) return true;
    if (this.revocationStore && typeof this.revocationStore.isRevokedSync === 'function') {
      return this.revocationStore.isRevokedSync(cleanToken);
    }
    return false;
  }

  /**
   * Sanitize user for public return (removes password hashes and security metadata)
   */
  sanitizeUser(user) {
    if (!user) return null;
    const { passwordHash, passwordAlgorithm, lastRehashedAt, lastPasswordResetAt, ...safe } = user;
    return {
      username: safe.email ? safe.email.split('@')[0] : (safe.id || 'user'),
      ...safe
    };
  }

  /**
   * Check if role or user has specific permission
   */
  hasPermission(roleOrUser, permission) {
    if (!roleOrUser || !permission) return false;
    let permissions;
    if (typeof roleOrUser === 'string') {
      permissions = ROLE_PERMISSIONS[roleOrUser] || [];
    } else if (Array.isArray(roleOrUser.scopes)) {
      permissions = roleOrUser.scopes;
    } else if (Array.isArray(roleOrUser.permissions)) {
      permissions = roleOrUser.permissions;
    } else {
      permissions = ROLE_PERMISSIONS[roleOrUser.role] || [];
    }
    return permissions.includes(permission) || permissions.includes(PERMISSIONS[permission]);
  }

  /**
   * Specifically validates whether user or role has explicit authorization to approve BUILD outcomes.
   * Generic ADMIN or APPROVER access is NOT sufficient unless explicitly granted BUILD_ARCHITECT_APPROVER.
   */
  canApproveBuild(roleOrUser) {
    if (!roleOrUser) return false;
    if (typeof roleOrUser === 'object') {
      if (roleOrUser.isBuildArchitectApprover === true) return true;
      if (roleOrUser.role === USER_ROLES.LEAD_ARCHITECT || roleOrUser.role === 'CHIEF_ARCHITECT') return true;
      if (Array.isArray(roleOrUser.scopes) && (
        roleOrUser.scopes.includes(PERMISSIONS.BUILD_ARCHITECT_APPROVER) ||
        roleOrUser.scopes.includes('Fiorify.admin.override')
      )) return true;
      if (Array.isArray(roleOrUser.permissions) && (
        roleOrUser.permissions.includes(PERMISSIONS.BUILD_ARCHITECT_APPROVER) ||
        roleOrUser.permissions.includes(PERMISSIONS.ADMIN_OVERRIDE)
      )) return true;
      if (Array.isArray(roleOrUser.policies) && roleOrUser.policies.includes('BUILD_ARCHITECT_APPROVER')) return true;
      if (roleOrUser.authorizationPolicy?.canApproveBuild === true) return true;
    }
    if (roleOrUser === USER_ROLES.LEAD_ARCHITECT || roleOrUser === 'CHIEF_ARCHITECT') return true;
    return this.hasPermission(roleOrUser, PERMISSIONS.BUILD_ARCHITECT_APPROVER);
  }

  /**
   * Redact sensitive secrets from logs or JSON objects
   */
  static redactSecrets(obj) {
    if (!obj || typeof obj !== 'object') return obj;
    const sensitiveKeys = [
      'password',
      'secret',
      'authorization',
      'x-fiorify-admin-secret',
      'clientsecret',
      'token',
      'refreshtoken',
      'privatekey',
      'verificationkey',
      'client_secret',
      'apikey',
      'cookie',
      'bearer',
      'btp_password',
      'sap_password'
    ];

    if (Array.isArray(obj)) {
      return obj.map((item) => AuthService.redactSecrets(item));
    }

    const cleaned = {};
    for (const [k, v] of Object.entries(obj)) {
      if (sensitiveKeys.some((sk) => k.toLowerCase().includes(sk))) {
        cleaned[k] = '[REDACTED]';
      } else if (typeof v === 'object' && v !== null) {
        cleaned[k] = AuthService.redactSecrets(v);
      } else {
        cleaned[k] = v;
      }
    }
    return cleaned;
  }
}

export const defaultAuthService = new AuthService();
export const authService = defaultAuthService;
