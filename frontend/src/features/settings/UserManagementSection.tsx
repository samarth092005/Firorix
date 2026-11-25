import React, { useState, useEffect, useCallback } from 'react';
import { Users, UserPlus, Shield, Check, AlertCircle, RefreshCw } from 'lucide-react';
import { apiClient } from '../../services/api/apiClient';
import { MessageStrip } from '../../components/status/MessageStrip';

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: string;
  department?: string;
  tenantId?: string;
  status?: string;
  createdAt?: string;
}

const AVAILABLE_ROLES = [
  'ADMIN',
  'ARCHITECT',
  'DEVELOPER',
  'BUSINESS_ANALYST',
  'SECURITY_LEAD',
  'VIEWER'
];

interface UserManagementSectionProps {
  currentUserRole?: string;
}

export const UserManagementSection: React.FC<UserManagementSectionProps> = ({ currentUserRole = 'ADMIN' }) => {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // New user form state
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState('DEVELOPER');
  const [newDepartment, setNewDepartment] = useState('SAP Modernization Team');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Per-user role editing state
  const [selectedRoles, setSelectedRoles] = useState<Record<string, string>>({});
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);

  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await apiClient.listAdminUsers();
      if (res && res.users) {
        setUsers(res.users);
        const rolesMap: Record<string, string> = {};
        res.users.forEach((u: AdminUser) => {
          rolesMap[u.id] = u.role;
        });
        setSelectedRoles(rolesMap);
      }
    } catch (err: any) {
      console.error('[UserManagement] Failed to fetch users:', err);
      setError(err?.message || 'Failed to retrieve enterprise user directory.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (currentUserRole === 'ADMIN') {
      fetchUsers();
    }
  }, [currentUserRole, fetchUsers]);

  if (currentUserRole !== 'ADMIN') {
    return null;
  }

  const handleRoleChange = (userId: string, role: string) => {
    setSelectedRoles(prev => ({ ...prev, [userId]: role }));
  };

  const handleUpdateRole = async (userId: string) => {
    const role = selectedRoles[userId];
    if (!role) return;

    setUpdatingUserId(userId);
    setError(null);
    setSuccessMessage(null);
    try {
      await apiClient.updateAdminUserRole(userId, role);
      setSuccessMessage(`Role successfully updated for user ${userId}.`);
      setUsers(prev => prev.map(u => (u.id === userId ? { ...u, role } : u)));
    } catch (err: any) {
      setError(err?.message || `Failed to update role for user ${userId}.`);
    } finally {
      setUpdatingUserId(null);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newEmail.trim()) {
      setError('Name and email are required.');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setSuccessMessage(null);
    try {
      const res = await apiClient.createAdminUser({
        name: newName.trim(),
        email: newEmail.trim(),
        role: newRole,
        department: newDepartment.trim()
      });
      setSuccessMessage(`User ${res.user?.email || newEmail} successfully provisioned.`);
      setNewName('');
      setNewEmail('');
      setShowAddForm(false);
      await fetchUsers();
    } catch (err: any) {
      setError(err?.message || 'Failed to provision enterprise user.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fiori-card" data-testid="user-management-section">
      <div className="fiori-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div className="fiori-card-title">
          <Users size={16} color="var(--fiori-blue-dark)" /> Enterprise User Administration
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            type="button"
            className="fiori-btn fiori-btn-secondary"
            onClick={fetchUsers}
            disabled={isLoading}
            title="Refresh user directory"
            aria-label="Refresh user directory"
          >
            <RefreshCw size={13} className={isLoading ? 'animate-spin' : ''} /> Refresh
          </button>
          <button
            type="button"
            className="fiori-btn fiori-btn-primary"
            onClick={() => setShowAddForm(!showAddForm)}
            aria-expanded={showAddForm}
          >
            <UserPlus size={13} /> {showAddForm ? 'Cancel' : 'Add User'}
          </button>
        </div>
      </div>

      <div className="fiori-card-body" style={{ fontSize: '13px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <p style={{ color: 'var(--fiori-text-secondary)', margin: 0, lineHeight: 1.5 }}>
          Manage user profiles, assign RBAC personas, and govern tenant authorization. Changes are strictly persisted and audited via backend governance APIs.
        </p>

        {error && (
          <MessageStrip type="error">{error}</MessageStrip>
        )}

        {successMessage && (
          <MessageStrip type="success">{successMessage}</MessageStrip>
        )}

        {/* Add User Drawer / Form */}
        {showAddForm && (
          <form
            onSubmit={handleCreateUser}
            data-testid="create-user-form"
            style={{
              padding: '16px',
              backgroundColor: 'var(--fiori-bg-light, #f8f9fa)',
              border: '1px solid var(--fiori-border, #e5e7eb)',
              borderRadius: '4px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px'
            }}
          >
            <h4 style={{ margin: '0 0 6px 0', fontSize: '14px', fontWeight: 600 }}>Provision New Enterprise User</h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px', fontWeight: 500 }}>
                  Full Name <span style={{ color: 'red' }}>*</span>
                </label>
                <input
                  type="text"
                  className="fiori-input"
                  style={{ width: '100%', padding: '6px 8px', fontSize: '13px' }}
                  placeholder="e.g. Elena Rostova"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px', fontWeight: 500 }}>
                  Enterprise Email <span style={{ color: 'red' }}>*</span>
                </label>
                <input
                  type="email"
                  className="fiori-input"
                  style={{ width: '100%', padding: '6px 8px', fontSize: '13px' }}
                  placeholder="e.g. elena@fiorify.corp"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px', fontWeight: 500 }}>
                  Role Persona
                </label>
                <select
                  className="fiori-input"
                  style={{ width: '100%', padding: '6px 8px', fontSize: '13px' }}
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value)}
                >
                  {AVAILABLE_ROLES.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px', fontWeight: 500 }}>
                  Department / Unit
                </label>
                <input
                  type="text"
                  className="fiori-input"
                  style={{ width: '100%', padding: '6px 8px', fontSize: '13px' }}
                  placeholder="e.g. SAP Finance COE"
                  value={newDepartment}
                  onChange={(e) => setNewDepartment(e.target.value)}
                />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '6px' }}>
              <button
                type="button"
                className="fiori-btn fiori-btn-secondary"
                onClick={() => setShowAddForm(false)}
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="fiori-btn fiori-btn-primary"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Provisioning...' : 'Provision User'}
              </button>
            </div>
          </form>
        )}

        {/* Users Table */}
        <div className="fiori-table-container" style={{ overflowX: 'auto' }}>
          {isLoading ? (
            <div style={{ padding: '24px', textAlign: 'center', color: 'var(--fiori-text-secondary)' }} aria-busy="true">
              Loading enterprise user directory...
            </div>
          ) : users.length === 0 ? (
            <div style={{ padding: '24px', textAlign: 'center', color: 'var(--fiori-text-secondary)' }}>
              No users registered in directory.
            </div>
          ) : (
            <table className="fiori-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--fiori-border, #e5e7eb)', textAlign: 'left' }}>
                  <th style={{ padding: '8px 12px', fontWeight: 600 }}>User</th>
                  <th style={{ padding: '8px 12px', fontWeight: 600 }}>Email</th>
                  <th style={{ padding: '8px 12px', fontWeight: 600 }}>Department</th>
                  <th style={{ padding: '8px 12px', fontWeight: 600 }}>Tenant</th>
                  <th style={{ padding: '8px 12px', fontWeight: 600 }}>Role</th>
                  <th style={{ padding: '8px 12px', fontWeight: 600, textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => {
                  const currentSelectedRole = selectedRoles[u.id] || u.role;
                  const hasRoleChanged = currentSelectedRole !== u.role;
                  const isUpdating = updatingUserId === u.id;

                  return (
                    <tr key={u.id} style={{ borderBottom: '1px solid var(--fiori-border-subtle, #f0f0f0)' }}>
                      <td style={{ padding: '8px 12px', fontWeight: 500 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Shield size={14} color="var(--fiori-teal, #0070f3)" />
                          <span>{u.name}</span>
                        </div>
                      </td>
                      <td style={{ padding: '8px 12px' }}>
                        <code>{u.email}</code>
                      </td>
                      <td style={{ padding: '8px 12px', color: 'var(--fiori-text-secondary)' }}>
                        {u.department || '—'}
                      </td>
                      <td style={{ padding: '8px 12px' }}>
                        <span style={{ fontSize: '11px', padding: '2px 6px', background: '#eef2ff', borderRadius: '3px' }}>
                          {u.tenantId || 'DEFAULT'}
                        </span>
                      </td>
                      <td style={{ padding: '8px 12px' }}>
                        <select
                          className="fiori-input"
                          style={{ padding: '4px 6px', fontSize: '12px' }}
                          value={currentSelectedRole}
                          onChange={(e) => handleRoleChange(u.id, e.target.value)}
                          aria-label={`Role for ${u.name}`}
                        >
                          {AVAILABLE_ROLES.map((r) => (
                            <option key={r} value={r}>
                              {r}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td style={{ padding: '8px 12px', textAlign: 'right' }}>
                        <button
                          type="button"
                          className="fiori-btn fiori-btn-primary"
                          style={{ padding: '4px 8px', fontSize: '12px' }}
                          onClick={() => handleUpdateRole(u.id)}
                          disabled={!hasRoleChanged || isUpdating}
                          aria-label={`Update role for ${u.name}`}
                        >
                          {isUpdating ? 'Saving...' : 'Update'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};
