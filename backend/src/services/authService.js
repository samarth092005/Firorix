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
import { JwtVerifier } from '../infrastructure/security/jwtVerifier.js';

export const USER_ROLES = Object.freeze({
  ADMIN: 'ADMIN',
  LEAD_ARCHITECT: 'LEAD_ARCHITECT',
  SAP_CONSULTANT: 'SAP_CONSULTANT',
  REQUESTER: 'REQUESTER',
  APPROVER: 'APPROVER',
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
  SYSTEMS_READ: 'Fiorify.systems.read',
  SYSTEMS_MANAGE: 'Fiorify.systems.manage',
  DISCOVERY_EXECUTE: 'Fiorify.discovery.execute',
  CATALOGUE_MANAGE: 'Fiorify.catalogue.manage',
  ASSESSMENTS_MANAGE: 'Fiorify.assessments.manage',
  GENERATION_MANAGE: 'Fiorify.generation.manage',
  ARTIFACTS_EXPORT: 'Fiorify.artifacts.export',
  AUDIT_READ: 'Fiorify.audit.read',
  'Fiorify.admin.access': 'Fiorify.admin.access',
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
    'Fiorify.admin.access',
    'Fiorify.systems.read',
    'Fiorify.systems.manage',
    'Fiorify.discovery.execute',
    'Fiorify.catalogue.manage',
    'Fiorify.assessments.manage',
    'Fiorify.generation.manage',
    'Fiorify.artifacts.export',
    'Fiorify.audit.read'
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

// Default users with deterministic mock credentials for dev/testing
export const DEFAULT_USERS = Object.freeze([
  {
    id: 'USR-ADMIN-01',
    email: 'admin@Fiorify.corp',
    name: 'Admin',
    role: USER_ROLES.ADMIN,
    department: 'SAP Architecture & Platform Governance',
    tenantId: 'DEFAULT-TENANT-S21',
    passwordHash: hashPassword('AdminPass@2026')
  },
  {
    id: 'USR-CONS-01',
    email: 'consultant@Fiorify.corp',
    name: 'Lead SAP Architect',
    role: USER_ROLES.SAP_CONSULTANT,
    department: 'SAP Digital Transformation',
    tenantId: 'DEFAULT-TENANT-S21',
    passwordHash: hashPassword('ConsultantPass@2026')
  },
  {
    id: 'USR-APPR-01',
    email: 'approver@Fiorify.corp',
    name: 'Enterprise Architecture Board Approver',
    role: USER_ROLES.APPROVER,
    department: 'Enterprise Governance Committee',
    tenantId: 'DEFAULT-TENANT-S21',
    passwordHash: hashPassword('ApproverPass@2026')
  },
  {
    id: 'USR-ARCH-01',
    email: 'architect@fiorify.corp',
    name: 'Lead Enterprise Architect',
    role: USER_ROLES.LEAD_ARCHITECT,
    department: 'Enterprise Architecture Board',
    tenantId: 'DEFAULT-TENANT-S21',
    passwordHash: hashPassword('ArchitectPass@2026')
  },
  {
    id: 'USR-REQ-01',
    email: 'requester@Fiorify.corp',
    name: 'Business Process Lead',
    role: USER_ROLES.REQUESTER,
    department: 'Procure to Pay Practice',
    tenantId: 'DEFAULT-TENANT-S21',
    passwordHash: hashPassword('RequesterPass@2026')
  },
  {
    id: 'USR-VIEW-01',
    email: 'viewer@Fiorify.corp',
    name: 'Compliance Auditor',
    role: USER_ROLES.VIEWER,
    department: 'Internal Audit & Reporting',
    tenantId: 'DEFAULT-TENANT-S21',
    passwordHash: hashPassword('ViewerPass@2026')
  }
]);

export function hashPassword(password) {
  return crypto.createHash('sha256').update(String(password).trim()).digest('hex');
}

export class AuthService {
  constructor(options = {}) {
    const isProduction = process.env.NODE_ENV === 'production';
    if (isProduction && !options.jwtSecret && (!process.env.Fiorify_JWT_SECRET || process.env.Fiorify_JWT_SECRET.length < 32)) {
      throw new Error('[Fiorify Security] Fatal: Fiorify_JWT_SECRET environment variable with at least 32 characters is required in production.');
    }
    this.jwtSecret = options.jwtSecret || process.env.Fiorify_JWT_SECRET || 'Fiorify-enterprise-auth-secret-key-2026';
    this.tokenTtlMs = options.tokenTtlMs || 24 * 60 * 60 * 1000; // 24 hours
    this.revokedTokens = new Set();
    this.users = new Map(DEFAULT_USERS.map((u) => [u.email.toLowerCase(), { ...u }]));
  }

  /**
   * Authenticate with email/username and password
   */
  login(identifier, password) {
    if (!identifier || !password) {
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
    const inputHash = hashPassword(password);
    // Allow either the hashed password or standard dev passwords (only outside production)
    const isDevPass = (process.env.NODE_ENV !== 'production') && (
      (password === 'admin-dev-password' && user.role === USER_ROLES.ADMIN) ||
      (password === 'consultant-dev-password' && user.role === USER_ROLES.SAP_CONSULTANT) ||
      (password === 'demo-session-2026' && user.role === USER_ROLES.ADMIN) ||
      (password === 'AdminPass@2026')
    );
    if (user.passwordHash !== inputHash && !isDevPass) {
      return { success: false, error: 'INVALID_CREDENTIALS', errorMessage: 'Invalid user credentials' };
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

    // Support deterministic dev tokens strictly in non-production
    if (cleanToken.toLowerCase().startsWith('fiorify_dev_token_')) {
      const isProduction = process.env.NODE_ENV === 'production';
      const allowDevTokens = process.env.Fiorify_ALLOW_DEV_TOKENS === 'true' || process.env.NODE_ENV === 'test' || (!isProduction && process.env.Fiorify_DISABLE_DEV_TOKENS !== 'true');
      if (isProduction || !allowDevTokens) {
        return null;
      }
      const roleSuffix = cleanToken.replace(/^fiorify_dev_token_/i, '').toUpperCase();
      const matchedRole = USER_ROLES[roleSuffix] || USER_ROLES.VIEWER;
      const matchedUser = Array.from(this.users.values()).find((u) => u.role === matchedRole) || {
        id: `USR-DEV-${matchedRole}`,
        email: `dev-${matchedRole.toLowerCase()}@Fiorify.corp`,
        name: `Dev ${matchedRole}`,
        role: matchedRole,
        department: 'Development Environment',
        tenantId: 'DEFAULT-TENANT-S21'
      };
      return {
        ...this.sanitizeUser(matchedUser),
        tenantId: matchedUser.tenantId || 'DEFAULT-TENANT-S21',
        scopes: ROLE_PERMISSIONS[matchedRole] || []
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
   * Revoke token
   */
  logout(token) {
    if (!token) return false;
    const cleanToken = token.startsWith('Bearer ') ? token.slice(7).trim() : token.trim();
    this.revokedTokens.add(cleanToken);
    return true;
  }

  /**
   * Sanitize user for public return (removes password hashes)
   */
  sanitizeUser(user) {
    if (!user) return null;
    const { passwordHash, ...safe } = user;
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
      if (Array.isArray(roleOrUser.scopes) && roleOrUser.scopes.includes(PERMISSIONS.BUILD_ARCHITECT_APPROVER)) return true;
      if (Array.isArray(roleOrUser.permissions) && roleOrUser.permissions.includes(PERMISSIONS.BUILD_ARCHITECT_APPROVER)) return true;
      if (Array.isArray(roleOrUser.policies) && roleOrUser.policies.includes('BUILD_ARCHITECT_APPROVER')) return true;
      if (roleOrUser.authorizationPolicy?.canApproveBuild === true) return true;
    }
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
