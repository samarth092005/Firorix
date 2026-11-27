/**
 * Fiorify API — CORS Middleware
 *
 * Configures safe origin validation for local development, BTP Cloud Foundry,
 * and preflight OPTIONS requests.
 */

export function setCorsHeaders(req, res) {
  const allowedOriginsEnv = process.env.CORS_ALLOWED_ORIGINS;
  const origin = req.headers.origin;
  const isProduction = process.env.NODE_ENV === 'production';

  let originAllowed = !isProduction;

  if (allowedOriginsEnv) {
    const allowed = allowedOriginsEnv.split(',').map((s) => s.trim()).filter(Boolean);
    if (allowed.includes('*') && !isProduction) {
      res.setHeader('Access-Control-Allow-Origin', '*');
      originAllowed = true;
    } else if (origin && allowed.includes(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Vary', 'Origin');
      originAllowed = true;
    } else {
      originAllowed = false;
    }
  } else if (!isProduction) {
    const defaultLocalOrigins = [
      'http://localhost:5173',
      'http://127.0.0.1:5173',
      'http://localhost:4004',
      'http://localhost:3000'
    ];
    if (origin && defaultLocalOrigins.includes(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Vary', 'Origin');
    }
  }

  if (originAllowed) {
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, PUT, DELETE, OPTIONS');
    res.setHeader(
      'Access-Control-Allow-Headers',
      'Content-Type, Authorization, X-Requested-With, X-Request-Id, X-Fiorify-Admin-Secret'
    );
    res.setHeader('Access-Control-Expose-Headers', 'X-Request-Id');
    res.setHeader('Access-Control-Max-Age', '86400');
  }
}

export function handleCorsPreflight(req, res) {
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return true;
  }
  return false;
}
