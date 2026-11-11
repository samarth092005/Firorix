/**
 * FioriX — GEN-07: Preview Session Store & Port Allocator
 *
 * Tracks in-memory preview sessions, allocated ports in the range 4050-4099,
 * active HTTP server references, request telemetry logs, and synthetic records.
 */

import { SAFE_PORT_MIN, SAFE_PORT_MAX } from './previewSecurity.js';

export class PreviewSessionStore {
  constructor() {
    this.sessions = new Map(); // projectId -> session object
    this.allocatedPorts = new Set();
    this.SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
  }

  /**
   * Allocates an available port in the range 4050-4099.
   *
   * @returns {number} Allocated port
   */
  allocatePort() {
    for (let p = SAFE_PORT_MIN; p <= SAFE_PORT_MAX; p++) {
      if (!this.allocatedPorts.has(p)) {
        this.allocatedPorts.add(p);
        return p;
      }
    }
    const err = new Error(`All preview ports in range ${SAFE_PORT_MIN}-${SAFE_PORT_MAX} are currently in use.`);
    err.code = 'NO_PORTS_AVAILABLE';
    err.statusCode = 503;
    throw err;
  }

  /**
   * Releases an allocated port back to the pool.
   *
   * @param {number} port
   */
  releasePort(port) {
    if (port) {
      this.allocatedPorts.delete(port);
    }
  }

  /**
   * Gets an existing active session for a project.
   *
   * @param {string} projectId
   * @returns {Object|null}
   */
  getSession(projectId) {
    const session = this.sessions.get(projectId);
    if (!session) return null;

    // Check expiration
    const age = Date.now() - session.lastActivityAt;
    if (age > this.SESSION_TIMEOUT_MS) {
      this.closeSession(projectId);
      return null;
    }

    session.lastActivityAt = Date.now();
    return session;
  }

  /**
   * Registers a new session.
   */
  setSession(projectId, sessionData) {
    const existing = this.sessions.get(projectId);
    if (existing && existing.server) {
      try {
        existing.server.close();
      } catch {}
      this.releasePort(existing.port);
    }

    const session = {
      projectId,
      port: sessionData.port,
      server: sessionData.server,
      url: `http://127.0.0.1:${sessionData.port}`,
      startedAt: Date.now(),
      lastActivityAt: Date.now(),
      status: 'RUNNING',
      syntheticStore: sessionData.syntheticStore || {},
      requestsLog: [],
      errorCount: 0
    };

    this.sessions.set(projectId, session);
    return session;
  }

  /**
   * Closes a preview session, terminating the HTTP server and freeing its port.
   *
   * @param {string} projectId
   * @returns {boolean}
   */
  closeSession(projectId) {
    const session = this.sessions.get(projectId);
    if (!session) return false;

    if (session.server) {
      try {
        session.server.close();
      } catch {}
    }

    this.releasePort(session.port);
    this.sessions.delete(projectId);
    return true;
  }

  /**
   * Appends an entry to the session's request telemetry log.
   */
  logRequest(projectId, logEntry) {
    const session = this.sessions.get(projectId);
    if (session) {
      session.requestsLog.unshift({
        timestamp: new Date().toISOString(),
        ...logEntry
      });
      if (session.requestsLog.length > 100) {
        session.requestsLog.pop();
      }
      if (logEntry.status >= 400) {
        session.errorCount++;
      }
    }
  }
}

export const defaultPreviewSessionStore = new PreviewSessionStore();
