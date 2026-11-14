/**
 * Fiorify — SAP Connectivity & Destination Provider (Stage S3)
 *
 * Implements decoupled provider architecture for SAP S/4HANA connectivity:
 * - SAP Cloud SDK destination integration
 * - Local environment resolution
 * - Tenant scoping for customer SAP connections
 * - Read-only operation boundary
 */

import { btpDestinationAdapter, sanitizeErrorMessage, sanitizeDestination } from '../../adapters/btpDestinationAdapter.js';
import { defaultSapHttpClient, SapHttpClient } from './sapHttpClient.js';
import { CONNECTIVITY_STATUSES, classifySapError } from './sapErrorTaxonomy.js';

export class BtpDestinationProvider {
  constructor(options = {}) {
    this.adapter = options.adapter || btpDestinationAdapter;
  }

  async resolve(destinationName = 'S21') {
    const res = await this.adapter.resolveDestination(destinationName);
    if (!res.success) {
      return {
        success: false,
        statusCode: res.statusCode || 'DESTINATION_NOT_FOUND',
        errorMessage: res.errorMessage || `Failed to resolve destination "${destinationName}".`
      };
    }
    return {
      success: true,
      destination: sanitizeDestination(res.destination),
      rawDestination: res.destination,
      provenance: res.provenance
    };
  }

  validateConfig() {
    return this.adapter.validateConfiguration();
  }
}

export class SapConnectivityProvider {
  constructor(options = {}) {
    this.destinationProvider = options.destinationProvider || new BtpDestinationProvider();
    this.httpClient = options.httpClient || defaultSapHttpClient;
    this.defaultDestination = options.defaultDestination || process.env.SAP_DESTINATION_NAME || 'S21';
    this.defaultClient = options.defaultClient || process.env.SAP_CLIENT || '200';
  }

  /**
   * Executes a read-only query against a relative SAP endpoint path
   */
  async executeQuery(path, options = {}) {
    const connectionMode = options.connectionMode || (
      options.baseUrl || process.env.SAP_URL_OVERRIDE ? 'DIRECT_HTTP' : 'BTP_DESTINATION'
    );

    if (connectionMode === 'DIRECT_HTTP') {
      const baseUrl = (options.baseUrl || process.env.SAP_URL_OVERRIDE || 'http://127.0.0.1:8000').replace(/\/+$/, '');
      const cleanPath = path.startsWith('/') ? path : `/${path}`;
      const targetUrl = `${baseUrl}${cleanPath}`;
      const headers = { ...(options.headers || {}) };

      const user = options.username || process.env.SAP_USER;
      const pass = options.password || process.env.SAP_PASSWORD;
      if (user && pass && !headers.Authorization && !headers.authorization) {
        headers.Authorization = `Basic ${Buffer.from(`${user}:${pass}`).toString('base64')}`;
      }

      return await this.httpClient.execute(targetUrl, {
        method: options.method || 'GET',
        headers,
        sapClient: options.sapClient || this.defaultClient
      });
    }

    const destinationName = options.destinationName || this.defaultDestination;
    const resolved = await this.destinationProvider.resolve(destinationName);

    if (!resolved.success) {
      return {
        success: false,
        statusCode: resolved.statusCode,
        connectivityStatus: CONNECTIVITY_STATUSES.DESTINATION_NOT_FOUND,
        isInfrastructureFailure: true,
        canConcludeMissingApp: false,
        errorMessage: resolved.errorMessage
      };
    }

    const rawDest = resolved.rawDestination;
    const baseUrl = rawDest.url.replace(/\/+$/, '');
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    const targetUrl = `${baseUrl}${cleanPath}`;

    // Setup headers
    const headers = {
      ...(options.headers || {})
    };

    if (rawDest.username && rawDest.password && !headers.Authorization) {
      const authCredentials = Buffer.from(`${rawDest.username}:${rawDest.password}`).toString('base64');
      headers.Authorization = `Basic ${authCredentials}`;
    }

    return await this.httpClient.execute(targetUrl, {
      method: options.method || 'GET',
      headers,
      sapClient: options.sapClient || rawDest.sapClient || this.defaultClient
    });
  }

  /**
   * Returns current connectivity status
   */
  async getStatus() {
    const configCheck = this.destinationProvider.validateConfig();
    return {
      provider: 'SAP_BTP_DESTINATION',
      configured: configCheck.isValid,
      destinationName: this.defaultDestination,
      sapClient: this.defaultClient,
      issues: configCheck.issues
    };
  }
}

export const defaultSapConnectivityProvider = new SapConnectivityProvider();
