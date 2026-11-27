/**
 * Fiorify — Authentication & Session Routes (SEC-01)
 */

import { SECURITY_ACTIONS } from '../infrastructure/security/securityAuditLogger.js';
import { readJsonBody } from '../api/index.js';

const loginRateLimitMap = new Map();
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const MAX_LOGIN_ATTEMPTS = 15;

function checkLoginRateLimit(ip) {
  if (process.env.NODE_ENV === 'test') {
    return { allowed: true };
  }
  const now = Date.now();
  const record = loginRateLimitMap.get(ip);
  if (!record || now > record.resetTime) {
    loginRateLimitMap.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS });
    return { allowed: true };
  }
  if (record.count >= MAX_LOGIN_ATTEMPTS) {
    return { allowed: false, retryAfterSeconds: Math.ceil((record.resetTime - now) / 1000) };
  }
  record.count++;
  return { allowed: true };
}

export async function handleAuthRoutes(req, res, url, context = {}) {
  const { currentUser, authService, securityAuditLogger } = context;

  if (req.method === 'POST' && url.pathname === '/api/v1/auth/login') {
    const clientIp = (req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '127.0.0.1').split(',')[0].trim();
    const rateLimit = checkLoginRateLimit(clientIp);
    if (!rateLimit.allowed) {
      res.writeHead(429, {
        'Content-Type': 'application/json',
        'Retry-After': String(rateLimit.retryAfterSeconds)
      });
      res.end(JSON.stringify({
        success: false,
        statusCode: 'RATE_LIMIT_EXCEEDED',
        errorMessage: `Too many login attempts. Please try again in ${rateLimit.retryAfterSeconds} seconds.`
      }));
      return true;
    }

    let payload = {};
    try {
      payload = await readJsonBody(req);
    } catch (err) {
      const status = err.statusCode || (err.code === 'PAYLOAD_TOO_LARGE' ? 413 : 400);
      res.writeHead(status, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, statusCode: err.code || 'BAD_REQUEST', errorMessage: err.message }));
      return true;
    }

    const authResult = await authService.login(payload.email || payload.username, payload.password);
    if (!authResult.success) {
      if (securityAuditLogger) {
        securityAuditLogger.logEvent({
          actor: payload.email || payload.username || 'unknown',
          tenantId: 'AUTHENTICATION_GATE',
          action: SECURITY_ACTIONS.LOGIN_FAILURE,
          resource: '/api/v1/auth/login',
          outcome: 'FAILED',
          details: { error: authResult.error, reason: authResult.errorMessage, clientIp }
        }).catch(() => {});
      }
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: false,
        statusCode: 'UNAUTHORIZED',
        error: authResult.error,
        errorMessage: authResult.errorMessage
      }));
      return true;
    }

    if (securityAuditLogger) {
      securityAuditLogger.logEvent({
        actor: authResult.user?.id || 'authenticated_user',
        tenantId: authResult.user?.tenantId || 'DEFAULT-TENANT-S21',
        action: SECURITY_ACTIONS.LOGIN_SUCCESS,
        resource: '/api/v1/auth/login',
        outcome: 'SUCCESS',
        details: { role: authResult.user?.role, email: authResult.user?.email, clientIp }
      }).catch(() => {});
    }

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(authResult, null, 2));
    return true;
  }

  if (req.method === 'POST' && url.pathname === '/api/v1/auth/logout') {
    const authHeader = req.headers.authorization;
    if (authHeader) {
      authService.logout(authHeader);
    }
    if (securityAuditLogger) {
      securityAuditLogger.logEvent({
        actor: currentUser?.id || 'session_user',
        tenantId: currentUser?.tenantId || 'DEFAULT-TENANT-S21',
        action: 'LOGOUT',
        resource: '/api/v1/auth/logout',
        outcome: 'SUCCESS',
        details: { tokenRevoked: Boolean(authHeader) }
      }).catch(() => {});
    }
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true, message: 'Session successfully revoked.' }));
    return true;
  }

  if (req.method === 'GET' && url.pathname === '/api/v1/auth/provider-info') {
    const providerFactory = context.authProviderFactory;
    const info = providerFactory ? providerFactory.getStatus() : { activeProvider: 'LOCAL_AUTH' };
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true, ...info }, null, 2));
    return true;
  }

  if (req.method === 'GET' && url.pathname === '/api/v1/auth/me') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true, authenticated: Boolean(currentUser), user: currentUser }));
    return true;
  }

  return false;
}
