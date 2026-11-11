import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  SearchPanel
} from './components/SearchPanel';
import {
  TransactionVerificationCard
} from './components/TransactionVerificationCard';
import {
  FioriCandidatesList
} from './components/FioriCandidatesList';
import {
  TechnicalDetailsAccordion
} from './components/TechnicalDetailsAccordion';
import {
  DecisionExplanation
} from './components/DecisionExplanation';
import {
  SearchHistoryBar
} from './components/SearchHistoryBar';
import {
  mockSapAdapter
} from './adapters/mockSapAdapter';
import {
  transactionSearchService
} from './services/transactionSearchService';
import {
  TCodeSearchResponse,
  SearchStatusCode
} from './types';
import { apiClient, UnifiedDiscoveryMatchResult } from '../../services/api/apiClient';
import { CandidateComparisonMatrix } from './components/CandidateComparisonMatrix';
import { TechnicalEvidencePanel } from './components/TechnicalEvidencePanel';
import {
  SearchCode,
  ShieldAlert,
  WifiOff,
  Lock,
  AlertTriangle,
  Clock,
  Layers,
  CheckCircle2,
  HelpCircle
} from 'lucide-react';
import { MessageStrip } from '../../components/status/MessageStrip';

export const TransactionCheckerPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const systems = mockSapAdapter.getAvailableSystems();
  const [selectedSystemId, setSelectedSystemId] = useState<string>(systems[0]?.systemId || 'S4H-DEV-200');
  const [searchResult, setSearchResult] = useState<TCodeSearchResponse | null>(null);
  const [pipelineResult, setPipelineResult] = useState<UnifiedDiscoveryMatchResult | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [lastSearchedTcode, setLastSearchedTcode] = useState<string>('');
  const [historyCounter, setHistoryCounter] = useState<number>(0);
  const [useMcp, setUseMcp] = useState<boolean>(true);

  useEffect(() => {
    const tcodeParam = searchParams.get('tcode');
    const systemParam = searchParams.get('systemId');
    if (systemParam && systems.some((s) => s.systemId === systemParam)) {
      setSelectedSystemId(systemParam);
    }
    if (tcodeParam) {
      handleSearch(tcodeParam, systemParam || undefined);
    }
  }, [searchParams]);

  const handleSearch = async (tcode: string, systemOverride?: string) => {
    const targetSystem = systemOverride || selectedSystemId;
    const isLive = targetSystem === 'S21-200';
    setIsLoading(true);
    setLastSearchedTcode(tcode);

    try {
      const [searchResp, pipelineResp] = await Promise.allSettled([
        transactionSearchService.search({
          systemId: targetSystem,
          tcode,
          language: 'EN'
        }),
        apiClient.discoverAndMatch({
          tcode,
          systemId: targetSystem,
          useLiveSap: isLive,
          mcpOptions: { enabled: useMcp }
        })
      ]);

      if (searchResp.status === 'fulfilled') {
        setSearchResult(searchResp.value);
      }
      if (pipelineResp.status === 'fulfilled') {
        setPipelineResult(pipelineResp.value);
      } else {
        setPipelineResult(null);
      }
      setHistoryCounter((c) => c + 1);
    } catch (err) {
      // Safe fallback - should never throw unhandled
      console.error('Unexpected search error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClear = () => {
    setSearchResult(null);
    setPipelineResult(null);
    setLastSearchedTcode('');
  };

  const handleSelectHistory = (tcode: string, systemId: string) => {
    setSelectedSystemId(systemId);
    handleSearch(tcode, systemId);
  };

  const getStatusBadgeVariant = (status: SearchStatusCode) => {
    switch (status) {
      case 'MATCH_FOUND':
      case 'EXPLICIT_SUCCESSOR':
      case 'SAP_GUI_HTML':
      case 'FUNCTIONAL_ALTERNATIVE':
        return 'success';
      case 'CATALOGUE_PENDING_VERIFICATION':
      case 'NO_VERIFIED_MATCH':
      case 'METADATA_INCOMPLETE':
        return 'warning';
      case 'CONNECTION_ERROR':
      case 'ACCESS_DENIED':
      case 'SYSTEM_NOT_CONFIGURED':
        return 'error';
      case 'NO_STANDARD_APP_EXISTS':
      case 'NOT_FOUND':
      case 'INVALID_INPUT':
      default:
        return 'neutral';
    }
  };

  const activeSystem = systems.find((s) => s.systemId === selectedSystemId);
  const isLiveActiveSystem = activeSystem?.mode === 'LIVE_SAP';

  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '24px 20px 48px' }}>
      {/* Page Title & Context Header */}
      <div style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h1 className="fiori-page-title" style={{ margin: 0 }}>
                Transaction Checker
              </h1>
              <span
                style={{
                  display: 'inline-block',
                  backgroundColor: isLiveActiveSystem ? 'rgba(0, 128, 128, 0.15)' : 'rgba(233, 115, 12, 0.15)',
                  border: `1px solid ${isLiveActiveSystem ? '#008080' : '#E9730C'}`,
                  color: isLiveActiveSystem ? '#005f5f' : '#C05C06',
                  fontSize: '11px',
                  fontWeight: 700,
                  padding: '2px 8px',
                  borderRadius: 'var(--radius-xs)',
                  letterSpacing: '0.4px'
                }}
              >
                {isLiveActiveSystem ? 'LIVE SAP TARGET (S21-200)' : 'PHASE 1 LOCAL DEMO'}
              </span>
            </div>
            <p className="fiori-page-subtitle" style={{ marginTop: '4px' }}>
              SAP S/4HANA Transaction Code Validation & Standard Fiori Application Discovery
            </p>
          </div>
        </div>
      </div>

      {/* Search Input Panel */}
      <SearchPanel
        systems={systems}
        selectedSystemId={selectedSystemId}
        onSystemChange={setSelectedSystemId}
        onSearch={handleSearch}
        onClear={handleClear}
        isLoading={isLoading}
        currentTcode={lastSearchedTcode}
        useMcp={useMcp}
        onMcpChange={setUseMcp}
      />

      {/* Recent Searches Bar */}
      <SearchHistoryBar
        onSelectSearch={handleSelectHistory}
        refreshTrigger={historyCounter}
      />

      {/* Empty State before search */}
      {!searchResult && !isLoading && (
        <div
          className="fiori-card"
          style={{
            padding: '56px 24px',
            textAlign: 'center',
            backgroundColor: 'var(--fiori-surface)',
            border: '1px dashed var(--fiori-border)'
          }}
        >
          <SearchCode size={42} color="var(--fiori-teal)" style={{ margin: '0 auto 16px', opacity: 0.8 }} />
          <h2 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--fiori-text-primary)', marginBottom: '8px' }}>
            Ready to Verify SAP Transactions
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--fiori-text-secondary)', maxWidth: '540px', margin: '0 auto 20px', lineHeight: 1.5 }}>
            Select a synthetic SAP system and enter a transaction code (or click any preset scenario above) to evaluate mock DDIC existence, classification, and discover verified Fiori app candidates.
          </p>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 14px',
              backgroundColor: 'var(--fiori-bg)',
              borderRadius: 'var(--radius-xs)',
              fontSize: '11px',
              color: 'var(--fiori-text-muted)'
            }}
          >
            <span>Preset examples:</span>
            <strong style={{ color: 'var(--fiori-text-primary)' }}>ME21N</strong> (Standard Match),
            <strong style={{ color: 'var(--fiori-text-primary)' }}>ZPURCHASE</strong> (Related Match),
            <strong style={{ color: 'var(--fiori-text-primary)' }}>ZCONNERR</strong> (Fault Simulation)
          </div>
        </div>
      )}

      {/* Active Search Results Presentation */}
      {searchResult && (
        <div>
          {/* Result Status Summary Banner */}
          <div
            className="fiori-card"
            style={{
              marginBottom: '20px',
              backgroundColor: 'var(--fiori-surface)',
              border: '1px solid var(--fiori-border)',
              padding: '12px 18px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '12px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>

                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', fontWeight: 600, color: 'var(--fiori-text-primary)' }}>
                  {searchResult.requestId}
                </span>
              </div>
              <span style={{ color: 'var(--fiori-border)' }}>|</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--fiori-text-muted)', textTransform: 'uppercase' }}>
                  System:
                </span>
                <span style={{ fontSize: '12px', fontWeight: 500, color: 'var(--fiori-text-primary)' }}>
                  {searchResult.system.systemId} (Client {searchResult.system.client})
                </span>
              </div>
              <span style={{ color: 'var(--fiori-border)' }}>|</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--fiori-text-muted)', textTransform: 'uppercase' }}>
                  Release:
                </span>
                <span style={{ fontSize: '12px', color: 'var(--fiori-text-secondary)' }}>
                  {searchResult.system.release}
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              {pipelineResult?.recommendationReadiness && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--fiori-text-secondary)', textTransform: 'uppercase' }}>
                    Readiness:
                  </span>
                  <span
                    className="fiori-badge"
                    style={{
                      fontSize: '11px',
                      padding: '3px 8px',
                      fontWeight: 700,
                      backgroundColor: pipelineResult.recommendationReadiness === 'SUFFICIENT_EVIDENCE_FOR_ASSESSMENT' ? '#E8F5E9' : (pipelineResult.recommendationReadiness === 'PARTIAL_EVIDENCE_REQUIRES_REVIEW' ? '#FFF8E1' : '#F5F5F5'),
                      color: pipelineResult.recommendationReadiness === 'SUFFICIENT_EVIDENCE_FOR_ASSESSMENT' ? '#1B5E20' : (pipelineResult.recommendationReadiness === 'PARTIAL_EVIDENCE_REQUIRES_REVIEW' ? '#B78103' : '#616161'),
                      border: `1px solid ${pipelineResult.recommendationReadiness === 'SUFFICIENT_EVIDENCE_FOR_ASSESSMENT' ? '#A5D6A7' : '#FFE082'}`
                    }}
                  >
                    {pipelineResult.recommendationReadiness.replace(/_/g, ' ')}
                  </span>
                </div>
              )}

              <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--fiori-text-secondary)', textTransform: 'uppercase' }}>
                Outcome:
              </span>
              <span
                className={`fiori-badge fiori-badge-${getStatusBadgeVariant(searchResult.overallStatus)}`}
                style={{ fontSize: '12px', padding: '4px 10px', fontWeight: 700 }}
              >
                {searchResult.overallStatus.replace(/_/g, ' ')}
              </span>
            </div>
          </div>

          {/* MCP Assistance Status Indicator */}
          {pipelineResult?.mcpDiscovery && (
            <div
              className="fiori-card"
              style={{
                marginBottom: '16px',
                padding: '10px 16px',
                backgroundColor: pipelineResult.mcpDiscovery.mcpStatus.connected ? '#F0FDF4' : '#F8FAFC',
                border: `1px solid ${pipelineResult.mcpDiscovery.mcpStatus.connected ? '#BBF7D0' : '#E2E8F0'}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '8px',
                fontSize: '12px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontWeight: 700, color: pipelineResult.mcpDiscovery.mcpStatus.connected ? '#166534' : '#475569' }}>
                  MCP Assistance:
                </span>
                <span
                  className="fiori-badge"
                  style={{
                    fontSize: '10px',
                    fontWeight: 700,
                    backgroundColor: pipelineResult.mcpDiscovery.mcpStatus.connected ? '#DCFCE7' : '#F1F5F9',
                    color: pipelineResult.mcpDiscovery.mcpStatus.connected ? '#15803D' : '#64748B'
                  }}
                >
                  {pipelineResult.mcpDiscovery.mcpStatus.connected ? 'CONNECTED' : pipelineResult.mcpDiscovery.status}
                </span>
                {pipelineResult.mcpDiscovery.toolsInvoked.length > 0 && (
                  <span style={{ color: 'var(--fiori-text-secondary)', fontSize: '11px' }}>
                    Tools: {pipelineResult.mcpDiscovery.toolsInvoked.map((t) => t.toolName).join(', ')}
                  </span>
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '11px', color: 'var(--fiori-text-muted)' }}>
                <span>Discovered: {pipelineResult.mcpDiscovery.mcpDiscoveredCandidatesCount || 0}</span>
                <span>Enriched: {pipelineResult.mcpDiscovery.candidatesEnrichedCount || 0}</span>
                <span>Evidence Records: {pipelineResult.mcpDiscovery.mcpEvidence?.length || 0}</span>
              </div>
            </div>
          )}

          {/* Fault / Error Displays */}
          {searchResult.overallStatus === 'CONNECTION_ERROR' && (
            <MessageStrip
              type="error"
              title={searchResult.mode === 'LIVE_SAP' ? 'Live SAP Gateway Connection Failure (S21-200)' : 'Simulated SAP Connection Error (ZCONNERR)'}
            >
              <div style={{ whiteSpace: 'pre-line' }}>
                {searchResult.errorMessage ||
                  `The SAP adapter encountered a communication timeout contacting system ${searchResult.system.systemId}.`}
              </div>
            </MessageStrip>
          )}

          {searchResult.overallStatus === 'ACCESS_DENIED' && (
            <MessageStrip type="error" title="Simulated Authorization Failure (ZDENIED)">
              User session lacks required <code>S_TCODE</code> authorization profile in mock landscape {searchResult.system.systemId}. Transaction metadata retrieval was denied by security policy.
            </MessageStrip>
          )}

          {searchResult.overallStatus === 'SYSTEM_NOT_CONFIGURED' && (
            <MessageStrip type="error" title="Landscape Configuration Error">
              {searchResult.errorMessage || 'Target SAP system is not configured or recognized in the demo environment.'}
            </MessageStrip>
          )}

          {searchResult.overallStatus === 'INVALID_INPUT' && (
            <MessageStrip type="warning" title="Input Validation Notice">
              {searchResult.errorMessage || 'Please specify a valid SAP transaction code.'}
            </MessageStrip>
          )}

          {/* Transaction Metadata Verification Card (rendered when transaction record exists or is tested) */}
          {searchResult.transaction && (
            <TransactionVerificationCard
              transaction={searchResult.transaction}
              transactionIdentity={pipelineResult?.discovery?.transactionIdentity}
              isLiveSap={isLiveActiveSystem}
            />
          )}

          {/* DISC-01/02 + MATCH-01/02: Candidate Comparison Matrix */}
          {pipelineResult?.candidateComparison && pipelineResult.candidateComparison.length > 0 && (
            <CandidateComparisonMatrix
              candidates={pipelineResult.candidateComparison}
              tcode={searchResult.transaction?.tcode || lastSearchedTcode}
              assessmentHandoff={pipelineResult.assessmentHandoff}
            />
          )}

          {/* DISC-02: Multi-Source Technical Evidence Panel */}
          {pipelineResult?.discovery?.evidence && pipelineResult.discovery.evidence.length > 0 && (
            <TechnicalEvidencePanel
              evidence={pipelineResult.discovery.evidence}
              missingEvidence={pipelineResult.discovery.missingEvidence}
              warnings={pipelineResult.discovery.warnings}
              tcode={searchResult.transaction?.tcode || lastSearchedTcode}
            />
          )}

          {/* Fiori Candidates List (rendered for non-fault lookups) */}
          {searchResult.overallStatus !== 'CONNECTION_ERROR' &&
            searchResult.overallStatus !== 'ACCESS_DENIED' &&
            searchResult.overallStatus !== 'INVALID_INPUT' &&
            searchResult.overallStatus !== 'SYSTEM_NOT_CONFIGURED' &&
            searchResult.transaction?.exists && (
              <FioriCandidatesList
                candidates={searchResult.matching.candidates}
                tcode={searchResult.transaction.tcode}
                status={searchResult.matching.status}
              />
            )}

          {/* How this result was determined */}
          {searchResult.diagnostics?.decisionExplanation && (
            <DecisionExplanation
              explanation={searchResult.diagnostics.decisionExplanation}
              matchingRule={searchResult.diagnostics.matchingRuleApplied}
            />
          )}

          {/* Technical Diagnostics Accordion */}
          {searchResult.diagnostics && (
            <TechnicalDetailsAccordion diagnostics={searchResult.diagnostics} />
          )}
        </div>
      )}
    </div>
  );
};
