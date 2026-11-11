import React from 'react';
import { Search, RotateCcw } from 'lucide-react';

export interface FilterOption {
  label: string;
  value: string;
}

export interface FilterBarProps {
  searchPlaceholder?: string;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  filters?: {
    key: string;
    label: string;
    options: FilterOption[];
    value: string;
    onChange: (val: string) => void;
  }[];
  onReset?: () => void;
  actions?: React.ReactNode;
}

export const FilterBar: React.FC<FilterBarProps> = ({
  searchPlaceholder = 'Search records...',
  searchQuery,
  onSearchChange,
  filters = [],
  onReset,
  actions
}) => {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '10px',
        padding: '12px 16px',
        backgroundColor: 'var(--fiori-surface)',
        border: '1px solid var(--fiori-border)',
        borderRadius: 'var(--radius-md)',
        marginBottom: '16px'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, flexWrap: 'wrap' }}>
        {/* Search input */}
        <div style={{ position: 'relative', minWidth: '220px', maxWidth: '340px', flex: 1 }}>
          <Search
            size={14}
            color="var(--fiori-text-muted)"
            style={{ position: 'absolute', left: '10px', top: '9px', pointerEvents: 'none' }}
          />
          <input
            type="text"
            className="fiori-input"
            style={{ width: '100%', paddingLeft: '30px' }}
            placeholder={searchPlaceholder}
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>

        {/* Dropdown filters */}
        {filters.map((f) => (
          <div key={f.key} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '12px', color: 'var(--fiori-text-secondary)', fontWeight: 500 }}>
              {f.label}:
            </span>
            <select
              className="fiori-select"
              style={{ height: '32px', minWidth: '130px' }}
              value={f.value}
              onChange={(e) => f.onChange(e.target.value)}
            >
              {f.options.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        ))}

        {onReset && (
          <button
            type="button"
            className="fiori-btn fiori-btn-subtle"
            style={{ height: '32px', fontSize: '12px' }}
            onClick={onReset}
            title="Reset filters"
          >
            <RotateCcw size={12} /> Reset
          </button>
        )}
      </div>

      {actions && <div>{actions}</div>}
    </div>
  );
};
