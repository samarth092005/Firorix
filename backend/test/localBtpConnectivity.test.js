import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { BtpDestinationAdapter } from '../src/adapters/btpDestinationAdapter.js';

describe('Fiorify Sprint 5.2 — Local BTP & Destination Adapter Unit Tests', () => {
  it('resolves destination S21 via direct BTP Destination REST API when Cloud SDK lacks connectivity binding', async () => {
    const mockTokenResponse = {
      ok: true,
      status: 200,
      json: async () => ({ access_token: 'mock_local_jwt_access_token', expires_in: 3600 })
    };

    const mockDestResponse = {
      ok: true,
      status: 200,
      json: async () => [
        {
          Name: 'S21',
          URL: 'http://kbl_fiori:8000',
          ProxyType: 'OnPremise',
          Authentication: 'BasicAuthentication',
          User: 'MOCK_SAP_USER',
          Password: 'MOCK_SAP_PASSWORD',
          'sap-client': '200'
        }
      ]
    };

    const mockFetch = async (url) => {
      if (url.includes('/oauth/token')) return mockTokenResponse;
      if (url.includes('/subaccountDestinations')) return mockDestResponse;
      throw new Error(`Unexpected URL: ${url}`);
    };

    // Save current env and inject test variables
    const origClientId = process.env.BTP_DESTINATION_CLIENT_ID;
    const origClientSecret = process.env.BTP_DESTINATION_CLIENT_SECRET;
    const origTokenUrl = process.env.BTP_DESTINATION_TOKEN_URL;
    const origDestUrl = process.env.BTP_DESTINATION_URL;
    const origUrlOverride = process.env.SAP_URL_OVERRIDE;

    delete process.env.SAP_URL_OVERRIDE;
    process.env.BTP_DESTINATION_CLIENT_ID = 'test-client-id';
    process.env.BTP_DESTINATION_CLIENT_SECRET = 'test-client-secret';
    process.env.BTP_DESTINATION_TOKEN_URL = 'https://mock.auth.eu30.hana.ondemand.com/oauth/token';
    process.env.BTP_DESTINATION_URL = 'https://mock.dest.eu30.hana.ondemand.com';

    try {
      const adapter = new BtpDestinationAdapter({
        destinationName: 'S21',
        sapClient: '200',
        directFetch: mockFetch,
        // Cloud SDK mock fails to simulate missing local connectivity binding
        sdkGetDestination: async () => {
          throw new Error('No binding to a connectivity service found!');
        }
      });

      const resolution = await adapter.resolveDestination('S21');
      assert.strictEqual(resolution.success, true);
      assert.strictEqual(resolution.provenance, 'BTP_DESTINATION_SERVICE_REST');
      assert.strictEqual(resolution.destination.name, 'S21');
      assert.strictEqual(resolution.destination.url, 'http://kbl_fiori:8000');
      assert.strictEqual(resolution.destination.proxyType, 'OnPremise');
      assert.strictEqual(resolution.destination.authentication, 'BasicAuthentication');
      assert.strictEqual(resolution.destination.sapClient, '200');
    } finally {
      process.env.BTP_DESTINATION_CLIENT_ID = origClientId;
      process.env.BTP_DESTINATION_CLIENT_SECRET = origClientSecret;
      process.env.BTP_DESTINATION_TOKEN_URL = origTokenUrl;
      process.env.BTP_DESTINATION_URL = origDestUrl;
      if (origUrlOverride !== undefined) {
        process.env.SAP_URL_OVERRIDE = origUrlOverride;
      }
    }
  });

  it('correctly categorizes local ENOTFOUND virtual host error as CONNECTIVITY_FAILED with remediation', async () => {
    const mockSdkExecute = async () => {
      const err = new Error('getaddrinfo ENOTFOUND kbl_fiori');
      err.code = 'ENOTFOUND';
      throw err;
    };

    const adapter = new BtpDestinationAdapter({
      destinationName: 'S21',
      sapClient: '200',
      sdkGetDestination: async () => ({
        name: 'S21',
        url: 'http://kbl_fiori:8000',
        proxyType: 'OnPremise'
      }),
      sdkExecuteHttpRequest: mockSdkExecute
    });

    const result = await adapter.executeRequest({
      path: '/sap/opu/odata/IWFND/CATALOGSERVICE;v=2/ServiceCollection'
    });

    assert.strictEqual(result.success, false);
    assert.strictEqual(result.statusCode, 'CONNECTIVITY_FAILED');
    assert.strictEqual(result.httpStatus, 502);
    assert.ok(result.errorMessage.includes('kbl_fiori:8000'));
    assert.ok(result.errorMessage.includes('OnPremise virtual host mapped in SAP Cloud Connector'));
    assert.ok(result.errorMessage.includes('tunnel to the BTP Connectivity proxy'));
  });
});
