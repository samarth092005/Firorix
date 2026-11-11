import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';

export interface BreadcrumbItem {
  label: string;
  to?: string;
}

export interface BreadcrumbsProps {
  items: BreadcrumbItem[];
}

export const Breadcrumbs: React.FC<BreadcrumbsProps> = ({ items }) => {
  return (
    <nav
      aria-label="Breadcrumb"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        fontSize: '12px',
        color: 'var(--fiori-text-secondary, #64748B)',
        marginBottom: '4px'
      }}
    >
      <Link
        to="/overview"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          color: 'var(--fiori-text-secondary, #64748B)',
          textDecoration: 'none'
        }}
        title="Overview"
      >
        <Home size={13} />
      </Link>

      {items.map((item, idx) => {
        const isLast = idx === items.length - 1;
        return (
          <React.Fragment key={item.label + idx}>
            <ChevronRight size={12} color="var(--fiori-border-dark, #CBD5E1)" />
            {isLast || !item.to ? (
              <span
                style={{
                  fontWeight: isLast ? 600 : 400,
                  color: isLast ? 'var(--fiori-navy, #102A43)' : 'var(--fiori-text-secondary, #64748B)'
                }}
              >
                {item.label}
              </span>
            ) : (
              <Link
                to={item.to}
                style={{
                  color: 'var(--fiori-primary, #0A6ED1)',
                  textDecoration: 'none'
                }}
              >
                {item.label}
              </Link>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
};
