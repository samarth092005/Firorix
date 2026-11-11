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
  const uiTechnology = candidate?.uiTechnology || assessment.matchingFioriApp?.uiTechnology || (
    assessment.assessmentResult === 'SAP_GUI_HTML' ? 'SAP GUI for HTML' : 'SAP GUI'
  );

  const technicalComponent = candidate?.technicalComponent || (
    (assessment.packageName || '').includes('FBAS') ? 'FIN_AP_OUTPAY / FIN_AR_INPAY' :
    (assessment.packageName || '').includes('GL') ? 'FIN_GL_MD' :
    assessment.packageName || 'CORE'
  );

  const getIcfPath = () => {
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

  const odataServices = candidate?.odataServices || assessment.matchingFioriApp?.odataServices || [];

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
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <Code2 size={16} color="var(--fiori-primary, #0A6ED1)" />
        <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: 'var(--fiori-navy, #102A43)' }}>
          Technical Implementation &amp; Deployment Architecture
        </h4>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '12px'
        }}
      >
        <div style={{ padding: '12px', backgroundColor: 'var(--fiori-surface-subtle, #F8FAFC)', borderRadius: '4px', border: '1px solid var(--fiori-border, #E2E8F0)' }}>
          <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--fiori-text-secondary, #64748B)' }}>UI TECHNOLOGY STACK</div>
          <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--fiori-navy, #102A43)', marginTop: '4px' }}>{uiTechnology}</div>
        </div>

        <div style={{ padding: '12px', backgroundColor: 'var(--fiori-surface-subtle, #F8FAFC)', borderRadius: '4px', border: '1px solid var(--fiori-border, #E2E8F0)' }}>
          <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--fiori-text-secondary, #64748B)' }}>ICF SERVICE HANDLER</div>
          <div style={{ fontSize: '12px', fontWeight: 600, fontFamily: 'var(--font-mono)', color: 'var(--fiori-navy, #102A43)', marginTop: '4px' }}>{getIcfPath()}</div>
        </div>

        <div style={{ padding: '12px', backgroundColor: 'var(--fiori-surface-subtle, #F8FAFC)', borderRadius: '4px', border: '1px solid var(--fiori-border, #E2E8F0)' }}>
          <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--fiori-text-secondary, #64748B)' }}>TECHNICAL COMPONENT</div>
          <div style={{ fontSize: '12px', fontWeight: 600, fontFamily: 'var(--font-mono)', color: 'var(--fiori-navy, #102A43)', marginTop: '4px' }}>{technicalComponent}</div>
        </div>

        <div style={{ padding: '12px', backgroundColor: 'var(--fiori-surface-subtle, #F8FAFC)', borderRadius: '4px', border: '1px solid var(--fiori-border, #E2E8F0)' }}>
          <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--fiori-text-secondary, #64748B)' }}>SOFTWARE COMPONENT</div>
          <div style={{ fontSize: '12px', fontWeight: 600, fontFamily: 'var(--font-mono)', color: 'var(--fiori-navy, #102A43)', marginTop: '4px' }}>{assessment.softwareComponent || 'S4CORE 108'}</div>
        </div>
      </div>

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
                  backgroundColor: '#EFF6FF',
                  border: '1px solid #BFDBFE',
                  borderRadius: '4px',
                  fontSize: '11px',
                  fontFamily: 'var(--font-mono)',
                  color: '#1E40AF'
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
