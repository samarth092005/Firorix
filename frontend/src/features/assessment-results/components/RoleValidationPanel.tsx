import React from 'react';
import { RoleValidationRecord } from '../../../services/contracts/types';
import { Shield, Check, X, AlertTriangle, Info, UserCheck, Lock } from 'lucide-react';

export interface RoleValidationPanelProps {
  roles: RoleValidationRecord[];
}

export const RoleValidationPanel: React.FC<RoleValidationPanelProps> = ({ roles }) => {
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
          <Shield size={16} color="var(--fiori-primary, #0A6ED1)" />
          Security &amp; Standard Business Roles ({roles.length})
        </h3>
        <p style={{ margin: 0, fontSize: '12px', color: 'var(--fiori-text-secondary, #64748B)' }}>
          Verified PFCG business role templates required to access this application in the SAP Fiori Launchpad.
        </p>
      </div>

      {/* Structured Clean Table */}
      <div
        style={{
          border: '1px solid var(--fiori-border, #E2E8F0)',
          borderRadius: 'var(--radius-sm, 6px)',
          overflowX: 'auto'
        }}
      >
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
          <thead>
            <tr style={{ backgroundColor: 'var(--fiori-surface-subtle, #F8FAFC)', borderBottom: '1px solid var(--fiori-border, #E2E8F0)' }}>
              <th style={{ textAlign: 'left', padding: '10px 14px', color: 'var(--fiori-navy, #102A43)', width: '45%' }}>
                Business Role (Technical ID &amp; Title)
              </th>
              <th style={{ textAlign: 'left', padding: '10px 14px', color: 'var(--fiori-navy, #102A43)', width: '25%' }}>
                Source &amp; Catalog
              </th>
              <th style={{ textAlign: 'left', padding: '10px 14px', color: 'var(--fiori-navy, #102A43)', width: '30%' }}>
                PFCG Provisioning Status
              </th>
            </tr>
          </thead>
          <tbody>
            {roles.map((r, idx) => (
              <tr
                key={r.roleName}
                style={{
                  borderBottom: idx === roles.length - 1 ? 'none' : '1px solid var(--fiori-border-light, #F1F5F9)',
                  backgroundColor: idx % 2 === 0 ? '#FFFFFF' : '#FAFBFD'
                }}
              >
                <td style={{ padding: '10px 14px' }}>
                  <div style={{ fontFamily: 'var(--font-mono, monospace)', fontWeight: 700, color: '#0F172A', fontSize: '12.5px' }}>
                    {r.roleName}
                  </div>
                  <div style={{ fontSize: '11px', color: '#64748B', marginTop: '2px' }}>
                    {r.description}
                  </div>
                </td>

                <td style={{ padding: '10px 14px' }}>
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      fontSize: '11px',
                      fontWeight: 600,
                      backgroundColor: r.documentedInOfficialCatalogue ? '#EFF6FF' : '#F1F5F9',
                      color: r.documentedInOfficialCatalogue ? '#1D4ED8' : '#475569',
                      border: `1px solid ${r.documentedInOfficialCatalogue ? '#BFDBFE' : '#E2E8F0'}`
                    }}
                  >
                    {r.documentedInOfficialCatalogue ? 'Official SAP FAL' : 'User Context'}
                  </span>
                </td>

                <td style={{ padding: '10px 14px' }}>
                  <span
                    style={{
                      display: 'inline-block',
                      padding: '3px 8px',
                      borderRadius: '4px',
                      fontSize: '11px',
                      fontWeight: 600,
                      backgroundColor:
                        r.roleAvailabilityStatus === 'READY_FOR_USE' || r.assignedInS21Status === 'CONFIRMED_ASSIGNED'
                          ? '#DCFCE7'
                          : '#FEF3C7',
                      color:
                        r.roleAvailabilityStatus === 'READY_FOR_USE' || r.assignedInS21Status === 'CONFIRMED_ASSIGNED'
                          ? '#15803D'
                          : '#92400E',
                      border: `1px solid ${
                        r.roleAvailabilityStatus === 'READY_FOR_USE' || r.assignedInS21Status === 'CONFIRMED_ASSIGNED'
                          ? '#BBF7D0'
                          : '#FDE68A'
                      }`
                    }}
                  >
                    {r.assignedInS21Status === 'CONFIRMED_ASSIGNED'
                      ? 'Confirmed in S21 Client 200'
                      : 'Requires PFCG Assignment (PFCG / SU01)'}
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
