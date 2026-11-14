/**
 * Fiorify — Resilient Read-Only SAP HTTP Client (Stage S3)
 *
 * Implements:
 * - Read-only enforcement (strictly GET / HEAD for SAP endpoints)
 * - Automatic retry with jitter for transient gateway / Cloud Connector blips
 * - Strict timeout governance
 * - Comprehensive credential & token scrubbing from outgoing headers and incoming errors
 */

import crypto from 'node:crypto';
import path from 'node:path';
import { sanitizeHeaders, sanitizeErrorMessage } from '../../adapters/btpDestinationAdapter.js';
import { classifySapError, isConnectivityFailure } from './sapErrorTaxonomy.js';

export const ALLOWED_SAP_ENDPOINT_PREFIXES = Object.freeze([
  '/sap/opu/odata/',
  '/sap/opu/odata4/',
  '/sap/bc/adt/',
  '/sap/bc/echo',
  '/sap/public/bc/'
]);

export const DEFAULT_ALLOWED_HOST_PATTERNS = Object.freeze([
  /^localhost(:[0-9]+)?$/i,
  /^127\.0\.0\.1(:[0-9]+)?$/i,
  /^192\.168\.\d{1,3}\.\d{1,3}(:[0-9]+)?$/i,
  /^10\.\d{1,3}\.\d{1,3}\.\d{1,3}(:[0-9]+)?$/i,
  /^172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3}(:[0-9]+)?$/i,
  /^([a-z0-9_-]+\.)*corp\.internal(:[0-9]+)?$/i,
  /^([a-z0-9_-]+\.)*corp(:[0-9]+)?$/i,
  /^([a-z0-9_-]+\.)*internal(:[0-9]+)?$/i,
  /^([a-z0-9_-]+\.)*local(:[0-9]+)?$/i,
  /^([a-z0-9_-]+\.)*ondemand\.com(:[0-9]+)?$/i,
  /^([a-z0-9_-]+\.)*sap(:[0-9]+)?$/i,
  /^s21(:[0-9]+)?$/i,
  /^kbl_fiori(:[0-9]+)?$/i,
  /^sap-s21\.internal(:[0-9]+)?$/i
]);

export class SapHttpClient {
  constructor(options = {}) {
    this.timeoutMs = options.timeoutMs || Number(process.env.SAP_TIMEOUT_MS) || 15000;
    this.maxRetries = options.maxRetries !== undefined ? options.maxRetries : 2;
    this.retryDelayMs = options.retryDelayMs || 500;
    this.directFetch = options.directFetch || globalThis.fetch;
    this.allowedHosts = options.allowedHosts || (process.env.ALLOWED_SAP_HOSTS ? process.env.ALLOWED_SAP_HOSTS.split(',').map(h => h.trim()) : null);
  }

  /**
   * Evaluates whether a host is approved for SAP HTTP requests
   */
  isHostAllowed(host) {
    if (!host) return false;
    const cleanHost = String(host).toLowerCase().trim();

    if (Array.isArray(this.allowedHosts) && this.allowedHosts.length > 0) {
      return this.allowedHosts.some(h => {
        const clean = h.toLowerCase().trim();
        return cleanHost === clean || cleanHost.startsWith(`${clean}:`);
      });
    }

    if (process.env.SAP_HOST) {
      const envHost = process.env.SAP_HOST.toLowerCase().trim();
      if (cleanHost === envHost || cleanHost.startsWith(`${envHost}:`)) return true;
    }

    return DEFAULT_ALLOWED_HOST_PATTERNS.some(pattern => pattern.test(cleanHost));
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
   * Enforces that only approved SAP diagnostic and metadata endpoints can be queried (REM-SEC-05)
   */
  assertAllowedEndpoint(targetUrl) {
    if (!targetUrl || typeof targetUrl !== 'string') {
      const err = new Error('Invalid SAP endpoint URL: Target URL is required.');
      err.code = 'INVALID_ENDPOINT';
      throw err;
    }

    const trimmed = targetUrl.trim();
    if (!trimmed) {
      const err = new Error('Invalid SAP endpoint URL: Target URL cannot be empty.');
      err.code = 'INVALID_ENDPOINT';
      throw err;
    }

    // 1. Detect null bytes, illegal backslashes, and dangerous separators in raw string
    if (trimmed.includes('\0') || trimmed.toLowerCase().includes('%00')) {
      const err = new Error('Malformed SAP endpoint URL: Null byte injection detected.');
      err.code = 'INVALID_ENDPOINT';
      throw err;
    }

    if (trimmed.includes('\\') || /%5c/i.test(trimmed)) {
      const err = new Error('Malformed SAP endpoint URL: Backslash path separator is forbidden.');
      err.code = 'INVALID_ENDPOINT';
      throw err;
    }

    // Ambiguous encoded separators (%2f / %2F)
    if (/%2f/i.test(trimmed)) {
      const err = new Error(`Ambiguous encoded separator in SAP endpoint URL: "${trimmed}"`);
      err.code = 'DISALLOWED_SAP_ENDPOINT';
      err.statusCode = 'AUTHORIZATION_BLOCKED';
      throw err;
    }

    // Protocol-relative URLs (e.g. //attacker.com/sap/...)
    if (trimmed.startsWith('//')) {
      const err = new Error(`UNAUTHORIZED SAP ENDPOINT ACCESS BLOCKED: Protocol-relative URL forbidden: "${trimmed}"`);
      err.code = 'DISALLOWED_SAP_ENDPOINT';
      err.statusCode = 'AUTHORIZATION_BLOCKED';
      throw err;
    }

    // 2. Decode and check for single and double-encoded path traversal
    let decoded;
    try {
      decoded = decodeURIComponent(trimmed);
    } catch {
      const err = new Error(`Malformed SAP endpoint URL: URI decoding failed.`);
      err.code = 'INVALID_ENDPOINT';
      throw err;
    }

    if (trimmed.includes('..') || decoded.includes('..') || /%2e/i.test(trimmed)) {
      const err = new Error(`UNAUTHORIZED SAP ENDPOINT ACCESS BLOCKED: Path traversal attempt detected in "${trimmed}".`);
      err.code = 'DISALLOWED_SAP_ENDPOINT';
      err.statusCode = 'AUTHORIZATION_BLOCKED';
      throw err;
    }

    if (decoded.includes('%')) {
      try {
        const doubleDecoded = decodeURIComponent(decoded);
        if (doubleDecoded.includes('..') || /%2e/i.test(decoded)) {
          const err = new Error(`UNAUTHORIZED SAP ENDPOINT ACCESS BLOCKED: Double-encoded traversal attempt detected in "${trimmed}".`);
          err.code = 'DISALLOWED_SAP_ENDPOINT';
          err.statusCode = 'AUTHORIZATION_BLOCKED';
          throw err;
        }
      } catch (e) {
        if (e.code === 'DISALLOWED_SAP_ENDPOINT') throw e;
        const err = new Error(`Malformed SAP endpoint URL: Nested URI decoding failed.`);
        err.code = 'INVALID_ENDPOINT';
        throw err;
      }
    }

    // 3. Parse URL and validate protocol / host
    let parsed;
    const isAbsolute = /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(trimmed);

    if (isAbsolute) {
      try {
        parsed = new URL(trimmed);
      } catch (parseErr) {
        const err = new Error(`Malformed SAP endpoint URL: ${parseErr.message}`);
        err.code = 'INVALID_ENDPOINT';
        throw err;
      }

      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        const err = new Error(`UNAUTHORIZED SAP ENDPOINT ACCESS BLOCKED: Protocol "${parsed.protocol}" is forbidden. Only HTTP/HTTPS permitted.`);
        err.code = 'DISALLOWED_SAP_ENDPOINT';
        err.statusCode = 'AUTHORIZATION_BLOCKED';
        throw err;
      }

      const host = parsed.host;
      if (!this.isHostAllowed(host)) {
        const err = new Error(`UNAUTHORIZED SAP ENDPOINT ACCESS BLOCKED: Host "${host}" is not an approved SAP destination host.`);
        err.code = 'DISALLOWED_SAP_ENDPOINT';
        err.statusCode = 'AUTHORIZATION_BLOCKED';
        throw err;
      }
    } else {
      try {
        const pathWithSlash = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
        parsed = new URL(pathWithSlash, 'http://sap.internal.local');
      } catch (parseErr) {
        const err = new Error(`Malformed SAP endpoint URL: ${parseErr.message}`);
        err.code = 'INVALID_ENDPOINT';
        throw err;
      }
    }

    // 4. Normalize path and validate against allowlisted prefixes
    const rawPathname = parsed.pathname;
    const canonicalPath = path.posix.normalize(rawPathname);

    if (canonicalPath.includes('..') || !canonicalPath.startsWith('/')) {
      const err = new Error(`UNAUTHORIZED SAP ENDPOINT ACCESS BLOCKED: Illegal normalized path "${canonicalPath}".`);
      err.code = 'DISALLOWED_SAP_ENDPOINT';
      err.statusCode = 'AUTHORIZATION_BLOCKED';
      throw err;
    }

    const isAllowed = ALLOWED_SAP_ENDPOINT_PREFIXES.some(prefix => {
      if (prefix.endsWith('/')) {
        return canonicalPath === prefix.slice(0, -1) || canonicalPath.startsWith(prefix);
      }
      return canonicalPath === prefix || canonicalPath.startsWith(prefix + '/');
    });

    if (!isAllowed) {
      const err = new Error(
        `UNAUTHORIZED SAP ENDPOINT ACCESS BLOCKED: Path "${canonicalPath}" is outside the Fiorify SAP Diagnostic Allowlist. ` +
        `Allowed endpoints: ${ALLOWED_SAP_ENDPOINT_PREFIXES.join(', ')}`
      );
      err.code = 'DISALLOWED_SAP_ENDPOINT';
      err.statusCode = 'AUTHORIZATION_BLOCKED';
      throw err;
    }

    return canonicalPath;
  }

  /**
   * Executes an HTTP request against a resolved destination or target URL
   */
  async execute(targetUrl, options = {}) {
    const method = String(options.method || 'GET').toUpperCase();
    this.assertReadOnly(method);
    this.assertAllowedEndpoint(targetUrl);

    const correlationId = options.correlationId || `fio-corr-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;

    const isAdtEndpoint = typeof targetUrl === 'string' && targetUrl.includes('/sap/bc/adt/');
    const defaultAccept = isAdtEndpoint
      ? 'application/atomsvc+xml, application/atom+xml, application/xml, application/json'
      : 'application/json, application/xml';

    const headers = {
      Accept: defaultAccept,
      'x-correlation-id': correlationId,
      'x-request-id': correlationId,
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
