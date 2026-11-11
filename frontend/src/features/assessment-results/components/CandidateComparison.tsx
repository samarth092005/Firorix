import React from 'react';
import { CatalogueReference } from '../../../services/contracts/types';
import { ExternalLink, Check, X, Layers } from 'lucide-react';

export interface CandidateComparisonProps {
  candidates: CatalogueReference[];
  primaryAppId?: string;
}

export const CandidateComparison: React.FC<CandidateComparisonProps> = ({
  candidates,
  primaryAppId
}) => {
  if (candidates.length <= 1) {
    return null;
  }

  const comparisonAttributes = [
    {
      label: 'Application ID',
      render: (c: CatalogueReference) => (
        <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--fiori-primary, #0A6ED1)' }}>
          {c.appId}
          {c.appId === primaryAppId && ' (Primary)'}
        </span>
      )
    },
    {
      label: 'Application Title',
      render: (c: CatalogueReference) => <strong style={{ color: 'var(--fiori-navy, #102A43)' }}>{c.appName}</strong>
    },
    {
      label: 'UI Technology',
      render: (c: CatalogueReference) => c.uiTechnology
    },
    {
      label: 'Related T-Codes',
      render: (c: CatalogueReference) => (
        <span style={{ fontFamily: 'var(--font-mono)' }}>{c.relatedTCodes.join(', ') || 'N/A'}</span>
      )
    },
    {
      label: 'Technical Component',
      render: (c: CatalogueReference) => (
        <span style={{ fontFamily: 'var(--font-mono)' }}>{c.technicalComponent}</span>
      )
    },
    {
      label: 'Supported S/4HANA Releases',
      render: (c: CatalogueReference) => c.supportedProductRelease
    },
    {
      label: 'OData Service References',
      render: (c: CatalogueReference) => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', fontFamily: 'var(--font-mono)', fontSize: '11px' }}>
          {c.odataServices.map((s) => (
            <span key={s}>{s}</span>
          ))}
        </div>
      )
    },
    {
      label: 'Business Roles',
      render: (c: CatalogueReference) => (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
          {c.businessRoles.map((r) => (
            <span
              key={r}
              style={{
                fontSize: '10px',
                padding: '2px 6px',
                backgroundColor: '#FFFFFF',
                border: '1px solid var(--fiori-border, #E2E8F0)',
                borderRadius: '2px'
              }}
            >
              {r}
            </span>
          ))}
        </div>
      )
    },
    {
      label: 'Official Reference Link',
      render: (c: CatalogueReference) => (
        <a
          href={c.officialSourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="fiori-btn fiori-btn-subtle"
          style={{ fontSize: '11px', height: '24px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
        >
          View on FAL <ExternalLink size={11} />
        </a>
      )
    }
  ];

  return (
    <div
      style={{
        backgroundColor: 'var(--fiori-surface, #FFFFFF)',
        border: '1px solid var(--fiori-border, #E2E8F0)',
        borderRadius: 'var(--radius-md, 6px)',
        padding: '20px',
        boxShadow: 'var(--fiori-shadow-sm, 0 1px 3px rgba(0,0,0,0.05))',
        display: 'flex',
        flexDirection: 'column',
        gap: '14px'
      }}
    >
      <div>
        <h4
          style={{
            margin: '0 0 4px 0',
            fontSize: '14px',
            fontWeight: 700,
            color: 'var(--fiori-navy, #102A43)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <Layers size={15} color="var(--fiori-primary, #0A6ED1)" />
          Candidate Application Side-by-Side Comparison
        </h4>
        <p style={{ margin: 0, fontSize: '12px', color: 'var(--fiori-text-secondary, #64748B)' }}>
          Detailed architectural comparison across {candidates.length} matched Fiori candidates in the official catalogue.
        </p>
      </div>

      <div
        style={{
          border: '1px solid var(--fiori-border, #E2E8F0)',
          borderRadius: 'var(--radius-sm, 4px)',
          overflowX: 'auto'
        }}
      >
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
          <thead>
            <tr style={{ backgroundColor: 'var(--fiori-surface-subtle, #F8FAFC)', borderBottom: '1px solid var(--fiori-border, #E2E8F0)' }}>
              <th style={{ textAlign: 'left', padding: '10px 14px', width: '22%', color: 'var(--fiori-navy, #102A43)' }}>
                Feature / Dimension
              </th>
              {candidates.map((c) => (
                <th
                  key={c.appId}
                  style={{
                    textAlign: 'left',
                    padding: '10px 14px',
                    color: 'var(--fiori-navy, #102A43)',
                    backgroundColor: c.appId === primaryAppId ? 'rgba(10, 110, 209, 0.04)' : 'transparent'
                  }}
                >
                  {c.appName} ({c.appId})
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {comparisonAttributes.map((attr, idx) => (
              <tr
                key={attr.label}
                style={{
                  borderBottom: idx === comparisonAttributes.length - 1 ? 'none' : '1px solid var(--fiori-border-light, #F1F5F9)',
                  backgroundColor: idx % 2 === 0 ? '#FFFFFF' : '#FAFBFD'
                }}
              >
                <td style={{ padding: '10px 14px', color: 'var(--fiori-text-secondary, #64748B)', fontWeight: 600 }}>
                  {attr.label}
                </td>
                {candidates.map((c) => (
                  <td
                    key={c.appId}
                    style={{
                      padding: '10px 14px',
                      backgroundColor: c.appId === primaryAppId ? 'rgba(10, 110, 209, 0.02)' : 'inherit'
                    }}
                  >
                    {attr.render(c)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
