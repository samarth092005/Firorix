import { createServer } from '../src/server.js';
import DatabasePool from '../src/infrastructure/db/pool.js';

async function testApi() {
  console.log('[API-TEST] Starting local server test against Neon...');
  
  const server = createServer({ useDatabase: true });
  const TEST_PORT = 4055;

  await new Promise((resolve) => {
    server.listen(TEST_PORT, () => {
      console.log(`[API-TEST] Server listening on http://localhost:${TEST_PORT}`);
      resolve();
    });
  });

  try {
    // 1. Test Liveness Probe
    const liveRes = await fetch(`http://localhost:${TEST_PORT}/api/v1/health/liveness`);
    const liveData = await liveRes.json();
    console.log('[API-TEST] Liveness status:', liveRes.status, liveData);
    if (liveRes.status !== 200 || liveData.status !== 'UP') {
      throw new Error(`Liveness probe failed: ${JSON.stringify(liveData)}`);
    }

    // 2. Test Readiness Probe
    const readyRes = await fetch(`http://localhost:${TEST_PORT}/api/v1/health/readiness`);
    const readyData = await readyRes.json();
    console.log('[API-TEST] Readiness status:', readyRes.status, JSON.stringify(readyData, null, 2));
    if (readyRes.status !== 200 || readyData.status !== 'READY') {
      throw new Error(`Readiness probe failed: ${JSON.stringify(readyData)}`);
    }

    // 3. Test Transaction Discovery
    const discRes = await fetch(`http://localhost:${TEST_PORT}/api/v1/discovery/transaction`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tcode: 'VA01' })
    });
    const discData = await discRes.json();
    console.log('[API-TEST] Transaction discovery status:', discRes.status, {
      tcode: discData.tcode || discData.transactionCode,
      status: discData.status,
      classification: discData.classification
    });
    if (discRes.status !== 200) {
      throw new Error(`Discovery failed: ${JSON.stringify(discData)}`);
    }

    console.log('[API-TEST] ALL HTTP PROBES AND ENDPOINTS OPERATIONAL!');
  } finally {
    server.close();
    await DatabasePool.close();
  }
}

testApi().catch((err) => {
  console.error('[API-TEST] ERROR:', err);
  process.exit(1);
});
