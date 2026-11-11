import React from 'react';
import { ReleaseCompatibilityRecord } from '../../../services/contracts/types';
import { StatusBadge } from '../../../components/status/StatusBadge';
import { Cpu, CheckCircle2, AlertCircle, Layers, Server } from 'lucide-react';

export interface ReleaseCompatibilityPanelProps {
  compatibility: ReleaseCompatibilityRecord;
}

export const ReleaseCompatibilityPanel: React.FC<ReleaseCompatibilityPanelProps> = ({
  compatibility
}) => {
  return (
    <div
      style={{
        backgroundColor: 'var(--fiori-surface, #FFFFFF)',
        border: '1px solid var(--fiori-border, #E2E8F0)',
        borderRadius: 'var(--radius-md, 6px)',
        padding: '24px',
        boxShadow: 'var(--fiori-shadow-sm, 0 1px 3px rgba(0,0,0,0.05))',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px'
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h3
            style={{
              margin: '0 0 4px 0',
              fontSize: '15px',
              fontWeight: 700,
              color: 'var(--fiori-navy, #102A43)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <Cpu size={16} color="var(--fiori-primary, #0A6ED1)" />
            S/4HANA Release Compatibility &amp; Component Stack Audit
          </h3>
          <p style={{ margin: 0, fontSize: '12px', color: 'var(--fiori-text-secondary, #64748B)' }}>
            System-level compatibility evaluation based on official catalogue release matrix and DDIC table CVERS.
          </p>
        </div>

        <StatusBadge status={compatibility.status} size="md" />
      </div>

      {/* Summary Box */}
      <div
        style={{
          padding: '14px',
          borderRadius: 'var(--radius-sm, 4px)',
          backgroundColor: 'var(--fiori-surface-subtle, #F8FAFC)',
          border: '1px solid var(--fiori-border, #E2E8F0)',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '12px',
          fontSize: '12px'
        }}
      >
        <div>
          <span style={{ color: 'var(--fiori-text-secondary, #64748B)' }}>Target Landscape Release:</span>
          <div style={{ fontWeight: 700, color: 'var(--fiori-navy, #102A43)', marginTop: '2px' }}>
            {compatibility.targetRelease}
          </div>
        </div>

        <div>
          <span style={{ color: 'var(--fiori-text-secondary, #64748B)' }}>Required Product Baseline:</span>
          <div style={{ fontWeight: 700, color: 'var(--fiori-navy, #102A43)', marginTop: '2px' }}>
            {compatibility.requiredProductVersion}
          </div>
        </div>

        <div>
          <span style={{ color: 'var(--fiori-text-secondary, #64748B)' }}>Minimum Documented Release:</span>
          <div style={{ fontWeight: 600, color: 'var(--fiori-navy, #102A43)', marginTop: '2px' }}>
            {compatibility.minimumRelease}
          </div>
        </div>
      </div>

      {/* Explanation */}
      <p style={{ margin: 0, fontSize: '12px', lineHeight: 1.5, color: 'var(--fiori-text-primary, #1B2838)' }}>
        {compatibility.details}
      </p>

      {/* Component Checks Table */}
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
              <th style={{ textAlign: 'left', padding: '10px 14px', color: 'var(--fiori-navy, #102A43)', width: '25%' }}>
                Software Component
              </th>
              <th style={{ textAlign: 'left', padding: '10px 12px', color: 'var(--fiori-navy, #102A43)', width: '25%' }}>
                Required Level (FAL Matrix)
              </th>
              <th style={{ textAlign: 'left', padding: '10px 12px', color: 'var(--fiori-navy, #102A43)', width: '25%' }}>
                System Level in S21 (CVERS)
              </th>
              <th style={{ textAlign: 'center', padding: '10px 14px', color: 'var(--fiori-navy, #102A43)', width: '25%' }}>
                Compatibility Status
              </th>
            </tr>
          </thead>
          <tbody>
            {compatibility.componentChecks.map((c, idx) => (
              <tr
                key={c.component}
                style={{
                  borderBottom: idx === compatibility.componentChecks.length - 1 ? 'none' : '1px solid var(--fiori-border-light, #F1F5F9)',
                  backgroundColor: idx % 2 === 0 ? '#FFFFFF' : '#FAFBFD'
                }}
              >
                <td style={{ padding: '10px 14px' }}>
                  <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--fiori-navy, #102A43)' }}>
                    {c.component}
                  </div>
                  {c.notes && (
                    <div style={{ fontSize: '11px', color: 'var(--fiori-text-secondary, #64748B)', marginTop: '2px' }}>
                      {c.notes}
                    </div>
                  )}
                </td>

                <td style={{ padding: '10px 12px', fontFamily: 'var(--font-mono)' }}>
                  {c.requiredLevel}
                </td>

                <td style={{ padding: '10px 12px', fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--fiori-navy, #102A43)' }}>
                  {c.systemLevel}
                </td>

                <td style={{ textAlign: 'center', padding: '10px 14px' }}>
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '2px 8px',
                      borderRadius: '2px',
                      fontSize: '11px',
                      fontWeight: 700,
                      backgroundColor: c.compatible ? '#E8F5E9' : '#FFEBEE',
                      color: c.compatible ? '#1B5E20' : '#B71C1C',
                      border: `1px solid ${c.compatible ? '#A5D6A7' : '#FFCDD2'}`
                    }}
                  >
                    <CheckCircle2 size={12} /> {c.compatible ? 'COMPATIBLE' : 'INCOMPATIBLE'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
