/**
 * Fiorify Centralized Authentication Provider Factory (AUTH-001)
 *
 * Implements deterministic provider selection based on environment configuration:
 * - SAP_BTP_XSUAA: Required for production SAP BTP Cloud Foundry environments.
 * - LOCAL_AUTH: Asynchronous scrypt & JWT for local engineering / test environments.
 * - DEMO_SANDBOX: Isolated synthetic demo mode with explicit sandbox tagging.
 *
 * Invariant: Production never falls back to local or demo authentication silently.
 */

import { XsuaaAuthenticationProvider, defaultXsuaaProvider } from './xsuaaProvider.js';
import { LocalAuthenticationProvider, defaultLocalAuthProvider } from './localAuthProvider.js';
import { DemoAuthenticationProvider, defaultDemoAuthProvider } from './demoAuthProvider.js';

export class AuthProviderFactory {
  constructor(options = {}) {
    this.options = options;
    this.xsuaaProvider = options.xsuaaProvider || defaultXsuaaProvider;
    this.localProvider = options.localProvider || defaultLocalAuthProvider;
    this.demoProvider = options.demoProvider || defaultDemoAuthProvider;
    this._activeProvider = null;
  }

  /**
   * Resolves the configured provider name from environment or options
   */
  resolveProviderName() {
    if (this.options.providerName) {
      return this.options.providerName.toUpperCase();
    }

    const isProduction = process.env.NODE_ENV === 'production';
    const envProvider = (process.env.FIORIFY_AUTH_PROVIDER || process.env.AUTH_PROVIDER || '').toUpperCase();

    // In production, XSUAA is strictly mandatory. LOCAL and DEMO are strictly prohibited.
    if (isProduction) {
      if (envProvider === 'DEMO' || envProvider === 'DEMO_SANDBOX') {
        const err = new Error(
          'CRITICAL SECURITY CONFIGURATION ERROR: FIORIFY_AUTH_PROVIDER=DEMO is strictly prohibited in production. ' +
          'Production deployments require bound SAP BTP XSUAA service.'
        );
        err.code = 'SECURITY_MISCONFIGURATION';
        throw err;
      }
      if (envProvider === 'LOCAL' || envProvider === 'LOCAL_AUTH') {
        const err = new Error(
          'CRITICAL SECURITY CONFIGURATION ERROR: FIORIFY_AUTH_PROVIDER=LOCAL is strictly prohibited in production. ' +
          'Production deployments require bound SAP BTP XSUAA service.'
        );
        err.code = 'SECURITY_MISCONFIGURATION';
        throw err;
      }
      return 'SAP_BTP_XSUAA';
    }

    // In development / testing:
    if (envProvider === 'XSUAA' || envProvider === 'SAP_BTP_XSUAA') {
      return 'SAP_BTP_XSUAA';
    }
    if (envProvider === 'DEMO' || envProvider === 'DEMO_SANDBOX') {
      return 'DEMO_SANDBOX';
    }
    if (envProvider === 'LOCAL' || envProvider === 'LOCAL_AUTH') {
      return 'LOCAL_AUTH';
    }

    // Auto-detect based on VCAP_SERVICES binding presence
    if (process.env.VCAP_SERVICES) {
      try {
        const vcap = JSON.parse(process.env.VCAP_SERVICES);
        if (vcap.xsuaa && vcap.xsuaa.length > 0) {
          return 'SAP_BTP_XSUAA';
        }
      } catch {}
    }

    return 'LOCAL_AUTH';
  }

  /**
   * Retrieves the active authentication provider instance
   */
  getActiveProvider() {
    const providerName = this.resolveProviderName();
    switch (providerName) {
      case 'SAP_BTP_XSUAA':
        return this.xsuaaProvider;
      case 'DEMO_SANDBOX':
        return this.demoProvider;
      case 'LOCAL_AUTH':
      default:
        return this.localProvider;
    }
  }

  /**
   * Validates token across active provider with fail-closed security
   */
  async validateToken(token, options = {}) {
    const active = this.getActiveProvider();
    const result = await active.validateToken(token, options);
    if (result.isValid) {
      return result;
    }

    // In non-production or when demo/staging auth is explicitly opted in, allow demo token validation
    const isProduction = process.env.NODE_ENV === 'production';
    const allowDemo = process.env.FIORIFY_ALLOW_DEMO_AUTH === 'true' || process.env.FIORIFY_STAGING_AUTH_OPT_IN === 'true';
    if ((!isProduction || allowDemo) && active.getName() !== 'DEMO_SANDBOX') {
      const demoResult = await this.demoProvider.validateToken(token, options);
      if (demoResult.isValid) {
        return demoResult;
      }
    }

    return result;
  }

  /**
   * Returns diagnostic status of all providers and indicates active selection
   */
  getStatus() {
    const activeName = this.resolveProviderName();
    return {
      activeProvider: activeName,
      isProduction: process.env.NODE_ENV === 'production',
      providers: {
        xsuaa: this.xsuaaProvider.getStatus(),
        local: this.localProvider.getStatus(),
        demo: this.demoProvider.getStatus()
      }
    };
  }

  /**
   * Enforces fail-closed production readiness check
   */
  assertProductionReadiness() {
    const isProduction = process.env.NODE_ENV === 'production';
    if (isProduction) {
      const active = this.getActiveProvider();
      if (active.getName() === 'SAP_BTP_XSUAA') {
        this.xsuaaProvider.assertProductionReadiness();
      } else {
        const err = new Error(
          `CRITICAL: Unauthorized auth provider "${active.getName()}" active in production. ` +
          'Production deployments require bound SAP BTP XSUAA service.'
        );
        err.code = 'SECURITY_MISCONFIGURATION';
        throw err;
      }
    }
    return true;
  }
}

export const defaultAuthProviderFactory = new AuthProviderFactory();
export default defaultAuthProviderFactory;
