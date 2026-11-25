import React from 'react';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { renderToString } from 'react-dom/server';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { ProtectedRoute } from '../ProtectedRoute';
import { TOKEN_KEY } from '../../../services/authService';

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

describe('ProtectedRoute Component (IDP-010 Route Guarding & RBAC UI)', () => {
  const mockStorage = new MockStorage();

  beforeEach(() => {
    mockStorage.clear();
    (globalThis as any).localStorage = mockStorage;
    (globalThis as any).window = globalThis;
  });

  afterEach(() => {
    mockStorage.clear();
  });

  it('1. Redirects unauthenticated visitor and blocks protected content', () => {
    const html = renderToString(
      <MemoryRouter initialEntries={['/overview']}>
        <Routes>
          <Route path="/login" element={<div>LOGIN_PAGE_RENDERED</div>} />
          <Route
            path="/overview"
            element={
              <ProtectedRoute>
                <div>PROTECTED_OVERVIEW_CONTENT</div>
              </ProtectedRoute>
            }
          />
        </Routes>
      </MemoryRouter>
    );

    // Unauthenticated user is redirected: protected content is strictly withheld
    expect(html).not.toContain('PROTECTED_OVERVIEW_CONTENT');
  });

  it('2. Renders protected child content when user is authenticated with required role', () => {
    const validExp = Math.floor(Date.now() / 1000) + 3600;
    const header = toB64Url({ alg: 'HS256', typ: 'JWT' });
    const payload = toB64Url({ exp: validExp, id: 'USR-CONS-01', role: 'CONSULTANT' });
    const validToken = `${header}.${payload}.fake_sig`;

    mockStorage.setItem(TOKEN_KEY, validToken);
    mockStorage.setItem('fiorify_auth_session', JSON.stringify({
      id: 'USR-CONS-01',
      email: 'consultant@fiorify.corp',
      name: 'Lead Consultant',
      role: 'CONSULTANT',
      token: validToken
    }));

    const html = renderToString(
      <MemoryRouter initialEntries={['/overview']}>
        <Routes>
          <Route
            path="/overview"
            element={
              <ProtectedRoute allowedRoles={['CONSULTANT', 'ADMIN']}>
                <div>PROTECTED_OVERVIEW_CONTENT</div>
              </ProtectedRoute>
            }
          />
        </Routes>
      </MemoryRouter>
    );

    expect(html).toContain('PROTECTED_OVERVIEW_CONTENT');
  });

  it('3. Renders 403 Forbidden screen when authenticated user lacks required role', () => {
    const validExp = Math.floor(Date.now() / 1000) + 3600;
    const header = toB64Url({ alg: 'HS256', typ: 'JWT' });
    const payload = toB64Url({ exp: validExp, id: 'USR-VIEW-01', role: 'VIEWER' });
    const validToken = `${header}.${payload}.fake_sig`;

    mockStorage.setItem(TOKEN_KEY, validToken);
    mockStorage.setItem('fiorify_auth_session', JSON.stringify({
      id: 'USR-VIEW-01',
      email: 'viewer@fiorify.corp',
      name: 'Viewer',
      role: 'VIEWER',
      token: validToken
    }));

    const html = renderToString(
      <MemoryRouter initialEntries={['/system-configuration']}>
        <Routes>
          <Route
            path="/system-configuration"
            element={
              <ProtectedRoute allowedRoles={['ADMIN']}>
                <div>SECRET_ADMIN_CONFIGURATION</div>
              </ProtectedRoute>
            }
          />
        </Routes>
      </MemoryRouter>
    );

    expect(html).toContain('Access Restricted (403 Forbidden)');
    expect(html).toContain('VIEWER');
    expect(html).not.toContain('SECRET_ADMIN_CONFIGURATION');
  });
});
