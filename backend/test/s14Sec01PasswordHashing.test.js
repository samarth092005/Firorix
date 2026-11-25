import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {
  AuthService,
  hashPassword,
  hashPasswordSync,
  verifyPassword,
  detectHashFormat,
  SCRYPT_CONFIG,
  USER_ROLES,
  DEFAULT_USERS
} from '../src/services/authService.js';

test('Sprint 14.1.1 SEC-01 — Asynchronous Adaptive Scrypt & Concurrent Legacy Migration Suite', async (t) => {
  const auth = new AuthService({ jwtSecret: 'test-jwt-secret-key-32-characters-minimum!' });

  await t.test('1. Hash format validation: produces scrypt:v1:N=16384,r=8,p=1:<salt>:<key>', async () => {
    const raw = 'ComplexP@ssw0rd!2026';
    const hash = await hashPassword(raw);

    assert.ok(hash.startsWith('scrypt:v1:'), 'Hash must start with scrypt:v1: prefix');
    const parts = hash.split(':');
    assert.strictEqual(parts.length, 5, 'Hash must contain 5 colon-separated parts');
    assert.strictEqual(parts[0], 'scrypt');
    assert.strictEqual(parts[1], 'v1');
    assert.strictEqual(parts[2], 'N=16384,r=8,p=1');
    assert.strictEqual(parts[3].length, 32, '16-byte random salt must be 32 hex chars');
    assert.strictEqual(parts[4].length, 64, '32-byte key must be 64 hex chars');

    const format = detectHashFormat(hash);
    assert.strictEqual(format.type, 'SCRYPT_V1');
    assert.strictEqual(format.isModern, true);
    assert.strictEqual(format.isLegacy, false);
  });

  await t.test('2. Unique salt per account: identical passwords produce distinct hashes', async () => {
    const pass = 'IdenticalPassword#123';
    const hash1 = await hashPassword(pass);
    const hash2 = await hashPassword(pass);

    assert.notStrictEqual(hash1, hash2, 'Hashes must differ due to unique cryptographically random salts');
    const salt1 = hash1.split(':')[3];
    const salt2 = hash2.split(':')[3];
    assert.notStrictEqual(salt1, salt2, 'Salts must be cryptographically distinct');

    const v1 = await verifyPassword(pass, hash1);
    const v2 = await verifyPassword(pass, hash2);
    assert.strictEqual(v1.valid, true);
    assert.strictEqual(v2.valid, true);
  });

  await t.test('3. Non-blocking event loop verification: timers execute while scrypt operations are in flight', async () => {
    let timerFired = false;
    const timer = setTimeout(() => {
      timerFired = true;
    }, 10);

    // Launch multiple concurrent async password hashes
    const hashes = await Promise.all([
      hashPassword('EventLoopTest1'),
      hashPassword('EventLoopTest2'),
      hashPassword('EventLoopTest3')
    ]);

    clearTimeout(timer);
    assert.strictEqual(timerFired, true, 'Event loop must not be blocked: timer should fire while scrypt runs in worker pool');
    assert.strictEqual(hashes.length, 3);
  });

  await t.test('4. New account registration and login authentication', async () => {
    const regResult = await auth.registerUser({
      id: 'USR-SEC-01',
      email: 'sec-engineer@fiorify.corp',
      name: 'Security Engineer',
      role: USER_ROLES.LEAD_ARCHITECT,
      tenantId: 'TENANT-SEC'
    }, 'StrongSecret#2026');

    assert.strictEqual(regResult.email, 'sec-engineer@fiorify.corp');
    assert.strictEqual(regResult.passwordHash, undefined, 'Sanitized user must omit passwordHash');

    // Correct password login succeeds
    const loginOk = await auth.login('sec-engineer@fiorify.corp', 'StrongSecret#2026');
    assert.strictEqual(loginOk.success, true);
    assert.ok(loginOk.token);
    assert.strictEqual(loginOk.user.email, 'sec-engineer@fiorify.corp');
  });

  await t.test('5. Incorrect password rejection', async () => {
    const loginFail = await auth.login('sec-engineer@fiorify.corp', 'WrongSecret#2026');
    assert.strictEqual(loginFail.success, false);
    assert.strictEqual(loginFail.error, 'INVALID_CREDENTIALS');
  });

  await t.test('6. Empty, whitespace, or invalid password rejection', async () => {
    await assert.rejects(async () => hashPassword(''), /Password must be a non-empty string/);
    await assert.rejects(async () => hashPassword(null), /Password must be a non-empty string/);

    const emptyLogin = await auth.login('sec-engineer@fiorify.corp', '');
    assert.strictEqual(emptyLogin.success, false);
    assert.strictEqual(emptyLogin.error, 'INVALID_CREDENTIALS');

    const nullLogin = await auth.login('sec-engineer@fiorify.corp', null);
    assert.strictEqual(nullLogin.success, false);
    assert.strictEqual(nullLogin.error, 'INVALID_CREDENTIALS');
  });

  await t.test('7. Unicode password preservation: non-ASCII and symbol passwords verify without trimming', async () => {
    const unicodePass = '  München🔑Walldorf-über-alles-2026!©®  '; // leading/trailing spaces intentional
    const hash = await hashPassword(unicodePass);

    const verification = await verifyPassword(unicodePass, hash);
    assert.strictEqual(verification.valid, true);
    assert.strictEqual(verification.algorithm, 'scrypt:v1');

    await auth.registerUser({
      id: 'USR-UNICODE-01',
      email: 'unicode-user@fiorify.corp',
      role: USER_ROLES.VIEWER
    }, unicodePass);

    const loginRes = await auth.login('unicode-user@fiorify.corp', unicodePass);
    assert.strictEqual(loginRes.success, true);

    // Verify that a trimmed version does NOT falsely match (proving strict preservation)
    const trimmedFail = await auth.login('unicode-user@fiorify.corp', unicodePass.trim());
    assert.strictEqual(trimmedFail.success, false);
  });

  await t.test('8. Malformed hash format resilience: handles corrupted hashes without uncaught crashes', async () => {
    // Missing parts
    const v1 = await verifyPassword('Secret123', 'scrypt:v1:corrupt');
    assert.strictEqual(v1.valid, false);
    assert.strictEqual(v1.reason, 'MALFORMED_SCRYPT_HASH');

    // Invalid parameters
    const v2 = await verifyPassword('Secret123', 'scrypt:v1:N=NaN,r=8,p=1:abcd:1234');
    assert.strictEqual(v2.valid, false);
    assert.strictEqual(v2.reason, 'INVALID_SCRYPT_PARAMETERS');

    // Unknown algorithm string
    const v3 = await verifyPassword('Secret123', 'bcrypt$2a$12$abcdefg');
    assert.strictEqual(v3.valid, false);
    assert.strictEqual(v3.reason, 'UNSUPPORTED_HASH_FORMAT');

    // Null/undefined stored hash
    const v4 = await verifyPassword('Secret123', null);
    assert.strictEqual(v4.valid, false);
    assert.strictEqual(v4.reason, 'INVALID_HASH');
  });

  await t.test('9. Legacy migration triggered strictly by storedHash format, independent of password pattern', async () => {
    // Password with weird pattern (looks like a hex string, but candidate password must not confuse detector)
    const hexLikePassword = 'a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e8f90';
    const legacyDigest = crypto.createHash('sha256').update(hexLikePassword).digest('hex');

    // Stored hash format is detected as SHA256_LEGACY
    assert.strictEqual(detectHashFormat(legacyDigest).type, 'SHA256_LEGACY');

    auth.users.set('hex-like@fiorify.corp', {
      id: 'USR-HEX-PATTERN',
      email: 'hex-like@fiorify.corp',
      role: USER_ROLES.VIEWER,
      tenantId: 'DEFAULT-TENANT-S21',
      passwordHash: legacyDigest
    });

    const loginRes = await auth.login('hex-like@fiorify.corp', hexLikePassword);
    assert.strictEqual(loginRes.success, true);
    assert.ok(auth.users.get('hex-like@fiorify.corp').passwordHash.startsWith('scrypt:v1:'));
  });

  await t.test('10. Concurrent logins prevent migration races: simultaneous requests on legacy account', async () => {
    const legacyPass = 'SharedConcurrentPassword!2026';
    const legacySha256 = crypto.createHash('sha256').update(legacyPass).digest('hex');

    auth.users.set('concurrent-legacy@fiorify.corp', {
      id: 'USR-CONCURRENT-LEGACY',
      email: 'concurrent-legacy@fiorify.corp',
      name: 'Concurrent Legacy User',
      role: USER_ROLES.VIEWER,
      tenantId: 'DEFAULT-TENANT-S21',
      passwordHash: legacySha256
    });

    // Fire 8 concurrent login requests for the EXACT same user simultaneously
    const results = await Promise.all([
      auth.login('concurrent-legacy@fiorify.corp', legacyPass),
      auth.login('concurrent-legacy@fiorify.corp', legacyPass),
      auth.login('concurrent-legacy@fiorify.corp', legacyPass),
      auth.login('concurrent-legacy@fiorify.corp', legacyPass),
      auth.login('concurrent-legacy@fiorify.corp', legacyPass),
      auth.login('concurrent-legacy@fiorify.corp', legacyPass),
      auth.login('concurrent-legacy@fiorify.corp', legacyPass),
      auth.login('concurrent-legacy@fiorify.corp', legacyPass)
    ]);

    // All 8 requests must succeed without race conditions or locks
    for (const res of results) {
      assert.strictEqual(res.success, true);
      assert.ok(res.token);
    }

    // Verify that the stored hash was upgraded to modern scrypt and activeMigrations is cleanly empty
    const upgradedUser = auth.users.get('concurrent-legacy@fiorify.corp');
    assert.ok(upgradedUser.passwordHash.startsWith('scrypt:v1:'));
    assert.strictEqual(auth.activeMigrations.size, 0, 'activeMigrations map must be cleanly purged after completion');
  });

  await t.test('11. Legacy SHA-256 incorrect password rejection: does not rehash or authenticate', async () => {
    const legacyPass = 'ActualPassword#999';
    const legacySha256 = crypto.createHash('sha256').update(legacyPass).digest('hex');

    auth.users.set('legacy-fail@fiorify.corp', {
      id: 'USR-LEGACY-FAIL',
      email: 'legacy-fail@fiorify.corp',
      role: USER_ROLES.VIEWER,
      passwordHash: legacySha256
    });

    const badLogin = await auth.login('legacy-fail@fiorify.corp', 'WrongPassword#000');
    assert.strictEqual(badLogin.success, false);
    assert.strictEqual(badLogin.error, 'INVALID_CREDENTIALS');

    // Hash remains original legacy SHA-256, untampered
    assert.strictEqual(auth.users.get('legacy-fail@fiorify.corp').passwordHash, legacySha256);
  });

  await t.test('12. Existing default users are pre-seeded with modern scrypt hashes', async () => {
    for (const u of DEFAULT_USERS) {
      assert.ok(u.passwordHash.startsWith('scrypt:v1:'), `User ${u.id} must have modern scrypt:v1 hash`);
    }

    // Default admin logs in cleanly with environment-configured or test fixture password
    const adminPass = process.env.FIORIFY_DEV_ADMIN_PASSWORD || 'fiorify-dev-admin-fixture';
    const adminLogin = await auth.login('admin@fiorify.corp', adminPass);
    assert.strictEqual(adminLogin.success, true);
  });

  await t.test('13. Password reset workflow updates hash asynchronously to modern scrypt', async () => {
    await auth.resetPassword('sec-engineer@fiorify.corp', 'BrandNewResetPassword!2026');
    const oldLogin = await auth.login('sec-engineer@fiorify.corp', 'StrongSecret#2026');
    assert.strictEqual(oldLogin.success, false);

    const newLogin = await auth.login('sec-engineer@fiorify.corp', 'BrandNewResetPassword!2026');
    assert.strictEqual(newLogin.success, true);
  });

  await t.test('14. OWASP Scrypt parameter review & Cloud Foundry load benchmark', async () => {
    const startMemory = process.memoryUsage().heapUsed;
    const startTime = performance.now();

    const adminPass = process.env.FIORIFY_DEV_ADMIN_PASSWORD || 'fiorify-dev-admin-fixture';
    const consultantPass = process.env.FIORIFY_DEV_CONSULTANT_PASSWORD || 'fiorify-dev-consultant-fixture';
    const approverPass = process.env.FIORIFY_DEV_APPROVER_PASSWORD || 'fiorify-dev-approver-fixture';
    const architectPass = process.env.FIORIFY_DEV_ARCHITECT_PASSWORD || 'fiorify-dev-architect-fixture';
    const requesterPass = process.env.FIORIFY_DEV_REQUESTER_PASSWORD || 'fiorify-dev-requester-fixture';
    const viewerPass = process.env.FIORIFY_DEV_VIEWER_PASSWORD || 'fiorify-dev-viewer-fixture';

    // Benchmark 10 parallel logins simulating concurrent user burst
    const burst = await Promise.all([
      auth.login('admin@fiorify.corp', adminPass),
      auth.login('consultant@fiorify.corp', consultantPass),
      auth.login('approver@fiorify.corp', approverPass),
      auth.login('architect@fiorify.corp', architectPass),
      auth.login('requester@fiorify.corp', requesterPass),
      auth.login('viewer@fiorify.corp', viewerPass),
      auth.login('admin@fiorify.corp', adminPass),
      auth.login('consultant@fiorify.corp', consultantPass),
      auth.login('approver@fiorify.corp', approverPass),
      auth.login('architect@fiorify.corp', architectPass)
    ]);

    const elapsed = performance.now() - startTime;
    const endMemory = process.memoryUsage().heapUsed;
    const heapDeltaMb = ((endMemory - startMemory) / 1024 / 1024).toFixed(2);

    for (const b of burst) {
      assert.strictEqual(b.success, true);
    }

    // Benchmark report assertions
    assert.ok(elapsed < 2000, `10 concurrent logins should complete under 2000ms (took ${elapsed.toFixed(1)}ms)`);
    console.log(`[SEC-01 Benchmark] 10 concurrent logins completed in ${elapsed.toFixed(1)}ms (avg ${(elapsed / 10).toFixed(1)}ms/login), Heap Delta: ${heapDeltaMb}MB`);
  });
});
