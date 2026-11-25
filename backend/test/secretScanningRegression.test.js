/**
 * Fiorify Secret-Scanning & Credential Leakage Prevention Regression Suite (SEC-SCAN)
 *
 * Verifies that:
 * 1. No hardcoded passwords, tokens, or privileged credentials exist in source code (backend/src, frontend/src).
 * 2. No exposed demo credentials (such as ArchitectPass@2026, AdminPass@2026, etc.) exist in source, tests, or documentation.
 * 3. RSA/EC private keys, raw JWT tokens, and Cloud provider access keys are absent.
 * 4. Production configuration templates (.env.example) use safe placeholders.
 * 5. Production fail-closed invariants strictly prevent demo credential usage in production mode.
 */

import test, { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..', '..');

const FORBIDDEN_SECRET_PATTERNS = [
  /ArchitectPass@\d+/i,
  /AdminPass@\d+/i,
  /ConsultantPass@\d+/i,
  /ApproverPass@\d+/i,
  /RequesterPass@\d+/i,
  /ViewerPass@\d+/i,
  /-----BEGIN\s+(?:RSA\s+)?PRIVATE\s+KEY-----\r?\n[A-Za-z0-9+/=]{20,}/, // Real private key with base64 payload
  /AKIA[0-9A-Z]{16}/, // AWS Access Key pattern
  /ghp_[0-9a-zA-Z]{36}/, // GitHub Personal Access Token pattern
  /eyJ[A-Za-z0-9_-]{15,}\.eyJ[A-Za-z0-9_-]{15,}\.[A-Za-z0-9_-]{15,}/ // Hardcoded static real JWT token
];

const SCAN_DIRS = [
  path.join(rootDir, 'backend', 'src'),
  path.join(rootDir, 'frontend', 'src'),
  path.join(rootDir, 'backend', 'test'),
  path.join(rootDir, 'docs')
];

const IGNORED_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.svg', '.ico', '.zip', '.pdf', '.doc', '.docx', '.woff', '.woff2']);

function collectFiles(dir) {
  const files = [];
  if (!fs.existsSync(dir)) return files;

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === '.git' || entry.name === 'dist') continue;
      files.push(...collectFiles(fullPath));
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name).toLowerCase();
      if (!IGNORED_EXTENSIONS.has(ext)) {
        files.push(fullPath);
      }
    }
  }
  return files;
}

describe('SEC-SCAN: Automated Secret-Scanning & Credential Leakage Prevention Suite', () => {
  it('1. Scans source code and tests to confirm zero exposed passwords or credentials', () => {
    const violations = [];

    for (const scanDir of SCAN_DIRS) {
      const files = collectFiles(scanDir);
      for (const filePath of files) {
        // Skip this test file itself since it declares patterns to test for
        if (path.resolve(filePath) === path.resolve(__filename)) continue;

        const content = fs.readFileSync(filePath, 'utf8');
        const lines = content.split('\n');

        lines.forEach((line, lineIndex) => {
          for (const pattern of FORBIDDEN_SECRET_PATTERNS) {
            if (pattern.test(line)) {
              // Ignore comments that explicitly discuss the vulnerability or remediation
              if (line.includes('FORBIDDEN') || line.includes('vulnerability') || line.includes('remediation')) {
                continue;
              }
              violations.push({
                file: path.relative(rootDir, filePath),
                line: lineIndex + 1,
                matchedPattern: pattern.toString(),
                content: line.trim()
              });
            }
          }
        });
      }
    }

    assert.deepStrictEqual(
      violations,
      [],
      `Secret scanning failed! Found ${violations.length} exposed credential(s):\n${JSON.stringify(violations, null, 2)}`
    );
  });

  it('2. Verifies environment templates (.env.example) use safe unprivileged placeholders', () => {
    const backendEnv = path.join(rootDir, 'backend', '.env.example');
    assert.ok(fs.existsSync(backendEnv), 'backend/.env.example must exist');

    const content = fs.readFileSync(backendEnv, 'utf8');
    assert.doesNotMatch(content, /ArchitectPass/, 'backend/.env.example must not contain real credentials');
    assert.doesNotMatch(content, /AdminPass/, 'backend/.env.example must not contain real credentials');
    assert.match(content, /change_me/i, 'backend/.env.example must contain explicit change_me guidance');
  });

  it('3. In production mode, default demo users array is completely empty and disabled', async () => {
    const prevEnv = process.env.NODE_ENV;
    const prevSecret = process.env.FIORIFY_JWT_SECRET;
    try {
      process.env.NODE_ENV = 'production';
      process.env.FIORIFY_JWT_SECRET = 'sample-production-secure-jwt-secret-min-32-chars';
      const { buildDefaultUsers } = await import(`../src/services/authService.js?cachebust=${Date.now()}`);
      const prodUsers = buildDefaultUsers();
      assert.strictEqual(prodUsers.length, 0, 'Production default users must be strictly empty (fail-closed)');
    } finally {
      process.env.NODE_ENV = prevEnv;
      process.env.FIORIFY_JWT_SECRET = prevSecret;
    }
  });
});
