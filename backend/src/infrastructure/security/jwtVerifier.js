import crypto from 'node:crypto';

/**
 * FioriX Native JWT Verifier
 * Implements RFC 7519 JWT validation using native Node.js crypto.
 * Supports HS256 (HMAC-SHA256) and RS256 (RSA-SHA256).
 */
export class JwtVerifier {
  static base64UrlDecode(str) {
    let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4) {
      base64 += '=';
    }
    return Buffer.from(base64, 'base64').toString('utf8');
  }

  static base64UrlEncode(buffer) {
    return buffer.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }

  /**
   * Generates a signed JWT token
   */
  static sign(payload, secretOrPrivateKey, options = {}) {
    const algorithm = options.algorithm || 'HS256';
    const header = {
      alg: algorithm,
      typ: 'JWT',
      kid: options.kid || undefined
    };

    const now = Math.floor(Date.now() / 1000);
    const finalPayload = {
      iat: now,
      exp: now + (options.expiresInSeconds || 86400),
      iss: options.issuer || 'https://fiorix.corp/auth',
      aud: options.audience || 'fiorix-platform',
      ...payload
    };

    const encodedHeader = JwtVerifier.base64UrlEncode(Buffer.from(JSON.stringify(header)));
    const encodedPayload = JwtVerifier.base64UrlEncode(Buffer.from(JSON.stringify(finalPayload)));
    const dataToSign = `${encodedHeader}.${encodedPayload}`;

    let signature;
    if (algorithm === 'HS256') {
      signature = crypto
        .createHmac('sha256', secretOrPrivateKey)
        .update(dataToSign)
        .digest();
    } else if (algorithm === 'RS256') {
      const sign = crypto.createSign('RSA-SHA256');
      sign.update(dataToSign);
      signature = sign.sign(secretOrPrivateKey);
    } else {
      throw new Error(`Unsupported algorithm: ${algorithm}`);
    }

    const encodedSignature = JwtVerifier.base64UrlEncode(signature);
    return `${dataToSign}.${encodedSignature}`;
  }

  /**
   * Verifies and decodes a JWT token with strict signature, expiry, issuer, and audience checks.
   */
  static verify(token, secretOrPublicKey, options = {}) {
    if (!token || typeof token !== 'string') {
      return { isValid: false, error: 'Token is missing or not a string' };
    }

    const parts = token.trim().split('.');
    if (parts.length !== 3) {
      return { isValid: false, error: 'Invalid JWT structure: expected 3 dot-separated parts' };
    }

    const [encodedHeader, encodedPayload, encodedSignature] = parts;

    let header;
    let payload;
    try {
      header = JSON.parse(JwtVerifier.base64UrlDecode(encodedHeader));
      payload = JSON.parse(JwtVerifier.base64UrlDecode(encodedPayload));
    } catch (e) {
      return { isValid: false, error: `Malformed JWT base64/JSON: ${e.message}` };
    }

    // 1. Algorithm check
    const algorithm = header.alg;
    if (options.algorithms && !options.algorithms.includes(algorithm)) {
      return { isValid: false, error: `Algorithm ${algorithm} not permitted by policy` };
    }

    // 2. Signature verification
    const dataToVerify = `${encodedHeader}.${encodedPayload}`;
    const signatureBuffer = Buffer.from(
      encodedSignature.replace(/-/g, '+').replace(/_/g, '/'),
      'base64'
    );

    let signatureValid = false;
    try {
      if (algorithm === 'HS256') {
        const expectedSig = crypto
          .createHmac('sha256', secretOrPublicKey)
          .update(dataToVerify)
          .digest();
        signatureValid = crypto.timingSafeEqual(signatureBuffer, expectedSig);
      } else if (algorithm === 'RS256') {
        const verifier = crypto.createVerify('RSA-SHA256');
        verifier.update(dataToVerify);
        signatureValid = verifier.verify(secretOrPublicKey, signatureBuffer);
      } else {
        return { isValid: false, error: `Unsupported JWT algorithm: ${algorithm}` };
      }
    } catch (sigErr) {
      return { isValid: false, error: `Signature verification exception: ${sigErr.message}` };
    }

    if (!signatureValid) {
      return { isValid: false, error: 'Invalid JWT signature' };
    }

    const now = Math.floor(Date.now() / 1000);

    // 3. Expiration check
    if (payload.exp && typeof payload.exp === 'number') {
      if (now > payload.exp) {
        return { isValid: false, error: `Token expired at ${new Date(payload.exp * 1000).toISOString()}` };
      }
    }

    // 4. Not-Before check
    if (payload.nbf && typeof payload.nbf === 'number') {
      if (now < payload.nbf) {
        return { isValid: false, error: 'Token not yet valid (nbf in future)' };
      }
    }

    // 5. Issuer check
    if (options.issuer) {
      const allowedIssuers = Array.isArray(options.issuer) ? options.issuer : [options.issuer];
      if (!payload.iss || !allowedIssuers.includes(payload.iss)) {
        return { isValid: false, error: `Invalid issuer: expected ${allowedIssuers.join(', ')}, got ${payload.iss}` };
      }
    }

    // 6. Audience check
    if (options.audience) {
      const allowedAudiences = Array.isArray(options.audience) ? options.audience : [options.audience];
      const tokenAud = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
      const match = tokenAud.some(a => allowedAudiences.includes(a));
      if (!match) {
        return { isValid: false, error: `Invalid audience: expected ${allowedAudiences.join(', ')}, got ${payload.aud}` };
      }
    }

    return {
      isValid: true,
      header,
      payload
    };
  }
}

export default JwtVerifier;
