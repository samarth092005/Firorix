import React from 'react';
import { Search, X } from 'lucide-react';

export interface SearchInputProps {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  onClear?: () => void;
  width?: string;
}

export const SearchInput: React.FC<SearchInputProps> = ({
  value,
  onChange,
  placeholder = 'Search by T-Code, description or application...',
  onClear,
  width = '320px'
}) => {
  return (
    <div
      style={{
        position: 'relative',
        display: 'inline-flex',
        alignItems: 'center',
        width,
        maxWidth: '100%'
      }}
    >
      <Search
        size={14}
        color="var(--fiori-text-secondary, #64748B)"
        style={{
          position: 'absolute',
          left: '11px',
          pointerEvents: 'none'
        }}
      />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          width: '100%',
          height: '34px',
          padding: '0 32px 0 32px',
          fontFamily: 'var(--font-sans)',
          fontSize: '13px',
          color: 'var(--fiori-text-primary, #0F172A)',
          backgroundColor: '#FFFFFF',
          border: '1px solid var(--fiori-border, #E2E8F0)',
          borderRadius: 'var(--radius-sm, 8px)',
          outline: 'none',
          transition: 'all 0.15s ease'
        }}
        onFocus={(e) => {
          e.currentTarget.style.borderColor = 'var(--fiori-primary, #0066FF)';
          e.currentTarget.style.boxShadow = '0 0 0 3px rgba(0, 102, 255, 0.14)';
        }}
        onBlur={(e) => {
          e.currentTarget.style.borderColor = 'var(--fiori-border, #E2E8F0)';
          e.currentTarget.style.boxShadow = 'none';
        }}
      />
      {value && (
        <button
          type="button"
          onClick={() => {
            onChange('');
            if (onClear) onClear();
          }}
          style={{
            position: 'absolute',
            right: '8px',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '2px',
            display: 'flex',
            alignItems: 'center',
            color: 'var(--fiori-text-secondary, #64748B)'
          }}
          aria-label="Clear search text"
        >
          <X size={13} />
        </button>
      )}
    </div>
  );
};
