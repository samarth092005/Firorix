import React from 'react';
import { AssessmentRecord } from '../../../services/contracts/types';
import { X, FileCode, CheckCircle2, Server, Briefcase, Database } from 'lucide-react';

export interface DiscoveryDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  assessment: AssessmentRecord;
}

export const DiscoveryDetailsModal: React.FC<DiscoveryDetailsModalProps> = ({
  isOpen,
  onClose,
  assessment
}) => {
  if (!isOpen) return null;

  const ctx = assessment.businessContext;
  const reqs = assessment.applicationRequirements;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(16, 42, 67, 0.6)',
        backdropFilter: 'blur(3px)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px'
      }}
    >
      <div
        style={{
          width: '750px',
          maxWidth: '95vw',
          maxHeight: '85vh',
          backgroundColor: '#FFFFFF',
          borderRadius: 'var(--radius-md, 6px)',
          boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '16px 20px',
            borderBottom: '1px solid var(--fiori-border, #E2E8F0)',
            backgroundColor: 'var(--fiori-surface-subtle, #F8FAFC)'
          }}
        >
          <div>
            <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: 'var(--fiori-navy, #102A43)' }}>
              Discovery Intake Record: {assessment.tcode}
            </h3>

          </div>

          <button
            type="button"
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--fiori-text-secondary, #64748B)' }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px', fontSize: '12px' }}>
          {/* Step 1 & 2 Summary */}
          <div style={{ padding: '14px', backgroundColor: 'var(--fiori-surface-subtle, #F8FAFC)', borderRadius: '4px', border: '1px solid #E2E8F0' }}>
            <h4 style={{ margin: '0 0 8px 0', fontSize: '13px', color: 'var(--fiori-navy, #102A43)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Database size={14} color="var(--fiori-primary, #0A6ED1)" />
              Steps 1 &amp; 2: SAP Transaction Identification &amp; DDIC Snapshot
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
              <div>T-Code: <strong>{assessment.tcode}</strong></div>
              <div>Description: <strong>{assessment.description}</strong></div>
              <div>Program: <code>{assessment.programName}</code></div>
              <div>Screen: <code>{assessment.screenNumber}</code></div>
              <div>Package: <code>{assessment.packageName}</code></div>
              <div>Original System: <code>{assessment.originalSystem}</code></div>
              <div>Software Component: <code>{assessment.softwareComponent}</code></div>
              <div>Classification: <strong>{assessment.classification}</strong></div>
            </div>
          </div>

          {/* Step 3 Business Context */}
          {ctx ? (
            <div style={{ padding: '14px', backgroundColor: 'var(--fiori-surface-subtle, #F8FAFC)', borderRadius: '4px', border: '1px solid #E2E8F0' }}>
              <h4 style={{ margin: '0 0 8px 0', fontSize: '13px', color: 'var(--fiori-navy, #102A43)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Briefcase size={14} color="var(--fiori-primary, #0A6ED1)" />
                Step 3: Consultant Business Context Intake
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div>Business Process: <strong>{ctx.businessProcess}</strong></div>
                <div>Primary Scenario: <strong>{ctx.primaryScenario}</strong></div>
                <div>Criticality: <strong>{ctx.businessCriticality}</strong></div>
                <div>Assessment Objective: <em>{ctx.assessmentObjective}</em></div>
                {ctx.selectedRequirements.length > 0 && (
                  <div style={{ marginTop: '4px' }}>
                    <strong>Selected Functional Requirements:</strong>
                    <ul style={{ margin: '4px 0 0 16px', padding: 0 }}>
                      {ctx.selectedRequirements.map((r, i) => (
                        <li key={i}>{r}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div style={{ padding: '10px 14px', backgroundColor: '#F8FAFC', borderRadius: '4px', border: '1px solid #E2E8F0', fontStyle: 'italic', color: '#64748B' }}>
              No custom business context was recorded for this baseline record.
            </div>
          )}

          {/* Step 4 Application Requirements */}
          {reqs && (
            <div style={{ padding: '14px', backgroundColor: 'var(--fiori-surface-subtle, #F8FAFC)', borderRadius: '4px', border: '1px solid #E2E8F0' }}>
              <h4 style={{ margin: '0 0 8px 0', fontSize: '13px', color: 'var(--fiori-navy, #102A43)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <FileCode size={14} color="var(--fiori-primary, #0A6ED1)" />
                Step 4: Application Requirements &amp; User Reference Intake
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div>Consultant-Designated Role: <code>{reqs.relevantBusinessRole}</code></div>
                <div>Consultant-Referenced OData: <code>{reqs.knownODataService}</code></div>
                <div>Target Release Profile: <strong>{reqs.targetReleaseProfile}</strong></div>
                {reqs.knownLimitations && (
                  <div>Known Customizations: <em>{reqs.knownLimitations}</em></div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '12px 20px',
            borderTop: '1px solid var(--fiori-border, #E2E8F0)',
            display: 'flex',
            justifyContent: 'flex-end',
            backgroundColor: 'var(--fiori-surface-subtle, #F8FAFC)'
          }}
        >
          <button type="button" className="fiori-btn fiori-btn-secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
