/**
 * Fiorify — HttpOnly Session Cookie Helpers
 *
 * Allows same-origin browser subresources (such as the Live Fiori Preview iframe
 * and its nested OData requests) to authenticate securely without exposing JWTs in URLs.
 */

export const SESSION_COOKIE_NAME = 'fiorify_session';

export function parseCookieHeader(cookieHeader) {
  const cookies = {};
  if (!cookieHeader || typeof cookieHeader !== 'string') return cookies;
  for (const part of cookieHeader.split(';')) {
    const eqIdx = part.indexOf('=');
    if (eqIdx <= 0) continue;
    const key = part.slice(0, eqIdx).trim();
    const rawVal = part.slice(eqIdx + 1).trim();
    if (!key) continue;
    try {
      cookies[key] = decodeURIComponent(rawVal);
    } catch {
      cookies[key] = rawVal;
    }
  }
  return cookies;
}

function isHttpsRequest(req) {
  return Boolean(
    req?.headers?.['x-forwarded-proto'] === 'https' ||
    req?.socket?.encrypted ||
    process.env.NODE_ENV === 'production'
  );
}

export function setSessionCookie(req, res, token, maxAgeSeconds = 8 * 60 * 60) {
  if (!token || !res || res.headersSent) return;
  const secureFlag = isHttpsRequest(req) ? '; Secure' : '';
  res.setHeader(
    'Set-Cookie',
    `${SESSION_COOKIE_NAME}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAgeSeconds}${secureFlag}`
  );
}

export function clearSessionCookie(req, res) {
  if (!res || res.headersSent) return;
  const secureFlag = isHttpsRequest(req) ? '; Secure' : '';
  res.setHeader(
    'Set-Cookie',
    `${SESSION_COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secureFlag}`
  );
}
