import React from 'react';
import { AssessmentRecord } from '../../../services/contracts/types';
import { StatusBadge } from '../../../components/status/StatusBadge';
import { ShieldCheck, AlertCircle, Info, Layers, CheckCircle2 } from 'lucide-react';

export interface ClassificationPanelProps {
  assessment: AssessmentRecord;
}

export const ClassificationPanel: React.FC<ClassificationPanelProps> = ({ assessment }) => {
  const isCustom = assessment.classification === 'CUSTOM';
  const isStandard = assessment.classification === 'STANDARD';
  const isUnknown = assessment.classification === 'UNKNOWN';

  // Multi-evidence rationale points
  const getEvidencePoints = () => {
    const list: { label: string; passed: boolean; finding: string }[] = [];

    // Check 1: TADIR Object Directory
    if (isStandard) {
      list.push({
        label: 'TADIR Object Directory Check',
        passed: true,
        finding: `Object R3TR TRAN ${assessment.tcode} belongs to package ${assessment.packageName} with original repository system ${assessment.originalSystem}. This confirms SAP standard delivery.`
      });
    } else if (isCustom) {
      list.push({
        label: 'TADIR Object Directory Check',
        passed: true,
        finding: `Object R3TR TRAN ${assessment.tcode} belongs to customer package ${assessment.packageName} created on system ${assessment.originalSystem}. Confirmed customer repository development.`
      });
    } else {
      list.push({
        label: 'TADIR Object Directory Check',
        passed: false,
        finding: `TADIR ownership for ${assessment.tcode} could not be conclusively determined. Incomplete package/system metadata.`
      });
    }

    // Check 2: Software Component & Layer
    if (assessment.softwareComponent && assessment.softwareComponent.includes('S4CORE')) {
      list.push({
        label: 'Software Component Layer',
        passed: true,
        finding: `Mapped to standard ERP core software layer "${assessment.softwareComponent}". Standard SAP upgrade and maintenance applies.`
      });
    } else if (isCustom) {
      list.push({
        label: 'Software Component Layer',
        passed: true,
        finding: `Assigned to customer local layer or custom add-on namespace (${assessment.softwareComponent || 'LOCAL_S21'}). Excluded from standard SAP upgrades.`
      });
    }

    // Check 3: Namespace & Naming Convention
    const hasCustomPrefix = assessment.tcode.startsWith('Z') || assessment.tcode.startsWith('Y') || assessment.tcode.startsWith('/');
    list.push({
      label: 'Namespace & Naming Evaluation',
      passed: true,
      finding: hasCustomPrefix
        ? `T-Code adheres to customer namespace prefix (${assessment.tcode.slice(0, 1)}). Evaluated strictly as supporting corroboration alongside TADIR evidence.`
        : `T-Code adheres to standard SAP naming convention. Evaluated strictly as supporting corroboration alongside TADIR package evidence.`
    });

    // Check 4: Dictionary Executable Program
    list.push({
      label: 'Main Program Linkage (TSTC)',
      passed: Boolean(assessment.programName && assessment.programName !== 'UNKNOWN'),
      finding: `Executable program ${assessment.programName} linked in TSTC. Confirmed executable ABAP unit.`
    });

    return list;
  };

  const evidencePoints = getEvidencePoints();

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
            <ShieldCheck size={16} color="var(--fiori-primary, #0A6ED1)" />
            Transaction Classification &amp; Repository Evidence
          </h3>
          <p
            style={{
              margin: 0,
              fontSize: '12px',
              color: 'var(--fiori-text-secondary, #64748B)'
            }}
          >
            Multi-evidence determination combining TADIR directory metadata, package origin, software component, and namespace.
          </p>
        </div>

        <StatusBadge status={assessment.classification} size="md" />
      </div>

      {/* Decision Rationale Box */}
      <div
        style={{
          padding: '14px 16px',
          borderRadius: 'var(--radius-sm, 4px)',
          backgroundColor: isCustom ? '#FFF9E6' : '#F0F9FF',
          border: `1px solid ${isCustom ? '#FFE58F' : '#BAE0FD'}`,
          display: 'flex',
          flexDirection: 'column',
          gap: '6px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {isCustom ? (
            <AlertCircle size={15} color="#D48806" />
          ) : (
            <CheckCircle2 size={15} color="#096DD9" />
          )}
          <strong style={{ fontSize: '13px', color: isCustom ? '#874D00' : '#003A8C' }}>
            Classification Determination: {assessment.classification}
          </strong>
        </div>

        <p style={{ margin: 0, fontSize: '12px', lineHeight: 1.5, color: '#1B2838' }}>
          {isStandard && (
            <>
              Transaction <strong>{assessment.tcode}</strong> is verified as <strong>SAP Standard</strong>. Repository table
              TADIR confirms object ownership by standard package <code>{assessment.packageName}</code> originating from
              system <code>{assessment.originalSystem}</code> within component <code>{assessment.softwareComponent}</code>.
              Existence in TSTC alone is insufficient; TADIR object directory verification validates genuine standard delivery.
            </>
          )}
          {isCustom && (
            <>
              Transaction <strong>{assessment.tcode}</strong> is verified as <strong>Customer Custom Development</strong>.
              Repository table TADIR confirms ownership by development class <code>{assessment.packageName}</code> created on
              local system <code>{assessment.originalSystem}</code>. Classification is grounded in TADIR ownership rather
              than purely naming convention.
            </>
          )}
          {isUnknown && (
            <>
              Classification for <strong>{assessment.tcode}</strong> is marked as <strong>Unknown / Pending</strong> due to
              insufficient repository evidence in the current snapshot. Further live DDIC query on S21 is required.
            </>
          )}
        </p>
      </div>

      {/* Evidentiary Checklist */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--fiori-navy, #102A43)' }}>
          Supporting Evidence Breakdown:
        </span>
        {evidencePoints.map((ep, idx) => (
          <div
            key={idx}
            style={{
              padding: '10px 14px',
              backgroundColor: 'var(--fiori-surface-subtle, #F8FAFC)',
              border: '1px solid var(--fiori-border-light, #F1F5F9)',
              borderRadius: 'var(--radius-xs, 2px)',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '10px',
              fontSize: '12px'
            }}
          >
            <CheckCircle2
              size={15}
              color={ep.passed ? 'var(--fiori-success, #188918)' : 'var(--fiori-warning, #E9730C)'}
              style={{ marginTop: '2px', flexShrink: 0 }}
            />
            <div>
              <strong style={{ color: 'var(--fiori-navy, #102A43)' }}>{ep.label}: </strong>
              <span style={{ color: 'var(--fiori-text-primary, #1B2838)' }}>{ep.finding}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
