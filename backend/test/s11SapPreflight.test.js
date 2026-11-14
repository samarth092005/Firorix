import test from 'node:test';
import assert from 'node:assert/strict';
import { SapPreflightService, PREFLIGHT_CHECK_IDS, PREFLIGHT_READINESS } from '../src/infrastructure/connectivity/sapPreflightService.js';

test('Sprint 11.2 — SAP Preflight & Comprehensive Diagnostics Suite', async (t) => {
  await t.test('1. Runs all 15 checks and returns structured readiness for S21', async () => {
    // Mock provider with positive responses
    const mockProvider = {
      destinationProvider: {
        resolve: async () => ({
          success: true,
          provenance: 'LOCAL_DEV_DESTINATION',
          rawDestination: { url: 'http://127.0.0.1:8000' }
        })
      },
      executeQuery: async (path, options = {}) => {
        if (path.includes('/sap/bc/adt/discovery')) {
          assert.match(
            options.headers?.Accept || '',
            /application\/atomsvc\+xml/,
            'ADT discovery must send AtomPub Accept header'
          );
          return { success: true, status: 200, data: '<service xmlns="http://www.w3.org/2007/app"/>' };
        }
        return { success: true, status: 200, data: { ok: true } };
      }
    };

    const service = new SapPreflightService({ provider: mockProvider });
    const result = await service.runPreflight({ destinationName: 'S21', sapClient: '200' });

    assert.equal(result.success, true);
    assert.equal(result.summary.totalChecks, 15);
    assert.equal(result.summary.passed >= 14, true);
    assert.equal(result.targetSystem.systemId, 'S21');
    assert.equal(result.targetSystem.client, '200');
    assert.equal(result.targetSystem.release, 'SAP S/4HANA 2023 Private Edition');
    assert.equal(result.targetSystem.softwareComponent, 'S4CORE 108');

    // Verify presence of all 15 check IDs
    const checkIds = result.checks.map(c => c.id);
    for (const expectedId of Object.values(PREFLIGHT_CHECK_IDS)) {
      assert.ok(checkIds.includes(expectedId), `Missing expected check: ${expectedId}`);
    }
  });

  await t.test('2. Redacts sensitive credentials, tokens, and authorization headers from details', async () => {
    const service = new SapPreflightService();
    const rawDetails = {
      username: 'int_samarth',
      authorizationHeader: 'Basic aW50X3NhbWFydGg6c2VjcmV0',
      passwordToken: 'secret123',
      sessionCookie: 'MYSAPSSO2=abc',
      nested: {
        apiSecretKey: 'xyz-secret'
      }
    };

    const sanitized = service.sanitizeDetails(rawDetails);
    assert.equal(sanitized.authorizationHeader, '[REDACTED]');
    assert.equal(sanitized.passwordToken, '[REDACTED]');
    assert.equal(sanitized.sessionCookie, '[REDACTED]');
    assert.equal(sanitized.nested.apiSecretKey, '[REDACTED]');
    assert.equal(sanitized.username, 'int_samarth');
  });

  await t.test('3. Detects authentication rejection (401) and flags BLOCKED/FAILED status', async () => {
    const mockProvider = {
      destinationProvider: {
        resolve: async () => ({ success: true, rawDestination: { url: 'http://127.0.0.1:8000' } })
      },
      executeQuery: async () => ({ success: false, status: 401, errorMessage: 'Unauthorized' })
    };

    const service = new SapPreflightService({ provider: mockProvider });
    const result = await service.runPreflight();

    assert.equal(result.overallReadiness, PREFLIGHT_READINESS.BLOCKED);
    const authCheck = result.checks.find(c => c.id === PREFLIGHT_CHECK_IDS.AUTHENTICATION);
    assert.equal(authCheck?.status, 'FAILED');
    assert.ok(authCheck?.remediation?.includes('Verify technical user credentials'));
  });

  await t.test('4. Correctly flags 406 content-negotiation mismatch if ADT rejects header', async () => {
    const mockProvider = {
      destinationProvider: {
        resolve: async () => ({ success: true, rawDestination: { url: 'http://127.0.0.1:8000' } })
      },
      executeQuery: async (path) => {
        if (path.includes('/sap/bc/adt/discovery')) {
          return { success: false, status: 406, errorMessage: 'Not Acceptable' };
        }
        return { success: true, status: 200, data: {} };
      }
    };

    const service = new SapPreflightService({ provider: mockProvider });
    const result = await service.runPreflight();

    const adtCheck = result.checks.find(c => c.id === PREFLIGHT_CHECK_IDS.ADT_DISCOVERY);
    assert.equal(adtCheck?.status, 'FAILED');
    assert.ok(adtCheck?.remediation?.includes('application/atomsvc+xml'));
  });
});
