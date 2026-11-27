import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiorifyLogo } from '../../components/common/FiorifyLogo';
import { LandingProductPreview } from './LandingProductPreview';
import {
  ArrowRight,
  SearchCode,
  ShieldCheck,
  Code2,
  Layers,
  CheckCircle2
} from 'lucide-react';
import './LandingPage.css';

const CAPABILITIES = [
  {
    icon: SearchCode,
    title: 'SAP T-Code Discovery',
    desc: 'Read-only inspection of S/4HANA DDIC, Gateway OData, and ADT metadata across standard and custom Z/Y transactions.'
  },
  {
    icon: Layers,
    title: 'Fiori Library Matching',
    desc: 'Deterministic 5-dimension Fit-Gap scoring against 18,000+ official SAP Fiori Apps and S/4HANA Simplification Items.'
  },
  {
    icon: Code2,
    title: 'Clean Core RAP & UI5 Studio',
    desc: 'Generates abapGit-ready DDIC tables, CDS View Entities, BDEFs, and OData V4 Fiori Elements or Freestyle UI5 apps.'
  },
  {
    icon: ShieldCheck,
    title: 'Zero-Mutation Governance',
    desc: 'Strict HTTP GET/HEAD SAP safety boundaries, cryptographic approval signatures, and full tenant-isolated audit trails.'
  }
];

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const [quickTcode, setQuickTcode] = useState('ME21N');

  const handleQuickExplore = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = quickTcode.trim().toUpperCase();
    navigate(clean ? `/login?mode=demo&tcode=${encodeURIComponent(clean)}` : '/login?mode=demo');
  };

  return (
    <div className="fiorify-landing">
      <header className="fiorify-landing-nav">
        <div className="fiorify-landing-container fiorify-landing-nav-inner">
          <FiorifyLogo variant="compact" />
          <div className="fiorify-landing-nav-actions">
            <button
              type="button"
              className="fiorify-landing-btn-ghost"
              onClick={() => navigate('/login')}
            >
              Sign In
            </button>
            <button
              type="button"
              className="fiorify-landing-btn-primary"
              onClick={() => navigate('/login?mode=demo')}
            >
              <span>Launch Workspace</span>
              <ArrowRight size={15} />
            </button>
          </div>
        </div>
      </header>

      <main>
        <section className="fiorify-landing-hero">
          <div className="fiorify-landing-container fiorify-landing-hero-grid">
            <div className="fiorify-landing-hero-copy">
              <span className="fiorify-landing-eyebrow">SAP S/4HANA 2023 Clean Core Platform</span>
              <h1>Modernize SAP GUI transactions into Clean Core Fiori &amp; RAP apps.</h1>
              <p>
                Analyze ECC and S/4HANA transactions, score standard Fiori successors, and generate
                abapGit-ready RAP &amp; Fiori Elements applications with strict read-only SAP governance.
              </p>

              <form className="fiorify-landing-quickform" onSubmit={handleQuickExplore}>
                <input
                  type="text"
                  value={quickTcode}
                  onChange={(e) => setQuickTcode(e.target.value)}
                  placeholder="Enter T-Code (e.g. ME21N, VA01, ZPAY)"
                  aria-label="SAP Transaction Code"
                />
                <button type="submit" className="fiorify-landing-btn-primary">
                  <span>Inspect T-Code</span>
                  <ArrowRight size={15} />
                </button>
              </form>

              <div className="fiorify-landing-trust">
                <span><CheckCircle2 size={14} /> Read-only SAP S21 boundary</span>
                <span><CheckCircle2 size={14} /> OData V4 &amp; ABAP Cloud</span>
                <span><CheckCircle2 size={14} /> BTP Cloud Foundry ready</span>
              </div>
            </div>

            <div className="fiorify-landing-preview-wrap">
              <LandingProductPreview />
            </div>
          </div>
        </section>

        <section className="fiorify-landing-capabilities">
          <div className="fiorify-landing-container">
            <div className="fiorify-landing-section-head">
              <h2>End-to-End SAP Modernization Workflow</h2>
              <p>From transaction discovery and fit-gap governance to deployable ABAP RAP and Fiori code.</p>
            </div>
            <div className="fiorify-landing-cap-grid">
              {CAPABILITIES.map((cap) => {
                const Icon = cap.icon;
                return (
                  <article key={cap.title} className="fiorify-landing-cap-card">
                    <div className="fiorify-landing-cap-icon">
                      <Icon size={18} />
                    </div>
                    <h3>{cap.title}</h3>
                    <p>{cap.desc}</p>
                  </article>
                );
              })}
            </div>
          </div>
        </section>
      </main>

      <footer className="fiorify-landing-footer">
        <div className="fiorify-landing-container fiorify-landing-footer-inner">
          <span>Fiorify Enterprise Modernization Platform</span>
          <span>SAP S/4HANA 2023 • ABAP RAP • Fiori Elements</span>
        </div>
      </footer>
    </div>
  );
};
