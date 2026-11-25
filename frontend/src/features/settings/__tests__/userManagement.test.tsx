import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderToString } from 'react-dom/server';
import { UserManagementSection } from '../UserManagementSection';
import { apiClient } from '../../../services/api/apiClient';

describe('UserManagementSection Component (UI-003 Admin User Management)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('1. Does not render for non-ADMIN users (RBAC gate)', () => {
    const html = renderToString(
      <UserManagementSection currentUserRole="DEVELOPER" />
    );
    expect(html).toBe('');
    expect(html).not.toContain('Enterprise User Administration');
  });

  it('2. Renders administrative card and controls when user is ADMIN', () => {
    const html = renderToString(
      <UserManagementSection currentUserRole="ADMIN" />
    );
    expect(html).toContain('Enterprise User Administration');
    expect(html).toContain('user-management-section');
    expect(html).toContain('Refresh');
    expect(html).toContain('Add User');
  });

  it('3. ApiClient exposes listAdminUsers, createAdminUser, and updateAdminUserRole', async () => {
    expect(typeof apiClient.listAdminUsers).toBe('function');
    expect(typeof apiClient.createAdminUser).toBe('function');
    expect(typeof apiClient.updateAdminUserRole).toBe('function');
  });

  it('4. ApiClient routes admin user management requests through /admin/users', async () => {
    const mockGet = vi.spyOn(apiClient, 'get').mockResolvedValueOnce({
      success: true,
      count: 2,
      users: [
        { id: 'U-001', name: 'Alice Admin', email: 'alice@fiorify.corp', role: 'ADMIN' },
        { id: 'U-002', name: 'Bob Dev', email: 'bob@fiorify.corp', role: 'DEVELOPER' }
      ]
    });

    const mockPost = vi.spyOn(apiClient, 'post').mockResolvedValueOnce({
      success: true,
      user: { id: 'U-003', name: 'Charlie Architect', email: 'charlie@fiorify.corp', role: 'ARCHITECT' }
    });

    const mockPut = vi.spyOn(apiClient, 'put').mockResolvedValueOnce({
      success: true,
      user: { id: 'U-002', role: 'SECURITY_LEAD' }
    });

    const listRes = await apiClient.listAdminUsers();
    expect(mockGet).toHaveBeenCalledWith('/admin/users', undefined);
    expect(listRes.users).toHaveLength(2);

    const createRes = await apiClient.createAdminUser({
      name: 'Charlie Architect',
      email: 'charlie@fiorify.corp',
      role: 'ARCHITECT'
    });
    expect(mockPost).toHaveBeenCalledWith('/admin/users', {
      name: 'Charlie Architect',
      email: 'charlie@fiorify.corp',
      role: 'ARCHITECT'
    }, undefined);
    expect(createRes.success).toBe(true);

    const updateRes = await apiClient.updateAdminUserRole('U-002', 'SECURITY_LEAD');
    expect(mockPut).toHaveBeenCalledWith('/admin/users/U-002/role', { role: 'SECURITY_LEAD' }, undefined);
    expect(updateRes.success).toBe(true);
  });
});
