import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  BtpDestinationAdapter,
  sanitizeHeaders,
  sanitizeErrorMessage,
  GATEWAY_CATALOG_PATH
} from '../src/adapters/btpDestinationAdapter.js';

// Sample mock VCAP_SERVICES fixtures
const MOCK_VALID_VCAP = {
  destination: [
    {
      name: 'dest-srv-instance',
      label: 'destination',
      plan: 'lite',
      tags: ['destination'],
      credentials: {
        clientid: 'dest-client-id-xyz',
        clientsecret: 'dest-client-secret-abc',
        uri: 'https://destination-configuration.cfapps.eu10.hana.ondemand.com',
        url: 'https://destination-configuration.cfapps.eu10.hana.ondemand.com'
      }
    }
  ],
  connectivity: [
    {
      name: 'conn-srv-instance',
      label: 'connectivity',
      plan: 'lite',
      tags: ['connectivity'],
      credentials: {
        clientid: 'conn-client-id-xyz',
        clientsecret: 'conn-client-secret-abc',
        onpremise_proxy_host: 'connectivityproxy.internal.cf.eu10.hana.ondemand.com',
        onpremise_proxy_port: '20003',
        token_service_url: 'https://oauth.authentication.eu10.hana.ondemand.com'
      }
    }
  ]
};

const MOCK_DESTINATION_OBJECT = {
  name: 'S21',
  url: 'http://kbl_fiori:8000',
  proxyType: 'OnPremise',
  authentication: 'BasicAuthentication'
};

describe('FioriX Sprint 5.1 — BTP Destination Adapter Unit Tests', () => {
  // 1. Missing destination binding
  it('correctly flags missing destination service binding', async () => {
    const vcapWithoutDest = {
      connectivity: MOCK_VALID_VCAP.connectivity
    };

    const adapter = new BtpDestinationAdapter({
      vcapServices: vcapWithoutDest,
      adminSecret: 'secret123'
    });

    const validation = adapter.validateConfiguration();
    assert.strictEqual(validation.isValid, false);
    assert.strictEqual(validation.destinationBinding.present, false);
    assert.strictEqual(validation.connectivityBinding.present, true);
    assert.ok(validation.issues.some((i) => i.includes('Missing destination service binding')));

    const smokeResult = await adapter.executeSmokeTest();
    assert.strictEqual(smokeResult.success, false);
    assert.strictEqual(smokeResult.statusCode, 'CONFIGURATION_INVALID');
    assert.strictEqual(smokeResult.httpStatus, 503);
  });

  // 2. Missing connectivity binding
  it('correctly flags missing connectivity service binding', async () => {
    const vcapWithoutConn = {
      destination: MOCK_VALID_VCAP.destination
    };

    const adapter = new BtpDestinationAdapter({
      vcapServices: vcapWithoutConn,
      adminSecret: 'secret123'
    });

    const validation = adapter.validateConfiguration();
    assert.strictEqual(validation.isValid, false);
    assert.strictEqual(validation.destinationBinding.present, true);
    assert.strictEqual(validation.connectivityBinding.present, false);
    assert.ok(validation.issues.some((i) => i.includes('Missing connectivity service binding')));

    const smokeResult = await adapter.executeSmokeTest();
    assert.strictEqual(smokeResult.success, false);
    assert.strictEqual(smokeResult.statusCode, 'CONFIGURATION_INVALID');
    assert.strictEqual(smokeResult.httpStatus, 503);
  });

  // 3. Invalid configuration
  it('rejects invalid configuration: illegal client, non-positive timeout, empty destination', () => {
    const badAdapter = new BtpDestinationAdapter({
      destinationName: '   ',
      sapClient: 'XYZ',
      timeoutMs: -5000,
      vcapServices: MOCK_VALID_VCAP
    });

    const validation = badAdapter.validateConfiguration();
    assert.strictEqual(validation.isValid, false);
    assert.ok(validation.issues.some((i) => i.includes('Destination name is empty or invalid.')));
    assert.ok(validation.issues.some((i) => i.includes('SAP client "XYZ" is invalid')));
    assert.ok(validation.issues.some((i) => i.includes('Timeout "-5000" is invalid')));
  });

  // 4. Successful destination resolution with mocked SDK boundary
  it('successfully resolves destination and executes smoke test with mocked SDK boundary', async () => {
    let capturedDestName = null;
    let capturedReqConfig = null;

    const mockGetDestination = async ({ destinationName }) => {
      capturedDestName = destinationName;
      return MOCK_DESTINATION_OBJECT;
    };

    const mockExecuteHttpRequest = async (dest, reqConfig) => {
      capturedReqConfig = reqConfig;
      return {
        status: 200,
        headers: { 'content-type': 'application/json' },
        data: {
          d: {
            results: [
              {
                TechnicalServiceName: 'CATALOGSERVICE',
                Version: '0002',
                Description: 'SAP Gateway Service Catalog'
              }
            ]
          }
        }
      };
    };

    const adapter = new BtpDestinationAdapter({
      vcapServices: MOCK_VALID_VCAP,
      sdkGetDestination: mockGetDestination,
      sdkExecuteHttpRequest: mockExecuteHttpRequest,
      adminSecret: 'adm123'
    });

    const resolution = await adapter.resolveDestination('S21');
    assert.strictEqual(resolution.success, true);
    assert.strictEqual(resolution.destination.name, 'S21');
    assert.strictEqual(capturedDestName, 'S21');

    const smokeResult = await adapter.executeSmokeTest();
    assert.strictEqual(smokeResult.success, true);
    assert.strictEqual(smokeResult.statusCode, 'SUCCESS');
    assert.strictEqual(smokeResult.httpStatus, 200);
    assert.strictEqual(smokeResult.destination, 'S21');
    assert.strictEqual(smokeResult.sapClient, '200');
    assert.strictEqual(smokeResult.targetEndpoint, GATEWAY_CATALOG_PATH);
    assert.strictEqual(smokeResult.gatewayResponse.servicesReturned, 1);
    assert.strictEqual(smokeResult.gatewayResponse.sampleService.technicalServiceName, 'CATALOGSERVICE');
    assert.strictEqual(smokeResult.gatewayResponse.sampleService.version, '0002');
  });

  // 5. Gateway HTTP 401
  it('handles Gateway HTTP 401 as AUTHENTICATION_FAILED', async () => {
    const mockExecute = async () => {
      const err = new Error('Request failed with status code 401');
      err.response = { status: 401, statusText: 'Unauthorized' };
      throw err;
    };

    const adapter = new BtpDestinationAdapter({
      vcapServices: MOCK_VALID_VCAP,
      sdkGetDestination: async () => MOCK_DESTINATION_OBJECT,
      sdkExecuteHttpRequest: mockExecute
    });

    const smokeResult = await adapter.executeSmokeTest();
    assert.strictEqual(smokeResult.success, false);
    assert.strictEqual(smokeResult.statusCode, 'AUTHENTICATION_FAILED');
    assert.strictEqual(smokeResult.httpStatus, 401);
    assert.ok(smokeResult.errorMessage.includes('SAP Gateway Authentication Failed'));
    assert.ok(smokeResult.errorMessage.includes('BTP Destination S21'));
  });

  // 6. Gateway HTTP 403
  it('handles Gateway HTTP 403 as AUTHORIZATION_FAILED', async () => {
    const mockExecute = async () => {
      const err = new Error('Request failed with status code 403');
      err.response = { status: 403, statusText: 'Forbidden' };
      throw err;
    };

    const adapter = new BtpDestinationAdapter({
      vcapServices: MOCK_VALID_VCAP,
      sdkGetDestination: async () => MOCK_DESTINATION_OBJECT,
      sdkExecuteHttpRequest: mockExecute
    });

    const smokeResult = await adapter.executeSmokeTest();
    assert.strictEqual(smokeResult.success, false);
    assert.strictEqual(smokeResult.statusCode, 'AUTHORIZATION_FAILED');
    assert.strictEqual(smokeResult.httpStatus, 403);
    assert.ok(smokeResult.errorMessage.includes('SAP Gateway Authorization Failed'));
    assert.ok(smokeResult.errorMessage.includes('S_SERVICE'));
  });

  // 7. Gateway HTTP 404
  it('handles Gateway HTTP 404 as SERVICE_NOT_FOUND without misdiagnosing DDIC absence', async () => {
    const mockExecute = async () => {
      const err = new Error('Request failed with status code 404');
      err.response = { status: 404, statusText: 'Not Found' };
      throw err;
    };

    const adapter = new BtpDestinationAdapter({
      vcapServices: MOCK_VALID_VCAP,
      sdkGetDestination: async () => MOCK_DESTINATION_OBJECT,
      sdkExecuteHttpRequest: mockExecute
    });

    const smokeResult = await adapter.executeSmokeTest();
    assert.strictEqual(smokeResult.success, false);
    assert.strictEqual(smokeResult.statusCode, 'SERVICE_NOT_FOUND');
    assert.strictEqual(smokeResult.httpStatus, 404);
    assert.ok(smokeResult.errorMessage.includes('SAP Gateway endpoint not found (HTTP 404)'));
    assert.ok(smokeResult.errorMessage.includes('does not indicate that a DDIC transaction code does not exist'));
  });

  // 8. Gateway HTTP 502/503/504
  it('handles Gateway HTTP 502/503/504 as CONNECTIVITY_FAILED', async () => {
    for (const code of [502, 503, 504]) {
      const mockExecute = async () => {
        const err = new Error(`Request failed with status code ${code}`);
        err.response = { status: code, statusText: 'Bad Gateway' };
        throw err;
      };

      const adapter = new BtpDestinationAdapter({
        vcapServices: MOCK_VALID_VCAP,
        sdkGetDestination: async () => MOCK_DESTINATION_OBJECT,
        sdkExecuteHttpRequest: mockExecute
      });

      const smokeResult = await adapter.executeSmokeTest();
      assert.strictEqual(smokeResult.success, false);
      assert.strictEqual(smokeResult.statusCode, 'CONNECTIVITY_FAILED');
      assert.strictEqual(smokeResult.httpStatus, code);
      assert.ok(smokeResult.errorMessage.includes('Cloud Connector registration and virtual host route'));
    }
  });

  // 9. Timeout
  it('handles request timeout as TIMEOUT with HTTP 504', async () => {
    const mockExecute = async () => {
      const err = new Error('timeout of 10000ms exceeded');
      err.code = 'ECONNABORTED';
      throw err;
    };

    const adapter = new BtpDestinationAdapter({
      vcapServices: MOCK_VALID_VCAP,
      sdkGetDestination: async () => MOCK_DESTINATION_OBJECT,
      sdkExecuteHttpRequest: mockExecute,
      timeoutMs: 10000
    });

    const smokeResult = await adapter.executeSmokeTest();
    assert.strictEqual(smokeResult.success, false);
    assert.strictEqual(smokeResult.statusCode, 'TIMEOUT');
    assert.strictEqual(smokeResult.httpStatus, 504);
    assert.ok(smokeResult.errorMessage.includes('timed out after 10000ms'));
  });

  // 10. Malformed Gateway response
  it('handles malformed Gateway response as MALFORMED_RESPONSE', async () => {
    const mockExecute = async () => {
      return {
        status: 200,
        headers: { 'content-type': 'application/json' },
        data: { unexpectedStructure: { foo: 'bar' } }
      };
    };

    const adapter = new BtpDestinationAdapter({
      vcapServices: MOCK_VALID_VCAP,
      sdkGetDestination: async () => MOCK_DESTINATION_OBJECT,
      sdkExecuteHttpRequest: mockExecute
    });

    const smokeResult = await adapter.executeSmokeTest();
    assert.strictEqual(smokeResult.success, false);
    assert.strictEqual(smokeResult.statusCode, 'MALFORMED_RESPONSE');
    assert.strictEqual(smokeResult.httpStatus, 502);
    assert.ok(smokeResult.errorMessage.includes('Malformed OData response from Gateway Catalog'));
  });

  // 11. Timing-safe verification of admin secret
  it('verifies administrative secret using timing-safe comparison', () => {
    const adapter = new BtpDestinationAdapter({
      adminSecret: 'CorrectAdminSecret_98765'
    });

    assert.strictEqual(adapter.verifyAdminSecret('CorrectAdminSecret_98765'), true);
    assert.strictEqual(adapter.verifyAdminSecret('WrongAdminSecret'), false);
    assert.strictEqual(adapter.verifyAdminSecret(''), false);
    assert.strictEqual(adapter.verifyAdminSecret(null), false);
    assert.strictEqual(adapter.verifyAdminSecret(undefined), false);
  });

  // 12. No credentials or tokens in diagnostic responses
  it('ensures no client secrets, passwords, or tokens are exposed in diagnostics or headers', async () => {
    const SENSITIVE_CLIENT_SECRET = 'SUPER_SECRET_CLIENT_SECRET_99999';
    const SENSITIVE_PASSWORD = 'TOP_SECRET_PASSWORD_12345';
    const SENSITIVE_BEARER_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.SENSITIVE_BEARER_PAYLOAD';

    const vcapWithSecrets = {
      destination: [
        {
          name: 'dest-instance',
          label: 'destination',
          credentials: {
            clientid: 'dest-client-id',
            clientsecret: SENSITIVE_CLIENT_SECRET,
            password: SENSITIVE_PASSWORD,
            url: 'https://destination.cf'
          }
        }
      ],
      connectivity: MOCK_VALID_VCAP.connectivity
    };

    const mockExecute = async () => {
      const err = new Error(
        `Failed with Bearer ${SENSITIVE_BEARER_TOKEN} and client_secret=${SENSITIVE_CLIENT_SECRET} and Basic dXNlcjpwYXNz`
      );
      err.response = {
        status: 401,
        headers: {
          authorization: `Bearer ${SENSITIVE_BEARER_TOKEN}`,
          'set-cookie': 'secret_session_cookie=12345'
        }
      };
      throw err;
    };

    const adapter = new BtpDestinationAdapter({
      vcapServices: vcapWithSecrets,
      sdkGetDestination: async () => MOCK_DESTINATION_OBJECT,
      sdkExecuteHttpRequest: mockExecute
    });

    const validation = adapter.validateConfiguration();
    const serializedValidation = JSON.stringify(validation);

    // Verify secrets are NOT in the validation output
    assert.strictEqual(serializedValidation.includes(SENSITIVE_CLIENT_SECRET), false);
    assert.strictEqual(serializedValidation.includes(SENSITIVE_PASSWORD), false);
    assert.ok(validation.destinationBinding.credentialKeys.includes('clientsecret')); // Only key names

    const smokeResult = await adapter.executeSmokeTest();
    const serializedSmokeResult = JSON.stringify(smokeResult);

    // Verify secrets are NOT in the smoke test response
    assert.strictEqual(serializedSmokeResult.includes(SENSITIVE_CLIENT_SECRET), false);
    assert.strictEqual(serializedSmokeResult.includes(SENSITIVE_PASSWORD), false);
    assert.strictEqual(serializedSmokeResult.includes(SENSITIVE_BEARER_TOKEN), false);
    assert.strictEqual(serializedSmokeResult.includes('dXNlcjpwYXNz'), false);

    // Test sanitizeHeaders utility
    const sanitized = sanitizeHeaders({
      Authorization: `Bearer ${SENSITIVE_BEARER_TOKEN}`,
      'X-FioriX-Admin-Secret': 'admin-secret',
      'sap-client': '200',
      'X-CSRF-Token': 'csrf-token-abc'
    });

    assert.strictEqual(sanitized.Authorization, '[REDACTED]');
    assert.strictEqual(sanitized['X-FioriX-Admin-Secret'], '[REDACTED]');
    assert.strictEqual(sanitized['X-CSRF-Token'], '[REDACTED]');
    assert.strictEqual(sanitized['sap-client'], '200');

    // Test sanitizeErrorMessage utility
    const scrubbedMsg = sanitizeErrorMessage(
      `Bearer ${SENSITIVE_BEARER_TOKEN} client_secret=${SENSITIVE_CLIENT_SECRET} Basic dXNlcjpwYXNz`
    );
    assert.strictEqual(scrubbedMsg.includes(SENSITIVE_BEARER_TOKEN), false);
    assert.strictEqual(scrubbedMsg.includes(SENSITIVE_CLIENT_SECRET), false);
    assert.strictEqual(scrubbedMsg.includes('dXNlcjpwYXNz'), false);
    assert.ok(scrubbedMsg.includes('Bearer [REDACTED]'));
    assert.ok(scrubbedMsg.includes('client_secret=[REDACTED]'));
    assert.ok(scrubbedMsg.includes('Basic [REDACTED]'));
  });
});
