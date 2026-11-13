import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Layers,
  SearchCode,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Code2,
  Sparkles,
  Database,
  Cpu,
  LayoutTemplate,
  Zap,
  Lock
} from 'lucide-react';
import './LandingPage.css';

interface QuickScenario {
  tcode: string;
  name: string;
  module: string;
  outcome: 'STANDARD_ADOPT' | 'CUSTOM_RAP_BUILD';
  fioriAppId?: string;
  description: string;
}

const QUICK_SCENARIOS: QuickScenario[] = [
  {
    tcode: 'ME21N',
    name: 'Create Purchase Order',
    module: 'Procurement (MM-PUR)',
    outcome: 'STANDARD_ADOPT',
    fioriAppId: 'F0842A',
    description: 'Matches official SAP Fiori Elements app "Manage Purchase Orders" with full OData V4 support.'
  },
  {
    tcode: 'F-53',
    name: 'Post Outgoing Payments',
    module: 'Financials (FI-AP)',
    outcome: 'STANDARD_ADOPT',
    fioriAppId: 'F0773',
    description: 'Direct replacement with standard transactional Fiori app. PFCG role SAP_BR_AP_ACCOUNTANT.'
  },
  {
    tcode: 'ZPURCHASE',
    name: 'Custom Purchase Approval Dynpro',
    module: 'Custom Extension (Z)',
    outcome: 'CUSTOM_RAP_BUILD',
    description: '100% Functional Gap. Accelerates custom CDS View Entities, RAP Managed with Draft & Fiori Elements synthesis.'
  }
];

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();

  const handleLaunchDemo = (targetUrl: string = '/overview') => {
    navigate(`/login?mode=demo&redirect=${encodeURIComponent(targetUrl)}`);
  };

  return (
    <div className="landing-root" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: '#F8FAFC' }}>
      {/* 1. Header Navigation */}
      <header
        style={{
          height: '64px',
          backgroundColor: '#FFFFFF',
          borderBottom: '1px solid #E2E8F0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 32px',
          position: 'sticky',
          top: 0,
          zIndex: 100,
          boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }} onClick={() => navigate('/')}>
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              backgroundColor: '#0066FF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#FFFFFF'
            }}
          >
            <Layers size={20} />
          </div>
          <div>
            <span style={{ fontSize: '18px', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.3px' }}>
              Fiori<span style={{ color: '#0066FF' }}>X</span>
            </span>
            <span
              style={{
                marginLeft: '8px',
                fontSize: '11px',
                fontWeight: 700,
                padding: '2px 6px',
                borderRadius: '4px',
                backgroundColor: '#EFF6FF',
                color: '#1D4ED8'
              }}
            >
              Enterprise 2026
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            type="button"
            onClick={() => navigate('/login')}
            style={{
              padding: '8px 16px',
              borderRadius: '6px',
              border: '1px solid #CBD5E1',
              backgroundColor: '#FFFFFF',
              color: '#334155',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => handleLaunchDemo('/overview')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 18px',
              borderRadius: '6px',
              border: 'none',
              backgroundColor: '#0066FF',
              color: '#FFFFFF',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              boxShadow: '0 2px 4px rgba(0, 102, 255, 0.2)'
            }}
          >
            <span>Launch Demo Platform</span>
            <ArrowRight size={15} />
          </button>
        </div>
      </header>

      {/* 2. Hero Section */}
      <section
        style={{
          padding: '64px 32px 48px',
          maxWidth: '1100px',
          margin: '0 auto',
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '20px'
        }}
      >
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '4px 14px',
            borderRadius: '20px',
            backgroundColor: '#EFF6FF',
            border: '1px solid #BFDBFE',
            fontSize: '12px',
            fontWeight: 700,
            color: '#1D4ED8'
          }}
        >
          <Sparkles size={14} color="#0066FF" />
          <span>SAP S/4HANA Clean Core &amp; Fiori Modernization Engine</span>
        </div>

        <h1
          style={{
            fontSize: '44px',
            fontWeight: 800,
            lineHeight: 1.15,
            color: '#0F172A',
            letterSpacing: '-1px',
            maxWidth: '850px'
          }}
        >
          Transform SAP GUI Transactions into Modern <span style={{ color: '#0066FF' }}>Fiori Applications</span>
        </h1>

        <p
          style={{
            fontSize: '17px',
            lineHeight: 1.6,
            color: '#475569',
            maxWidth: '720px'
          }}
        >
          Inspect legacy SAP transaction codes, verify equivalent standard applications in the official SAP Fiori Reference Library,
          and automatically generate Clean Core ABAP RAP &amp; Fiori Elements apps where genuine functional gaps exist.
        </p>

        {/* CTA Buttons */}
        <div style={{ display: 'flex', gap: '14px', marginTop: '10px', flexWrap: 'wrap', justifyContent: 'center' }}>
          <button
            type="button"
            onClick={() => handleLaunchDemo('/overview')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '14px 28px',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: '#0066FF',
              color: '#FFFFFF',
              fontSize: '15px',
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(0, 102, 255, 0.25)'
            }}
          >
            <Zap size={18} />
            <span>Enter Demo Workspace</span>
            <ArrowRight size={16} />
          </button>

          <button
            type="button"
            onClick={() => handleLaunchDemo('/transaction-discovery')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '14px 24px',
              borderRadius: '8px',
              border: '1px solid #CBD5E1',
              backgroundColor: '#FFFFFF',
              color: '#0F172A',
              fontSize: '15px',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            <SearchCode size={18} color="#0066FF" />
            <span>Inspect a Transaction Code</span>
          </button>
        </div>

        {/* Trust Badges */}
        <div style={{ display: 'flex', gap: '24px', marginTop: '16px', flexWrap: 'wrap', justifyContent: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12.5px', color: '#475569' }}>
            <CheckCircle2 size={15} color="#16A34A" />
            <span>Standard SAP Fiori Prioritization</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12.5px', color: '#475569' }}>
            <CheckCircle2 size={15} color="#16A34A" />
            <span>S/4HANA 2023 Clean Core Tier 2</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12.5px', color: '#475569' }}>
            <CheckCircle2 size={15} color="#16A34A" />
            <span>RAP Managed with Draft</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12.5px', color: '#475569' }}>
            <CheckCircle2 size={15} color="#16A34A" />
            <span>Instant In-Browser Mock Preview</span>
          </div>
        </div>
      </section>

      {/* 3. Three-Pillar Process Flow */}
      <section style={{ backgroundColor: '#FFFFFF', borderTop: '1px solid #E2E8F0', borderBottom: '1px solid #E2E8F0', padding: '48px 32px' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <span style={{ fontSize: '12px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px', color: '#0066FF' }}>
              Standard-First Modernization Pipeline
            </span>
            <h2 style={{ fontSize: '26px', fontWeight: 800, color: '#0F172A', marginTop: '6px' }}>
              How Fiorify Eliminates the S/4HANA Modernization Bottleneck
            </h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
            {/* Step 1 */}
            <div style={{ padding: '24px', borderRadius: '10px', backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '8px', backgroundColor: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0066FF', marginBottom: '14px' }}>
                <SearchCode size={22} />
              </div>
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#64748B' }}>STEP 1</div>
              <h3 style={{ fontSize: '17px', fontWeight: 700, color: '#0F172A', margin: '4px 0 8px' }}>
                Transaction DDIC Inspection
              </h3>
              <p style={{ fontSize: '13px', color: '#475569', lineHeight: 1.5 }}>
                Connects to SAP kernel dictionary tables (TSTC, TADIR, CVERS). Instantly validates transaction existence, executable programs, screens, and authorization requirements.
              </p>
            </div>

            {/* Step 2 */}
            <div style={{ padding: '24px', borderRadius: '10px', backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '8px', backgroundColor: '#ECFDF5', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#059669', marginBottom: '14px' }}>
                <Database size={22} />
              </div>
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#64748B' }}>STEP 2</div>
              <h3 style={{ fontSize: '17px', fontWeight: 700, color: '#0F172A', margin: '4px 0 8px' }}>
                Fit-to-Standard Discovery
              </h3>
              <p style={{ fontSize: '13px', color: '#475569', lineHeight: 1.5 }}>
                Searches the official SAP Fiori Apps Reference Library. Automatically determines whether an existing standard Fiori app satisfies the transaction (ADOPT / CONFIGURE) or if a gap exists.
              </p>
            </div>

            {/* Step 3 */}
            <div style={{ padding: '24px', borderRadius: '10px', backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '8px', backgroundColor: '#FEF3C7', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#D97706', marginBottom: '14px' }}>
                <Code2 size={22} />
              </div>
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#64748B' }}>STEP 3</div>
              <h3 style={{ fontSize: '17px', fontWeight: 700, color: '#0F172A', margin: '4px 0 8px' }}>
                Clean Core App Generation
              </h3>
              <p style={{ fontSize: '13px', color: '#475569', lineHeight: 1.5 }}>
                When no standard app fits, 1-click generation creates modern CDS View Entities, RAP Managed Behaviors with Draft, OData V4 services, and Fiori Elements List Report / Object Pages.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Quick Scenario Demo Cards */}
      <section style={{ padding: '48px 32px', maxWidth: '1100px', margin: '0 auto', width: '100%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h3 style={{ fontSize: '20px', fontWeight: 800, color: '#0F172A' }}>
              Try Common Migration Scenarios
            </h3>
            <p style={{ fontSize: '13px', color: '#64748B', marginTop: '2px' }}>
              Click any scenario to see instant discovery and recommendation in the live platform.
            </p>
          </div>
          <button
            type="button"
            onClick={() => handleLaunchDemo('/transaction-discovery')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              borderRadius: '6px',
              backgroundColor: '#EFF6FF',
              border: '1px solid #BFDBFE',
              color: '#0066FF',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            <span>Open Transaction Discovery</span>
            <ArrowRight size={14} />
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
          {QUICK_SCENARIOS.map((sc) => (
            <div
              key={sc.tcode}
              onClick={() => handleLaunchDemo(`/transaction-discovery?tcode=${sc.tcode}`)}
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: '8px',
                border: '1px solid #E2E8F0',
                padding: '20px',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: '12px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                transition: 'all 0.15s ease-in-out'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#0066FF';
                e.currentTarget.style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#E2E8F0';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontSize: '14px', fontWeight: 800, fontFamily: 'monospace', color: '#0F172A' }}>
                    {sc.tcode}
                  </span>
                  <span
                    style={{
                      fontSize: '10.5px',
                      fontWeight: 700,
                      padding: '2px 8px',
                      borderRadius: '4px',
                      backgroundColor: sc.outcome === 'STANDARD_ADOPT' ? '#DCFCE7' : '#FEF3C7',
                      color: sc.outcome === 'STANDARD_ADOPT' ? '#166534' : '#92400E'
                    }}
                  >
                    {sc.outcome === 'STANDARD_ADOPT' ? 'STANDARD SUCCESSOR' : 'CUSTOM RAP BUILD'}
                  </span>
                </div>
                <div style={{ fontSize: '14px', fontWeight: 700, color: '#1E293B' }}>{sc.name}</div>
                <div style={{ fontSize: '11px', color: '#64748B', marginTop: '2px' }}>{sc.module}</div>
                <p style={{ fontSize: '12px', color: '#475569', lineHeight: 1.4, marginTop: '8px' }}>
                  {sc.description}
                </p>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 600, color: '#0066FF', paddingTop: '8px', borderTop: '1px solid #F1F5F9' }}>
                <span>Inspect in Fiorify</span>
                <ArrowRight size={14} />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 5. Minimal Clean Footer */}
      <footer style={{ marginTop: 'auto', borderTop: '1px solid #E2E8F0', backgroundColor: '#FFFFFF', padding: '24px 32px' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', fontSize: '12px', color: '#64748B' }}>
          <div>
            Fiorify &bull; Clean Core SAP S/4HANA Modernization &amp; Generation Workbench
          </div>
          <div style={{ display: 'flex', gap: '16px' }}>
            <span>SAP S/4HANA 2023 Clean Core</span>
            <span>RAP Managed with Draft</span>
            <span>Fiori Elements OData V4</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
