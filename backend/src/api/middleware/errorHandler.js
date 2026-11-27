/**
 * Fiorify API — Central Error Formatting & Handling
 */

export function sendJsonError(res, httpStatus, message, statusCode = 'API_ERROR', extra = {}) {
  if (res.headersSent) return;
  res.writeHead(httpStatus, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({
    success: false,
    statusCode,
    error: message,
    ...extra
  }));
}

export function handleUnhandledApiError(req, res, err) {
  const status = err?.statusCode && Number.isInteger(err.statusCode) ? err.statusCode : 500;
  const isProd = process.env.NODE_ENV === 'production';
  const message = isProd && status === 500
    ? 'Internal server error'
    : (err?.message || 'Internal server error');

  sendJsonError(res, status, message, err?.code || 'INTERNAL_SERVER_ERROR', {
    requestId: req?.requestId || null
  });
}
