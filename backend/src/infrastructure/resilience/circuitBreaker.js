/**
 * Fiorify — Circuit Breaker Pattern Implementation
 * Protects downstream enterprise services (SAP S/4HANA, BTP Destinations)
 * from cascade failures during network degradation or maintenance windows.
 */

import { logger } from '../logging/logger.js';

export const CIRCUIT_STATE = {
  CLOSED: 'CLOSED',       // Normal operation
  OPEN: 'OPEN',           // Calls immediately fail
  HALF_OPEN: 'HALF_OPEN'  // Testing recovery with limited traffic
};

export class CircuitBreaker {
  constructor(name, options = {}) {
    this.name = name;
    this.failureThreshold = options.failureThreshold || 5;
    this.resetTimeoutMs = options.resetTimeoutMs || 30000; // 30s
    this.timeoutMs = options.timeoutMs || 10000;           // 10s default per request

    this.state = CIRCUIT_STATE.CLOSED;
    this.failureCount = 0;
    this.lastFailureTime = null;
    this.nextAttempt = Date.now();
  }

  async execute(action) {
    if (this.state === CIRCUIT_STATE.OPEN) {
      if (Date.now() >= this.nextAttempt) {
        this.state = CIRCUIT_STATE.HALF_OPEN;
        logger.warn(`[CircuitBreaker:${this.name}] Transitioned to HALF_OPEN. Attempting probe.`);
      } else {
        const err = new Error(`Service [${this.name}] temporarily unavailable (CircuitBreaker OPEN).`);
        err.code = 'CIRCUIT_BREAKER_OPEN';
        err.status = 503;
        throw err;
      }
    }

    let timer = null;
    try {
      const timeoutPromise = new Promise((_, reject) => {
        timer = setTimeout(() => {
          const timeoutErr = new Error(`Request to [${this.name}] timed out after ${this.timeoutMs}ms`);
          timeoutErr.code = 'GATEWAY_TIMEOUT';
          timeoutErr.status = 504;
          reject(timeoutErr);
        }, this.timeoutMs);
      });

      const result = await Promise.race([action(), timeoutPromise]);
      clearTimeout(timer);
      this._onSuccess();
      return result;
    } catch (err) {
      if (timer) clearTimeout(timer);
      this._onFailure(err);
      throw err;
    }
  }

  _onSuccess() {
    this.failureCount = 0;
    if (this.state === CIRCUIT_STATE.HALF_OPEN) {
      this.state = CIRCUIT_STATE.CLOSED;
      logger.info(`[CircuitBreaker:${this.name}] Probe succeeded. Circuit CLOSED.`);
    }
  }

  _onFailure(err) {
    this.failureCount += 1;
    this.lastFailureTime = Date.now();

    logger.warn(`[CircuitBreaker:${this.name}] Recorded failure (${this.failureCount}/${this.failureThreshold}): ${err.message}`);

    if (this.state === CIRCUIT_STATE.HALF_OPEN || this.failureCount >= this.failureThreshold) {
      this.state = CIRCUIT_STATE.OPEN;
      this.nextAttempt = Date.now() + this.resetTimeoutMs;
      logger.error(`[CircuitBreaker:${this.name}] Circuit tripped to OPEN. Failing fast for ${this.resetTimeoutMs}ms.`);
    }
  }

  getState() {
    return {
      name: this.name,
      state: this.state,
      failureCount: this.failureCount,
      lastFailureTime: this.lastFailureTime
    };
  }
}

const circuitRegistry = new Map();

export function getCircuitBreaker(name, options) {
  if (!circuitRegistry.has(name)) {
    circuitRegistry.set(name, new CircuitBreaker(name, options));
  }
  return circuitRegistry.get(name);
}
