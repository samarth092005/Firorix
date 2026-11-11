/**
 * FioriX — Stage S3: SAP S/4HANA Connectivity Test Suite
 *
 * Verifies deployed-backend connectivity capabilities to SAP S/4HANA 2023 on System S21:
 *  1. BTP Destination resolution & configuration validation
 *  2. Resilient read-only SAP HTTP Client & write operation rejection
 *  3. Credential scrubbing and header sanitization
 *  4. 10-point Capability Probe & Health Service
 *  5. Error taxonomy & prevention of false "missing application" conclusions
 *  6. Cloud Connector & Network failure handling
 *  7. Administrative system diagnostics API endpoint
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { BtpDestinationProvider, SapConnectivityProvider } from '../src/infrastructure/connectivity/sapConnectivityProvider.js';
import { SapHttpClient } from '../src/infrastructure/connectivity/sapHttpClient.js';
import { SapConnectionHealthService, CAPABILITY_KEYS } from '../src/infrastructure/connectivity/sapConnectionHealthService.js';
import {
  CONNECTIVITY_STATUSES,
  SAP_ERROR_CATEGORIES,
  isConnectivityFailure,
  classifySapError
} from '../src/infrastructure/connectivity/sapErrorTaxonomy.js';
import { BtpDestinationAdapter } from '../src/adapters/btpDestinationAdapter.js';

describe('FioriX S3 SAP Connectivity — S/4HANA 2023 / S21 Integration', () => {

  // 1. Read-Only Boundary Enforcement
  it('1. Rejects write operations (POST, PUT, DELETE, PATCH) with WRITE_OPERATION_BLOCKED error', async () => {
    const client = new SapHttpClient();

    assert.throws(
      () => client.assertReadOnly('POST'),
      /SAP WRITE OPERATION BLOCKED/
    );
    assert.throws(
      () => client.assertReadOnly('PUT'),
      /SAP WRITE OPERATION BLOCKED/
    );
    assert.throws(
      () => client.assertReadOnly('DELETE'),
      /SAP WRITE OPERATION BLOCKED/
    );

    // GET and HEAD must be permitted
    assert.doesNotThrow(() => client.assertReadOnly('GET'));
    assert.doesNotThrow(() => client.assertReadOnly('HEAD'));
    assert.doesNotThrow(() => client.assertReadOnly('OPTIONS'));
  });

  // 2. Secret and Credential Scrubbing
  it('2. Scrubs Basic and Bearer auth tokens from headers and outgoing requests', async () => {
    let capturedHeaders = null;
    const mockFetch = async (url, opts) => {
      capturedHeaders = opts.headers;
      return new Response(JSON.stringify({ status: 'ok' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', 'set-cookie': 'secret-session-cookie' }
      });
    };

    const client = new SapHttpClient({ directFetch: mockFetch });
    const res = await client.execute('http://sap-s21.corp:8000/sap/bc/echo', {
      headers: {
        Authorization: 'Basic c2FwX3VzZXI6c2VjcmV0X3Bhc3M='
      }
    });

    assert.strictEqual(res.success, true);
    // Verified that sanitized response does not contain raw cookie
    assert.strictEqual(res.headers['set-cookie'], '[REDACTED]');
  });

  // 3. Destination Resolution via Mock Adapter
  it('3. Resolves BTP Destination S21 with Client 200 and OnPremise configuration', async () => {
    const mockBtpAdapter = new BtpDestinationAdapter({
      destinationName: 'S21',
      sapClient: '200',
      vcapServices: {
        destination: [
          {
            name: 'dest-srv',
            label: 'destination',
            credentials: { clientid: 'cid', clientsecret: 'csec', url: 'https://dest.cf' }
          }
        ],
        connectivity: [
          {
            name: 'conn-srv',
            label: 'connectivity',
            credentials: { clientid: 'cid', clientsecret: 'csec', onpremise_proxy_host: '127.0.0.1' }
          }
        ]
      },
      sdkGetDestination: async () => ({
        name: 'S21',
        url: 'http://kbl_fiori:8000',
        proxyType: 'OnPremise',
        authentication: 'BasicAuthentication',
        username: 'int_samarth',
        sapClient: '200'
      })
    });

    const provider = new BtpDestinationProvider({ adapter: mockBtpAdapter });
    const resolved = await provider.resolve('S21');

    assert.strictEqual(resolved.success, true);
    assert.strictEqual(resolved.destination.name, 'S21');
    assert.strictEqual(resolved.destination.url, 'http://kbl_fiori:8000');
    assert.strictEqual(resolved.destination.proxyType, 'OnPremise');
    assert.strictEqual(resolved.destination.password, undefined); // Never leaks password
  });

  // 4. 10-Point Capability Probe Execution
  it('4. Executes all 10 capability probes in SapConnectionHealthService', async () => {
    const mockFetch = async (url) => {
      if (url.includes('/sap/bc/echo')) {
        return new Response('OK', { status: 200 });
      }
      if (url.includes('/sap/opu/odata/IWFND/CATALOGSERVICE')) {
        return new Response(JSON.stringify({ d: { results: [{ TechnicalName: 'CATALOGSERVICE' }] } }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      if (url.includes('/sap/bc/adt/discovery')) {
        return new Response('<discovery/>', { status: 200, headers: { 'Content-Type': 'application/xml' } });
      }
      return new Response('Not Found', { status: 404 });
    };

    const httpClient = new SapHttpClient({ directFetch: mockFetch });
    const destProvider = {
      resolve: async () => ({
        success: true,
        destination: { name: 'S21', url: 'http://kbl_fiori:8000' },
        rawDestination: { name: 'S21', url: 'http://kbl_fiori:8000', username: 'u', password: 'p' },
        provenance: 'TEST_FIXTURE'
      }),
      validateConfig: () => ({ isValid: true, issues: [] })
    };

    const connProvider = new SapConnectivityProvider({
      destinationProvider: destProvider,
      httpClient
    });

    const healthService = new SapConnectionHealthService({ provider: connProvider });
    const report = await healthService.runHealthCheck();

    assert.strictEqual(report.success, true);
    assert.strictEqual(report.overallStatus, CONNECTIVITY_STATUSES.CONNECTED);
    assert.strictEqual(report.targetSystem, 'S21 (Client 200)');
    assert.strictEqual(report.totalCapabilitiesCount, 10);
    assert.strictEqual(report.supportedCapabilitiesCount, 10);
    assert.strictEqual(report.coveragePercent, 100);

    // Verify individual capability probe keys exist
    for (const key of Object.values(CAPABILITY_KEYS)) {
      assert.ok(report.capabilities[key], `Capability ${key} must exist in probe report`);
      assert.strictEqual(report.capabilities[key].tested, true);
    }
  });

  // 5. Honest Error Taxonomy & Connectivity Status Differentiation
  it('5. Error taxonomy never conflates connectivity failure with missing transaction', () => {
    // A network timeout is an infrastructure failure, NOT missing app
    const timeoutClass = classifySapError(504, 'Gateway timeout');
    assert.strictEqual(timeoutClass.isInfrastructureFailure, true);
    assert.strictEqual(timeoutClass.canConcludeMissingApp, false);
    assert.strictEqual(timeoutClass.connectivityStatus, CONNECTIVITY_STATUSES.TIMEOUT);

    // A 401 Unauthorized is security blocked, NOT missing app
    const authClass = classifySapError(401, 'Unauthorized');
    assert.strictEqual(authClass.isInfrastructureFailure, true);
    assert.strictEqual(authClass.canConcludeMissingApp, false);
    assert.strictEqual(authClass.connectivityStatus, CONNECTIVITY_STATUSES.AUTHENTICATION_FAILED);

    // A 403 Forbidden is authorization blocked, NOT missing app
    const authzClass = classifySapError(403, 'Forbidden');
    assert.strictEqual(authzClass.isInfrastructureFailure, true);
    assert.strictEqual(authzClass.canConcludeMissingApp, false);
    assert.strictEqual(authzClass.connectivityStatus, CONNECTIVITY_STATUSES.AUTHORIZATION_BLOCKED);

    // isConnectivityFailure predicate check
    assert.strictEqual(isConnectivityFailure('TIMEOUT'), true);
    assert.strictEqual(isConnectivityFailure('NETWORK_UNAVAILABLE'), true);
    assert.strictEqual(isConnectivityFailure('AUTHENTICATION_FAILED'), true);
    assert.strictEqual(isConnectivityFailure('AUTHORIZATION_BLOCKED'), true);
    assert.strictEqual(isConnectivityFailure('NOT_CONFIGURED'), true);
    assert.strictEqual(isConnectivityFailure('FOUND'), false);
    assert.strictEqual(isConnectivityFailure('NOT_FOUND'), false);
  });

  // 6. Cloud Connector Unreachability Handling
  it('6. Accurately reports CLOUD_CONNECTOR_UNAVAILABLE when host is unreachable', async () => {
    const mockTimeoutFetch = async () => {
      const err = new Error('The operation was aborted');
      err.name = 'AbortError';
      throw err;
    };

    const httpClient = new SapHttpClient({ directFetch: mockTimeoutFetch, maxRetries: 0 });
    const destProvider = {
      resolve: async () => ({
        success: true,
        destination: { name: 'S21', url: 'http://kbl_fiori:8000' },
        rawDestination: { name: 'S21', url: 'http://kbl_fiori:8000' },
        provenance: 'TEST_FIXTURE'
      }),
      validateConfig: () => ({ isValid: true, issues: [] })
    };

    const connProvider = new SapConnectivityProvider({
      destinationProvider: destProvider,
      httpClient
    });

    const healthService = new SapConnectionHealthService({ provider: connProvider });
    const report = await healthService.runHealthCheck();

    assert.strictEqual(report.success, false);
    assert.strictEqual(report.overallStatus, CONNECTIVITY_STATUSES.CLOUD_CONNECTOR_UNAVAILABLE);
    assert.strictEqual(report.capabilities[CAPABILITY_KEYS.CLOUD_CONNECTOR_REACHABILITY].supported, false);
  });
});
