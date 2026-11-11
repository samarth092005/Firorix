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
          Business Role Validation &amp; Authorization Mapping (4-Way Fact Separation)
        </h3>
        <p style={{ margin: 0, fontSize: '12px', color: 'var(--fiori-text-secondary, #64748B)' }}>
          Strict architectural distinction between user-requested roles, official SAP Fiori catalogue roles, S21 PFCG assignment, and live user authorization.
        </p>
      </div>



      {/* Structured Table */}
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
                Business Role (Technical ID)
              </th>
              <th style={{ textAlign: 'center', padding: '10px 12px', color: 'var(--fiori-navy, #102A43)', width: '15%' }}>
                In Business Requirements?
              </th>
              <th style={{ textAlign: 'center', padding: '10px 12px', color: 'var(--fiori-navy, #102A43)', width: '15%' }}>
                Documented in Official FAL?
              </th>
              <th style={{ textAlign: 'left', padding: '10px 12px', color: 'var(--fiori-navy, #102A43)', width: '20%' }}>
                Assigned in S21 Client 200?
              </th>
              <th style={{ textAlign: 'left', padding: '10px 14px', color: 'var(--fiori-navy, #102A43)', width: '25%' }}>
                Role Availability Status
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
                  <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--fiori-navy, #102A43)' }}>
                    {r.roleName}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--fiori-text-secondary, #64748B)', marginTop: '2px' }}>
                    {r.description}
                  </div>
                </td>

                <td style={{ textAlign: 'center', padding: '10px 12px' }}>
                  {r.mentionedInBusinessContext ? (
                    <span
                      style={{
                        padding: '2px 8px',
                        backgroundColor: '#E8F5E9',
                        color: '#1B5E20',
                        borderRadius: '2px',
                        fontWeight: 600,
                        fontSize: '11px'
                      }}
                    >
                      YES (User Intake)
                    </span>
                  ) : (
                    <span style={{ color: 'var(--fiori-text-secondary, #64748B)', fontSize: '11px' }}>
                      No (Catalogue Only)
                    </span>
                  )}
                </td>

                <td style={{ textAlign: 'center', padding: '10px 12px' }}>
                  {r.documentedInOfficialCatalogue ? (
                    <span
                      style={{
                        padding: '2px 8px',
                        backgroundColor: '#EBF3FB',
                        color: '#0A6ED1',
                        borderRadius: '2px',
                        fontWeight: 600,
                        fontSize: '11px'
                      }}
                    >
                      YES (Verified FAL)
                    </span>
                  ) : (
                    <span
                      style={{
                        padding: '2px 8px',
                        backgroundColor: '#FFF8E6',
                        color: '#8A5800',
                        borderRadius: '2px',
                        fontWeight: 600,
                        fontSize: '11px'
                      }}
                    >
                      NO (User Reference)
                    </span>
                  )}
                </td>

                <td style={{ padding: '10px 12px' }}>
                  <span
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '11px',
                      color: r.assignedInS21Status === 'CONFIRMED_ASSIGNED' ? '#1B5E20' : '#8A5800',
                      fontWeight: 600
                    }}
                  >
                    {r.assignedInS21Status}
                  </span>
                  <div style={{ fontSize: '10px', color: 'var(--fiori-text-secondary, #64748B)', marginTop: '2px' }}>
                    Requires SU01 / PFCG check
                  </div>
                </td>

                <td style={{ padding: '10px 14px' }}>
                  <span
                    style={{
                      display: 'inline-block',
                      padding: '2px 8px',
                      borderRadius: 'var(--radius-xs, 2px)',
                      fontSize: '11px',
                      fontWeight: 600,
                      backgroundColor:
                        r.roleAvailabilityStatus === 'READY_FOR_USE'
                          ? '#E8F5E9'
                          : r.roleAvailabilityStatus === 'REQUIRES_PFCG_ROLE_ASSIGNMENT'
                          ? '#FFF8E6'
                          : '#F1F5F9',
                      color:
                        r.roleAvailabilityStatus === 'READY_FOR_USE'
                          ? '#1B5E20'
                          : r.roleAvailabilityStatus === 'REQUIRES_PFCG_ROLE_ASSIGNMENT'
                          ? '#8A5800'
                          : '#475569',
                      border: `1px solid ${
                        r.roleAvailabilityStatus === 'READY_FOR_USE'
                          ? '#A5D6A7'
                          : r.roleAvailabilityStatus === 'REQUIRES_PFCG_ROLE_ASSIGNMENT'
                          ? '#FFE082'
                          : '#CBD5E1'
                      }`
                    }}
                  >
                    {r.roleAvailabilityStatus.replace(/_/g, ' ')}
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
