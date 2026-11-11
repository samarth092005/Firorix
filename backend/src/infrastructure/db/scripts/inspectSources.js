import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

function sha256File(filePath) {
  if (!fs.existsSync(filePath)) return null;
  const stat = fs.statSync(filePath);
  if (stat.isDirectory()) return 'DIRECTORY';
  const content = fs.readFileSync(filePath);
  return crypto.createHash('sha256').update(content).digest('hex');
}

function countRecords(filePath) {
  if (!fs.existsSync(filePath)) return { exists: false, count: 0, size: 0 };
  const stat = fs.statSync(filePath);
  if (stat.isDirectory()) {
    const files = fs.readdirSync(filePath);
    return { exists: true, isDir: true, count: files.length, size: stat.size };
  }
  const content = fs.readFileSync(filePath, 'utf8');
  try {
    const parsed = JSON.parse(content);
    let count = 0;
    if (Array.isArray(parsed)) {
      count = parsed.length;
    } else if (parsed && typeof parsed === 'object') {
      if (Array.isArray(parsed.transactions)) count = parsed.transactions.length;
      else if (Array.isArray(parsed.apps)) count = parsed.apps.length;
      else if (Array.isArray(parsed.handoffs)) count = parsed.handoffs.length;
      else count = Object.keys(parsed).length;
    }
    return { exists: true, count, size: stat.size, isArray: Array.isArray(parsed) };
  } catch (e) {
    return { exists: true, error: e.message, size: stat.size };
  }
}

const dataDir = path.resolve(process.cwd(), 'backend', 'data');
console.log('--- SCANNING backend/data ---');
if (fs.existsSync(dataDir)) {
  const items = fs.readdirSync(dataDir);
  for (const item of items) {
    const p = path.join(dataDir, item);
    const info = countRecords(p);
    const hash = sha256File(p);
    console.log(`${item}: isDir=${info.isDir || false}, count=${info.count}, size=${info.size}, hash=${hash ? hash.slice(0, 16) : 'none'}...`);
    if (info.isDir) {
      const subItems = fs.readdirSync(p);
      console.log(`    Contents of ${item}:`, subItems);
      for (const sub of subItems) {
        const subP = path.join(p, sub);
        const subStat = fs.statSync(subP);
        if (subStat.isDirectory()) {
          console.log(`      ${sub}/:`, fs.readdirSync(subP));
        } else {
          console.log(`      ${sub}: size=${subStat.size}`);
        }
      }
    }
  }
}
