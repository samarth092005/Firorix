import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Layers,
  ArrowRight,
  ShieldCheck,
  Zap,
  CheckCircle2,
  Sparkles,
  Lock,
  Mail,
  UserCheck
} from 'lucide-react';
import { authService, DEMO_USER } from '../../services/authService';
import './LoginPage.css';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const tcodeTarget = searchParams.get('tcode');
  const autoDemo = searchParams.get('mode') === 'demo';
  const redirectTarget = searchParams.get('redirect');

  useEffect(() => {
    // If autoDemo is set in query, prefill with demo user
    if (autoDemo) {
      setEmail(DEMO_USER.email);
      setPassword('••••••••••••');
    }
  }, [autoDemo]);

  const handleLogin = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!email) {
      setError('Please provide a valid SAP User ID or Email');
      return;
    }

    setIsLoading(true);
    setError(null);

    setTimeout(() => {
      authService.login(email, password);
      setIsLoading(false);
      // Navigate to redirect target, transaction discovery if tcode was passed, or overview
      if (redirectTarget) {
        navigate(redirectTarget);
      } else if (tcodeTarget) {
        navigate(`/transaction-discovery?tcode=${encodeURIComponent(tcodeTarget)}`);
      } else {
        navigate('/overview');
      }
    }, 400);
  };

  const handleInstantDemoLogin = () => {
    setIsLoading(true);
    setEmail(DEMO_USER.email);
    setPassword('demo-session-2026');

    setTimeout(() => {
      authService.loginWithDemo();
      setIsLoading(false);
      if (redirectTarget) {
        navigate(redirectTarget);
      } else if (tcodeTarget) {
        navigate(`/transaction-discovery?tcode=${encodeURIComponent(tcodeTarget)}`);
      } else {
        navigate('/overview');
      }
    }, 350);
  };

  return (
    <div className="login-root">
      {/* Left Column: Enterprise Field Text & Value Proposition */}
      <div className="login-hero-col">
        {/* Top Brand */}
        <div className="login-hero-content">
          <div
            onClick={() => navigate('/')}
            className="login-brand-logo"
          >
            <div className="login-brand-icon">
              <Layers size={22} />
            </div>
            <span style={{ fontSize: '22px', fontWeight: 700, letterSpacing: '-0.5px' }}>
              Fiori<span style={{ color: '#58B8D4' }}>fy</span>
            </span>
          </div>

          <div className="login-pill-badge">
            <Sparkles size={14} />
            <span>Next-Gen SAP Modernization</span>
          </div>

          <h1 className="login-hero-title">
            Enterprise SAP Transaction &amp; Fiori Application Discovery
          </h1>

          <p className="login-hero-subtitle">
            Streamline the transition from classical dynpro SAP transactions to SAP Fiori elements.
            Get instant architectural fit-gap insights and official SAP reference library matches.
          </p>

          {/* Feature Bullets */}
          <div className="login-features-list">
            <div className="login-feature-item">
              <div
                className="login-feature-icon"
                style={{
                  backgroundColor: 'rgba(0, 102, 255, 0.3)',
                  color: '#60A5FA'
                }}
              >
                <Zap size={18} />
              </div>
              <div>
                <div style={{ fontWeight: 600, fontSize: '15px', color: '#F1F5F9' }}>
                  Instant Transaction Inspection
                </div>
                <div style={{ fontSize: '13px', color: 'rgba(255, 255, 255, 0.65)', marginTop: '2px' }}>
                  Inspect DDIC tables, associated programs, dynpro screens, and package dependencies.
                </div>
              </div>
            </div>

            <div className="login-feature-item">
              <div
                className="login-feature-icon"
                style={{
                  backgroundColor: 'rgba(16, 185, 129, 0.25)',
                  color: '#34D399'
                }}
              >
                <ShieldCheck size={18} />
              </div>
              <div>
                <div style={{ fontWeight: 600, fontSize: '15px', color: '#F1F5F9' }}>
                  Clean Core &amp; Fit-Gap Compliance
                </div>
                <div style={{ fontSize: '13px', color: 'rgba(255, 255, 255, 0.65)', marginTop: '2px' }}>
                  Evaluate extensibility risks, OData services, and required SAP business roles.
                </div>
              </div>
            </div>

            <div className="login-feature-item">
              <div
                className="login-feature-icon"
                style={{
                  backgroundColor: 'rgba(147, 51, 234, 0.25)',
                  color: '#C084FC'
                }}
              >
                <CheckCircle2 size={18} />
              </div>
              <div>
                <div style={{ fontWeight: 600, fontSize: '15px', color: '#F1F5F9' }}>
                  Official Fiori Library Alignment
                </div>
                <div style={{ fontSize: '13px', color: 'rgba(255, 255, 255, 0.65)', marginTop: '2px' }}>
                  Target direct replacements with certified SAP Fiori App IDs.
                </div>
              </div>
            </div>

            <div className="login-feature-item">
              <div
                className="login-feature-icon"
                style={{
                  backgroundColor: 'rgba(59, 130, 246, 0.25)',
                  color: '#60A5FA'
                }}
              >
                <Sparkles size={18} />
              </div>
              <div>
                <div style={{ fontWeight: 600, fontSize: '15px', color: '#F1F5F9' }}>
                  Generation Studio &bull; RAP &amp; Fiori Elements
                </div>
                <div style={{ fontSize: '13px', color: 'rgba(255, 255, 255, 0.65)', marginTop: '2px' }}>
                  Synthesize S/4HANA 2023 RAP CDS views, BDEF strict 2, and mock OData V4 previews.
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Note */}
        <div className="login-hero-footer">
          Fiorify Modernization Suite &bull; Secure Enterprise Environment
        </div>
      </div>

      {/* Right Column: Proper Login Card / Modal */}
      <div className="login-form-col">
        <div className="login-card">
          {/* Header */}
          <div style={{ marginBottom: '24px' }}>
            <h2 style={{ fontSize: '24px', fontWeight: 700, color: '#0F172A', letterSpacing: '-0.4px' }}>
              Sign In to Fiorify
            </h2>
            <p style={{ fontSize: '14px', color: '#64748B', marginTop: '4px' }}>
              Access your SAP transformation workspace &amp; assessments.
            </p>
          </div>

          {/* Quick Demo Access Action Box */}
          <div
            style={{
              padding: '16px',
              backgroundColor: '#EFF6FF',
              borderRadius: '8px',
              border: '1px solid #BFDBFE',
              marginBottom: '24px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <UserCheck size={18} color="#0066FF" />
              <span style={{ fontSize: '13px', fontWeight: 700, color: '#0066FF' }}>
                Instant Demo Access Available
              </span>
            </div>
            <p style={{ fontSize: '12px', color: '#475569', marginBottom: '12px', lineHeight: 1.4 }}>
              Explore all Fiorify discovery features immediately with pre-configured architect credentials.
            </p>
            <button
              type="button"
              onClick={handleInstantDemoLogin}
              disabled={isLoading}
              style={{
                width: '100%',
                padding: '9px 14px',
                backgroundColor: '#0066FF',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '6px',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxShadow: '0 2px 4px rgba(0, 102, 255, 0.2)'
              }}
            >
              <span>Sign In with Demo Credentials</span>
              <ArrowRight size={15} />
            </button>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              marginBottom: '20px',
              color: '#94A3B8',
              fontSize: '12px',
              textTransform: 'uppercase',
              fontWeight: 600
            }}
          >
            <div style={{ flex: 1, height: '1px', backgroundColor: '#E2E8F0' }} />
            <span>or sign in with credentials</span>
            <div style={{ flex: 1, height: '1px', backgroundColor: '#E2E8F0' }} />
          </div>

          {error && (
            <div
              style={{
                padding: '10px 14px',
                backgroundColor: '#FEF2F2',
                border: '1px solid #FCA5A5',
                borderRadius: '6px',
                color: '#B91C1C',
                fontSize: '13px',
                marginBottom: '16px'
              }}
            >
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '13px',
                  fontWeight: 600,
                  color: '#334155',
                  marginBottom: '6px'
                }}
              >
                SAP User ID / Work Email
              </label>
              <div style={{ position: 'relative' }}>
                <Mail
                  size={16}
                  style={{
                    position: 'absolute',
                    left: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: '#94A3B8'
                  }}
                />
                <input
                  type="text"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. consultant@fiorify.corp"
                  style={{
                    width: '100%',
                    padding: '10px 12px 10px 38px',
                    border: '1px solid #CBD5E1',
                    borderRadius: '6px',
                    fontSize: '14px',
                    color: '#0F172A',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
            </div>

            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '13px',
                  fontWeight: 600,
                  color: '#334155',
                  marginBottom: '6px'
                }}
              >
                Password
              </label>
              <div style={{ position: 'relative' }}>
                <Lock
                  size={16}
                  style={{
                    position: 'absolute',
                    left: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: '#94A3B8'
                  }}
                />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  style={{
                    width: '100%',
                    padding: '10px 12px 10px 38px',
                    border: '1px solid #CBD5E1',
                    borderRadius: '6px',
                    fontSize: '14px',
                    color: '#0F172A',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '13px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', color: '#475569' }}>
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  style={{ borderRadius: '3px' }}
                />
                <span>Remember session</span>
              </label>

              <button
                type="button"
                onClick={() => {
                  setEmail(DEMO_USER.email);
                  setPassword('demo-session-2026');
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#0066FF',
                  fontSize: '13px',
                  fontWeight: 500,
                  cursor: 'pointer',
                  padding: 0
                }}
              >
                Auto-fill Demo
              </button>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              style={{
                marginTop: '8px',
                padding: '11px',
                backgroundColor: '#0F172A',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                transition: 'background-color 0.15s ease'
              }}
            >
              {isLoading ? (
                <span>Signing in...</span>
              ) : (
                <>
                  <span>Sign In to Workspace</span>
                  <ArrowRight size={15} />
                </>
              )}
            </button>
          </form>

          {/* Footer Navigation */}
          <div style={{ marginTop: '24px', textAlign: 'center', fontSize: '13px', color: '#64748B' }}>
            <span
              onClick={() => navigate('/')}
              style={{ color: '#0066FF', cursor: 'pointer', fontWeight: 500 }}
            >
              &larr; Back to Landing Page
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
