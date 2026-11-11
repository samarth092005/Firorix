import React from 'react';
import {
  TransactionDiscoveryResponse,
  BusinessContext,
  ApplicationRequirements,
  CatalogueReference
} from '../../../services/contracts/types';
import { StatusBadge, InformationPanel } from '../../../components/common';
import { ArrowLeft, CheckCircle2, Edit3, Send, ExternalLink, Server, Database, FileText, Layers, ShieldCheck } from 'lucide-react';

export interface Step5ReviewProps {
  tcode: string;
  systemId: string;
  client: string;
  targetRelease: string;
  sapMetadata: TransactionDiscoveryResponse | null;
  businessContext: BusinessContext;
  applicationRequirements: ApplicationRequirements;
  catalogueApp: CatalogueReference | null;
  isSubmitting: boolean;
  onEditStep: (stepNumber: 1 | 2 | 3 | 4) => void;
  onBack: () => void;
  onSubmit: () => void;
}

export const Step5Review: React.FC<Step5ReviewProps> = ({
  tcode,
  systemId,
  client,
  targetRelease,
  sapMetadata,
  businessContext,
  applicationRequirements,
  catalogueApp,
  isSubmitting,
  onEditStep,
  onBack,
  onSubmit
}) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div>
        <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--fiori-navy, #102A43)', margin: '0 0 6px' }}>
          Step 5: Review &amp; Submit Assessment Request
        </h3>
        <p style={{ fontSize: '13px', color: 'var(--fiori-text-secondary, #64748B)', margin: 0 }}>
          Verify all captured transaction discovery parameters, business context, and requirements before formal submission.
        </p>
      </div>

      {/* Review Section 1: Transaction & System Identification */}
      <div
        style={{
          padding: '16px 20px',
          backgroundColor: 'var(--fiori-surface, #FFFFFF)',
          borderRadius: 'var(--radius-md, 6px)',
          border: '1px solid var(--fiori-border, #E2E8F0)',
          boxShadow: 'var(--fiori-shadow-xs)'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Server size={16} color="var(--fiori-primary, #0A6ED1)" />
            <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: 'var(--fiori-navy, #102A43)' }}>
              1. SAP Landscape &amp; Transaction Context
            </h4>
          </div>
          <button
            type="button"
            onClick={() => onEditStep(1)}
            className="fiori-btn fiori-btn-subtle"
            style={{ height: '26px', fontSize: '11px', padding: '0 8px' }}
          >
            <Edit3 size={12} /> Edit Step 1
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px', fontSize: '12px' }}>
          <div>
            <span style={{ color: 'var(--fiori-text-secondary, #64748B)' }}>Transaction Code:</span>{' '}
            <strong style={{ fontFamily: 'var(--font-mono)', color: 'var(--fiori-navy, #102A43)' }}>{tcode}</strong>
          </div>
          <div>
            <span style={{ color: 'var(--fiori-text-secondary, #64748B)' }}>Target Landscape:</span>{' '}
            <strong style={{ color: 'var(--fiori-navy, #102A43)' }}>{systemId}</strong> (Client {client})
          </div>
          <div style={{ gridColumn: 'span 2' }}>
            <span style={{ color: 'var(--fiori-text-secondary, #64748B)' }}>Release Baseline:</span>{' '}
            <strong style={{ color: 'var(--fiori-navy, #102A43)' }}>{targetRelease}</strong>
          </div>
        </div>
      </div>

      {/* Review Section 2: SAP Repository Metadata */}
      {sapMetadata && (
        <div
          style={{
            padding: '16px 20px',
            backgroundColor: 'var(--fiori-surface, #FFFFFF)',
            borderRadius: 'var(--radius-md, 6px)',
            border: '1px solid var(--fiori-border, #E2E8F0)',
            boxShadow: 'var(--fiori-shadow-xs)'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Database size={16} color="var(--fiori-primary, #0A6ED1)" />
              <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: 'var(--fiori-navy, #102A43)' }}>
                2. SAP Repository &amp; Dynpro Metadata
              </h4>
            </div>
            <button
              type="button"
              onClick={() => onEditStep(2)}
              className="fiori-btn fiori-btn-subtle"
              style={{ height: '26px', fontSize: '11px', padding: '0 8px' }}
            >
              <Edit3 size={12} /> Edit Step 2
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '10px', fontSize: '12px' }}>
            <div>
              <span style={{ color: 'var(--fiori-text-secondary, #64748B)' }}>Description:</span>{' '}
              <strong style={{ color: 'var(--fiori-navy, #102A43)' }}>{sapMetadata.description}</strong>
            </div>
            <div>
              <span style={{ color: 'var(--fiori-text-secondary, #64748B)' }}>Classification:</span>{' '}
              <StatusBadge status={sapMetadata.classification} size="sm" />
            </div>
            <div>
              <span style={{ color: 'var(--fiori-text-secondary, #64748B)' }}>Program:</span>{' '}
              <span style={{ fontFamily: 'var(--font-mono)' }}>{sapMetadata.programName}</span>
            </div>
            <div>
              <span style={{ color: 'var(--fiori-text-secondary, #64748B)' }}>Dynpro Screen:</span>{' '}
              <span style={{ fontFamily: 'var(--font-mono)' }}>{sapMetadata.screenNumber}</span>
            </div>
            <div>
              <span style={{ color: 'var(--fiori-text-secondary, #64748B)' }}>Package (TADIR):</span>{' '}
              <span style={{ fontFamily: 'var(--font-mono)' }}>{sapMetadata.packageName}</span>
            </div>
            <div>
              <span style={{ color: 'var(--fiori-text-secondary, #64748B)' }}>Data Provenance:</span>{' '}
              <span style={{ fontWeight: 600, color: '#E9730C' }}>
                {sapMetadata.provenance === 'LIVE_SAP_S21' ? 'Live SAP S21' : 'Curated Demo Fixture'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Review Section 3: Business Context */}
      <div
        style={{
          padding: '16px 20px',
          backgroundColor: 'var(--fiori-surface, #FFFFFF)',
          borderRadius: 'var(--radius-md, 6px)',
          border: '1px solid var(--fiori-border, #E2E8F0)',
          boxShadow: 'var(--fiori-shadow-xs)'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FileText size={16} color="var(--fiori-primary, #0A6ED1)" />
            <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: 'var(--fiori-navy, #102A43)' }}>
              3. Business Context &amp; Operational Objectives
            </h4>
          </div>
          <button
            type="button"
            onClick={() => onEditStep(3)}
            className="fiori-btn fiori-btn-subtle"
            style={{ height: '26px', fontSize: '11px', padding: '0 8px' }}
          >
            <Edit3 size={12} /> Edit Step 3
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12px' }}>
          <div>
            <span style={{ color: 'var(--fiori-text-secondary, #64748B)' }}>Primary Scenario:</span>{' '}
            <strong style={{ color: 'var(--fiori-navy, #102A43)' }}>{businessContext.primaryScenario}</strong>
          </div>
          <div>
            <span style={{ color: 'var(--fiori-text-secondary, #64748B)' }}>Criticality:</span>{' '}
            <StatusBadge status={businessContext.businessCriticality} size="sm" />
          </div>
          <div>
            <span style={{ color: 'var(--fiori-text-secondary, #64748B)' }}>Selected Requirements:</span>
            <ul style={{ margin: '4px 0 0 16px', padding: 0 }}>
              {businessContext.selectedRequirements.map((r, i) => (
                <li key={i} style={{ color: 'var(--fiori-text-primary, #1B2838)' }}>{r}</li>
              ))}
            </ul>
          </div>
          <div style={{ marginTop: '4px' }}>
            <span style={{ color: 'var(--fiori-text-secondary, #64748B)' }}>Objective:</span>
            <p style={{ margin: '2px 0 0', color: 'var(--fiori-text-primary, #1B2838)', lineHeight: 1.4 }}>
              {businessContext.assessmentObjective}
            </p>
          </div>
        </div>
      </div>

      {/* Review Section 4: Application Requirements */}
      <div
        style={{
          padding: '16px 20px',
          backgroundColor: 'var(--fiori-surface, #FFFFFF)',
          borderRadius: 'var(--radius-md, 6px)',
          border: '1px solid var(--fiori-border, #E2E8F0)',
          boxShadow: 'var(--fiori-shadow-xs)'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Layers size={16} color="var(--fiori-primary, #0A6ED1)" />
            <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: 'var(--fiori-navy, #102A43)' }}>
              4. Technical Application Requirements
            </h4>
          </div>
          <button
            type="button"
            onClick={() => onEditStep(4)}
            className="fiori-btn fiori-btn-subtle"
            style={{ height: '26px', fontSize: '11px', padding: '0 8px' }}
          >
            <Edit3 size={12} /> Edit Step 4
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '10px', fontSize: '12px' }}>
          <div>
            <span style={{ color: 'var(--fiori-text-secondary, #64748B)' }}>Business Role:</span>{' '}
            <span style={{ fontFamily: 'var(--font-mono)' }}>{applicationRequirements.relevantBusinessRole}</span>
          </div>
          <div>
            <span style={{ color: 'var(--fiori-text-secondary, #64748B)' }}>OData Service:</span>{' '}
            <span style={{ fontFamily: 'var(--font-mono)' }}>{applicationRequirements.knownODataService}</span>
          </div>
          <div style={{ gridColumn: 'span 2' }}>
            <span style={{ color: 'var(--fiori-text-secondary, #64748B)' }}>Required Functionality:</span>{' '}
            <span style={{ fontWeight: 600 }}>{applicationRequirements.requiredFunctionality.join(', ')}</span>
          </div>
          {applicationRequirements.knownLimitations && (
            <div style={{ gridColumn: 'span 2' }}>
              <span style={{ color: 'var(--fiori-text-secondary, #64748B)' }}>Custom Limitations:</span>{' '}
              <span>{applicationRequirements.knownLimitations}</span>
            </div>
          )}
        </div>
      </div>

      {/* Review Section 5: Official Fiori Catalogue Reference Link */}
      {catalogueApp && (
        <div
          style={{
            padding: '14px 18px',
            borderRadius: 'var(--radius-md, 6px)',
            backgroundColor: 'var(--fiori-info-bg, #EFF6FF)',
            border: '1px solid var(--fiori-info-border, #BFDBFE)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '10px'
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--fiori-primary, #0A6ED1)' }}>
                {catalogueApp.appId}
              </span>
              <strong style={{ fontSize: '13px', color: 'var(--fiori-navy, #102A43)' }}>
                {catalogueApp.appName}
              </strong>
              <StatusBadge status={catalogueApp.uiTechnology} size="sm" />
            </div>
            <div style={{ fontSize: '11px', color: 'var(--fiori-text-secondary, #64748B)', marginTop: '2px' }}>
              Official SAP Fiori Apps Reference Library Baseline &bull; Verified 2026-11-04
            </div>
          </div>

          <a
            href={catalogueApp.officialSourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="fiori-btn fiori-btn-primary"
            style={{ height: '30px', fontSize: '12px' }}
          >
            Open in Official SAP Library <ExternalLink size={13} />
          </a>
        </div>
      )}

      {/* Submission Confirmation Notice */}
      <InformationPanel variant="success" title="Ready for Formal Assessment">
        Submitting this discovery request will register an active assessment in the <strong>S21 Ledger</strong>,
        synthesize technical evidence, and open the full <strong>Assessment Results Workspace</strong>.
      </InformationPanel>

      {/* Navigation Buttons */}
      <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '12px', borderTop: '1px solid var(--fiori-border, #E2E8F0)' }}>
        <button
          type="button"
          onClick={onBack}
          className="fiori-btn fiori-btn-secondary"
          style={{ height: '36px', padding: '0 16px', fontSize: '13px' }}
        >
          <ArrowLeft size={14} /> Back
        </button>

        <button
          type="button"
          onClick={onSubmit}
          disabled={isSubmitting}
          className="fiori-btn fiori-btn-primary"
          style={{ height: '36px', padding: '0 24px', fontSize: '13px', fontWeight: 700 }}
        >
          <Send size={14} /> {isSubmitting ? 'Submitting Assessment...' : 'Submit Transaction Assessment'}
        </button>
      </div>
    </div>
  );
};
