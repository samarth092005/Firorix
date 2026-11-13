import React from 'react';
import { AssessmentRecord, CatalogueReference } from '../../../services/contracts/types';
import { Code2, Server, Layers, Cpu } from 'lucide-react';

export interface TechnicalImplementationPanelProps {
  assessment: AssessmentRecord;
  candidate: CatalogueReference | null;
}

export const TechnicalImplementationPanel: React.FC<TechnicalImplementationPanelProps> = ({
  assessment,
  candidate
}) => {
  const isCustomBuild = !candidate && !assessment.matchingFioriApp;
  const cleanTcode = assessment.tcode.toUpperCase();

  const uiTechnology = isCustomBuild
    ? 'SAP Fiori Elements (List Report / Object Page)'
    : candidate?.uiTechnology || assessment.matchingFioriApp?.uiTechnology || (
        assessment.assessmentResult === 'SAP_GUI_HTML' ? 'SAP GUI for HTML' : 'SAPUI5'
      );

  const technicalComponent = candidate?.technicalComponent || (
    (assessment.packageName || '').includes('FBAS') ? 'FIN_AP_OUTPAY / FIN_AR_INPAY' :
    (assessment.packageName || '').includes('GL') ? 'FIN_GL_MD' :
    assessment.packageName || 'CORE'
  );

  const getIcfPath = () => {
    if (isCustomBuild) {
      return `/sap/opu/odata4/sap/z_ui_${cleanTcode.toLowerCase()}_o4/srvd/sap/z_ui_${cleanTcode.toLowerCase()}/0001/`;
    }
    if (uiTechnology === 'SAP GUI for HTML') {
      return '/sap/bc/gui/sap/its/webgui';
    }
    if (candidate?.appId === 'F0773') return '/sap/bc/ui5_ui5/sap/fin_ap_outpay';
    if (candidate?.appId === 'F1345') return '/sap/bc/ui5_ui5/sap/fin_ar_inpay';
    if (candidate?.appId === 'F0984A') return '/sap/bc/ui5_ui5/sap/fin_gl_md';
    if (candidate?.appId === 'F3616') return '/sap/bc/ui5_ui5/sap/fin_curr_exch';
    if (candidate?.appId === 'F0717') return '/sap/bc/ui5_ui5/sap/fin_gl_doc';
    if (candidate?.appId === 'F0842A') return '/sap/bc/ui5_ui5/sap/mm_pur_po';
    return '/sap/bc/ui5_ui5/sap/fiori_default';
  };

  const odataServices = isCustomBuild
    ? [`Z_UI_${cleanTcode}_O4 (OData V4 - Custom RAP)`]
    : candidate?.odataServices || assessment.matchingFioriApp?.odataServices || [];

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
        gap: '16px'
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Code2 size={16} color="var(--fiori-primary, #0A6ED1)" />
          <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: 'var(--fiori-navy, #102A43)' }}>
            Technical Implementation &amp; Deployment Architecture
          </h4>
        </div>
        <span
          style={{
            fontSize: '11px',
            fontWeight: 700,
            padding: '3px 8px',
            borderRadius: '10px',
            backgroundColor: isCustomBuild ? '#F7EDFD' : '#EDF9F0',
            color: isCustomBuild ? '#8C19C5' : '#107E3E',
            border: `1px solid ${isCustomBuild ? '#E3BFFF' : '#BCE6C6'}`
          }}
        >
          {isCustomBuild ? 'CLEAN CORE RAP BUILD' : 'STANDARD FIORI DEPLOYMENT'}
        </span>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '12px'
        }}
      >
        <div style={{ padding: '12px', backgroundColor: 'var(--fiori-surface-subtle, #F8FAFC)', borderRadius: '6px', border: '1px solid var(--fiori-border, #E2E8F0)' }}>
          <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--fiori-text-secondary, #64748B)' }}>UI TECHNOLOGY STACK</div>
          <div style={{ fontSize: '13px', fontWeight: 700, color: isCustomBuild ? '#8C19C5' : '#107E3E', marginTop: '4px' }}>
            {uiTechnology}
          </div>
        </div>

        <div style={{ padding: '12px', backgroundColor: 'var(--fiori-surface-subtle, #F8FAFC)', borderRadius: '6px', border: '1px solid var(--fiori-border, #E2E8F0)' }}>
          <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--fiori-text-secondary, #64748B)' }}>BACKEND MODEL</div>
          <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--fiori-navy, #102A43)', marginTop: '4px' }}>
            {isCustomBuild ? 'RAP Managed (ABAP Cloud)' : 'Standard Gateway / CDS'}
          </div>
        </div>

        <div style={{ padding: '12px', backgroundColor: 'var(--fiori-surface-subtle, #F8FAFC)', borderRadius: '6px', border: '1px solid var(--fiori-border, #E2E8F0)' }}>
          <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--fiori-text-secondary, #64748B)' }}>MAIN PROGRAM (S21 DDIC)</div>
          <div style={{ fontSize: '12.5px', fontWeight: 700, fontFamily: 'var(--font-mono, monospace)', color: 'var(--fiori-navy, #102A43)', marginTop: '4px' }}>
            {assessment.programName || (cleanTcode === 'ST22' ? 'SAPMS380' : 'SAPMF05A')}
          </div>
        </div>

        <div style={{ padding: '12px', backgroundColor: 'var(--fiori-surface-subtle, #F8FAFC)', borderRadius: '6px', border: '1px solid var(--fiori-border, #E2E8F0)' }}>
          <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--fiori-text-secondary, #64748B)' }}>PACKAGE / MODULE</div>
          <div style={{ fontSize: '12px', fontWeight: 600, fontFamily: 'var(--font-mono, monospace)', color: 'var(--fiori-navy, #102A43)', marginTop: '4px' }}>
            {assessment.packageName || (cleanTcode === 'ST22' ? 'SABP' : technicalComponent)}
          </div>
        </div>

        <div style={{ padding: '12px', backgroundColor: 'var(--fiori-surface-subtle, #F8FAFC)', borderRadius: '6px', border: '1px solid var(--fiori-border, #E2E8F0)' }}>
          <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--fiori-text-secondary, #64748B)' }}>ICF SERVICE HANDLER</div>
          <div style={{ fontSize: '11px', fontWeight: 600, fontFamily: 'var(--font-mono, monospace)', color: 'var(--fiori-navy, #102A43)', marginTop: '4px', wordBreak: 'break-all' }}>
            {getIcfPath()}
          </div>
        </div>

        <div style={{ padding: '12px', backgroundColor: 'var(--fiori-surface-subtle, #F8FAFC)', borderRadius: '6px', border: '1px solid var(--fiori-border, #E2E8F0)' }}>
          <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--fiori-text-secondary, #64748B)' }}>SOFTWARE COMPONENT</div>
          <div style={{ fontSize: '12px', fontWeight: 600, fontFamily: 'var(--font-mono, monospace)', color: 'var(--fiori-navy, #102A43)', marginTop: '4px' }}>
            {assessment.softwareComponent || (cleanTcode === 'ST22' ? 'SAP_BASIS' : 'S4CORE 108')}
          </div>
        </div>
      </div>

      {/* Target Modern Deliverables for Custom Build */}
      {isCustomBuild && (
        <div style={{ borderTop: '1px solid #F1F5F9', paddingTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>
            Proposed Clean Core Deliverables (RAP Tier 2)
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '8px', fontSize: '11.5px' }}>
            <div style={{ padding: '8px 12px', backgroundColor: '#F8FAFC', borderRadius: '4px', border: '1px solid #E2E8F0' }}>
              <span style={{ color: '#64748B' }}>Interface View Entity:</span>{' '}
              <strong style={{ fontFamily: 'monospace', color: '#0F172A' }}>Z_I_{cleanTcode}_M</strong>
            </div>
            <div style={{ padding: '8px 12px', backgroundColor: '#F8FAFC', borderRadius: '4px', border: '1px solid #E2E8F0' }}>
              <span style={{ color: '#64748B' }}>Consumption View Entity:</span>{' '}
              <strong style={{ fontFamily: 'monospace', color: '#0F172A' }}>Z_C_{cleanTcode}_M</strong>
            </div>
            <div style={{ padding: '8px 12px', backgroundColor: '#F8FAFC', borderRadius: '4px', border: '1px solid #E2E8F0' }}>
              <span style={{ color: '#64748B' }}>Behavior Definition:</span>{' '}
              <strong style={{ fontFamily: 'monospace', color: '#0F172A' }}>Z_I_{cleanTcode}_M (Managed)</strong>
            </div>
            <div style={{ padding: '8px 12px', backgroundColor: '#F8FAFC', borderRadius: '4px', border: '1px solid #E2E8F0' }}>
              <span style={{ color: '#64748B' }}>Service Definition:</span>{' '}
              <strong style={{ fontFamily: 'monospace', color: '#0F172A' }}>Z_UI_{cleanTcode}_O4</strong>
            </div>
          </div>
        </div>
      )}

      {odataServices.length > 0 && (
        <div style={{ borderTop: '1px solid #F1F5F9', paddingTop: '12px' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', marginBottom: '8px' }}>
            Associated OData Services ({odataServices.length})
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {odataServices.map((srv, idx) => (
              <span
                key={idx}
                style={{
                  padding: '3px 8px',
                  backgroundColor: isCustomBuild ? '#F7EDFD' : '#EFF6FF',
                  border: `1px solid ${isCustomBuild ? '#E3BFFF' : '#BFDBFE'}`,
                  borderRadius: '4px',
                  fontSize: '11px',
                  fontFamily: 'var(--font-mono)',
                  color: isCustomBuild ? '#8C19C5' : '#1E40AF'
                }}
              >
                {srv}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
