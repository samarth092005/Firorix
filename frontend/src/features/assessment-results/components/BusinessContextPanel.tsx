import React from 'react';
import { AssessmentRecord } from '../../../services/contracts/types';
import { StatusBadge } from '../../../components/status/StatusBadge';
import { Briefcase, AlertCircle, CheckCircle2, User, FileText, Layers, Tag } from 'lucide-react';

export interface BusinessContextPanelProps {
  assessment: AssessmentRecord;
}

export const BusinessContextPanel: React.FC<BusinessContextPanelProps> = ({ assessment }) => {
  const ctx = assessment.businessContext;
  const reqs = assessment.applicationRequirements;

  // Fallback defaults if context was not provided via wizard
  const defaultContext = {
    businessProcess: assessment.businessArea,
    primaryScenario: `Operational processing for ${assessment.tcode} (${assessment.description})`,
    businessCriticality: 'HIGH' as const,
    assessmentObjective: `Evaluate modern SAP Fiori feasibility and S/4HANA release compatibility for ${assessment.tcode}.`,
    selectedRequirements: [
      'Real-time transaction posting and validation',
      'Dual-control authorization & change audit logging',
      'Integration with S/4HANA Universal Journal (ACDOCA)'
    ]
  };

  const activeCtx = ctx || defaultContext;

  return (
    <div
      style={{
        backgroundColor: 'var(--fiori-surface, #FFFFFF)',
        border: '1px solid var(--fiori-border, #E2E8F0)',
        borderRadius: 'var(--radius-md, 6px)',
        padding: '24px',
        boxShadow: 'var(--fiori-shadow-sm, 0 1px 3px rgba(0,0,0,0.05))',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px'
      }}
    >
      <div>
        <h3
          style={{
            margin: '0 0 4px 0',
            fontSize: '15px',
            fontWeight: 700,
            color: 'var(--fiori-navy, #102A43)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <Briefcase size={16} color="var(--fiori-primary, #0A6ED1)" />
          Business Process Assessment &amp; Operational Context
        </h3>
        <p
          style={{
            margin: 0,
            fontSize: '12px',
            color: 'var(--fiori-text-secondary, #64748B)'
          }}
        >
          Functional scenarios, operational criticality, and requirements captured during guided discovery intake.
        </p>
      </div>

      {/* Grid of Business Context Attributes */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '16px'
        }}
      >
        {/* Business Process & Sub-Area */}
        <div
          style={{
            padding: '14px',
            backgroundColor: 'var(--fiori-surface-subtle, #F8FAFC)',
            border: '1px solid var(--fiori-border, #E2E8F0)',
            borderRadius: 'var(--radius-sm, 4px)'
          }}
        >
          <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--fiori-text-secondary, #64748B)' }}>
            BUSINESS PROCESS DOMAIN
          </span>
          <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--fiori-navy, #102A43)', marginTop: '4px' }}>
            {activeCtx.businessProcess}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--fiori-text-secondary, #64748B)', marginTop: '2px' }}>
            Sub-Process: {assessment.subArea || 'Standard Financial Accounting'}
          </div>
        </div>

        {/* Primary Operational Scenario */}
        <div
          style={{
            padding: '14px',
            backgroundColor: 'var(--fiori-surface-subtle, #F8FAFC)',
            border: '1px solid var(--fiori-border, #E2E8F0)',
            borderRadius: 'var(--radius-sm, 4px)'
          }}
        >
          <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--fiori-text-secondary, #64748B)' }}>
            PRIMARY OPERATIONAL SCENARIO
          </span>
          <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--fiori-navy, #102A43)', marginTop: '4px' }}>
            {activeCtx.primaryScenario}
          </div>
        </div>

        {/* Business Criticality */}
        <div
          style={{
            padding: '14px',
            backgroundColor: 'var(--fiori-surface-subtle, #F8FAFC)',
            border: '1px solid var(--fiori-border, #E2E8F0)',
            borderRadius: 'var(--radius-sm, 4px)'
          }}
        >
          <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--fiori-text-secondary, #64748B)' }}>
            BUSINESS CRITICALITY
          </span>
          <div style={{ marginTop: '6px' }}>
            <StatusBadge status={activeCtx.businessCriticality} size="sm" />
          </div>
        </div>
      </div>

      {/* Selected Functional Requirements */}
      {activeCtx.selectedRequirements && activeCtx.selectedRequirements.length > 0 && (
        <div
          style={{
            padding: '14px',
            backgroundColor: 'var(--fiori-surface-subtle, #F8FAFC)',
            border: '1px solid var(--fiori-border, #E2E8F0)',
            borderRadius: 'var(--radius-sm, 4px)',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px'
          }}
        >
          <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--fiori-navy, #102A43)' }}>
            Specific Business &amp; Functional Requirements:
          </span>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '8px' }}>
            {activeCtx.selectedRequirements.map((req, idx) => (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '6px 10px',
                  backgroundColor: '#FFFFFF',
                  borderRadius: 'var(--radius-xs, 2px)',
                  border: '1px solid var(--fiori-border, #E2E8F0)',
                  fontSize: '12px'
                }}
              >
                <CheckCircle2 size={13} color="var(--fiori-primary, #0A6ED1)" style={{ flexShrink: 0 }} />
                <span>{req}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* User-Provided Roles & Customization Constraints */}
      {reqs && (
        <div
          
        >
         

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '12px' }}>



          </div>

          {reqs.knownLimitations && (
            <div style={{ marginTop: '4px' }}>
              <span style={{ color: 'var(--fiori-text-secondary, #64748B)' }}>Documented Customization / Limitations:</span>
              <p style={{ margin: '4px 0 0 0', fontStyle: 'italic', color: 'var(--fiori-text-primary, #1B2838)' }}>
                "{reqs.knownLimitations}"
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
