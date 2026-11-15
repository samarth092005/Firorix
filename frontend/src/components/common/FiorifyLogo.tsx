import React from 'react';

export interface FiorifyLogoProps {
  variant?: 'full' | 'compact' | 'icon';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  onClick?: () => void;
  inverted?: boolean; // For dark backgrounds
}

export const FiorifyLogo: React.FC<FiorifyLogoProps> = ({
  variant = 'compact',
  size = 'md',
  className = '',
  onClick,
  inverted = false
}) => {
  // Height definitions
  const heights = {
    sm: variant === 'full' ? 32 : 24,
    md: variant === 'full' ? 42 : 32,
    lg: variant === 'full' ? 56 : 42,
    xl: variant === 'full' ? 72 : 56,
  };

  const iconSizes = {
    sm: 24,
    md: 32,
    lg: 42,
    xl: 56,
  };

  const h = heights[size];
  const iconSize = iconSizes[size];

  // Stylized Icon Only
  if (variant === 'icon') {
    return (
      <div
        className={`fiorify-logo-icon ${className}`}
        style={{
          width: `${iconSize}px`,
          height: `${iconSize}px`,
          cursor: onClick ? 'pointer' : 'default',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0
        }}
        onClick={onClick}
        title="Fiorify"
      >
        <img
          src="/fiorify-icon.svg"
          alt="Fiorify Logo"
          style={{ width: '100%', height: '100%', objectFit: 'contain' }}
        />
      </div>
    );
  }

  // Full High-Res Logo with Wordmark & Tagline
  if (variant === 'full') {
    return (
      <div
        className={`fiorify-logo-full ${className}`}
        style={{
          display: 'inline-flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          cursor: onClick ? 'pointer' : 'default',
          userSelect: 'none'
        }}
        onClick={onClick}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: size === 'sm' ? '8px' : '12px' }}>
          {/* F Icon */}
          <img
            src="/fiorify-icon.svg"
            alt="Fiorify"
            style={{
              height: `${h * 0.75}px`,
              width: `${h * 0.75}px`,
              objectFit: 'contain'
            }}
          />

          {/* Typography Wordmark */}
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div
              style={{
                fontFamily: "system-ui, -apple-system, 'SF Pro Display', 'Segoe UI', Roboto, sans-serif",
                fontSize: `${h * 0.58}px`,
                fontWeight: 800,
                letterSpacing: '-0.03em',
                lineHeight: 1,
                color: inverted ? '#FFFFFF' : '#0B192C'
              }}
            >
              <span>Fiori</span>
              <span style={{ color: '#0066FF' }}>Fy</span>
            </div>

            {/* Official Tagline */}
            <div
              style={{
                fontSize: `${Math.max(9, h * 0.2)}px`,
                fontWeight: 600,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: inverted ? '#94A3B8' : '#475569',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                marginTop: '3px'
              }}
            >
              <span style={{ width: '12px', height: '1.5px', backgroundColor: '#0066FF', opacity: 0.8 }} />
              <span>SAP Fiori Modernization Tool</span>
              <span style={{ width: '12px', height: '1.5px', backgroundColor: '#0066FF', opacity: 0.8 }} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Compact Header / TopBar Variant
  return (
    <div
      className={`fiorify-logo-compact ${className}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '10px',
        cursor: onClick ? 'pointer' : 'default',
        userSelect: 'none'
      }}
      onClick={onClick}
    >
      <img
        src="/fiorify-icon.svg"
        alt="Fiorify"
        style={{
          width: `${iconSize}px`,
          height: `${iconSize}px`,
          objectFit: 'contain',
          flexShrink: 0
        }}
      />
      <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1 }}>
        <div
          style={{
            fontFamily: "system-ui, -apple-system, 'SF Pro Display', 'Segoe UI', Roboto, sans-serif",
            fontSize: `${Math.max(15, iconSize * 0.55)}px`,
            fontWeight: 800,
            letterSpacing: '-0.03em',
            color: inverted ? '#FFFFFF' : '#0F233A'
          }}
        >
          <span>Fiori</span>
          <span style={{ color: '#0066FF' }}>Fy</span>
        </div>
        <div
          style={{
            fontSize: '9.5px',
            fontWeight: 600,
            letterSpacing: '0.04em',
            color: inverted ? '#94A3B8' : '#64748B',
            marginTop: '2px'
          }}
        >
          SAP Fiori Modernization Tool
        </div>
      </div>
    </div>
  );
};
