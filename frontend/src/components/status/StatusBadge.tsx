import React from 'react';

export interface StatusBadgeProps {
  status: string;
  variant?: 'success' | 'warning' | 'error' | 'neutral' | 'info' | 'purple';
  size?: 'sm' | 'md';
  customLabel?: string;
  icon?: React.ReactNode;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status = 'UNKNOWN',
  variant,
  size = 'sm',
  customLabel,
  icon
}) => {
  let computedVariant: 'success' | 'warning' | 'error' | 'neutral' | 'info' | 'purple' = variant || 'neutral';

  const safeStatus = (status || customLabel || 'UNKNOWN').toString();
  const normalized = safeStatus.toUpperCase().replace(/[\s-]+/g, '_');

  if (!variant) {
    switch (normalized) {
      case 'EXPLICIT_SUCCESSOR':
      case 'DIRECT_MATCH':
      case 'ADD_AND_CONFIGURE':
      case 'ADD_&_CONFIGURE':
      case 'ADOPT':
      case 'SUPPORTED':
      case 'VERIFIED':
      case 'PASS':
      case 'APPROVED':
      case 'COMPLETED':
      case 'SUCCESS':
      case 'CONNECTED':
      case 'STANDARD':
        computedVariant = 'success';
        break;

      case 'PARTIAL':
      case 'INFERRED':
      case 'WARNING':
      case 'IN_PROGRESS':
      case 'REVIEW_READY':
      case 'PENDING_VERIFICATION':
      case 'CATALOGUE_PENDING_VERIFICATION':
      case 'NOT_CONFIGURED':
      case 'DEMO_MODE':
      case 'RECORDED_AWAITING_REFRESH':
        computedVariant = 'warning';
        break;

      case 'BUILD':
      case 'UNSUPPORTED':
      case 'NOT_AUTHORIZED':
      case 'FAIL':
      case 'FAILED':
      case 'REJECTED':
      case 'OFFLINE':
      case 'DISCONNECTED':
      case 'CRITICAL':
      case 'RELEASE_INCOMPATIBLE':
      case 'INCOMPATIBLE':
        computedVariant = 'error';
        break;

      case 'SAP_GUI_HTML':
      case 'SAME_TRANSACTION_CLASSIC':
      case 'INFO':
      case 'COMPATIBLE':
      case 'FUNCTIONAL_ALTERNATIVE':
      case 'RELATED_MATCH':
        computedVariant = 'info';
        break;

      case 'NO_VERIFIED_MATCH':
      case 'NO_STANDARD_APP_EXISTS':
      case 'CUSTOM':
      case 'REVIEW':
      case 'UNKNOWN':
      case 'NOT_AVAILABLE':
      case 'NOT_RUN':
      case 'NOT_ASSESSED':
      case 'QUEUED':
      case 'DRAFT':
      default:
        computedVariant = 'neutral';
        break;
    }
  }

  // Modern Clean Pastel Pill Palettes
  const variantStyles: Record<string, React.CSSProperties> = {
    success: {
      backgroundColor: '#DCFCE7',
      color: '#15803D',
      borderColor: '#BBF7D0'
    },
    warning: {
      backgroundColor: '#FFEDD5',
      color: '#C2410C',
      borderColor: '#FED7AA'
    },
    error: {
      backgroundColor: '#FEE2E2',
      color: '#B91C1C',
      borderColor: '#FECACA'
    },
    info: {
      backgroundColor: '#EFF6FF',
      color: '#0066FF',
      borderColor: '#DBEAFE'
    },
    purple: {
      backgroundColor: '#F3E8FF',
      color: '#7E22CE',
      borderColor: '#E9D5FF'
    },
    neutral: {
      backgroundColor: '#F1F5F9',
      color: '#475569',
      borderColor: '#E2E8F0'
    }
  };

  const style = variantStyles[computedVariant] || variantStyles.neutral;
  const paddingStyle = size === 'md' ? '4px 12px' : '2px 9px';
  const fontSize = size === 'md' ? '12px' : '11px';

  // Human friendly label
  const label = customLabel || status.replace(/_/g, ' ');

  return (
    <span
      className={`fiori-badge fiori-badge-${computedVariant}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '5px',
        padding: paddingStyle,
        fontSize,
        fontWeight: 600,
        borderRadius: '20px',
        border: '1px solid',
        letterSpacing: '0.1px',
        whiteSpace: 'nowrap',
        lineHeight: 1.35,
        ...style
      }}
    >
      {icon && <span style={{ display: 'flex', alignItems: 'center' }}>{icon}</span>}
      {label}
    </span>
  );
};
