import { GeneratedApplicationBlueprint, ApiResponse } from '../../types';
import { localStore } from './localStore';

const delay = (ms = 150) => new Promise(resolve => setTimeout(resolve, ms));

export const generationService = {
  async getBlueprintForAssessment(assessmentId: string): Promise<ApiResponse<GeneratedApplicationBlueprint | null>> {
    await delay();
    const blueprints = localStore.getBlueprints();
    const match = blueprints[assessmentId] || null;
    return { data: match, success: !!match };
  },

  async generateDraftBlueprint(assessmentId: string): Promise<ApiResponse<GeneratedApplicationBlueprint>> {
    await delay(700); // Simulate template rendering and AST compilation
    const blueprints = localStore.getBlueprints();
    const assessments = localStore.getAssessments();
    const assessment = assessments.find(a => a.id === assessmentId);

    const tcode = assessment ? assessment.tcode : 'CUSTOM_APP';
    const cleanTCode = tcode.replace(/[^A-Z0-9]/gi, '_');

    const newBlueprint: GeneratedApplicationBlueprint = {
      projectId: `GEN-${assessmentId}`,
      assessmentId,
      targetReleaseProfile: assessment?.targetRelease || 'SAP S/4HANA 2022 FPS02 (ABAP 7.57)',
      applicationPattern: 'LIST_REPORT_OBJECT_PAGE',
      dataModelProposal: {
        rootEntity: `Z_I_${cleanTCode}Root`,
        compositionEntities: [`Z_I_${cleanTCode}Item`],
        associations: ['I_Customer', 'I_Plant', 'I_Currency'],
        keyFields: ['DocumentNumber', 'CompanyCode']
      },
      serviceProposal: {
        serviceDefinitionName: `ZSD_${cleanTCode.substring(0, 24)}`,
        serviceBindingName: `ZSB_${cleanTCode.substring(0, 24)}_V4`,
        protocol: 'ODATA_V4'
      },
      uiProposal: {
        floorplan: 'SAP Fiori Elements List Report & Object Page (OData V4)',
        listReportFields: ['DocumentNumber', 'CompanyCode', 'Status', 'CreatedAt', 'NetValue'],
        objectPageSections: ['General Information', 'Line Items', 'Process Flow', 'Audit Log'],
        actions: ['ApproveDocument', 'RejectDocument', 'ForwardToReviewer']
      },
      validationStatus: 'PASS',
      generatedTimestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
      artifacts: [
        {
          id: 'ART-01',
          fileName: `Z_I_${cleanTCode}Root.cds`,
          filePath: `abap/cds/Z_I_${cleanTCode}Root.cds`,
          fileType: 'CDS',
          sizeBytes: 1950,
          checksum: 'sha256:d8a9e10283bc8d1a',
          contentSnippet: `@AccessControl.authorizationCheck: #CHECK
@EndUserText.label: '${cleanTCode} Root View Entity'
define root view entity Z_I_${cleanTCode}Root
  as select from ztb_${cleanTCode.toLowerCase()} as Header
  composition [0..*] of Z_I_${cleanTCode}Item as _Items
{
  key Header.doc_num as DocumentNumber,
  key Header.bukrs   as CompanyCode,
      Header.status  as DocumentStatus,
      Header.netwr   as NetValue,
      _Items
}`
        },
        {
          id: 'ART-02',
          fileName: `ZSD_${cleanTCode.substring(0, 24)}.srvd`,
          filePath: `abap/srvd/ZSD_${cleanTCode.substring(0, 24)}.srvd`,
          fileType: 'SRVD',
          sizeBytes: 580,
          checksum: 'sha256:4f1a9b2c8e33d01a',
          contentSnippet: `@EndUserText.label: 'Service Definition for ${cleanTCode}'
define service ZSD_${cleanTCode.substring(0, 24)} {
  expose Z_I_${cleanTCode}Root as MasterEntity;
  expose Z_I_${cleanTCode}Item as ItemEntity;
}`
        },
        {
          id: 'ART-03',
          fileName: 'manifest.json',
          filePath: 'ui5/webapp/manifest.json',
          fileType: 'JSON',
          sizeBytes: 2850,
          checksum: 'sha256:a7b8c9d0e1f23456',
          contentSnippet: `{
  "_version": "1.49.0",
  "sap.app": {
    "id": "zcustom.${cleanTCode.toLowerCase()}.manage",
    "type": "application",
    "title": "{{appTitle}}",
    "description": "Generated Draft Fiori Elements Application",
    "dataSources": {
      "mainService": {
        "uri": "/sap/opu/odata4/sap/zsb_${cleanTCode.toLowerCase()}_v4/srvd/sap/zsd_${cleanTCode.toLowerCase()}/0001/",
        "type": "OData",
        "settings": { "odataVersion": "4.0" }
      }
    }
  }
}`
        }
      ]
    };

    blueprints[assessmentId] = newBlueprint;
    localStore.saveBlueprints(blueprints);

    return {
      data: newBlueprint,
      success: true,
      message: 'Draft application blueprint and sample artifacts compiled successfully (Reviewable Draft).'
    };
  }
};
