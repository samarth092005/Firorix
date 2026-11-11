import React from 'react';
import { ApplicationRequirements } from '../../../services/contracts/types';
import { InformationPanel } from '../../../components/common';
import { ArrowLeft, ArrowRight, ShieldCheck, Tag, Plus, X } from 'lucide-react';

export interface Step4RequirementsProps {
  tcode: string;
  requirements: ApplicationRequirements;
  onChange: (updated: ApplicationRequirements) => void;
  onBack: () => void;
  onNext: () => void;
}

export const Step4Requirements: React.FC<Step4RequirementsProps> = ({
  tcode,
  requirements,
  onChange,
  onBack,
  onNext
}) => {
  const [newTag, setNewTag] = React.useState('');

  const handleAddTag = () => {
    if (newTag.trim() && !requirements.requiredFunctionality.includes(newTag.trim())) {
      onChange({
        ...requirements,
        requiredFunctionality: [...requirements.requiredFunctionality, newTag.trim()]
      });
      setNewTag('');
    }
  };

  const handleRemoveTag = (tag: string) => {
    onChange({
      ...requirements,
      requiredFunctionality: requirements.requiredFunctionality.filter((t) => t !== tag)
    });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div>
        <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--fiori-navy, #102A43)', margin: '0 0 6px' }}>
          Step 4: Application &amp; Technical Requirements
        </h3>
        <p style={{ fontSize: '13px', color: 'var(--fiori-text-secondary, #64748B)', margin: 0 }}>
          Specify relevant standard business roles, OData service dependencies, and custom technical constraints.
        </p>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '16px'
        }}
      >
        {/* Field 1: Business Role */}
        <div className="fiori-form-group">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <label className="fiori-label fiori-label-required">
              Target SAP Business Role
            </label>
            <span style={{ fontSize: '11px', color: '#0066FF', fontWeight: 600 }}>Catalog Template</span>
          </div>
          <input
            type="text"
            className="fiori-input"
            value={requirements.relevantBusinessRole}
            onChange={(e) => onChange({ ...requirements, relevantBusinessRole: e.target.value })}
            placeholder="e.g. SAP_BR_AP_ACCOUNTANT, SAP_BR_GL_ACCOUNTANT"
            style={{ fontFamily: 'var(--font-mono)', fontSize: '13px' }}
          />
          <div style={{ fontSize: '11px', color: 'var(--fiori-text-secondary, #64748B)', marginTop: '4px' }}>
            Template role associated with the standard Fiori Launchpad catalogue.
          </div>
        </div>

        {/* Field 2: OData Service Reference */}
        <div className="fiori-form-group">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <label className="fiori-label fiori-label-required">
              Target OData Service Reference
            </label>
            <span style={{ fontSize: '11px', color: '#0066FF', fontWeight: 600 }}>Service Binding</span>
          </div>
          <input
            type="text"
            className="fiori-input"
            value={requirements.knownODataService}
            onChange={(e) => onChange({ ...requirements, knownODataService: e.target.value })}
            placeholder="e.g. FAR_OUTGOING_PAYMENT_SRV, GL_ACCOUNT_MD_SRV"
            style={{ fontFamily: 'var(--font-mono)', fontSize: '13px' }}
          />
          <div style={{ fontSize: '11px', color: 'var(--fiori-text-secondary, #64748B)', marginTop: '4px' }}>
            SAP Gateway service endpoint or RAP Service Binding for data exposure.
          </div>
        </div>

        {/* Field 3: Target Release Profile */}
        <div className="fiori-form-group">
          <label className="fiori-label">
            Target Release Profile
          </label>
          <input
            type="text"
            className="fiori-input"
            value={requirements.targetReleaseProfile}
            disabled
            style={{ backgroundColor: 'var(--fiori-bg, #F5F7FA)', color: 'var(--fiori-text-secondary, #64748B)' }}
          />
          <div style={{ fontSize: '11px', color: 'var(--fiori-text-secondary, #64748B)', marginTop: '4px' }}>
            Clean-core Tier 1 target profile (SAP S/4HANA 2023 Private Edition).
          </div>
        </div>
      </div>

      {/* Required Functional Capabilities Tags */}
      <div
        style={{
          padding: '16px',
          backgroundColor: 'var(--fiori-surface, #FFFFFF)',
          borderRadius: 'var(--radius-md, 6px)',
          border: '1px solid var(--fiori-border, #E2E8F0)'
        }}
      >
        <label className="fiori-label" style={{ fontSize: '13px', fontWeight: 700, color: 'var(--fiori-navy, #102A43)', marginBottom: '6px' }}>
          Required Application Capabilities &amp; Features
        </label>
        <p style={{ fontSize: '12px', color: 'var(--fiori-text-secondary, #64748B)', margin: '0 0 10px' }}>
          Key functional tags required in the Fiori elements floorplan or extension manifest:
        </p>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '12px' }}>
          {requirements.requiredFunctionality.map((func) => (
            <span
              key={func}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '4px 10px',
                backgroundColor: 'var(--fiori-sidebar-active, #E1EFFD)',
                color: 'var(--fiori-primary, #0A6ED1)',
                border: '1px solid rgba(10, 110, 209, 0.25)',
                borderRadius: 'var(--radius-sm, 4px)',
                fontSize: '12px',
                fontWeight: 600
              }}
            >
              <Tag size={12} />
              {func}
              <button
                type="button"
                onClick={() => handleRemoveTag(func)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '1px',
                  display: 'flex',
                  alignItems: 'center',
                  color: 'var(--fiori-primary, #0A6ED1)'
                }}
              >
                <X size={12} />
              </button>
            </span>
          ))}
        </div>

        <div style={{ display: 'flex', gap: '8px', maxWidth: '420px' }}>
          <input
            type="text"
            className="fiori-input"
            value={newTag}
            onChange={(e) => setNewTag(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleAddTag();
              }
            }}
            placeholder="Add capability (e.g. Mass Posting, PDF Export)..."
            style={{ flex: 1 }}
          />
          <button
            type="button"
            onClick={handleAddTag}
            className="fiori-btn fiori-btn-secondary"
            style={{ height: '32px' }}
          >
            <Plus size={14} /> Add
          </button>
        </div>
      </div>

      {/* Custom Limitations / User Exits */}
      <div
        style={{
          padding: '16px',
          backgroundColor: 'var(--fiori-surface, #FFFFFF)',
          borderRadius: 'var(--radius-md, 6px)',
          border: '1px solid var(--fiori-border, #E2E8F0)'
        }}
      >
        <label className="fiori-label" style={{ fontSize: '13px', fontWeight: 700, color: 'var(--fiori-navy, #102A43)', marginBottom: '4px' }}>
          Known Limitations, Custom User Exits or BAdIs
        </label>
        <p style={{ fontSize: '12px', color: 'var(--fiori-text-secondary, #64748B)', margin: '0 0 8px' }}>
          Document any existing custom modifications in program or screen exits (e.g. enhancements in SAPMF05A or custom validation BAdIs).
        </p>

        <textarea
          className="fiori-textarea"
          value={requirements.knownLimitations}
          onChange={(e) => onChange({ ...requirements, knownLimitations: e.target.value })}
          rows={3}
          placeholder="e.g. Custom validation BAdI Z_FI_DOC_VALIDATION implemented in ECC; check for S/4HANA release compatibility..."
          style={{ width: '100%', fontSize: '13px', lineHeight: 1.5, resize: 'vertical' }}
        />
      </div>

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
          onClick={onNext}
          disabled={!requirements.relevantBusinessRole.trim() || !requirements.knownODataService.trim()}
          className="fiori-btn fiori-btn-primary"
          style={{ height: '36px', padding: '0 20px', fontSize: '13px' }}
        >
          Review Discovery Summary <ArrowRight size={14} />
        </button>
      </div>
    </div>
  );
};
