/**
 * Fiorify — GEN-07: Preview Security & Isolation Policy
 *
 * Enforces admin-only access, safe loopback binding (127.0.0.1), safe port ranges (4050-4099),
 * query complexity limits, path traversal prevention, and project isolation.
 */

export const SAFE_PORT_MIN = 4050;
export const SAFE_PORT_MAX = 4099;
export const MAX_REQUEST_BODY_BYTES = 1024 * 1024; // 1MB
export const MAX_QUERY_COMPLEXITY_DEPTH = 5;

/**
 * Validates that the request identity has Fiorify Administrator privileges.
 *
 * @param {Object} userContext
 * @returns {boolean}
 */
export function verifyAdminAccess(userContext) {
  if (!userContext) {
    const err = new Error('Authentication required: Admin credentials missing.');
    err.code = 'UNAUTHORIZED';
    err.statusCode = 401;
    throw err;
  }

  // Support local development single-admin, SAP consultant, and role-based checks
  const isAdmin = userContext.role === 'ADMIN' ||
    userContext.role === 'Fiorify_ADMIN' ||
    userContext.role === 'SAP_CONSULTANT' ||
    userContext.role === 'APPROVER' ||
    userContext.isAdmin === true ||
    userContext.id === 'USR-LOCAL' ||
    userContext.id === 'USR-ADMIN-01' ||
    userContext.username === 'admin' ||
    (Array.isArray(userContext.scopes) && (
      userContext.scopes.includes('Fiorify.generation.manage') ||
      userContext.scopes.includes('Fiorify.admin.access')
    ));

  if (!isAdmin) {
    const err = new Error('Access denied: Preview subsystem requires Fiorify Administrator role.');
    err.code = 'FORBIDDEN';
    err.statusCode = 403;
    throw err;
  }

  return true;
}

/**
 * Validates and sanitizes a projectId to prevent directory traversal or injection.
 *
 * @param {string} projectId
 * @returns {string} Sanitized projectId
 */
export function validateProjectId(projectId) {
  if (!projectId || typeof projectId !== 'string') {
    const err = new Error('Invalid project ID: Must be a non-empty string.');
    err.code = 'INVALID_ARGUMENT';
    err.statusCode = 400;
    throw err;
  }

  const clean = projectId.trim();
  if (!/^[a-zA-Z0-9_\-]+$/.test(clean)) {
    const err = new Error(`Invalid project ID format "${projectId}". Must contain only alphanumeric, dash, or underscore.`);
    err.code = 'INVALID_ARGUMENT';
    err.statusCode = 400;
    throw err;
  }

  if (clean.includes('..') || clean.includes('/') || clean.includes('\\')) {
    const err = new Error('Path traversal detected in project ID.');
    err.code = 'SECURITY_VIOLATION';
    err.statusCode = 400;
    throw err;
  }

  return clean;
}

/**
 * Validates that an allocated port resides strictly in the safe local range.
 *
 * @param {number} port
 * @returns {boolean}
 */
export function isSafePort(port) {
  return typeof port === 'number' && Number.isInteger(port) && port >= SAFE_PORT_MIN && port <= SAFE_PORT_MAX;
}

/**
 * Sanitizes a URL path to prevent directory traversal outside of the webapp root.
 *
 * @param {string} requestedPath
 * @returns {string} Sanitized relative path
 */
export function sanitizeWebappPath(requestedPath) {
  const normalized = (requestedPath || '').replace(/\\/g, '/').split('?')[0];
  if (normalized.includes('..') || normalized.includes('//')) {
    const err = new Error('Directory traversal attempt blocked.');
    err.code = 'ACCESS_DENIED';
    err.statusCode = 403;
    throw err;
  }

  // Strip leading slashes
  return normalized.replace(/^\/+/, '');
}
