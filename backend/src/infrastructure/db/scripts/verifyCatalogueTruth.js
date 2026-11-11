import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const catalogPath = path.resolve(process.cwd(), 'backend', 'data', 'fiori_app_catalog_cache.json');
if (!fs.existsSync(catalogPath)) {
  console.error('File not found:', catalogPath);
  process.exit(1);
}

const raw = fs.readFileSync(catalogPath);
const hash = crypto.createHash('sha256').update(raw).digest('hex');
const stat = fs.statSync(catalogPath);
const data = JSON.parse(raw.toString('utf8'));

const totalRecords = data.length;
const appIds = new Set();
const duplicates = [];
const releases = new Set();
const editions = new Set();
const provenances = new Set();
let failedOrSkipped = 0;

for (const app of data) {
  const id = app.appId || app.fioriId || app.id;
  if (!id) {
    failedOrSkipped++;
    continue;
  }
  if (appIds.has(id)) {
    duplicates.push(id);
  } else {
    appIds.add(id);
  }

  if (app.productVersion) releases.add(app.productVersion);
  if (app.targetRelease) releases.add(app.targetRelease);
  if (app.supportedProductRelease) releases.add(app.supportedProductRelease);
  if (app.provenance) provenances.add(app.provenance);
}

console.log('=== CATALOGUE TRUTH AUDIT ===');
console.log(`File: ${catalogPath}`);
console.log(`File Size: ${stat.size} bytes`);
console.log(`File SHA-256: ${hash}`);
console.log(`Total Records: ${totalRecords}`);
console.log(`Unique App IDs: ${appIds.size}`);
console.log(`Duplicate IDs: ${duplicates.length}${duplicates.length > 0 ? ` (${duplicates.join(', ')})` : ''}`);
console.log(`Failed or Skipped: ${failedOrSkipped}`);
console.log(`Releases Covered:`, Array.from(releases));
console.log(`Provenances:`, Array.from(provenances));
console.log(`Last Modified: ${stat.mtime.toISOString()}`);
