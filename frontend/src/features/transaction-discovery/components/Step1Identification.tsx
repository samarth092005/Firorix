import React from 'react';
import { PRESET_SCENARIOS } from '../types';
import { InformationPanel } from '../../../components/common';
import { Zap, AlertCircle, ArrowRight } from 'lucide-react';
import { mockSapAdapter } from '../../../services/sap/mockSapAdapter';

export interface Step1IdentificationProps {
  tcode: string;
  systemId: string;
  client: string;
  targetRelease: string;
  onTcodeChange: (val: string) => void;
  onSystemChange: (sysId: string, client: string, release: string) => void;
  onSelectPreset: (presetKey: string) => void;
  onNext: () => void;
  validationError?: string;
}

export const Step1Identification: React.FC<Step1IdentificationProps> = ({
  tcode,
  systemId,
  client,
  targetRelease,
  onTcodeChange,
  onSystemChange,
  onSelectPreset,
  onNext,
  validationError
}) => {
  const availableSystems = mockSapAdapter.getAvailableSystems();

  const handleTcodeChange = (raw: string) => {
    const normalized = raw.toUpperCase().replace(/\s+/g, '');
    onTcodeChange(normalized);
  };

  const handleSystemSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedId = e.target.value;
    const sys = availableSystems.find((s) => s.systemId === selectedId);
    if (sys) {
      onSystemChange(sys.systemId, sys.client, sys.release);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div>
        <h3 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--fiori-text-primary, #0F172A)', margin: '0 0 4px' }}>
          Step 1: SAP Transaction Identification
        </h3>
        <p style={{ fontSize: '13px', color: 'var(--fiori-text-secondary, #475569)', margin: 0 }}>
          Specify the SAP transaction code to assess and choose your target SAP landscape context.
        </p>
      </div>

      {/* Preset Quick Select for Pilot Finance Scenarios */}
      <div
        style={{
          padding: '14px 18px',
          backgroundColor: '#F8FAFC',
          borderRadius: 'var(--radius-md, 10px)',
          border: '1px solid var(--fiori-border, #E2E8F0)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
          <Zap size={14} color="var(--fiori-primary, #0066FF)" />
          <span style={{ fontSize: '12px', fontWeight: 600, color: '#0F172A' }}>
            Quick Pilot Finance Presets:
          </span>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          {Object.values(PRESET_SCENARIOS).map((preset) => {
            const isSelected = tcode === preset.tcode;
            return (
              <button
                key={preset.tcode}
                type="button"
                onClick={() => onSelectPreset(preset.tcode)}
                style={{
                  padding: '6px 12px',
                  borderRadius: '20px',
                  fontSize: '12px',
                  fontWeight: isSelected ? 600 : 500,
                  fontFamily: 'var(--font-sans)',
                  backgroundColor: isSelected ? '#EFF6FF' : '#FFFFFF',
                  color: isSelected ? 'var(--fiori-primary, #0066FF)' : 'var(--fiori-text-primary, #0F172A)',
                  border: isSelected ? '1px solid var(--fiori-primary, #0066FF)' : '1px solid var(--fiori-border, #E2E8F0)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'all 0.15s ease'
                }}
              >
                <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}>{preset.tcode}</span>
                <span style={{ color: 'var(--fiori-text-secondary, #64748B)', fontSize: '11px' }}>
                  ({preset.label.split('—')[1]?.trim() || ''})
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Primary Input Form */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '16px'
        }}
      >
        {/* Field 1: Transaction Code */}
        <div className="fiori-form-group">
          <label className="fiori-label fiori-label-required">
            Transaction Code (T-Code)
          </label>
          <input
            type="text"
            className="fiori-input"
            value={tcode}
            onChange={(e) => handleTcodeChange(e.target.value)}
            placeholder="e.g. F-53, F-28, FS00, ME21N"
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '14px',
              fontWeight: 700,
              letterSpacing: '0.5px'
            }}
            autoFocus
          />
          {validationError ? (
            <div style={{ fontSize: '11px', color: 'var(--fiori-error, #B91C1C)', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <AlertCircle size={12} />
              <span>{validationError}</span>
            </div>
          ) : (
            <div style={{ fontSize: '11px', color: 'var(--fiori-text-secondary, #64748B)', marginTop: '4px' }}>
              Standard SAP transaction code.
            </div>
          )}
        </div>

        {/* Field 2: Target SAP System */}
        <div className="fiori-form-group">
          <label className="fiori-label fiori-label-required">
            Target SAP System
          </label>
          <select
            className="fiori-select"
            value={systemId}
            onChange={handleSystemSelect}
          >
            {availableSystems.map((sys) => (
              <option key={sys.systemId} value={sys.systemId}>
                {sys.systemId} — {sys.systemName}
              </option>
            ))}
          </select>
          <div style={{ fontSize: '11px', color: 'var(--fiori-text-secondary, #64748B)', marginTop: '4px' }}>
            Target environment for dictionary metadata extraction.
          </div>
        </div>

        {/* Field 3: Target Client */}
        <div className="fiori-form-group">
          <label className="fiori-label">
            Target Client
          </label>
          <input
            type="text"
            className="fiori-input"
            value={client}
            disabled
            style={{ backgroundColor: '#F8FAFC', color: 'var(--fiori-text-secondary, #64748B)' }}
          />
          <div style={{ fontSize: '11px', color: 'var(--fiori-text-secondary, #64748B)', marginTop: '4px' }}>
            Mandant client configured for the selected landscape destination.
          </div>
        </div>

        {/* Field 4: SAP Release Profile */}
        <div className="fiori-form-group">
          <label className="fiori-label">
            SAP Release Baseline
          </label>
          <input
            type="text"
            className="fiori-input"
            value={targetRelease}
            disabled
            style={{ backgroundColor: '#F8FAFC', color: 'var(--fiori-text-secondary, #64748B)' }}
          />
          <div style={{ fontSize: '11px', color: 'var(--fiori-text-secondary, #64748B)', marginTop: '4px' }}>
            Baseline release profile used for Fiori catalogue matching.
          </div>
        </div>
      </div>

      <InformationPanel variant="info" title="System Landscape Context">
        Target <strong>{systemId}</strong> (Client {client}) operates with SAP S/4HANA 2023 Private Edition
        (S4CORE 108 SP0003). Transaction discovery will inspect TSTC/TSTCT tables and TADIR repository ownership.
      </InformationPanel>

      {/* Navigation Actions */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '12px', borderTop: '1px solid var(--fiori-border, #E2E8F0)' }}>
        <button
          type="button"
          onClick={onNext}
          disabled={!tcode.trim()}
          className="fiori-btn fiori-btn-primary"
          style={{ height: '36px', padding: '0 20px', fontSize: '13px' }}
        >
          Inspect SAP Transaction <ArrowRight size={14} />
        </button>
      </div>
    </div>
  );
};
