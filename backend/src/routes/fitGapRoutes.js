import { sanitizeErrorMessage } from '../adapters/btpDestinationAdapter.js';
import { validateFitGapAssessRequest, normalizeFitGapInput } from '../validators/fitGapValidator.js';

const MAX_BODY_SIZE = 100 * 1024; // 100KB body limit

/**
 * Fit-Gap Assessment & Governed Modernization Recommendation Routes
 *
 * @param {import('node:http').IncomingMessage} req
 * @param {import('node:http').ServerResponse} res
 * @param {URL} url
 * @param {object} context
 * @returns {Promise<boolean>} True if handled, false otherwise
 */
export async function handleFitGapRoutes(req, res, url, context = {}) {
  const {
    fitGapEngine,
    recommendationEngineInstance,
    recommendationEngine
  } = context;

  let requestCounter = context.requestCounter || 1;

  // 1. POST /api/v1/fitgap/assess
  if (req.method === 'POST' && url.pathname === '/api/v1/fitgap/assess') {
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
        res.end(
          JSON.stringify({
            success: false,
            statusCode: 'PAYLOAD_TOO_LARGE',
            error: 'Payload Too Large',
            errorMessage: `Request body exceeds maximum size of ${MAX_BODY_SIZE / 1024}KB.`,
            message: `Request body exceeds maximum size of ${MAX_BODY_SIZE / 1024}KB.`
          })
        );
        return;
      }
      body += chunk;
    });

    await new Promise((resolve) => req.on('end', resolve));
    if (isAborted) return true;

    let payload;
    try {
      payload = JSON.parse(body || '{}');
    } catch {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          success: false,
          statusCode: 'BAD_REQUEST',
          error: 'Bad Request',
          errorMessage: 'Malformed JSON payload.',
          message: 'Malformed JSON payload.'
        })
      );
      return true;
    }

    const validation = validateFitGapAssessRequest(payload);
    if (!validation.isValid) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          success: false,
          statusCode: 'BAD_REQUEST',
          error: 'Bad Request',
          errorMessage: validation.error,
          message: validation.error
        })
      );
      return true;
    }

    const correlationId = req.headers['x-correlation-id'] || null;
    if (correlationId) {
      res.setHeader('X-Correlation-ID', correlationId);
    }

    const reqNum = String(requestCounter++).padStart(6, '0');
    const requestId = `REQ-FITGAP-${reqNum}`;

    try {
      const normalizedInput = normalizeFitGapInput(payload);
      const assessment = fitGapEngine.evaluate(normalizedInput);

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify(
          {
            success: true,
            requestId,
            correlationId: correlationId || undefined,
            timestamp: new Date().toISOString(),
            overallStatus: assessment.overallStatus,
            overallScore: assessment.overallScore,
            assessment
          },
          null,
          2
        )
      );
    } catch (evalErr) {
      const sanitized = sanitizeErrorMessage(evalErr.message || 'Fit-gap evaluation error');
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          success: false,
          statusCode: 'INTERNAL_ERROR',
          error: 'Internal Server Error',
          errorMessage: `Unexpected error during fit-gap assessment evaluation: ${sanitized}`,
          message: `Unexpected error during fit-gap assessment evaluation: ${sanitized}`
        })
      );
    }
    return true;
  }

  // 2. POST /api/v1/recommendations/generate
  if (req.method === 'POST' && url.pathname === '/api/v1/recommendations/generate') {
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
        res.end(
          JSON.stringify({
            success: false,
            statusCode: 'PAYLOAD_TOO_LARGE',
            error: 'Payload Too Large',
            errorMessage: `Request body exceeds maximum size of ${MAX_BODY_SIZE / 1024}KB.`
          })
        );
        return;
      }
      body += chunk;
    });

    await new Promise((resolve) => req.on('end', resolve));
    if (isAborted) return true;

    let payload;
    try {
      payload = JSON.parse(body || '{}');
    } catch {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          success: false,
          statusCode: 'BAD_REQUEST',
          error: 'Bad Request',
          errorMessage: 'Malformed JSON payload.'
        })
      );
      return true;
    }

    const hasAssessment = payload && typeof payload.assessment === 'object';
    const hasReqAndCand = payload && typeof payload.requirement === 'object' && typeof payload.candidate === 'object';

    if (!hasAssessment && !hasReqAndCand) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          success: false,
          statusCode: 'BAD_REQUEST',
          error: 'Bad Request',
          errorMessage: 'Request payload requires either an "assessment" object or both "requirement" and "candidate" specifications.'
        })
      );
      return true;
    }

    const correlationId = req.headers['x-correlation-id'] || null;
    if (correlationId) {
      res.setHeader('X-Correlation-ID', correlationId);
    }

    const reqNum = String(requestCounter++).padStart(6, '0');
    const requestId = `REQ-REC-${reqNum}`;

    try {
      const recEngine = recommendationEngineInstance || recommendationEngine || context.recommendationEngine;
      const recommendation = recEngine.generate ? recEngine.generate(payload) : recEngine.formulateRecommendation(payload);

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify(
          {
            success: true,
            requestId,
            correlationId: correlationId || undefined,
            timestamp: new Date().toISOString(),
            outcome: recommendation.outcome,
            confidence: recommendation.confidence,
            recommendation
          },
          null,
          2
        )
      );
    } catch (recErr) {
      const sanitized = sanitizeErrorMessage(recErr.message || 'Recommendation generation error');
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          success: false,
          statusCode: 'INTERNAL_ERROR',
          error: 'Internal Server Error',
          errorMessage: `Unexpected error during recommendation generation: ${sanitized}`
        })
      );
    }
    return true;
  }

  return false;
}
