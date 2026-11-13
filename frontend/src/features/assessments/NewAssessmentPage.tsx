import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { systemService } from '../../services/mock/systemService';
import { assessmentService } from '../../services/mock/assessmentService';
import { SapSystem } from '../../types';
import { MessageStrip } from '../../components/status/MessageStrip';
import { Check, ArrowRight, ArrowLeft, ShieldAlert, Cpu } from 'lucide-react';

export const NewAssessmentPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialTCode = searchParams.get('tcode') || '';

  const [step, setStep] = useState(1);
  const [systems, setSystems] = useState<SapSystem[]>([]);
  const [selectedSystemId, setSelectedSystemId] = useState('');
  const [tcode, setTcode] = useState(initialTCode);
  const [title, setTitle] = useState('');
  const [businessProcess, setBusinessProcess] = useState('Order-to-Cash (O2C)');
  const [ownerName, setOwnerName] = useState('Elena Rostova (Lead SAP Consultant)');

  // Scopes
  const [scopeStructure, setScopeStructure] = useState(true);
  const [scopeAuthorizations, setScopeAuthorizations] = useState(true);
  const [scopeWhereUsed, setScopeWhereUsed] = useState(false);
  const [scopeFioriMapping, setScopeFioriMapping] = useState(true);

  // Governance confirmations
  const [confirmReadOnly, setConfirmReadOnly] = useState(false);
  const [confirmStandardFirst, setConfirmStandardFirst] = useState(false);
  const [confirmDraftOnly, setConfirmDraftOnly] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    systemService.getAllSystems().then((res) => {
      setSystems(res.data);
      if (res.data.length > 0) {
        setSelectedSystemId(res.data[0].id);
      }
    });
  }, []);

  const selectedSystem = systems.find((s) => s.id === selectedSystemId);

  const handleNext = () => {
    setError(null);
    if (step === 1 && !selectedSystemId) {
      setError('Please select an active target SAP system.');
      return;
    }
    if (step === 2 && !tcode.trim()) {
      setError('Please enter a valid Transaction Code.');
      return;
    }
    if (step === 4 && (!confirmReadOnly || !confirmStandardFirst || !confirmDraftOnly)) {
      setError('You must confirm all governance statements before proceeding.');
      return;
    }
    setStep(step + 1);
  };

  const handleCreate = async () => {
    try {
      setIsSubmitting(true);
      setError(null);
      const res = await assessmentService.createAssessment({
        systemId: selectedSystemId,
        systemAlias: selectedSystem?.alias || 'S4H_DEV_100',
        tcode: tcode.toUpperCase().trim(),
        title: title.trim() || `${tcode.toUpperCase().trim()} Assessment & Fiori Transition`,
        businessProcess,
        targetRelease: selectedSystem?.targetReleaseProfile || 'SAP S/4HANA 2022 FPS02',
        ownerName
      });
      navigate(`/assessments/${res.data.id}`);
    } catch (err: any) {
      setError(err.message || 'Failed to create assessment.');
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ padding: '24px', maxWidth: '860px', margin: '0 auto' }}>
      <div style={{ marginBottom: '24px' }}>
        <h1 className="fiori-page-title">Initiate Transaction Assessment</h1>
        <p className="fiori-page-subtitle">
          Guided 5-step workflow to configure discovery scope, confirm governance rules, and schedule automated repository analysis.
        </p>
      </div>

      {/* Stepper Indicator */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '24px',
          padding: '12px 20px',
          backgroundColor: 'var(--fiori-surface)',
          border: '1px solid var(--fiori-border)',
          borderRadius: 'var(--radius-md)'
        }}
      >
        {[
          { num: 1, label: 'Target System' },
          { num: 2, label: 'Transaction Code' },
          { num: 3, label: 'Discovery Scope' },
          { num: 4, label: 'Governance' },
          { num: 5, label: 'Review & Schedule' }
        ].map((s) => (
          <div key={s.num} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div
              style={{
                width: '24px',
                height: '24px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '11px',
                fontWeight: 700,
                backgroundColor:
                  step === s.num
                    ? 'var(--fiori-teal)'
                    : step > s.num
                    ? 'var(--fiori-success)'
                    : 'var(--fiori-border)',
                color: '#FFFFFF'
              }}
            >
              {step > s.num ? <Check size={14} /> : s.num}
            </div>
            <span
              style={{
                fontSize: '12px',
                fontWeight: step === s.num ? 600 : 400,
                color: step === s.num ? 'var(--fiori-text-primary)' : 'var(--fiori-text-secondary)'
              }}
            >
              {s.label}
            </span>
          </div>
        ))}
      </div>

      {error && <MessageStrip type="error">{error}</MessageStrip>}

      {/* Step Content */}
      <div className="fiori-card" style={{ padding: '24px', marginBottom: '20px' }}>
        {/* Step 1: Select System */}
        {step === 1 && (
          <div>
            <h2 style={{ fontSize: '16px', marginBottom: '8px' }}>Step 1: Select Target SAP S/4HANA System</h2>
            <p style={{ fontSize: '13px', color: 'var(--fiori-text-secondary)', marginBottom: '16px' }}>
              Choose the connected on-premise system whose repository metadata and SU24 authorization tables will be queried.
            </p>

            <div className="fiori-form-group">
              <label className="fiori-label fiori-label-required">Connected SAP System</label>
              <select
                className="fiori-select"
                value={selectedSystemId}
                onChange={(e) => setSelectedSystemId(e.target.value)}
              >
                {systems.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.alias} — {s.environment} ({s.targetReleaseProfile})
                  </option>
                ))}
              </select>
            </div>

            {selectedSystem && (
              <div
                style={{
                  padding: '12px',
                  backgroundColor: 'var(--fiori-bg)',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '12px',
                  border: '1px solid var(--fiori-border)'
                }}
              >
                <div><strong>Destination:</strong> <code>{selectedSystem.destinationReference}</code></div>
                <div><strong>Host:</strong> {selectedSystem.host} (Client {selectedSystem.client})</div>
                <div><strong>ADT Endpoint:</strong> <code>{selectedSystem.adtEndpoint}</code></div>
              </div>
            )}
          </div>
        )}

        {/* Step 2: Transaction Code */}
        {step === 2 && (
          <div>
            <h2 style={{ fontSize: '16px', marginBottom: '8px' }}>Step 2: Enter Transaction Code (T-Code)</h2>
            <p style={{ fontSize: '13px', color: 'var(--fiori-text-secondary)', marginBottom: '16px' }}>
              Specify the primary transaction to assess. Fiorify will inspect the associated module pool, includes, and database tables.
            </p>

            <div className="fiori-form-group">
              <label className="fiori-label fiori-label-required">Transaction Code</label>
              <input
                type="text"
                className="fiori-input"
                placeholder="e.g. VA01, ME21N, FB01, or custom ZSD_BILLING"
                style={{ textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}
                value={tcode}
                onChange={(e) => setTcode(e.target.value)}
                required
              />
            </div>

            <div className="fiori-form-group">
              <label className="fiori-label">Assessment Title</label>
              <input
                type="text"
                className="fiori-input"
                placeholder="e.g. Sales Order Creation Modernization Assessment"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="fiori-form-group">
                <label className="fiori-label">Business Process</label>
                <select
                  className="fiori-select"
                  value={businessProcess}
                  onChange={(e) => setBusinessProcess(e.target.value)}
                >
                  <option value="Order-to-Cash (O2C)">Order-to-Cash (O2C)</option>
                  <option value="Procure-to-Pay (P2P)">Procure-to-Pay (P2P)</option>
                  <option value="Record-to-Report (R2R)">Record-to-Report (R2R)</option>
                  <option value="Plan-to-Produce (P2P)">Plan-to-Produce (P2P)</option>
                  <option value="Custom Business Extension">Custom Business Extension</option>
                </select>
              </div>

              <div className="fiori-form-group">
                <label className="fiori-label">Lead Assessor / Owner</label>
                <input
                  type="text"
                  className="fiori-input"
                  value={ownerName}
                  onChange={(e) => setOwnerName(e.target.value)}
                />
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Scope */}
        {step === 3 && (
          <div>
            <h2 style={{ fontSize: '16px', marginBottom: '8px' }}>Step 3: Define Discovery Depth & Scope</h2>
            <p style={{ fontSize: '13px', color: 'var(--fiori-text-secondary)', marginBottom: '16px' }}>
              Select which SAP repository layers and catalogs should be interrogated during the asynchronous scan.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={scopeStructure}
                  onChange={(e) => setScopeStructure(e.target.checked)}
                />
                <span><strong>Inspect Program Structure:</strong> Extract linked executable, includes, function modules, and package.</span>
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={scopeAuthorizations}
                  onChange={(e) => setScopeAuthorizations(e.target.checked)}
                />
                <span><strong>Extract SU24 Authorizations:</strong> Query proposed authorization objects and fields from <code>USOBX_C</code>.</span>
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={scopeFioriMapping}
                  onChange={(e) => setScopeFioriMapping(e.target.checked)}
                />
                <span><strong>Cross-reference Standard Fiori Catalog:</strong> Search curated Fiori Apps Reference Library for matches.</span>
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={scopeWhereUsed}
                  onChange={(e) => setScopeWhereUsed(e.target.checked)}
                />
                <span><strong>ADT Where-Used Deep Traversal:</strong> Traversed downstream cross-references (resource-intensive).</span>
              </label>
            </div>
          </div>
        )}

        {/* Step 4: Governance */}
        {step === 4 && (
          <div>
            <h2 style={{ fontSize: '16px', marginBottom: '8px' }}>Step 4: Enterprise Governance Acknowledgments</h2>
            <p style={{ fontSize: '13px', color: 'var(--fiori-text-secondary)', marginBottom: '16px' }}>
              Please confirm understanding of enterprise boundaries and safety guidelines.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', fontSize: '13px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={confirmReadOnly}
                  onChange={(e) => setConfirmReadOnly(e.target.checked)}
                  style={{ marginTop: '3px' }}
                />
                <span>
                  <strong>Strict Read-Only Integration:</strong> I understand that discovery uses read-only queries. Fiorify will never write to or modify standard SAP tables or create transport requests in this phase.
                </span>
              </label>

              <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', fontSize: '13px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={confirmStandardFirst}
                  onChange={(e) => setConfirmStandardFirst(e.target.checked)}
                  style={{ marginTop: '3px' }}
                />
                <span>
                  <strong>Standard Fiori First Principle:</strong> I acknowledge that standard SAP Fiori applications must be evaluated before custom generation is considered.
                </span>
              </label>

              <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', fontSize: '13px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={confirmDraftOnly}
                  onChange={(e) => setConfirmDraftOnly(e.target.checked)}
                  style={{ marginTop: '3px' }}
                />
                <span>
                  <strong>Draft-Only Generation Governance:</strong> Any custom generation outputs remain draft reviewable specifications requiring developer verification and human sign-off.
                </span>
              </label>
            </div>
          </div>
        )}

        {/* Step 5: Review & Submit */}
        {step === 5 && (
          <div>
            <h2 style={{ fontSize: '16px', marginBottom: '8px' }}>Step 5: Review Assessment Configuration</h2>
            <p style={{ fontSize: '13px', color: 'var(--fiori-text-secondary)', marginBottom: '16px' }}>
              Confirm assessment details. Submitting will create the assessment record and dispatch the asynchronous discovery job.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr', gap: '8px', fontSize: '13px', marginBottom: '16px' }}>
              <span style={{ color: 'var(--fiori-text-secondary)', fontWeight: 500 }}>Target System:</span>
              <span><strong>{selectedSystem?.alias}</strong> ({selectedSystem?.targetReleaseProfile})</span>

              <span style={{ color: 'var(--fiori-text-secondary)', fontWeight: 500 }}>Transaction Code:</span>
              <code style={{ fontSize: '14px', fontWeight: 700 }}>{tcode.toUpperCase()}</code>

              <span style={{ color: 'var(--fiori-text-secondary)', fontWeight: 500 }}>Assessment Title:</span>
              <span>{title || `${tcode.toUpperCase()} Assessment`}</span>

              <span style={{ color: 'var(--fiori-text-secondary)', fontWeight: 500 }}>Business Process:</span>
              <span>{businessProcess}</span>

              <span style={{ color: 'var(--fiori-text-secondary)', fontWeight: 500 }}>Assigned Owner:</span>
              <span>{ownerName}</span>

              <span style={{ color: 'var(--fiori-text-secondary)', fontWeight: 500 }}>Scope Enabled:</span>
              <span>Structure Discovery, SU24 Authorizations, Fiori Catalog Cross-reference</span>
            </div>

            <MessageStrip type="info">
              Submitting dispatches background job <code>JOB-DISCOVERY-{tcode.toUpperCase()}</code> with simulated Cloud Connector roundtrip latency.
            </MessageStrip>
          </div>
        )}
      </div>

      {/* Stepper Navigation Actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button
          type="button"
          className="fiori-btn fiori-btn-secondary"
          disabled={step === 1 || isSubmitting}
          onClick={() => setStep(step - 1)}
        >
          <ArrowLeft size={14} /> Back
        </button>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            type="button"
            className="fiori-btn fiori-btn-subtle"
            onClick={() => navigate('/assessments')}
            disabled={isSubmitting}
          >
            Cancel
          </button>

          {step < 5 ? (
            <button
              type="button"
              className="fiori-btn fiori-btn-primary"
              onClick={handleNext}
            >
              Next <ArrowRight size={14} />
            </button>
          ) : (
            <button
              type="button"
              className="fiori-btn fiori-btn-primary"
              onClick={handleCreate}
              disabled={isSubmitting}
            >
              <Cpu size={14} /> {isSubmitting ? 'Dispatching Job...' : 'Create & Dispatch Assessment'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
