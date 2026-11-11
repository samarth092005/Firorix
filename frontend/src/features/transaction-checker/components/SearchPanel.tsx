import React, { useState } from 'react';
import { Search, X, Server, Sparkles, Loader2 } from 'lucide-react';
import { SapSystemRecord } from '../types';

export interface SearchPanelProps {
  systems: SapSystemRecord[];
  selectedSystemId: string;
  onSystemChange: (systemId: string) => void;
  onSearch: (tcode: string) => void;
  onClear: () => void;
  isLoading: boolean;
  currentTcode?: string;
  useMcp?: boolean;
  onMcpChange?: (enabled: boolean) => void;
}

const EXAMPLE_TCODES = [
  { code: 'OB08', label: 'OB08 (Finance - Explicit Successor F3616)' },
  { code: 'FB03', label: 'FB03 (Finance - SAP GUI for HTML)' },
  { code: 'FB01', label: 'FB01 (Finance - Functional Alternative F0717)' },
  { code: 'FBL1N', label: 'FBL1N (Finance - Catalogue Pending)' },
  { code: 'ZFIN_CUSTOM', label: 'ZFIN_CUSTOM (Finance - Customer Custom S21)' },
  { code: 'ZNOAPP', label: 'ZNOAPP (Finance - Verified No Standard App)' },
  { code: 'ZCONFLICT', label: 'ZCONFLICT (Audit - Z-Prefix with SAP Package)' },
  { code: 'ME21N', label: 'ME21N (Standard PO - Direct Match)' },
  { code: 'VA01', label: 'VA01 (Standard SO - Direct Match)' },
  { code: 'ZPURCHASE', label: 'ZPURCHASE (Custom - Related Match)' },
  { code: 'ZNOMATCH', label: 'ZNOMATCH (Standard - No App Match)' },
  { code: 'ZINCOMPLETE', label: 'ZINCOMPLETE (Metadata Incomplete)' },
  { code: 'ZCONNERR', label: 'ZCONNERR (Simulated Connection Error)' },
  { code: 'ZDENIED', label: 'ZDENIED (Simulated Access Denied)' },
  { code: 'ZINVALID', label: 'ZINVALID (Transaction Not Found)' }
];

export const SearchPanel: React.FC<SearchPanelProps> = ({
  systems,
  selectedSystemId,
  onSystemChange,
  onSearch,
  onClear,
  isLoading,
  currentTcode = '',
  useMcp = true,
  onMcpChange
}) => {
  const [inputValue, setInputValue] = useState(currentTcode);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value.toUpperCase());
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;
    const trimmed = inputValue.trim().toUpperCase();
    onSearch(trimmed);
  };

  const handleClear = () => {
    setInputValue('');
    onClear();
  };

  const handleSelectExample = (code: string) => {
    setInputValue(code);
    onSearch(code);
  };

  const selectedSystem = systems.find((s) => s.systemId === selectedSystemId);

  return (
    <div className="fiori-card" style={{ marginBottom: '24px' }}>
      <div className="fiori-card-header" style={{ padding: '12px 20px', borderBottom: '1px solid var(--fiori-border-light)' }}>
        <div className="fiori-card-title">
          <Search size={16} color="var(--fiori-teal)" />
          <span>Transaction Search & Landscape Parameters</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'var(--fiori-text-secondary)' }}>
          <Server size={14} color="var(--fiori-teal)" />
          <span>Active Context:</span>
          <strong style={{ color: 'var(--fiori-text-primary)' }}>
            {selectedSystem ? `${selectedSystem.systemId} (Client ${selectedSystem.client})` : 'None'}
          </strong>
        </div>
      </div>

      <div className="fiori-card-body" style={{ padding: '20px' }}>
        <form onSubmit={handleSubmit}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'minmax(260px, 340px) 1fr auto',
              gap: '16px',
              alignItems: 'flex-end'
            }}
          >
            {/* System Selection */}
            <div>
              <label
                htmlFor="system-select"
                className="fiori-label fiori-label-required"
                style={{ display: 'block', marginBottom: '6px' }}
              >
                Target Synthetic SAP System
              </label>
              <select
                id="system-select"
                className="fiori-select"
                style={{ width: '100%' }}
                value={selectedSystemId}
                onChange={(e) => onSystemChange(e.target.value)}
                disabled={isLoading}
              >
                {systems.map((sys) => (
                  <option key={sys.systemId} value={sys.systemId}>
                    {sys.systemId} — {sys.systemName} (Client {sys.client})
                  </option>
                ))}
              </select>
            </div>

            {/* T-Code Input */}
            <div>
              <label
                htmlFor="tcode-input"
                className="fiori-label fiori-label-required"
                style={{ display: 'block', marginBottom: '6px' }}
              >
                SAP Transaction Code
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  id="tcode-input"
                  type="text"
                  className="fiori-input"
                  style={{
                    width: '100%',
                    paddingLeft: '32px',
                    fontFamily: 'var(--font-mono)',
                    fontWeight: 600,
                    letterSpacing: '0.5px'
                  }}
                  placeholder="e.g. ME21N, VA01, ZPURCHASE..."
                  value={inputValue}
                  onChange={handleInputChange}
                  disabled={isLoading}
                  autoComplete="off"
                  spellCheck={false}
                />
                <Search
                  size={15}
                  color="var(--fiori-text-muted)"
                  style={{ position: 'absolute', left: '10px', top: '9px' }}
                />
                {inputValue && (
                  <button
                    type="button"
                    onClick={handleClear}
                    style={{
                      position: 'absolute',
                      right: '8px',
                      top: '7px',
                      background: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      color: 'var(--fiori-text-muted)',
                      padding: '2px',
                      display: 'flex',
                      alignItems: 'center'
                    }}
                    title="Clear input"
                    aria-label="Clear input"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="submit"
                className="fiori-btn fiori-btn-primary"
                disabled={isLoading}
                style={{ minWidth: '110px' }}
              >
                {isLoading ? (
                  <>
                    <Loader2 size={14} className="fiori-spinner" /> Checking...
                  </>
                ) : (
                  <>
                    <Search size={14} /> Check T-Code
                  </>
                )}
              </button>
              <button
                type="button"
                className="fiori-btn fiori-btn-secondary"
                onClick={handleClear}
                disabled={isLoading && !inputValue}
              >
                Clear
              </button>
            </div>
          </div>

          {onMcpChange && (
            <div style={{ marginTop: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12px', cursor: 'pointer', userSelect: 'none' }}>
                <input
                  type="checkbox"
                  checked={useMcp}
                  onChange={(e) => onMcpChange(e.target.checked)}
                  style={{ accentColor: 'var(--fiori-teal)' }}
                  disabled={isLoading}
                />
                <span style={{ fontWeight: 600, color: 'var(--fiori-text-primary)' }}>
                  Enable MCP-Assisted Discovery
                </span>
                <span style={{ color: 'var(--fiori-text-muted)', fontSize: '11px' }}>
                  (Queries official documentation &amp; candidate enrichment)
                </span>
              </label>
            </div>
          )}
        </form>

        {/* Quick Example Codes */}
        <div style={{ marginTop: '16px', paddingTop: '14px', borderTop: '1px solid var(--fiori-border-light)' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '11px',
              color: 'var(--fiori-text-secondary)',
              marginBottom: '8px',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.4px'
            }}
          >
            <Sparkles size={12} color="var(--fiori-teal)" />
            <span>Preset Verification Scenarios (Click to test):</span>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {EXAMPLE_TCODES.map((ex) => {
              const isCurrent = inputValue === ex.code;
              return (
                <button
                  key={ex.code}
                  type="button"
                  onClick={() => handleSelectExample(ex.code)}
                  disabled={isLoading}
                  style={{
                    backgroundColor: isCurrent ? 'var(--fiori-teal-light)' : 'var(--fiori-surface-subtle)',
                    border: `1px solid ${isCurrent ? 'var(--fiori-teal)' : 'var(--fiori-border)'}`,
                    color: isCurrent ? 'var(--fiori-teal)' : 'var(--fiori-text-primary)',
                    borderRadius: 'var(--radius-xs)',
                    padding: '3px 8px',
                    fontSize: '11px',
                    fontFamily: 'var(--font-mono)',
                    cursor: 'pointer',
                    fontWeight: isCurrent ? 700 : 500,
                    transition: 'all 0.15s ease'
                  }}
                  title={ex.label}
                >
                  {ex.code}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
