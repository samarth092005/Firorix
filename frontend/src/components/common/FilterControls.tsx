import React from 'react';
import { Filter, RotateCcw } from 'lucide-react';

export interface FilterOption {
  label: string;
  value: string;
}

export interface FilterGroup {
  id: string;
  label: string;
  options: FilterOption[];
  selectedValue: string;
}

export interface FilterControlsProps {
  groups: FilterGroup[];
  onFilterChange: (groupId: string, value: string) => void;
  onReset?: () => void;
  hasActiveFilters?: boolean;
}

export const FilterControls: React.FC<FilterControlsProps> = ({
  groups,
  onFilterChange,
  onReset,
  hasActiveFilters
}) => {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        flexWrap: 'wrap'
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          fontSize: '12px',
          fontWeight: 600,
          color: 'var(--fiori-text-secondary, #64748B)'
        }}
      >
        <Filter size={13} />
        <span>Filters:</span>
      </div>

      {groups.map((group) => {
        const isActive = group.selectedValue !== 'ALL' && group.selectedValue !== '';
        return (
          <div key={group.id} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <select
              value={group.selectedValue}
              onChange={(e) => onFilterChange(group.id, e.target.value)}
              style={{
                height: '34px',
                padding: '0 24px 0 10px',
                fontSize: '12px',
                fontFamily: 'var(--font-sans)',
                color: isActive
                  ? 'var(--fiori-primary, #0066FF)'
                  : 'var(--fiori-text-primary, #0F172A)',
                fontWeight: isActive ? 600 : 400,
                backgroundColor: isActive ? '#EFF6FF' : '#FFFFFF',
                border: isActive
                  ? '1px solid #BFDBFE'
                  : '1px solid var(--fiori-border, #E2E8F0)',
                borderRadius: 'var(--radius-sm, 8px)',
                outline: 'none',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              {group.options.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        );
      })}

      {hasActiveFilters && onReset && (
        <button
          type="button"
          onClick={onReset}
          className="fiori-btn fiori-btn-subtle"
          style={{ height: '34px', padding: '0 8px', fontSize: '12px' }}
        >
          <RotateCcw size={12} /> Reset
        </button>
      )}
    </div>
  );
};
