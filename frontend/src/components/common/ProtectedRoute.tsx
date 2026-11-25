import React from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { ShieldAlert, ArrowLeft, LogOut, CheckCircle2 } from 'lucide-react';
import { authService } from '../../services/authService';

export interface ProtectedRouteProps {
  children?: React.ReactNode;
  allowedRoles?: string[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles }) => {
  const location = useLocation();
  const navigate = useNavigate();

  const isAuth = authService.isAuthenticated();
  const user = authService.getUser();

  // 1. Unauthenticated -> Redirect to Login with state preservation
  if (!isAuth || !user) {
    const redirectUrl = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/login?redirect=${redirectUrl}`} replace />;
  }

  // 2. Role Check (if specific roles are required)
  if (allowedRoles && allowedRoles.length > 0) {
    const userRole = (user.role || '').toUpperCase();
    const normalizedUserRole = userRole === 'SAP_CONSULTANT' || userRole === 'LEAD_ARCHITECT'
      ? 'CONSULTANT'
      : userRole;

    const isAllowed = allowedRoles.some((role) => {
      const normalizedRole = role.toUpperCase();
      return (
        normalizedRole === userRole ||
        normalizedRole === normalizedUserRole ||
        userRole === 'ADMIN'
      );
    });

    if (!isAllowed) {
      return (
        <div
          style={{
            minHeight: '70vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
            backgroundColor: 'var(--fiori-bg, #F8FAFC)'
          }}
        >
          <div
            style={{
              maxWidth: '520px',
              width: '100%',
              backgroundColor: '#FFFFFF',
              borderRadius: '12px',
              padding: '36px',
              boxShadow: '0 4px 12px rgba(15, 23, 42, 0.08)',
              border: '1px solid #E2E8F0',
              textAlign: 'center'
            }}
          >
            <div
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                backgroundColor: '#FEF2F2',
                color: '#DC2626',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 20px auto',
                border: '1px solid #FCA5A5'
              }}
            >
              <ShieldAlert size={28} />
            </div>

            <h2
              style={{
                fontSize: '20px',
                fontWeight: 700,
                color: '#0F172A',
                marginBottom: '8px',
                letterSpacing: '-0.3px'
              }}
            >
              Access Restricted (403 Forbidden)
            </h2>

            <p style={{ fontSize: '14px', color: '#64748B', lineHeight: 1.5, marginBottom: '24px' }}>
              Your current account role <strong style={{ color: '#0F172A' }}>{user.role}</strong> does
              not have authorization to access this workspace module. Required role(s):{' '}
              <span style={{ color: '#0066FF', fontWeight: 600 }}>{allowedRoles.join(', ')}</span>.
            </p>

            <div
              style={{
                display: 'flex',
                gap: '12px',
                justifyContent: 'center'
              }}
            >
              <button
                type="button"
                onClick={() => navigate('/overview')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '9px 16px',
                  backgroundColor: '#0F172A',
                  color: '#FFFFFF',
                  borderRadius: '6px',
                  fontSize: '13px',
                  fontWeight: 600,
                  border: 'none',
                  cursor: 'pointer'
                }}
              >
                <ArrowLeft size={16} />
                <span>Return to Overview</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  authService.logout();
                  navigate('/login');
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '9px 16px',
                  backgroundColor: '#F1F5F9',
                  color: '#475569',
                  borderRadius: '6px',
                  fontSize: '13px',
                  fontWeight: 600,
                  border: '1px solid #CBD5E1',
                  cursor: 'pointer'
                }}
              >
                <LogOut size={16} />
                <span>Switch Account</span>
              </button>
            </div>
          </div>
        </div>
      );
    }
  }

  return children ? <>{children}</> : null;
};

export default ProtectedRoute;
