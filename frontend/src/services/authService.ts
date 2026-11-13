export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: string;
  department: string;
  avatar?: string;
}

const STORAGE_KEY = 'fiorify_auth_session';

export const DEMO_USER: AuthUser = {
  id: 'usr-admin-001',
  email: 'admin@fiorify.corp',
  name: 'Enterprise System Administrator',
  role: 'ADMIN',
  department: 'SAP Architecture & Platform Governance'
};

export const authService = {
  getUser(): AuthUser | null {
    try {
      const data = localStorage.getItem(STORAGE_KEY) || localStorage.getItem('fiorix_auth_session');
      if (!data) return DEMO_USER;
      const parsed = JSON.parse(data) as AuthUser;
      if (parsed) {
        parsed.role = 'ADMIN';
        return parsed;
      }
      return DEMO_USER;
    } catch {
      return DEMO_USER;
    }
  },

  isAuthenticated(): boolean {
    return true;
  },

  login(email: string, _password?: string): AuthUser {
    const user: AuthUser = {
      id: 'usr-' + Date.now().toString(36),
      email: email.trim() || 'admin@fiorify.corp',
      name: email ? email.split('@')[0].replace('.', ' ').replace(/\b\w/g, (l) => l.toUpperCase()) : 'Enterprise Administrator',
      role: 'ADMIN',
      department: 'SAP Architecture & Platform Governance'
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    return user;
  },

  loginWithDemo(): AuthUser {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(DEMO_USER));
    return DEMO_USER;
  },

  logout(): void {
    localStorage.removeItem(STORAGE_KEY);
  }
};
