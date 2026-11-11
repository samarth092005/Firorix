import React from 'react';
import { TransactionDiscoveryResponse } from '../../../services/contracts/types';
import { StatusBadge, InformationPanel, LoadingState } from '../../../components/common';
import { ArrowLeft, ArrowRight, Server, Database, Code, CheckCircle2, AlertTriangle, ExternalLink, ShieldCheck, Zap } from 'lucide-react';

export interface Step2InformationProps {
  metadata: TransactionDiscoveryResponse | null;
  isLoading: boolean;
  onBack: () => void;
  onNext: () => void;
  onQuickAssess?: () => void;
}

export const Step2Information: React.FC<Step2InformationProps> = ({
  metadata,
  isLoading,
  onBack,
  onNext,
  onQuickAssess
}) => {
  if (isLoading) {
    return <LoadingState message="Extracting SAP DDIC & repository metadata..." subMessage="Querying TSTC, TSTCT, and TADIR records for target system..." />;
  }

  if (!metadata) {
    return (
      <div style={{ padding: '24px', textAlign: 'center' }}>
        <p>No metadata available. Please return to Step 1 and specify a valid transaction.</p>
        <button type="button" onClick={onBack} className="fiori-btn fiori-btn-secondary">
          <ArrowLeft size={14} /> Back to Step 1
        </button>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--fiori-navy, #102A43)', margin: '0 0 6px' }}>
              Step 2: SAP Transaction Repository Information
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--fiori-text-secondary, #64748B)', margin: 0 }}>
              Verified dictionary metadata, executable dynpro parameters and TADIR object ownership.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <StatusBadge status={metadata.classification} size="md" />
            <span
              style={{
                fontSize: '11px',
                fontWeight: 700,
                color: metadata.isLiveVerified ? 'var(--fiori-success, #188918)' : '#E9730C',
                backgroundColor: metadata.isLiveVerified ? 'var(--fiori-success-bg, #EDF7ED)' : '#FEF7ED',
                border: `1px solid ${metadata.isLiveVerified ? 'var(--fiori-success-border, #A3D9A3)' : '#F8CB96'}`,
                padding: '3px 8px',
                borderRadius: 'var(--radius-xs, 2px)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              <Database size={12} />
              Verified SAP S/4HANA Baseline
            </span>
          </div>
        </div>
      </div>

      {/* Main Metadata Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '14px',
          backgroundColor: 'var(--fiori-bg, #F5F7FA)',
          padding: '16px',
          borderRadius: 'var(--radius-md, 6px)',
          border: '1px solid var(--fiori-border, #E2E8F0)'
        }}
      >
        <div style={{ padding: '10px 12px', backgroundColor: '#FFFFFF', borderRadius: 'var(--radius-sm, 4px)', border: '1px solid var(--fiori-border, #E2E8F0)' }}>
          <div style={{ fontSize: '11px', color: 'var(--fiori-text-secondary, #64748B)', textTransform: 'uppercase', fontWeight: 600 }}>
            Transaction Code (TSTC)
          </div>
          <div style={{ fontSize: '16px', fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--fiori-navy, #102A43)', marginTop: '2px' }}>
            {metadata.tcode}
          </div>
        </div>

        <div style={{ padding: '10px 12px', backgroundColor: '#FFFFFF', borderRadius: 'var(--radius-sm, 4px)', border: '1px solid var(--fiori-border, #E2E8F0)' }}>
          <div style={{ fontSize: '11px', color: 'var(--fiori-text-secondary, #64748B)', textTransform: 'uppercase', fontWeight: 600 }}>
            Transaction Text (TSTCT)
          </div>
          <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--fiori-text-primary, #1B2838)', marginTop: '2px' }}>
            {metadata.description}
          </div>
        </div>

        <div style={{ padding: '10px 12px', backgroundColor: '#FFFFFF', borderRadius: 'var(--radius-sm, 4px)', border: '1px solid var(--fiori-border, #E2E8F0)' }}>
          <div style={{ fontSize: '11px', color: 'var(--fiori-text-secondary, #64748B)', textTransform: 'uppercase', fontWeight: 600 }}>
            Executable Program
          </div>
          <div style={{ fontSize: '13px', fontWeight: 600, fontFamily: 'var(--font-mono)', color: 'var(--fiori-navy, #102A43)', marginTop: '2px' }}>
            {metadata.programName}
          </div>
        </div>

        <div style={{ padding: '10px 12px', backgroundColor: '#FFFFFF', borderRadius: 'var(--radius-sm, 4px)', border: '1px solid var(--fiori-border, #E2E8F0)' }}>
          <div style={{ fontSize: '11px', color: 'var(--fiori-text-secondary, #64748B)', textTransform: 'uppercase', fontWeight: 600 }}>
            Dynpro Screen Number
          </div>
          <div style={{ fontSize: '13px', fontWeight: 600, fontFamily: 'var(--font-mono)', color: 'var(--fiori-navy, #102A43)', marginTop: '2px' }}>
            {metadata.screenNumber}
          </div>
        </div>

        <div style={{ padding: '10px 12px', backgroundColor: '#FFFFFF', borderRadius: 'var(--radius-sm, 4px)', border: '1px solid var(--fiori-border, #E2E8F0)' }}>
          <div style={{ fontSize: '11px', color: 'var(--fiori-text-secondary, #64748B)', textTransform: 'uppercase', fontWeight: 600 }}>
            Development Package (TADIR)
          </div>
          <div style={{ fontSize: '13px', fontWeight: 600, fontFamily: 'var(--font-mono)', color: 'var(--fiori-navy, #102A43)', marginTop: '2px' }}>
            {metadata.packageName}
          </div>
        </div>

        <div style={{ padding: '10px 12px', backgroundColor: '#FFFFFF', borderRadius: 'var(--radius-sm, 4px)', border: '1px solid var(--fiori-border, #E2E8F0)' }}>
          <div style={{ fontSize: '11px', color: 'var(--fiori-text-secondary, #64748B)', textTransform: 'uppercase', fontWeight: 600 }}>
            Original Repository System
          </div>
          <div style={{ fontSize: '13px', fontWeight: 600, fontFamily: 'var(--font-mono)', color: 'var(--fiori-navy, #102A43)', marginTop: '2px' }}>
            {metadata.originalSystem} ({metadata.softwareComponent})
          </div>
        </div>
      </div>

      {/* Verified Baseline Notice */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '10px 14px',
          backgroundColor: '#F0FDF4',
          border: '1px solid #BBF7D0',
          borderRadius: 'var(--radius-sm, 6px)',
          fontSize: '13px',
          color: '#15803D'
        }}
      >
        <CheckCircle2 size={16} color="#16A34A" />
        <span>Transaction validated against SAP S/4HANA Enterprise Baseline &bull; DDIC (TSTC/TSTCT) &amp; TADIR Object Active</span>
      </div>

      {/* Official Fiori Catalogue Match Preview */}
      {metadata.catalogueCandidates && metadata.catalogueCandidates.length > 0 ? (
        <div
          style={{
            padding: '16px',
            backgroundColor: 'var(--fiori-surface, #FFFFFF)',
            border: '1px solid var(--fiori-border, #E2E8F0)',
            borderRadius: 'var(--radius-md, 6px)'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--fiori-navy, #102A43)' }}>
              Official SAP Fiori Catalogue Match Identified:
            </span>
            <span style={{ fontSize: '11px', color: 'var(--fiori-text-secondary, #64748B)' }}>
              Source: SAP Fiori Apps Reference Library (fal.cloud.sap)
            </span>
          </div>

          {metadata.catalogueCandidates.map((candidate) => (
            <div
              key={candidate.appId}
              style={{
                padding: '12px 14px',
                borderRadius: 'var(--radius-sm, 4px)',
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
                  <span
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontWeight: 700,
                      fontSize: '12px',
                      color: 'var(--fiori-primary, #0A6ED1)',
                      backgroundColor: '#FFFFFF',
                      padding: '2px 6px',
                      borderRadius: '2px',
                      border: '1px solid var(--fiori-info-border, #BFDBFE)'
                    }}
                  >
                    {candidate.appId}
                  </span>
                  <span style={{ fontWeight: 700, fontSize: '13px', color: 'var(--fiori-navy, #102A43)' }}>
                    {candidate.appName}
                  </span>
                  <StatusBadge status={candidate.uiTechnology} size="sm" />
                </div>
                <div style={{ fontSize: '12px', color: 'var(--fiori-text-secondary, #64748B)', marginTop: '4px' }}>
                  {candidate.description}
                </div>
              </div>

              <a
                href={candidate.officialSourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="fiori-btn fiori-btn-subtle"
                style={{ fontSize: '12px', height: '28px' }}
                title="Open official documentation in SAP Fiori Apps Reference Library"
              >
                Official SAP Library <ExternalLink size={12} />
              </a>
            </div>
          ))}
        </div>
      ) : (
        <InformationPanel variant="neutral" title="Catalogue Evaluation Note">
          No direct official Fiori elements candidate was detected in the local baseline for this transaction.
          In Step 4 you will be able to capture custom application requirements or specify custom RAP extension needs.
        </InformationPanel>
      )}

      {/* Navigation Buttons */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '12px', borderTop: '1px solid var(--fiori-border, #E2E8F0)', flexWrap: 'wrap', gap: '10px' }}>
        <button
          type="button"
          onClick={onBack}
          className="fiori-btn fiori-btn-secondary"
          style={{ height: '36px', padding: '0 16px', fontSize: '13px' }}
        >
          <ArrowLeft size={14} /> Back
        </button>

        <div style={{ display: 'flex', gap: '10px' }}>
          {onQuickAssess && (
            <button
              type="button"
              onClick={onQuickAssess}
              className="fiori-btn fiori-btn-primary"
              style={{ height: '36px', padding: '0 16px', fontSize: '13px', backgroundColor: 'var(--fiori-primary, #0066FF)', color: '#FFFFFF', display: 'flex', alignItems: 'center', gap: '6px' }}
              title="Generate full evidence-backed assessment immediately with verified T-Code"
            >
              <Zap size={14} /> Run Assessment (T-Code Only)
            </button>
          )}

          <button
            type="button"
            onClick={onNext}
            className="fiori-btn fiori-btn-secondary"
            style={{ height: '36px', padding: '0 18px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            Optional Business Context <ArrowRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
};
