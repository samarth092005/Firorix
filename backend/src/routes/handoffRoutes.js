const MAX_BODY_SIZE = 100 * 1024; // 100KB body limit

/**
 * Generation Studio Handoff HTTP Routes
 *
 * @param {import('node:http').IncomingMessage} req
 * @param {import('node:http').ServerResponse} res
 * @param {URL} url
 * @param {object} context
 * @returns {Promise<boolean>} True if handled, false otherwise
 */
export async function handleHandoffRoutes(req, res, url, context = {}) {
  const { generationHandoffStore, currentUser } = context;

  // 1. Create Handoff (POST /api/v1/generation/handoff)
  if (req.method === 'POST' && url.pathname === '/api/v1/generation/handoff') {
    let body = '';
    let bodyLength = 0;
    let isAborted = false;

    req.on('data', (chunk) => {
      if (isAborted) return;
      bodyLength += chunk.length;
      if (bodyLength > MAX_BODY_SIZE) {
        isAborted = true;
        req.destroy();
        res.writeHead(413, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, statusCode: 'PAYLOAD_TOO_LARGE', errorMessage: 'Payload exceeds maximum limit' }));
        return;
      }
      body += chunk;
    });

    await new Promise((resolve) => req.on('end', resolve));
    if (isAborted) return true;

    let payload = {};
    try {
      payload = JSON.parse(body || '{}');
    } catch {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, statusCode: 'BAD_REQUEST', errorMessage: 'Malformed JSON payload.' }));
      return true;
    }

    try {
      const handoff = await generationHandoffStore.createHandoff(payload, currentUser);
      res.writeHead(201, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, statusCode: 'CREATED', handoff }, null, 2));
    } catch (err) {
      const status = err.code === 'NOT_FOUND'
        ? 404
        : (err.code === 'UNAUTHORIZED_BUILD' || err.code === 'UNAUTHORIZED_BUILD_APPROVER')
        ? 403
        : 400;
      res.writeHead(status, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: false,
        statusCode: err.code || 'BAD_REQUEST',
        errorMessage: err.message,
        error: err.message
      }));
    }
    return true;
  }

  // 2. Retrieve Generation Studio Handoff by ID (GET /api/v1/generation/handoff/:id)
  if (req.method === 'GET' && url.pathname.startsWith('/api/v1/generation/handoff/')) {
    const handoffId = decodeURIComponent(url.pathname.slice('/api/v1/generation/handoff/'.length));
    try {
      const handoff = await generationHandoffStore.getHandoff(handoffId);
      if (!handoff) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, statusCode: 'NOT_FOUND', errorMessage: `Generation handoff not found: ${handoffId}` }));
        return true;
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, handoff }, null, 2));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, statusCode: 'INTERNAL_ERROR', errorMessage: err.message }));
    }
    return true;
  }

  // 3. List Generation Studio Handoffs (GET /api/v1/generation/handoff)
  if (req.method === 'GET' && url.pathname === '/api/v1/generation/handoff') {
    try {
      const assessmentId = url.searchParams.get('assessmentId') || undefined;
      const tcode = url.searchParams.get('tcode') || undefined;
      const handoffs = await generationHandoffStore.listHandoffs({ assessmentId, tcode });
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, count: handoffs.length, handoffs }, null, 2));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, statusCode: 'INTERNAL_ERROR', errorMessage: err.message }));
    }
    return true;
  }

  return false;
}
