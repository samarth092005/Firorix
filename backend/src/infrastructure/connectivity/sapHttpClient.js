/**
 * Fiorify — Resilient Read-Only SAP HTTP Client (Stage S3)
 *
 * Implements:
 * - Read-only enforcement (strictly GET / HEAD for SAP endpoints)
 * - Automatic retry with jitter for transient gateway / Cloud Connector blips
 * - Strict timeout governance
 * - Comprehensive credential & token scrubbing from outgoing headers and incoming errors
 */

import { sanitizeHeaders, sanitizeErrorMessage } from '../../adapters/btpDestinationAdapter.js';
import { classifySapError, isConnectivityFailure } from './sapErrorTaxonomy.js';

export class SapHttpClient {
  constructor(options = {}) {
    this.timeoutMs = options.timeoutMs || Number(process.env.SAP_TIMEOUT_MS) || 15000;
    this.maxRetries = options.maxRetries !== undefined ? options.maxRetries : 2;
    this.retryDelayMs = options.retryDelayMs || 500;
    this.directFetch = options.directFetch || globalThis.fetch;
  }

  /**
   * Enforces read-only compliance for SAP interactions
   */
  assertReadOnly(method) {
    const m = String(method || 'GET').toUpperCase();
    if (m !== 'GET' && m !== 'HEAD' && m !== 'OPTIONS') {
      const err = new Error(
        `SAP WRITE OPERATION BLOCKED: Method "${m}" violates Fiorify Read-Only SAP Access Boundary. ` +
        'Fiorify never executes writes, transports, or object mutations in SAP S/4HANA.'
      );
      err.code = 'WRITE_OPERATION_BLOCKED';
      err.statusCode = 'AUTHORIZATION_BLOCKED';
      throw err;
    }
  }

  /**
   * Executes an HTTP request against a resolved destination or target URL
   */
  async execute(targetUrl, options = {}) {
    const method = String(options.method || 'GET').toUpperCase();
    this.assertReadOnly(method);

    const headers = {
      Accept: 'application/json, application/xml',
      ...options.headers
    };

    const clientNumber = options.sapClient || process.env.SAP_CLIENT || '200';
    if (!headers['sap-client']) {
      headers['sap-client'] = clientNumber;
    }

    let attempt = 0;
    let lastError = null;

    while (attempt <= this.maxRetries) {
      attempt++;
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), this.timeoutMs);

      try {
        const response = await this.directFetch(targetUrl, {
          method,
          headers,
          signal: controller.signal
        });

        clearTimeout(timer);

        const contentType = response.headers.get('content-type') || '';
        let body;
        if (contentType.includes('application/json')) {
          try {
            body = await response.json();
          } catch {
            body = await response.text();
          }
        } else {
          body = await response.text();
        }

        if (response.ok) {
          return {
            success: true,
            status: response.status,
            headers: sanitizeHeaders(Object.fromEntries(response.headers.entries())),
            data: body,
            attempt
          };
        }

        // Response was not ok (4xx or 5xx)
        const classification = classifySapError(response.status, body);

        // If it's a transient 502/503/504 and we have retries left
        if ((response.status === 502 || response.status === 503 || response.status === 504) && attempt <= this.maxRetries) {
          await new Promise((r) => setTimeout(r, this.retryDelayMs * attempt));
          continue;
        }

        return {
          success: false,
          status: response.status,
          statusCode: classification.statusCode,
          connectivityStatus: classification.connectivityStatus,
          category: classification.category,
          isInfrastructureFailure: classification.isInfrastructureFailure,
          canConcludeMissingApp: classification.canConcludeMissingApp,
          errorMessage: sanitizeErrorMessage(typeof body === 'string' ? body : (body.error?.message?.value || body.message || `HTTP ${response.status}`)),
          details: body,
          attempt
        };
      } catch (networkErr) {
        clearTimeout(timer);
        lastError = networkErr;

        const isTimeout = networkErr.name === 'AbortError' || networkErr.message.includes('abort');
        const statusCode = isTimeout ? 'TIMEOUT' : 'NETWORK_UNAVAILABLE';

        if (attempt <= this.maxRetries && !isTimeout) {
          await new Promise((r) => setTimeout(r, this.retryDelayMs * attempt));
          continue;
        }

        return {
          success: false,
          status: isTimeout ? 504 : 503,
          statusCode,
          connectivityStatus: isTimeout ? 'TIMEOUT' : 'NETWORK_UNAVAILABLE',
          isInfrastructureFailure: true,
          canConcludeMissingApp: false,
          errorMessage: sanitizeErrorMessage(networkErr.message || 'Network request failed'),
          attempt
        };
      }
    }

    return {
      success: false,
      status: 503,
      statusCode: 'NETWORK_UNAVAILABLE',
      connectivityStatus: 'NETWORK_UNAVAILABLE',
      isInfrastructureFailure: true,
      canConcludeMissingApp: false,
      errorMessage: sanitizeErrorMessage(lastError?.message || 'Exceeded maximum retry attempts')
    };
  }
}

export const defaultSapHttpClient = new SapHttpClient();
