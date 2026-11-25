#!/usr/bin/env node
/**
 * Fiorify Live SAP S21 Connectivity Verification Script
 * Strictly Read-Only (GET / HEAD only)
 * Safe secret handling: Never outputs passwords or authorization headers.
 */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const backendRoot = path.resolve(__dirname, '..');
const envPath = path.join(backendRoot, '.env');

// Read .env securely
function parseEnv() {
  const env = {};
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf8').split('\n');
    for (let line of lines) {
      line = line.trim();
      if (line && !line.startsWith('#')) {
        const idx = line.indexOf('=');
        if (idx > -1) {
          const k = line.slice(0, idx).trim();
          const v = line.slice(idx + 1).trim();
          env[k] = v;
        }
      }
    }
  }
  return env;
}

const env = parseEnv();
const baseUrl = env.SAP_URL_OVERRIDE || 'http://192.168.1.55:8000';
const sapUser = env.SAP_USER || 'int_samarth';
const sapPassword = env.SAP_PASSWORD || '';
const sapClient = env.SAP_CLIENT || '200';

console.log('======================================================================');
console.log('         FIORIFY LIVE SAP S21 READ-ONLY CONNECTIVITY AUDIT            ');
console.log('======================================================================');
console.log(`Target Base URL   : ${baseUrl}`);
console.log(`SAP Client        : ${sapClient}`);
console.log(`SAP User          : ${sapUser} (Secret status: ${sapPassword ? 'PRESENT' : 'MISSING'})`);
console.log('Strict Guardrail  : GET / HEAD only. Zero mutations. Zero ADT activation.');
console.log('======================================================================\n');

async function testEndpoint(testName, urlPath, headers = {}) {
  const parsed = new URL(urlPath, baseUrl);
  const start = Date.now();
  const authHeader = 'Basic ' + Buffer.from(`${sapUser}:${sapPassword}`).toString('base64');

  const reqHeaders = {
    'Accept': 'application/json, application/xml, text/plain, */*',
    'sap-client': sapClient,
    'Authorization': authHeader,
    ...headers
  };

  return new Promise((resolve) => {
    const req = http.request(
      {
        hostname: parsed.hostname,
        port: parsed.port || 80,
        path: parsed.pathname + parsed.search,
        method: 'GET',
        headers: reqHeaders,
        timeout: 10000
      },
      (res) => {
        let body = '';
        res.on('data', (d) => (body += d));
        res.on('end', () => {
          const duration = Date.now() - start;
          const status = res.statusCode;
          const contentType = res.headers['content-type'] || 'unknown';
          const serverHeader = res.headers['server'] || 'unknown';

          console.log(`[TEST] ${testName}`);
          console.log(`  Target Path    : ${parsed.pathname}${parsed.search}`);
          console.log(`  HTTP Status    : ${status} ${res.statusMessage}`);
          console.log(`  Duration       : ${duration}ms`);
          console.log(`  Content-Type   : ${contentType}`);
          console.log(`  Server Header  : ${serverHeader}`);

          let authOutcome = 'UNKNOWN';
          if (status === 401) {
            authOutcome = 'AUTHENTICATION_FAILED (Invalid Credentials or Login Rejected)';
          } else if (status === 403) {
            authOutcome = 'AUTHORIZATION_BLOCKED (Authenticated but lacking ICF node/Basis authorization)';
          } else if (status >= 200 && status < 300) {
            authOutcome = 'AUTHORIZED_AND_SUCCESSFUL';
          } else if (status === 404) {
            authOutcome = 'NOT_FOUND (Service not activated or path missing)';
          }
          console.log(`  Auth/Perm State: ${authOutcome}`);

          if (body.length > 0 && body.length < 500) {
            console.log(`  Response Snippet: ${body.trim().replace(/\s+/g, ' ')}`);
          } else if (body.length >= 500) {
            console.log(`  Response Size  : ${body.length} bytes (starts with: ${body.slice(0, 120).trim()}...)`);
          }
          console.log('');

          resolve({
            name: testName,
            path: parsed.pathname + parsed.search,
            status,
            duration,
            authOutcome,
            contentType,
            bodyLength: body.length,
            bodySnippet: body.slice(0, 300)
          });
        });
      }
    );

    req.on('timeout', () => {
      req.destroy();
      console.log(`[TEST] ${testName} - TIMED OUT after 10000ms\n`);
      resolve({ name: testName, status: 'TIMEOUT', duration: 10000, authOutcome: 'TIMEOUT' });
    });

    req.on('error', (err) => {
      console.log(`[TEST] ${testName} - NETWORK ERROR: ${err.message}\n`);
      resolve({ name: testName, status: 'ERROR', error: err.message, authOutcome: 'NETWORK_FAILURE' });
    });

    req.end();
  });
}

async function runAudit() {
  const results = [];

  // 1. ICF Ping
  results.push(await testEndpoint('1. Public ICF Ping Endpoint', '/sap/public/ping'));

  // 2. Gateway Ping / Health
  results.push(await testEndpoint('2. BC Ping with Client', `/sap/bc/ping?sap-client=${sapClient}`));

  // 3. Gateway Catalog Service Collection
  results.push(
    await testEndpoint(
      '3. Gateway Catalog Service Collection (v2)',
      `/sap/opu/odata/IWFND/CATALOGSERVICE;v=2/ServiceCollection?$top=5&$format=json&sap-client=${sapClient}`
    )
  );

  // 4. Gateway Catalog Service $metadata
  results.push(
    await testEndpoint(
      '4. Gateway Catalog Service $metadata',
      `/sap/opu/odata/IWFND/CATALOGSERVICE;v=2/$metadata?sap-client=${sapClient}`
    )
  );

  // 5. Standard S/4HANA Finance Service Metadata (e.g. FAR_OUTGOING_PAYMENT_SRV for F-53)
  results.push(
    await testEndpoint(
      '5. Outgoing Payment OData $metadata (F-53)',
      `/sap/opu/odata/sap/FAR_OUTGOING_PAYMENT_SRV/$metadata?sap-client=${sapClient}`
    )
  );

  // 6. ADT Discovery Endpoint (Investigating previous ADT 403 report)
  results.push(
    await testEndpoint(
      '6. ABAP Development Tools (ADT) Discovery',
      `/sap/bc/adt/discovery?sap-client=${sapClient}`,
      { 'Accept': 'application/atom+xml, application/xml' }
    )
  );

  // 7. ADT Compatibility / Core
  results.push(
    await testEndpoint(
      '7. ADT Core Compatibility',
      `/sap/bc/adt/core/http/reentranceTicket?sap-client=${sapClient}`
    )
  );

  console.log('======================================================================');
  console.log('                   LIVE S21 AUDIT SUMMARY                             ');
  console.log('======================================================================');
  results.forEach((r, idx) => {
    console.log(`${idx + 1}. ${r.name.padEnd(45)}: Status ${r.status} | ${r.authOutcome} (${r.duration}ms)`);
  });
  console.log('======================================================================\n');
}

runAudit().catch(console.error);
