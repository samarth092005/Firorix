import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { authService, TOKEN_KEY } from '../authService';

class MockStorage {
  private store: Record<string, string> = {};
  getItem(key: string) { return this.store[key] ?? null; }
  setItem(key: string, value: string) { this.store[key] = String(value); }
  removeItem(key: string) { delete this.store[key]; }
  clear() { this.store = {}; }
}

const toB64Url = (obj: any): string => {
  const str = JSON.stringify(obj);
  const buf = (globalThis as any).Buffer;
  if (buf) {
    return buf.from(str).toString('base64url');
  }
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};

describe('authService (Frontend Enterprise Auth & Identity)', () => {
  const originalFetch = globalThis.fetch;
  const mockStorage = new MockStorage();

  beforeEach(() => {
    mockStorage.clear();
    (globalThis as any).localStorage = mockStorage;
    (globalThis as any).window = globalThis;
    vi.restoreAllMocks();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    mockStorage.clear();
  });

  it('1. getUser() returns null when no session is present (no default admin fallback)', () => {
    expect(authService.getUser()).toBeNull();
    expect(authService.getToken()).toBeNull();
    expect(authService.isAuthenticated()).toBe(false);
  });

  it('2. isAuthenticated() returns false when token is expired', () => {
    const expiredExp = Math.floor(Date.now() / 1000) - 3600; // 1 hour in past
    const header = toB64Url({ alg: 'HS256', typ: 'JWT' });
    const payload = toB64Url({ exp: expiredExp, id: 'USR-01', role: 'VIEWER' });
    const expiredToken = `${header}.${payload}.fake_sig`;

    mockStorage.setItem(TOKEN_KEY, expiredToken);
    mockStorage.setItem('fiorify_auth_session', JSON.stringify({
      id: 'USR-01',
      email: 'viewer@fiorify.corp',
      name: 'Viewer',
      role: 'VIEWER',
      token: expiredToken
    }));

    expect(authService.isAuthenticated()).toBe(false);
    expect(authService.getUser()).toBeNull();
  });

  it('3. isAuthenticated() returns true when valid unexpired token and user exist', () => {
    const validExp = Math.floor(Date.now() / 1000) + 3600; // 1 hour in future
    const header = toB64Url({ alg: 'HS256', typ: 'JWT' });
    const payload = toB64Url({ exp: validExp, id: 'USR-CONS-01', role: 'SAP_CONSULTANT' });
    const validToken = `${header}.${payload}.fake_sig`;

    mockStorage.setItem(TOKEN_KEY, validToken);
    mockStorage.setItem('fiorify_auth_session', JSON.stringify({
      id: 'USR-CONS-01',
      email: 'consultant@fiorify.corp',
      name: 'Lead Consultant',
      role: 'SAP_CONSULTANT',
      token: validToken
    }));

    expect(authService.isAuthenticated()).toBe(true);
    const user = authService.getUser();
    expect(user).not.toBeNull();
    expect(user?.role).toBe('SAP_CONSULTANT');
  });

  it('4. login() throws on missing email or password without making network call', async () => {
    await expect(authService.login('', 'pass')).rejects.toThrow('Please provide a valid SAP User ID or Email');
    await expect(authService.login('admin@fiorify.corp', '')).rejects.toThrow('Please enter your password');
  });

  it('5. login() throws on API 401 error and does NOT fabricate an admin user', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          success: false,
          error: 'INVALID_CREDENTIALS',
          errorMessage: 'Invalid user credentials'
        }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      )
    );

    await expect(authService.login('admin@fiorify.corp', 'wrongpass')).rejects.toThrow('Invalid user credentials');
    expect(authService.getUser()).toBeNull();
    expect(authService.isAuthenticated()).toBe(false);
    expect(mockStorage.getItem(TOKEN_KEY)).toBeNull();
  });

  it('6. loginWithDemo() explicitly tags session as isDemo: true', async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('Backend offline in test'));

    const demoUser = await authService.loginWithDemo('CONSULTANT');
    expect(demoUser.isDemo).toBe(true);
    expect(demoUser.role).toBe('CONSULTANT');
    expect(authService.isAuthenticated()).toBe(true);
  });

  it('7. logout() revokes session and purges local storage', () => {
    mockStorage.setItem(TOKEN_KEY, 'active_token');
    mockStorage.setItem('fiorify_auth_session', JSON.stringify({
      id: 'USR-01',
      role: 'ADMIN',
      token: 'active_token'
    }));

    authService.logout();

    expect(mockStorage.getItem(TOKEN_KEY)).toBeNull();
    expect(mockStorage.getItem('fiorify_auth_session')).toBeNull();
    expect(authService.getUser()).toBeNull();
    expect(authService.isAuthenticated()).toBe(false);
  });
});
