#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const backendRoot = path.resolve(__dirname, '..');

function walk(dir) {
  let files = [];
  if (!fs.existsSync(dir)) return files;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== 'node_modules' && entry.name !== 'coverage') {
        files.push(...walk(fullPath));
      }
    } else if (entry.isFile() && fullPath.endsWith('.js')) {
      files.push(fullPath);
    }
  }
  return files;
}

const targetDirs = [
  path.join(backendRoot, 'src'),
  path.join(backendRoot, 'test')
];

const allFiles = targetDirs.flatMap(walk);
console.log(`[FioriX Backend Quality] Validating syntax for ${allFiles.length} JavaScript files...`);

let errorCount = 0;
for (const file of allFiles) {
  try {
    execFileSync(process.execPath, ['--check', file], { stdio: 'pipe' });
  } catch (err) {
    console.error(`[SYNTAX_ERROR] ${path.relative(backendRoot, file)}`);
    if (err.stderr) {
      console.error(err.stderr.toString());
    }
    errorCount++;
  }
}

if (errorCount > 0) {
  console.error(`[FAILED] Syntax check failed with ${errorCount} error(s).`);
  process.exit(1);
} else {
  console.log(`[PASSED] All ${allFiles.length} backend JavaScript files passed syntax verification.`);
  process.exit(0);
}
