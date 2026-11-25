/**
 * Fiorify Demonstration & Synthetic Sandbox Authentication Provider (IDP-008)
 *
 * Implements isolated, synthetic demo persona authentication with clear visual
 * and architectural markers (isDemo: true) to prevent demo credentials from being
 * used in production or mistaken for live enterprise access.
 */

import { JwtVerifier } from './jwtVerifier.js';
import { USER_ROLES, ROLE_PERMISSIONS } from '../../services/authService.js';

export const DEMO_PERSONAS = Object.freeze([
  {
    id: 'DEMO-ADMIN-01',
    email: 'admin@fiorify.corp',
    name: 'Demo Enterprise Administrator',
    role: USER_ROLES.ADMIN,
    department: 'SAP Architecture Board (Sandbox)',
    tenantId: 'DEMO-SANDBOX-S21',
    isDemo: true
  },
  {
    id: 'DEMO-CONS-01',
    email: 'consultant@fiorify.corp',
    name: 'Demo Lead SAP Consultant',
    role: USER_ROLES.SAP_CONSULTANT,
    department: 'SAP Digital Transformation (Sandbox)',
    tenantId: 'DEMO-SANDBOX-S21',
    isDemo: true
  },
  {
    id: 'DEMO-APPR-01',
    email: 'approver@fiorify.corp',
    name: 'Demo Governance Board Approver',
    role: USER_ROLES.APPROVER,
    department: 'Enterprise Governance Committee (Sandbox)',
    tenantId: 'DEMO-SANDBOX-S21',
    isDemo: true
  },
  {
    id: 'DEMO-ARCH-01',
    email: 'architect@fiorify.corp',
    name: 'Demo Lead Enterprise Architect',
    role: USER_ROLES.LEAD_ARCHITECT,
    department: 'Enterprise Architecture Board (Sandbox)',
    tenantId: 'DEMO-SANDBOX-S21',
    isDemo: true
  },
  {
    id: 'DEMO-VIEW-01',
    email: 'viewer@fiorify.corp',
    name: 'Demo Compliance Viewer',
    role: USER_ROLES.VIEWER,
    department: 'Internal Audit & Reporting (Sandbox)',
    tenantId: 'DEMO-SANDBOX-S21',
    isDemo: true
  }
]);

export class DemoAuthenticationProvider {
  constructor(options = {}) {
    this.options = options;
    this.jwtSecret = options.jwtSecret || process.env.FIORIFY_JWT_SECRET || 'fiorify-demo-sandbox-secret-2026';
    this.tokenTtlSeconds = options.tokenTtlSeconds || 12 * 3600; // 12h
    this.personas = new Map(
      (options.personas || DEMO_PERSONAS).map((p) => [p.email.toLowerCase(), { ...p }])
    );
  }

  getName() {
    return 'DEMO_SANDBOX';
  }

  getStatus() {
    const isProduction = process.env.NODE_ENV === 'production';
    const allowDemoInProd = process.env.FIORIFY_ALLOW_DEMO_AUTH === 'true';
    return {
      provider: 'DEMO_SANDBOX',
      status: (!isProduction || allowDemoInProd) ? 'ACTIVE' : 'BLOCKED_IN_PRODUCTION',
      configured: !isProduction || allowDemoInProd,
      demoTenantId: 'DEMO-SANDBOX-S21',
      personasAvailable: this.personas.size,
      synthetic: true
    };
  }

  assertProductionReadiness() {
    const isProduction = process.env.NODE_ENV === 'production';
    const allowDemoInProd = process.env.FIORIFY_ALLOW_DEMO_AUTH === 'true';
    if (isProduction && !allowDemoInProd) {
      const err = new Error(
        'SECURITY INVARIANT VIOLATION: Demo sandbox authentication provider is disabled in production environments. ' +
        'Set FIORIFY_ALLOW_DEMO_AUTH=true only on isolated demo instances.'
      );
      err.code = 'SECURITY_MISCONFIGURATION';
      throw err;
    }
    return true;
  }

  /**
   * Authenticate demo persona
   */
  async authenticate(identifier, password) {
    this.assertProductionReadiness();

    const cleanId = String(identifier || 'admin@fiorify.corp').trim().toLowerCase();
    let persona = this.personas.get(cleanId);
    if (!persona) {
      for (const p of this.personas.values()) {
        if (
          p.email.toLowerCase() === cleanId ||
          p.email.toLowerCase().startsWith(cleanId + '@') ||
          p.id.toLowerCase() === cleanId ||
          p.role.toLowerCase() === cleanId
        ) {
          persona = p;
          break;
        }
      }
    }

    if (!persona) {
      // Default to demo admin for quick exploration in sandbox
      persona = this.personas.get('admin@fiorify.corp') || DEMO_PERSONAS[0];
    }

    const payload = {
      id: persona.id,
      email: persona.email,
      name: persona.name,
      role: persona.role,
      tenantId: persona.tenantId || 'DEMO-SANDBOX-S21',
      department: persona.department,
      scopes: ROLE_PERMISSIONS[persona.role] || [],
      isDemo: true,
      authProvider: 'DEMO_SANDBOX'
    };

    const token = JwtVerifier.sign(payload, this.jwtSecret, {
      expiresInSeconds: this.tokenTtlSeconds,
      issuer: 'https://fiorify.corp/demo-auth',
      audience: 'fiorify-demo-platform'
    });

    return {
      success: true,
      token,
      user: {
        ...persona,
        isDemo: true
      },
      expiresAt: new Date(Date.now() + this.tokenTtlSeconds * 1000).toISOString()
    };
  }

  /**
   * Validate token
   */
  async validateToken(token, options = {}) {
    this.assertProductionReadiness();

    const verifyOpts = {
      algorithms: ['HS256'],
      issuer: options.issuer || 'https://fiorify.corp/demo-auth',
      audience: options.audience || 'fiorify-demo-platform',
      ...options
    };

    const result = JwtVerifier.verify(token, this.jwtSecret, verifyOpts);
    if (!result.isValid) {
      return result;
    }

    const payload = result.payload;
    const user = {
      id: payload.id,
      email: payload.email,
      name: payload.name,
      role: payload.role,
      tenantId: payload.tenantId || 'DEMO-SANDBOX-S21',
      department: payload.department,
      scopes: payload.scopes || ROLE_PERMISSIONS[payload.role] || [],
      isDemo: true,
      authProvider: 'DEMO_SANDBOX'
    };

    return {
      isValid: true,
      user,
      payload,
      header: result.header
    };
  }
}

export const defaultDemoAuthProvider = new DemoAuthenticationProvider();
export default defaultDemoAuthProvider;
