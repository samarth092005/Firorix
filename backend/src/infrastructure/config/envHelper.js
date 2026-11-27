/**
 * Fiorify — Centralized Environment & Secret Helpers
 *
 * Normalizes inconsistent FIORIFY_* vs Fiorify_* env variable casing and
 * centralizes non-production dev secret fallbacks.
 */

export function getFiorifyEnv(canonicalName, legacyName) {
  const val = process.env[canonicalName];
  if (val !== undefined && val !== '') return val;
  if (legacyName) {
    const legacyVal = process.env[legacyName];
    if (legacyVal !== undefined && legacyVal !== '') return legacyVal;
  }
  return undefined;
}

export function getDevAdminSecret(isProduction = process.env.NODE_ENV === 'production') {
  const configured = getFiorifyEnv('FIORIFY_ADMIN_SECRET', 'Fiorify_ADMIN_SECRET');
  if (configured) return configured;
  return !isProduction ? 'dev-admin-secret-change-in-production' : undefined;
}
