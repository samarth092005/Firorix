/**
 * Fiorify API — Security Headers Middleware (OWASP / SAP BTP)
 */

export function setSecurityHeaders(req, res) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  const isPreviewRequest = Boolean(
    req.url && (req.url.includes('/preview/content') || req.url.includes('/webapp/'))
  );
  res.setHeader('X-Frame-Options', isPreviewRequest ? 'SAMEORIGIN' : 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');

  const isProduction = process.env.NODE_ENV === 'production';
  if (isProduction || req.headers['x-forwarded-proto'] === 'https') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }

  const csp = isPreviewRequest
    ? "default-src 'self' 'unsafe-inline' https://ui5.sap.com; script-src 'self' 'unsafe-inline' https://ui5.sap.com; style-src 'self' 'unsafe-inline' https://ui5.sap.com; font-src 'self' data: https://ui5.sap.com; img-src 'self' data: https:; connect-src 'self' http://127.0.0.1:* https://ui5.sap.com; frame-ancestors 'self';"
    : (isProduction
        ? "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; font-src 'self' data:; img-src 'self' data: https:; connect-src 'self' https://*.hana.ondemand.com https://*.authentication.*.hana.ondemand.com; frame-ancestors 'self';"
        : "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; font-src 'self' data:; img-src 'self' data: https:; connect-src 'self' http://localhost:* http://127.0.0.1:* https://*.hana.ondemand.com https://*.authentication.*.hana.ondemand.com; frame-ancestors 'self';");
  res.setHeader('Content-Security-Policy', csp);
}
