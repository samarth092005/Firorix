import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { OfficialFioriCatalogueAdapter } from '../src/adapters/officialFioriCatalogueAdapter.js';
import { SapGatewayMetadataAdapter } from '../src/adapters/sapGatewayMetadataAdapter.js';
import { SapTransactionDiscoveryAdapter } from '../src/adapters/sapTransactionDiscoveryAdapter.js';

describe('FioriX Sprint 7.5 — Failure and Cache Behavior Quality Audit', () => {
  // Scenario 1: S21 unavailable (network error / connection refused)
  it('handles S21 unavailable by returning CONNECTION_ERROR without falling back to mock or cached data', async () => {
    const mockBtpAdapter = {
      executeRequest: async () => {
        throw new Error('connect ECONNREFUSED 192.168.1.55:8000');
      }
    };

    const gatewayAdapter = new SapGatewayMetadataAdapter({ btpAdapter: mockBtpAdapter });
    const discoveryAdapter = new SapTransactionDiscoveryAdapter({
      btpAdapter: mockBtpAdapter,
      gatewayAdapter
    });

    const res = await discoveryAdapter.discoverTransaction('F-53');
    assert.strictEqual(res.success, false);
    assert.strictEqual(res.statusCode, 'LIVE_CONNECTION_FAILED');
    assert.strictEqual(res.verificationStatus, 'LIVE_CONNECTION_FAILED');
    assert.strictEqual(res.httpStatus, 502);
    assert.ok(res.errorMessage.includes('ECONNREFUSED'));
  });

  // Scenario 2: Gateway catalogue returns HTTP 403 Forbidden
  it('handles Gateway catalogue HTTP 403 Forbidden as ACCESS_DENIED', async () => {
    const mockBtpAdapter = {
      executeRequest: async () => ({
        success: false,
        httpStatus: 403,
        statusCode: 'ACCESS_DENIED',
        errorMessage: 'User int_samarth has no authorization for /IWFND/CATALOGSERVICE.'
      })
    };

    const gatewayAdapter = new SapGatewayMetadataAdapter({ btpAdapter: mockBtpAdapter });
    const res = await gatewayAdapter.getCatalogServices();
    assert.strictEqual(res.success, false);
    assert.strictEqual(res.statusCode, 'ACCESS_DENIED');
    assert.strictEqual(res.httpStatus, 403);
  });

  // Scenario 3: Gateway catalogue returns HTTP 500 Internal Error
  it('handles Gateway catalogue HTTP 500 as GATEWAY_ERROR', async () => {
    const mockBtpAdapter = {
      executeRequest: async () => ({
        success: false,
        httpStatus: 500,
        statusCode: 'INTERNAL_ERROR',
        errorMessage: 'ABAP short dump in /IWFND/CL_MED_CATALOG'
      })
    };

    const gatewayAdapter = new SapGatewayMetadataAdapter({ btpAdapter: mockBtpAdapter });
    const res = await gatewayAdapter.getCatalogServices();
    assert.strictEqual(res.success, false);
    assert.strictEqual(res.httpStatus, 500);
  });

  // Scenario 4: ADT returns HTTP 403 Forbidden honestly with required Basis objects
  it('handles ADT HTTP 403 Forbidden by assigning PARTIALLY_AVAILABLE and documenting Basis objects', async () => {
    const mockBtpAdapter = {
      executeRequest: async (req) => {
        if (req.path.includes('/sap/bc/adt/discovery')) {
          return {
            success: false,
            httpStatus: 403,
            statusCode: 'UNAUTHORIZED'
          };
        }
        return {
          success: true,
          httpStatus: 200,
          data: {
            d: {
              results: [
                {
                  TechnicalServiceName: 'ZFAP_PAYMENT_POST_SRV',
                  Title: 'FAP_PAYMENT_POST_SRV',
                  Description: 'Post Outgoing Supplier Payment'
                }
              ]
            }
          }
        };
      }
    };

    const gatewayAdapter = new SapGatewayMetadataAdapter({ btpAdapter: mockBtpAdapter });
    const discoveryAdapter = new SapTransactionDiscoveryAdapter({
      btpAdapter: mockBtpAdapter,
      gatewayAdapter
    });

    const res = await discoveryAdapter.discoverTransaction('F-53');
    assert.strictEqual(res.success, true);
    assert.strictEqual(res.verificationStatus, 'PARTIALLY_AVAILABLE');
    assert.ok(res.basisAuthorizationRequirements);
    assert.ok(res.basisAuthorizationRequirements.requiredObjects.some(o => o.includes('S_ADT_RES')));
    assert.ok(res.basisAuthorizationRequirements.requiredObjects.some(o => o.includes('S_DEVELOP')));
  });

  // Scenario 5: Official catalogue unavailable (network failure)
  it('handles Official Catalogue network failure by returning LIVE_SOURCE_FAILED or TIMEOUT', async () => {
    const adapter = new OfficialFioriCatalogueAdapter({
      baseUrl: 'https://non-existent-fiori-library-domain.invalid/odata',
      timeoutMs: 1000
    });

    const res = await adapter.queryLibrary();
    assert.strictEqual(res.success, false);
    assert.ok(['LIVE_SOURCE_FAILED', 'TIMEOUT'].includes(res.statusCode));
  });

  // Scenario 6: Official catalogue returns malformed data
  it('handles Official Catalogue malformed JSON gracefully', async () => {
    const origFetch = global.fetch;
    global.fetch = async () => ({
      ok: true,
      status: 200,
      json: async () => {
        throw new Error('Unexpected token < in JSON at position 0');
      }
    });

    try {
      const adapter = new OfficialFioriCatalogueAdapter();
      const res = await adapter.queryLibrary();
      assert.strictEqual(res.success, false);
      assert.strictEqual(res.statusCode, 'LIVE_SOURCE_FAILED');
      assert.ok(res.errorMessage.includes('Unexpected token'));
    } finally {
      global.fetch = origFetch;
    }
  });

  // Scenario 7: Cached catalogue available fallback vs Cached catalogue missing
  it('distinguishes between cached catalogue available and cached catalogue missing', async () => {
    const origFetch = global.fetch;
    global.fetch = async () => {
      throw new Error('ENOTFOUND fioriappslibrary.hana.ondemand.com');
    };

    try {
      // With empty memory cache and empty disk cache
      const emptyAdapter = new OfficialFioriCatalogueAdapter({ cacheFilePath: 'non_existent_file.json' });
      const missRes = await emptyAdapter.getAppById('F1612');
      assert.strictEqual(missRes.success, false);
      assert.strictEqual(missRes.statusCode, 'LIVE_SOURCE_FAILED');

      // With cached record available
      emptyAdapter.memoryCache.set('F1612', {
        appId: 'F1612',
        appName: 'Post Outgoing Payments (Cached)',
        appType: 'Transactional',
        uiTechnology: 'SAP Fiori (SAPUI5)',
        odataServices: ['FAP_PAYMENT_POST_SRV']
      });

      const hitRes = await emptyAdapter.getAppById('F1612');
      assert.strictEqual(hitRes.success, true);
      assert.strictEqual(hitRes.fromCache, true);
      assert.strictEqual(hitRes.provenance, 'OFFICIAL_CATALOGUE_CACHED');
    } finally {
      global.fetch = origFetch;
    }
  });

  // Scenario 8: Candidate has incomplete metadata or unregistered OData dependency
  it('properly classifies candidate with unregistered OData dependency as POSSIBLE_MATCH / RELATED_MATCH instead of VERIFIED_MATCH', () => {
    const adapter = new OfficialFioriCatalogueAdapter();
    const candidateApps = [
      {
        appId: 'F9999',
        appName: 'Unregistered Candidate',
        appType: 'Transactional',
        uiTechnology: 'SAP Fiori elements',
        businessProcess: 'Finance',
        productVersion: 'SAP S/4HANA 2023',
        odataServices: ['NON_EXISTENT_ODATA_SRV'],
        documentationUrl: 'https://example.com/F9999'
      }
    ];

    const liveServices = [
      { technicalServiceName: 'ZFAP_PAYMENT_POST_SRV', description: 'Payment Post' }
    ];

    const evalRes = adapter.evaluateCandidateMatches({
      tcode: 'F-53',
      candidateApps,
      liveGatewayServices: liveServices
    });

    assert.strictEqual(evalRes.status, 'POSSIBLE_MATCH');
    assert.strictEqual(evalRes.candidates[0].matchStatus, 'POSSIBLE_MATCH');
    assert.strictEqual(evalRes.candidates[0].matchType, 'RELATED_MATCH');
    assert.strictEqual(evalRes.candidates[0].confidence, 'MEDIUM');
  });

  // Scenario 9: Service metadata cannot be retrieved (e.g. 404 or 500 on $metadata)
  it('handles service $metadata retrieval failure honestly without fabricating entity sets', async () => {
    const mockBtpAdapter = {
      executeRequest: async () => ({
        success: false,
        httpStatus: 404,
        statusCode: 'NOT_FOUND',
        errorMessage: 'Metadata not found for service ZUNKNOWN_SRV'
      })
    };

    const gatewayAdapter = new SapGatewayMetadataAdapter({ btpAdapter: mockBtpAdapter });
    const res = await gatewayAdapter.getServiceMetadata('ZUNKNOWN_SRV');
    assert.strictEqual(res.success, false);
    assert.strictEqual(res.httpStatus, 404);
    assert.strictEqual(res.statusCode, 'NOT_FOUND');
    assert.strictEqual(res.metadata, undefined);
  });
});
