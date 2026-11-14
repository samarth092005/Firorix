/**
 * Fiorify — BTP Destination Adapter
 *
 * Implements SAP BTP Destination and Connectivity service integration
 * using the official SAP Cloud SDK packages:
 * - @sap-cloud-sdk/connectivity
 * - @sap-cloud-sdk/http-client
 *
 * Target Landscape:
 * - SAP S/4HANA 2023 Private Edition (System: S21, Client: 200)
 * - BTP Destination: S21 (BasicAuthentication, OnPremise proxy)
 * - Cloud Connector Target URL: http://kbl_fiori:8000
 *
 * INVARIANTS:
 * - Keeps SAP credentials out of application code, responses, and logs.
 * - Never logs authorization headers, tokens, passwords, or client secrets.
 * - Returns structured, sanitized diagnostics and error categories.
 * - Does not mock a successful Gateway response in LIVE_SAP mode.
 * - Supports both Cloud Foundry runtime and Local developer runtime.
 */

import { getDestination } from '@sap-cloud-sdk/connectivity';
import { executeHttpRequest } from '@sap-cloud-sdk/http-client';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

export const GATEWAY_CATALOG_PATH = '/sap/opu/odata/IWFND/CATALOGSERVICE;v=2/ServiceCollection';

/**
 * Loads local environment variables from .env if running locally outside Cloud Foundry.
 */
export function loadLocalEnv() {
  const candidatePaths = [
    path.resolve(process.cwd(), '.env'),
    path.resolve(process.cwd(), 'backend', '.env')
  ];

  for (const targetPath of candidatePaths) {
    if (fs.existsSync(targetPath)) {
      try {
        const content = fs.readFileSync(targetPath, 'utf8');
        for (const line of content.split('\n')) {
          const trimmed = line.trim();
          if (!trimmed || trimmed.startsWith('#')) continue;
          const idx = trimmed.indexOf('=');
          if (idx !== -1) {
            const key = trimmed.slice(0, idx).trim();
            const val = trimmed.slice(idx + 1).trim();
            if (process.env[key] === undefined) {
              process.env[key] = val;
            }
          }
        }
        break;
      } catch {
        // Fallback silently if file read fails
      }
    }
  }
}

// Auto-load on initialization
loadLocalEnv();

/**
 * Sanitizes headers to prevent credential leakage in logs or responses.
 */
export function sanitizeHeaders(headers = {}) {
  const sanitized = {};
  const sensitiveHeaderPatterns = [
    'authorization',
    'x-csrf-token',
    'cookie',
    'set-cookie',
    'proxy-authorization',
    'clientsecret',
    'client_secret',
    'password',
    'token',
    'x-fiorify-admin-secret'
  ];

  for (const [key, value] of Object.entries(headers)) {
    const lowerKey = key.toLowerCase();
    if (sensitiveHeaderPatterns.some((pattern) => lowerKey.includes(pattern))) {
      sanitized[key] = '[REDACTED]';
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

/**
 * Sanitizes error messages by scrubbing Bearer tokens, Basic auth hashes, and query secrets.
 */
export function sanitizeErrorMessage(message = '') {
  if (typeof message !== 'string') return String(message);

  return message
    .replace(/Bearer\s+[A-Za-z0-9._~+/-]+=*/gi, 'Bearer [REDACTED]')
    .replace(/Basic\s+[A-Za-z0-9+/=]+/gi, 'Basic [REDACTED]')
    .replace(/(client_?secret=)[^&\s]+/gi, '$1[REDACTED]')
    .replace(/(password=)[^&\s]+/gi, '$1[REDACTED]')
    .replace(/(token=)[^&\s]+/gi, '$1[REDACTED]');
}

/**
 * Sanitizes destination object to scrub plain-text passwords and auth tokens.
 */
export function sanitizeDestination(dest) {
  if (!dest || typeof dest !== 'object') return dest;
  const clone = { ...dest };
  if (clone.password) clone.password = '[REDACTED]';
  if (clone.authTokens) clone.authTokens = '[REDACTED]';
  return clone;
}

export class BtpDestinationAdapter {
  constructor(options = {}) {
    this.destinationName = options.destinationName || process.env.SAP_DESTINATION_NAME || 'S21';
    this.sapClient = options.sapClient || process.env.SAP_CLIENT || '200';
    this.timeoutMs = Number(options.timeoutMs || process.env.SAP_TIMEOUT_MS) || 1500;
    this.adminSecret = options.adminSecret || process.env.Fiorify_ADMIN_SECRET || '';

    // Fast circuit-breaker for unreachable SAP host to avoid 10-20s freezes
    this.lastFailureTime = 0;
    this.failureCooldownMs = 60000; // 60 seconds fast-failure cache

    // Dependency injection points for testing without real BTP/SAP calls
    this.vcapServices = options.vcapServices !== undefined ? options.vcapServices : process.env.VCAP_SERVICES;
    this.sdkGetDestination = options.sdkGetDestination || getDestination;
    this.sdkExecuteHttpRequest = options.sdkExecuteHttpRequest || executeHttpRequest;

    // Optional override for custom HTTP fetch in local direct mode
    this.directFetch = options.directFetch || globalThis.fetch;
  }

  /**
   * Timing-safe verification of the server-side administrative secret.
   */
  verifyAdminSecret(providedSecret) {
    const configuredSecret = this.adminSecret || process.env.Fiorify_ADMIN_SECRET || (process.env.NODE_ENV !== 'production' ? 'dev-admin-secret-change-in-production' : '');

    if (!configuredSecret || typeof configuredSecret !== 'string') {
      return false;
    }

    if (!providedSecret || typeof providedSecret !== 'string') {
      return false;
    }

    const providedBuffer = Buffer.from(providedSecret, 'utf8');
    const configuredBuffer = Buffer.from(configuredSecret, 'utf8');

    if (providedBuffer.length !== configuredBuffer.length) {
      return false;
    }

    return crypto.timingSafeEqual(providedBuffer, configuredBuffer);
  }

  /**
   * Discovers and inspects service bindings in VCAP_SERVICES or local environment.
   */
  inspectBinding(serviceType, vcap) {
    // 1. If vcap is explicitly provided, inspect it strictly
    if (vcap !== undefined && vcap !== null) {
      let parsedVcap = vcap;
      if (typeof vcap === 'string') {
        try {
          parsedVcap = JSON.parse(vcap);
        } catch (err) {
          return { present: false, reason: `Failed to parse VCAP_SERVICES JSON: ${err.message}` };
        }
      }

      if (typeof parsedVcap === 'object' && parsedVcap !== null) {
        // Direct key lookup
        let candidateEntries = [];
        if (Array.isArray(parsedVcap[serviceType])) {
          candidateEntries = parsedVcap[serviceType];
        } else if (parsedVcap[serviceType] && typeof parsedVcap[serviceType] === 'object') {
          candidateEntries = [parsedVcap[serviceType]];
        }

        // Fallback search
        if (candidateEntries.length === 0) {
          for (const [key, val] of Object.entries(parsedVcap)) {
            const list = Array.isArray(val) ? val : [val];
            for (const item of list) {
              if (!item || typeof item !== 'object') continue;
              const labelMatch = typeof item.label === 'string' && item.label.toLowerCase() === serviceType.toLowerCase();
              const tagMatch = Array.isArray(item.tags) && item.tags.some((t) => typeof t === 'string' && t.toLowerCase().includes(serviceType.toLowerCase()));
              const nameMatch = typeof item.name === 'string' && item.name.toLowerCase().includes(serviceType.toLowerCase());

              if (labelMatch || tagMatch || nameMatch) {
                candidateEntries.push(item);
              }
            }
          }
        }

        if (candidateEntries.length > 0) {
          const selected = candidateEntries[0];
          const credentials = selected.credentials || {};
          const credentialKeys = Object.keys(credentials);

          const hasClientId = Boolean(credentials.clientid);
          const hasSecretOrCert = Boolean(credentials.clientsecret || credentials.certificate);

          let specificValid = false;
          if (serviceType === 'destination') {
            const hasUrl = Boolean(credentials.uri || credentials.url || credentials.uaa);
            specificValid = hasClientId && hasSecretOrCert && hasUrl;
          } else if (serviceType === 'connectivity') {
            const hasProxy = Boolean(credentials.onpremise_proxy_host || credentials.onpremise_proxy_port || credentials.token_service_url);
            specificValid = hasClientId && hasSecretOrCert && hasProxy;
          } else {
            specificValid = hasClientId && hasSecretOrCert;
          }

          return {
            present: true,
            instanceName: selected.name || selected.instance_name || 'unnamed',
            plan: selected.plan || 'unknown',
            label: selected.label || serviceType,
            tags: selected.tags || [],
            hasCredentials: credentialKeys.length > 0,
            isConfigured: specificValid,
            credentialKeys
          };
        }
      }

      return { present: false, reason: `No binding found matching service type "${serviceType}".` };
    }

    // 2. Local Environment Variable Fallback (only when vcapServices is undefined/null)
    if (serviceType === 'destination') {
      const clientId = process.env.BTP_DESTINATION_CLIENT_ID;
      const clientSecret = process.env.BTP_DESTINATION_CLIENT_SECRET;
      const tokenUrl = process.env.BTP_DESTINATION_TOKEN_URL;
      const destUrl = process.env.BTP_DESTINATION_URL;

      if (clientId && clientSecret && (tokenUrl || destUrl)) {
        return {
          present: true,
          instanceName: 'local-destination-env',
          plan: 'lite-local',
          label: 'destination',
          tags: ['destination', 'local-env'],
          hasCredentials: true,
          isConfigured: true,
          credentialKeys: ['clientid', 'clientsecret', 'url', 'uri']
        };
      }
    } else if (serviceType === 'connectivity') {
      const localProxy = process.env.LOCAL_CONNECTIVITY_PROXY || process.env.LOCAL_CONNECTIVITY_TUNNEL_PORT;
      const clientId = process.env.BTP_CONNECTIVITY_CLIENT_ID;
      const proxyHost = process.env.BTP_CONNECTIVITY_PROXY_HOST;

      if (localProxy || (clientId && proxyHost)) {
        return {
          present: true,
          instanceName: 'local-connectivity-tunnel',
          plan: 'lite-local',
          label: 'connectivity',
          tags: ['connectivity', 'local-tunnel'],
          hasCredentials: true,
          isConfigured: true,
          credentialKeys: ['onpremise_proxy_host', 'onpremise_proxy_port']
        };
      }
    }

    return { present: false, reason: `No binding or local configuration found matching service type "${serviceType}".` };
  }

  /**
   * Validates all required configuration: bindings, destination name, client, and timeout.
   */
  validateConfiguration() {
    const issues = [];

    // 1. Destination binding check
    const destinationBinding = this.inspectBinding('destination', this.vcapServices);
    if (!destinationBinding.present) {
      issues.push(`Missing destination service binding: ${destinationBinding.reason}`);
    } else if (!destinationBinding.isConfigured) {
      issues.push('Destination service binding is missing required credential attributes (clientid, clientsecret/certificate, uri/url).');
    }

    // 2. Connectivity binding check (required for OnPremise proxy route unless direct URL override is configured locally)
    const isDirectLocal = !this.vcapServices && Boolean(process.env.SAP_URL_OVERRIDE);
    const connectivityBinding = this.inspectBinding('connectivity', this.vcapServices);
    if (!isDirectLocal && !connectivityBinding.present) {
      issues.push(`Missing connectivity service binding: ${connectivityBinding.reason}`);
    } else if (!isDirectLocal && !connectivityBinding.isConfigured) {
      issues.push('Connectivity service binding is missing required credential attributes (clientid, clientsecret/certificate, onpremise_proxy_host).');
    }

    // 3. Destination name check
    if (!this.destinationName || typeof this.destinationName !== 'string' || this.destinationName.trim().length === 0) {
      issues.push('Destination name is empty or invalid.');
    }

    // 4. SAP client check
    if (!this.sapClient || !/^\d{3}$/.test(String(this.sapClient).trim())) {
      issues.push(`SAP client "${this.sapClient}" is invalid. Expected a 3-digit numeric string (e.g. "200").`);
    }

    // 5. Timeout check
    if (!Number.isInteger(this.timeoutMs) || this.timeoutMs <= 0 || this.timeoutMs > 120000) {
      issues.push(`Timeout "${this.timeoutMs}" is invalid. Expected a positive integer in milliseconds (1 - 120000).`);
    }

    const isValid = issues.length === 0;

    return {
      isValid,
      summary: isValid ? 'All BTP Destination and Connectivity configurations are valid.' : 'Configuration validation failed.',
      destinationBinding,
      connectivityBinding,
      configuration: {
        destinationName: this.destinationName,
        sapClient: String(this.sapClient).trim(),
        timeoutMs: this.timeoutMs
      },
      issues
    };
  }

  /**
   * Resolves the BTP destination using SAP Cloud SDK or direct BTP REST API.
   */
  async resolveDestination(destinationName = this.destinationName) {
    // 1. Attempt resolution via SAP Cloud SDK
    try {
      const destination = await this.sdkGetDestination({ destinationName });
      if (destination) {
        return {
          success: true,
          destination,
          provenance: 'SAP_CLOUD_SDK'
        };
      }
    } catch (sdkErr) {
      // If SDK throws (e.g. missing local connectivity binding for OnPremise destination),
      // fallback to direct BTP Destination Service REST resolution if local credentials are provided.
    }

    // 2. Direct BTP Destination Service REST Resolution (for local development)
    const clientId = process.env.BTP_DESTINATION_CLIENT_ID;
    const clientSecret = process.env.BTP_DESTINATION_CLIENT_SECRET;
    const tokenUrl = process.env.BTP_DESTINATION_TOKEN_URL;
    const destUrl = process.env.BTP_DESTINATION_URL || 'https://destination-configuration.cfapps.eu30.hana.ondemand.com';

    if (clientId && clientSecret && tokenUrl) {
      try {
        const tokenRes = await this.directFetch(tokenUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            grant_type: 'client_credentials',
            client_id: clientId,
            client_secret: clientSecret
          })
        });

        if (!tokenRes.ok) {
          return {
            success: false,
            statusCode: 'AUTHENTICATION_FAILED',
            errorMessage: `BTP Destination Service authentication failed (HTTP ${tokenRes.status}) while retrieving access token.`
          };
        }

        const tokenData = await tokenRes.json();
        const destRes = await this.directFetch(`${destUrl}/destination-configuration/v1/subaccountDestinations`, {
          headers: { Authorization: `Bearer ${tokenData.access_token}` }
        });

        if (!destRes.ok) {
          return {
            success: false,
            statusCode: 'DESTINATION_SERVICE_ERROR',
            errorMessage: `BTP Destination Service returned HTTP ${destRes.status} while querying subaccount destinations.`
          };
        }

        const destinations = await destRes.json();
        const found = Array.isArray(destinations) ? destinations.find((d) => d.Name === destinationName) : null;

        if (!found) {
          return {
            success: false,
            statusCode: 'DESTINATION_NOT_FOUND',
            errorMessage: `Destination "${destinationName}" not found in BTP subaccount destinations.`
          };
        }

        const effectiveUrl = process.env.SAP_URL_OVERRIDE || found.URL;
        const effectiveProxyType = process.env.SAP_URL_OVERRIDE ? 'Internet' : (found.ProxyType || 'OnPremise');
        const effectiveUser = process.env.SAP_USER || found.User || undefined;
        const effectivePassword = process.env.SAP_PASSWORD || found.Password || undefined;

        return {
          success: true,
          destination: {
            name: found.Name,
            url: effectiveUrl,
            proxyType: effectiveProxyType,
            authentication: found.Authentication || 'BasicAuthentication',
            username: effectiveUser,
            password: effectivePassword,
            sapClient: found['sap-client'] || this.sapClient
          },
          provenance: 'BTP_DESTINATION_SERVICE_REST'
        };
      } catch (restErr) {
        return {
          success: false,
          statusCode: 'DESTINATION_RESOLUTION_FAILED',
          errorMessage: `Direct destination resolution failed: ${sanitizeErrorMessage(restErr.message)}`
        };
      }
    }

    // 3. Local Direct Fallback if SAP_URL_OVERRIDE is provided
    if (process.env.SAP_URL_OVERRIDE) {
      return {
        success: true,
        destination: {
          name: destinationName,
          url: process.env.SAP_URL_OVERRIDE,
          proxyType: 'Internet',
          authentication: 'BasicAuthentication',
          username: process.env.SAP_USER || undefined,
          password: process.env.SAP_PASSWORD || undefined,
          sapClient: this.sapClient
        },
        provenance: 'LOCAL_ENV_DIRECT'
      };
    }

    return {
      success: false,
      statusCode: 'DESTINATION_NOT_FOUND',
      errorMessage: `Destination "${destinationName}" could not be resolved from BTP Destination Service.`
    };
  }

  /**
   * Executes an HTTP request against the destination using SAP Cloud SDK http-client.
   * Categorizes errors into explicit, actionable domain categories.
   */
  async executeRequest(requestConfig = {}) {
    const {
      path = '/',
      method = 'GET',
      params = {},
      headers = {},
      destination = null
    } = requestConfig;

    let targetDestination = destination;
    if (!targetDestination) {
      const resolution = await this.resolveDestination();
      if (!resolution.success) {
        return resolution;
      }
      targetDestination = resolution.destination;
    }

    const requestHeaders = {
      Accept: 'application/json',
      'sap-client': String(this.sapClient).trim(),
      'X-Requested-With': 'XMLHttpRequest',
      ...headers
    };

    const sanitizedReqHeaders = sanitizeHeaders(requestHeaders);

    // If destination has BasicAuthentication with credentials, attach Authorization header
    if (targetDestination.authentication === 'BasicAuthentication' && targetDestination.username && targetDestination.password) {
      const basicHash = Buffer.from(`${targetDestination.username}:${targetDestination.password}`).toString('base64');
      requestHeaders['Authorization'] = `Basic ${basicHash}`;
    }

    // Fast-fail if host recently timed out/failed (prevents 15-20s UI freezes on every search)
    const now = Date.now();
    if (this.lastFailureTime && (now - this.lastFailureTime < this.failureCooldownMs)) {
      return {
        success: false,
        statusCode: 'CONNECTION_FAILED',
        httpStatus: 504,
        errorMessage: `Destination "${this.destinationName}" is unreachable (cached network failure). Falling back immediately to authoritative catalog fixtures.`,
        details: { path, cached: true }
      };
    }

    try {
      const response = await this.sdkExecuteHttpRequest(
        targetDestination,
        {
          method,
          url: path,
          params,
          headers: requestHeaders,
          timeout: this.timeoutMs
        },
        {
          fetchCsrfToken: false
        }
      );

      return {
        success: true,
        httpStatus: response.status,
        data: response.data,
        headers: sanitizeHeaders(response.headers || {})
      };
    } catch (err) {
      // If Cloud SDK fails (e.g. in local mode when OnPremise virtual host is contacted without CF internal proxy),
      // handle execution error cleanly
      return this.handleExecutionError(err, path, sanitizedReqHeaders);
    }
  }

  /**
   * Normalizes and sanitizes HTTP / network / SDK execution errors.
   */
  handleExecutionError(err, path, requestHeaders) {
    const response = err?.response;
    const httpStatus = response?.status;
    const rawMessage = err?.message || 'Unknown execution error';
    const cleanMessage = sanitizeErrorMessage(rawMessage);

    // 1. Timeout detection
    const isTimeout =
      err?.code === 'ECONNABORTED' ||
      err?.code === 'ETIMEDOUT' ||
      cleanMessage.toLowerCase().includes('timeout') ||
      err?.name === 'AbortError';

    if (isTimeout) {
      this.lastFailureTime = Date.now();
      return {
        success: false,
        statusCode: 'TIMEOUT',
        httpStatus: 504,
        errorMessage: `Request to destination "${this.destinationName}" timed out after ${this.timeoutMs}ms while contacting ${path}.`,
        details: { path, timeoutMs: this.timeoutMs }
      };
    }

    // 2. Gateway HTTP 401: Authentication failure
    if (httpStatus === 401) {
      return {
        success: false,
        statusCode: 'AUTHENTICATION_FAILED',
        httpStatus: 401,
        errorMessage: `SAP Gateway Authentication Failed (HTTP 401) on destination "${this.destinationName}" (Client ${this.sapClient}). Verify user/password credentials configured in BTP Destination S21.`,
        details: { path, destination: this.destinationName, client: this.sapClient }
      };
    }

    // 3. Gateway HTTP 403: Authorization failure
    if (httpStatus === 403) {
      return {
        success: false,
        statusCode: 'AUTHORIZATION_FAILED',
        httpStatus: 403,
        errorMessage: `SAP Gateway Authorization Failed (HTTP 403) on destination "${this.destinationName}" (Client ${this.sapClient}). The technical user lacks authorization (check PFCG object S_SERVICE for target service).`,
        details: { path, destination: this.destinationName, client: this.sapClient }
      };
    }

    // 4. Gateway HTTP 404: Service not found
    if (httpStatus === 404) {
      return {
        success: false,
        statusCode: 'SERVICE_NOT_FOUND',
        httpStatus: 404,
        errorMessage: `SAP Gateway endpoint not found (HTTP 404) at ${path}. (Note: A Gateway 404 on an OData endpoint indicates the service is inactive in /IWFND/MAINT_SERVICE; it does not indicate that a DDIC transaction code does not exist.)`,
        details: { path, destination: this.destinationName }
      };
    }

    // 5. Gateway HTTP 502 / 503 / 504: Upstream / Cloud Connector / Proxy failures
    if (httpStatus === 502 || httpStatus === 503 || httpStatus === 504) {
      this.lastFailureTime = Date.now();
      return {
        success: false,
        statusCode: 'CONNECTIVITY_FAILED',
        httpStatus,
        errorMessage: `Upstream Gateway connectivity failure (HTTP ${httpStatus}) from destination "${this.destinationName}". Verify Cloud Connector registration and virtual host route (http://kbl_fiori:8000).`,
        details: { path, destination: this.destinationName, upstreamStatus: httpStatus }
      };
    }

    // 6. Network socket errors (including local Windows unroutable virtual host)
    const networkErrorCodes = ['ECONNREFUSED', 'ENOTFOUND', 'EHOSTUNREACH', 'EAI_AGAIN'];
    if (networkErrorCodes.includes(err?.code) || cleanMessage.includes('ENOTFOUND') || cleanMessage.includes('ECONNREFUSED')) {
      this.lastFailureTime = Date.now();
      const isVirtualHost = this.destinationName === 'S21';
      const remediation = isVirtualHost
        ? 'Target URL (http://kbl_fiori:8000) is an OnPremise virtual host mapped in SAP Cloud Connector. For local developer execution, an active tunnel to the BTP Connectivity proxy (e.g., port 20003) or corporate VPN line-of-sight is required.'
        : 'Verify host name resolution and network line-of-sight.';

      return {
        success: false,
        statusCode: 'CONNECTIVITY_FAILED',
        httpStatus: 502,
        errorMessage: `Network connection failed (${err?.code || 'ENOTFOUND'}) while routing to destination "${this.destinationName}": ${remediation}`,
        details: {
          code: err?.code || 'ENOTFOUND',
          path,
          destination: this.destinationName,
          proxyType: 'OnPremise'
        }
      };
    }

    // 7. Generic / SDK error
    return {
      success: false,
      statusCode: 'GATEWAY_ERROR',
      httpStatus: httpStatus || 500,
      errorMessage: `Gateway communication error: ${cleanMessage}`,
      details: { path }
    };
  }

  /**
   * Executes the isolated Gateway smoke test against the standard catalog service:
   * /sap/opu/odata/IWFND/CATALOGSERVICE;v=2/ServiceCollection
   */
  async executeSmokeTest() {
    const startTime = Date.now();

    // 1. Pre-flight configuration validation
    const configValidation = this.validateConfiguration();
    if (!configValidation.isValid) {
      return {
        success: false,
        statusCode: 'CONFIGURATION_INVALID',
        httpStatus: 503,
        errorMessage: 'BTP environment is not ready for live SAP Gateway communication. Service bindings or configuration are incomplete.',
        diagnostics: configValidation,
        timestamp: new Date().toISOString()
      };
    }

    // 2. Resolve destination
    const destResolution = await this.resolveDestination();
    if (!destResolution.success) {
      return {
        success: false,
        statusCode: destResolution.statusCode || 'DESTINATION_NOT_FOUND',
        httpStatus: 502,
        destination: this.destinationName,
        sapClient: this.sapClient,
        targetEndpoint: GATEWAY_CATALOG_PATH,
        errorMessage: destResolution.errorMessage,
        diagnostics: {
          bindingValidation: configValidation,
          elapsedMs: Date.now() - startTime
        },
        timestamp: new Date().toISOString()
      };
    }

    // 3. Execute query against Gateway Catalog Service
    const result = await this.executeRequest({
      destination: destResolution.destination,
      path: GATEWAY_CATALOG_PATH,
      method: 'GET',
      params: {
        $top: '1',
        $format: 'json'
      }
    });

    const elapsedMs = Date.now() - startTime;

    if (!result.success) {
      return {
        success: false,
        statusCode: result.statusCode,
        httpStatus: result.httpStatus || 502,
        destination: this.destinationName,
        sapClient: this.sapClient,
        targetEndpoint: GATEWAY_CATALOG_PATH,
        errorMessage: result.errorMessage,
        diagnostics: {
          bindingValidation: configValidation,
          destinationResolution: {
            resolved: true,
            provenance: destResolution.provenance,
            url: destResolution.destination.url,
            proxyType: destResolution.destination.proxyType,
            authentication: destResolution.destination.authentication
          },
          elapsedMs,
          details: result.details
        },
        timestamp: new Date().toISOString()
      };
    }

    // 4. Inspect Gateway Catalog response format
    const payload = result.data;
    let services = [];
    if (Array.isArray(payload?.d?.results)) {
      services = payload.d.results;
    } else if (Array.isArray(payload?.d)) {
      services = payload.d;
    } else if (payload?.d && typeof payload.d === 'object') {
      services = [payload.d];
    } else {
      return {
        success: false,
        statusCode: 'MALFORMED_RESPONSE',
        httpStatus: 502,
        destination: this.destinationName,
        sapClient: this.sapClient,
        targetEndpoint: GATEWAY_CATALOG_PATH,
        errorMessage: 'Malformed OData response from Gateway Catalog: expected "d.results" array or "d" object.',
        diagnostics: {
          bindingValidation: configValidation,
          elapsedMs
        },
        timestamp: new Date().toISOString()
      };
    }

    // Extract minimal, sanitized sample service representation
    const sample = services[0] || null;
    const sampleMetadata = sample
      ? {
          technicalServiceName: sample.TechnicalServiceName || sample.ID || sample.ServiceName || 'UNKNOWN',
          version: sample.Version || sample.TechnicalServiceVersion || '0001',
          description: sample.Description || sample.Text || undefined
        }
      : null;

    return {
      success: true,
      statusCode: 'SUCCESS',
      httpStatus: 200,
      destination: this.destinationName,
      sapClient: this.sapClient,
      targetEndpoint: GATEWAY_CATALOG_PATH,
      gatewayResponse: {
        servicesReturned: services.length,
        sampleService: sampleMetadata
      },
      diagnostics: {
        bindingValidation: configValidation,
        destinationResolution: {
          resolved: true,
          provenance: destResolution.provenance,
          url: destResolution.destination.url,
          proxyType: destResolution.destination.proxyType
        },
        elapsedMs,
        provenance: 'LIVE_SAP_GATEWAY_CATALOG'
      },
      timestamp: new Date().toISOString()
    };
  }
}

export const btpDestinationAdapter = new BtpDestinationAdapter();
