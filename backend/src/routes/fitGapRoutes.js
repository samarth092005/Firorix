import { sanitizeErrorMessage } from '../adapters/btpDestinationAdapter.js';
import { validateFitGapAssessRequest, normalizeFitGapInput } from '../validators/fitGapValidator.js';
import { readJsonBody } from '../api/index.js';

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
    let payload;
    try {
      payload = await readJsonBody(req);
    } catch (err) {
      const status = err.statusCode || (err.code === 'PAYLOAD_TOO_LARGE' ? 413 : 400);
      res.writeHead(status, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          success: false,
          statusCode: err.code || 'BAD_REQUEST',
          error: status === 413 ? 'Payload Too Large' : 'Bad Request',
          errorMessage: err.message,
          message: err.message
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

  // 2. POST /api/v1/recommendations/generate or POST /api/v1/fitgap/recommend
  if (req.method === 'POST' && (url.pathname === '/api/v1/recommendations/generate' || url.pathname === '/api/v1/fitgap/recommend')) {
    let payload;
    try {
      payload = await readJsonBody(req);
    } catch (err) {
      const status = err.statusCode || (err.code === 'PAYLOAD_TOO_LARGE' ? 413 : 400);
      res.writeHead(status, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          success: false,
          statusCode: err.code || 'BAD_REQUEST',
          error: status === 413 ? 'Payload Too Large' : 'Bad Request',
          errorMessage: err.message
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
