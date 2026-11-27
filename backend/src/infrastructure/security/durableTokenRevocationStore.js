/**
 * Fiorify — Durable Token Revocation Store (SEC-007, DB-002)
 *
 * Implements persistent token revocation backed by DatabaseAdapter (Postgres / SAP HANA Cloud)
 * with local in-memory L1 cache for sub-millisecond validation and fallback tolerance.
 *
 * Security Invariants:
 * - Plaintext tokens are NEVER stored: always hashed via SHA-256 before storage.
 * - Distributed revocation: Invalidating a token on one instance takes effect cluster-wide.
 * - Automatic expiration: Expired revocations are safely purged to bound storage growth.
 */

import { TokenRevocationStore, MemoryTokenRevocationStore } from './tokenRevocationStore.js';
import { defaultDatabaseAdapter } from '../db/adapters/databaseAdapterFactory.js';

export class DurableTokenRevocationStore extends TokenRevocationStore {
  constructor(options = {}) {
    super();
    this.adapter = options.adapter || defaultDatabaseAdapter;
    this.memoryStore = options.memoryStore || new MemoryTokenRevocationStore(options);
    this.useDatabase = options.useDatabase !== undefined
      ? options.useDatabase
      : Boolean(['postgres', 'hana'].includes((process.env.FIORIFY_PERSISTENCE || '').toLowerCase()) || process.env.NODE_ENV === 'production');
    this.defaultTtlSeconds = options.defaultTtlSeconds || 24 * 3600;
  }

  async revoke(token, metadata = {}) {
    if (!token) return false;
    const tokenHash = TokenRevocationStore.hashToken(token);
    if (!tokenHash) return false;

    // 1. Update L1 In-Memory Cache
    this.memoryStore.revokeSync(token, metadata);

    // 2. Persist to Database if active
    if (this.useDatabase && this.adapter) {
      try {
        const now = new Date();
        const expiresAt = metadata.expiresAt
          ? (metadata.expiresAt instanceof Date ? metadata.expiresAt : new Date(metadata.expiresAt))
          : new Date(now.getTime() + this.defaultTtlSeconds * 1000);

        const tenantId = metadata.tenantId || 'DEFAULT-TENANT-S21';
        const userId = metadata.userId || 'anonymous';
        const reason = metadata.reason || 'LOGOUT';

        const dialect = this.adapter.getDialect();
        const sql = dialect === 'hana'
          ? `MERGE INTO token_revocations AS target
             USING (SELECT ? AS token_hash, ? AS tenant_id, ? AS user_id, ? AS expires_at, ? AS reason FROM DUMMY) AS src
             ON (target.token_hash = src.token_hash)
             WHEN MATCHED THEN UPDATE SET target.expires_at = src.expires_at, target.reason = src.reason
             WHEN NOT MATCHED THEN INSERT (token_hash, tenant_id, user_id, expires_at, reason)
             VALUES (src.token_hash, src.tenant_id, src.user_id, src.expires_at, src.reason)`
          : `INSERT INTO token_revocations (token_hash, tenant_id, user_id, expires_at, reason)
             VALUES ($1, $2, $3, $4, $5)
             ON CONFLICT (token_hash) DO UPDATE
             SET expires_at = EXCLUDED.expires_at, reason = EXCLUDED.reason;`;

        await this.adapter.query(sql, [tokenHash, tenantId, userId, expiresAt.toISOString(), reason]);
        return true;
      } catch (dbErr) {
        console.warn('[DurableTokenRevocationStore] Warning writing to database:', dbErr.message);
        // Fall back to L1 memory store
        return true;
      }
    }

    return true;
  }

  async isRevoked(token) {
    if (!token) return false;
    const tokenHash = TokenRevocationStore.hashToken(token);
    if (!tokenHash) return false;

    // 1. Check L1 In-Memory Cache
    if (this.memoryStore.isRevokedSync(token)) {
      return true;
    }

    // 2. Check Database Store if active
    if (this.useDatabase && this.adapter) {
      try {
        const dialect = this.adapter.getDialect();
        const sql = dialect === 'hana'
          ? 'SELECT token_hash, expires_at FROM token_revocations WHERE token_hash = ? AND expires_at > CURRENT_TIMESTAMP'
          : 'SELECT token_hash, expires_at FROM token_revocations WHERE token_hash = $1 AND expires_at > CURRENT_TIMESTAMP;';

        const res = await this.adapter.query(sql, [tokenHash]);
        if (res.rows && res.rows.length > 0) {
          // Populate L1 cache
          this.memoryStore.revokeSync(token, { expiresAt: res.rows[0].expires_at });
          return true;
        }
      } catch (err) {
        // Fall back to L1 memory cache result
      }
    }

    return false;
  }

  async purgeExpired() {
    let purged = await this.memoryStore.purgeExpired();
    if (this.useDatabase && this.adapter) {
      try {
        const dialect = this.adapter.getDialect();
        const sql = dialect === 'hana'
          ? 'DELETE FROM token_revocations WHERE expires_at < CURRENT_TIMESTAMP'
          : 'DELETE FROM token_revocations WHERE expires_at < CURRENT_TIMESTAMP;';
        const res = await this.adapter.query(sql);
        purged += res.rowCount || 0;
      } catch {
        // non-fatal
      }
    }
    return purged;
  }

  getStatus() {
    const isProduction = process.env.NODE_ENV === 'production';
    const dialect = this.adapter ? this.adapter.getDialect() : 'none';
    return {
      storeType: this.useDatabase ? 'DURABLE_MULTI_INSTANCE' : 'MEMORY_VOLATILE',
      distributed: this.useDatabase,
      persistedInDb: this.useDatabase,
      dialect,
      activeRevocationCount: this.memoryStore._revocations.size,
      productionReady: isProduction ? this.useDatabase && dialect === 'hana' : true,
      limitationNotice: !this.useDatabase && isProduction
        ? 'WARNING: Database persistence is inactive in production. Set FIORIFY_PERSISTENCE=postgres or configure SAP HANA Cloud.'
        : undefined
    };
  }

  clear() {
    this.memoryStore.clear();
  }
}

export const defaultDurableTokenRevocationStore = new DurableTokenRevocationStore();
export default defaultDurableTokenRevocationStore;
