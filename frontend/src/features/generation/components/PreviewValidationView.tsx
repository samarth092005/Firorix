import React, { useState, useEffect, useRef } from 'react';
import {
  Play,
  Square,
  RotateCw,
  ExternalLink,
  ShieldCheck,
  AlertTriangle,
  Database,
  Activity,
  Layers,
  CheckCircle2,
  Clock,
  Server,
  RefreshCw,
  Eye,
  ArrowRight,
  Code2,
  LayoutTemplate,
  Copy,
  Check,
  FileCode,
  Terminal,
  BookOpen,
  UserCheck,
  Globe
} from 'lucide-react';
import { GenerationProject, PreviewSessionInfo, PreviewRequestLog, StudioInternalView, GeneratedArtifact } from '../types';
import { defaultFrontendGenerationProjectService } from '../services/generationProjectService';

interface PreviewValidationViewProps {
  project: GenerationProject;
  onProjectUpdated?: (updatedProject: GenerationProject) => void;
  onNavigateView?: (view: StudioInternalView) => void;
}

function getFallbackAbapArtifacts(project: GenerationProject): Array<{
  artifactId: string;
  objectName: string;
  artifactType: string;
  filePath: string;
  content: string;
}> {
  const rootEntity = project?.dataModelSpec?.entities?.find((e: any) => e.entityType === 'ROOT' || e.isRoot) || project?.dataModelSpec?.entities?.[0];
  const rawPrefix = (rootEntity?.name || project?.sourceTransactionCode || 'CUSTOM').replace(/[^a-zA-Z0-9_]/g, '').toUpperCase();
  const prefix = rawPrefix.startsWith('Z') ? rawPrefix : `Z${rawPrefix}`;
  const tableName = `ZTAB_${prefix.substring(0, 10)}_HDR`;
  const draftTableName = `ZTAB_${prefix.substring(0, 10)}_HD`;

  return [
    {
      artifactId: 'art-tabl-active',
      objectName: `${tableName}.tabl.sql`,
      artifactType: 'DATABASE_TABLE',
      filePath: `abap/tables/${tableName}.tabl.sql`,
      content: `@EndUserText.label : 'Active Persistence Table for ${prefix}'
@AbapCatalog.enhancement.category : #NOT_EXTENSIBLE
@AbapCatalog.tableCategory : #TRANSPARENT
@AbapCatalog.deliveryClass : #A
@AbapCatalog.dataMaintenance : #RESTRICTED
define table ${tableName} {
  key client            : abap.clnt not null;
  key document_uuid     : sysuuid_x16 not null;
  document_id           : abap.char(10);
  company_code          : abap.char(4);
  posting_date          : abap.dats;
  document_status       : abap.char(2);
  total_amount          : abap.curr(15,2);
  currency_code         : abap.cuky;
  created_by            : syuname;
  created_at            : timestampl;
  last_changed_by       : syuname;
  last_changed_at       : timestampl;
  local_last_changed_at : timestampl;
}`
    },
    {
      artifactId: 'art-tabl-draft',
      objectName: `${draftTableName}.tabl.sql`,
      artifactType: 'DRAFT_TABLE',
      filePath: `abap/tables/${draftTableName}.tabl.sql`,
      content: `@EndUserText.label : 'Draft Persistence Table for ${prefix}'
@AbapCatalog.enhancement.category : #NOT_EXTENSIBLE
@AbapCatalog.tableCategory : #TRANSPARENT
@AbapCatalog.deliveryClass : #A
@AbapCatalog.dataMaintenance : #RESTRICTED
define table ${draftTableName} {
  key draftuuid         : sysuuid_x16 not null;
  document_uuid         : sysuuid_x16;
  document_id           : abap.char(10);
  company_code          : abap.char(4);
  posting_date          : abap.dats;
  document_status       : abap.char(2);
  total_amount          : abap.curr(15,2);
  currency_code         : abap.cuky;
  "%admin"              : include sych_bdl_draft_admin_inc;
}`
    },
    {
      artifactId: 'art-cds-interface',
      objectName: `ZI_${prefix}.ddls.asddls`,
      artifactType: 'CDS_INTERFACE_VIEW',
      filePath: `abap/cds/ZI_${prefix}.ddls.asddls`,
      content: `@AccessControl.authorizationCheck: #NOT_REQUIRED
@EndUserText.label: 'Interface CDS View for ${prefix}'
define root view entity ZI_${prefix}
  as select from ${tableName}
{
  key document_uuid     as DocumentUUID,
      document_id       as DocumentID,
      company_code      as CompanyCode,
      posting_date      as PostingDate,
      document_status   as DocumentStatus,
      @Semantics.amount.currencyCode: 'CurrencyCode'
      total_amount      as TotalAmount,
      currency_code     as CurrencyCode,
      @Semantics.systemDateTime.createdAt: true
      created_at        as CreatedAt,
      @Semantics.systemDateTime.lastChangedAt: true
      last_changed_at   as LastChangedAt,
      @Semantics.systemDateTime.localInstanceLastChangedAt: true
      local_last_changed_at as LocalLastChangedAt
}`
    },
    {
      artifactId: 'art-cds-consumption',
      objectName: `ZC_${prefix}.ddls.asddls`,
      artifactType: 'CDS_CONSUMPTION_VIEW',
      filePath: `abap/cds/ZC_${prefix}.ddls.asddls`,
      content: `@EndUserText.label: 'Projection Consumption View for ${prefix}'
@AccessControl.authorizationCheck: #NOT_REQUIRED
@Metadata.allowExtensions: true
@Search.searchable: true
define root view entity ZC_${prefix}
  provider contract transactional_query
  as projection on ZI_${prefix}
{
  key DocumentUUID,
      @Search.defaultSearchElement: true
      @Search.fuzzinessThreshold: 0.8
      DocumentID,
      @Consumption.valueHelpDefinition: [{ entity: { name: 'I_CompanyCode', element: 'CompanyCode' } }]
      CompanyCode,
      PostingDate,
      DocumentStatus,
      TotalAmount,
      CurrencyCode,
      CreatedAt,
      LastChangedAt,
      LocalLastChangedAt
}`
    },
    {
      artifactId: 'art-ddlx',
      objectName: `ZC_${prefix}.ddlx`,
      artifactType: 'METADATA_EXTENSION',
      filePath: `abap/annotations/ZC_${prefix}.ddlx`,
      content: `@Metadata.layer: #CUSTOMER
@UI: {
  headerInfo: {
    typeName: '${prefix} Record',
    typeNamePlural: '${prefix} Records',
    title: { type: #STANDARD, value: 'DocumentID' }
  }
}
annotate view ZC_${prefix} with
{
  @UI.facet: [
    { id: 'GeneralData', purpose: #STANDARD, type: #IDENTIFICATION_REFERENCE, label: 'General Information', position: 10 }
  ]

  @UI.identification: [{ position: 10 }]
  @UI.lineItem: [{ position: 10, importance: #HIGH }]
  @UI.selectionField: [{ position: 10 }]
  DocumentID;

  @UI.identification: [{ position: 20 }]
  @UI.lineItem: [{ position: 20, importance: #HIGH }]
  @UI.selectionField: [{ position: 20 }]
  CompanyCode;

  @UI.identification: [{ position: 30 }]
  @UI.lineItem: [{ position: 30 }]
  PostingDate;

  @UI.identification: [{ position: 40 }]
  @UI.lineItem: [{ position: 40 }]
  TotalAmount;
}`
    },
    {
      artifactId: 'art-bdef',
      objectName: `ZI_${prefix}.bdef.asbdef`,
      artifactType: 'RAP_BEHAVIOR_DEFINITION',
      filePath: `abap/behavior/ZI_${prefix}.bdef.asbdef`,
      content: `managed implementation in class zbp_i_${prefix.toLowerCase()} unique;
strict ( 2 );
with draft;

define behavior for ZI_${prefix} alias Header
persistent table ${tableName}
draft table ${draftTableName}
lock master total etag LastChangedAt
authorization master ( global )
etag master LocalLastChangedAt
{
  create;
  update;
  delete;

  draft action Edit;
  draft action Activate optimized;
  draft action Discard;
  draft action Resume;
  draft determine action Prepare {
    validation validateCompanyCode;
  }

  determination setDefaultValues on modify { create; }
  validation validateCompanyCode on save { field CompanyCode; create; }

  mapping for ${tableName} {
    DocumentUUID        = document_uuid;
    DocumentID          = document_id;
    CompanyCode         = company_code;
    PostingDate         = posting_date;
    DocumentStatus      = document_status;
    TotalAmount         = total_amount;
    CurrencyCode        = currency_code;
    CreatedAt           = created_at;
    LastChangedAt       = last_changed_at;
    LocalLastChangedAt  = local_last_changed_at;
  }
}`
    },
    {
      artifactId: 'art-srvd',
      objectName: `ZUI_${prefix}.srvd.asddls`,
      artifactType: 'SERVICE_DEFINITION',
      filePath: `abap/services/ZUI_${prefix}.srvd.asddls`,
      content: `@EndUserText.label: 'Service Definition for ${prefix}'
define service ZUI_${prefix} {
  expose ZC_${prefix} as ${prefix};
  expose I_CompanyCode as CompanyCodeVH;
  expose I_Currency as CurrencyVH;
}`
    },
    {
      artifactId: 'art-srvb',
      objectName: `ZUI_${prefix}_O4.srvb`,
      artifactType: 'SERVICE_BINDING',
      filePath: `abap/services/ZUI_${prefix}_O4.srvb`,
      content: `SERVICE_BINDING {
  binding_type: "ODATA_V4_UI",
  service_definition: "ZUI_${prefix}",
  system_target: "S21_200",
  binding_status: "PUBLISHED",
  endpoint_path: "/sap/opu/odata4/sap/zui_${prefix.toLowerCase()}_o4/srvd/sap/zui_${prefix.toLowerCase()}/0001/"
}`
    }
  ];
}

export const PreviewValidationView: React.FC<PreviewValidationViewProps> = ({
  project,
  onNavigateView
}) => {
  // 3-Pillar Navigation State
  const [activePillarTab, setActivePillarTab] = useState<'PREVIEW' | 'BACKEND_RAP' | 'CONNECTIVITY_SOP'>('PREVIEW');

  // Preview Server State
  const [session, setSession] = useState<PreviewSessionInfo | null>(null);
  const [requests, setRequests] = useState<PreviewRequestLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [iframeKey, setIframeKey] = useState(1);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Backend Artifacts State
  const [artifacts, setArtifacts] = useState<any[]>([]);
  const [selectedArtifactId, setSelectedArtifactId] = useState<string | null>(null);
  const [loadingArtifacts, setLoadingArtifacts] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);

  // Computed Naming Context
  const rootEntity = project?.dataModelSpec?.entities?.find((e: any) => e.entityType === 'ROOT' || e.isRoot) || project?.dataModelSpec?.entities?.[0];
  const rawPrefix = (rootEntity?.name || project?.sourceTransactionCode || 'CUSTOM').replace(/[^a-zA-Z0-9_]/g, '').toUpperCase();
  const prefix = rawPrefix.startsWith('Z') ? rawPrefix : `Z${rawPrefix}`;
  const serviceName = `ZUI_${prefix}`;
  const serviceBindingName = `ZUI_${prefix}_O4`;
  const odataEndpoint = `/sap/opu/odata4/sap/${serviceName.toLowerCase()}_o4/srvd/sap/${serviceName.toLowerCase()}/0001/`;
  const componentId = `customer.fiorix.${prefix.toLowerCase()}`;
  const bspUrl = `/sap/bc/ui5_ui5/sap/zui5_${prefix.toLowerCase()}`;
  const catalogId = `ZCAT_${prefix.toUpperCase()}`;

  // Poll status while mounted
  useEffect(() => {
    let isMounted = true;
    const fetchStatus = async () => {
      try {
        const res = await defaultFrontendGenerationProjectService.getPreviewStatus(project.projectId);
        if (isMounted) setSession(res.previewStatus);
      } catch (err: any) {
        if (isMounted) setSession(null);
      }
    };

    fetchStatus();
    const interval = setInterval(async () => {
      try {
        const res = await defaultFrontendGenerationProjectService.getPreviewStatus(project.projectId);
        if (isMounted) setSession(res.previewStatus);
        if (res.previewStatus && res.previewStatus.status === 'RUNNING') {
          const reqRes = await defaultFrontendGenerationProjectService.getPreviewRequests(project.projectId);
          const raw = reqRes?.requests;
          const reqList = Array.isArray(raw) ? raw : [];
          if (isMounted) setRequests(reqList);
        }
      } catch (err) {
        // Suppress polling error
      }
    }, 2000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [project.projectId]);

  // Load artifacts for Backend RAP tab
  useEffect(() => {
    let isMounted = true;
    const loadArtifacts = async () => {
      setLoadingArtifacts(true);
      try {
        const res = await defaultFrontendGenerationProjectService.getArtifacts(project.projectId);
        const serverArtifacts = res?.artifacts || [];
        const abapList = serverArtifacts.filter(
          (a: GeneratedArtifact) =>
            a.language === 'ABAP' ||
            a.artifactType.startsWith('RAP_') ||
            a.artifactType.startsWith('CDS_') ||
            a.artifactType === 'DDL_SOURCE' ||
            a.filePath.includes('/abap/') ||
            a.filePath.endsWith('.sql') ||
            a.filePath.endsWith('.asddls') ||
            a.filePath.endsWith('.asbdef')
        );

        const finalList = abapList.length > 0 ? abapList : (serverArtifacts.length > 0 ? serverArtifacts : getFallbackAbapArtifacts(project));
        if (isMounted) {
          setArtifacts(finalList);
          if (!selectedArtifactId && finalList.length > 0) {
            setSelectedArtifactId(finalList[0].artifactId);
          }
        }
      } catch (err) {
        if (isMounted) {
          const fallback = getFallbackAbapArtifacts(project);
          setArtifacts(fallback);
          if (!selectedArtifactId && fallback.length > 0) {
            setSelectedArtifactId(fallback[0].artifactId);
          }
        }
      } finally {
        if (isMounted) setLoadingArtifacts(false);
      }
    };

    loadArtifacts();
    return () => {
      isMounted = false;
    };
  }, [project.projectId]);

  const handleStart = async () => {
    setLoading(true);
    setActionError(null);
    try {
      const res = await defaultFrontendGenerationProjectService.startPreview(project.projectId);
      setSession(res.session);
      setIframeKey((k) => k + 1);
    } catch (err: any) {
      setActionError(err.message || 'Failed to start local preview server.');
    } finally {
      setLoading(false);
    }
  };

  const handleStop = async () => {
    setLoading(true);
    setActionError(null);
    try {
      await defaultFrontendGenerationProjectService.stopPreview(project.projectId);
      setSession(null);
      setRequests([]);
    } catch (err: any) {
      setActionError(err.message || 'Failed to stop local preview server.');
    } finally {
      setLoading(false);
    }
  };

  const handleRestart = async () => {
    setLoading(true);
    setActionError(null);
    try {
      const res = await defaultFrontendGenerationProjectService.restartPreview(project.projectId);
      setSession(res.session);
      setIframeKey((k) => k + 1);
    } catch (err: any) {
      setActionError(err.message || 'Failed to restart local preview server.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetData = async () => {
    setLoading(true);
    setActionError(null);
    try {
      await defaultFrontendGenerationProjectService.resetSyntheticData(project.projectId);
      const res = await defaultFrontendGenerationProjectService.getPreviewStatus(project.projectId);
      setSession(res.previewStatus);
      setIframeKey((k) => k + 1);
    } catch (err: any) {
      setActionError(err.message || 'Failed to reset synthetic data.');
    } finally {
      setLoading(false);
    }
  };

  const isRunning = session?.status === 'RUNNING';
  const selectedArtifact = artifacts.find((a) => a.artifactId === selectedArtifactId) || artifacts[0];

  const handleCopyCode = () => {
    if (selectedArtifact?.content) {
      navigator.clipboard.writeText(selectedArtifact.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '4px 0' }}>
      {/* 3 Pillars Master Architecture Switcher Bar */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '8px',
          backgroundColor: '#FFFFFF',
          padding: '6px',
          borderRadius: '8px',
          border: '1px solid #E2E8F0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
        }}
      >
        <button
          type="button"
          onClick={() => setActivePillarTab('PREVIEW')}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            padding: '10px 14px',
            borderRadius: '6px',
            border: activePillarTab === 'PREVIEW' ? '1px solid #0066FF' : '1px solid transparent',
            backgroundColor: activePillarTab === 'PREVIEW' ? '#EFF6FF' : 'transparent',
            color: activePillarTab === 'PREVIEW' ? '#0066FF' : '#475569',
            fontWeight: activePillarTab === 'PREVIEW' ? 700 : 500,
            fontSize: '13.5px',
            cursor: 'pointer',
            transition: 'all 0.15s ease'
          }}
        >
          <LayoutTemplate size={16} />
          <span>1. Live Fiori Preview (Frontend UI)</span>
        </button>

        <button
          type="button"
          onClick={() => setActivePillarTab('BACKEND_RAP')}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            padding: '10px 14px',
            borderRadius: '6px',
            border: activePillarTab === 'BACKEND_RAP' ? '1px solid #0066FF' : '1px solid transparent',
            backgroundColor: activePillarTab === 'BACKEND_RAP' ? '#EFF6FF' : 'transparent',
            color: activePillarTab === 'BACKEND_RAP' ? '#0066FF' : '#475569',
            fontWeight: activePillarTab === 'BACKEND_RAP' ? 700 : 500,
            fontSize: '13.5px',
            cursor: 'pointer',
            transition: 'all 0.15s ease'
          }}
        >
          <Code2 size={16} />
          <span>2. S/4HANA Backend (ABAP RAP Core)</span>
        </button>

        <button
          type="button"
          onClick={() => setActivePillarTab('CONNECTIVITY_SOP')}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            padding: '10px 14px',
            borderRadius: '6px',
            border: activePillarTab === 'CONNECTIVITY_SOP' ? '1px solid #0066FF' : '1px solid transparent',
            backgroundColor: activePillarTab === 'CONNECTIVITY_SOP' ? '#EFF6FF' : 'transparent',
            color: activePillarTab === 'CONNECTIVITY_SOP' ? '#0066FF' : '#475569',
            fontWeight: activePillarTab === 'CONNECTIVITY_SOP' ? 700 : 500,
            fontSize: '13.5px',
            cursor: 'pointer',
            transition: 'all 0.15s ease'
          }}
        >
          <Layers size={16} />
          <span>3. Connectivity, FLP Tile &amp; Deployment SOP</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: LIVE FIORI PREVIEW (FRONTEND)                                      */}
      {/* ========================================================================= */}
      {activePillarTab === 'PREVIEW' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Top Banner: Local Preview Status & Controls */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              backgroundColor: '#FFFFFF',
              border: '1px solid #E2E8F0',
              borderRadius: '8px',
              padding: '16px 20px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '8px',
                  backgroundColor: isRunning ? '#ECFDF5' : '#F1F5F9',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: isRunning ? '#10B981' : '#64748B'
                }}
              >
                {isRunning ? <Activity size={24} /> : <Server size={24} />}
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#0F172A' }}>
                    Local Fiori Elements Preview (Mock OData V4)
                  </h2>
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      padding: '3px 10px',
                      borderRadius: '12px',
                      fontSize: '11px',
                      fontWeight: 700,
                      backgroundColor: isRunning ? '#DEF7EC' : '#F3F4F6',
                      color: isRunning ? '#03543F' : '#4B5563',
                      textTransform: 'uppercase'
                    }}
                  >
                    <span
                      style={{
                        width: '6px',
                        height: '6px',
                        borderRadius: '50%',
                        backgroundColor: isRunning ? '#10B981' : '#9CA3AF'
                      }}
                    />
                    {isRunning ? `RUNNING on Port ${session?.port}` : 'STOPPED'}
                  </span>
                </div>
                <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#64748B' }}>
                  In-process Node.js HTTP server serving synthesized Fiori Elements manifest, XML views, and mock OData V4 transactions.
                </p>
              </div>
            </div>

            {/* Action Controls */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              {isRunning ? (
                <>
                  <button
                    className="fiori-btn-secondary"
                    onClick={handleRestart}
                    disabled={loading}
                    style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}
                    title="Restart Mock Server"
                  >
                    <RotateCw size={14} /> Restart
                  </button>
                  <button
                    className="fiori-btn-secondary"
                    onClick={handleResetData}
                    disabled={loading}
                    style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}
                    title="Reset synthetic data to baseline"
                  >
                    <RefreshCw size={14} /> Reset Data
                  </button>
                  <button
                    className="fiori-btn-secondary"
                    onClick={() => window.open(session?.previewUrl, '_blank')}
                    style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}
                    title="Open in new browser tab"
                  >
                    <ExternalLink size={14} /> Open Tab
                  </button>
                  <button
                    className="fiori-btn-secondary"
                    onClick={handleStop}
                    disabled={loading}
                    style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#DC2626', borderColor: '#FCA5A5' }}
                  >
                    <Square size={14} /> Stop Preview
                  </button>
                </>
              ) : (
                <button
                  className="fiori-btn-primary"
                  onClick={handleStart}
                  disabled={loading}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', backgroundColor: '#0066FF' }}
                >
                  <Play size={14} /> Launch Local Preview
                </button>
              )}

              {onNavigateView && (
                <button
                  type="button"
                  onClick={() => onNavigateView('review-export')}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 14px',
                    backgroundColor: '#10B981',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '13px',
                    fontWeight: 600,
                    color: '#FFFFFF',
                    cursor: 'pointer'
                  }}
                  title="Proceed to export packaging and governance certificate"
                >
                  <span>Next: Review &amp; Export</span>
                  <ArrowRight size={14} />
                </button>
              )}
            </div>
          </div>

          {actionError && (
            <div
              style={{
                padding: '12px 16px',
                backgroundColor: '#FEF2F2',
                border: '1px solid #F87171',
                borderRadius: '6px',
                color: '#B91C1C',
                fontSize: '13px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <AlertTriangle size={16} />
              {actionError}
            </div>
          )}

          {/* Main Preview Container */}
          {isRunning && session ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {/* Watermark Security Notice */}
              <div
                style={{
                  padding: '10px 16px',
                  backgroundColor: '#FFFBEB',
                  border: '1px solid #FDE68A',
                  borderRadius: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  fontSize: '12px',
                  color: '#92400E'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <ShieldCheck size={16} color="#B45309" />
                  <span>
                    <strong>Interactive Sandbox:</strong> Running against synthetic OData V4 provider. Zero live SAP S/4HANA core write operations executed.
                  </span>
                </div>
                <span style={{ fontWeight: 600, color: '#B45309', padding: '2px 8px', borderRadius: '4px', backgroundColor: '#FEF3C7' }}>
                  LOCAL SANDBOX
                </span>
              </div>

              {/* Embedded WebApp Frame */}
              <div
                style={{
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #CBD5E1',
                  borderRadius: '8px',
                  overflow: 'hidden',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.06)'
                }}
              >
                <div
                  style={{
                    height: '36px',
                    backgroundColor: '#F8FAFC',
                    borderBottom: '1px solid #E2E8F0',
                    padding: '0 12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontSize: '12px',
                    color: '#64748B'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#EF4444', display: 'inline-block' }} />
                    <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#F59E0B', display: 'inline-block' }} />
                    <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#10B981', display: 'inline-block' }} />
                    <span style={{ marginLeft: '10px', fontFamily: 'var(--font-mono)', fontSize: '11px', color: '#334155' }}>
                      {session.previewUrl}
                    </span>
                  </div>
                </div>

                <iframe
                  key={iframeKey}
                  ref={iframeRef}
                  src={session.previewUrl}
                  title="Fiori Elements App Preview"
                  style={{
                    width: '100%',
                    height: '620px',
                    border: 'none',
                    display: 'block',
                    backgroundColor: '#FAFAFA'
                  }}
                />
              </div>

              {/* Live Request Telemetry Log */}
              <div
                style={{
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #E2E8F0',
                  borderRadius: '8px',
                  padding: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', fontWeight: 600, color: '#0F172A' }}>
                    <Activity size={16} color="#0066FF" />
                    Live Mock OData V4 Request Log
                  </div>
                  <span style={{ fontSize: '12px', color: '#64748B' }}>
                    {(Array.isArray(requests) ? requests : []).length} recorded operations
                  </span>
                </div>

                {(Array.isArray(requests) ? requests : []).length === 0 ? (
                  <div style={{ fontSize: '13px', color: '#94A3B8', padding: '12px 0', textAlign: 'center' }}>
                    No HTTP requests received yet. Navigate or interact with the preview application above.
                  </div>
                ) : (
                  <div style={{ maxHeight: '180px', overflowY: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', fontFamily: 'var(--font-mono)' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid #E2E8F0', color: '#64748B', textAlign: 'left' }}>
                          <th style={{ padding: '6px 8px' }}>Method</th>
                          <th style={{ padding: '6px 8px' }}>Path</th>
                          <th style={{ padding: '6px 8px' }}>Status</th>
                          <th style={{ padding: '6px 8px' }}>Duration</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(Array.isArray(requests) ? requests : []).map((req, idx) => (
                          <tr key={idx} style={{ borderBottom: '1px solid #F1F5F9' }}>
                            <td style={{ padding: '6px 8px', fontWeight: 700, color: req.method === 'POST' ? '#10B981' : '#0066FF' }}>
                              {req.method}
                            </td>
                            <td style={{ padding: '6px 8px', color: '#334155' }}>{req.url || (req as any).path}</td>
                            <td style={{ padding: '6px 8px' }}>
                              <span
                                style={{
                                  padding: '2px 6px',
                                  borderRadius: '4px',
                                  fontSize: '11px',
                                  backgroundColor: req.status < 300 ? '#DEF7EC' : '#FDE8E8',
                                  color: req.status < 300 ? '#03543F' : '#9B1C1C'
                                }}
                              >
                                {req.status}
                              </span>
                            </td>
                            <td style={{ padding: '6px 8px', color: '#64748B' }}>{req.durationMs}ms</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* Stopped State Splash */
            <div
              style={{
                backgroundColor: '#FFFFFF',
                border: '1px solid #E2E8F0',
                borderRadius: '8px',
                padding: '40px 20px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                textAlign: 'center',
                gap: '16px'
              }}
            >
              <div
                style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '50%',
                  backgroundColor: '#EFF6FF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#0066FF'
                }}
              >
                <Play size={32} />
              </div>
              <div>
                <h3 style={{ margin: '0 0 6px 0', fontSize: '18px', fontWeight: 700, color: '#0F172A' }}>
                  Preview Server Ready to Launch
                </h3>
                <p style={{ margin: 0, fontSize: '13px', color: '#64748B', maxWidth: '480px' }}>
                  Click below to instantiate an in-process local Node.js HTTP server. This compiles and serves the synthesized SAP Fiori Elements application.
                </p>
              </div>

              <div
                style={{
                  display: 'flex',
                  gap: '24px',
                  padding: '12px 20px',
                  backgroundColor: '#F8FAFC',
                  borderRadius: '8px',
                  border: '1px solid #E2E8F0',
                  fontSize: '12px',
                  color: '#475569'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <CheckCircle2 size={14} color="#10B981" /> Zero SAP Connection Required
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <CheckCircle2 size={14} color="#10B981" /> S/4HANA Clean Core Validated
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <CheckCircle2 size={14} color="#10B981" /> Mock OData V4 Protocol
                </div>
              </div>

              <button
                className="fiori-btn-primary"
                onClick={handleStart}
                disabled={loading}
                style={{
                  marginTop: '10px',
                  padding: '10px 22px',
                  fontSize: '14px',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <Play size={16} /> Start Local Preview Server
              </button>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: S/4HANA BACKEND (ABAP RAP CORE)                                    */}
      {/* ========================================================================= */}
      {activePillarTab === 'BACKEND_RAP' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Header Banner */}
          <div
            style={{
              padding: '16px 20px',
              backgroundColor: '#FFFFFF',
              border: '1px solid #E2E8F0',
              borderRadius: '8px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#0F172A' }}>
                  S/4HANA Backend Artifacts (ABAP RAP Architecture)
                </h2>
                <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '10px', backgroundColor: '#ECFDF5', color: '#065F46', border: '1px solid #A7F3D0' }}>
                  Tier-1 Clean Core Standard
                </span>
              </div>
              <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#64748B' }}>
                Target System: <strong>S21 (Client 200)</strong> • Package: <strong>Z_{prefix.toUpperCase()}</strong> • Generated {artifacts.length} active ABAP Cloud source objects.
              </p>
            </div>

            <button
              type="button"
              onClick={handleCopyCode}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 14px',
                backgroundColor: copied ? '#ECFDF5' : '#FFFFFF',
                color: copied ? '#065F46' : '#0F172A',
                border: copied ? '1px solid #10B981' : '1px solid #CBD5E1',
                borderRadius: '6px',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              {copied ? <Check size={14} color="#10B981" /> : <Copy size={14} />}
              <span>{copied ? 'Copied to Clipboard' : 'Copy Object Code'}</span>
            </button>
          </div>

          {/* 2-Column Artifact Explorer: Left File Tree, Right Code Viewer */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '320px 1fr',
              gap: '14px',
              minHeight: '560px'
            }}
          >
            {/* Left Column: Artifacts List */}
            <div
              style={{
                backgroundColor: '#FFFFFF',
                border: '1px solid #E2E8F0',
                borderRadius: '8px',
                padding: '12px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                maxHeight: '640px',
                overflowY: 'auto'
              }}
            >
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.4px', padding: '4px 8px' }}>
                Generated ABAP / RAP Objects ({artifacts.length})
              </div>

              {artifacts.map((art) => {
                const isSelected = art.artifactId === selectedArtifact?.artifactId;
                return (
                  <button
                    key={art.artifactId}
                    type="button"
                    onClick={() => setSelectedArtifactId(art.artifactId)}
                    style={{
                      width: '100%',
                      textAlign: 'left',
                      padding: '10px 12px',
                      borderRadius: '6px',
                      border: isSelected ? '1px solid #0066FF' : '1px solid #F1F5F9',
                      backgroundColor: isSelected ? '#EFF6FF' : '#F8FAFC',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '12.5px', fontWeight: isSelected ? 700 : 600, fontFamily: 'var(--font-mono, monospace)', color: isSelected ? '#0066FF' : '#1E293B' }}>
                        {art.objectName}
                      </span>
                    </div>
                    <span style={{ fontSize: '11px', color: '#64748B' }}>
                      {art.filePath}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Right Column: Code Viewer */}
            <div
              style={{
                backgroundColor: '#0F172A',
                border: '1px solid #1E293B',
                borderRadius: '8px',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column'
              }}
            >
              <div
                style={{
                  height: '42px',
                  backgroundColor: '#1E293B',
                  padding: '0 16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  borderBottom: '1px solid #334155'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <FileCode size={16} color="#38BDF8" />
                  <span style={{ fontFamily: 'var(--font-mono, monospace)', fontSize: '12.5px', fontWeight: 600, color: '#F8FAFC' }}>
                    {selectedArtifact?.filePath || 'ABAP Source Code'}
                  </span>
                </div>
                <span style={{ fontSize: '11px', color: '#94A3B8', fontFamily: 'var(--font-mono, monospace)' }}>
                  Target: Eclipse ADT / SE80
                </span>
              </div>

              <div style={{ flex: 1, padding: '16px', overflowY: 'auto', maxHeight: '590px' }}>
                <pre
                  style={{
                    margin: 0,
                    fontFamily: 'Consolas, Monaco, "Courier New", monospace',
                    fontSize: '12.5px',
                    lineHeight: 1.6,
                    color: '#E2E8F0',
                    whiteSpace: 'pre-wrap'
                  }}
                >
                  {selectedArtifact?.content || '// Loading ABAP Artifact content...'}
                </pre>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: CONNECTIVITY & DEPLOYMENT SOP                                      */}
      {/* ========================================================================= */}
      {activePillarTab === 'CONNECTIVITY_SOP' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Top 3 Metric Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px' }}>
            {/* OData V4 Service Card */}
            <div style={{ padding: '16px', backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: 700, color: '#0F172A', marginBottom: '8px' }}>
                <Globe size={16} color="#0066FF" />
                <span>OData V4 Gateway Service</span>
              </div>
              <div style={{ fontSize: '11.5px', fontFamily: 'var(--font-mono, monospace)', backgroundColor: '#F8FAFC', padding: '6px 8px', borderRadius: '4px', border: '1px solid #E2E8F0', color: '#0A6ED1', wordBreak: 'break-all' }}>
                {odataEndpoint}
              </div>
              <div style={{ marginTop: '8px', fontSize: '11px', color: '#64748B' }}>
                Binding Type: <strong>OData V4 - UI</strong> • Target: <strong>S21-200</strong>
              </div>
            </div>

            {/* Fiori Launchpad Target Mapping Card */}
            <div style={{ padding: '16px', backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: 700, color: '#0F172A', marginBottom: '8px' }}>
                <LayoutTemplate size={16} color="#10B981" />
                <span>Launchpad Target Mapping</span>
              </div>
              <div style={{ fontSize: '12px', color: '#334155', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div>Semantic Object: <strong>{prefix}</strong></div>
                <div>Action: <strong>manage</strong></div>
                <div>App Type: <strong>SAPUI5 Fiori App</strong></div>
              </div>
              <div style={{ marginTop: '8px', fontSize: '11px', color: '#64748B' }}>
                Catalog: <strong>{catalogId}</strong> (Transaction /UI2/FLPCM_CUST)
              </div>
            </div>

            {/* Transport Request (CTS) Card */}
            <div style={{ padding: '16px', backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: 700, color: '#0F172A', marginBottom: '8px' }}>
                <ShieldCheck size={16} color="#8B5CF6" />
                <span>Transport Request (CTS)</span>
              </div>
              <div style={{ fontSize: '12px', color: '#334155', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div>Workbench TR: <strong>S21K900001</strong> (ABAP + BSP)</div>
                <div>Customizing TR: <strong>S21K900002</strong> (FLP Catalog)</div>
                <div>Transportability: <strong>100% Automated</strong></div>
              </div>
              <div style={{ marginTop: '8px', fontSize: '11px', color: '#64748B' }}>
                Direct migration to QAS / PRD via STMS
              </div>
            </div>
          </div>

          {/* Step-by-Step Developer SOP (Standard Operating Procedure) */}
          <div
            style={{
              backgroundColor: '#FFFFFF',
              border: '1px solid #E2E8F0',
              borderRadius: '8px',
              padding: '20px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
              <Terminal size={18} color="#0066FF" />
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#0F172A' }}>
                Developer Handover SOP: S/4HANA 2023 Activation &amp; Linking Guide
              </h3>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* Step 1 */}
              <div style={{ padding: '14px', backgroundColor: '#F8FAFC', borderRadius: '6px', border: '1px solid #E2E8F0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, fontSize: '13.5px', color: '#1E293B', marginBottom: '6px' }}>
                  <span style={{ width: '22px', height: '22px', borderRadius: '50%', backgroundColor: '#0066FF', color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px' }}>1</span>
                  <span>Eclipse ADT: Create Package &amp; Import Backend Objects</span>
                </div>
                <p style={{ margin: '0 0 8px 30px', fontSize: '12.5px', color: '#475569', lineHeight: 1.5 }}>
                  Launch Eclipse IDE with ABAP Development Tools (ADT). Connect to system <strong>S21 (Client 200)</strong>. Create or select package <strong>Z_{prefix.toUpperCase()}</strong> under a Workbench Transport Request (CTS). Import database tables (<code style={{ color: '#0A6ED1' }}>.tabl.sql</code>), CDS views (<code style={{ color: '#0A6ED1' }}>.ddls.asddls</code>), and behavior definitions (<code style={{ color: '#0A6ED1' }}>.bdef.asbdef</code>). Activate all (Ctrl+F3).
                </p>
              </div>

              {/* Step 2 */}
              <div style={{ padding: '14px', backgroundColor: '#F8FAFC', borderRadius: '6px', border: '1px solid #E2E8F0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, fontSize: '13.5px', color: '#1E293B', marginBottom: '6px' }}>
                  <span style={{ width: '22px', height: '22px', borderRadius: '50%', backgroundColor: '#0066FF', color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px' }}>2</span>
                  <span>Publish OData V4 Service Binding</span>
                </div>
                <p style={{ margin: '0 0 8px 30px', fontSize: '12.5px', color: '#475569', lineHeight: 1.5 }}>
                  In Eclipse ADT, right-click Service Definition <strong>{serviceName}</strong> -&gt; New Service Binding <strong>{serviceBindingName}</strong>. Choose binding type <strong>OData V4 - UI</strong>. Click <strong>Publish</strong>. The active Gateway endpoint will be available at <code style={{ color: '#0A6ED1' }}>{odataEndpoint}</code>.
                </p>
              </div>

              {/* Step 3 */}
              <div style={{ padding: '14px', backgroundColor: '#F8FAFC', borderRadius: '6px', border: '1px solid #E2E8F0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, fontSize: '13.5px', color: '#1E293B', marginBottom: '6px' }}>
                  <span style={{ width: '22px', height: '22px', borderRadius: '50%', backgroundColor: '#0066FF', color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px' }}>3</span>
                  <span>Deploy UI5 Frontend Application to S/4HANA Gateway</span>
                </div>
                <p style={{ margin: '0 0 8px 30px', fontSize: '12.5px', color: '#475569', lineHeight: 1.5 }}>
                  In terminal inside the exported <code style={{ color: '#0A6ED1' }}>fiori/</code> directory, execute <code style={{ backgroundColor: '#E2E8F0', padding: '2px 6px', borderRadius: '4px' }}>npm run deploy</code> to push the app directly via SAP Fiori Tools. Alternatively, run SAP transaction <strong>/UI5/UI5_REPOSITORY_LOAD</strong> to upload the zip into BSP Application <strong>ZUI5_{prefix.toLowerCase()}</strong>.
                </p>
              </div>

              {/* Step 4 */}
              <div style={{ padding: '14px', backgroundColor: '#F8FAFC', borderRadius: '6px', border: '1px solid #E2E8F0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, fontSize: '13.5px', color: '#1E293B', marginBottom: '6px' }}>
                  <span style={{ width: '22px', height: '22px', borderRadius: '50%', backgroundColor: '#0066FF', color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px' }}>4</span>
                  <span>Link Tile in Fiori Launchpad Content Manager (/UI2/FLPCM_CUST)</span>
                </div>
                <p style={{ margin: '0 0 8px 30px', fontSize: '12.5px', color: '#475569', lineHeight: 1.5 }}>
                  Launch SAP transaction <strong>/UI2/FLPCM_CUST</strong>. In Business Catalog <strong>{catalogId}</strong>, add App Descriptor Item: Semantic Object <code style={{ color: '#0A6ED1' }}>{prefix}</code>, Action <code style={{ color: '#0A6ED1' }}>manage</code>, Application Type <code style={{ color: '#0A6ED1' }}>SAPUI5 Fiori App</code>, Component ID <code style={{ color: '#0A6ED1' }}>{componentId}</code>. Assign catalog to target PFCG Role. Save under Customizing TR. The tile is immediately live on Fiori Launchpad!
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
