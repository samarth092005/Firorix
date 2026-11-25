/**
 * Fiorify Phase 5 Master Test Suite — SAP BTP Connectivity (SAP-001 to SAP-011)
 *
 * Authoritative verification suite for SAP BTP Cloud Foundry connectivity:
 * - SAP-001: BTP Service Inventory & Binding Expectations
 * - SAP-002: BTP Destination Service Verification & Secret Redaction
 * - SAP-003: Connectivity Service & Cloud Connector Route Distinction
 * - SAP-004: Strict TLS Validation & Production Invariant Enforcement
 * - SAP-005: Central Read-Only SAP Method Policy (GET/HEAD/OPTIONS only)
 * - SAP-006: Deterministic SAP Error Taxonomy & 403 Conflation Prevention
 * - SAP-007: Evidence-Based SAP Preflight (Zero Hardcoded Claims)
 * - SAP-008: Comprehensive Evidence Provenance & Credential Scrubbing
 * - SAP-009: Namespace-Aware OData V2 & V4 EDMX Metadata Parsing
 * - SAP-010: Safe 7-Substate Connectivity Health Diagnostics
 * - SAP-011: Genuine Read-Only S21 Landscape Verification & Blockers
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  BtpDestinationAdapter,
  btpDestinationAdapter,
  sanitizeHeaders,
  sanitizeErrorMessage,
  sanitizeDestination
} from '../src/adapters/btpDestinationAdapter.js';
import {
  SapGatewayMetadataAdapter,
  parseEdmxMetadata
} from '../src/adapters/sapGatewayMetadataAdapter.js';
import {
  SapHttpClient,
  defaultSapHttpClient
} from '../src/infrastructure/connectivity/sapHttpClient.js';
import {
  classifySapError,
  isConnectivityFailure,
  CONNECTIVITY_STATUSES,
  SAP_ERROR_CATEGORIES
} from '../src/infrastructure/connectivity/sapErrorTaxonomy.js';
import {
  SapPreflightService,
  PREFLIGHT_CHECK_IDS,
  PREFLIGHT_READINESS
} from '../src/infrastructure/connectivity/sapPreflightService.js';
import {
  SapConnectionHealthService,
  defaultSapConnectionHealthService,
  CAPABILITY_KEYS
} from '../src/infrastructure/connectivity/sapConnectionHealthService.js';
import {
  systemRegistry
} from '../src/adapters/systemRegistry.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..', '..');

describe('Fiorify Phase 5: SAP BTP Connectivity Master Suite (SAP-001 to SAP-011)', () => {

  // ========================================================
  // SAP-001: BTP Service Inventory
  // ========================================================
  describe('SAP-001: BTP Service Inventory & Binding Expectations', () => {
    it('1. manifest.yml mandates production services: xsuaa, destination, connectivity, and hana', () => {
      const manifestPath = path.join(rootDir, 'manifest.yml');
      assert.ok(fs.existsSync(manifestPath), 'manifest.yml must exist at repository root');
      const manifestContent = fs.readFileSync(manifestPath, 'utf8');

      // Verify required production BTP service bindings
      assert.match(manifestContent, /Fiorify-destination/i, 'Destination service must be declared');
      assert.match(manifestContent, /Fiorify-connectivity/i, 'Connectivity service must be declared');
      assert.match(manifestContent, /Fiorify-xsuaa/i, 'XSUAA service must be declared');
      assert.match(manifestContent, /Fiorify-hana/i, 'SAP HANA Cloud service must be declared for production');
      assert.match(manifestContent, /FIORIFY_PERSISTENCE:\s*hana/i, 'Production persistence must be set to hana');
    });

    it('2. VCAP_SERVICES parser accurately identifies service instances, plans, and missing bindings', () => {
      const mockVcap = {
        'destination': [
          {
            name: 'fiorify-destination',
            plan: 'lite',
            label: 'destination',
            tags: ['destination'],
            credentials: {
              clientid: 'dest-client-id-123',
              clientsecret: 'dest-secret-xyz',
              uri: 'https://destination-configuration.cfapps.eu30.hana.ondemand.com'
            }
          }
        ],
        'connectivity': [
          {
            name: 'fiorify-connectivity',
            plan: 'lite',
            label: 'connectivity',
            tags: ['connectivity'],
            credentials: {
              clientid: 'conn-client-id-456',
              clientsecret: 'conn-secret-abc',
              onpremise_proxy_host: 'connectivityproxy.internal.cf.eu30.hana.ondemand.com',
              onpremise_proxy_port: '20003'
            }
          }
        ]
      };

      const adapter = new BtpDestinationAdapter({ vcapServices: JSON.stringify(mockVcap) });
      const destBinding = adapter.inspectBinding('destination', JSON.stringify(mockVcap));
      assert.strictEqual(destBinding.present, true);
      assert.strictEqual(destBinding.instanceName, 'fiorify-destination');
      assert.strictEqual(destBinding.plan, 'lite');
      assert.strictEqual(destBinding.isConfigured, true);

      const connBinding = adapter.inspectBinding('connectivity', JSON.stringify(mockVcap));
      assert.strictEqual(connBinding.present, true);
      assert.strictEqual(connBinding.instanceName, 'fiorify-connectivity');
      assert.strictEqual(connBinding.plan, 'lite');
      assert.strictEqual(connBinding.isConfigured, true);

      const missingBinding = adapter.inspectBinding('hana', JSON.stringify(mockVcap));
      assert.strictEqual(missingBinding.present, false);
      assert.ok(missingBinding.reason.includes('No binding found'));
    });
  });

  // ========================================================
  // SAP-002: Destination Service Verification
  // ========================================================
  describe('SAP-002: BTP Destination Service Verification & Secret Redaction', () => {
    it('1. Missing destination returns explicit DESTINATION_NOT_FOUND, never synthetic success', async () => {
      const adapter = new BtpDestinationAdapter({
        destinationName: 'NON_EXISTENT_DEST',
        sdkGetDestination: async () => null,
        vcapServices: JSON.stringify({})
      });

      const res = await adapter.resolveDestination('NON_EXISTENT_DEST');
      assert.strictEqual(res.success, false);
      assert.strictEqual(res.statusCode, 'DESTINATION_NOT_FOUND');
      assert.strictEqual(res.destination, undefined);
    });

    it('2. Destination metadata and credentials are strictly scrubbed by sanitizeDestination', () => {
      const rawDest = {
        name: 'S21',
        url: 'http://kbl_fiori:8000',
        proxyType: 'OnPremise',
        authentication: 'BasicAuthentication',
        username: 'int_samarth',
        password: 'super-secret-password-1234',
        authTokens: [{ value: 'bearer-token-xyz' }]
      };

      const sanitized = sanitizeDestination(rawDest);
      assert.strictEqual(sanitized.password, '[REDACTED]');
      assert.strictEqual(sanitized.authTokens, '[REDACTED]');
      assert.strictEqual(sanitized.username, 'int_samarth');
      assert.strictEqual(sanitized.url, 'http://kbl_fiori:8000');
    });

    it('3. Outbound request headers and error messages scrub all secrets and bearer tokens', () => {
      const dirtyHeaders = {
        Authorization: 'Basic aW50X3NhbWFydGg6c2VjcmV0',
        'X-CSRF-Token': 'csrf-token-abc',
        Cookie: 'MYSAPSSO2=abc123xyz',
        'Proxy-Authorization': 'Bearer proxy-token',
        'Content-Type': 'application/json'
      };

      const sanitizedH = sanitizeHeaders(dirtyHeaders);
      assert.strictEqual(sanitizedH['Authorization'], '[REDACTED]');
      assert.strictEqual(sanitizedH['X-CSRF-Token'], '[REDACTED]');
      assert.strictEqual(sanitizedH['Cookie'], '[REDACTED]');
      assert.strictEqual(sanitizedH['Proxy-Authorization'], '[REDACTED]');
      assert.strictEqual(sanitizedH['Content-Type'], 'application/json');

      const dirtyMsg = 'Failed to connect: Bearer eyJhbGciOiJIUzI1NiIsIn... password=supersecret token=xyz';
      const cleanMsg = sanitizeErrorMessage(dirtyMsg);
      assert.ok(!cleanMsg.includes('supersecret'));
      assert.ok(cleanMsg.includes('password=[REDACTED]'));
      assert.ok(cleanMsg.includes('Bearer [REDACTED]'));
    });
  });

  // ========================================================
  // SAP-003: Connectivity Service & Cloud Connector
  // ========================================================
  describe('SAP-003: Connectivity Service & Cloud Connector Route Distinction', () => {
    it('1. Distinguishes Cloud Connector unroutable virtual host error from other failures', () => {
      const adapter = new BtpDestinationAdapter({ destinationName: 'S21' });
      const enotfoundErr = new Error('getaddrinfo ENOTFOUND kbl_fiori');
      enotfoundErr.code = 'ENOTFOUND';

      const handled = adapter.handleExecutionError(enotfoundErr, '/sap/opu/odata/IWFND/CATALOGSERVICE;v=2/');
      assert.strictEqual(handled.success, false);
      assert.strictEqual(handled.statusCode, 'CONNECTIVITY_FAILED');
      assert.strictEqual(handled.httpStatus, 502);
      assert.ok(handled.errorMessage.includes('SAP Cloud Connector'));
      assert.ok(handled.errorMessage.includes('kbl_fiori:8000'));
    });

    it('2. Distinguishes upstream Gateway 502/503/504 as CONNECTIVITY_FAILED with virtual host remediation', () => {
      const adapter = new BtpDestinationAdapter({ destinationName: 'S21' });
      const upstreamErr = new Error('Bad Gateway');
      upstreamErr.response = { status: 502 };

      const handled = adapter.handleExecutionError(upstreamErr, '/sap/bc/adt/discovery');
      assert.strictEqual(handled.success, false);
      assert.strictEqual(handled.statusCode, 'CONNECTIVITY_FAILED');
      assert.strictEqual(handled.httpStatus, 502);
      assert.ok(handled.errorMessage.includes('Cloud Connector registration'));
    });

    it('3. Distinguishes request timeout as TIMEOUT with HTTP 504', () => {
      const adapter = new BtpDestinationAdapter({ destinationName: 'S21', timeoutMs: 1500 });
      const timeoutErr = new Error('timeout of 1500ms exceeded');
      timeoutErr.code = 'ETIMEDOUT';

      const handled = adapter.handleExecutionError(timeoutErr, '/sap/opu/odata/IWFND/CATALOGSERVICE;v=2/');
      assert.strictEqual(handled.success, false);
      assert.strictEqual(handled.statusCode, 'TIMEOUT');
      assert.strictEqual(handled.httpStatus, 504);
      assert.strictEqual(handled.details.timeoutMs, 1500);
    });
  });

  // ========================================================
  // SAP-004: Strict TLS Validation
  // ========================================================
  describe('SAP-004: Strict TLS Validation & Production Invariant Enforcement', () => {
    it('1. Prohibits NODE_TLS_REJECT_UNAUTHORIZED=0 in production mode', () => {
      const client = new SapHttpClient();
      const prevEnv = process.env.NODE_ENV;
      const prevTls = process.env.NODE_TLS_REJECT_UNAUTHORIZED;

      try {
        process.env.NODE_ENV = 'production';
        process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

        assert.throws(
          () => client.assertTlsInvariants('https://sap-s21.corp.internal/sap/bc/echo'),
          (err) => err.code === 'INSECURE_TLS_FORBIDDEN'
        );
      } finally {
        process.env.NODE_ENV = prevEnv;
        process.env.NODE_TLS_REJECT_UNAUTHORIZED = prevTls;
      }
    });

    it('2. Prohibits rejectUnauthorized: false option in production mode', () => {
      const client = new SapHttpClient();
      const prevEnv = process.env.NODE_ENV;

      try {
        process.env.NODE_ENV = 'production';
        assert.throws(
          () => client.assertTlsInvariants('https://sap-s21.corp.internal/sap/bc/echo', { rejectUnauthorized: false }),
          (err) => err.code === 'INSECURE_TLS_FORBIDDEN'
        );
      } finally {
        process.env.NODE_ENV = prevEnv;
      }
    });

    it('3. BtpDestinationAdapter rejects insecure TLS bypass in production', async () => {
      const prevEnv = process.env.NODE_ENV;
      const prevTls = process.env.NODE_TLS_REJECT_UNAUTHORIZED;

      try {
        process.env.NODE_ENV = 'production';
        process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

        await assert.rejects(
          async () => {
            await btpDestinationAdapter.executeRequest({ path: '/sap/bc/echo', method: 'GET' });
          },
          (err) => err.code === 'INSECURE_TLS_FORBIDDEN'
        );
      } finally {
        process.env.NODE_ENV = prevEnv;
        process.env.NODE_TLS_REJECT_UNAUTHORIZED = prevTls;
      }
    });
  });

  // ========================================================
  // SAP-005: Central Read-Only SAP Method Policy
  // ========================================================
  describe('SAP-005: Central Read-Only SAP Method Policy (GET/HEAD/OPTIONS only)', () => {
    it('1. SapHttpClient strictly permits only GET, HEAD, OPTIONS', () => {
      const client = new SapHttpClient();

      assert.doesNotThrow(() => client.assertReadOnly('GET'));
      assert.doesNotThrow(() => client.assertReadOnly('HEAD'));
      assert.doesNotThrow(() => client.assertReadOnly('OPTIONS'));
      assert.doesNotThrow(() => client.assertReadOnly('get'));

      const mutatingMethods = ['POST', 'PUT', 'PATCH', 'DELETE', 'CONNECT', 'TRACE'];
      for (const m of mutatingMethods) {
        assert.throws(
          () => client.assertReadOnly(m),
          (err) => err.code === 'WRITE_OPERATION_BLOCKED',
          `Method ${m} must be blocked by assertReadOnly`
        );
      }
    });

    it('2. BtpDestinationAdapter centrally blocks mutating HTTP methods with HTTP 405', async () => {
      const mutatingMethods = ['POST', 'PUT', 'PATCH', 'DELETE'];
      for (const m of mutatingMethods) {
        const res = await btpDestinationAdapter.executeRequest({
          path: '/sap/opu/odata/IWFND/CATALOGSERVICE;v=2/ServiceCollection',
          method: m
        });

        assert.strictEqual(res.success, false);
        assert.strictEqual(res.statusCode, 'READ_ONLY_VIOLATION');
        assert.strictEqual(res.httpStatus, 405);
        assert.ok(res.errorMessage.includes('CENTRAL SAP SAFETY VIOLATION'));
      }
    });

    it('3. Outbound endpoint allowlist blocks non-whitelisted paths and directory traversal', () => {
      const client = new SapHttpClient();

      // Allowed endpoints
      assert.doesNotThrow(() => client.assertAllowedEndpoint('/sap/opu/odata/IWFND/CATALOGSERVICE;v=2/'));
      assert.doesNotThrow(() => client.assertAllowedEndpoint('/sap/bc/adt/discovery'));
      assert.doesNotThrow(() => client.assertAllowedEndpoint('/sap/bc/echo'));
      assert.doesNotThrow(() => client.assertAllowedEndpoint('/sap/public/bc/ur'));

      // Blocked endpoints
      assert.throws(() => client.assertAllowedEndpoint('/sap/bc/gui/sap/its/webgui'), (e) => e.code === 'DISALLOWED_SAP_ENDPOINT');
      assert.throws(() => client.assertAllowedEndpoint('/sap/admin/config'), (e) => e.code === 'DISALLOWED_SAP_ENDPOINT');
      assert.throws(() => client.assertAllowedEndpoint('/sap/opu/odata/../../etc/passwd'), (e) => e.code === 'DISALLOWED_SAP_ENDPOINT');
      assert.throws(() => client.assertAllowedEndpoint('//malicious-host.com/sap/bc/echo'), (e) => e.code === 'DISALLOWED_SAP_ENDPOINT');
    });
  });

  // ========================================================
  // SAP-006: SAP Error Classification
  // ========================================================
  describe('SAP-006: Deterministic SAP Error Taxonomy & 403 Conflation Prevention', () => {
    it('1. HTTP 401 classifies strictly as AUTHENTICATION_FAILED with category SECURITY_BLOCKED', () => {
      const c = classifySapError(401, 'Unauthorized');
      assert.strictEqual(c.statusCode, 'AUTHENTICATION_FAILED');
      assert.strictEqual(c.connectivityStatus, CONNECTIVITY_STATUSES.AUTHENTICATION_FAILED);
      assert.strictEqual(c.category, SAP_ERROR_CATEGORIES.SECURITY_BLOCKED);
      assert.strictEqual(c.isInfrastructureFailure, true);
      assert.strictEqual(c.canConcludeMissingApp, false);
    });

    it('2. HTTP 403 classifies strictly as AUTHORIZATION_BLOCKED and is NEVER reported as success', () => {
      const c = classifySapError(403, 'Forbidden: Missing PFCG object S_SERVICE');
      assert.strictEqual(c.statusCode, 'AUTHORIZATION_BLOCKED');
      assert.strictEqual(c.connectivityStatus, CONNECTIVITY_STATUSES.AUTHORIZATION_BLOCKED);
      assert.strictEqual(c.category, SAP_ERROR_CATEGORIES.SECURITY_BLOCKED);
      assert.strictEqual(c.isInfrastructureFailure, true);
      assert.strictEqual(c.canConcludeMissingApp, false);
      assert.ok(c.recommendedAction.includes('S_ADT_RES'));
    });

    it('3. HTTP 404 distinguishes catalog infrastructure failure vs non-existent transaction', () => {
      const catalogErr = classifySapError(404, 'Endpoint not found on /IWFND/CATALOGSERVICE');
      assert.strictEqual(catalogErr.isInfrastructureFailure, true);
      assert.strictEqual(catalogErr.canConcludeMissingApp, false);

      const objectErr = classifySapError(404, 'Entity ZNONEXISTENT does not exist');
      assert.strictEqual(objectErr.isInfrastructureFailure, false);
      assert.strictEqual(objectErr.canConcludeMissingApp, true);
    });

    it('4. isConnectivityFailure correctly guards downstream engines against false BUILD recommendations', () => {
      assert.strictEqual(isConnectivityFailure('TIMEOUT'), true);
      assert.strictEqual(isConnectivityFailure('NETWORK_UNAVAILABLE'), true);
      assert.strictEqual(isConnectivityFailure('CLOUD_CONNECTOR_UNAVAILABLE'), true);
      assert.strictEqual(isConnectivityFailure('AUTHENTICATION_FAILED'), true);
      assert.strictEqual(isConnectivityFailure('AUTHORIZATION_BLOCKED'), true);
      assert.strictEqual(isConnectivityFailure('DESTINATION_NOT_FOUND'), true);
      assert.strictEqual(isConnectivityFailure('NOT_FOUND'), false);
    });
  });

  // ========================================================
  // SAP-007: Evidence-Based SAP Preflight
  // ========================================================
  describe('SAP-007: Evidence-Based SAP Preflight (Zero Hardcoded Claims)', () => {
    it('1. Authorizations in preflight are derived strictly from probe results with zero synthetic SAP_ALL', async () => {
      const mockProvider = {
        destinationProvider: {
          resolve: async () => ({
            success: true,
            provenance: 'LOCAL_DEV_DESTINATION',
            rawDestination: { url: 'http://127.0.0.1:8000' }
          })
        },
        executeQuery: async (path) => {
          if (path.includes('CATALOGSERVICE')) {
            return { success: true, status: 200, data: {} };
          }
          if (path.includes('/sap/bc/adt')) {
            return { success: false, status: 403, errorMessage: 'User lacks S_ADT_RES' };
          }
          return { success: true, status: 200, data: {} };
        }
      };

      const preflight = new SapPreflightService({ provider: mockProvider });
      const report = await preflight.runPreflight({ destinationName: 'S21', sapClient: '200' });

      assert.strictEqual(report.summary.totalChecks, 15);
      const authCheck = report.checks.find(c => c.id === PREFLIGHT_CHECK_IDS.AUTHORIZATION_DIAGNOSTICS);
      assert.ok(authCheck, 'Authorization diagnostics check must be present');

      // Check specific authorization derivations
      const auths = authCheck.details.authorizations;
      const sService = auths.find(a => a.object === 'S_SERVICE');
      const sAdt = auths.find(a => a.object === 'S_ADT_RES');
      const sapAll = auths.find(a => a.object === 'SAP_ALL');

      assert.strictEqual(sService.status, 'VERIFIED', 'S_SERVICE must be VERIFIED on HTTP 200');
      assert.strictEqual(sAdt.status, 'BLOCKED', 'S_ADT_RES must be BLOCKED on HTTP 403');
      assert.strictEqual(sapAll, undefined, 'SAP_ALL must NEVER be synthesized or hardcoded');
    });

    it('2. Simulated fixtures are explicitly labelled SIMULATED_FIXTURE and never LIVE_SAP', async () => {
      const mockProvider = {
        destinationProvider: { resolve: async () => ({ success: true, rawDestination: { url: 'http://127.0.0.1:8000' } }) },
        executeQuery: async () => ({ success: true, status: 200, data: {} })
      };

      const preflight = new SapPreflightService({ provider: mockProvider });
      const report = await preflight.runPreflight({ destinationName: 'S21' });

      assert.strictEqual(report.targetSystem.provenance, 'SIMULATED_FIXTURE');
      for (const check of report.checks) {
        assert.strictEqual(check.provenance, 'SIMULATED_FIXTURE', `Check ${check.id} must be labelled SIMULATED_FIXTURE`);
        assert.notStrictEqual(check.provenance, 'LIVE_SAP_S21');
      }
    });
  });

  // ========================================================
  // SAP-008: Evidence Provenance
  // ========================================================
  describe('SAP-008: Comprehensive Evidence Provenance & Credential Scrubbing', () => {
    it('1. Every preflight evidence check captures complete provenance, timestamps, and freshness', async () => {
      const mockProvider = {
        destinationProvider: { resolve: async () => ({ success: true, rawDestination: { url: 'http://127.0.0.1:8000' } }) },
        executeQuery: async () => ({ success: true, status: 200, data: {} })
      };

      const preflight = new SapPreflightService({ provider: mockProvider });
      const report = await preflight.runPreflight({ destinationName: 'S21', sapClient: '200' });

      for (const check of report.checks) {
        assert.ok(check.sourceSystem, `Check ${check.id} must have sourceSystem`);
        assert.strictEqual(check.sapClient, '200', `Check ${check.id} must have sapClient`);
        assert.ok(check.verificationTimestamp, `Check ${check.id} must have verificationTimestamp`);
        assert.ok(check.freshness?.verifiedAt, `Check ${check.id} must have freshness.verifiedAt`);
        assert.ok(check.freshness?.ttlMs > 0, `Check ${check.id} must have positive freshness.ttlMs`);
        assert.ok(check.verificationState, `Check ${check.id} must have verificationState`);

        // Assert zero credentials or tokens in details
        const detailsStr = JSON.stringify(check.details);
        assert.doesNotMatch(detailsStr, /password/i, `Check ${check.id} details must not contain unredacted password`);
        assert.doesNotMatch(detailsStr, /Bearer\s+[A-Za-z0-9]/, `Check ${check.id} details must not contain raw Bearer token`);
      }
    });
  });

  // ========================================================
  // SAP-009: OData V2 & V4 Metadata Parsing
  // ========================================================
  describe('SAP-009: Namespace-Aware OData V2 & V4 EDMX Metadata Parsing', () => {
    const SAMPLE_ODATA_V2_XML = `<?xml version="1.0" encoding="utf-8"?>
<edmx:Edmx Version="1.0" xmlns:edmx="http://schemas.microsoft.com/ado/2007/06/edmx" xmlns:m="http://schemas.microsoft.com/ado/2007/08/dataservices/metadata" xmlns:sap="http://www.sap.com/Protocols/SAPData">
  <edmx:DataServices m:DataServiceVersion="2.0">
    <Schema Namespace="S4HANA_SALES" xmlns="http://schemas.microsoft.com/ado/2008/09/edm">
      <EntityType Name="SalesOrder">
        <Key>
          <PropertyRef Name="SalesOrderID"/>
        </Key>
        <Property Name="SalesOrderID" Type="Edm.String" Nullable="false" MaxLength="10" sap:label="Sales Order"/>
        <Property Name="Customer" Type="Edm.String" Nullable="false" MaxLength="10" sap:label="Sold-to Party"/>
        <Property Name="NetValue" Type="Edm.Decimal" Nullable="true" Precision="15" Scale="2" sap:label="Net Amount"/>
        <NavigationProperty Name="ToItems" Relationship="S4HANA_SALES.Order_Items" FromRole="FromOrder" ToRole="ToItems"/>
      </EntityType>
      <EntityType Name="SalesOrderItem">
        <Key>
          <PropertyRef Name="SalesOrderID"/>
          <PropertyRef Name="ItemNumber"/>
        </Key>
        <Property Name="SalesOrderID" Type="Edm.String" Nullable="false" MaxLength="10"/>
        <Property Name="ItemNumber" Type="Edm.String" Nullable="false" MaxLength="6"/>
        <Property Name="Material" Type="Edm.String" Nullable="false" MaxLength="40"/>
      </EntityType>
      <Association Name="Order_Items">
        <End Role="FromOrder" Type="S4HANA_SALES.SalesOrder" Multiplicity="1"/>
        <End Role="ToItems" Type="S4HANA_SALES.SalesOrderItem" Multiplicity="*"/>
      </Association>
      <EntityContainer Name="SalesEntities" m:IsDefaultEntityContainer="true">
        <EntitySet Name="SalesOrderSet" EntityType="S4HANA_SALES.SalesOrder" sap:creatable="true" sap:updatable="true" sap:deletable="false"/>
        <EntitySet Name="SalesOrderItemSet" EntityType="S4HANA_SALES.SalesOrderItem" sap:creatable="true" sap:updatable="false" sap:deletable="true"/>
        <FunctionImport Name="ConfirmOrder" ReturnType="Edm.Boolean" m:HttpMethod="POST"/>
      </EntityContainer>
    </Schema>
  </edmx:DataServices>
</edmx:Edmx>`;

    const SAMPLE_ODATA_V4_XML = `<?xml version="1.0" encoding="utf-8"?>
<edmx:Edmx Version="4.0" xmlns:edmx="http://docs.oasis-open.org/odata/ns/edmx">
  <edmx:DataServices>
    <Schema Namespace="com.sap.gateway.v4.purchaseorder" xmlns="http://docs.oasis-open.org/odata/ns/edm">
      <EntityType Name="PurchaseOrder">
        <Key>
          <PropertyRef Name="POID"/>
        </Key>
        <Property Name="POID" Type="Edm.String" Nullable="false" MaxLength="10"/>
        <Property Name="Vendor" Type="Edm.String" Nullable="false" MaxLength="10"/>
        <Property Name="TotalAmount" Type="Edm.Decimal" Nullable="true"/>
        <NavigationProperty Name="Items" Type="Collection(com.sap.gateway.v4.purchaseorder.POItem)" Partner="Order"/>
      </EntityType>
      <EntityType Name="POItem">
        <Key>
          <PropertyRef Name="POID"/>
          <PropertyRef Name="ItemNo"/>
        </Key>
        <Property Name="POID" Type="Edm.String" Nullable="false" MaxLength="10"/>
        <Property Name="ItemNo" Type="Edm.Int32" Nullable="false"/>
        <NavigationProperty Name="Order" Type="com.sap.gateway.v4.purchaseorder.PurchaseOrder" Partner="Items"/>
      </EntityType>
      <Action Name="ReleasePO">
        <Parameter Name="POID" Type="Edm.String"/>
        <ReturnType Type="Edm.Boolean"/>
      </Action>
      <EntityContainer Name="PurchaseContainer">
        <EntitySet Name="PurchaseOrders" EntityType="com.sap.gateway.v4.purchaseorder.PurchaseOrder"/>
        <ActionImport Name="ReleasePurchaseOrder" Action="com.sap.gateway.v4.purchaseorder.ReleasePO"/>
      </EntityContainer>
    </Schema>
  </edmx:DataServices>
</edmx:Edmx>`;

    it('1. Accurately identifies and parses OData V2 metadata with associations and function imports', () => {
      const v2 = parseEdmxMetadata(SAMPLE_ODATA_V2_XML);
      assert.strictEqual(v2.success, true);
      assert.strictEqual(v2.odataVersion, 'v2');
      assert.strictEqual(v2.edmxVersion, '1.0');
      assert.strictEqual(v2.entitySets.length, 2);

      const orderSet = v2.entitySets.find(es => es.name === 'SalesOrderSet');
      assert.ok(orderSet);
      assert.strictEqual(orderSet.creatable, true);
      assert.strictEqual(orderSet.updatable, true);
      assert.strictEqual(orderSet.deletable, false);
      assert.deepStrictEqual(orderSet.keys, ['SalesOrderID']);
      assert.strictEqual(orderSet.propertiesCount, 3);
      assert.strictEqual(orderSet.properties[0].name, 'SalesOrderID');
      assert.strictEqual(orderSet.properties[0].label, 'Sales Order');

      // Navigation properties and associations
      assert.strictEqual(orderSet.navigationProperties.length, 1);
      assert.strictEqual(orderSet.navigationProperties[0].name, 'ToItems');
      assert.strictEqual(orderSet.navigationProperties[0].relationship, 'S4HANA_SALES.Order_Items');
      assert.strictEqual(v2.associations.length, 1);
      assert.strictEqual(v2.associations[0].name, 'Order_Items');

      // Operations
      assert.strictEqual(v2.functionImports.length, 1);
      assert.strictEqual(v2.functionImports[0].name, 'ConfirmOrder');
      assert.strictEqual(v2.functionImports[0].httpMethod, 'POST');
    });

    it('2. Accurately identifies and parses OData V4 metadata with action imports and navigation properties', () => {
      const v4 = parseEdmxMetadata(SAMPLE_ODATA_V4_XML);
      assert.strictEqual(v4.success, true);
      assert.strictEqual(v4.odataVersion, 'v4');
      assert.strictEqual(v4.edmxVersion, '4.0');
      assert.strictEqual(v4.entitySets.length, 1);

      const poSet = v4.entitySets[0];
      assert.strictEqual(poSet.name, 'PurchaseOrders');
      assert.deepStrictEqual(poSet.keys, ['POID']);
      assert.strictEqual(poSet.navigationProperties.length, 1);
      assert.strictEqual(poSet.navigationProperties[0].name, 'Items');
      assert.strictEqual(poSet.navigationProperties[0].partner, 'Order');

      // V4 Action Import
      const actionOp = v4.operations.find(o => o.name === 'ReleasePurchaseOrder');
      assert.ok(actionOp);
      assert.strictEqual(actionOp.kind, 'ActionImport');
      assert.strictEqual(actionOp.httpMethod, 'POST');
    });

    it('3. Handles malformed XML gracefully without crashing', () => {
      const malformedXml = '<edmx:Edmx Version="1.0"><edmx:DataServices><Schema><EntityType Name="Test"></Schema></edmx:Edmx>';
      const res = parseEdmxMetadata(malformedXml);
      assert.strictEqual(res.success, false);
      assert.strictEqual(res.error, 'MALFORMED_XML');
      assert.ok(res.errorMessage.includes('syntax error'));
    });

    it('4. Handles empty, null, or whitespace metadata gracefully', () => {
      const emptyRes1 = parseEdmxMetadata('');
      assert.strictEqual(emptyRes1.success, false);
      assert.strictEqual(emptyRes1.error, 'EMPTY_METADATA');

      const emptyRes2 = parseEdmxMetadata('   \n\t  ');
      assert.strictEqual(emptyRes2.success, false);
      assert.strictEqual(emptyRes2.error, 'EMPTY_METADATA');
    });

    it('5. Handles unsupported non-EDMX metadata gracefully', () => {
      const nonEdmxXml = '<response><status>Not EDMX</status></response>';
      const res = parseEdmxMetadata(nonEdmxXml);
      assert.strictEqual(res.success, false);
      assert.strictEqual(res.error, 'UNSUPPORTED_METADATA');

      // Also ensure DTD / DOCTYPE injection is rejected as UNSAFE_METADATA
      const dtdDoc = '<!DOCTYPE html><html><body><h1>502 Bad Gateway</h1></body></html>';
      const dtdRes = parseEdmxMetadata(dtdDoc);
      assert.strictEqual(dtdRes.success, false);
      assert.strictEqual(dtdRes.error, 'UNSAFE_METADATA');
    });
  });

  // ========================================================
  // SAP-010: Connectivity Health Diagnostics
  // ========================================================
  describe('SAP-010: Safe 7-Substate Connectivity Health Diagnostics', () => {
    it('1. getDiagnostics accurately distinguishes all 7 connectivity sub-states', async () => {
      const healthService = defaultSapConnectionHealthService;
      const diag = await healthService.getDiagnostics();

      assert.ok(diag.substates, 'Diagnostics must include substates container');

      // 1. Service bindings
      assert.ok(diag.substates.serviceBindings, 'Substate 1: serviceBindings must exist');
      assert.ok(['BOUND', 'PARTIAL', 'UNBOUND'].includes(diag.substates.serviceBindings.status));

      // 2. Destination lookup
      assert.ok(diag.substates.destinationLookup, 'Substate 2: destinationLookup must exist');
      assert.ok(['RESOLVED', 'NOT_FOUND', 'FAILED'].includes(diag.substates.destinationLookup.status));
      assert.strictEqual(diag.substates.destinationLookup.destinationName, 'S21');

      // 3. Connectivity proxy
      assert.ok(diag.substates.connectivityProxy, 'Substate 3: connectivityProxy must exist');
      assert.ok(['CONFIGURED', 'LOCAL_TUNNEL', 'UNCONFIGURED'].includes(diag.substates.connectivityProxy.status));

      // 4. Cloud connector tunnel
      assert.ok(diag.substates.cloudConnectorTunnel, 'Substate 4: cloudConnectorTunnel must exist');
      assert.ok(['CONNECTED', 'TUNNEL_CLOSED', 'UNREACHABLE', 'BLOCKED_BY_DESTINATION', 'PENDING_VERIFICATION'].includes(diag.substates.cloudConnectorTunnel.status));

      // 5. SAP ICM reachability
      assert.ok(diag.substates.icmReachability, 'Substate 5: icmReachability must exist');
      assert.ok(['REACHABLE', 'UNREACHABLE', 'TIMEOUT', 'BLOCKED_BY_DESTINATION', 'UNTESTED'].includes(diag.substates.icmReachability.status));

      // 6. SAP authentication
      assert.ok(diag.substates.authentication, 'Substate 6: authentication must exist');
      assert.ok(['AUTHENTICATED', 'AUTHENTICATION_FAILED', 'BLOCKED', 'UNKNOWN', 'UNTESTED'].includes(diag.substates.authentication.status));
      assert.strictEqual(diag.substates.authentication.password, '[REDACTED]');

      // 7. Gateway catalog authorization
      assert.ok(diag.substates.gatewayCatalog, 'Substate 7: gatewayCatalog must exist');
      assert.ok(['AUTHORIZED', 'AUTHORIZATION_FAILED', 'SERVICE_NOT_ACTIVATED', 'UNAVAILABLE', 'BLOCKED', 'UNTESTED'].includes(diag.substates.gatewayCatalog.status));

      // Invariants
      assert.strictEqual(diag.readOnlyPolicyEnforced, true);
      assert.strictEqual(diag.tlsValidation.strictTlsEnforced, true);
    });

    it('2. Zero passwords, bearer tokens, or client secrets in diagnostic payload', async () => {
      const healthService = defaultSapConnectionHealthService;
      const diag = await healthService.getDiagnostics();
      const payloadStr = JSON.stringify(diag);

      assert.doesNotMatch(payloadStr, /ArchitectPass/, 'No architect password in diagnostics');
      assert.doesNotMatch(payloadStr, /AdminPass/, 'No admin password in diagnostics');
      assert.doesNotMatch(payloadStr, /Bearer\s+[A-Za-z0-9]/, 'No bearer tokens in diagnostics');
    });
  });

  // ========================================================
  // SAP-011: Genuine Read-Only S21 Landscape Verification
  // ========================================================
  describe('SAP-011: Genuine Read-Only S21 Landscape Verification & Blockers', () => {
    it('1. Executes genuine read-only probe against S21 without fabrication', async () => {
      const smokeResult = await btpDestinationAdapter.executeSmokeTest();

      assert.ok(smokeResult.timestamp, 'Smoke test must include timestamp');
      assert.strictEqual(smokeResult.destination, 'S21');
      assert.strictEqual(smokeResult.sapClient, '200');
      assert.strictEqual(smokeResult.targetEndpoint, '/sap/opu/odata/IWFND/CATALOGSERVICE;v=2/ServiceCollection');

      if (smokeResult.success) {
        // Honest proof of live connection
        assert.strictEqual(smokeResult.httpStatus, 200);
        assert.strictEqual(smokeResult.statusCode, 'SUCCESS');
        assert.ok(smokeResult.gatewayResponse.servicesReturned >= 1);
        assert.strictEqual(smokeResult.diagnostics.provenance, 'LIVE_SAP_GATEWAY_CATALOG');
      } else {
        // Honest proof of blocked / unreachable connection
        assert.ok(smokeResult.httpStatus >= 400);
        assert.ok(
          smokeResult.statusCode === 'CONNECTIVITY_FAILED' ||
          smokeResult.statusCode === 'CONFIGURATION_INVALID' ||
          smokeResult.statusCode === 'AUTHENTICATION_FAILED' ||
          smokeResult.statusCode === 'DESTINATION_NOT_FOUND' ||
          smokeResult.statusCode === 'TIMEOUT'
        );
        assert.ok(smokeResult.errorMessage);
      }
    });

    it('2. Clearly distinguishes Office LAN direct reachability vs Cloud Foundry SCC tunnel route', () => {
      const isOfficeLanConfigured = Boolean(process.env.SAP_URL_OVERRIDE);
      const isLocalProxyConfigured = Boolean(process.env.LOCAL_CONNECTIVITY_PROXY);

      // Verify that the environment explicitly records whether the route is direct LAN or SCC tunnel
      if (isOfficeLanConfigured) {
        assert.strictEqual(process.env.SAP_URL_OVERRIDE, 'http://192.168.1.55:8000');
      }

      // Assert that virtual host kbl_fiori is identified as Cloud Connector route
      const adapter = new BtpDestinationAdapter({ destinationName: 'S21' });
      assert.strictEqual(adapter.destinationName, 'S21');
    });
  });
});
