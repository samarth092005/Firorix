import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  SearchCode,
  RotateCcw,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  FileText,
  Search,
  Download,
  Filter,
  X,
  Layers,
  ArrowUpRight
} from 'lucide-react';

import { assessmentService } from '../../services/assessmentService';
import { systemHealthService } from '../../services/systemHealthService';
import { apiClient } from '../../services/api/apiClient';
import {
  AssessmentRecord,
  AssessmentSummary,
  SystemHealthResponse
} from '../../services/contracts/types';

import {
  KPICard,
  StatusBadge,
  SearchInput,
  LoadingState,
  EmptyState
} from '../../components/common';

type StatusFilterType = 'ALL' | 'EXPLICIT_SUCCESSOR' | 'FUNCTIONAL_ALTERNATIVE' | 'RELEASE_INCOMPATIBLE';

export const OverviewPage: React.FC = () => {
  const navigate = useNavigate();

  // State
  const [summary, setSummary] = useState<AssessmentSummary | null>(null);
  const [assessments, setAssessments] = useState<AssessmentRecord[]>([]);
  const [systemInfo, setSystemInfo] = useState<SystemHealthResponse | null>(null);
  const [mcpStatus, setMcpStatus] = useState<{ connected: boolean; status: string }>({ connected: false, status: 'Checking...' });
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [quickTcode, setQuickTcode] = useState<string>('');
  const [tableSearch, setTableSearch] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<StatusFilterType>('ALL');
  const [selectedModule, setSelectedModule] = useState<string>('ALL');

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [sum, recs, health, mcpRes] = await Promise.all([
        assessmentService.getAssessmentSummary(),
        assessmentService.getAssessments(),
        systemHealthService.getSystemHealth('S21').catch(() => null),
        apiClient.getMcpStatus().catch(() => null)
      ]);
      setSummary(sum);
      setAssessments(recs);
      if (health) setSystemInfo(health);
      if (mcpRes && mcpRes.success && mcpRes.status?.connectionState === 'CONNECTED') {
        setMcpStatus({ connected: true, status: 'Connected' });
      } else {
        setMcpStatus({ connected: false, status: mcpRes?.status?.connectionState || 'Disconnected' });
      }
    } catch (err) {
      console.error('Failed to load overview data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleQuickDiscover = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const clean = quickTcode.trim().toUpperCase();
    if (clean) {
      navigate(`/transaction-discovery?tcode=${encodeURIComponent(clean)}`);
    } else {
      navigate('/transaction-discovery');
    }
  };

  // Extract unique business areas (modules) for filter dropdown
  const uniqueModules = useMemo(() => {
    const modules = new Set<string>();
    assessments.forEach((a) => {
      if (a.businessArea) modules.add(a.businessArea);
    });
    return Array.from(modules).sort();
  }, [assessments]);

  // Derived counts
  const totalAssessed = summary?.totalAssessed ?? assessments.length;
  const directReplacements =
    summary?.explicitSuccessorsCount ??
    assessments.filter((a) => (a.assessmentResult || a.result) === 'EXPLICIT_SUCCESSOR').length;
  const partialFits =
    summary?.functionalAlternativeCount ??
    assessments.filter((a) => (a.assessmentResult || a.result) === 'FUNCTIONAL_ALTERNATIVE').length;
  const customOrIncompatible =
    summary?.releaseIncompatibleCount ??
    assessments.filter((a) => (a.assessmentResult || a.result) === 'RELEASE_INCOMPATIBLE').length;

  // Filtered assessments based on search, status tab, and module
  const filteredAssessments = useMemo(() => {
    return assessments.filter((a) => {
      // 1. Status Filter
      const resType = a.assessmentResult || a.result;
      if (statusFilter !== 'ALL' && resType !== statusFilter) {
        return false;
      }

      // 2. Module Filter
      if (selectedModule !== 'ALL' && a.businessArea !== selectedModule) {
        return false;
      }

      // 3. Search Query
      if (tableSearch.trim()) {
        const q = tableSearch.toLowerCase().trim();
        const matchesTcode = a.tcode.toLowerCase().includes(q);
        const matchesDesc = a.description.toLowerCase().includes(q);
        const matchesAppName = a.matchingFioriApp?.appName?.toLowerCase().includes(q);
        const matchesAppId = a.matchingFioriApp?.appId?.toLowerCase().includes(q);
        const matchesArea = a.businessArea?.toLowerCase().includes(q);
        if (!matchesTcode && !matchesDesc && !matchesAppName && !matchesAppId && !matchesArea) {
          return false;
        }
      }

      return true;
    });
  }, [assessments, statusFilter, selectedModule, tableSearch]);

  // Handle CSV Export
  const handleExportCSV = () => {
    if (filteredAssessments.length === 0) return;

    const headers = [
      'Transaction Code',
      'Description',
      'Business Area',
      'Target Fiori App ID',
      'Target Fiori App Name',
      'UI Technology',
      'Readiness Score (%)',
      'Fit Status'
    ];

    const rows = filteredAssessments.map((item) => {
      const fitScore = item.fitScore ?? (item.result === 'EXPLICIT_SUCCESSOR' ? 92 : 78);
      const app = item.matchingFioriApp;
      return [
        `"${item.tcode}"`,
        `"${(item.description || '').replace(/"/g, '""')}"`,
        `"${(item.businessArea || 'General').replace(/"/g, '""')}"`,
        `"${app?.appId || 'N/A'}"`,
        `"${(app?.appName || 'Pending Identification').replace(/"/g, '""')}"`,
        `"${(app?.uiTechnology || 'SAP Fiori Elements').replace(/"/g, '""')}"`,
        `${fitScore}`,
        `"${item.assessmentResult || item.result || 'UNKNOWN'}"`
      ];
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `Fiorify_Assessments_${statusFilter !== 'ALL' ? statusFilter : 'All'}_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCardFilterToggle = (target: StatusFilterType) => {
    if (statusFilter === target) {
      setStatusFilter('ALL');
    } else {
      setStatusFilter(target);
    }
  };

  const hasActiveFilters = statusFilter !== 'ALL' || selectedModule !== 'ALL' || tableSearch.trim() !== '';

  const clearAllFilters = () => {
    setStatusFilter('ALL');
    setSelectedModule('ALL');
    setTableSearch('');
  };

  if (isLoading) {
    return (
      <LoadingState
        message="Loading modernization workspace..."
        subMessage="Retrieving transaction assessments and catalog matching summaries..."
      />
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
      {/* 1. Header with Target Context and Workspace Actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#0F172A', letterSpacing: '-0.3px', margin: 0 }}>
              Modernization Workspace
            </h1>
            {/* Target System Landscape Badge */}
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '3px 10px',
                backgroundColor: '#F1F5F9',
                border: '1px solid #E2E8F0',
                borderRadius: '16px',
                fontSize: '12px',
                color: '#475569'
              }}
              title="Target SAP S/4HANA System Baseline"
            >
              <span
                style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  backgroundColor: '#10B981',
                  display: 'inline-block'
                }}
              />
              <span style={{ fontWeight: 600, color: '#1E293B' }}>{systemInfo?.systemId || 'S21'}</span>
              <span style={{ color: '#94A3B8' }}>•</span>
              <span>{systemInfo?.platform || 'SAP S/4HANA 2023'}</span>
              <span style={{ color: '#94A3B8' }}>•</span>
              <span>Client {systemInfo?.client || '200'}</span>
              <span style={{ color: '#94A3B8' }}>•</span>
              <span
                onClick={() => navigate('/system-configuration/mcp')}
                style={{
                  color: mcpStatus.connected ? '#0066FF' : '#64748B',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
                title={`SAP Fiori MCP Server: ${mcpStatus.status} (@sap-ux/fiori-mcp-server)`}
              >

              </span>
            </div>
          </div>
          <p style={{ fontSize: '13px', color: '#64748B', marginTop: '4px', margin: 0 }}>
            Unified SAP GUI transaction assessment register, standard Fiori mappings, and clean core migration readiness.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            type="button"
            onClick={loadData}
            style={{
              padding: '8px 14px',
              backgroundColor: '#FFFFFF',
              border: '1px solid #CBD5E1',
              borderRadius: '6px',
              fontSize: '13px',
              fontWeight: 600,
              color: '#475569',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'background-color 0.15s'
            }}
            title="Refresh assessment summaries from backend ledger"
          >
            <RotateCcw size={14} />
            <span>Refresh</span>
          </button>

          <button
            type="button"
            onClick={() => navigate('/transaction-discovery')}
            style={{
              padding: '8px 16px',
              backgroundColor: '#0066FF',
              border: 'none',
              borderRadius: '6px',
              fontSize: '13px',
              fontWeight: 600,
              color: '#FFFFFF',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 2px 4px rgba(0, 102, 255, 0.2)'
            }}
          >
            <SearchCode size={15} />
            <span>New Transaction Discovery</span>
          </button>
        </div>
      </div>

      {/* 2. Interactive KPI Metric Cards (Click to filter table below) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '14px'
        }}
      >
        <div
          onClick={() => setStatusFilter('ALL')}
          style={{
            cursor: 'pointer',
            borderRadius: '10px',
            outline: statusFilter === 'ALL' ? '2px solid #0066FF' : 'none',
            outlineOffset: '2px'
          }}
          title="Click to view all assessed transactions"
        >
          <KPICard
            label="Assessed Transactions"
            value={totalAssessed}
            description="Total evaluated in register"
            icon={FileText}
            tone="default"
            badgeText={statusFilter === 'ALL' ? 'Showing All' : undefined}
          />
        </div>

        <div
          onClick={() => handleCardFilterToggle('EXPLICIT_SUCCESSOR')}
          style={{
            cursor: 'pointer',
            borderRadius: '10px',
            outline: statusFilter === 'EXPLICIT_SUCCESSOR' ? '2px solid #16A34A' : 'none',
            outlineOffset: '2px'
          }}
          title="Click to filter direct standard Fiori replacements"
        >
          <KPICard
            label="Direct Fiori Replacements"
            value={directReplacements}
            description="Standard official apps available"
            icon={CheckCircle2}
            tone="success"
            badgeText={statusFilter === 'EXPLICIT_SUCCESSOR' ? 'Filtered' : undefined}
          />
        </div>

        <div
          onClick={() => handleCardFilterToggle('FUNCTIONAL_ALTERNATIVE')}
          style={{
            cursor: 'pointer',
            borderRadius: '10px',
            outline: statusFilter === 'FUNCTIONAL_ALTERNATIVE' ? '2px solid #0066FF' : 'none',
            outlineOffset: '2px'
          }}
          title="Click to filter functional alternative fits"
        >
          <KPICard
            label="Fit with Enhancement"
            value={partialFits}
            description="Alternative apps or WebGUI fit"
            icon={Sparkles}
            tone="info"
            badgeText={statusFilter === 'FUNCTIONAL_ALTERNATIVE' ? 'Filtered' : undefined}
          />
        </div>

        <div
          onClick={() => handleCardFilterToggle('RELEASE_INCOMPATIBLE')}
          style={{
            cursor: 'pointer',
            borderRadius: '10px',
            outline: statusFilter === 'RELEASE_INCOMPATIBLE' ? '2px solid #D97706' : 'none',
            outlineOffset: '2px'
          }}
          title="Click to filter custom RAP or gap items"
        >
          <KPICard
            label="Fit-Gap Attention"
            value={customOrIncompatible}
            description="Requires custom RAP or extension"
            icon={AlertTriangle}
            tone="warning"
            badgeText={statusFilter === 'RELEASE_INCOMPATIBLE' ? 'Filtered' : undefined}
          />
        </div>
      </div>

      {/* 3. Modernization Architecture & Capability Landscape Panel */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          padding: '20px',
          borderRadius: '10px',
          border: '1px solid #E2E8F0',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.03)',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
          <div>
            <div style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Layers size={16} color="#0066FF" />
              <span>SAP S/4HANA Modernization Architecture &amp; System Capabilities</span>
            </div>
            <div style={{ fontSize: '12px', color: '#64748B', marginTop: '2px' }}>
              Clean Core assessment framework connecting live SAP S21 Data Dictionary (DDIC) to official Fiori successors.
            </div>
          </div>
          <span style={{ fontSize: '11px', fontWeight: 600, color: '#16A34A', backgroundColor: '#F0FDF4', border: '1px solid #BBF7D0', padding: '3px 10px', borderRadius: '12px' }}>
            ● Target S21-200 Active
          </span>
        </div>

        {/* 3 Status Pillar Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
          {/* Pillar 1: Target Landscape */}
          <div style={{ padding: '14px', backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Target System</span>
              <span style={{ fontSize: '10px', fontWeight: 700, backgroundColor: '#DCFCE7', color: '#15803D', padding: '1px 6px', borderRadius: '4px' }}>S/4HANA 2023</span>
            </div>
            <div style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A' }}>S21 Private Cloud (Client 200)</div>
            <div style={{ fontSize: '11px', color: '#64748B', marginTop: '3px' }}>SAP_BASIS 758 • S4CORE 108 • Gateway Catalog</div>
          </div>

          {/* Pillar 2: Official Fiori Catalogue */}
          <div style={{ padding: '14px', backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Catalogue Index</span>
              <span style={{ fontSize: '10px', fontWeight: 700, backgroundColor: '#DBEAFE', color: '#1D4ED8', padding: '1px 6px', borderRadius: '4px' }}>OFFICIAL SAP</span>
            </div>
            <div style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A' }}>18,225+ Fiori Applications</div>
            <div style={{ fontSize: '11px', color: '#64748B', marginTop: '3px' }}>Synchronized with SAP Fiori Apps Library OData</div>
          </div>

          {/* Pillar 3: Clean Core Assessment */}
          <div style={{ padding: '14px', backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Fit-Gap Engine</span>
              <span style={{ fontSize: '10px', fontWeight: 700, backgroundColor: '#F3E8FF', color: '#7E22CE', padding: '1px 6px', borderRadius: '4px' }}>CLEAN CORE</span>
            </div>
            <div style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A' }}>5-Dimension Deterministic Scoring</div>
            <div style={{ fontSize: '11px', color: '#64748B', marginTop: '3px' }}>Functional 35%, Technical 25%, Process 15%, Roles 15%, Compat 10%</div>
          </div>
        </div>

        {/* Quick Launchpad Strip */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#F0F7FF', border: '1px solid #BAE6FD', borderRadius: '8px', padding: '10px 16px', flexWrap: 'wrap', gap: '10px' }}>
          <div style={{ fontSize: '12px', color: '#0369A1' }}>
            <strong>Modernization Actions:</strong> Inspect any SAP GUI transaction or explore official Fiori successor matches.
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              onClick={() => navigate('/catalogue')}
              style={{ padding: '6px 12px', backgroundColor: '#FFFFFF', border: '1px solid #93C5FD', borderRadius: '6px', fontSize: '12px', fontWeight: 600, color: '#0284C7', cursor: 'pointer' }}
            >
              Browse Catalogue (18k+ Apps)
            </button>
            <button
              type="button"
              onClick={() => navigate('/transaction-discovery')}
              style={{ padding: '6px 14px', backgroundColor: '#0066FF', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: 600, color: '#FFFFFF', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}
            >
              <span>Inspect Transaction</span>
              <ArrowRight size={13} />
            </button>
          </div>
        </div>
      </div>

      {/* 4. Streamlined Assessments Table with Tab Filtering & Export */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '10px',
          border: '1px solid #E2E8F0',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.03)',
          overflow: 'hidden'
        }}
      >
        {/* Filter Bar & Tabs */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #E2E8F0' }}>
          {/* Top row: Status Tabs + Actions */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '12px',
              marginBottom: '14px'
            }}
          >
            {/* Status Tabs */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                backgroundColor: '#F1F5F9',
                padding: '3px',
                borderRadius: '8px',
                gap: '2px',
                flexWrap: 'wrap'
              }}
            >
              <button
                type="button"
                onClick={() => setStatusFilter('ALL')}
                style={{
                  padding: '5px 12px',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  backgroundColor: statusFilter === 'ALL' ? '#FFFFFF' : 'transparent',
                  color: statusFilter === 'ALL' ? '#0F172A' : '#64748B',
                  boxShadow: statusFilter === 'ALL' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none'
                }}
              >
                All ({totalAssessed})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('EXPLICIT_SUCCESSOR')}
                style={{
                  padding: '5px 12px',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  backgroundColor: statusFilter === 'EXPLICIT_SUCCESSOR' ? '#FFFFFF' : 'transparent',
                  color: statusFilter === 'EXPLICIT_SUCCESSOR' ? '#15803D' : '#64748B',
                  boxShadow: statusFilter === 'EXPLICIT_SUCCESSOR' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none'
                }}
              >
                Direct Fit ({directReplacements})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('FUNCTIONAL_ALTERNATIVE')}
                style={{
                  padding: '5px 12px',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  backgroundColor: statusFilter === 'FUNCTIONAL_ALTERNATIVE' ? '#FFFFFF' : 'transparent',
                  color: statusFilter === 'FUNCTIONAL_ALTERNATIVE' ? '#0066FF' : '#64748B',
                  boxShadow: statusFilter === 'FUNCTIONAL_ALTERNATIVE' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none'
                }}
              >
                Alternative Fit ({partialFits})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('RELEASE_INCOMPATIBLE')}
                style={{
                  padding: '5px 12px',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  backgroundColor: statusFilter === 'RELEASE_INCOMPATIBLE' ? '#FFFFFF' : 'transparent',
                  color: statusFilter === 'RELEASE_INCOMPATIBLE' ? '#D97706' : '#64748B',
                  boxShadow: statusFilter === 'RELEASE_INCOMPATIBLE' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none'
                }}
              >
                Gap Attention ({customOrIncompatible})
              </button>
            </div>

            {/* Export & View History */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                type="button"
                onClick={handleExportCSV}
                disabled={filteredAssessments.length === 0}
                style={{
                  padding: '6px 12px',
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #CBD5E1',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: filteredAssessments.length === 0 ? '#94A3B8' : '#334155',
                  cursor: filteredAssessments.length === 0 ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
                title="Export currently filtered assessments to CSV spreadsheet"
              >
                <Download size={13} />
                <span>Export CSV</span>
              </button>

              <button
                type="button"
                onClick={() => navigate('/assessment-history')}
                style={{
                  padding: '6px 12px',
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #CBD5E1',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: '#475569',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
                title="View full assessment history ledger"
              >
                <span>Full Ledger</span>
                <ArrowUpRight size={13} />
              </button>
            </div>
          </div>

          {/* Bottom row: Search + Module dropdown + Clear filter */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '12px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: '280px' }}>
              <div style={{ flex: 1, maxWidth: '360px' }}>
                <SearchInput
                  value={tableSearch}
                  onChange={setTableSearch}
                  placeholder="Filter by T-Code, description, or Fiori app..."
                />
              </div>

              {/* Module Filter Dropdown */}
              {uniqueModules.length > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Layers size={14} style={{ color: '#64748B' }} />
                  <select
                    value={selectedModule}
                    onChange={(e) => setSelectedModule(e.target.value)}
                    style={{
                      padding: '7px 10px',
                      border: '1px solid #CBD5E1',
                      borderRadius: '6px',
                      fontSize: '12px',
                      color: '#334155',
                      backgroundColor: '#FFFFFF',
                      cursor: 'pointer',
                      outline: 'none'
                    }}
                  >
                    <option value="ALL">All Business Areas</option>
                    {uniqueModules.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Reset Filter Button */}
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={clearAllFilters}
                  style={{
                    padding: '5px 10px',
                    backgroundColor: '#F1F5F9',
                    border: '1px solid #CBD5E1',
                    borderRadius: '6px',
                    fontSize: '12px',
                    color: '#475569',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                  title="Clear all active search and tab filters"
                >
                  <X size={12} />
                  <span>Reset Filters</span>
                </button>
              )}
            </div>

            <div style={{ fontSize: '12px', color: '#64748B' }}>
              Showing <strong>{filteredAssessments.length}</strong> of {assessments.length} transactions
            </div>
          </div>
        </div>

        {filteredAssessments.length === 0 ? (
          <EmptyState
            title="No matching assessments found"
            description={
              hasActiveFilters
                ? 'No transactions match the selected filters. Try clearing your filters or searching another keyword.'
                : 'No transactions have been assessed yet. Start a new discovery to populate your register.'
            }
            action={
              hasActiveFilters
                ? {
                    label: 'Clear Filters',
                    onClick: clearAllFilters
                  }
                : {
                    label: 'Discover First Transaction',
                    onClick: () => navigate('/transaction-discovery')
                  }
            }
          />
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
              <thead>
                <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0', color: '#64748B', fontSize: '12px', fontWeight: 600 }}>
                  <th style={{ padding: '12px 16px' }}>Transaction (TSTC)</th>
                  <th style={{ padding: '12px 16px' }}>Business Area</th>
                  <th style={{ padding: '12px 16px' }}>Target Fiori App</th>
                  <th style={{ padding: '12px 16px' }}>Readiness Score</th>
                  <th style={{ padding: '12px 16px' }}>Fit Status</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredAssessments.map((item) => {
                  const fitScore = item.fitScore ?? (item.result === 'EXPLICIT_SUCCESSOR' ? 92 : 78);
                  const scoreColor = fitScore >= 85 ? '#15803D' : fitScore >= 65 ? '#0284C7' : '#C2410C';

                  return (
                    <tr
                      key={item.id}
                      style={{ borderBottom: '1px solid #F1F5F9', transition: 'background-color 0.1s' }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#F8FAFC')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                    >
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '14px', color: '#0F172A' }}>
                            {item.tcode}
                          </span>
                        </div>
                        <div style={{ fontSize: '12px', color: '#64748B', marginTop: '2px' }}>
                          {item.description}
                        </div>
                      </td>

                      <td style={{ padding: '12px 16px' }}>
                        <span
                          style={{
                            fontSize: '11px',
                            padding: '2px 8px',
                            borderRadius: '12px',
                            backgroundColor: '#F1F5F9',
                            color: '#475569',
                            fontWeight: 500,
                            display: 'inline-block'
                          }}
                        >
                          {item.businessArea || 'General'}
                        </span>
                      </td>

                      <td style={{ padding: '12px 16px' }}>
                        {item.matchingFioriApp ? (
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span
                                style={{
                                  fontSize: '11px',
                                  fontWeight: 700,
                                  fontFamily: 'monospace',
                                  color: '#0066FF',
                                  backgroundColor: '#EFF6FF',
                                  padding: '1px 6px',
                                  borderRadius: '3px'
                                }}
                              >
                                {item.matchingFioriApp.appId}
                              </span>
                              <span style={{ fontWeight: 600, color: '#1E293B' }}>
                                {item.matchingFioriApp.appName}
                              </span>
                            </div>
                            <div style={{ fontSize: '11px', color: '#64748B', marginTop: '2px' }}>
                              {item.matchingFioriApp.uiTechnology || 'SAP Fiori Elements'}
                            </div>
                          </div>
                        ) : (
                          <span style={{ color: '#94A3B8', fontStyle: 'italic', fontSize: '12px' }}>
                            Pending catalog identification
                          </span>
                        )}
                      </td>

                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          {/* Mini visual progress track */}
                          <div
                            style={{
                              width: '44px',
                              height: '6px',
                              backgroundColor: '#E2E8F0',
                              borderRadius: '3px',
                              overflow: 'hidden'
                            }}
                          >
                            <div
                              style={{
                                width: `${fitScore}%`,
                                height: '100%',
                                backgroundColor: scoreColor,
                                borderRadius: '3px'
                              }}
                            />
                          </div>
                          <span
                            style={{
                              fontWeight: 700,
                              fontSize: '12px',
                              color: scoreColor,
                              minWidth: '32px'
                            }}
                          >
                            {fitScore}%
                          </span>
                        </div>
                      </td>

                      <td style={{ padding: '12px 16px' }}>
                        {(() => {
                          const resType = item.assessmentResult || item.result || 'UNKNOWN';
                          return (
                            <StatusBadge
                              status={resType}
                              variant={
                                resType === 'EXPLICIT_SUCCESSOR'
                                  ? 'success'
                                  : resType === 'FUNCTIONAL_ALTERNATIVE'
                                  ? 'info'
                                  : 'warning'
                              }
                              customLabel={
                                resType === 'EXPLICIT_SUCCESSOR'
                                  ? 'Direct Replacement'
                                  : resType === 'FUNCTIONAL_ALTERNATIVE'
                                  ? 'Alternative Fit'
                                  : 'Requires Custom'
                              }
                            />
                          );
                        })()}
                      </td>

                      <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                        <button
                          type="button"
                          onClick={() => navigate(`/assessment-results/${item.id}`)}
                          style={{
                            padding: '6px 12px',
                            backgroundColor: '#FFFFFF',
                            border: '1px solid #CBD5E1',
                            borderRadius: '6px',
                            fontSize: '12px',
                            fontWeight: 600,
                            color: '#0066FF',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                        >
                          <span>View Assessment</span>
                          <ArrowRight size={13} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
