import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

export class IArtifactStorage {
  async saveArtifact(tenantId, projectId, artifactName, content, metadata = {}) {
    throw new Error('Not implemented');
  }

  async getArtifact(tenantId, projectId, artifactName) {
    throw new Error('Not implemented');
  }

  async deleteArtifact(tenantId, projectId, artifactName) {
    throw new Error('Not implemented');
  }

  async listArtifacts(tenantId, projectId) {
    throw new Error('Not implemented');
  }
}

export class LocalFileSystemArtifactStorage extends IArtifactStorage {
  constructor(options = {}) {
    super();
    const cwd = process.cwd();
    const baseDir = fs.existsSync(path.join(cwd, 'data', 'assessments.json'))
      ? path.join(cwd, 'data', 'artifacts')
      : path.join(cwd, 'backend', 'data', 'artifacts');
    this.storageRoot = options.storageRoot || baseDir;
    if (!fs.existsSync(this.storageRoot)) {
      fs.mkdirSync(this.storageRoot, { recursive: true });
    }
  }

  _getProjectDir(tenantId, projectId) {
    const safeTenant = tenantId.replace(/[^a-zA-Z0-9_-]/g, '_');
    const safeProject = projectId.replace(/[^a-zA-Z0-9_-]/g, '_');
    return path.join(this.storageRoot, safeTenant, safeProject);
  }

  async saveArtifact(tenantId, projectId, artifactName, content, metadata = {}) {
    const projectDir = this._getProjectDir(tenantId, projectId);
    if (!fs.existsSync(projectDir)) {
      fs.mkdirSync(projectDir, { recursive: true });
    }

    const safeName = path.basename(artifactName);
    const filePath = path.join(projectDir, safeName);
    const buffer = Buffer.isBuffer(content) ? content : Buffer.from(content, 'utf8');
    const contentHash = crypto.createHash('sha256').update(buffer).digest('hex');

    fs.writeFileSync(filePath, buffer);

    return {
      artifactName: safeName,
      storageDriver: 'LOCAL_FS',
      storagePath: filePath,
      contentHash,
      fileSizeBytes: buffer.length,
      metadata: {
        ...metadata,
        savedAt: new Date().toISOString()
      }
    };
  }

  async getArtifact(tenantId, projectId, artifactName) {
    const safeName = path.basename(artifactName);
    const filePath = path.join(this._getProjectDir(tenantId, projectId), safeName);
    if (!fs.existsSync(filePath)) {
      return null;
    }

    const buffer = fs.readFileSync(filePath);
    const contentHash = crypto.createHash('sha256').update(buffer).digest('hex');

    return {
      artifactName: safeName,
      content: buffer,
      contentHash,
      fileSizeBytes: buffer.length,
      storagePath: filePath
    };
  }

  async deleteArtifact(tenantId, projectId, artifactName) {
    const safeName = path.basename(artifactName);
    const filePath = path.join(this._getProjectDir(tenantId, projectId), safeName);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      return true;
    }
    return false;
  }

  async listArtifacts(tenantId, projectId) {
    const projectDir = this._getProjectDir(tenantId, projectId);
    if (!fs.existsSync(projectDir)) {
      return [];
    }

    const files = fs.readdirSync(projectDir);
    return files.map(fileName => {
      const filePath = path.join(projectDir, fileName);
      const stat = fs.statSync(filePath);
      const buffer = fs.readFileSync(filePath);
      const hash = crypto.createHash('sha256').update(buffer).digest('hex');
      return {
        artifactName: fileName,
        fileSizeBytes: stat.size,
        contentHash: hash,
        storagePath: filePath,
        modifiedAt: stat.mtime.toISOString()
      };
    });
  }
}

export default LocalFileSystemArtifactStorage;
