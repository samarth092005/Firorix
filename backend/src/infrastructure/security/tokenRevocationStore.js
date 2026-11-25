/**
 * Fiorify Token Revocation & Distributed Session Store (SEC-004 / Milestone 2.1)
 *
 * Provides a cryptographically secure token revocation store:
 * 1. Hashes tokens via SHA-256 before storage — plaintext tokens are never stored.
 * 2. Manages token expiry and periodic purging of expired entries.
 * 3. Defines the contract for distributed multi-instance persistence (PostgreSQL / Redis)
 *    to be backed by Milestone 3 (SEC-001 to DB-010).
 * 4. Fails safely and reports storage durability status.
 */

import crypto from 'node:crypto';

export class TokenRevocationStore {
  /**
   * Hashes a token to produce an opaque storage key
   * @param {string} token 
   * @returns {string} SHA-256 hex digest
   */
  static hashToken(token) {
    if (!token || typeof token !== 'string') return '';
    const clean = token.startsWith('Bearer ') ? token.slice(7).trim() : token.trim();
    return crypto.createHash('sha256').update(clean).digest('hex');
  }

  /**
   * Revoke a token
   * @param {string} token Plaintext token or token hash
   * @param {object} metadata { userId, tenantId, reason, expiresAt }
   * @returns {Promise<boolean>}
   */
  async revoke(token, metadata = {}) {
    throw new Error('revoke() must be implemented by concrete store subclass');
  }

  /**
   * Check if a token is revoked
   * @param {string} token Plaintext token or token hash
   * @returns {Promise<boolean>}
   */
  async isRevoked(token) {
    throw new Error('isRevoked() must be implemented by concrete store subclass');
  }

  /**
   * Purge expired revocation records
   * @returns {Promise<number>} Number of purged records
   */
  async purgeExpired() {
    throw new Error('purgeExpired() must be implemented by concrete store subclass');
  }

  /**
   * Get store operational status
   * @returns {object}
   */
  getStatus() {
    throw new Error('getStatus() must be implemented by concrete store subclass');
  }
}

/**
 * In-Memory Token Revocation Store with cryptographic hash indexing
 * Suitable for single-instance development and unit testing.
 */
export class MemoryTokenRevocationStore extends TokenRevocationStore {
  constructor(options = {}) {
    super();
    this.options = options;
    // Map of tokenHash -> { revokedAt, expiresAt, reason, tenantId, userId }
    this._revocations = new Map();
    this._defaultTtlSeconds = options.defaultTtlSeconds || 24 * 3600;
  }

  revokeSync(token, metadata = {}) {
    if (!token) return false;
    const tokenHash = TokenRevocationStore.hashToken(token);
    if (!tokenHash) return false;

    const now = Date.now();
    const expiresAt = metadata.expiresAt
      ? (typeof metadata.expiresAt === 'number' ? metadata.expiresAt : new Date(metadata.expiresAt).getTime())
      : (now + this._defaultTtlSeconds * 1000);

    this._revocations.set(tokenHash, {
      tokenHash,
      revokedAt: now,
      expiresAt,
      reason: metadata.reason || 'LOGOUT',
      tenantId: metadata.tenantId || 'DEFAULT',
      userId: metadata.userId || 'anonymous'
    });

    return true;
  }

  isRevokedSync(token) {
    if (!token) return false;
    const tokenHash = TokenRevocationStore.hashToken(token);
    if (!tokenHash) return false;

    const record = this._revocations.get(tokenHash);
    if (!record) return false;

    if (record.expiresAt && record.expiresAt < Date.now()) {
      this._revocations.delete(tokenHash);
      return false;
    }

    return true;
  }

  async revoke(token, metadata = {}) {
    return this.revokeSync(token, metadata);
  }

  async isRevoked(token) {
    return this.isRevokedSync(token);
  }

  async purgeExpired() {
    const now = Date.now();
    let purged = 0;
    for (const [hash, record] of this._revocations.entries()) {
      if (record.expiresAt && record.expiresAt < now) {
        this._revocations.delete(hash);
        purged++;
      }
    }
    return purged;
  }

  getStatus() {
    const isProduction = process.env.NODE_ENV === 'production';
    return {
      storeType: 'MEMORY_VOLATILE',
      distributed: false,
      persistedInDb: false,
      activeRevocationCount: this._revocations.size,
      limitationNotice: isProduction
        ? 'WARNING: In-memory revocation store active in production. Distributed multi-instance invalidation requires Milestone 3 (SEC-001/DB-010) shared database persistence.'
        : 'Development volatile storage with SHA-256 token hashing.',
      milestoneDependency: 'SEC-001 to DB-010'
    };
  }

  clear() {
    this._revocations.clear();
  }
}

export const defaultTokenRevocationStore = new MemoryTokenRevocationStore();
export default defaultTokenRevocationStore;
