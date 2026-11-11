import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

export function resolveDataDir(customDataDir) {
  if (customDataDir && fs.existsSync(customDataDir)) return customDataDir;
  const cwd = process.cwd();
  if (fs.existsSync(path.join(cwd, 'data', 'assessments.json'))) return path.join(cwd, 'data');
  if (fs.existsSync(path.join(cwd, 'backend', 'data', 'assessments.json'))) return path.join(cwd, 'backend', 'data');
  return fs.existsSync(path.join(cwd, 'data')) ? path.join(cwd, 'data') : path.join(cwd, 'backend', 'data');
}

export function createPreMigrationBackup(dataDir, backupDir) {
  const resolvedDataDir = resolveDataDir(dataDir);
  const resolvedBackupDir = backupDir || path.join(resolvedDataDir, 'backups');

  if (!fs.existsSync(resolvedBackupDir)) {
    fs.mkdirSync(resolvedBackupDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const snapshotFolder = path.join(resolvedBackupDir, `pre-s1-snapshot-${timestamp}`);
  fs.mkdirSync(snapshotFolder, { recursive: true });

  const manifest = {
    timestamp: new Date().toISOString(),
    sourceDir: resolvedDataDir,
    snapshotDir: snapshotFolder,
    files: []
  };

  function copyRecursive(src, dest) {
    if (!fs.existsSync(src)) return;
    const base = path.basename(src);
    if (base === 'backups' || base === 'quarantine' || base === 'db' || base === '.git') return;
    try {
      const stats = fs.statSync(src);
      if (stats.isDirectory()) {
        if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
        const entries = fs.readdirSync(src);
        for (const entry of entries) {
          copyRecursive(path.join(src, entry), path.join(dest, entry));
        }
      } else {
        const content = fs.readFileSync(src);
        const hash = crypto.createHash('sha256').update(content).digest('hex');
        fs.writeFileSync(dest, content);
        manifest.files.push({
          relativePath: path.relative(resolvedDataDir, src).replace(/\\/g, '/'),
          sizeBytes: stats.size,
          sha256: hash
        });
      }
    } catch (err) {
      if (err.code === 'ENOENT') return;
      throw err;
    }
  }

  const entries = fs.readdirSync(resolvedDataDir);
  for (const entry of entries) {
    if (entry === 'backups' || entry === 'quarantine') continue;
    copyRecursive(path.join(resolvedDataDir, entry), path.join(snapshotFolder, entry));
  }

  const manifestPath = path.join(snapshotFolder, 'manifest.json');
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf8');

  return {
    snapshotFolder,
    manifestPath,
    totalFiles: manifest.files.length,
    manifest
  };
}

if (process.argv[1] && process.argv[1].endsWith('createPreMigrationBackup.js')) {
  const result = createPreMigrationBackup();
  console.log(`Pre-migration backup completed successfully!`);
  console.log(`Snapshot directory: ${result.snapshotFolder}`);
  console.log(`Files archived: ${result.totalFiles}`);
}

export default createPreMigrationBackup;
