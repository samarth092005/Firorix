/**
 * Fiorify API — Per-IP Rate Limiter Middleware
 */

export function createRateLimiter({
  windowMs = 60 * 1000,
  maxRequests = parseInt(process.env.FIORIFY_RATE_LIMIT_MAX || '240', 10),
  skip = false
} = {}) {
  const rateMap = new Map();

  return function checkRateLimit(req, res, url) {
    if (skip || !url.pathname.startsWith('/api/')) {
      return true;
    }

    const trustProxy = process.env.FIORIFY_TRUST_PROXY === 'true';
    const rawIp = trustProxy && req.headers['x-forwarded-for']
      ? String(req.headers['x-forwarded-for']).split(',')[0].trim()
      : (req.socket?.remoteAddress || 'unknown');
    const clientIp = rawIp || 'unknown';
    const now = Date.now();

    // Opportunistic cleanup to prevent unbounded map growth
    if (rateMap.size > 5000) {
      for (const [ip, data] of rateMap.entries()) {
        if (now > data.resetAt) rateMap.delete(ip);
      }
    }

    let entry = rateMap.get(clientIp);
    if (!entry || now > entry.resetAt) {
      entry = { count: 1, resetAt: now + windowMs };
      rateMap.set(clientIp, entry);
    } else {
      entry.count += 1;
    }

    if (entry.count > maxRequests) {
      const retryAfter = Math.max(1, Math.ceil((entry.resetAt - now) / 1000));
      res.writeHead(429, {
        'Content-Type': 'application/json',
        'Retry-After': String(retryAfter)
      });
      res.end(JSON.stringify({
        success: false,
        statusCode: 'TOO_MANY_REQUESTS',
        error: 'Rate limit exceeded',
        retryAfterSeconds: retryAfter
      }));
      return false;
    }

    return true;
  };
}
