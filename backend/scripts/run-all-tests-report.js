#!/usr/bin/env node
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const backendRoot = path.resolve(__dirname, '..');
const testDir = path.join(backendRoot, 'test');

function getTestFiles(dir) {
  let files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...getTestFiles(fullPath));
    } else if (entry.isFile() && fullPath.endsWith('.test.js')) {
      files.push(fullPath);
    }
  }
  return files;
}

const testFiles = getTestFiles(testDir).sort();
console.log(`[TestRunner] Found ${testFiles.length} test files in ${testDir}`);

let totalPassed = 0;
let totalFailed = 0;
let totalSkipped = 0;
let totalTests = 0;
const results = [];

async function runFile(file, idx) {
  const relPath = path.relative(backendRoot, file);
  const start = Date.now();
  return new Promise((resolve) => {
    const proc = spawn(process.execPath, ['--test', file], {
      cwd: backendRoot,
      env: { ...process.env, NODE_ENV: 'test', FIORIFY_TEST_ISOLATION: 'true' }
    });

    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (d) => { stdout += d; });
    proc.stderr.on('data', (d) => { stderr += d; });

    proc.on('close', (code) => {
      const durationMs = Date.now() - start;
      // Parse Node test output: '# pass 10', '# fail 0', '# cancelled 0', '# skipped 0', '# todo 0', '# tests 10'
      const passMatch = stdout.match(/# pass\s+(\d+)/);
      const failMatch = stdout.match(/# fail\s+(\d+)/);
      const skipMatch = stdout.match(/# skipped\s+(\d+)/);
      const testsMatch = stdout.match(/# tests\s+(\d+)/);

      const pass = passMatch ? parseInt(passMatch[1], 10) : 0;
      const fail = failMatch ? parseInt(failMatch[1], 10) : (code !== 0 ? 1 : 0);
      const skipped = skipMatch ? parseInt(skipMatch[1], 10) : 0;
      const tests = testsMatch ? parseInt(testsMatch[1], 10) : (pass + fail);

      totalPassed += pass;
      totalFailed += fail;
      totalSkipped += skipped;
      totalTests += tests;

      const ok = code === 0 && fail === 0;
      const statusStr = ok ? 'PASS' : 'FAIL';
      console.log(`[${idx + 1}/${testFiles.length}] ${statusStr} (${durationMs}ms, ${pass} pass, ${fail} fail): ${relPath}`);

      if (!ok) {
        console.error(`--- ERROR in ${relPath} ---`);
        console.error(stderr || stdout);
        console.error(`---------------------------`);
      }

      results.push({
        file: relPath,
        code,
        ok,
        pass,
        fail,
        skipped,
        tests,
        durationMs
      });
      resolve();
    });
  });
}

async function main() {
  const globalStart = Date.now();
  for (let i = 0; i < testFiles.length; i++) {
    await runFile(testFiles[i], i);
  }
  const globalDuration = ((Date.now() - globalStart) / 1000).toFixed(2);

  console.log('\n======================================================');
  console.log('              BACKEND TEST RECONCILIATION SUMMARY     ');
  console.log('======================================================');
  console.log(`Total Test Files Run   : ${testFiles.length}`);
  console.log(`Total Tests Passed     : ${totalPassed}`);
  console.log(`Total Tests Failed     : ${totalFailed}`);
  console.log(`Total Tests Skipped    : ${totalSkipped}`);
  console.log(`Total Assertions/Tests : ${totalTests}`);
  console.log(`Total Wall Clock Time  : ${globalDuration}s`);
  console.log(`Exit Code              : ${totalFailed === 0 ? 0 : 1}`);
  console.log('======================================================\n');

  if (totalFailed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

main().catch((err) => {
  console.error('[Fatal Error in test runner]', err);
  process.exit(1);
});
