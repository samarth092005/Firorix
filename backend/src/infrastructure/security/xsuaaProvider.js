import { JwtVerifier } from './jwtVerifier.js';
import { ROLE_PERMISSIONS, USER_ROLES } from '../../services/authService.js';

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

  getName() {
    return 'SAP_BTP_XSUAA';
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

    if (!binding && (process.env.XSUAA_CLIENT_ID || process.env.XSUAA_VERIFICATION_KEY)) {
      binding = {
        clientid: process.env.XSUAA_CLIENT_ID || 'fiorify-app-client',
        clientsecret: process.env.XSUAA_CLIENT_SECRET,
        url: process.env.XSUAA_URL || 'https://uaa.cf.sap.hana.ondemand.com',
        identityzone: process.env.XSUAA_IDENTITY_ZONE || 'fiorify-zone',
        verificationkey: process.env.XSUAA_VERIFICATION_KEY,
        xsappname: process.env.XSUAA_APP_NAME || process.env.XSUAA_XSAPPNAME || 'Fiorify'
      };
    }

    if (binding && (binding.clientid || binding.xsappname) && (binding.verificationkey || binding.url)) {
      this.config = {
        clientId: binding.clientid,
        clientSecret: binding.clientsecret,
        authUrl: binding.url,
        identityZone: binding.identityzone || 'default',
        verificationKey: binding.verificationkey || null,
        xsappName: binding.xsappname || 'Fiorify'
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
      xsappName: this.config?.xsappName || null,
      authUrl: this.config?.authUrl || null,
      identityZone: this.config?.identityZone || null,
      hasVerificationKey: Boolean(this.config?.verificationKey)
    };
  }

  /**
   * Resolves Fiorify application role and enterprise permissions from XSUAA token scopes.
   */
  mapScopesToRole(rawScopes = []) {
    const scopes = Array.isArray(rawScopes) ? rawScopes : [];
    const hasScope = (name) => scopes.some((s) => (
      s === name ||
      s.endsWith(`.${name}`) ||
      s.toLowerCase().endsWith(`.${name.toLowerCase()}`) ||
      s.toLowerCase().includes(`.${name.toLowerCase()}`)
    ));

    if (hasScope('FiorifyAdmin') || hasScope('Admin')) {
      return {
        role: USER_ROLES.ADMIN,
        permissions: ROLE_PERMISSIONS[USER_ROLES.ADMIN] || []
      };
    }
    if (hasScope('FiorifyArchitect') || hasScope('Architect')) {
      return {
        role: USER_ROLES.SAP_CONSULTANT,
        permissions: ROLE_PERMISSIONS[USER_ROLES.SAP_CONSULTANT] || []
      };
    }
    if (hasScope('FiorifyApprover') || hasScope('Approver')) {
      return {
        role: USER_ROLES.APPROVER,
        permissions: ROLE_PERMISSIONS[USER_ROLES.APPROVER] || []
      };
    }
    // Default safe role: VIEWER with minimum read privileges
    return {
      role: USER_ROLES.VIEWER,
      permissions: ROLE_PERMISSIONS[USER_ROLES.VIEWER] || []
    };
  }

  /**
   * Validates XSUAA issued JWT token cryptographically and extracts identity context.
   */
  async validateToken(token, options = {}) {
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

    const verifyOpts = {
      algorithms: ['RS256'],
      requireExp: true,
      ...options
    };

    // If audience check is not disabled in options, validate audience
    if (!options.skipAudienceCheck && this.config.clientId) {
      const allowedAudiences = [
        this.config.clientId,
        this.config.xsappName,
        `${this.config.xsappName}!b1`,
        `${this.config.xsappName}!t1`
      ];
      if (options.audience) {
        allowedAudiences.push(...(Array.isArray(options.audience) ? options.audience : [options.audience]));
      }
      verifyOpts.audience = allowedAudiences;
    }

    const result = JwtVerifier.verify(token, this.config.verificationKey, verifyOpts);
    if (!result.isValid) {
      return result;
    }

    const payload = result.payload;
    const tokenScopes = Array.isArray(payload.scope)
      ? payload.scope
      : (Array.isArray(payload.scopes) ? payload.scopes : []);

    const roleMapping = this.mapScopesToRole(tokenScopes);

    // Resolve user identity from standard XSUAA claims
    const userId = payload.user_name || payload.user_id || payload.sub || 'xsuaa-user';
    const email = payload.email || payload.mail || `${userId}@fiorify.corp`;
    const givenName = payload.given_name || '';
    const familyName = payload.family_name || '';
    const fullName = (givenName || familyName)
      ? `${givenName} ${familyName}`.trim()
      : (payload.name || userId);

    // Resolve tenant context strictly from trusted XSUAA token claims
    const tenantId = (payload['xs.user.attributes']?.tenantId && payload['xs.user.attributes'].tenantId[0]) ||
      payload.ext_attr?.zdn ||
      payload.zid ||
      'DEFAULT-TENANT-S21';

    const user = {
      id: userId,
      email,
      name: fullName,
      role: roleMapping.role,
      tenantId,
      department: payload['xs.user.attributes']?.department?.[0] || 'Enterprise Architecture & Cloud Governance',
      scopes: roleMapping.permissions,
      isXsuaa: true,
      authProvider: 'SAP_BTP_XSUAA'
    };

    return {
      isValid: true,
      user,
      payload,
      header: result.header
    };
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
