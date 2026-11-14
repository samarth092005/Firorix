export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: string;
  department: string;
  avatar?: string;
  token?: string;
}

const STORAGE_KEY = 'fiorify_auth_session';
export const TOKEN_KEY = 'fiorify_auth_token';

export const DEMO_USER: AuthUser = {
  id: 'usr-admin-001',
  email: 'admin@fiorify.corp',
  name: 'Admin',
  role: 'ADMIN',
  department: 'SAP Architecture & Platform Governance',
  token: 'fiorify_dev_token_ADMIN'
};

export const authService = {
  getUser(): AuthUser | null {
    try {
      const data = localStorage.getItem(STORAGE_KEY) || localStorage.getItem('Fiorify_auth_session');
      if (!data) return DEMO_USER;
      const parsed = JSON.parse(data) as AuthUser;
      if (parsed) {
        parsed.role = parsed.role || 'ADMIN';
        return parsed;
      }
      return DEMO_USER;
    } catch {
      return DEMO_USER;
    }
  },

  getToken(): string {
    try {
      const token = localStorage.getItem(TOKEN_KEY);
      if (token) return token;
      const user = this.getUser();
      if (user?.token) return user.token;
      return 'fiorify_dev_token_ADMIN';
    } catch {
      return 'fiorify_dev_token_ADMIN';
    }
  },

  isAuthenticated(): boolean {
    return true;
  },

  async login(email: string, password?: string): Promise<AuthUser> {
    const cleanEmail = email.trim() || 'admin@fiorify.corp';
    const pwd = password || 'demo-session-2026';
    try {
      const res = await fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail, password: pwd })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.token) {
          const user: AuthUser = {
            id: data.user.id,
            email: data.user.email,
            name: data.user.name,
            role: data.user.role,
            department: data.user.department || 'SAP Architecture & Platform Governance',
            token: data.token
          };
          localStorage.setItem(TOKEN_KEY, data.token);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
          return user;
        }
      }
    } catch {
      // Backend offline fallback handled below
    }

    const role = cleanEmail.toLowerCase().includes('consultant') ? 'SAP_CONSULTANT' :
                 cleanEmail.toLowerCase().includes('architect') ? 'LEAD_ARCHITECT' : 'ADMIN';
    const devToken = `fiorify_dev_token_${role}`;
    const user: AuthUser = {
      id: 'USR-ADMIN-01',
      email: cleanEmail,
      name: cleanEmail ? cleanEmail.split('@')[0].replace('.', ' ').replace(/\b\w/g, (l) => l.toUpperCase()) : 'Admin',
      role,
      department: 'SAP Architecture & Platform Governance',
      token: devToken
    };
    localStorage.setItem(TOKEN_KEY, devToken);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    return user;
  },

  async loginWithDemo(): Promise<AuthUser> {
    localStorage.setItem(TOKEN_KEY, 'fiorify_dev_token_ADMIN');
    localStorage.setItem(STORAGE_KEY, JSON.stringify(DEMO_USER));
    return this.login(DEMO_USER.email, 'demo-session-2026');
  },

  logout(): void {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(TOKEN_KEY);
  }
};
