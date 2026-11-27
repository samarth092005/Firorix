/**
 * Fiorify API — Request Correlation & Context Middleware
 */

import crypto from 'node:crypto';

export function attachRequestContext(req, res) {
  const incomingId = req.headers['x-request-id'];
  const requestId = (typeof incomingId === 'string' && incomingId.trim())
    ? incomingId.trim().slice(0, 128)
    : `req-${crypto.randomUUID()}`;

  req.requestId = requestId;
  res.setHeader('X-Request-Id', requestId);
  return requestId;
}
