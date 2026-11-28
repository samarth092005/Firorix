/**
 * Fiorify Centralized Authentication & RBAC Authorization Middleware (AUTH-005, IDP-006, IDP-009)
 *
 * Enforces deny-by-default access control, cryptographically validated user identity,
 * tenant boundary protection, and auditable security event logging.
 */

import { USER_ROLES, ROLE_PERMISSIONS } from '../services/authService.js';
import { SECURITY_ACTIONS } from '../infrastructure/security/securityAuditLogger.js';
import { defaultAuthProviderFactory } from '../infrastructure/security/authProviderFactory.js';
import { getDevAdminSecret, getFiorifyEnv } from '../infrastructure/config/envHelper.js';
import { parseCookieHeader, SESSION_COOKIE_NAME } from '../infrastructure/security/sessionCookie.js';

export function normalizeUserRole(role) {
  if (!role || typeof role !== 'string') return USER_ROLES.VIEWER;
  const upper = role.trim().toUpperCase();
  if (upper === 'ADMIN') return USER_ROLES.ADMIN;
  if (upper === 'LEAD_ARCHITECT' || upper === 'CHIEF_ARCHITECT') return USER_ROLES.LEAD_ARCHITECT;
  if (upper === 'APPROVER') return USER_ROLES.APPROVER;
  if (upper === 'CONSULTANT' || upper === 'SAP_CONSULTANT') return USER_ROLES.SAP_CONSULTANT;
  if (upper === 'DEVELOPER') return USER_ROLES.SAP_CONSULTANT;
  if (upper === 'REQUESTER' || upper === 'VIEWER') return USER_ROLES.VIEWER;
  return upper;
}

export function roleMatches(userRole, allowedRoles = []) {
  if (!userRole) return false;
  const normalizedUserRole = normalizeUserRole(userRole);
  const normalizedAllowed = allowedRoles.map((r) => normalizeUserRole(r));
  return normalizedAllowed.includes(normalizedUserRole) || allowedRoles.includes(userRole);
}

export function createAuthMiddleware(options = {}) {
  const adapter = options.adapter || options.btpAdapter;
  const authService = options.authService;
  const authProviderFactory = options.authProviderFactory || defaultAuthProviderFactory;
  const securityAuditLogger = options.securityAuditLogger;
  const isProduction = options.isProduction !== undefined ? options.isProduction : (process.env.NODE_ENV === 'production');
  const enforceAuth = options.enforceAuth !== undefined
    ? options.enforceAuth
    : (isProduction || getFiorifyEnv('FIORIFY_ENFORCE_AUTH', 'Fiorify_ENFORCE_AUTH') === 'true');
  const defaultTenantId = options.defaultTenantId || getFiorifyEnv('FIORIFY_TENANT_ID', 'Fiorify_TENANT_ID') || 'DEFAULT-TENANT-S21';

  /**
   * Resolves authentication context from request
   */
  async function resolveUserContext(req, url) {
    const authHeader = req.headers.authorization;
    const customSecret = req.headers['x-fiorify-admin-secret'];
    const devImpersonationUser = req.headers['x-fiorify-admin-user'];
    const devRole = req.headers['x-fiorify-dev-role'] || req.headers['x-fiorify-role'];

    // In production, impersonation headers and custom dev secrets are strictly forbidden
    if (isProduction && (customSecret || devImpersonationUser || devRole)) {
      return { isUnauthenticated: true, authError: 'DEV_IMPERSONATION_FORBIDDEN_IN_PRODUCTION' };
    }

    // In development, impersonation requires admin secret
    if (!isProduction && (devImpersonationUser || devRole) && !customSecret) {
      return { isUnauthenticated: true, authError: 'DEV_IMPERSONATION_REQUIRES_SECRET' };
    }

    const configuredSecret = getDevAdminSecret(isProduction);

    const isAdminSecretValid = (sec) => {
      if (!sec || isProduction) return false;
      const clean = String(sec).trim();
      if (configuredSecret && clean === configuredSecret) return true;
      if (adapter && typeof adapter.verifyAdminSecret === 'function' && adapter.verifyAdminSecret(clean)) return true;
      return false;
    };

    // 1. Authorization Bearer Token (or HttpOnly session cookie for same-origin GET / preview iframe requests)
    const bearerToken = (authHeader && authHeader.startsWith('Bearer ')) ? authHeader.slice(7).trim() : null;
    const isPreviewContentRequest = Boolean(url?.pathname?.includes('/preview/content'));
    const isSafeMethod = req.method === 'GET' || req.method === 'HEAD';
    const cookieToken = (!bearerToken && (isSafeMethod || isPreviewContentRequest))
      ? (parseCookieHeader(req.headers.cookie)[SESSION_COOKIE_NAME] || null)
      : null;
    const rawToken = bearerToken || cookieToken;
    if (rawToken) {
      const token = rawToken.trim();

      // Check for dev secret passed as bearer in non-production
      if (!isProduction && isAdminSecretValid(token)) {
        return {
          id: devImpersonationUser || 'USR-ADMIN-01',
          name: req.headers['x-fiorify-admin-name'] || 'Admin',
          email: req.headers['x-fiorify-admin-email'] || 'admin@fiorify.corp',
          role: USER_ROLES.ADMIN,
          tenantId: req.headers['x-tenant-id'] || defaultTenantId,
          department: 'SAP Architecture & Platform Governance',
          scopes: ROLE_PERMISSIONS[USER_ROLES.ADMIN]
        };
      }

      // Check token revocation list (durable async DB + L1 cache)
      const tokenRevoked = authService
        ? (typeof authService.isRevokedAsync === 'function'
            ? await authService.isRevokedAsync(token)
            : authService.isRevoked(token))
        : false;
      if (tokenRevoked) {
        return { isUnauthenticated: true, authError: 'TOKEN_REVOKED' };
      }

      // Validate token via active provider
      try {
        const validation = await authProviderFactory.validateToken(token);
        if (validation && validation.isValid && validation.user) {
          const verified = validation.user;
          const tokenTenantId = verified.tenantId || verified.ext_attr?.zdn;

          const hasCrossTenantAdmin = verified.role === USER_ROLES.ADMIN || (
            Array.isArray(verified.scopes) && (
              verified.scopes.includes('Fiorify.admin.access') ||
              verified.scopes.includes('Fiorify.tenants.manage')
            )
          );

          if (isProduction && !tokenTenantId && (!hasCrossTenantAdmin || !req.headers['x-tenant-id'])) {
            return { isUnauthenticated: true, authError: 'MISSING_TENANT_CONTEXT' };
          }

          if (req.headers['x-tenant-id'] && tokenTenantId && req.headers['x-tenant-id'] !== tokenTenantId && !hasCrossTenantAdmin) {
            return { isUnauthenticated: true, authError: 'TENANT_SPOOFING_FORBIDDEN' };
          }

          const effectiveTenantId = (hasCrossTenantAdmin && req.headers['x-tenant-id'])
            ? req.headers['x-tenant-id']
            : (tokenTenantId || (isProduction ? null : defaultTenantId));

          if (isProduction && !effectiveTenantId) {
            return { isUnauthenticated: true, authError: 'MISSING_TENANT_CONTEXT' };
          }

          verified.tenantId = effectiveTenantId;

          return verified;
        }
      } catch (err) {
        // Fallback to domain authService if provider encountered unexpected issue
      }

      // Fallback to domain authService token verification
      if (authService) {
        const verified = authService.verifyToken(token);
        if (verified) {
          const tokenTenantId = verified.tenantId;

          const hasCrossTenantAdmin = verified.role === USER_ROLES.ADMIN ||
            (Array.isArray(verified.scopes) && verified.scopes.includes('Fiorify.admin.access'));

          if (isProduction && !tokenTenantId && (!hasCrossTenantAdmin || !req.headers['x-tenant-id'])) {
            return { isUnauthenticated: true, authError: 'MISSING_TENANT_CONTEXT' };
          }

          if (req.headers['x-tenant-id'] && tokenTenantId && req.headers['x-tenant-id'] !== tokenTenantId && !hasCrossTenantAdmin) {
            return { isUnauthenticated: true, authError: 'TENANT_SPOOFING_FORBIDDEN' };
          }

          const effectiveTenantId = (hasCrossTenantAdmin && req.headers['x-tenant-id'])
            ? req.headers['x-tenant-id']
            : (tokenTenantId || (isProduction ? null : defaultTenantId));

          if (isProduction && !effectiveTenantId) {
            return { isUnauthenticated: true, authError: 'MISSING_TENANT_CONTEXT' };
          }

          verified.tenantId = effectiveTenantId;

          return verified;
        }
      }

      return { isUnauthenticated: true, authError: 'INVALID_TOKEN' };
    }

    // 2. Custom Admin Secret Header (Non-production only)
    if (customSecret) {
      if (!isProduction && isAdminSecretValid(customSecret)) {
        return {
          id: devImpersonationUser || 'USR-ADMIN-01',
          name: req.headers['x-fiorify-admin-name'] || 'Admin',
          email: req.headers['x-fiorify-admin-email'] || 'admin@fiorify.corp',
          role: USER_ROLES.ADMIN,
          tenantId: req.headers['x-tenant-id'] || defaultTenantId,
          department: 'SAP Architecture & Platform Governance',
          scopes: ROLE_PERMISSIONS[USER_ROLES.ADMIN]
        };
      }
      return { isUnauthenticated: true, authError: 'INVALID_ADMIN_SECRET' };
    }

    // 3. Unauthenticated request
    if (enforceAuth) {
      return { isUnauthenticated: true, authError: 'MISSING_TOKEN' };
    }

    // In non-production development with auth unenforced: minimum-permission VIEWER identity
    return {
      id: 'USR-DEV-VIEWER',
      name: 'Development Viewer',
      email: 'dev-viewer@fiorify.corp',
      role: USER_ROLES.VIEWER,
      tenantId: req.headers['x-tenant-id'] || defaultTenantId,
      department: 'Development Sandbox',
      scopes: ROLE_PERMISSIONS[USER_ROLES.VIEWER] || [],
      isDefaultViewer: true
    };
  }

  /**
   * Universal Authentication Gate
   */
  async function authenticate(req, res, url) {
    const isStaticOrSpa = (req.method === 'GET' || req.method === 'HEAD') && !url.pathname.startsWith('/api/');
    const isPublic = (
      isStaticOrSpa ||
      url.pathname === '/' ||
      url.pathname === '/health' ||
      url.pathname === '/health/liveness' ||
      url.pathname === '/health/readiness' ||
      url.pathname === '/api/v1/health' ||
      url.pathname === '/api/v1/health/liveness' ||
      url.pathname === '/api/v1/health/readiness' ||
      url.pathname === '/api/v1/auth/login' ||
      url.pathname === '/api/v1/auth/provider-info' ||
      url.pathname === '/api/v1/auth/logout' ||
      (req.method === 'GET' && url.pathname === '/api/v1/status')
    );

    const currentUser = await resolveUserContext(req, url);
    req.user = currentUser;

    if (!isPublic && currentUser && currentUser.isUnauthenticated) {
      if (securityAuditLogger) {
        securityAuditLogger.logEvent({
          actor: 'anonymous',
          tenantId: req.headers['x-tenant-id'] || 'UNKNOWN_TENANT',
          action: SECURITY_ACTIONS.AUTH_FAILURE,
          resource: url.pathname,
          outcome: 'FAILED',
          details: { reason: currentUser.authError, method: req.method }
        }).catch(() => {});
      }

      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          success: false,
          statusCode: 'UNAUTHORIZED',
          code: currentUser.authError || 'UNAUTHORIZED',
          error: 'Unauthorized',
          errorMessage: currentUser.authError
            ? `Authentication failed: ${currentUser.authError}`
            : 'Authentication required. Invalid or missing Bearer token.'
        })
      );
      return false;
    }

    return true;
  }

  /**
   * Authorization Gate: Check Permission
   */
  function requirePermission(req, res, permission, url) {
    const user = req.user;
    const hasPerm = user && (
      (authService && authService.hasPermission(user, permission)) ||
      user.role === USER_ROLES.ADMIN ||
      (Array.isArray(user.scopes) && user.scopes.includes(permission))
    );

    if (hasPerm) {
      return true;
    }

    if (securityAuditLogger) {
      securityAuditLogger.logEvent({
        actor: user?.id || 'anonymous',
        tenantId: user?.tenantId || defaultTenantId,
        action: SECURITY_ACTIONS.PERMISSION_DENIED,
        resource: url?.pathname || 'protected_resource',
        outcome: 'DENIED',
        details: { requiredPermission: permission, userRole: user?.role }
      }).catch(() => {});
    }

    res.writeHead(403, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify({
        success: false,
        statusCode: 'FORBIDDEN',
        error: 'Forbidden',
        errorMessage: `User is lacking required permission "${permission}". Access denied.`
      })
    );
    return false;
  }

  /**
   * Authorization Gate: Check Role
   */
  function requireRole(req, res, allowedRoles = [], url) {
    const user = req.user;
    const isAllowed = user && (
      user.role === USER_ROLES.ADMIN ||
      roleMatches(user.role, allowedRoles)
    );

    if (isAllowed) {
      return true;
    }

    if (securityAuditLogger) {
      securityAuditLogger.logEvent({
        actor: user?.id || 'anonymous',
        tenantId: user?.tenantId || defaultTenantId,
        action: SECURITY_ACTIONS.PERMISSION_DENIED,
        resource: url?.pathname || 'protected_resource',
        outcome: 'DENIED',
        details: { allowedRoles, userRole: user?.role }
      }).catch(() => {});
    }

    res.writeHead(403, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify({
        success: false,
        statusCode: 'FORBIDDEN',
        error: 'Forbidden',
        errorMessage: `Role "${user?.role}" is not authorized for this operation. Required: ${allowedRoles.join(', ')}.`
      })
    );
    return false;
  }

  return {
    resolveUserContext,
    authenticate,
    requirePermission,
    requireRole
  };
}

export default createAuthMiddleware;
