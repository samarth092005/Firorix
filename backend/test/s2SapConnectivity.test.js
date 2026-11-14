import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { SapHttpClient } from '../src/infrastructure/connectivity/sapHttpClient.js';
import { SapConnectivityProvider } from '../src/infrastructure/connectivity/sapConnectivityProvider.js';
import { SapConnectionHealthService, CAPABILITY_KEYS } from '../src/infrastructure/connectivity/sapConnectionHealthService.js';
import { SystemRegistry, CONNECTIVITY_STATUSES } from '../src/adapters/systemRegistry.js';
import { SapSystemRepository } from '../src/infrastructure/db/repositories/sapSystemRepository.js';
import DatabasePool from '../src/infrastructure/db/pool.js';
import { createServer } from '../src/server.js';
import { authService, USER_ROLES } from '../src/services/authService.js';

test('Fiorify S2 — SAP Landscape & Connectivity Foundation Test Suite', async (t) => {
  process.env.Fiorify_ALLOW_EMBEDDED_PG = 'true';
  const pool = await DatabasePool.getPool();
  assert.ok(pool, 'PostgreSQL pool must be available');

  const testTenant = 'TENANT-S2-TEST';
  const testSystemId = `S21-T-${Date.now().toString().slice(-6)}`;
  const sapRepo = new SapSystemRepository();

  await pool.query("INSERT INTO tenants (tenant_id, name) VALUES ($1, 'S2 Test Tenant') ON CONFLICT DO NOTHING;", [testTenant]);

  t.after(async () => {
    try {
      await pool.query('DELETE FROM sap_system_diagnostic_history WHERE tenant_id = $1;', [testTenant]);
      await pool.query('DELETE FROM sap_system_profiles WHERE tenant_id = $1;', [testTenant]);
      await pool.query('DELETE FROM tenants WHERE tenant_id = $1;', [testTenant]);
    } catch {}
    await DatabasePool.close();
  });

  // 1. Security: Read-Only Enforcement
  await t.test('1. Security: Strictly enforces read-only operations and blocks mutating HTTP methods', () => {
    const client = new SapHttpClient();
    assert.doesNotThrow(() => client.assertReadOnly('GET'));
    assert.doesNotThrow(() => client.assertReadOnly('HEAD'));
    assert.doesNotThrow(() => client.assertReadOnly('OPTIONS'));

    assert.throws(
      () => client.assertReadOnly('POST'),
      /SAP WRITE OPERATION BLOCKED: Method "POST"/
    );
    assert.throws(
      () => client.assertReadOnly('PUT'),
      /SAP WRITE OPERATION BLOCKED: Method "PUT"/
    );
    assert.throws(
      () => client.assertReadOnly('DELETE'),
      /SAP WRITE OPERATION BLOCKED: Method "DELETE"/
    );
    assert.throws(
      () => client.assertReadOnly('PATCH'),
      /SAP WRITE OPERATION BLOCKED: Method "PATCH"/
    );
  });

  // 2. Security: Endpoint Allowlisting
  await t.test('2. Security: Strictly enforces endpoint allowlisting and blocks arbitrary URLs', () => {
    const client = new SapHttpClient();
    assert.doesNotThrow(() => client.assertAllowedEndpoint('/sap/opu/odata/IWFND/CATALOGSERVICE;v=2/ServiceCollection'));
    assert.doesNotThrow(() => client.assertAllowedEndpoint('/sap/opu/odata4/sap/z_order/srvd/sap/z_order/0001/$metadata'));
    assert.doesNotThrow(() => client.assertAllowedEndpoint('/sap/bc/adt/discovery'));
    assert.doesNotThrow(() => client.assertAllowedEndpoint('/sap/bc/echo'));
    assert.doesNotThrow(() => client.assertAllowedEndpoint('https://s21.corp.internal:8000/sap/opu/odata/sap/Z_DEMO_SRV/$metadata'));

    assert.throws(
      () => client.assertAllowedEndpoint('/admin/exec-cmd'),
      /UNAUTHORIZED SAP ENDPOINT ACCESS BLOCKED/
    );
    assert.throws(
      () => client.assertAllowedEndpoint('https://malicious.com/api/steal-tokens'),
      /UNAUTHORIZED SAP ENDPOINT ACCESS BLOCKED/
    );
    assert.throws(
      () => client.assertAllowedEndpoint('/sap/bc/gui/sap/its/webgui'),
      /UNAUTHORIZED SAP ENDPOINT ACCESS BLOCKED/
    );
  });

  // 3. Security: Header & Error Message Secret Redaction
  await t.test('3. Security: Redacts credentials, tokens, and secrets from headers and error messages', async () => {
    let capturedHeaders = {};
    const mockFetch = async (url, options) => {
      capturedHeaders = options.headers;
      return {
        ok: false,
        status: 401,
        headers: new Map([
          ['content-type', 'application/json'],
          ['set-cookie', 'sap-usercontext=sap-client=200; path=/']
        ]),
        json: async () => ({
          error: { message: { value: 'Authentication failed for password=SuperSecretPassword123' } }
        })
      };
    };

    const client = new SapHttpClient({ directFetch: mockFetch });
    const res = await client.execute('http://127.0.0.1:8000/sap/bc/echo', {
      headers: {
        Authorization: 'Basic c2FwX3VzZXI6U3VwZXJTZWNyZXRQYXNzd29yZDEyMw==',
        'X-Fiorify-Admin-Secret': 'admin-secret-token'
      }
    });

    assert.equal(res.success, false);
    assert.equal(res.status, 401);
    assert.equal(res.statusCode, 'AUTHENTICATION_FAILED');
    assert.ok(res.errorMessage.includes('[REDACTED]'), 'Error message must redact secret parameter');
    assert.ok(!res.errorMessage.includes('SuperSecretPassword123'), 'Plaintext password must not appear');
  });

  // 4. Distinction: Authentication (401) vs Authorization (403)
  await t.test('4. Taxonomy: Accurately distinguishes 401 Authentication Failure vs 403 Authorization Failure', async () => {
    const fetch401 = async () => ({
      ok: false,
      status: 401,
      headers: new Map([['content-type', 'application/json']]),
      json: async () => ({ message: 'Logon failed. Bad credentials.' })
    });

    const fetch403 = async () => ({
      ok: false,
      status: 403,
      headers: new Map([['content-type', 'application/json']]),
      json: async () => ({ message: 'User lacks authorization for ADT endpoint.' })
    });

    const client401 = new SapHttpClient({ directFetch: fetch401 });
    const res401 = await client401.execute('/sap/bc/adt/discovery');
    assert.equal(res401.status, 401);
    assert.equal(res401.statusCode, 'AUTHENTICATION_FAILED');

    const client403 = new SapHttpClient({ directFetch: fetch403 });
    const res403 = await client403.execute('/sap/bc/adt/discovery');
    assert.equal(res403.status, 403);
    assert.equal(res403.statusCode, 'AUTHORIZATION_BLOCKED');
  });

  // 5. Gateway Metadata Diagnostics (EDMX Parsing & OData Version Identification)
  await t.test('5. Gateway Diagnostics: Parses $metadata and identifies OData V2 and V4 schemas', async () => {
    const sampleV2Xml = `
      <?xml version="1.0" encoding="utf-8"?>
      <edmx:Edmx Version="1.0" xmlns:edmx="http://schemas.microsoft.com/ado/2007/06/edmx">
        <edmx:DataServices m:DataServiceVersion="2.0">
          <Schema Namespace="Z_DISCOVERY_SRV">
            <EntityType Name="TransactionMaster">
              <Key><PropertyRef Name="Tcode"/></Key>
              <Property Name="Tcode" Type="Edm.String" MaxLength="20"/>
              <Property Name="Description" Type="Edm.String" MaxLength="100"/>
            </EntityType>
            <EntityContainer Name="Z_DISCOVERY_SRV_Entities">
              <EntitySet Name="TransactionMasterSet" EntityType="Z_DISCOVERY_SRV.TransactionMaster"/>
              <EntitySet Name="SystemProfileSet" EntityType="Z_DISCOVERY_SRV.SystemProfile"/>
            </EntityContainer>
          </Schema>
        </edmx:DataServices>
      </edmx:Edmx>
    `;

    const mockFetch = async () => ({
      ok: true,
      status: 200,
      headers: new Map([['content-type', 'application/xml']]),
      text: async () => sampleV2Xml
    });

    const provider = new SapConnectivityProvider({
      httpClient: new SapHttpClient({ directFetch: mockFetch })
    });
    const healthService = new SapConnectionHealthService({ provider });

    const metadataResult = await healthService.inspectGatewayMetadata('/sap/opu/odata/sap/Z_DISCOVERY_SRV/$metadata');
    assert.equal(metadataResult.success, true);
    assert.equal(metadataResult.odataVersion, 'ODATA_V2');
    assert.equal(metadataResult.entitySetsCount, 2);
    assert.equal(metadataResult.entitySets[0].name, 'TransactionMasterSet');
  });

  // 6. ADT Diagnostics & Required Authorization Reporting
  await t.test('6. ADT Diagnostics: Detects 403 on ADT discovery and reports required S_ADT_RES authorization', async () => {
    const mockFetch = async (url) => {
      if (url.includes('/sap/bc/echo')) {
        return { ok: true, status: 200, headers: new Map(), text: async () => 'OK' };
      }
      if (url.includes('/sap/opu/odata/')) {
        return { ok: true, status: 200, headers: new Map([['content-type', 'application/json']]), json: async () => ({ d: { results: [] } }) };
      }
      if (url.includes('/sap/bc/adt/discovery')) {
        return {
          ok: false,
          status: 403,
          headers: new Map([['content-type', 'application/json']]),
          json: async () => ({ message: 'User lacks S_ADT_RES authorization' })
        };
      }
      return { ok: true, status: 200, headers: new Map(), text: async () => 'OK' };
    };

    const provider = new SapConnectivityProvider({
      httpClient: new SapHttpClient({ directFetch: mockFetch })
    });
    const healthService = new SapConnectionHealthService({ provider });

    const report = await healthService.runHealthCheck({ connectionMode: 'DIRECT_HTTP', baseUrl: 'http://127.0.0.1:8000' });
    assert.equal(report.status, 'PARTIAL_CONNECTIVITY');
    assert.equal(report.capabilities.ADT_DISCOVERY.status, 'AUTHORIZATION_FAILED');
    assert.equal(report.capabilities.ADT_DISCOVERY.httpStatus, 403);
    assert.ok(report.capabilities.ADT_DISCOVERY.requiredAuthorizations.some(a => a.includes('S_ADT_RES')));
  });

  // 7. PostgreSQL System Registry & Diagnostic History Persistence
  await t.test('7. Persistence: Upserts system profile, saves diagnostics, and persists history in PostgreSQL', async () => {
    const registry = new SystemRegistry({
      repository: sapRepo,
      useDatabase: true,
      tenantId: testTenant
    });

    const registered = await registry.registerSystem({
      systemId: testSystemId,
      displayName: 'S21 Local Direct Connection Test',
      connectionMode: 'DIRECT_HTTP',
      baseUrl: 'http://127.0.0.1:8000',
      client: '200',
      release: 'SAP S/4HANA 2023 Private Edition',
      authType: 'BASIC',
      authSecretRef: 'SEC_S21_LOCAL',
      password: 'PlaintextShouldBeIgnored' // Should be discarded by upsert
    }, testTenant);

    assert.equal(registered.systemId, testSystemId);
    assert.equal(registered.isReadOnly, true, 'isReadOnly must strictly be true');

    // Verify stored in PostgreSQL
    const fromDb = await sapRepo.getById(testSystemId, testTenant);
    assert.ok(fromDb, 'System profile must exist in database');
    assert.equal(fromDb.connectionMode, 'DIRECT_HTTP');
    assert.equal(fromDb.isReadOnly, true);

    // Run diagnostics
    const diag = await registry.runDiagnostics(testSystemId, { id: 'USR-TEST-ARCH', tenantId: testTenant });
    assert.ok(diag.timestamp);
    assert.ok(diag.connectionMode);

    // Verify diagnostic history in PostgreSQL
    const history = await registry.getDiagnosticHistory(testSystemId, testTenant, 5);
    assert.ok(Array.isArray(history));
    assert.ok(history.length >= 1, 'Diagnostic history must contain at least 1 record');
    assert.equal(history[0].system_profile_id, testSystemId);
    assert.equal(history[0].executed_by, 'USR-TEST-ARCH');
  });

  // 8. Live HTTP API Endpoints Integration
  await t.test('8. REST API: Validates /api/v1/systems, diagnostics, metadata, and history endpoints', async () => {
    const registry = new SystemRegistry({
      repository: sapRepo,
      useDatabase: true,
      tenantId: testTenant
    });

    const server = createServer({
      systemRegistry: registry,
      tenantId: testTenant
    });

    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    const port = server.address().port;

    const consultantUser = {
      id: 'USR-CONSULT-01',
      role: USER_ROLES.SAP_CONSULTANT,
      tenantId: testTenant,
      name: 'Senior SAP Consultant'
    };
    const consultantToken = authService.generateToken(consultantUser);

    const makeReq = (path, method = 'GET', body = null) => {
      return new Promise((resolve, reject) => {
        const req = http.request({
          hostname: '127.0.0.1',
          port,
          path,
          method,
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${consultantToken}`
          }
        }, (res) => {
          let data = '';
          res.on('data', c => { data += c; });
          res.on('end', () => {
            try {
              resolve({ status: res.statusCode, body: JSON.parse(data) });
            } catch {
              resolve({ status: res.statusCode, raw: data });
            }
          });
        });
        req.on('error', reject);
        if (body) req.write(JSON.stringify(body));
        req.end();
      });
    };

    // A. GET /api/v1/systems
    const getRes = await makeReq('/api/v1/systems');
    assert.equal(getRes.status, 200);
    assert.ok(Array.isArray(getRes.body));

    // B. POST /api/v1/systems (Register new configuration)
    const newSysId = `S21-A-${Date.now().toString().slice(-6)}`;
    const createRes = await makeReq('/api/v1/systems', 'POST', {
      systemId: newSysId,
      displayName: 'API Registered S21 System',
      connectionMode: 'DIRECT_HTTP',
      baseUrl: 'http://127.0.0.1:8000',
      client: '200'
    });
    assert.equal(createRes.status, 201);
    assert.equal(createRes.body.system.systemId, newSysId);
    assert.equal(createRes.body.system.isReadOnly, true);

    // C. POST /api/v1/systems/:id/diagnostics
    const diagRes = await makeReq(`/api/v1/systems/${newSysId}/diagnostics`, 'POST');
    assert.equal(diagRes.status, 200);
    assert.ok(diagRes.body.checks);

    // D. GET /api/v1/systems/:id/diagnostics/history
    const histRes = await makeReq(`/api/v1/systems/${newSysId}/diagnostics/history`);
    assert.equal(histRes.status, 200);
    assert.ok(Array.isArray(histRes.body.history));
    assert.ok(histRes.body.history.length >= 1);

    // E. GET /api/v1/systems/:id/adt/reachability
    const adtRes = await makeReq(`/api/v1/systems/${newSysId}/adt/reachability`);
    assert.equal(adtRes.status, 200);
    assert.ok(adtRes.body.endpoint.includes('/sap/bc/adt'));

    // Clean up created API system
    await pool.query('DELETE FROM sap_system_diagnostic_history WHERE system_profile_id = $1;', [newSysId]);
    await pool.query('DELETE FROM sap_system_profiles WHERE id = $1;', [newSysId]);

    await new Promise((resolve) => server.close(resolve));
  });
});
