import React from 'react';
import { AlertCircle } from 'lucide-react';

export const MockNoticeBanner: React.FC = () => {
  return (
    <div
      role="alert"
      style={{
        backgroundColor: '#FFF4E5',
        borderBottom: '1px solid #FFE2B8',
        padding: '8px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        fontSize: '12px',
        color: '#7A4100',
        fontWeight: 500,
        zIndex: 30
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <AlertCircle size={15} color="#D9730D" style={{ flexShrink: 0 }} />
        <span>
          <strong>DEMO DATA — NOT CONNECTED TO SAP:</strong> Operating in local synthetic mock mode. All systems, T-Codes, catalogue mappings, and application identifiers are synthetic fixtures and not live SAP results.
        </span>
      </div>
      <span
        style={{
          fontSize: '10px',
          fontWeight: 700,
          letterSpacing: '0.5px',
          backgroundColor: '#FFE2B8',
          padding: '2px 6px',
          borderRadius: '3px',
          textTransform: 'uppercase'
        }}
      >
        MOCK ONLY
      </span>
    </div>
  );
};
