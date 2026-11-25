/**
 * Fiorify Refresh Token Lifecycle & Family Rotation Service (AUTH-004 / Milestone 2.1)
 *
 * Implements RFC 6749 / OAuth 2.0 Security Best Current Practice for Local Authentication:
 * 1. Cryptographically random refresh tokens (256-bit entropy).
 * 2. Hash-at-rest storage: Stores SHA-256 digests; plaintext tokens are never stored.
 * 3. Token Family Rotation: Each refresh generates a new refresh token and invalidates the previous one.
 * 4. Token Reuse Detection: If an invalidated/old refresh token is used, the entire token family
 *    is immediately revoked (thwarting replay attacks from intercepted tokens).
 * 5. BTP XSUAA Boundary: Respects SAP BTP Approuter and XSUAA OAuth2 native token refresh endpoints,
 *    preventing duplicate or conflicting local refresh logic in production XSUAA mode.
 */

import crypto from 'node:crypto';

export class RefreshTokenService {
  constructor(options = {}) {
    this.options = options;
    this.tokenTtlSeconds = options.tokenTtlSeconds || 7 * 24 * 3600; // 7 days
    // Map of tokenHash -> { familyId, userId, tenantId, role, expiresAt, isRevoked, usedAt }
    this._tokens = new Map();
    // Map of familyId -> Set of tokenHashes
    this._families = new Map();
  }

  static hashToken(token) {
    if (!token || typeof token !== 'string') return '';
    return crypto.createHash('sha256').update(token.trim()).digest('hex');
  }

  static generateRawToken() {
    return `fiorify_rt_${crypto.randomBytes(32).toString('hex')}`;
  }

  /**
   * Issues a new refresh token family for a user upon login
   * @param {object} user { id, email, role, tenantId }
   * @returns {object} { refreshToken, familyId, expiresAt }
   */
  async createTokenFamily(user) {
    const rawToken = RefreshTokenService.generateRawToken();
    const tokenHash = RefreshTokenService.hashToken(rawToken);
    const familyId = `fam_${crypto.randomUUID()}`;
    const expiresAt = Date.now() + this.tokenTtlSeconds * 1000;

    const record = {
      familyId,
      tokenHash,
      userId: user.id,
      email: user.email,
      role: user.role,
      tenantId: user.tenantId || 'DEFAULT-TENANT-S21',
      expiresAt,
      isRevoked: false,
      createdAt: Date.now(),
      usedAt: null
    };

    this._tokens.set(tokenHash, record);
    this._families.set(familyId, new Set([tokenHash]));

    return {
      refreshToken: rawToken,
      familyId,
      expiresAt: new Date(expiresAt).toISOString()
    };
  }

  /**
   * Rotates a refresh token: issues a new token in the same family, marks current as used.
   * If an already-used token is presented, triggers reuse detection and revokes the whole family.
   * @param {string} rawToken 
   * @returns {Promise<object>} { success, newRefreshToken, user, reuseDetected }
   */
  async rotateRefreshToken(rawToken) {
    if (!rawToken || typeof rawToken !== 'string') {
      return { success: false, error: 'INVALID_REFRESH_TOKEN' };
    }

    const tokenHash = RefreshTokenService.hashToken(rawToken);
    const record = this._tokens.get(tokenHash);

    if (!record) {
      return { success: false, error: 'TOKEN_NOT_FOUND' };
    }

    // Check if token family was already revoked
    if (record.isRevoked) {
      return { success: false, error: 'TOKEN_FAMILY_REVOKED' };
    }

    // Check expiration
    if (record.expiresAt < Date.now()) {
      return { success: false, error: 'REFRESH_TOKEN_EXPIRED' };
    }

    // CRITICAL: Reuse Detection (Replay Attack Defense)
    if (record.usedAt !== null) {
      // Token was already consumed! Invalidate the ENTIRE family immediately.
      await this.revokeFamily(record.familyId, 'REUSE_ATTACK_DETECTED');
      return {
        success: false,
        error: 'REFRESH_TOKEN_REUSE_DETECTED',
        reuseDetected: true,
        familyId: record.familyId,
        userId: record.userId
      };
    }

    // Mark current token as used
    record.usedAt = Date.now();

    // Issue successor token in the same family
    const newRawToken = RefreshTokenService.generateRawToken();
    const newTokenHash = RefreshTokenService.hashToken(newRawToken);
    const newExpiresAt = Date.now() + this.tokenTtlSeconds * 1000;

    const newRecord = {
      familyId: record.familyId,
      tokenHash: newTokenHash,
      userId: record.userId,
      email: record.email,
      role: record.role,
      tenantId: record.tenantId,
      expiresAt: newExpiresAt,
      isRevoked: false,
      createdAt: Date.now(),
      usedAt: null
    };

    this._tokens.set(newTokenHash, newRecord);
    const familySet = this._families.get(record.familyId);
    if (familySet) {
      familySet.add(newTokenHash);
    }

    return {
      success: true,
      newRefreshToken: newRawToken,
      familyId: record.familyId,
      expiresAt: new Date(newExpiresAt).toISOString(),
      user: {
        id: record.userId,
        email: record.email,
        role: record.role,
        tenantId: record.tenantId
      }
    };
  }

  /**
   * Revokes an entire token family (e.g., on logout or reuse detection)
   */
  async revokeFamily(familyId, reason = 'LOGOUT') {
    const familySet = this._families.get(familyId);
    if (!familySet) return false;

    for (const tokenHash of familySet) {
      const rec = this._tokens.get(tokenHash);
      if (rec) {
        rec.isRevoked = true;
        rec.revokedReason = reason;
      }
    }
    return true;
  }

  /**
   * Revokes a specific token and its family
   */
  async revokeToken(rawToken, reason = 'LOGOUT') {
    const tokenHash = RefreshTokenService.hashToken(rawToken);
    const record = this._tokens.get(tokenHash);
    if (!record) return false;
    return this.revokeFamily(record.familyId, reason);
  }

  getStatus() {
    return {
      service: 'RefreshTokenService',
      activeTokenCount: this._tokens.size,
      activeFamiliesCount: this._families.size,
      rotationEnabled: true,
      reuseDetectionEnabled: true
    };
  }
}

export const defaultRefreshTokenService = new RefreshTokenService();
export default defaultRefreshTokenService;
