import React from 'react';
import { SystemAvailabilityAudit } from '../../../services/contracts/types';
import { StatusBadge } from '../../../components/status/StatusBadge';
import { Server, AlertTriangle, CheckCircle2, Clock, HelpCircle, ShieldAlert } from 'lucide-react';

export interface SystemAvailabilityPanelProps {
  systemAvailability: SystemAvailabilityAudit;
  systemId: string;
  client: string;
}

export const SystemAvailabilityPanel: React.FC<SystemAvailabilityPanelProps> = ({
  systemAvailability,
  systemId,
  client
}) => {
  const checkpoints = [
    {
      id: 1,
      title: 'Official Catalogue Entry',
      description: 'Application metadata catalogued in SAP Fiori Apps Reference Library (fal.cloud.sap).',
      status: systemAvailability.catalogueMatchStatus,
      source: 'SAP Fiori Apps Reference Library (2023 FPS02 Export)',
      statusLabel: systemAvailability.catalogueMatchStatus.replace(/_/g, ' ')
    },
    {
      id: 2,
      title: 'Target S21 App Descriptor Activation',
      description: 'Launchpad application descriptor and ICF UI5 BSP repository active in client 200.',
      status: systemAvailability.activationStatus,
      source: 'Transaction /UI2/FLPCM_CUST / SICF',
      statusLabel: systemAvailability.activationStatus.replace(/_/g, ' ')
    },
    {
      id: 3,
      title: 'Gateway OData Service Registration',
      description: 'Required backend OData services registered and activated in SAP Gateway Foundation.',
      status: systemAvailability.serviceRegistrationStatus,
      source: 'Transaction /IWFND/MAINT_SERVICE',
      statusLabel: systemAvailability.serviceRegistrationStatus.replace(/_/g, ' ')
    },
    {
      id: 4,
      title: 'PFCG Business Role Assignment',
      description: 'Target business catalogue and group assigned to authorization roles in client 200.',
      status: systemAvailability.roleAssignmentStatus,
      source: 'Transaction PFCG / AGR_USERS',
      statusLabel: systemAvailability.roleAssignmentStatus.replace(/_/g, ' ')
    },
    {
      id: 5,
      title: 'End-User Fiori Launchpad Visibility',
      description: 'Tile and Target Mapping visible to target user group in Fiori Launchpad spaces and pages.',
      status: systemAvailability.launchpadVisibilityStatus,
      source: 'SAP Fiori Launchpad Spaces & Pages Engine',
      statusLabel: systemAvailability.launchpadVisibilityStatus.replace(/_/g, ' ')
    }
  ];

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
            <Server size={16} color="var(--fiori-primary, #0A6ED1)" />
            Target System S21 Client {client} Application Availability Audit
          </h3>
          <p style={{ margin: 0, fontSize: '12px', color: 'var(--fiori-text-secondary, #64748B)' }}>
            Strict separation between official SAP catalogue publication and actual runtime activation in S21.
          </p>
        </div>

        <StatusBadge status={systemAvailability.overallS21Availability} size="md" />
      </div>

      {/* Critical Invariant Warning */}
      <div
        style={{
          padding: '12px 16px',
          borderRadius: 'var(--radius-sm, 4px)',
          backgroundColor: '#FFF8E6',
          border: '1px solid #FFE082',
          fontSize: '12px',
          color: '#8A5800',
          display: 'flex',
          alignItems: 'flex-start',
          gap: '10px'
        }}
      >
        <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: '2px', color: '#D48806' }} />
        <div>
          <strong>Architectural Invariant Enforced:</strong> An application existing in the SAP Fiori Apps Reference Library
          does <strong>NOT</strong> mean it is deployed, activated, or accessible to users in target system {systemId} client {client}.
          Live activation requires individual Basis service activation and security role assignment.
        </div>
      </div>

      {/* 5-Checkpoint List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {checkpoints.map((cp) => {
          const isVerified = cp.status === 'CATALOGUE_VERIFIED' || cp.status === 'ACTIVATED' || cp.status === 'REGISTERED' || cp.status === 'ASSIGNED' || cp.status === 'CONFIRMED';
          const isPending = cp.status.includes('PENDING');

          return (
            <div
              key={cp.id}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '12px 16px',
                backgroundColor: 'var(--fiori-surface-subtle, #F8FAFC)',
                border: '1px solid var(--fiori-border, #E2E8F0)',
                borderRadius: 'var(--radius-sm, 4px)',
                flexWrap: 'wrap',
                gap: '10px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', maxWidth: '70%' }}>
                <div
                  style={{
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    backgroundColor: isVerified ? '#E8F5E9' : isPending ? '#FFF8E6' : '#F1F5F9',
                    color: isVerified ? '#1B5E20' : isPending ? '#8A5800' : '#475569',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700,
                    fontSize: '11px',
                    flexShrink: 0
                  }}
                >
                  {cp.id}
                </div>

                <div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--fiori-navy, #102A43)' }}>
                    {cp.title}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--fiori-text-secondary, #64748B)', marginTop: '2px' }}>
                    {cp.description}
                  </div>
                  <div style={{ fontSize: '10px', color: 'var(--fiori-text-secondary, #64748B)', marginTop: '4px' }}>
                    Verification Check: <span style={{ fontFamily: 'var(--font-mono)' }}>{cp.source}</span>
                  </div>
                </div>
              </div>

              <div>
                <span
                  style={{
                    display: 'inline-block',
                    padding: '3px 10px',
                    borderRadius: 'var(--radius-xs, 2px)',
                    fontSize: '11px',
                    fontWeight: 700,
                    fontFamily: 'var(--font-mono)',
                    backgroundColor: isVerified ? '#E8F5E9' : isPending ? '#FFF8E6' : '#F1F5F9',
                    color: isVerified ? '#1B5E20' : isPending ? '#8A5800' : '#475569',
                    border: `1px solid ${isVerified ? '#A5D6A7' : isPending ? '#FFE082' : '#CBD5E1'}`
                  }}
                >
                  {cp.statusLabel}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
