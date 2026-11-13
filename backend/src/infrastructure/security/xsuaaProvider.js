import { JwtVerifier } from './jwtVerifier.js';

/**
 * Fiorify SAP BTP Authorization and Trust Management (XSUAA) Provider
 *
 * Implements authentication provider integration with SAP BTP XSUAA service.
 * In SAP BTP Cloud Foundry, service bindings are exposed through the VCAP_SERVICES environment variable.
 */
export class XsuaaAuthenticationProvider {
  constructor(options = {}) {
    this.options = options;
    this.status = 'NOT_CONFIGURED';
    this.config = null;
    this.initialize();
  }

  initialize() {
    let binding = this.options.xsuaaBinding;

    if (!binding && process.env.VCAP_SERVICES) {
      try {
        const vcap = JSON.parse(process.env.VCAP_SERVICES);
        if (vcap.xsuaa && vcap.xsuaa.length > 0) {
          binding = vcap.xsuaa[0].credentials;
        }
      } catch (e) {
        console.warn('[XsuaaProvider] Failed to parse VCAP_SERVICES:', e.message);
      }
    }

    if (!binding && process.env.XSUAA_CLIENT_ID && process.env.XSUAA_CLIENT_SECRET) {
      binding = {
        clientid: process.env.XSUAA_CLIENT_ID,
        clientsecret: process.env.XSUAA_CLIENT_SECRET,
        url: process.env.XSUAA_URL,
        identityzone: process.env.XSUAA_IDENTITY_ZONE || 'Fiorify-zone',
        verificationkey: process.env.XSUAA_VERIFICATION_KEY
      };
    }

    if (binding && binding.clientid && binding.url) {
      this.config = {
        clientId: binding.clientid,
        clientSecret: binding.clientsecret,
        authUrl: binding.url,
        identityZone: binding.identityzone || 'default',
        verificationKey: binding.verificationkey || null
      };
      this.status = 'CONFIGURED';
    } else {
      this.status = 'NOT_CONFIGURED';
      this.config = null;
    }
  }

  getStatus() {
    return {
      provider: 'SAP_BTP_XSUAA',
      status: this.status,
      configured: this.status === 'CONFIGURED',
      clientId: this.config?.clientId ? `${this.config.clientId.slice(0, 6)}...` : null,
      authUrl: this.config?.authUrl || null,
      identityZone: this.config?.identityZone || null,
      hasVerificationKey: Boolean(this.config?.verificationKey)
    };
  }

  /**
   * Validates XSUAA issued JWT token
   */
  async validateToken(token) {
    if (this.status !== 'CONFIGURED') {
      return {
        isValid: false,
        error: 'XSUAA service binding is not configured in this environment.'
      };
    }

    if (!this.config.verificationKey) {
      return {
        isValid: false,
        error: 'XSUAA verification key is missing. Token validation requires public key or JWKS endpoint.'
      };
    }

    return JwtVerifier.verify(token, this.config.verificationKey, {
      algorithms: ['RS256'],
      audience: this.config.clientId
    });
  }

  /**
   * Enforces production startup safety
   */
  assertProductionReadiness() {
    const isProduction = process.env.NODE_ENV === 'production';
    if (isProduction && this.status !== 'CONFIGURED') {
      const err = new Error(
        'CRITICAL: Production deployment requires bound SAP BTP XSUAA service or an explicit enterprise OIDC provider. ' +
        'Local development authentication mode is strictly forbidden in production.'
      );
      err.code = 'SECURITY_MISCONFIGURATION';
      throw err;
    }
    return true;
  }
}

export const defaultXsuaaProvider = new XsuaaAuthenticationProvider();
export default defaultXsuaaProvider;
