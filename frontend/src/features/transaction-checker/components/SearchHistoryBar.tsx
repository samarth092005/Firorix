import React, { useState, useEffect } from 'react';
import { History, Trash2, ArrowUpRight } from 'lucide-react';
import { SearchHistoryItem } from '../types';
import { searchHistoryStore } from '../services/searchHistoryStore';

export interface SearchHistoryBarProps {
  onSelectSearch: (tcode: string, systemId: string) => void;
  refreshTrigger?: number;
}

export const SearchHistoryBar: React.FC<SearchHistoryBarProps> = ({
  onSelectSearch,
  refreshTrigger
}) => {
  const [history, setHistory] = useState<SearchHistoryItem[]>([]);

  useEffect(() => {
    setHistory(searchHistoryStore.getHistory());
  }, [refreshTrigger]);

  const handleClear = () => {
    searchHistoryStore.clearHistory();
    setHistory([]);
  };

  if (history.length === 0) {
    return null;
  }

  return (
    <div
      style={{
        backgroundColor: 'var(--fiori-surface)',
        border: '1px solid var(--fiori-border)',
        borderRadius: 'var(--radius-sm)',
        padding: '10px 16px',
        marginBottom: '20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '10px'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', fontWeight: 600, color: 'var(--fiori-text-secondary)', textTransform: 'uppercase' }}>
          <History size={13} color="var(--fiori-teal)" />
          <span>Recent Checks:</span>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
          {history.slice(0, 7).map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectSearch(item.tcode, item.systemId)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                padding: '2px 8px',
                fontSize: '11px',
                fontFamily: 'var(--font-mono)',
                backgroundColor: 'var(--fiori-bg)',
                border: '1px solid var(--fiori-border)',
                borderRadius: 'var(--radius-xs)',
                cursor: 'pointer',
                color: 'var(--fiori-text-primary)'
              }}
              title={`${item.systemId} - ${item.resultStatus}`}
            >
              <strong>{item.tcode}</strong>
              <span style={{ fontSize: '10px', color: 'var(--fiori-text-muted)' }}>({item.resultStatus})</span>
              <ArrowUpRight size={10} color="var(--fiori-text-muted)" />
            </button>
          ))}
        </div>
      </div>

      <button
        type="button"
        onClick={handleClear}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          background: 'transparent',
          border: 'none',
          color: 'var(--fiori-text-muted)',
          fontSize: '11px',
          cursor: 'pointer',
          padding: '2px 6px'
        }}
        title="Clear local search history"
      >
        <Trash2 size={12} />
        <span>Clear History</span>
      </button>
    </div>
  );
};
