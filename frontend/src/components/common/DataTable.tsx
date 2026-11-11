import React, { useState, useMemo } from 'react';
import { ArrowUpDown, ArrowUp, ArrowDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { LoadingState } from './LoadingState';
import { EmptyState } from './EmptyState';

export interface ColumnDef<T> {
  key: string;
  header: string;
  width?: string;
  align?: 'left' | 'center' | 'right';
  sortable?: boolean;
  render?: (item: T, index: number) => React.ReactNode;
}

export interface DataTableProps<T> {
  columns: ColumnDef<T>[];
  data: T[];
  keyExtractor: (item: T) => string;
  onRowClick?: (item: T) => void;
  isLoading?: boolean;
  emptyTitle?: string;
  emptyMessage?: string;
  defaultSortKey?: string;
  defaultSortOrder?: 'asc' | 'desc';
  pageSize?: number;
  showPagination?: boolean;
}

export function DataTable<T>({
  columns,
  data,
  keyExtractor,
  onRowClick,
  isLoading = false,
  emptyTitle = 'No Records Found',
  emptyMessage = 'No matching assessment or transaction records match your criteria.',
  defaultSortKey,
  defaultSortOrder = 'asc',
  pageSize = 10,
  showPagination = true
}: DataTableProps<T>) {
  const [sortKey, setSortKey] = useState<string | undefined>(defaultSortKey);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>(defaultSortOrder);
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Sorting
  const sortedData = useMemo(() => {
    if (!sortKey) return data;
    const sorted = [...data];
    sorted.sort((a, b) => {
      const valA = (a as any)[sortKey];
      const valB = (b as any)[sortKey];
      if (valA === undefined || valA === null) return 1;
      if (valB === undefined || valB === null) return -1;
      if (typeof valA === 'number' && typeof valB === 'number') {
        return sortOrder === 'asc' ? valA - valB : valB - valA;
      }
      const strA = String(valA).toLowerCase();
      const strB = String(valB).toLowerCase();
      return sortOrder === 'asc' ? strA.localeCompare(strB) : strB.localeCompare(strA);
    });
    return sorted;
  }, [data, sortKey, sortOrder]);

  // Pagination
  const totalPages = Math.ceil(sortedData.length / pageSize) || 1;
  const paginatedData = useMemo(() => {
    if (!showPagination) return sortedData;
    const start = (currentPage - 1) * pageSize;
    return sortedData.slice(start, start + pageSize);
  }, [sortedData, currentPage, pageSize, showPagination]);

  const handleHeaderClick = (col: ColumnDef<T>) => {
    if (!col.sortable) return;
    if (sortKey === col.key) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(col.key);
      setSortOrder('asc');
    }
  };

  if (isLoading) {
    return <LoadingState message="Loading records..." />;
  }

  if (data.length === 0) {
    return <EmptyState title={emptyTitle} description={emptyMessage} />;
  }

  return (
    <div
      style={{
        backgroundColor: '#FFFFFF',
        border: '1px solid var(--fiori-border, #E2E8F0)',
        borderRadius: 'var(--radius-md, 10px)',
        boxShadow: 'var(--fiori-shadow-card, 0 1px 3px rgba(15, 23, 42, 0.04), 0 4px 12px rgba(15, 23, 42, 0.03))',
        overflow: 'hidden'
      }}
    >
      <div style={{ overflowX: 'auto', width: '100%' }}>
        <table
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            textAlign: 'left',
            fontFamily: 'var(--font-sans)',
            fontSize: '13px'
          }}
        >
          <thead>
            <tr
              style={{
                backgroundColor: '#F8FAFC',
                borderBottom: '1px solid var(--fiori-border, #E2E8F0)',
                color: 'var(--fiori-text-secondary, #64748B)',
                fontWeight: 600,
                fontSize: '12px',
                height: '40px'
              }}
            >
              {columns.map((col) => {
                const isSorted = sortKey === col.key;
                return (
                  <th
                    key={col.key}
                    onClick={() => handleHeaderClick(col)}
                    style={{
                      padding: '10px 18px',
                      width: col.width,
                      textAlign: col.align || 'left',
                      cursor: col.sortable ? 'pointer' : 'default',
                      userSelect: 'none',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    <div
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        justifyContent: col.align === 'right' ? 'flex-end' : col.align === 'center' ? 'center' : 'flex-start'
                      }}
                    >
                      <span>{col.header}</span>
                      {col.sortable && (
                        <span style={{ color: isSorted ? 'var(--fiori-primary, #0066FF)' : '#CBD5E1' }}>
                          {isSorted ? (
                            sortOrder === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />
                          ) : (
                            <ArrowUpDown size={12} />
                          )}
                        </span>
                      )}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {paginatedData.map((item, idx) => {
              const rowKey = keyExtractor(item);
              return (
                <tr
                  key={rowKey}
                  onClick={() => onRowClick && onRowClick(item)}
                  style={{
                    borderBottom: '1px solid var(--fiori-border-light, #F1F5F9)',
                    backgroundColor: '#FFFFFF',
                    cursor: onRowClick ? 'pointer' : 'default',
                    transition: 'background-color 0.12s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#F8FAFC';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#FFFFFF';
                  }}
                >
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      style={{
                        padding: '12px 18px',
                        color: 'var(--fiori-text-primary, #0F172A)',
                        textAlign: col.align || 'left',
                        verticalAlign: 'middle'
                      }}
                    >
                      {col.render ? col.render(item, idx) : (item as any)[col.key] || '—'}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {showPagination && totalPages > 1 && (
        <div
          style={{
            padding: '12px 18px',
            backgroundColor: '#F8FAFC',
            borderTop: '1px solid var(--fiori-border, #E2E8F0)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '12px',
            color: 'var(--fiori-text-secondary, #64748B)'
          }}
        >
          <div>
            Showing {(currentPage - 1) * pageSize + 1} to{' '}
            {Math.min(currentPage * pageSize, sortedData.length)} of {sortedData.length} records
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="fiori-btn fiori-btn-secondary"
              style={{ height: '30px', padding: '0 10px', fontSize: '11px', borderRadius: '6px' }}
              aria-label="Previous page"
            >
              <ChevronLeft size={13} /> Prev
            </button>
            <span style={{ fontWeight: 600, color: 'var(--fiori-text-primary, #0F172A)' }}>
              Page {currentPage} of {totalPages}
            </span>
            <button
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="fiori-btn fiori-btn-secondary"
              style={{ height: '30px', padding: '0 10px', fontSize: '11px', borderRadius: '6px' }}
              aria-label="Next page"
            >
              Next <ChevronRight size={13} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
