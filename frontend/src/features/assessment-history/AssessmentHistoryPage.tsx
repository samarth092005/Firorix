import { uiConfig, formatSystemBadge } from '../../config/uiConfig';
import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { assessmentService } from '../../services/assessmentService';
import { AssessmentRecord, AssessmentResultType, AssessmentLifecycleStatus } from '../../services/contracts/types';
import {
  PageHeader,
  SectionHeader,
  DataTable,
  ColumnDef,
  StatusBadge,
  SearchInput,
  FilterControls,
  LoadingState,
  Breadcrumbs
} from '../../components/common';
import { SearchCode, ExternalLink, Server, ArrowRight, Sparkles } from 'lucide-react';

export const AssessmentHistoryPage: React.FC = () => {
  const navigate = useNavigate();

  const [assessments, setAssessments] = useState<AssessmentRecord[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [businessAreaFilter, setBusinessAreaFilter] = useState<string>('ALL');
  const [resultFilter, setResultFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [classificationFilter, setClassificationFilter] = useState<string>('ALL');
  const [deduplicateLatest, setDeduplicateLatest] = useState<boolean>(true);

  useEffect(() => {
    async function loadHistory() {
      try {
        setIsLoading(true);
        const records = await assessmentService.getAssessments();
        setAssessments(records);
      } catch (err) {
        console.error('Failed to load assessment history:', err);
      } finally {
        setIsLoading(false);
      }
    }

    loadHistory();
  }, []);

  // Normalize business areas
  const normalizeBusinessArea = (area: string) => {
    if (!area) return 'General Business Area';
    return area.replace(/\s*&\s*/g, ' and ').trim();
  };

  const uniqueBusinessAreas = useMemo(() => {
    const rawAreas = assessments.map((r) => normalizeBusinessArea(r.businessArea));
    const areas = Array.from(new Set(rawAreas));
    return areas.sort();
  }, [assessments]);

  const processedAssessments = useMemo(() => {
    let list = [...assessments];

    if (deduplicateLatest) {
      const map = new Map<string, AssessmentRecord>();
      list.forEach((item) => {
        const existing = map.get(item.tcode);
        if (!existing) {
          map.set(item.tcode, item);
        } else {
          const isBetter =
            (item.status === 'APPROVED' && existing.status !== 'APPROVED') ||
            (item.status === 'COMPLETED' && existing.status === 'PENDING_VERIFICATION') ||
            (item.matchingFioriApp && !existing.matchingFioriApp) ||
            item.id > existing.id;
          if (isBetter) {
            map.set(item.tcode, item);
          }
        }
      });
      list = Array.from(map.values());
    }

    return list;
  }, [assessments, deduplicateLatest]);

  const filteredAssessments = useMemo(() => {
    let result = [...processedAssessments];

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase().trim();
      result = result.filter(
        (r) =>
          r.tcode.toLowerCase().includes(q) ||
          r.description.toLowerCase().includes(q) ||
          normalizeBusinessArea(r.businessArea).toLowerCase().includes(q) ||
          (r.matchingFioriApp &&
            (r.matchingFioriApp.appId.toLowerCase().includes(q) ||
              r.matchingFioriApp.appName.toLowerCase().includes(q)))
      );
    }

    if (businessAreaFilter !== 'ALL') {
      result = result.filter((r) => normalizeBusinessArea(r.businessArea) === businessAreaFilter);
    }

    if (resultFilter !== 'ALL') {
      result = result.filter((r) => r.assessmentResult === resultFilter);
    }

    if (statusFilter !== 'ALL') {
      result = result.filter((r) => r.status === statusFilter);
    }

    if (classificationFilter !== 'ALL') {
      result = result.filter((r) => r.classification === classificationFilter);
    }

    return result;
  }, [processedAssessments, searchTerm, businessAreaFilter, resultFilter, statusFilter, classificationFilter]);

  // Consolidated 5-Column layout: Prevents right-side overflow and text clipping
  const columns: ColumnDef<AssessmentRecord>[] = [
    {
      key: 'tcode',
      header: 'T-Code',
      width: '110px',
      sortable: true,
      render: (r) => (
        <div>
          <span style={{ fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--fiori-navy, #102A43)', fontSize: '13px' }}>
            {r.tcode}
          </span>
          <div style={{ fontSize: '10px', color: 'var(--fiori-text-secondary, #64748B)', marginTop: '2px', fontWeight: 600 }}>
            {r.classification}
          </div>
        </div>
      )
    },
    {
      key: 'description',
      header: 'Transaction Name',
      sortable: true,
      render: (r) => (
        <span style={{ fontWeight: 600, color: 'var(--fiori-text-primary, #1B2838)', fontSize: '13px' }}>
          {r.description}
        </span>
      )
    },
    {
      key: 'matchingFioriApp',
      header: 'Target / Modernized App',
      render: (r) => {
        if (!r.matchingFioriApp) {
          return (
            <span style={{ fontSize: '12px', color: 'var(--fiori-text-secondary, #64748B)', fontStyle: 'italic' }}>
              None verified (Custom RAP)
            </span>
          );
        }
        return (
          <div style={{ maxWidth: '280px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  fontFamily: 'var(--font-mono)',
                  color: 'var(--fiori-primary, #0A6ED1)',
                  backgroundColor: 'var(--fiori-info-bg, #EFF6FF)',
                  padding: '1px 5px',
                  borderRadius: '3px',
                  border: '1px solid rgba(10, 110, 209, 0.2)'
                }}
              >
                {r.matchingFioriApp.appId}
              </span>
              <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--fiori-navy, #102A43)' }}>
                {r.matchingFioriApp.appName}
              </span>
            </div>
            <div style={{ fontSize: '11px', color: 'var(--fiori-text-secondary, #64748B)', marginTop: '2px' }}>
              {r.matchingFioriApp.uiTechnology}
            </div>
          </div>
        );
      }
    },
    {
      key: 'assessmentResult',
      header: 'Outcome & Status',
      width: '190px',
      sortable: true,
      render: (r) => {
        const getStatusColor = (s: string) => {
          if (s === 'APPROVED' || s === 'COMPLETED') return '#059669';
          if (s === 'PENDING_VERIFICATION') return '#D97706';
          return '#64748B';
        };

        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-start' }}>
            <StatusBadge status={r.assessmentResult} size="sm" />
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', fontWeight: 500, color: getStatusColor(r.status) }}>
              <span
                style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  backgroundColor: getStatusColor(r.status)
                }}
              />
              <span>{r.status.replace(/_/g, ' ')}</span>
            </div>
          </div>
        );
      }
    },
    {
      key: 'actions',
      header: 'Action',
      width: '100px',
      align: 'right',
      render: (r) => {
        const isCustomBuild =
          ((r.assessmentResult as any) === 'CUSTOM_BUILD') ||
          ((r.assessmentResult as any) === 'CUSTOM_RAP_REQUIRED') ||
          Boolean(r.matchingFioriApp?.appId?.startsWith('GEN-'));

        return (
          <div style={{ display: 'flex', justifyContent: 'flex-end', paddingRight: '4px' }}>
            {isCustomBuild ? (
              <button
                type="button"
                className="fiori-btn fiori-btn-subtle"
                style={{
                  height: '28px',
                  padding: '0 10px',
                  fontSize: '11px',
                  color: 'var(--fiori-primary, #0070F2)',
                  fontWeight: 600,
                  backgroundColor: 'rgba(0, 112, 242, 0.08)',
                  borderRadius: '4px',
                  border: '1px solid rgba(0, 112, 242, 0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  navigate('/generation-studio');
                }}
                title="Open in Generation Studio"
              >
                <Sparkles size={12} />
                <span>Studio</span>
              </button>
            ) : (
              <button
                type="button"
                className="fiori-btn fiori-btn-subtle"
                style={{
                  height: '28px',
                  padding: '0 8px',
                  fontSize: '11px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '3px',
                  color: 'var(--fiori-text-secondary, #64748B)'
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/assessment-results?id=${r.id}`);
                }}
              >
                <span>View</span>
                <ArrowRight size={11} />
              </button>
            )}
          </div>
        );
      }
    }
  ];

  if (isLoading) {
    return <LoadingState message="Loading historical assessment registry..." />;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <PageHeader
        title="Assessment History"
        subtitle="Historical repository of evaluated SAP transactions, Fiori candidate mappings and technical determinations."
        breadcrumbs={<Breadcrumbs items={[{ label: 'Assessment History' }]} />}
        systemContextBadge={
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '3px 10px',
              backgroundColor: 'var(--fiori-surface, #FFFFFF)',
              border: '1px solid var(--fiori-border, #DDE2E5)',
              borderRadius: '16px',
              fontSize: '11px',
              fontWeight: 600,
              color: 'var(--fiori-text-primary, #1D2D3E)'
            }}
          >
            <Server size={12} color="var(--fiori-primary, #0070F2)" />
            {formatSystemBadge(undefined, undefined, ' (')} • S/4HANA 2023
          </span>
        }
        actions={[
          {
            label: 'New Assessment',
            icon: SearchCode,
            variant: 'primary',
            onClick: () => navigate('/transaction-discovery')
          }
        ]}
      />

      {/* Main Table Container */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          border: '1px solid var(--fiori-border, #E2E8F0)',
          borderRadius: 'var(--radius-md, 10px)',
          padding: '22px',
          boxShadow: 'var(--fiori-shadow-card)',
          overflowX: 'auto'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
          <SectionHeader
            title="All Recorded Assessments"
            description={`Showing ${filteredAssessments.length} of ${processedAssessments.length} unique transactions assessed for ${uiConfig.defaultSystem.id} S/4HANA 2023.`}
          />
          {/* Deduplication Toggle */}
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'var(--fiori-text-secondary, #64748B)', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={deduplicateLatest}
              onChange={(e) => setDeduplicateLatest(e.target.checked)}
              style={{ cursor: 'pointer' }}
            />
            <span>Group duplicates (show latest per T-Code)</span>
          </label>
        </div>

        {/* Search & Filter Toolbar */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '12px',
            marginBottom: '16px'
          }}
        >
          <SearchInput
            value={searchTerm}
            onChange={setSearchTerm}
            placeholder="Search by T-Code, description, or Fiori app..."
            width="320px"
          />

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <FilterControls
              groups={[
                {
                  id: 'result',
                  label: 'Outcome',
                  selectedValue: resultFilter,
                  options: [
                    { label: 'All Outcomes', value: 'ALL' },
                    { label: 'Explicit Successor', value: 'EXPLICIT_SUCCESSOR' },
                    { label: 'Custom Build (RAP)', value: 'CUSTOM_RAP_REQUIRED' },
                    { label: 'SAP GUI for HTML', value: 'WEBGUI_COMPATIBLE' },
                    { label: 'Pending Verification', value: 'PENDING_VERIFICATION' }
                  ]
                },
                {
                  id: 'classification',
                  label: 'Type',
                  selectedValue: classificationFilter,
                  options: [
                    { label: 'All Types', value: 'ALL' },
                    { label: 'Standard SAP', value: 'STANDARD' },
                    { label: 'Custom (Z/Y)', value: 'CUSTOM' }
                  ]
                },
                {
                  id: 'status',
                  label: 'Status',
                  selectedValue: statusFilter,
                  options: [
                    { label: 'All Statuses', value: 'ALL' },
                    { label: 'Completed', value: 'COMPLETED' },
                    { label: 'Approved', value: 'APPROVED' },
                    { label: 'Pending Verification', value: 'PENDING_VERIFICATION' }
                  ]
                }
              ]}
              onFilterChange={(groupId, value) => {
                if (groupId === 'result') setResultFilter(value);
                if (groupId === 'status') setStatusFilter(value);
                if (groupId === 'classification') setClassificationFilter(value);
              }}
            />

            {(searchTerm || resultFilter !== 'ALL' || classificationFilter !== 'ALL' || statusFilter !== 'ALL') && (
              <button
                type="button"
                className="fiori-btn fiori-btn-subtle"
                style={{ height: '32px', fontSize: '12px', color: 'var(--fiori-primary, #0070F2)' }}
                onClick={() => {
                  setSearchTerm('');
                  setResultFilter('ALL');
                  setClassificationFilter('ALL');
                  setStatusFilter('ALL');
                }}
              >
                Clear Filters
              </button>
            )}
          </div>
        </div>

        <DataTable
          columns={columns}
          data={filteredAssessments}
          keyExtractor={(item) => item.id}
          onRowClick={(item) => navigate(`/assessment-results?id=${item.id}`)}
          pageSize={10}
          defaultSortKey="tcode"
          defaultSortOrder="asc"
        />
      </div>
    </div>
  );
};
