import React from 'react';
import { FileCode2, ArrowRight } from 'lucide-react';

interface ArchitectSignOffSectionProps {
  architectName: string;
  setArchitectName: (val: string) => void;
  architectJustification: string;
  setArchitectJustification: (val: string) => void;
  architectApproved: boolean;
  setArchitectApproved: (val: boolean) => void;
  evidenceCompleteness: number;
  buildSaveStatus: string;
  onTransferToGenerationStudio: () => void;
}

export const ArchitectSignOffSection: React.FC<ArchitectSignOffSectionProps> = ({
  architectName,
  setArchitectName,
  architectJustification,
  setArchitectJustification,
  architectApproved,
  setArchitectApproved,
  evidenceCompleteness,
  buildSaveStatus,
  onTransferToGenerationStudio
}) => {
  return (
    <>
      {/* Architect Sign-Off Inputs */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <h4 style={{ fontSize: '11.5px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', margin: 0 }}>
          Lead Architect Sign-Off & Approvals
        </h4>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '12px', fontWeight: 600, color: '#334155' }}>Architect Name / Authority</label>
            <input
              type="text"
              value={architectName}
              onChange={(e) => setArchitectName(e.target.value)}
              style={{ padding: '8px 12px', border: '1px solid #CBD5E1', borderRadius: '6px', fontSize: '13px', color: '#0F172A', outline: 'none' }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '12px', fontWeight: 600, color: '#334155' }}>Architecture Decision Justification</label>
            <input
              type="text"
              value={architectJustification}
              onChange={(e) => setArchitectJustification(e.target.value)}
              placeholder="Justification for custom RAP development..."
              style={{ padding: '8px 12px', border: '1px solid #CBD5E1', borderRadius: '6px', fontSize: '13px', color: '#0F172A', outline: 'none' }}
            />
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 16px', backgroundColor: '#FCF6FF', border: '1px solid #E3BFFF', borderRadius: '6px' }}>
          <input
            type="checkbox"
            id="chk-arch-approval"
            checked={architectApproved}
            onChange={(e) => setArchitectApproved(e.target.checked)}
            style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: '#8C19C5' }}
          />
          <label htmlFor="chk-arch-approval" style={{ fontSize: '12.5px', fontWeight: 600, color: '#581C87', cursor: 'pointer' }}>
            I confirm that Lead Enterprise Architecture approval has been granted to commission custom RAP generation in Generation Studio.
          </label>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '16px', borderTop: '1px solid #EDF0F2', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ fontSize: '12px', color: '#64748B' }}>
          Completeness: <strong style={{ color: '#0F172A' }}>{evidenceCompleteness}%</strong> • Target: <strong style={{ color: '#0F172A' }}>SAP S/4HANA 2023 RAP</strong>
        </div>
        <button
          type="button"
          onClick={onTransferToGenerationStudio}
          disabled={!architectApproved || buildSaveStatus === 'SAVING'}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            height: '38px',
            padding: '0 20px',
            fontSize: '13.5px',
            fontWeight: 600,
            borderRadius: '6px',
            border: 'none',
            cursor: !architectApproved || buildSaveStatus === 'SAVING' ? 'not-allowed' : 'pointer',
            backgroundColor: '#8C19C5',
            color: '#FFFFFF',
            boxShadow: '0 1px 2px rgba(140, 25, 197, 0.2)'
          }}
        >
          <FileCode2 size={16} />
          {buildSaveStatus === 'SAVING' ? 'Commissioning...' : 'Transfer Context to Generation Studio'}
          <ArrowRight size={16} />
        </button>
      </div>
    </>
  );
};
