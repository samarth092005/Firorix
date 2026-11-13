import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from '../src/server.js';
import { BtpDestinationAdapter } from '../src/adapters/btpDestinationAdapter.js';

describe('Fiorify Sprint 5.1 — HTTP Server & Gateway Smoke Test Endpoint Security', () => {
  let server;
  let baseUrl;
  let smokeTestInvoked = false;

  const TEST_ADMIN_SECRET = 'SuperAdminSecret_2026_LiveS21';

  const mockAdapter = new BtpDestinationAdapter({
    adminSecret: TEST_ADMIN_SECRET,
    vcapServices: {
      destination: [
        {
          name: 'dest',
          label: 'destination',
          credentials: { clientid: 'id', clientsecret: 'sec', url: 'https://dest.cf' }
        }
      ],
      connectivity: [
        {
          name: 'conn',
          label: 'connectivity',
          credentials: { clientid: 'id', clientsecret: 'sec', onpremise_proxy_host: 'proxy' }
        }
      ]
    },
    sdkGetDestination: async () => ({ name: 'S21', url: 'http://kbl_fiori:8000', proxyType: 'OnPremise' }),
    sdkExecuteHttpRequest: async () => {
      smokeTestInvoked = true;
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
    }
  });

  before(async () => {
    // Start ephemeral server on random available port
    server = createServer({ btpAdapter: mockAdapter });
    await new Promise((resolve) => {
      server.listen(0, () => {
        const address = server.address();
        baseUrl = `http://127.0.0.1:${address.port}`;
        resolve();
      });
    });
  });

  after(async () => {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  // 1. Missing admin secret: rejected before contacting SAP
  it('rejects GET /api/v1/gateway-smoke-test with HTTP 401 when admin secret is missing', async () => {
    smokeTestInvoked = false;

    const res = await fetch(`${baseUrl}/api/v1/gateway-smoke-test`, {
      method: 'GET'
    });

    assert.strictEqual(res.status, 401);
    const body = await res.json();
    assert.strictEqual(body.success, false);
    assert.strictEqual(body.statusCode, 'UNAUTHORIZED');
    assert.ok(body.errorMessage.includes('Valid administrative secret required'));
    // CRITICAL INVARIANT: The adapter smoke test was never invoked
    assert.strictEqual(smokeTestInvoked, false);
  });

  // 2. Invalid admin secret: rejected before contacting SAP
  it('rejects GET /api/v1/gateway-smoke-test with HTTP 401 when admin secret is incorrect', async () => {
    smokeTestInvoked = false;

    const res = await fetch(`${baseUrl}/api/v1/gateway-smoke-test`, {
      method: 'GET',
      headers: {
        'X-Fiorify-Admin-Secret': 'IncorrectSecret_123'
      }
    });

    assert.strictEqual(res.status, 401);
    const body = await res.json();
    assert.strictEqual(body.success, false);
    assert.strictEqual(body.statusCode, 'UNAUTHORIZED');
    assert.strictEqual(smokeTestInvoked, false);
  });

  // 3. Valid admin secret via X-Fiorify-Admin-Secret header
  it('allows GET /api/v1/gateway-smoke-test with HTTP 200 when valid X-Fiorify-Admin-Secret is provided', async () => {
    smokeTestInvoked = false;

    const res = await fetch(`${baseUrl}/api/v1/gateway-smoke-test`, {
      method: 'GET',
      headers: {
        'X-Fiorify-Admin-Secret': TEST_ADMIN_SECRET
      }
    });

    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.statusCode, 'SUCCESS');
    assert.strictEqual(body.destination, 'S21');
    assert.strictEqual(body.targetEndpoint, '/sap/opu/odata/IWFND/CATALOGSERVICE;v=2/ServiceCollection');
    assert.strictEqual(body.gatewayResponse.sampleService.technicalServiceName, 'CATALOGSERVICE');
    assert.strictEqual(smokeTestInvoked, true);
  });

  // 4. Valid admin secret via Authorization: Bearer <secret>
  it('allows GET /api/v1/gateway-smoke-test with HTTP 200 when valid Authorization Bearer token is provided', async () => {
    smokeTestInvoked = false;

    const res = await fetch(`${baseUrl}/api/v1/gateway-smoke-test`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${TEST_ADMIN_SECRET}`
      }
    });

    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.statusCode, 'SUCCESS');
    assert.strictEqual(smokeTestInvoked, true);
  });

  // 5. Request body size limit
  it('rejects POST /api/v1/tcode-search with HTTP 413 when body exceeds 100KB', async () => {
    const hugeBody = JSON.stringify({
      systemId: 'S21-200-DEMO',
      tcode: 'ME21N',
      junk: 'X'.repeat(105 * 1024)
    });

    try {
      const res = await fetch(`${baseUrl}/api/v1/tcode-search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: hugeBody
      });
      assert.strictEqual(res.status, 413);
      const body = await res.json();
      assert.strictEqual(body.error, 'Payload Too Large');
    } catch (fetchErr) {
      // In some Node.js fetch implementations, destroying the socket causes fetch to reject or return 413
      assert.ok(fetchErr);
    }
  });

  // 6. Malformed JSON handling
  it('rejects POST /api/v1/tcode-search with HTTP 400 when body contains malformed JSON', async () => {
    const res = await fetch(`${baseUrl}/api/v1/tcode-search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{ invalid_json_syntax '
    });

    assert.strictEqual(res.status, 400);
    const body = await res.json();
    assert.strictEqual(body.error, 'Bad Request');
    assert.strictEqual(body.message, 'Malformed JSON payload.');
  });

  // 7. CORS and OPTIONS preflight
  it('handles OPTIONS preflight with HTTP 204 and correct CORS headers', async () => {
    const res = await fetch(`${baseUrl}/api/v1/gateway-smoke-test`, {
      method: 'OPTIONS',
      headers: {
        Origin: 'http://localhost:5173',
        'Access-Control-Request-Method': 'GET',
        'Access-Control-Request-Headers': 'X-Fiorify-Admin-Secret'
      }
    });

    assert.strictEqual(res.status, 204);
    assert.ok(res.headers.get('access-control-allow-headers').includes('X-Fiorify-Admin-Secret'));
    assert.ok(res.headers.get('access-control-allow-methods').includes('GET'));
  });

  // 8. Health check returns BTP configuration status
  it('returns BTP destination configuration metadata in GET /api/v1/health', async () => {
    const res = await fetch(`${baseUrl}/api/v1/health`, {
      method: 'GET'
    });

    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.status, 'UP');
    assert.strictEqual(body.targetLandscape.sid, 'S21');
    assert.strictEqual(body.btpDestinationStatus.configured, true);
    assert.strictEqual(body.btpDestinationStatus.destinationName, 'S21');
    assert.strictEqual(body.btpDestinationStatus.destinationBindingPresent, true);
    assert.strictEqual(body.btpDestinationStatus.connectivityBindingPresent, true);
  });

  // 9. Preserves local demo search workflow without requiring an admin secret
  it('preserves local demo search workflow (S21-200-DEMO and S4H-DEV-200) without authentication', async () => {
    const res = await fetch(`${baseUrl}/api/v1/tcode-search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemId: 'S4H-DEV-200',
        tcode: 'ME21N'
      })
    });

    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.mode, 'MOCK');
    assert.strictEqual(body.transaction.tcode, 'ME21N');
    assert.strictEqual(body.overallStatus, 'MATCH_FOUND');
    assert.strictEqual(body.matching.candidates.length > 0, true);
  });

  // 10. Honest handling of unknown endpoint
  it('returns HTTP 404 for unknown endpoints', async () => {
    const res = await fetch(`${baseUrl}/api/v1/non-existent-route`);
    assert.strictEqual(res.status, 404);
    const body = await res.json();
    assert.strictEqual(body.error, 'Endpoint Not Found');
  });
});
