import React from 'react';
import { CatalogueReference, AssessmentResultType } from '../../../services/contracts/types';
import { StatusBadge } from '../../../components/status/StatusBadge';
import {
  ExternalLink,
  Layers,
  Cpu,
  Shield,
  FileText,
  Tag,
  CheckCircle2,
  Calendar,
  Code2
} from 'lucide-react';

export interface FioriCandidateCardProps {
  candidate: CatalogueReference;
  isPrimary?: boolean;
  relationshipType?: AssessmentResultType;
  onSelectForComparison?: (appId: string) => void;
  isSelectedForComparison?: boolean;
}

export const FioriCandidateCard: React.FC<FioriCandidateCardProps> = ({
  candidate,
  isPrimary = false,
  relationshipType = 'EXPLICIT_SUCCESSOR',
  onSelectForComparison,
  isSelectedForComparison = false
}) => {
  return (
    <div
      style={{
        backgroundColor: 'var(--fiori-surface, #FFFFFF)',
        border: isPrimary ? '2px solid var(--fiori-primary, #0A6ED1)' : '1px solid var(--fiori-border, #E2E8F0)',
        borderRadius: 'var(--radius-md, 6px)',
        padding: '20px',
        boxShadow: isPrimary
          ? '0 2px 8px rgba(10, 110, 209, 0.12)'
          : 'var(--fiori-shadow-sm, 0 1px 3px rgba(0,0,0,0.05))',
        display: 'flex',
        flexDirection: 'column',
        gap: '14px',
        position: 'relative'
      }}
    >
      {/* Primary Badge */}
      {isPrimary && (
        <div
          style={{
            position: 'absolute',
            top: '-10px',
            right: '20px',
            backgroundColor: 'var(--fiori-primary, #0A6ED1)',
            color: '#FFFFFF',
            fontSize: '10px',
            fontWeight: 700,
            padding: '2px 8px',
            borderRadius: '10px',
            letterSpacing: '0.5px'
          }}
        >
          PRIMARY RECOMMENDED MATCH
        </div>
      )}

      {/* Header: App ID, Title, Relationship Badge */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', flexWrap: 'wrap' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <span
              style={{
                fontFamily: 'var(--font-mono, monospace)',
                fontSize: '13px',
                fontWeight: 800,
                color: 'var(--fiori-primary, #0A6ED1)',
                backgroundColor: 'var(--fiori-sidebar-active, #E1EFFD)',
                padding: '2px 8px',
                borderRadius: 'var(--radius-xs, 2px)',
                border: '1px solid #B8D5F8'
              }}
            >
              {candidate.appId}
            </span>
            <h4
              style={{
                margin: 0,
                fontSize: '15px',
                fontWeight: 700,
                color: 'var(--fiori-navy, #102A43)'
              }}
            >
              {candidate.appName}
            </h4>
          </div>

          <p
            style={{
              margin: '6px 0 0 0',
              fontSize: '12px',
              color: 'var(--fiori-text-secondary, #64748B)',
              lineHeight: 1.4
            }}
          >
            {candidate.description}
          </p>
        </div>

        <StatusBadge status={relationshipType} size="sm" />
      </div>

      {/* Technical Metadata Matrix */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '10px',
          padding: '12px',
          backgroundColor: 'var(--fiori-surface-subtle, #F8FAFC)',
          borderRadius: 'var(--radius-sm, 4px)',
          fontSize: '12px'
        }}
      >
        <div>
          <span style={{ color: 'var(--fiori-text-secondary, #64748B)' }}>UI Technology:</span>
          <div style={{ fontWeight: 600, color: 'var(--fiori-navy, #102A43)', marginTop: '2px' }}>
            {candidate.uiTechnology}
          </div>
        </div>

        <div>
          <span style={{ color: 'var(--fiori-text-secondary, #64748B)' }}>Supported Product Release:</span>
          <div style={{ fontWeight: 600, color: 'var(--fiori-navy, #102A43)', marginTop: '2px' }}>
            {candidate.supportedProductRelease}
          </div>
        </div>

        <div>
          <span style={{ color: 'var(--fiori-text-secondary, #64748B)' }}>Technical Component:</span>
          <div style={{ fontWeight: 600, fontFamily: 'var(--font-mono)', marginTop: '2px' }}>
            {candidate.technicalComponent}
          </div>
        </div>

        <div>
          <span style={{ color: 'var(--fiori-text-secondary, #64748B)' }}>Related T-Codes:</span>
          <div style={{ fontWeight: 600, fontFamily: 'var(--font-mono)', marginTop: '2px' }}>
            {candidate.relatedTCodes.join(', ') || 'N/A'}
          </div>
        </div>
      </div>

      {/* Business Roles */}
      {candidate.businessRoles && candidate.businessRoles.length > 0 && (
        <div>
          <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--fiori-text-secondary, #64748B)', marginBottom: '4px' }}>
            Documented Business Roles:
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
            {candidate.businessRoles.map((role) => (
              <span
                key={role}
                style={{
                  fontSize: '11px',
                  backgroundColor: '#FFFFFF',
                  padding: '2px 8px',
                  borderRadius: '2px',
                  border: '1px solid var(--fiori-border, #E2E8F0)',
                  color: 'var(--fiori-navy, #102A43)'
                }}
              >
                {role}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* OData Services */}
      {candidate.odataServices && candidate.odataServices.length > 0 && (
        <div>
          <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--fiori-text-secondary, #64748B)', marginBottom: '4px' }}>
            Required OData Services:
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
            {candidate.odataServices.map((srv) => (
              <span
                key={srv}
                style={{
                  fontSize: '11px',
                  fontFamily: 'var(--font-mono, monospace)',
                  backgroundColor: '#FFFFFF',
                  padding: '2px 8px',
                  borderRadius: '2px',
                  border: '1px solid var(--fiori-border, #E2E8F0)',
                  color: 'var(--fiori-navy, #102A43)'
                }}
              >
                {srv}
              </span>
            ))}
          </div>
        </div>
      )}

      
      

      {/* Footer: Official Reference Link & Source Verification */}
      <div
     
      >


        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {onSelectForComparison && (
            <button
              type="button"
              className="fiori-btn fiori-btn-secondary"
              onClick={() => onSelectForComparison(candidate.appId)}
              style={{ fontSize: '11px', height: '26px' }}
            >
              {isSelectedForComparison ? 'Remove from Comparison' : 'Compare Candidate'}
            </button>
          )}

          
        </div>
      </div>
    </div>
  );
};
