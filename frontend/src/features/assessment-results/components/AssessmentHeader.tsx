import React from 'react';
import { useNavigate } from 'react-router-dom';
import { AssessmentRecord } from '../../../services/contracts/types';
import { StatusBadge } from '../../../components/status/StatusBadge';
import {
  Compass,
  ArrowLeft,
  History,
  Download,
  Server,
  FileCode,
  ShieldCheck,
  Calendar,
  Layers
} from 'lucide-react';

export interface AssessmentHeaderProps {
  assessment: AssessmentRecord;
  onOpenDiscoveryDetails: () => void;
  onOpenExportModal: () => void;
}

export const AssessmentHeader: React.FC<AssessmentHeaderProps> = ({
  assessment,
  onOpenDiscoveryDetails,
  onOpenExportModal
}) => {
  const navigate = useNavigate();

  return (
    <div
      style={{
        backgroundColor: 'var(--fiori-surface, #FFFFFF)',
        border: '1px solid var(--fiori-border, #DDE2E5)',
        borderRadius: 'var(--radius-md, 8px)',
        padding: '18px 22px',
        boxShadow: 'var(--fiori-shadow-xs, 0 1px 2px rgba(29, 45, 62, 0.04))',
        display: 'flex',
        flexDirection: 'column',
        gap: '14px'
      }}
    >
      {/* Top Row: Title, TCode, Badges & Action Buttons */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: '14px'
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <span
              style={{
                fontFamily: 'var(--font-mono, monospace)',
                fontSize: '18px',
                fontWeight: 700,
                color: 'var(--fiori-primary, #0070F2)',
                backgroundColor: 'var(--fiori-primary-light, #E8F1FC)',
                padding: '3px 10px',
                borderRadius: 'var(--radius-sm, 6px)',
                border: '1px solid var(--fiori-info-border, #B4D5FE)'
              }}
            >
              {assessment.tcode}
            </span>
            <h1
              style={{
                margin: 0,
                fontSize: '18px',
                fontWeight: 600,
                color: 'var(--fiori-text-primary, #1D2D3E)'
              }}
            >
              {assessment.description}
            </h1>
            <StatusBadge status={assessment.classification} size="sm" />
            <StatusBadge status={assessment.assessmentResult} size="sm" />
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '14px',
              fontSize: '12px',
              color: 'var(--fiori-text-secondary, #556B82)',
              marginTop: '6px',
              flexWrap: 'wrap'
            }}
          >
            <span>
              Business Area: <strong style={{ color: 'var(--fiori-text-primary, #1D2D3E)' }}>{assessment.businessArea}</strong>
              {assessment.subArea && ` / ${assessment.subArea}`}
            </span>
            <span>•</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Server size={13} color="var(--fiori-primary, #0070F2)" /> Target: <strong style={{ color: 'var(--fiori-text-primary, #1D2D3E)' }}>{assessment.systemId}</strong> (Client {assessment.client})
            </span>
            <span>•</span>
            <span>
              Release: <strong style={{ color: 'var(--fiori-text-primary, #1B2838)' }}>{assessment.release}</strong>
            </span>
            <span>•</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Calendar size={13} /> Assessed: <strong>{assessment.lastAssessed}</strong>
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="fiori-btn fiori-btn-secondary"
            onClick={() => navigate(`/transaction-discovery?tcode=${assessment.tcode}`)}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', height: '32px' }}
          >
            <Compass size={14} /> Back to Discovery
          </button>

          <button
            type="button"
            className="fiori-btn fiori-btn-secondary"
            onClick={onOpenDiscoveryDetails}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', height: '32px' }}
          >
            <FileCode size={14} /> Discovery Intake Details
          </button>



          <button
            type="button"
            className="fiori-btn fiori-btn-primary"
            onClick={onOpenExportModal}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', height: '32px' }}
          >
            <Download size={14} /> Export Assessment
          </button>
        </div>
      </div>

      {/* Identity & Provenance Ribbon */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '10px 14px',
          backgroundColor: 'var(--fiori-surface-subtle, #F8FAFC)',
          border: '1px solid var(--fiori-border-light, #F1F5F9)',
          borderRadius: 'var(--radius-sm, 4px)',
          fontSize: '12px',
          flexWrap: 'wrap',
          gap: '12px'
        }}
      >
       

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ color: 'var(--fiori-text-secondary, #64748B)' }}>Baseline Verification:</span>
          <span
            style={{
              padding: '2px 8px',
              borderRadius: 'var(--radius-xs, 4px)',
              fontSize: '11px',
              fontWeight: 600,
              backgroundColor: '#EFF6FF',
              color: '#0066FF',
              border: '1px solid #DBEAFE'
            }}
          >
            SAP S/4HANA Enterprise Baseline
          </span>
        </div>
      </div>
    </div>
  );
};
