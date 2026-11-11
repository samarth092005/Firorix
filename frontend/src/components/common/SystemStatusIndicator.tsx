import React from 'react';
import { SystemConnectionState } from '../../services/contracts/types';
import { Wifi, WifiOff, AlertCircle, Database } from 'lucide-react';

export interface SystemStatusIndicatorProps {
  state: SystemConnectionState;
  systemId?: string;
  client?: string;
  showDetails?: boolean;
}

export const SystemStatusIndicator: React.FC<SystemStatusIndicatorProps> = ({
  state,
  systemId = 'S21',
  client = '200',
  showDetails = true
}) => {
  const configs: Record<
    string,
    {
      label: string;
      color: string;
      bgColor: string;
      borderColor: string;
      icon: React.ElementType;
      description: string;
    }
  > = {
    CONNECTED: {
      label: 'Connected',
      color: '#15803D',
      bgColor: '#DCFCE7',
      borderColor: '#BBF7D0',
      icon: Wifi,
      description: 'Active SAP S/4HANA connection verified.'
    },
    DISCONNECTED: {
      label: 'Disconnected',
      color: '#B91C1C',
      bgColor: '#FEE2E2',
      borderColor: '#FECACA',
      icon: WifiOff,
      description: 'Target SAP system is unreachable.'
    },
    NOT_CONFIGURED: {
      label: 'Not Configured',
      color: '#475569',
      bgColor: '#F1F5F9',
      borderColor: '#E2E8F0',
      icon: AlertCircle,
      description: 'Cloud Connector or Destination mapping missing.'
    },
    DEMO_MODE: {
      label: 'Demo Mode (Simulated)',
      color: '#B45309',
      bgColor: '#FEF3C7',
      borderColor: '#FDE68A',
      icon: Database,
      description: 'Operating with curated local mock fixtures. Not live connected to SAP.'
    },
    AUTH_REQUIRED: {
      label: 'Authentication Required',
      color: '#C2410C',
      bgColor: '#FFEDD5',
      borderColor: '#FED7AA',
      icon: AlertCircle,
      description: 'SAP Gateway or BTP Destination requires administrative authorization.'
    },
    PARTIAL: {
      label: 'Partial Availability',
      color: '#D97706',
      bgColor: '#FEF3C7',
      borderColor: '#FDE68A',
      icon: AlertCircle,
      description: 'Backend is online; SAP target host or tunnel is pending verification.'
    }
  };

  const config = configs[state] || configs.DEMO_MODE;
  const Icon = config.icon;

  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: '3px 10px',
        borderRadius: '20px',
        backgroundColor: config.bgColor,
        border: `1px solid ${config.borderColor}`,
        fontSize: '11px',
        fontWeight: 600,
        color: config.color
      }}
      title={config.description}
    >
      <Icon size={12} color={config.color} />
      <span>{config.label}</span>
      {showDetails && (
        <span style={{ opacity: 0.85, fontWeight: 500 }}>
          ({systemId}/{client})
        </span>
      )}
    </div>
  );
};
