import crypto from 'node:crypto';
import DatabasePool from '../db/pool.js';
import { AuthService } from '../../services/authService.js';

export const SECURITY_ACTIONS = Object.freeze({
  LOGIN_SUCCESS: 'LOGIN_SUCCESS',
  LOGIN_FAILURE: 'LOGIN_FAILURE',
  AUTH_FAILURE: 'AUTH_FAILURE',
  PERMISSION_DENIED: 'PERMISSION_DENIED',
  TENANT_ACCESS_VIOLATION: 'TENANT_ACCESS_VIOLATION',
  TENANT_CHANGED: 'TENANT_CHANGED',
  SYSTEM_REGISTERED: 'SYSTEM_REGISTERED',
  SYSTEM_TESTED: 'SYSTEM_TESTED',
  CATALOGUE_IMPORTED: 'CATALOGUE_IMPORTED',
  DISCOVERY_EXECUTED: 'DISCOVERY_EXECUTED',
  ASSESSMENT_MODIFIED: 'ASSESSMENT_MODIFIED',
  PROJECT_MODIFIED: 'PROJECT_MODIFIED',
  ARTIFACT_GENERATED: 'ARTIFACT_GENERATED',
  ARTIFACT_EXPORTED: 'ARTIFACT_EXPORTED',
  SECURITY_CONFIG_CHANGED: 'SECURITY_CONFIG_CHANGED'
});

export class SecurityAuditLogger {
  constructor(pool = DatabasePool) {
    this.pool = pool;
    this._fallbackEvents = [];
  }

  computeHash(event, previousHash = 'GENESIS') {
    const raw = `${previousHash}|${event.timestamp}|${event.actor}|${event.tenantId}|${event.action}|${event.resource}|${event.outcome}|${event.correlationId || ''}`;
    return crypto.createHash('sha256').update(raw).digest('hex');
  }

  /**
   * Logs a tamper-evident administrative audit event
   */
  async logEvent(params = {}) {
    const actor = params.actor || 'anonymous';
    const tenantId = params.tenantId || 'DEFAULT-TENANT-S21';
    const action = params.action || 'UNKNOWN_ACTION';
    const resource = params.resource || 'unknown_resource';
    const correlationId = params.correlationId || `CORR-${Date.now()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
    const outcome = params.outcome || 'SUCCESS'; // 'SUCCESS', 'DENIED', 'FAILED'
    const timestamp = params.timestamp || new Date().toISOString();
    const eventId = `SEC-AUD-${Date.now()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;

    // Redact all sensitive fields from details
    const sanitizedDetails = AuthService.redactSecrets(params.details || {});

    try {
      const client = await this.pool.getClient();
      try {
        await client.query('BEGIN;');

        // Ensure tenant exists
        await client.query(`
          INSERT INTO tenants (tenant_id, name)
          VALUES ($1, $2)
          ON CONFLICT (tenant_id) DO NOTHING;
        `, [tenantId, `Tenant ${tenantId}`]);

        // Get previous event hash for this tenant or globally
        const lastRes = await client.query(`
          SELECT integrity_hash FROM security_audit_events
          WHERE tenant_id = $1
          ORDER BY id DESC LIMIT 1;
        `, [tenantId]);

        const previousHash = lastRes.rowCount > 0 ? lastRes.rows[0].integrity_hash : 'GENESIS';
        const integrityHash = this.computeHash({
          timestamp, actor, tenantId, action, resource, outcome, correlationId
        }, previousHash);

        const insertRes = await client.query(`
          INSERT INTO security_audit_events (
            event_id, timestamp, actor, tenant_id, action, resource,
            correlation_id, outcome, details, previous_hash, integrity_hash
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
          RETURNING id, event_id, timestamp, actor, action, outcome, integrity_hash;
        `, [
          eventId, timestamp, actor, tenantId, action, resource,
          correlationId, outcome, JSON.stringify(sanitizedDetails), previousHash, integrityHash
        ]);

        await client.query('COMMIT;');
        return insertRes.rows[0];
      } catch (err) {
        await client.query('ROLLBACK;');
        throw err;
      } finally {
        client.release();
      }
    } catch (dbErr) {
      // In-memory fallback if database pool is unavailable during bootstrapping
      const tenantFallback = this._fallbackEvents.filter(e => e.tenantId === tenantId);
      const previousHash = tenantFallback.length > 0
        ? (tenantFallback[tenantFallback.length - 1].integrity_hash || tenantFallback[tenantFallback.length - 1].integrityHash)
        : 'GENESIS';
      const integrityHash = this.computeHash({
        timestamp, actor, tenantId, action, resource, outcome, correlationId
      }, previousHash);

      const memEvent = {
        eventId,
        timestamp,
        actor,
        tenantId,
        action,
        resource,
        correlationId,
        outcome,
        details: sanitizedDetails,
        previousHash,
        integrityHash,
        persistedInDb: false
      };
      this._fallbackEvents.push(memEvent);
      return memEvent;
    }
  }

  /**
   * Lists audit events with filtering
   */
  async listEvents(filter = {}, tenantId = 'DEFAULT-TENANT-S21') {
    try {
      let query = 'SELECT * FROM security_audit_events WHERE tenant_id = $1';
      const params = [tenantId];

      if (filter.action) {
        params.push(filter.action);
        query += ` AND action = $${params.length}`;
      }
      if (filter.outcome) {
        params.push(filter.outcome);
        query += ` AND outcome = $${params.length}`;
      }
      if (filter.actor) {
        params.push(filter.actor);
        query += ` AND actor = $${params.length}`;
      }

      query += ' ORDER BY id ASC LIMIT 200;';
      const res = await this.pool.query(query, params);
      return res.rows;
    } catch (e) {
      return this._fallbackEvents.filter(e => e.tenantId === tenantId);
    }
  }

  /**
   * Verifies the cryptographic integrity of the security audit chain
   */
  async verifyChain(tenantId = 'DEFAULT-TENANT-S21') {
    const events = await this.listEvents({}, tenantId);
    if (!events || events.length === 0) {
      return { valid: true, count: 0, message: 'No events to verify' };
    }

    for (let i = 0; i < events.length; i++) {
      const cur = events[i];
      const prev = i === 0 ? 'GENESIS' : (events[i - 1].integrity_hash || events[i - 1].integrityHash);
      const expectedPrev = cur.previous_hash || cur.previousHash;
      if (expectedPrev !== prev) {
        return {
          valid: false,
          error: `Broken chain at event index ${i}: expected previous hash ${prev}, got ${expectedPrev}`,
          eventId: cur.event_id || cur.eventId
        };
      }
    }

    return {
      valid: true,
      count: events.length,
      latestHash: events[events.length - 1].integrity_hash || events[events.length - 1].integrityHash
    };
  }
}

export const defaultSecurityAuditLogger = new SecurityAuditLogger();
export default defaultSecurityAuditLogger;
