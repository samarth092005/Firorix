import React from 'react';
import { ODataServiceValidationRecord } from '../../../services/contracts/types';
import { Layers, CheckCircle2, AlertTriangle, ExternalLink } from 'lucide-react';
import { StatusBadge } from '../../../components/status/StatusBadge';

export interface ODataValidationPanelProps {
  services: ODataServiceValidationRecord[];
}

export const ODataValidationPanel: React.FC<ODataValidationPanelProps> = ({ services }) => {
  if (!services || services.length === 0) {
    return (
      <div style={{ padding: '16px', color: '#64748B', fontSize: '13px' }}>
        No explicit OData services registered for this assessment.
      </div>
    );
  }

  return (
    <div
      style={{
        backgroundColor: 'var(--fiori-surface, #FFFFFF)',
        border: '1px solid var(--fiori-border, #E2E8F0)',
        borderRadius: 'var(--radius-md, 8px)',
        padding: '20px',
        boxShadow: 'var(--fiori-shadow-sm, 0 1px 3px rgba(0,0,0,0.05))',
        display: 'flex',
        flexDirection: 'column',
        gap: '14px'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <Layers size={16} color="var(--fiori-primary, #0A6ED1)" />
        <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: 'var(--fiori-navy, #102A43)' }}>
          Gateway OData Service Validation ({services.length})
        </h4>
      </div>

      <div className="fiori-table-container">
        <table className="fiori-table" style={{ fontSize: '12px' }}>
          <thead>
            <tr>
              <th>Service Name</th>
              <th>Version</th>
              <th>Provenance</th>
              <th>Gateway Status</th>
              <th>ICF Path</th>
            </tr>
          </thead>
          <tbody>
            {services.map((srv, idx) => (
              <tr key={idx}>
                <td>
                  <code style={{ fontWeight: 600, color: 'var(--fiori-navy, #102A43)' }}>{srv.serviceName}</code>
                  {srv.notes && <div style={{ fontSize: '11px', color: '#64748B', marginTop: '2px' }}>{srv.notes}</div>}
                </td>
                <td>
                  <span className="fiori-badge fiori-badge-neutral">{srv.version || 'V2'}</span>
                </td>
                <td>
                  <span style={{ fontSize: '11px', color: '#475569' }}>{srv.provenance}</span>
                </td>
                <td>
                  <StatusBadge status={srv.registrationStatus} size="sm" />
                </td>
                <td>
                  <code style={{ fontSize: '11px' }}>{srv.icfPath || '/sap/opu/odata/...'}</code>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
