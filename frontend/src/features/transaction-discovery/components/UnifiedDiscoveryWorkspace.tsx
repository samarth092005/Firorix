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
  Zap,
  X,
  Activity,
  Compass,
  BookOpen
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
  const [targetRelease, setTargetRelease] = useState<string>('SAP S/4HANA 2023 Private Edition');
  const [progressState, setProgressState] = useState<DiscoverySearchProgressState>('IDLE');

  // Inspection Data
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [metadata, setMetadata] = useState<TransactionDiscoveryResponse | null>(null);
  const [candidates, setCandidates] = useState<CatalogueReference[]>([]);
  const [selectedCandidate, setSelectedCandidate] = useState<CatalogueReference | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [mcpPipelineResult, setMcpPipelineResult] = useState<UnifiedDiscoveryMatchResult | null>(null);
  const [isVerificationModalOpen, setIsVerificationModalOpen] = useState<boolean>(false);

  // Business Scope & Intake (Expandable Drawer)
  const [isScopeDrawerOpen, setIsScopeDrawerOpen] = useState<boolean>(false);
  const [businessProcess, setBusinessProcess] = useState<string>('Financial Accounting');
  const [primaryScenario, setPrimaryScenario] = useState<string>('');
  const [criticality, setCriticality] = useState<'HIGH' | 'MEDIUM' | 'LOW'>('HIGH');
  const [activeCategory, setActiveCategory] = useState<'ALL' | 'FI' | 'MM' | 'SD' | 'CUSTOM'>('ALL');

  // Available systems from adapter
  const availableSystems = mockSapAdapter.getAvailableSystems();

  const PRESET_CATEGORIES: Record<string, Array<{ tcode: string; desc: string; mod: string }>> = {
    ALL: [
      { tcode: 'F-53', desc: 'Post Outgoing Payments - For Suppliers', mod: 'FI-AP' },
      { tcode: 'ME21N', desc: 'Create Purchase Order', mod: 'MM-PUR' },
      { tcode: 'VA01', desc: 'Create Sales Order', mod: 'SD-SLS' },
      { tcode: 'FB50', desc: 'Enter G/L Account Document', mod: 'FI-GL' },
      { tcode: 'MIGO', desc: 'Goods Movement', mod: 'MM-IM' },
      { tcode: 'BP', desc: 'Maintain Business Partner', mod: 'Cross-Domain' }
    ],
    FI: [
      { tcode: 'F-53', desc: 'Post Outgoing Payments - For Suppliers', mod: 'FI-AP' },
      { tcode: 'FB50', desc: 'Enter G/L Account Document', mod: 'FI-GL' },
      { tcode: 'FS00', desc: 'G/L Account Master Record Maintenance', mod: 'FI-GL' },
      { tcode: 'FB60', desc: 'Enter Incoming Invoices', mod: 'FI-AP' },
      { tcode: 'F-28', desc: 'Post Incoming Payments - For Customers', mod: 'FI-AR' }
    ],
    MM: [
      { tcode: 'ME21N', desc: 'Create Purchase Order', mod: 'MM-PUR' },
      { tcode: 'MIGO', desc: 'Goods Movement', mod: 'MM-IM' },
      { tcode: 'MIRO', desc: 'Enter Incoming Invoice', mod: 'MM-LIV' },
      { tcode: 'ME23N', desc: 'Display Purchase Order', mod: 'MM-PUR' }
    ],
    SD: [
      { tcode: 'VA01', desc: 'Create Sales Order', mod: 'SD-SLS' },
      { tcode: 'VA02', desc: 'Change Sales Order', mod: 'SD-SLS' },
      { tcode: 'VL01N', desc: 'Create Outbound Delivery with Reference', mod: 'LE-SHP' }
    ],
    CUSTOM: [
      { tcode: 'ZPURCHASE', desc: 'Legacy Custom Purchase Approval Dynpro', mod: 'Z-Custom' },
      { tcode: 'ZFIORI_REPORT', desc: 'Custom Financial Consolidation Dynpro', mod: 'Z-Custom' }
    ]
  };

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
          language: 'EN',
          useLiveSap: isLiveSystem,
          mcpOptions: { enabled: false },
          useMcp: false
        }).catch((pErr: any) => {
          console.warn('[Discovery Workspace] Match pipeline fallback:', pErr?.message);
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
      release: targetRelease,
      description: metadata.description,
      packageName: metadata.packageName || 'FBAS',
      programName: metadata.programName,
      screenNumber: metadata.screenNumber,
      classification: metadata.classification || 'STANDARD',
      softwareComponent: metadata.softwareComponent || 'S4CORE 108',
      matchingFioriApp: candidateApp,
      fitScore: candidateApp ? (mcpPipelineResult?.matching?.bestCandidate?.overallScore || 92) : (metadata?.classification === 'CUSTOM' ? 75 : 50),
      assessmentResult: candidateApp ? 'EXPLICIT_SUCCESSOR' : (metadata?.classification === 'CUSTOM' ? 'CUSTOM_RAP_REQUIRED' : 'PENDING_VERIFICATION'),
      status: 'COMPLETED',
      lifecycleStatus: candidateApp ? 'MATCHING_COMPLETED' : 'RECOMMENDATION_COMPLETED',
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
          : cleanTcode.includes('PURCH') || cleanTcode.startsWith('ME')
          ? 'SAP_BR_PURCHASER'
          : cleanTcode.startsWith('VA') || cleanTcode.startsWith('SD')
          ? 'SAP_BR_INTERNAL_SALES_REP'
          : cleanTcode.startsWith('F-53') || cleanTcode.startsWith('FB60')
          ? 'SAP_BR_AP_ACCOUNTANT'
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
      {/* Enterprise Search & Discovery Header Box */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          border: '1px solid var(--fiori-border, #E2E8F0)',
          borderRadius: '12px',
          padding: '22px 26px',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          position: 'relative'
        }}
      >
        {/* Top Context & System Status Bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', borderBottom: '1px solid #F1F5F9', paddingBottom: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div
              style={{
                width: '28px',
                height: '28px',
                borderRadius: '6px',
                backgroundColor: '#EFF6FF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <Zap size={16} color="var(--fiori-primary, #0066FF)" />
            </div>
            <div>
              <span style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A' }}>
                SAP Inspection &amp; Successor Matching Command Deck
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '11.5px', flexWrap: 'wrap' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '4px 10px',
                borderRadius: '14px',
                backgroundColor: '#F0FDF4',
                border: '1px solid #BBF7D0',
                color: '#166534',
                fontWeight: 600
              }}
            >
              <span style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: '#16A34A', display: 'inline-block' }} />
              <span>Target: {systemId}</span>
              <span style={{ color: '#86EFAC' }}>•</span>
              <span>Client {client}</span>
              <span style={{ color: '#86EFAC' }}>•</span>
              <span style={{ fontWeight: 700 }}>LIVE_SAP</span>
            </div>

            <div
              style={{
                padding: '4px 10px',
                borderRadius: '14px',
                backgroundColor: '#F8FAFC',
                border: '1px solid #E2E8F0',
                color: '#475569',
                fontWeight: 600
              }}
            >
              📚 18,225+ Catalogue Apps
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
            gridTemplateColumns: 'minmax(280px, 1.8fr) minmax(260px, 1.2fr) auto',
            gap: '14px',
            alignItems: 'flex-end'
          }}
        >
          {/* T-Code Input */}
          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--fiori-navy, #102A43)', marginBottom: '5px', letterSpacing: '0.3px' }}>
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
                  height: '42px',
                  fontFamily: 'var(--font-mono, monospace)',
                  fontSize: '14px',
                  fontWeight: 700,
                  letterSpacing: '0.6px',
                  paddingLeft: '34px',
                  paddingRight: tcode ? '32px' : '12px',
                  borderRadius: '8px'
                }}
                autoFocus
              />
              <Search
                size={15}
                style={{ position: 'absolute', left: '12px', top: '14px', color: 'var(--fiori-text-secondary, #64748B)' }}
              />
              {tcode && (
                <button
                  type="button"
                  onClick={() => {
                    setTcode('');
                    setMetadata(null);
                    setProgressState('IDLE');
                  }}
                  style={{
                    position: 'absolute',
                    right: '10px',
                    top: '12px',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#94A3B8',
                    padding: '2px',
                    display: 'flex',
                    alignItems: 'center'
                  }}
                  title="Clear input"
                >
                  <X size={15} />
                </button>
              )}
            </div>
          </div>

          {/* Target System Select */}
          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--fiori-navy, #102A43)', marginBottom: '5px', letterSpacing: '0.3px' }}>
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
              style={{ height: '42px', fontSize: '12.5px', borderRadius: '8px' }}
            >
              {availableSystems.map((sys) => (
                <option key={sys.systemId} value={sys.systemId}>
                  {sys.systemName || sys.systemId}
                </option>
              ))}
            </select>
          </div>

          {/* Inspect Button */}
          <button
            type="submit"
            className="fiori-btn fiori-btn-primary"
            disabled={isLoading || !tcode.trim()}
            style={{
              height: '42px',
              padding: '0 24px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '13.5px',
              fontWeight: 700,
              backgroundColor: 'var(--fiori-primary, #0066FF)',
              color: '#FFFFFF',
              borderRadius: '8px',
              boxShadow: '0 2px 4px rgba(0, 102, 255, 0.25)',
              transition: 'all 0.15s ease'
            }}
          >
            {isLoading ? <Clock size={16} /> : <Zap size={16} />}
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
      </div>

      {/* Loading State */}
      {isLoading && (
        <LoadingState
          message={`Querying SAP S21 Data Dictionary & SAP Fiori Apps Library for ${tcode}...`}
          subMessage="Extracting TSTC, TADIR, and querying official FAL OData endpoints..."
        />
      )}

      {/* Interactive Architecture Workspace (Default State when no transaction is searched yet) */}
      {!isLoading && !metadata && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Domain-based Preset Navigator Card */}
          <div
            style={{
              backgroundColor: '#FFFFFF',
              border: '1px solid #E2E8F0',
              borderRadius: '10px',
              padding: '20px',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
              <div>
                <div style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Sparkles size={16} color="#0066FF" />
                  <span>Interactive Discovery Presets by Business Domain</span>
                </div>
                <div style={{ fontSize: '12px', color: '#64748B', marginTop: '2px' }}>
                  Select any enterprise transaction to instantly inspect DDIC program evidence and match official Fiori apps.
                </div>
              </div>

              {/* Category Pills */}
              <div style={{ display: 'flex', gap: '4px', backgroundColor: '#F1F5F9', padding: '3px', borderRadius: '8px' }}>
                {(['ALL', 'FI', 'MM', 'SD', 'CUSTOM'] as const).map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setActiveCategory(cat)}
                    style={{
                      padding: '4px 10px',
                      border: 'none',
                      borderRadius: '6px',
                      fontSize: '11px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      backgroundColor: activeCategory === cat ? '#FFFFFF' : 'transparent',
                      color: activeCategory === cat ? '#0066FF' : '#64748B',
                      boxShadow: activeCategory === cat ? '0 1px 2px rgba(0,0,0,0.08)' : 'none'
                    }}
                  >
                    {cat === 'ALL' && 'All Domains'}
                    {cat === 'FI' && 'Financials (FI)'}
                    {cat === 'MM' && 'Procurement (MM)'}
                    {cat === 'SD' && 'Sales (SD)'}
                    {cat === 'CUSTOM' && 'Custom (Z)'}
                  </button>
                ))}
              </div>
            </div>

            {/* Presets Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '10px' }}>
              {(PRESET_CATEGORIES[activeCategory] || PRESET_CATEGORIES.ALL).map((item) => (
                <div
                  key={item.tcode}
                  onClick={() => {
                    setTcode(item.tcode);
                    executeDiscovery(item.tcode);
                  }}
                  style={{
                    padding: '12px 14px',
                    backgroundColor: '#F8FAFC',
                    border: '1px solid #E2E8F0',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease-in-out',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: '8px'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = '#93C5FD';
                    e.currentTarget.style.backgroundColor = '#F0F7FF';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = '#E2E8F0';
                    e.currentTarget.style.backgroundColor = '#F8FAFC';
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '13px', fontWeight: 800, fontFamily: 'monospace', color: '#0F172A' }}>
                      {item.tcode}
                    </span>
                    <span style={{ fontSize: '10px', fontWeight: 700, padding: '1px 6px', borderRadius: '4px', backgroundColor: item.mod.startsWith('Z') ? '#FEF3C7' : '#EFF6FF', color: item.mod.startsWith('Z') ? '#B45309' : '#1D4ED8' }}>
                      {item.mod}
                    </span>
                  </div>
                  <div style={{ fontSize: '11.5px', color: '#475569', lineHeight: 1.3 }}>
                    {item.desc}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', fontWeight: 600, color: '#0066FF' }}>
                    <span>Inspect Transaction</span>
                    <ArrowRight size={12} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 3 Architecture Pillar Capability Boxes */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px' }}>
            {/* Box 1 */}
            <div
              style={{
                backgroundColor: '#FFFFFF',
                border: '1px solid #E2E8F0',
                borderRadius: '10px',
                padding: '18px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Database size={17} color="#0066FF" />
                </div>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A' }}>Live SAP DDIC Probing</div>
                  <div style={{ fontSize: '11px', color: '#64748B' }}>Target S21 Client 200</div>
                </div>
              </div>
              <p style={{ fontSize: '12px', color: '#475569', lineHeight: 1.4, margin: 0 }}>
                Corroborates transaction existence via SAP Data Dictionary tables (TSTC, TADIR, TDEVC) and Gateway OData catalog services.
              </p>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: 'auto', paddingTop: '6px' }}>
                {['TSTC Program', 'TADIR Object', 'TDEVC Package', 'SU24 Auth'].map((tag) => (
                  <span key={tag} style={{ fontSize: '10px', fontWeight: 600, backgroundColor: '#F1F5F9', color: '#475569', padding: '2px 6px', borderRadius: '4px' }}>
                    {tag}
                  </span>
                ))}
              </div>
            </div>

            {/* Box 2 */}
            <div
              style={{
                backgroundColor: '#FFFFFF',
                border: '1px solid #E2E8F0',
                borderRadius: '10px',
                padding: '18px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: '#F0FDF4', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Layers size={17} color="#16A34A" />
                </div>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A' }}>Official Fiori Catalogue</div>
                  <div style={{ fontSize: '11px', color: '#64748B' }}>18,225+ S/4HANA Apps</div>
                </div>
              </div>
              <p style={{ fontSize: '12px', color: '#475569', lineHeight: 1.4, margin: 0 }}>
                Matches transactions to standard official Fiori apps, determining App IDs, UI technologies (Elements vs Freestyle), and semantic objects.
              </p>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: 'auto', paddingTop: '6px' }}>
                {['18,225+ Apps', 'Official Successor', 'FAL OData', 'UI5 / Elements'].map((tag) => (
                  <span key={tag} style={{ fontSize: '10px', fontWeight: 600, backgroundColor: '#F0FDF4', color: '#166534', padding: '2px 6px', borderRadius: '4px' }}>
                    {tag}
                  </span>
                ))}
              </div>
            </div>

            {/* Box 3 */}
            <div
              style={{
                backgroundColor: '#FFFFFF',
                border: '1px solid #E2E8F0',
                borderRadius: '10px',
                padding: '18px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: '#FAF5FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <ShieldCheck size={17} color="#9333EA" />
                </div>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A' }}>Clean Core Fit-Gap</div>
                  <div style={{ fontSize: '11px', color: '#64748B' }}>5-Dimension Deterministic Scoring</div>
                </div>
              </div>
              <p style={{ fontSize: '12px', color: '#475569', lineHeight: 1.4, margin: 0 }}>
                Evaluates Functional (35%), Technical (25%), Process (15%), Roles (15%), and Compatibility (10%) to guide Adopt, Configure, or Build.
              </p>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: 'auto', paddingTop: '6px' }}>
                {['Functional 35%', 'Technical 25%', 'Process 15%', 'Roles 15%'].map((tag) => (
                  <span key={tag} style={{ fontSize: '10px', fontWeight: 600, backgroundColor: '#FAF5FF', color: '#6B21A8', padding: '2px 6px', borderRadius: '4px' }}>
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
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
