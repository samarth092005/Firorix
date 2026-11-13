import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  SapGatewayMetadataAdapter,
  parseEdmxMetadata
} from '../src/adapters/sapGatewayMetadataAdapter.js';
import {
  SapTransactionDiscoveryAdapter,
  SAP_TCODE_REGEX
} from '../src/adapters/sapTransactionDiscoveryAdapter.js';
import { createServer } from '../src/server.js';

describe('Fiorify Sprint 6 — Gateway Metadata & Transaction Discovery Unit Tests', () => {
  const SAMPLE_EDMX_XML = `<?xml version="1.0" encoding="utf-8"?>
<edmx:Edmx Version="1.0" xmlns:edmx="http://schemas.microsoft.com/ado/2007/06/edmx" xmlns:m="http://schemas.microsoft.com/ado/2007/08/dataservices/metadata" xmlns:sap="http://www.sap.com/Protocols/SAPData">
  <edmx:DataServices m:DataServiceVersion="2.0">
    <Schema Namespace="ZTEST_SRV" xmlns="http://schemas.microsoft.com/ado/2008/09/edm">
      <EntityType Name="PaymentHeader">
        <Key>
          <PropertyRef Name="PaymentId"/>
          <PropertyRef Name="CompanyCode"/>
        </Key>
        <Property Name="PaymentId" Type="Edm.String" Nullable="false" MaxLength="10" sap:label="Payment ID"/>
        <Property Name="CompanyCode" Type="Edm.String" Nullable="false" MaxLength="4" sap:label="Company Code"/>
        <Property Name="Amount" Type="Edm.Decimal" Nullable="true" sap:label="Payment Amount"/>
      </EntityType>
      <EntityContainer Name="ZTEST_Entities" m:IsDefaultEntityContainer="true">
        <EntitySet Name="PaymentHeaders" EntityType="ZTEST_SRV.PaymentHeader" sap:creatable="true" sap:updatable="false" sap:deletable="false"/>
        <FunctionImport Name="PostPayment" ReturnType="ZTEST_SRV.PaymentHeader" m:HttpMethod="POST"/>
      </EntityContainer>
    </Schema>
  </edmx:DataServices>
</edmx:Edmx>`;

  it('accurately parses EDMX XML metadata into structured EntitySets, keys, properties, and operations', () => {
    const parsed = parseEdmxMetadata(SAMPLE_EDMX_XML);

    assert.strictEqual(parsed.entitySets.length, 1);
    assert.strictEqual(parsed.entitySets[0].name, 'PaymentHeaders');
    assert.strictEqual(parsed.entitySets[0].entityType, 'ZTEST_SRV.PaymentHeader');
    assert.strictEqual(parsed.entitySets[0].creatable, true);
    assert.strictEqual(parsed.entitySets[0].updatable, false);
    assert.deepStrictEqual(parsed.entitySets[0].keys, ['PaymentId', 'CompanyCode']);
    assert.strictEqual(parsed.entitySets[0].propertiesCount, 3);
    assert.strictEqual(parsed.entitySets[0].properties[0].name, 'PaymentId');
    assert.strictEqual(parsed.entitySets[0].properties[0].label, 'Payment ID');
    assert.strictEqual(parsed.entitySets[0].properties[0].maxLength, 10);

    assert.strictEqual(parsed.functionImports.length, 1);
    assert.strictEqual(parsed.functionImports[0].name, 'PostPayment');
    assert.strictEqual(parsed.functionImports[0].httpMethod, 'POST');
    assert.strictEqual(parsed.functionImports[0].returnType, 'ZTEST_SRV.PaymentHeader');
  });

  it('SapGatewayMetadataAdapter retrieves, normalizes, and filters catalog services', async () => {
    const mockBtpAdapter = {
      executeRequest: async () => ({
        success: true,
        httpStatus: 200,
        data: {
          d: {
            results: [
              {
                ID: 'ZFAP_PAYMENT_POST_SRV_0001',
                TechnicalServiceName: 'ZFAP_PAYMENT_POST_SRV',
                Title: 'FAP_PAYMENT_POST_SRV',
                Description: 'Post Outgoing Supplier Payment',
                TechnicalServiceVersion: '1',
                ServiceUrl: 'http://192.168.1.55:8000/sap/opu/odata/sap/FAP_PAYMENT_POST_SRV',
                MetadataUrl: 'http://192.168.1.55:8000/sap/opu/odata/sap/FAP_PAYMENT_POST_SRV/$metadata',
                Author: 'BASIS',
                IsSapService: 'true',
                ServiceType: 'UI'
              },
              {
                ID: 'ZMM_PUR_CREATE_0001',
                TechnicalServiceName: 'ZMM_PUR_CREATE',
                Title: 'MM_PUR_CREATE',
                Description: 'Create Purchase Orders',
                TechnicalServiceVersion: '1',
                ServiceUrl: 'http://192.168.1.55:8000/sap/opu/odata/sap/MM_PUR_CREATE',
                MetadataUrl: 'http://192.168.1.55:8000/sap/opu/odata/sap/MM_PUR_CREATE/$metadata',
                Author: 'SAP',
                IsSapService: 'true',
                ServiceType: 'UI'
              }
            ]
          }
        }
      })
    };

    const gatewayAdapter = new SapGatewayMetadataAdapter({ btpAdapter: mockBtpAdapter });

    // 1. Retrieve all
    const allResult = await gatewayAdapter.getCatalogServices();
    assert.strictEqual(allResult.success, true);
    assert.strictEqual(allResult.totalCount, 2);
    assert.strictEqual(allResult.returnedCount, 2);
    assert.strictEqual(allResult.services[0].technicalServiceName, 'ZFAP_PAYMENT_POST_SRV');
    assert.strictEqual(allResult.provenance, 'LIVE_SAP_S21');

    // 2. Filter by search keyword
    const filteredResult = await gatewayAdapter.getCatalogServices({ search: 'PURCHASE' });
    assert.strictEqual(filteredResult.success, true);
    assert.strictEqual(filteredResult.totalCount, 1);
    assert.strictEqual(filteredResult.services[0].technicalServiceName, 'ZMM_PUR_CREATE');

    // 3. Respect limit
    const limitedResult = await gatewayAdapter.getCatalogServices({ limit: 1 });
    assert.strictEqual(limitedResult.returnedCount, 1);
  });

  it('SapTransactionDiscoveryAdapter validates T-Code format and rejects illegal characters', async () => {
    const adapter = new SapTransactionDiscoveryAdapter();

    const emptyRes = await adapter.discoverTransaction('');
    assert.strictEqual(emptyRes.success, false);
    assert.strictEqual(emptyRes.statusCode, 'INVALID_INPUT');
    assert.strictEqual(emptyRes.verificationStatus, 'NOT_FOUND');

    const invalidRes = await adapter.discoverTransaction('F-53$BAD');
    assert.strictEqual(invalidRes.success, false);
    assert.strictEqual(invalidRes.statusCode, 'INVALID_INPUT');
    assert.strictEqual(invalidRes.verificationStatus, 'NOT_FOUND');
    assert.ok(invalidRes.errorMessage.includes('naming conventions'));
  });

  it('SapTransactionDiscoveryAdapter probes ADT and honestly reports HTTP 403 with Basis requirements', async () => {
    const mockBtpAdapter = {
      executeRequest: async ({ path }) => {
        if (path === '/sap/bc/adt/discovery') {
          return {
            success: false,
            httpStatus: 403,
            statusCode: 'ACCESS_DENIED',
            errorMessage: 'No authorization to access the resource /sap/bc/adt/discovery.'
          };
        }
        return { success: true, httpStatus: 200, data: { d: { results: [] } } };
      }
    };

    const adapter = new SapTransactionDiscoveryAdapter({ btpAdapter: mockBtpAdapter });
    const probe = await adapter.probeAdtInterface();

    assert.strictEqual(probe.accessible, false);
    assert.strictEqual(probe.httpStatus, 403);
    assert.strictEqual(probe.status, 'UNAUTHORIZED');
    assert.strictEqual(probe.code, 'SADT_RESOURCE_003');
    assert.ok(probe.requiredAuthorizations.some((r) => r.includes('S_ADT_RES')));
    assert.ok(probe.requiredAuthorizations.some((r) => r.includes('S_DEVELOP')));
  });

  it('SapTransactionDiscoveryAdapter discovers F-53, correlates live Gateway services, and assigns PARTIALLY_AVAILABLE', async () => {
    const mockGatewayAdapter = {
      getCatalogServices: async () => ({
        success: true,
        totalCount: 1318,
        services: [
          {
            id: 'ZFAP_PAYMENT_POST_SRV_0001',
            technicalServiceName: 'ZFAP_PAYMENT_POST_SRV',
            title: 'FAP_PAYMENT_POST_SRV',
            description: 'Post Outgoing Supplier Payment',
            serviceUrl: 'http://192.168.1.55:8000/sap/opu/odata/sap/FAP_PAYMENT_POST_SRV',
            metadataUrl: 'http://192.168.1.55:8000/sap/opu/odata/sap/FAP_PAYMENT_POST_SRV/$metadata',
            serviceType: 'UI'
          },
          {
            id: 'ZFAP_MANUAL_CLEARING_SRV_0001',
            technicalServiceName: 'ZFAP_MANUAL_CLEARING_SRV',
            title: 'FAP_MANUAL_CLEARING_SRV',
            description: 'Manual clearing of outgoing payments',
            serviceUrl: 'http://192.168.1.55:8000/sap/opu/odata/sap/FAP_MANUAL_CLEARING_SRV',
            metadataUrl: 'http://192.168.1.55:8000/sap/opu/odata/sap/FAP_MANUAL_CLEARING_SRV/$metadata',
            serviceType: 'UI'
          }
        ]
      })
    };

    const mockBtpAdapter = {
      executeRequest: async () => ({
        success: false,
        httpStatus: 403,
        statusCode: 'ACCESS_DENIED'
      })
    };

    const adapter = new SapTransactionDiscoveryAdapter({
      btpAdapter: mockBtpAdapter,
      gatewayAdapter: mockGatewayAdapter
    });

    const result = await adapter.discoverTransaction('F-53');

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.verificationStatus, 'PARTIALLY_AVAILABLE');
    assert.strictEqual(result.transaction.tcode, 'F-53');
    assert.strictEqual(result.transaction.description, 'Post Outgoing Payments - For Suppliers');
    assert.strictEqual(result.transaction.program.status, 'PENDING_VERIFICATION');
    assert.strictEqual(result.transaction.package.status, 'PENDING_VERIFICATION');
    assert.strictEqual(result.correlatedGatewayServices.length, 2);
    assert.strictEqual(result.correlatedGatewayServices[0].technicalServiceName, 'ZFAP_PAYMENT_POST_SRV');
    assert.ok(result.basisAuthorizationRequirements !== null);
    assert.strictEqual(result.provenance, 'LIVE_SAP_S21');
  });

  it('SapTransactionDiscoveryAdapter returns NOT_FOUND for nonexistent transaction code', async () => {
    const mockGatewayAdapter = {
      getCatalogServices: async () => ({
        success: true,
        totalCount: 1318,
        services: []
      })
    };

    const mockBtpAdapter = {
      executeRequest: async () => ({
        success: false,
        httpStatus: 403,
        statusCode: 'ACCESS_DENIED'
      })
    };

    const adapter = new SapTransactionDiscoveryAdapter({
      btpAdapter: mockBtpAdapter,
      gatewayAdapter: mockGatewayAdapter
    });

    const result = await adapter.discoverTransaction('ZNONEXISTENT999');

    assert.strictEqual(result.success, false);
    assert.strictEqual(result.statusCode, 'NOT_FOUND');
    assert.strictEqual(result.verificationStatus, 'NOT_FOUND');
    assert.strictEqual(result.httpStatus, 404);
    assert.ok(result.errorMessage.includes('no verified record'));
  });

  it('SapTransactionDiscoveryAdapter returns LIVE_CONNECTION_FAILED on network failure without misdiagnosing NOT_FOUND', async () => {
    const mockGatewayAdapter = {
      getCatalogServices: async () => ({
        success: false,
        statusCode: 'LIVE_CONNECTION_FAILED',
        httpStatus: 504,
        errorMessage: 'Connection timed out after 15000ms.'
      })
    };

    const adapter = new SapTransactionDiscoveryAdapter({
      gatewayAdapter: mockGatewayAdapter
    });

    const result = await adapter.discoverTransaction('F-53');

    assert.strictEqual(result.success, false);
    assert.strictEqual(result.statusCode, 'LIVE_CONNECTION_FAILED');
    assert.strictEqual(result.verificationStatus, 'LIVE_CONNECTION_FAILED');
    assert.strictEqual(result.httpStatus, 504);
    assert.ok(result.errorMessage.includes('timed out'));
  });
});

describe('Fiorify Sprint 6 — HTTP Server New Endpoints Integration', () => {
  const TEST_ADMIN_SECRET = 'sprint6-secret-xyz123';

  const mockGatewayAdapter = {
    getCatalogServices: async ({ search }) => ({
      success: true,
      statusCode: 'SUCCESS',
      httpStatus: 200,
      totalCount: search ? 1 : 2,
      services: [
        { technicalServiceName: 'ZFAP_PAYMENT_POST_SRV', description: 'Post Outgoing Supplier Payment' }
      ]
    }),
    getServiceMetadata: async (serviceId) => ({
      success: true,
      statusCode: 'SUCCESS',
      httpStatus: 200,
      technicalServiceName: serviceId,
      metadata: { entitySetsCount: 5, entitySets: [{ name: 'PaymentHeaders' }] }
    })
  };

  const mockTransactionAdapter = {
    discoverTransaction: async (tcode) => {
      if (tcode === 'F-53') {
        return {
          success: true,
          statusCode: 'SUCCESS',
          verificationStatus: 'PARTIALLY_AVAILABLE',
          httpStatus: 200,
          transaction: { tcode: 'F-53', description: 'Post Outgoing Payments' }
        };
      }
      if (tcode === 'ZNOTEXIST') {
        return {
          success: false,
          statusCode: 'NOT_FOUND',
          verificationStatus: 'NOT_FOUND',
          httpStatus: 404,
          errorMessage: 'Transaction not found.'
        };
      }
      return {
        success: false,
        statusCode: 'INVALID_INPUT',
        verificationStatus: 'NOT_FOUND',
        httpStatus: 400,
        errorMessage: 'Invalid format.'
      };
    }
  };

  const mockBtpAdapter = {
    verifyAdminSecret: (secret) => secret === TEST_ADMIN_SECRET,
    validateConfiguration: () => ({ isValid: true, configuration: { destinationName: 'S21', sapClient: '200' }, destinationBinding: { present: true }, connectivityBinding: { present: true } })
  };

  it('protects GET /api/v1/gateway/services and returns 401 when admin secret is missing', async () => {
    const origSecret = process.env.Fiorify_ADMIN_SECRET;
    process.env.Fiorify_ADMIN_SECRET = TEST_ADMIN_SECRET;

    const server = createServer({
      btpAdapter: mockBtpAdapter,
      gatewayAdapter: mockGatewayAdapter,
      transactionAdapter: mockTransactionAdapter
    });

    await new Promise((resolve) => server.listen(0, resolve));
    const port = server.address().port;

    try {
      const res = await fetch(`http://localhost:${port}/api/v1/gateway/services`);
      assert.strictEqual(res.status, 401);
      const data = await res.json();
      assert.strictEqual(data.statusCode, 'UNAUTHORIZED');
    } finally {
      server.close();
      process.env.Fiorify_ADMIN_SECRET = origSecret;
    }
  });

  it('allows GET /api/v1/gateway/services with 200 when valid X-Fiorify-Admin-Secret is provided', async () => {
    const origSecret = process.env.Fiorify_ADMIN_SECRET;
    process.env.Fiorify_ADMIN_SECRET = TEST_ADMIN_SECRET;

    const server = createServer({
      btpAdapter: mockBtpAdapter,
      gatewayAdapter: mockGatewayAdapter,
      transactionAdapter: mockTransactionAdapter
    });

    await new Promise((resolve) => server.listen(0, resolve));
    const port = server.address().port;

    try {
      const res = await fetch(`http://localhost:${port}/api/v1/gateway/services?search=PAYMENT`, {
        headers: { 'X-Fiorify-Admin-Secret': TEST_ADMIN_SECRET }
      });
      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert.strictEqual(data.totalCount, 1);
    } finally {
      server.close();
      process.env.Fiorify_ADMIN_SECRET = origSecret;
    }
  });

  it('allows GET /api/v1/gateway/services/:serviceId/metadata with 200 when authorized', async () => {
    const origSecret = process.env.Fiorify_ADMIN_SECRET;
    process.env.Fiorify_ADMIN_SECRET = TEST_ADMIN_SECRET;

    const server = createServer({
      btpAdapter: mockBtpAdapter,
      gatewayAdapter: mockGatewayAdapter,
      transactionAdapter: mockTransactionAdapter
    });

    await new Promise((resolve) => server.listen(0, resolve));
    const port = server.address().port;

    try {
      const res = await fetch(`http://localhost:${port}/api/v1/gateway/services/FAP_PAYMENT_POST_SRV/metadata`, {
        headers: { 'X-Fiorify-Admin-Secret': TEST_ADMIN_SECRET }
      });
      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert.strictEqual(data.technicalServiceName, 'FAP_PAYMENT_POST_SRV');
      assert.strictEqual(data.metadata.entitySetsCount, 5);
    } finally {
      server.close();
      process.env.Fiorify_ADMIN_SECRET = origSecret;
    }
  });

  it('handles GET /api/v1/transaction-discovery/:tcode with 200 for F-53, 404 for ZNOTEXIST, and 400 for invalid', async () => {
    const origSecret = process.env.Fiorify_ADMIN_SECRET;
    process.env.Fiorify_ADMIN_SECRET = TEST_ADMIN_SECRET;

    const server = createServer({
      btpAdapter: mockBtpAdapter,
      gatewayAdapter: mockGatewayAdapter,
      transactionAdapter: mockTransactionAdapter
    });

    await new Promise((resolve) => server.listen(0, resolve));
    const port = server.address().port;

    try {
      // 1. Valid F-53
      const resF53 = await fetch(`http://localhost:${port}/api/v1/transaction-discovery/F-53`, {
        headers: { 'X-Fiorify-Admin-Secret': TEST_ADMIN_SECRET }
      });
      assert.strictEqual(resF53.status, 200);
      const dataF53 = await resF53.json();
      assert.strictEqual(dataF53.transaction.tcode, 'F-53');
      assert.strictEqual(dataF53.verificationStatus, 'PARTIALLY_AVAILABLE');

      // 2. Nonexistent ZNOTEXIST
      const res404 = await fetch(`http://localhost:${port}/api/v1/transaction-discovery/ZNOTEXIST`, {
        headers: { 'X-Fiorify-Admin-Secret': TEST_ADMIN_SECRET }
      });
      assert.strictEqual(res404.status, 404);

      // 3. Invalid
      const res400 = await fetch(`http://localhost:${port}/api/v1/transaction-discovery/INVALID$$$`, {
        headers: { 'X-Fiorify-Admin-Secret': TEST_ADMIN_SECRET }
      });
      assert.strictEqual(res400.status, 400);
    } finally {
      server.close();
      process.env.Fiorify_ADMIN_SECRET = origSecret;
    }
  });
});
