/**
 * Cryptographic Signature Service (Sprint 13.2 / REM-SEC-03)
 *
 * Implements keyed HMAC-SHA256 signatures for critical governance artifacts
 * (Deployment Plans, Specification Approvals, Governance Certificates).
 *
 * Security Characteristics:
 * - Eliminates plain unauthenticated SHA-256 hashes for approval signing.
 * - Keyed HMAC-SHA256 with key versioning prefix (e.g., "sig:v1:<hex>").
 * - Multi-key support for seamless zero-downtime key rotation.
 * - Timing-safe comparison to prevent side-channel timing attacks.
 * - Fail-closed: Throws configuration error in production if secret is missing.
 * - Backward-compatible: Identifies legacy plain SHA-256 digests and validates
 *   them as UNAUTHENTICATED_LEGACY_DIGEST with audit flags.
 * - Enterprise KMS Provider abstraction: Extensible for AWS KMS, Azure Key Vault,
 *   GCP Cloud KMS, and HashiCorp Vault.
 */

import crypto from 'crypto';

/**
 * Base KMS Signature Provider Interface
 */
export class KmsSignatureProvider {
  /**
   * Signs data with KMS key
   * @param {string|Buffer} data
   * @param {string} keyId
   * @returns {Promise<{ signature: string, keyVersion: string, algorithm: string }>}
   */
  async sign(data, keyId) {
    throw new Error('KmsSignatureProvider.sign must be implemented by subclass.');
  }

  /**
   * Verifies data with KMS key
   * @param {string|Buffer} data
   * @param {string} signature
   * @param {string} keyId
   * @returns {Promise<boolean>}
   */
  async verify(data, signature, keyId) {
    throw new Error('KmsSignatureProvider.verify must be implemented by subclass.');
  }
}

/**
 * Local HMAC-SHA256 Signature Provider (Default)
 */
export class LocalHmacSignatureProvider extends KmsSignatureProvider {
  constructor(keys = {}, activeKeyVersion = 'v1') {
    super();
    this.keys = { ...keys };
    this.activeKeyVersion = activeKeyVersion;
  }

  setKey(version, secret) {
    if (!version || !secret) throw new Error('Key version and secret required.');
    this.keys[version] = secret;
  }

  setActiveKeyVersion(version) {
    if (!this.keys[version]) {
      throw new Error(`Cannot set active key version "${version}": Key secret not loaded.`);
    }
    this.activeKeyVersion = version;
  }

  async sign(data, keyVersion = null) {
    const targetVersion = keyVersion || this.activeKeyVersion;
    const secret = this.keys[targetVersion];

    if (!secret) {
      const err = new Error(`Signing key for version "${targetVersion}" is not configured.`);
      err.code = 'MISSING_SIGNING_KEY';
      throw err;
    }

    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(typeof data === 'string' ? data : JSON.stringify(data));
    const digest = hmac.digest('hex');

    return {
      signature: `sig:${targetVersion}:${digest}`,
      keyVersion: targetVersion,
      algorithm: 'HMAC-SHA256',
      rawDigest: digest
    };
  }

  async verify(data, signatureString) {
    if (!signatureString || typeof signatureString !== 'string') {
      return { valid: false, reason: 'EMPTY_OR_INVALID_SIGNATURE_STRING' };
    }

    const parts = signatureString.split(':');
    if (parts.length !== 3 || parts[0] !== 'sig') {
      return { valid: false, reason: 'MALFORMED_SIGNATURE_FORMAT' };
    }

    const [, keyVersion, expectedDigest] = parts;
    const secret = this.keys[keyVersion];

    if (!secret) {
      return {
        valid: false,
        keyVersion,
        reason: `SIGNING_KEY_VERSION_NOT_FOUND: Version "${keyVersion}" is not configured in key ring.`
      };
    }

    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(typeof data === 'string' ? data : JSON.stringify(data));
    const actualDigest = hmac.digest('hex');

    const expectedBuf = Buffer.from(expectedDigest, 'hex');
    const actualBuf = Buffer.from(actualDigest, 'hex');

    if (expectedBuf.length !== actualBuf.length) {
      return { valid: false, keyVersion, reason: 'SIGNATURE_LENGTH_MISMATCH' };
    }

    const match = crypto.timingSafeEqual(expectedBuf, actualBuf);
    return {
      valid: match,
      keyVersion,
      signatureType: 'HMAC_SHA256_KEYED',
      reason: match ? null : 'SIGNATURE_VERIFICATION_FAILED'
    };
  }
}

/**
 * Main Cryptographic Signature Service
 */
export class CryptographicSignatureService {
  constructor(options = {}) {
    this.isProduction = process.env.NODE_ENV === 'production';
    this.activeKeyVersion = options.activeKeyVersion || process.env.FIORIFY_SIGNING_KEY_VERSION || 'v1';
    
    // Initialize key ring from environment
    const keys = this._loadKeyRing(options.keys);
    this.provider = options.provider || new LocalHmacSignatureProvider(keys, this.activeKeyVersion);
  }

  /**
   * Loads signing keys from environment or options
   * In production, fails closed if no primary secret is provided.
   */
  _loadKeyRing(explicitKeys = {}) {
    const keys = { ...explicitKeys };

    const primarySecret = process.env.FIORIFY_SIGNING_SECRET || process.env.FIORIFY_APPROVAL_SECRET;
    if (primarySecret) {
      keys[this.activeKeyVersion] = primarySecret;
    }

    // Load rotated historical keys: FIORIFY_SIGNING_KEYS_JSON='{"v1":"sec1","v2":"sec2"}'
    if (process.env.FIORIFY_SIGNING_KEYS_JSON) {
      try {
        const parsed = JSON.parse(process.env.FIORIFY_SIGNING_KEYS_JSON);
        Object.assign(keys, parsed);
      } catch (e) {
        console.error('[CryptographicSignatureService] Failed to parse FIORIFY_SIGNING_KEYS_JSON:', e.message);
      }
    }

    // Fail closed in production if no valid keys exist
    if (this.isProduction && Object.keys(keys).length === 0) {
      const err = new Error(
        'CRITICAL CONFIGURATION ERROR: FIORIFY_SIGNING_SECRET is required in production mode. ' +
        'Refusing to initialize CryptographicSignatureService without authenticated signing keys.'
      );
      err.code = 'MISSING_SIGNING_SECRET';
      throw err;
    }

    // In development / test, generate deterministic fallback key if none provided
    if (Object.keys(keys).length === 0) {
      keys['v1'] = 'fiorify-dev-deterministic-signing-secret-do-not-use-in-prod';
    }

    return keys;
  }

  /**
   * Signs a payload with the active key (or explicitly requested key version)
   *
   * @param {string|object} payload
   * @param {string} [keyVersion]
   * @returns {Promise<{ signature: string, keyVersion: string, algorithm: string, signatureType: string }>}
   */
  async signPayload(payload, keyVersion = null) {
    const canonicalPayload = typeof payload === 'string' ? payload : JSON.stringify(payload);
    const result = await this.provider.sign(canonicalPayload, keyVersion || this.activeKeyVersion);
    return {
      ...result,
      signatureType: 'HMAC_SHA256_KEYED'
    };
  }

  /**
   * Verifies signature of payload.
   * Handles both modern keyed HMAC signatures (`sig:v1:<hex>`) and
   * legacy unauthenticated SHA-256 digests (64-char hex string).
   *
   * @param {string|object} payload
   * @param {string} signatureString
   * @returns {Promise<{ valid: boolean, isLegacy: boolean, signatureType: string, keyVersion?: string, reason?: string }>}
   */
  async verifySignature(payload, signatureString) {
    if (!signatureString || typeof signatureString !== 'string') {
      return {
        valid: false,
        isLegacy: false,
        signatureType: 'INVALID',
        reason: 'Signature is empty or not a string.'
      };
    }

    const canonicalPayload = typeof payload === 'string' ? payload : JSON.stringify(payload);

    // 1. Keyed HMAC Signature: "sig:<version>:<hex>"
    if (signatureString.startsWith('sig:')) {
      const verification = await this.provider.verify(canonicalPayload, signatureString);
      return {
        valid: verification.valid,
        isLegacy: false,
        keyVersion: verification.keyVersion,
        signatureType: 'HMAC_SHA256_KEYED',
        reason: verification.reason || null
      };
    }

    // 2. Legacy Unauthenticated SHA-256 Digest (64 hex characters)
    // Backward compatibility for pre-S13.2 historical approval records.
    if (/^[a-f0-9]{64}$/i.test(signatureString)) {
      const legacyDigest = crypto.createHash('sha256').update(canonicalPayload).digest('hex');
      const expectedBuf = Buffer.from(signatureString, 'hex');
      const actualBuf = Buffer.from(legacyDigest, 'hex');

      const match = expectedBuf.length === actualBuf.length && crypto.timingSafeEqual(expectedBuf, actualBuf);

      return {
        valid: match,
        isLegacy: true,
        signatureType: 'UNAUTHENTICATED_LEGACY_DIGEST',
        keyVersion: 'legacy-unkeyed',
        reason: match
          ? 'MATCHED_LEGACY_SHA256_DIGEST_WARNING_UNKEYED'
          : 'LEGACY_SHA256_DIGEST_MISMATCH'
      };
    }

    return {
      valid: false,
      isLegacy: false,
      signatureType: 'UNRECOGNIZED_FORMAT',
      reason: 'Signature format neither matches "sig:<ver>:<hex>" nor 64-char hex digest.'
    };
  }

  /**
   * Helper to set a rotated key at runtime
   */
  registerKey(version, secret) {
    if (this.provider instanceof LocalHmacSignatureProvider) {
      this.provider.setKey(version, secret);
    }
  }

  /**
   * Helper to switch active key version
   */
  setActiveKey(version) {
    if (this.provider instanceof LocalHmacSignatureProvider) {
      this.provider.setActiveKeyVersion(version);
      this.activeKeyVersion = version;
    }
  }
}

export const defaultCryptographicSignatureService = new CryptographicSignatureService();
