import React from 'react';

export interface Column<T> {
  key: string;
  header: string;
  width?: string;
  render?: (item: T) => React.ReactNode;
}

export interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (item: T) => string;
  onRowClick?: (item: T) => void;
  emptyMessage?: string;
  isLoading?: boolean;
}

export function DataTable<T>({
  columns,
  data,
  keyExtractor,
  onRowClick,
  emptyMessage = 'No records found.',
  isLoading = false
}: DataTableProps<T>) {
  if (isLoading) {
    return (
      <div className="fiori-table-container" style={{ padding: '32px', textAlign: 'center', color: 'var(--fiori-text-secondary)' }}>
        Loading data records...
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="fiori-table-container" style={{ padding: '32px', textAlign: 'center', color: 'var(--fiori-text-muted)' }}>
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="fiori-table-container">
      <table className="fiori-table">
        <thead>
          <tr>
            {columns.map((col) => (
              <th key={col.key} style={{ width: col.width }}>
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((item) => (
            <tr
              key={keyExtractor(item)}
              onClick={() => onRowClick && onRowClick(item)}
              style={{ cursor: onRowClick ? 'pointer' : 'default' }}
            >
              {columns.map((col) => (
                <td key={col.key}>
                  {col.render ? col.render(item) : (item as any)[col.key] || '—'}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
