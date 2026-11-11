import React from 'react';
import { BusinessContext } from '../../../services/contracts/types';
import { ArrowLeft, ArrowRight, HelpCircle, CheckSquare, Square, Target, FileText } from 'lucide-react';

export interface Step3ContextProps {
  tcode: string;
  context: BusinessContext;
  onChange: (updated: BusinessContext) => void;
  onBack: () => void;
  onNext: () => void;
}

export const Step3Context: React.FC<Step3ContextProps> = ({
  tcode,
  context,
  onChange,
  onBack,
  onNext
}) => {
  const isF53 = tcode === 'F-53';
  const isF28 = tcode === 'F-28';
  const isFS00 = tcode === 'FS00';

  const handleRequirementToggle = (req: string) => {
    const existing = [...context.selectedRequirements];
    const idx = existing.indexOf(req);
    if (idx >= 0) {
      existing.splice(idx, 1);
    } else {
      existing.push(req);
    }
    onChange({ ...context, selectedRequirements: existing });
  };

  const handleFunctionalityToggle = (func: string) => {
    const existing = [...context.expectedFunctionality];
    const idx = existing.indexOf(func);
    if (idx >= 0) {
      existing.splice(idx, 1);
    } else {
      existing.push(func);
    }
    onChange({ ...context, expectedFunctionality: existing });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div>
        <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--fiori-navy, #102A43)', margin: '0 0 6px' }}>
          Step 3: Business Context &amp; Operational Objectives
        </h3>
        <p style={{ fontSize: '13px', color: 'var(--fiori-text-secondary, #64748B)', margin: 0 }}>
          {isF53
            ? 'Define Accounts Payable outgoing payment clearing scenarios and payment execution requirements.'
            : isF28
            ? 'Define Accounts Receivable incoming customer payment receipt and open-item clearing scenarios.'
            : isFS00
            ? 'Define General Ledger account master data maintenance and chart of accounts parameters.'
            : `Capture the functional business context and operational objectives for ${tcode}.`}
        </p>
      </div>

      {/* Question 1: Business Process & Scenario Selection */}
      <div
        style={{
          padding: '16px',
          backgroundColor: 'var(--fiori-surface, #FFFFFF)',
          borderRadius: 'var(--radius-md, 6px)',
          border: '1px solid var(--fiori-border, #E2E8F0)'
        }}
      >
        <label className="fiori-label fiori-label-required" style={{ fontSize: '13px', fontWeight: 700, color: 'var(--fiori-navy, #102A43)', marginBottom: '8px' }}>
          {isF53
            ? '1. Primary Outgoing Payment Scenario'
            : isF28
            ? '1. Primary Incoming Customer Payment Scenario'
            : isFS00
            ? '1. G/L Account Master Data Maintenance Scope'
            : '1. Primary Business Process Scenario'}
        </label>

        {isF53 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}>
            {[
              { val: 'Standard vendor invoice open-item clearing and bank transfer execution', label: 'Standard Vendor Invoice Clearing (AP Open Items)' },
              { val: 'Vendor down payment allocation and advance clearing', label: 'Vendor Down Payment & Advance Clearing' },
              { val: 'Manual outgoing check and immediate bank disbursement', label: 'Manual Check & Immediate Bank Disbursement' },
              { val: 'Partial payments and residual open-item settlement', label: 'Partial Payment Settlement & Residual Items' }
            ].map((opt) => (
              <label
                key={opt.val}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 12px',
                  borderRadius: 'var(--radius-sm, 4px)',
                  backgroundColor: context.primaryScenario === opt.val ? 'var(--fiori-sidebar-active, #E1EFFD)' : 'var(--fiori-bg, #F5F7FA)',
                  border: context.primaryScenario === opt.val ? '1px solid var(--fiori-primary, #0A6ED1)' : '1px solid var(--fiori-border, #E2E8F0)',
                  cursor: 'pointer',
                  fontSize: '13px'
                }}
              >
                <input
                  type="radio"
                  name="f53Scenario"
                  value={opt.val}
                  checked={context.primaryScenario === opt.val}
                  onChange={(e) => onChange({ ...context, primaryScenario: e.target.value })}
                />
                <span style={{ fontWeight: context.primaryScenario === opt.val ? 600 : 400 }}>{opt.label}</span>
              </label>
            ))}
          </div>
        )}

        {isF28 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}>
            {[
              { val: 'Customer payment receipt with automated invoice open-item clearing', label: 'Customer Invoice Clearing (AR Open Items)' },
              { val: 'Partial payment allocation across multiple customer billing documents', label: 'Partial Payment Across Billing Documents' },
              { val: 'Unassigned customer payment on account with subsequent clearing', label: 'Customer Payment on Account (Unassigned)' },
              { val: 'Residual item posting with underpayment reason codes', label: 'Underpayment Residual Item Creation' }
            ].map((opt) => (
              <label
                key={opt.val}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 12px',
                  borderRadius: 'var(--radius-sm, 4px)',
                  backgroundColor: context.primaryScenario === opt.val ? 'var(--fiori-sidebar-active, #E1EFFD)' : 'var(--fiori-bg, #F5F7FA)',
                  border: context.primaryScenario === opt.val ? '1px solid var(--fiori-primary, #0A6ED1)' : '1px solid var(--fiori-border, #E2E8F0)',
                  cursor: 'pointer',
                  fontSize: '13px'
                }}
              >
                <input
                  type="radio"
                  name="f28Scenario"
                  value={opt.val}
                  checked={context.primaryScenario === opt.val}
                  onChange={(e) => onChange({ ...context, primaryScenario: e.target.value })}
                />
                <span style={{ fontWeight: context.primaryScenario === opt.val ? 600 : 400 }}>{opt.label}</span>
              </label>
            ))}
          </div>
        )}

        {isFS00 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}>
            {[
              { val: 'Central G/L account master record creation across Chart of Accounts and Company Codes', label: 'Central Chart of Accounts & Company Code Segment Maintenance' },
              { val: 'Operational Chart of Accounts creation only', label: 'Chart of Accounts Segment (Global Template)' },
              { val: 'Company code local segment configuration and currency setup', label: 'Company Code Segment Configuration (Local Entity)' },
              { val: 'Cost element and primary/secondary category reclassification', label: 'Cost Element Integration & Category Assignment' }
            ].map((opt) => (
              <label
                key={opt.val}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 12px',
                  borderRadius: 'var(--radius-sm, 4px)',
                  backgroundColor: context.primaryScenario === opt.val ? 'var(--fiori-sidebar-active, #E1EFFD)' : 'var(--fiori-bg, #F5F7FA)',
                  border: context.primaryScenario === opt.val ? '1px solid var(--fiori-primary, #0A6ED1)' : '1px solid var(--fiori-border, #E2E8F0)',
                  cursor: 'pointer',
                  fontSize: '13px'
                }}
              >
                <input
                  type="radio"
                  name="fs00Scenario"
                  value={opt.val}
                  checked={context.primaryScenario === opt.val}
                  onChange={(e) => onChange({ ...context, primaryScenario: e.target.value })}
                />
                <span style={{ fontWeight: context.primaryScenario === opt.val ? 600 : 400 }}>{opt.label}</span>
              </label>
            ))}
          </div>
        )}

        {!isF53 && !isF28 && !isFS00 && (
          <div style={{ marginTop: '8px' }}>
            <input
              type="text"
              className="fiori-input"
              value={context.primaryScenario}
              onChange={(e) => onChange({ ...context, primaryScenario: e.target.value })}
              placeholder="e.g. Daily operational transaction execution, master data maintenance, or reporting..."
              style={{ width: '100%' }}
            />
          </div>
        )}
      </div>

      {/* Question 2: Selected Requirements */}
      <div
        style={{
          padding: '16px',
          backgroundColor: 'var(--fiori-surface, #FFFFFF)',
          borderRadius: 'var(--radius-md, 6px)',
          border: '1px solid var(--fiori-border, #E2E8F0)'
        }}
      >
        <label className="fiori-label" style={{ fontSize: '13px', fontWeight: 700, color: 'var(--fiori-navy, #102A43)', marginBottom: '8px' }}>
          {isF53
            ? '2. Vendor & Payment Processing Requirements'
            : isF28
            ? '2. Customer Clearing & Settlement Requirements'
            : isFS00
            ? '2. Chart of Accounts & Master Data Requirements'
            : '2. Operational & Business Requirements'}
        </label>
        <p style={{ fontSize: '12px', color: 'var(--fiori-text-secondary, #64748B)', margin: '0 0 10px' }}>
          Select all functional capabilities mandatory for this transaction's business process:
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '8px' }}>
          {(isF53
            ? [
                'Multi-currency payment execution with automatic exchange rate conversion',
                'Automatic cash discount deduction according to payment terms',
                'Payment advice creation and vendor remittance notification',
                'House bank and payment method determination with clearing rules',
                'Payment blocking and release workflow validation'
              ]
            : isF28
            ? [
                'Customer billing reference and assignment document matching',
                'Automatic cash discount handling within agreed tolerance limits',
                'Dispute case linkage and cross-company code clearing',
                'Real-time customer account balance and credit exposure checks',
                'Automated write-off within defined financial thresholds'
              ]
            : isFS00
            ? [
                'Chart of Accounts segment specification (Account group, Balance sheet/P&L)',
                'Company code segment configuration (Account currency, Tax category, Recon flag)',
                'Primary/Secondary cost element category assignment',
                'Full change document history and timeline audit',
                'Open item management and line item display enablement'
              ]
            : [
                'Standard S/4HANA table data persistence without manual batch input',
                'Granular authorization checks against SU24 authorization profiles',
                'Real-time validation with detailed error message logging',
                'Integration with background asynchronous processing queues',
                'Audit log and change tracking compliance'
              ]
          ).map((req) => {
            const isChecked = context.selectedRequirements.includes(req);
            return (
              <div
                key={req}
                onClick={() => handleRequirementToggle(req)}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '8px',
                  padding: '8px 10px',
                  borderRadius: 'var(--radius-sm, 4px)',
                  backgroundColor: isChecked ? 'var(--fiori-surface-selected, #EBF3FB)' : 'var(--fiori-bg, #F5F7FA)',
                  border: isChecked ? '1px solid var(--fiori-primary, #0A6ED1)' : '1px solid var(--fiori-border, #E2E8F0)',
                  cursor: 'pointer',
                  fontSize: '12px',
                  color: isChecked ? 'var(--fiori-navy, #102A43)' : 'var(--fiori-text-primary, #1B2838)'
                }}
              >
                {isChecked ? (
                  <CheckSquare size={16} color="var(--fiori-primary, #0A6ED1)" style={{ marginTop: '2px', flexShrink: 0 }} />
                ) : (
                  <Square size={16} color="var(--fiori-text-secondary, #64748B)" style={{ marginTop: '2px', flexShrink: 0 }} />
                )}
                <span>{req}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Question 3: Assessment Objective */}
      <div
        style={{
          padding: '16px',
          backgroundColor: 'var(--fiori-surface, #FFFFFF)',
          borderRadius: 'var(--radius-md, 6px)',
          border: '1px solid var(--fiori-border, #E2E8F0)'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
          <label className="fiori-label fiori-label-required" style={{ fontSize: '13px', fontWeight: 700, color: 'var(--fiori-navy, #102A43)' }}>
            3. Assessment Objective &amp; Justification
          </label>
          <span style={{ fontSize: '11px', color: 'var(--fiori-text-secondary, #64748B)' }}>
            Pre-populated based on target SAP S/4HANA Simplification Baseline
          </span>
        </div>

        <textarea
          className="fiori-textarea"
          value={context.assessmentObjective}
          onChange={(e) => onChange({ ...context, assessmentObjective: e.target.value })}
          rows={3}
          style={{ width: '100%', fontSize: '13px', lineHeight: 1.5, resize: 'vertical' }}
        />
      </div>

      {/* Question 4: Business Criticality */}
      <div
        style={{
          padding: '14px 16px',
          backgroundColor: 'var(--fiori-bg, #F5F7FA)',
          borderRadius: 'var(--radius-md, 6px)',
          border: '1px solid var(--fiori-border, #E2E8F0)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px'
        }}
      >
        <div>
          <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--fiori-navy, #102A43)' }}>
            Business Criticality:
          </span>
          <div style={{ fontSize: '11px', color: 'var(--fiori-text-secondary, #64748B)' }}>
            Operational impact if this transaction experiences downtime or disruption.
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          {(['HIGH', 'MEDIUM', 'LOW'] as const).map((crit) => (
            <button
              key={crit}
              type="button"
              onClick={() => onChange({ ...context, businessCriticality: crit })}
              style={{
                padding: '4px 12px',
                fontSize: '12px',
                fontWeight: 600,
                borderRadius: 'var(--radius-sm, 4px)',
                cursor: 'pointer',
                backgroundColor: context.businessCriticality === crit ? (crit === 'HIGH' ? '#BB0000' : crit === 'MEDIUM' ? '#E9730C' : '#188918') : '#FFFFFF',
                color: context.businessCriticality === crit ? '#FFFFFF' : 'var(--fiori-navy, #102A43)',
                border: context.businessCriticality === crit ? 'none' : '1px solid var(--fiori-border, #E2E8F0)'
              }}
            >
              {crit}
            </button>
          ))}
        </div>
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
          disabled={!context.primaryScenario.trim() || !context.assessmentObjective.trim()}
          className="fiori-btn fiori-btn-primary"
          style={{ height: '36px', padding: '0 20px', fontSize: '13px' }}
        >
          Proceed to Requirements <ArrowRight size={14} />
        </button>
      </div>
    </div>
  );
};
