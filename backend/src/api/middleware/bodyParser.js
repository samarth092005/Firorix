/**
 * Fiorify API — Shared JSON Body Parser Middleware
 *
 * Safely parses incoming JSON request bodies with a configurable size cap
 * and standardized PAYLOAD_TOO_LARGE / BAD_REQUEST error codes.
 */

const DEFAULT_MAX_BODY_BYTES = 100 * 1024; // 100KB

export function readJsonBody(req, { maxBytes = DEFAULT_MAX_BODY_BYTES } = {}) {
  return new Promise((resolve, reject) => {
    let body = '';
    let bodyLength = 0;
    let isAborted = false;

    req.on('data', (chunk) => {
      if (isAborted) return;
      bodyLength += chunk.length;
      if (bodyLength > maxBytes) {
        isAborted = true;
        req.destroy();
        const err = new Error(`Payload exceeds maximum allowed size (${Math.round(maxBytes / 1024)}KB).`);
        err.code = 'PAYLOAD_TOO_LARGE';
        err.statusCode = 413;
        reject(err);
        return;
      }
      body += chunk;
    });

    req.on('end', () => {
      if (isAborted) return;
      if (!body || !body.trim()) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(body));
      } catch {
        const err = new Error('Malformed JSON payload.');
        err.code = 'BAD_REQUEST';
        err.statusCode = 400;
        reject(err);
      }
    });

    req.on('error', (err) => {
      if (!isAborted) reject(err);
    });
  });
}
