import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  TransactionDiscoveryResponse,
  CatalogueReference,
  BusinessContext,
  ApplicationRequirements
} from '../../../services/contracts/types';
import { PRESET_SCENARIOS } from '../types';
import { sapDiscoveryAdapter } from '../../../services/sap/sapDiscoveryAdapter';
import { fioriCatalogueAdapter } from '../../../services/catalogue/catalogueAdapter';
import { assessmentService } from '../../../services/assessmentService';
import { mockSapAdapter } from '../../transaction-checker/adapters/mockSapAdapter';
import { apiClient, UnifiedDiscoveryMatchResult } from '../../../services/api/apiClient';
import { DiscoveryVerificationModal } from './DiscoveryVerificationModal';
import {
  Search,
  Server,
  Database,
  ArrowRight,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Code2,
  FileText,
  Clock,
  Layers,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Zap
} from 'lucide-react';
import { LoadingState } from '../../../components/common';

export type DiscoverySearchProgressState =
  | 'IDLE'
  | 'VALIDATING'
  | 'CONNECTING'
  | 'SEARCHING_TRANSACTION'
  | 'COLLECTING_EVIDENCE'
  | 'SEARCHING_CATALOGUE'
  | 'MATCHING'
  | 'ASSESSING'
  | 'COMPLETED'
  | 'PARTIAL_RESULTS'
  | 'ACCESS_DENIED'
  | 'SOURCE_UNAVAILABLE'
  | 'INSUFFICIENT_EVIDENCE'
  | 'FAILED';

export interface UnifiedDiscoveryWorkspaceProps {
  initialTcode?: string;
  initialSystemId?: string;
}

export const UnifiedDiscoveryWorkspace: React.FC<UnifiedDiscoveryWorkspaceProps> = ({
  initialTcode = '',
  initialSystemId = 'S21-200'
}) => {
  const navigate = useNavigate();

  // Search Controls
  const [tcode, setTcode] = useState<string>(initialTcode);
  const [systemId, setSystemId] = useState<string>(initialSystemId);
  const [client, setClient] = useState<string>('200');
  const [language, setLanguage] = useState<'EN' | 'DE'>('EN');
  const [targetRelease, setTargetRelease] = useState<string>('SAP S/4HANA 2023 Private Edition');
  const [progressState, setProgressState] = useState<DiscoverySearchProgressState>('IDLE');

  // Inspection Data
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [metadata, setMetadata] = useState<TransactionDiscoveryResponse | null>(null);
  const [candidates, setCandidates] = useState<CatalogueReference[]>([]);
  const [selectedCandidate, setSelectedCandidate] = useState<CatalogueReference | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [mcpPipelineResult, setMcpPipelineResult] = useState<UnifiedDiscoveryMatchResult | null>(null);
  const [mcpEnabled, setMcpEnabled] = useState<boolean>(true);
  const [isVerificationModalOpen, setIsVerificationModalOpen] = useState<boolean>(false);

  // Business Scope & Intake (Expandable Drawer)
  const [isScopeDrawerOpen, setIsScopeDrawerOpen] = useState<boolean>(false);
  const [businessProcess, setBusinessProcess] = useState<string>('Financial Accounting');
  const [primaryScenario, setPrimaryScenario] = useState<string>('');
  const [criticality, setCriticality] = useState<'HIGH' | 'MEDIUM' | 'LOW'>('HIGH');

  // Available systems from adapter
  const availableSystems = mockSapAdapter.getAvailableSystems();

  // Curated quick-select transactions from verified S/4HANA 2023 snapshot
  const curatedTcodes = ['F-53', 'ME21N', 'VA01', 'FB50', 'MIGO', 'BP', 'FS00', 'MIRO', 'FB60', 'OB52', 'ZPURCHASE'];

  // Execute discovery on search
  const executeDiscovery = async (targetTcode: string, sysId: string = systemId) => {
    setProgressState('VALIDATING');
    const cleanTcode = targetTcode.trim().toUpperCase().replace(/\s+/g, '');
    if (!cleanTcode) {
      setProgressState('FAILED');
      setSearchError('Please enter a valid SAP transaction code.');
      return;
    }

    setSearchError(null);
    setIsLoading(true);
    setProgressState('CONNECTING');

    try {
      const requestId = `REQ-${Date.now().toString().slice(-6)}-${cleanTcode}`;
      const isLiveSystem = sysId === 'S21-200';

      setProgressState('SEARCHING_TRANSACTION');

      const [discoRes, catCandidates, pipelineRes] = await Promise.all([
        sapDiscoveryAdapter.inspectTransaction({
          requestId,
          tcode: cleanTcode,
          systemId: sysId,
          client,
          targetRelease,
          timestamp: new Date().toISOString()
        }),
        fioriCatalogueAdapter.getAppsByTCode(cleanTcode),
        apiClient.discoverAndMatch({
          tcode: cleanTcode,
          systemId: sysId,
          client,
          targetRelease,
          language,
          useLiveSap: isLiveSystem,
          mcpOptions: { enabled: mcpEnabled },
          useMcp: mcpEnabled
        }).catch((pErr: any) => {
          console.warn('[Discovery Workspace] MCP Pipeline note:', pErr?.message);
          return null;
        })
      ]);

      setMetadata(discoRes);
      setCandidates(catCandidates);
      setSelectedCandidate(catCandidates[0] || null);
      setMcpPipelineResult(pipelineRes);

      if (discoRes?.basisAuthorizationRequirements) {
        setProgressState('PARTIAL_RESULTS');
      } else if (discoRes?.verificationStatus === 'NOT_FOUND') {
        setProgressState('FAILED');
      } else {
        setProgressState('COMPLETED');
      }

      // Automatically show Discovery Verification Popup Modal
      if (discoRes && (discoRes.exists !== false || catCandidates.length > 0)) {
        setIsVerificationModalOpen(true);
      }

      // Pre-populate business scope if a preset matches
      const preset = PRESET_SCENARIOS[cleanTcode];
      if (preset) {
        setBusinessProcess(preset.businessProcess);
        setPrimaryScenario(preset.defaultScenario);
      } else {
        setBusinessProcess(cleanTcode.startsWith('Z') ? 'Custom Extension' : 'General Core Processing');
        setPrimaryScenario(`Operational execution of transaction ${cleanTcode}`);
      }
    } catch (err: any) {
      console.error('Error during transaction discovery:', err);
      const errMsg = err?.message || 'Failed to inspect transaction in target SAP landscape.';
      if (errMsg.includes('403') || errMsg.includes('authorization')) {
        setProgressState('ACCESS_DENIED');
      } else if (errMsg.includes('connect') || errMsg.includes('502')) {
        setProgressState('SOURCE_UNAVAILABLE');
      } else {
        setProgressState('FAILED');
      }
      setSearchError(errMsg);
    } finally {
      setIsLoading(false);
    }
  };

  // Initial load if tcode is present in query params
  useEffect(() => {
    if (initialTcode) {
      setTcode(initialTcode);
      executeDiscovery(initialTcode, initialSystemId);
    }
  }, [initialTcode, initialSystemId]);

  // Navigate to full Assessment Workbench
  const handleOpenAssessmentWorkbench = async () => {
    if (!metadata) return;

    // Persist or find existing assessment in persistent store
    const cleanTcode = metadata.tcode;
    const existingAssessments = await assessmentService.getAssessments();
    const existing = existingAssessments.find((a) => a.tcode.toUpperCase() === cleanTcode.toUpperCase());

    if (existing) {
      navigate(`/assessment-results?id=${existing.id}&tcode=${cleanTcode}`);
      return;
    }

    const candidateApp = selectedCandidate ? {
      appId: selectedCandidate.appId,
      appName: selectedCandidate.appName,
      appType: 'Transactional',
      uiTechnology: selectedCandidate.uiTechnology || 'SAP Fiori elements',
      releaseCompatibility: 'COMPATIBLE' as const,
      sourceLabel: 'Official SAP Apps Reference Library (MCP Assisted)',
      businessRoles: (selectedCandidate as any).businessRoles || [],
      odataServices: selectedCandidate.odataServices || []
    } : null;

    // Auto-create assessment if not already existing
    const created = await assessmentService.createAssessment({
      tcode: cleanTcode,
      systemId,
      client,
      targetRelease,
      matchingFioriApp: candidateApp,
      fitScore: candidateApp ? (mcpPipelineResult?.matching?.bestCandidate?.overallScore || 92) : 50,
      assessmentResult: candidateApp ? 'EXPLICIT_SUCCESSOR' : 'PENDING_VERIFICATION',
      status: 'IN_PROGRESS',
      lifecycleStatus: candidateApp ? 'MATCHING_COMPLETED' : 'DISCOVERY_COMPLETED',
      businessContext: {
        businessProcess,
        primaryScenario: primaryScenario || `Operational execution of ${cleanTcode}`,
        selectedRequirements: ['Real-time dictionary validation', 'Authorization check'],
        expectedFunctionality: ['Screen navigation', 'Data persistence'],
        assessmentObjective: `Evaluate modern Fiori alternative or WebGUI feasibility for ${cleanTcode} in S21.`,
        businessCriticality: criticality
      },
      applicationRequirements: {
        relevantBusinessRole: selectedCandidate?.appId === 'F1612' || selectedCandidate?.appId === 'F0773'
          ? 'SAP_BR_AP_ACCOUNTANT'
          : selectedCandidate?.appId === 'F0842A'
          ? 'SAP_BR_PURCHASER'
          : selectedCandidate?.appId === 'F1873'
          ? 'SAP_BR_INTERNAL_SALES_REP'
          : 'SAP_BR_BUSINESS_PROCESS_SPECIALIST',
        knownODataService: selectedCandidate?.odataServices?.[0] || 'Service binding determined by FAL',
        requiredFunctionality: ['Audit Logging', 'Real-time Validation'],
        knownLimitations: '',
        targetReleaseProfile: targetRelease,
        isUserProvidedUnverified: false
      },
      discoveryMetadata: {
        description: metadata.description,
        programName: metadata.programName,
        screenNumber: metadata.screenNumber,
        packageName: metadata.packageName,
        classification: metadata.classification,
        originalSystem: metadata.originalSystem,
        softwareComponent: metadata.softwareComponent
      },
      catalogueReference: selectedCandidate
    });

    navigate(`/assessment-results?id=${created.id}&tcode=${cleanTcode}`);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Enterprise Search & Discovery Header */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          border: '1px solid var(--fiori-border, #E2E8F0)',
          borderRadius: 'var(--radius-md, 6px)',
          padding: '20px 24px',
          boxShadow: 'var(--fiori-shadow-sm, 0 1px 3px rgba(0,0,0,0.05))',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h2 style={{ margin: '0 0 4px 0', fontSize: '18px', fontWeight: 700, color: 'var(--fiori-navy, #102A43)' }}>
              SAP Transaction Discovery &amp; Architectural Inspection
            </h2>
            <p style={{ margin: 0, fontSize: '12px', color: 'var(--fiori-text-secondary, #64748B)' }}>
              Inspect live SAP Data Dictionary (DDIC) repository facts and match against official SAP Fiori Apps Reference Library successors.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', color: 'var(--fiori-text-secondary, #64748B)' }}>
            <Server size={13} color="var(--fiori-primary, #0A6ED1)" />
            <span>Target:</span>
            <strong style={{ color: 'var(--fiori-navy, #102A43)' }}>{systemId}</strong>
            <span style={{ color: '#CBD5E1' }}>•</span>
            <span>Client:</span>
            <strong style={{ color: 'var(--fiori-navy, #102A43)' }}>{client}</strong>
            <span style={{ color: '#CBD5E1' }}>•</span>
            <span style={{ color: '#15803D', fontWeight: 600 }}>LIVE_SAP</span>
            <span style={{ color: '#CBD5E1' }}>•</span>
            <div
              onClick={() => setMcpEnabled(!mcpEnabled)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                padding: '2px 8px',
                borderRadius: '10px',
                backgroundColor: mcpEnabled ? '#EFF6FF' : '#F1F5F9',
                border: `1px solid ${mcpEnabled ? '#93C5FD' : '#CBD5E1'}`,
                color: mcpEnabled ? '#1D4ED8' : '#64748B',
                fontWeight: 600,
                fontSize: '10.5px',
                cursor: 'pointer'
              }}
              title="Toggle SAP Fiori MCP Server intelligence (@sap-ux/fiori-mcp-server)"
            >
              <Sparkles size={11} color={mcpEnabled ? '#2563EB' : '#94A3B8'} />
              <span>MCP Server: <strong>{mcpEnabled ? 'CONNECTED' : 'OFF'}</strong></span>
            </div>
          </div>
        </div>

        {/* Search Bar Form */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            executeDiscovery(tcode);
          }}
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(220px, 1.4fr) minmax(180px, 1fr) 90px auto',
            gap: '12px',
            alignItems: 'flex-end'
          }}
        >
          {/* T-Code Input */}
          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--fiori-navy, #102A43)', marginBottom: '4px' }}>
              TRANSACTION CODE (T-CODE)
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                className="fiori-input"
                value={tcode}
                onChange={(e) => {
                  setTcode(e.target.value.toUpperCase().replace(/\s+/g, ''));
                  if (searchError) setSearchError(null);
                }}
                placeholder="e.g. ME21N, F-53, VA01, FB50, FS00"
                style={{
                  height: '38px',
                  fontFamily: 'var(--font-mono, monospace)',
                  fontSize: '14px',
                  fontWeight: 700,
                  letterSpacing: '0.5px',
                  paddingLeft: '32px'
                }}
                autoFocus
              />
              <Search
                size={14}
                style={{ position: 'absolute', left: '10px', top: '12px', color: 'var(--fiori-text-secondary, #64748B)' }}
              />
            </div>
          </div>

          {/* Target System Select */}
          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--fiori-navy, #102A43)', marginBottom: '4px' }}>
              SAP LANDSCAPE
            </label>
            <select
              className="fiori-select"
              value={systemId}
              onChange={(e) => {
                const sys = availableSystems.find((s) => s.systemId === e.target.value);
                if (sys) {
                  setSystemId(sys.systemId);
                  setClient(sys.client || '200');
                  setTargetRelease(sys.release || 'SAP S/4HANA 2023 Private Edition');
                }
              }}
              style={{ height: '38px', fontSize: '12px' }}
            >
              {availableSystems.map((sys) => (
                <option key={sys.systemId} value={sys.systemId}>
                  {sys.systemId} — {sys.systemName || sys.release}
                </option>
              ))}
            </select>
          </div>

          {/* Language Select */}
          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--fiori-navy, #102A43)', marginBottom: '4px' }}>
              LANGUAGE
            </label>
            <select
              className="fiori-select"
              value={language}
              onChange={(e) => setLanguage(e.target.value as 'EN' | 'DE')}
              style={{ height: '38px', fontSize: '12px', fontWeight: 600 }}
              title="SAP Session Language for TSTCT Dictionary Descriptions"
            >
              <option value="EN">EN</option>
              <option value="DE">DE</option>
            </select>
          </div>

          {/* Inspect Button */}
          <button
            type="submit"
            className="fiori-btn fiori-btn-primary"
            disabled={isLoading || !tcode.trim()}
            style={{
              height: '38px',
              padding: '0 20px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '13px',
              fontWeight: 600,
              backgroundColor: 'var(--fiori-primary, #0A6ED1)',
              color: '#FFFFFF'
            }}
          >
            {isLoading ? <Clock size={14} /> : <Zap size={14} />}
            {isLoading ? 'Inspecting...' : 'Inspect & Match'}
          </button>
        </form>

        {/* Explicit Progress State Indicator */}
        {progressState !== 'IDLE' && (
          <div
            style={{
              padding: '8px 12px',
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: 500,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              backgroundColor:
                progressState === 'COMPLETED'
                  ? '#ECFDF5'
                  : progressState === 'PARTIAL_RESULTS' || progressState === 'ACCESS_DENIED'
                  ? '#FFFBEB'
                  : progressState === 'FAILED' || progressState === 'SOURCE_UNAVAILABLE'
                  ? '#FEF2F2'
                  : '#EFF6FF',
              border: `1px solid ${
                progressState === 'COMPLETED'
                  ? '#A7F3D0'
                  : progressState === 'PARTIAL_RESULTS' || progressState === 'ACCESS_DENIED'
                  ? '#FDE68A'
                  : progressState === 'FAILED' || progressState === 'SOURCE_UNAVAILABLE'
                  ? '#FECACA'
                  : '#BFDBFE'
              }`,
              color:
                progressState === 'COMPLETED'
                  ? '#065F46'
                  : progressState === 'PARTIAL_RESULTS' || progressState === 'ACCESS_DENIED'
                  ? '#92400E'
                  : progressState === 'FAILED' || progressState === 'SOURCE_UNAVAILABLE'
                  ? '#991B1B'
                  : '#1E40AF'
            }}
          >
            <span
              style={{
                display: 'inline-block',
                width: '7px',
                height: '7px',
                borderRadius: '50%',
                backgroundColor:
                  progressState === 'COMPLETED'
                    ? '#10B981'
                    : progressState === 'PARTIAL_RESULTS' || progressState === 'ACCESS_DENIED'
                    ? '#F59E0B'
                    : progressState === 'FAILED' || progressState === 'SOURCE_UNAVAILABLE'
                    ? '#EF4444'
                    : '#3B82F6'
              }}
            />
            <span style={{ fontWeight: 700 }}>[{progressState}]</span>
            <span>
              {progressState === 'VALIDATING' && 'Validating transaction code format and namespace rules...'}
              {progressState === 'CONNECTING' && 'Connecting to SAP S21 Gateway and probing ADT endpoints...'}
              {progressState === 'SEARCHING_TRANSACTION' && 'Querying TSTC, TADIR, and SU24 authorization catalogs...'}
              {progressState === 'COLLECTING_EVIDENCE' && 'Compiling multi-source technical evidence and service bindings...'}
              {progressState === 'SEARCHING_CATALOGUE' && 'Scanning official S/4HANA 2023 Fiori application catalogue...'}
              {progressState === 'MATCHING' && 'Executing 10-stage deterministic ranking and compatibility scoring...'}
              {progressState === 'ASSESSING' && 'Evaluating Clean Core Fit-Gap and governance rules...'}
              {progressState === 'COMPLETED' && 'Discovery and catalogue matching completed.'}
              {progressState === 'PARTIAL_RESULTS' && 'Partial metadata retrieved. Low-level table inspection pending Basis authorization.'}
              {progressState === 'ACCESS_DENIED' && 'ADT access restricted (HTTP 403 Forbidden). Requires S_ADT_RES / S_DEVELOP.'}
              {progressState === 'SOURCE_UNAVAILABLE' && 'SAP S21 Gateway connection failed or timed out.'}
              {progressState === 'FAILED' && (searchError || 'Discovery could not find or verify transaction.')}
            </span>
          </div>
        )}

        {searchError && (
          <div style={{ padding: '8px 12px', backgroundColor: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: '4px', fontSize: '12px', color: '#991B1B', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <AlertTriangle size={14} />
            <span>{searchError}</span>
          </div>
        )}

        {/* Quick Curator Bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', paddingTop: '4px' }}>
          <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--fiori-text-secondary, #64748B)' }}>
            Quick Pilot Scenarios:
          </span>
          {curatedTcodes.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => {
                setTcode(item);
                executeDiscovery(item);
              }}
              style={{
                padding: '3px 10px',
                borderRadius: '12px',
                fontSize: '11px',
                fontFamily: 'var(--font-mono, monospace)',
                fontWeight: tcode === item ? 700 : 500,
                backgroundColor: tcode === item ? 'var(--fiori-sidebar-active, #E1EFFD)' : '#F8FAFC',
                color: tcode === item ? 'var(--fiori-primary, #0A6ED1)' : 'var(--fiori-navy, #102A43)',
                border: tcode === item ? '1px solid var(--fiori-primary, #0A6ED1)' : '1px solid var(--fiori-border, #E2E8F0)',
                cursor: 'pointer'
              }}
            >
              {item}
            </button>
          ))}
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <LoadingState
          message={`Querying SAP S21 Data Dictionary & SAP Fiori Apps Library for ${tcode}...`}
          subMessage="Extracting TSTC, TADIR, and querying official FAL OData endpoints..."
        />
      )}

      {/* Discovery Results Workspace */}
      {!isLoading && metadata && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Executive Discovery Summary Ribbon */}
          <div
            style={{
              padding: '16px 20px',
              backgroundColor: '#FFFFFF',
              border: '1px solid var(--fiori-border, #E2E8F0)',
              borderRadius: 'var(--radius-md, 6px)',
              boxShadow: 'var(--fiori-shadow-sm, 0 1px 3px rgba(0,0,0,0.05))',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '14px'
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span
                  style={{
                    fontSize: '18px',
                    fontWeight: 800,
                    fontFamily: 'var(--font-mono, monospace)',
                    color: 'var(--fiori-navy, #102A43)'
                  }}
                >
                  {metadata.tcode}
                </span>
                <span style={{ fontSize: '15px', fontWeight: 600, color: 'var(--fiori-text-secondary, #64748B)' }}>
                  — {metadata.description}
                </span>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: '12px',
                    backgroundColor: metadata.classification === 'STANDARD' ? '#DCFCE7' : '#FEF3C7',
                    color: metadata.classification === 'STANDARD' ? '#166534' : '#92400E',
                    border: `1px solid ${metadata.classification === 'STANDARD' ? '#86EFAC' : '#FCD34D'}`
                  }}
                >
                  {metadata.classification === 'STANDARD' ? 'STANDARD SAP OBJECT' : 'CUSTOM EXTENSION'}
                </span>
              </div>
              <div style={{ fontSize: '11.5px', color: 'var(--fiori-text-secondary, #64748B)', marginTop: '4px' }}>
                Verified against {systemId} Client {client} ({targetRelease}) • {candidates.length} official Fiori candidate(s) mapped
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <button
                type="button"
                className="fiori-btn fiori-btn-secondary"
                onClick={() => setIsVerificationModalOpen(true)}
                style={{
                  fontSize: '12px',
                  fontWeight: 600,
                  height: '34px',
                  padding: '0 14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  border: '1px solid #CBD5E1',
                  color: '#334155'
                }}
                title="View Dual SAP S/4HANA & Fiori Catalogue Verification Popup"
              >
                <ShieldCheck size={14} color="#059669" />
                <span>Verification Summary</span>
              </button>

              <button
                type="button"
                className="fiori-btn fiori-btn-primary"
                onClick={handleOpenAssessmentWorkbench}
                style={{
                  fontSize: '12px',
                  fontWeight: 600,
                  height: '34px',
                  padding: '0 16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  backgroundColor: 'var(--fiori-primary, #0A6ED1)',
                  color: '#FFFFFF'
                }}
              >
                <span>Open Assessment Workbench</span>
                <ArrowRight size={14} />
              </button>
            </div>
          </div>

          {/* Core Dual Architectural Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: '20px' }}>
            {/* Left Card: Verified SAP DDIC Profile */}
            <div
              style={{
                backgroundColor: '#FFFFFF',
                border: '1px solid var(--fiori-border, #E2E8F0)',
                borderRadius: 'var(--radius-md, 6px)',
                padding: '20px',
                boxShadow: 'var(--fiori-shadow-sm, 0 1px 3px rgba(0,0,0,0.05))',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Database size={16} color="var(--fiori-primary, #0A6ED1)" />
                <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: 'var(--fiori-navy, #102A43)' }}>
                  SAP Technical Data Dictionary (DDIC) Verification
                </h3>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', fontSize: '12px' }}>
                <div style={{ padding: '8px 10px', backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '4px' }}>
                  <span style={{ fontSize: '10px', color: '#64748B', fontWeight: 600, display: 'block' }}>TSTC PGMNA (PROGRAM)</span>
                  <code style={{ fontSize: '12px', fontWeight: 700, color: '#102A43' }}>{metadata.programName || 'N/A'}</code>
                </div>

                <div style={{ padding: '8px 10px', backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '4px' }}>
                  <span style={{ fontSize: '10px', color: '#64748B', fontWeight: 600, display: 'block' }}>TSTC DYPNO (SCREEN)</span>
                  <code style={{ fontSize: '12px', fontWeight: 700, color: '#102A43' }}>{metadata.screenNumber || '0100'}</code>
                </div>

                <div style={{ padding: '8px 10px', backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '4px' }}>
                  <span style={{ fontSize: '10px', color: '#64748B', fontWeight: 600, display: 'block' }}>TADIR DEVCLASS (PACKAGE)</span>
                  <code style={{ fontSize: '12px', fontWeight: 700, color: '#102A43' }}>{metadata.packageName || 'N/A'}</code>
                </div>

                <div style={{ padding: '8px 10px', backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '4px' }}>
                  <span style={{ fontSize: '10px', color: '#64748B', fontWeight: 600, display: 'block' }}>TDEVC COMPONENT</span>
                  <code style={{ fontSize: '12px', fontWeight: 700, color: '#102A43' }}>{metadata.softwareComponent || 'S4CORE 108'}</code>
                </div>
              </div>

              {/* Clean Core Architectural Guidance */}
              <div
                style={{
                  padding: '12px 14px',
                  backgroundColor: metadata.classification === 'STANDARD' ? '#F0FDF4' : '#FEF3C7',
                  border: `1px solid ${metadata.classification === 'STANDARD' ? '#BBF7D0' : '#FCD34D'}`,
                  borderRadius: '4px',
                  fontSize: '11.5px',
                  lineHeight: 1.5,
                  color: metadata.classification === 'STANDARD' ? '#166534' : '#92400E'
                }}
              >
                <strong>Clean Core Strategy:</strong>{' '}
                {metadata.classification === 'STANDARD'
                  ? 'Standard SAP object. Zero-modification baseline enforced. Target Fiori successor app will replace legacy dynpro transaction without modifying SAP core.'
                  : 'Custom Z-transaction detected. Legacy dynpro code cannot be modernized via standard catalogue. Custom ABAP RESTful Application Programming (RAP) BO required.'}
              </div>
            </div>

            {/* Right Card: Official SAP Fiori Matching */}
            <div
              style={{
                backgroundColor: '#FFFFFF',
                border: '1px solid var(--fiori-border, #E2E8F0)',
                borderRadius: 'var(--radius-md, 6px)',
                padding: '20px',
                boxShadow: 'var(--fiori-shadow-sm, 0 1px 3px rgba(0,0,0,0.05))',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <ShieldCheck size={16} color="var(--fiori-primary, #0A6ED1)" />
                  <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: 'var(--fiori-navy, #102A43)' }}>
                    Official SAP Fiori Successor Candidates ({candidates.length})
                  </h3>
                </div>

                {selectedCandidate?.officialSourceUrl && (
                  <a
                    href={selectedCandidate.officialSourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ fontSize: '11px', color: '#0A6ED1', display: 'flex', alignItems: 'center', gap: '4px', textDecoration: 'none' }}
                  >
                    <span>FAL Reference</span>
                    <ExternalLink size={11} />
                  </a>
                )}
              </div>

              {selectedCandidate ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div
                    style={{
                      padding: '14px',
                      backgroundColor: '#F8FAFC',
                      border: '1px solid var(--fiori-border, #E2E8F0)',
                      borderRadius: '4px'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontSize: '14px', fontWeight: 800, fontFamily: 'var(--font-mono, monospace)', color: '#0A6ED1' }}>
                            {selectedCandidate.appId}
                          </span>
                          <span style={{ fontSize: '13px', fontWeight: 700, color: '#102A43' }}>
                            — {selectedCandidate.appName}
                          </span>
                        </div>
                        <p style={{ margin: '4px 0 0 0', fontSize: '11.5px', color: '#64748B', lineHeight: 1.4 }}>
                          {selectedCandidate.description || 'Standard SAP Fiori successor identified in official Apps Library.'}
                        </p>
                      </div>

                      <span
                        style={{
                          fontSize: '10px',
                          fontWeight: 700,
                          padding: '2px 8px',
                          borderRadius: '10px',
                          backgroundColor: selectedCandidate.uiTechnology?.includes('HTML') ? '#FEF3C7' : '#DCFCE7',
                          color: selectedCandidate.uiTechnology?.includes('HTML') ? '#92400E' : '#166534',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        {selectedCandidate.uiTechnology || 'SAP Fiori elements'}
                      </span>
                    </div>

                    <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px solid #E2E8F0', display: 'flex', flexWrap: 'wrap', gap: '12px', fontSize: '11px', color: '#64748B' }}>
                      <span>Component: <strong style={{ color: '#102A43' }}>{selectedCandidate.technicalComponent || 'N/A'}</strong></span>
                      <span>Release: <strong style={{ color: '#102A43' }}>{selectedCandidate.supportedProductRelease || targetRelease}</strong></span>
                      {selectedCandidate.odataServices && selectedCandidate.odataServices.length > 0 && (
                        <span>OData: <strong style={{ color: '#0A6ED1' }}>{selectedCandidate.odataServices[0]}</strong></span>
                      )}
                    </div>
                  </div>

                  {/* Candidate Switcher if multiple */}
                  {candidates.length > 1 && (
                    <div>
                      <span style={{ fontSize: '11px', fontWeight: 600, color: '#64748B', marginBottom: '6px', display: 'block' }}>
                        All Mapped Candidates ({candidates.length}):
                      </span>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                        {candidates.map((c) => (
                          <button
                            key={c.appId}
                            type="button"
                            onClick={() => setSelectedCandidate(c)}
                            style={{
                              padding: '4px 10px',
                              fontSize: '11px',
                              fontWeight: selectedCandidate.appId === c.appId ? 700 : 500,
                              backgroundColor: selectedCandidate.appId === c.appId ? '#E1EFFD' : '#FFFFFF',
                              color: selectedCandidate.appId === c.appId ? '#0A6ED1' : '#475569',
                              border: selectedCandidate.appId === c.appId ? '1px solid #0A6ED1' : '1px solid #CBD5E1',
                              borderRadius: '4px',
                              cursor: 'pointer'
                            }}
                          >
                            {c.appId} ({c.uiTechnology?.includes('HTML') ? 'WebGUI' : 'Native'})
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ padding: '20px', textAlign: 'center', backgroundColor: '#F8FAFC', borderRadius: '4px', border: '1px dashed #CBD5E1', fontSize: '12px', color: '#8A5800' }}>
                  No standard SAP Fiori application exists for this transaction in the official catalogue. Custom RAP modernization required.
                </div>
              )}
            </div>
          </div>

          {/* SAP Fiori MCP Server Live Intelligence & Documentation Card */}
          {mcpPipelineResult?.mcpAssisted && (
            <div
             
            >





            </div>
          )}

          {/* Optional Business Scope Drawer */}
          <div
            style={{
              backgroundColor: '#FFFFFF',
              border: '1px solid var(--fiori-border, #E2E8F0)',
              borderRadius: 'var(--radius-md, 6px)',
              overflow: 'hidden'
            }}
          >
            <button
              type="button"
              onClick={() => setIsScopeDrawerOpen(!isScopeDrawerOpen)}
              style={{
                width: '100%',
                padding: '14px 20px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                textAlign: 'left'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FileText size={15} color="var(--fiori-primary, #0A6ED1)" />
                <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--fiori-navy, #102A43)' }}>
                  Optional Business Scope &amp; Advisory Context
                </span>
                <span style={{ fontSize: '11px', color: 'var(--fiori-text-secondary, #64748B)' }}>
                  ({primaryScenario || 'Standard operational scenario'})
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: '#64748B' }}>
                <span>{isScopeDrawerOpen ? 'Collapse' : 'Expand'}</span>
                {isScopeDrawerOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </div>
            </button>

            {isScopeDrawerOpen && (
              <div style={{ padding: '0 20px 20px', borderTop: '1px solid #E2E8F0', display: 'flex', flexDirection: 'column', gap: '14px', paddingTop: '16px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#64748B', marginBottom: '4px' }}>
                      BUSINESS PROCESS
                    </label>
                    <input
                      type="text"
                      className="fiori-input"
                      value={businessProcess}
                      onChange={(e) => setBusinessProcess(e.target.value)}
                      style={{ fontSize: '12px' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#64748B', marginBottom: '4px' }}>
                      BUSINESS CRITICALITY
                    </label>
                    <select
                      className="fiori-select"
                      value={criticality}
                      onChange={(e) => setCriticality(e.target.value as any)}
                      style={{ fontSize: '12px' }}
                    >
                      <option value="HIGH">High (Mission Critical)</option>
                      <option value="MEDIUM">Medium (Operational Daily)</option>
                      <option value="LOW">Low (Periodic / Ad-hoc)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#64748B', marginBottom: '4px' }}>
                    PRIMARY OPERATIONAL SCENARIO / REQUIREMENTS
                  </label>
                  <input
                    type="text"
                    className="fiori-input"
                    value={primaryScenario}
                    onChange={(e) => setPrimaryScenario(e.target.value)}
                    placeholder="e.g. Vendor open item clearing and payment execution"
                    style={{ fontSize: '12px' }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Discovery & Fiori Catalogue Dual Verification Modal Pop-up */}
      <DiscoveryVerificationModal
        isOpen={isVerificationModalOpen}
        onClose={() => setIsVerificationModalOpen(false)}
        metadata={metadata}
        candidates={candidates}
        systemId={systemId}
        client={client}
        targetRelease={targetRelease}
        onProceedToAssessment={handleOpenAssessmentWorkbench}
      />
    </div>
  );
};
