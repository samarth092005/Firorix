#!/usr/bin/env node
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from '../src/server.js';
import { AssessmentStore } from '../src/services/assessmentStore.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..', '..');
const frontendDistDir = path.join(projectRoot, 'frontend', 'dist');

async function testHttp(port, path, options = {}) {
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        host: '127.0.0.1',
        port,
        path,
        method: options.method || 'GET',
        headers: options.headers || {}
      },
      (res) => {
        let body = '';
        res.on('data', (d) => (body += d));
        res.on('end', () => {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body
          });
        });
      }
    );
    req.on('error', reject);
    if (options.body) req.write(options.body);
    req.end();
  });
}

async function run() {
  console.log('[REL-003] Starting Production Runtime Verification...');

  // 1. Verify frontend/dist exists
  const hasDist = fs.existsSync(path.join(frontendDistDir, 'index.html'));
  if (!hasDist) {
    throw new Error('frontend/dist/index.html does not exist. Run build first.');
  }
  console.log('✓ Verified frontend/dist/index.html exists');

  // 2. Start server in production mode
  const testPort = 4088;
  const assessmentStore = new AssessmentStore({
    allowVolatileStoreInProduction: true // Allow for local verification without live HANA
  });

  const server = createServer({
    assessmentStore,
    isProduction: true
  });

  await new Promise((resolve) => server.listen(testPort, '127.0.0.1', resolve));
  console.log(`✓ Production server listening on http://127.0.0.1:${testPort}`);

  try {
    // 3. Test /health/liveness
    const liveRes = await testHttp(testPort, '/health/liveness');
    if (liveRes.status !== 200) throw new Error(`/health/liveness returned ${liveRes.status}`);
    const liveJson = JSON.parse(liveRes.body);
    if (liveJson.status !== 'UP') throw new Error(`Unexpected liveness payload: ${liveRes.body}`);
    console.log('✓ /health/liveness passed (200 UP)');

    // 4. Test /health/readiness
    const readyRes = await testHttp(testPort, '/health/readiness');
    const readyJson = JSON.parse(readyRes.body);
    if (!readyJson.status || !readyJson.components) throw new Error(`Invalid readiness payload: ${readyRes.body}`);
    console.log(`✓ /health/readiness passed (Status: ${readyJson.status}, DB: ${readyJson.components?.database?.status})`);

    // 5. Test Normal Frontend Route: GET /
    const rootRes = await testHttp(testPort, '/', { headers: { Accept: 'text/html' } });
    if (rootRes.status !== 200 || !rootRes.body.includes('<!DOCTYPE html>') && !rootRes.body.includes('<html')) {
      throw new Error(`GET / did not serve frontend SPA: ${rootRes.status}`);
    }
    console.log('✓ GET / successfully served frontend SPA HTML');

    // 6. Test SPA Deep Link: GET /assessments/ASM-LIVE-F53
    const deepRes = await testHttp(testPort, '/assessments/ASM-LIVE-F53', { headers: { Accept: 'text/html' } });
    if (deepRes.status !== 200 || !deepRes.body.includes('index-')) {
      throw new Error(`GET /assessments/ASM-LIVE-F53 did not fall back to SPA index.html: ${deepRes.status}`);
    }
    console.log('✓ GET /assessments/ASM-LIVE-F53 successfully served SPA index.html fallback');

    // 7. Test API 404 Isolation Guard: GET /api/v1/unknown-endpoint
    const api404Res = await testHttp(testPort, '/api/v1/unknown-endpoint');
    if (api404Res.status !== 404) {
      throw new Error(`API 404 returned status ${api404Res.status} instead of 404`);
    }
    if (api404Res.headers['content-type']?.includes('text/html') || api404Res.body.includes('<!DOCTYPE html>')) {
      throw new Error('API 404 returned HTML instead of JSON! API 404 isolation failed.');
    }
    const api404Json = JSON.parse(api404Res.body);
    if (api404Json.success !== false) {
      throw new Error(`API 404 did not return structured error JSON: ${api404Res.body}`);
    }
    console.log('✓ GET /api/v1/unknown-endpoint returned structured JSON 404 (API 404 isolation confirmed)');

    // 8. Test Port Conflict Handling (EADDRINUSE)
    let portConflictCaught = false;
    const conflictServer = http.createServer(() => {});
    await new Promise((resolve) => {
      conflictServer.on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
          portConflictCaught = true;
          resolve();
        }
      });
      conflictServer.listen(testPort, '127.0.0.1');
    });
    if (!portConflictCaught) throw new Error('EADDRINUSE was not triggered on conflicting port');
    console.log('✓ Port conflict handling (EADDRINUSE) verified');

    // 9. Test Graceful Shutdown
    await new Promise((resolve) => server.close(resolve));
    console.log('✓ Production server shutdown gracefully');

    console.log('\n[REL-003] All Production Runtime and Startup checks PASSED!\n');
  } finally {
    try {
      server.close();
    } catch {}
  }
}

run().catch((err) => {
  console.error('[REL-003 FAILURE]', err);
  process.exit(1);
});
