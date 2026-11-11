import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { assessmentService } from '../../services/assessmentService';
import { AssessmentRecord, AssessmentResultType, AssessmentLifecycleStatus } from '../../services/contracts/types';
import {
  PageHeader,
  Breadcrumbs,
  SectionHeader,
  StatusBadge,
  SearchInput,
  FilterControls,
  EmptyState,
  LoadingState,
  DataTable,
  ColumnDef
} from '../../components/common';
import {
  History,
  SearchCode,
  ArrowRight,
  Server,
  FileCheck2,
  ExternalLink,
  Layers,
  Filter
} from 'lucide-react';

export const AssessmentHistoryPage: React.FC = () => {
  const navigate = useNavigate();
  const [assessments, setAssessments] = useState<AssessmentRecord[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Filters
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [businessAreaFilter, setBusinessAreaFilter] = useState<string>('ALL');
  const [resultFilter, setResultFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [classificationFilter, setClassificationFilter] = useState<string>('ALL');

  useEffect(() => {
    async function loadHistory() {
      setIsLoading(true);
      try {
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

  const uniqueBusinessAreas = useMemo(() => {
    const areas = Array.from(new Set(assessments.map((r) => r.businessArea)));
    return areas.sort();
  }, [assessments]);

  const filteredAssessments = useMemo(() => {
    let result = [...assessments];

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase().trim();
      result = result.filter(
        (r) =>
          r.tcode.toLowerCase().includes(q) ||
          r.description.toLowerCase().includes(q) ||
          r.businessArea.toLowerCase().includes(q) ||
          (r.matchingFioriApp &&
            (r.matchingFioriApp.appId.toLowerCase().includes(q) ||
              r.matchingFioriApp.appName.toLowerCase().includes(q)))
      );
    }

    if (businessAreaFilter !== 'ALL') {
      result = result.filter((r) => r.businessArea === businessAreaFilter);
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
  }, [assessments, searchTerm, businessAreaFilter, resultFilter, statusFilter, classificationFilter]);

  const columns: ColumnDef<AssessmentRecord>[] = [
    {
      key: 'tcode',
      header: 'T-Code',
      width: '120px',
      sortable: true,
      render: (r) => (
        <div>
          <span style={{ fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--fiori-navy, #102A43)' }}>
            {r.tcode}
          </span>
          <div style={{ fontSize: '10px', color: 'var(--fiori-text-secondary, #64748B)' }}>
            {r.classification}
          </div>
        </div>
      )
    },
    {
      key: 'description',
      header: 'Description & Repository',
      width: '260px',
      sortable: true,
      render: (r) => (
        <div>
          <div style={{ fontWeight: 600, color: 'var(--fiori-text-primary, #1B2838)' }}>{r.description}</div>
          <div style={{ fontSize: '11px', color: 'var(--fiori-text-secondary, #64748B)', fontFamily: 'var(--font-mono)' }}>
            {r.programName} ({r.packageName})
          </div>
        </div>
      )
    },
    {
      key: 'businessArea',
      header: 'Business Area',
      width: '180px',
      sortable: true,
      render: (r) => (
        <div>
          <div style={{ fontSize: '12px', fontWeight: 500 }}>{r.businessArea}</div>
          {r.subArea && (
            <div style={{ fontSize: '11px', color: 'var(--fiori-text-secondary, #64748B)' }}>{r.subArea}</div>
          )}
        </div>
      )
    },
    {
      key: 'assessmentResult',
      header: 'Assessment Result',
      width: '180px',
      sortable: true,
      render: (r) => <StatusBadge status={r.assessmentResult} size="sm" />
    },
    {
      key: 'matchingFioriApp',
      header: 'Matching Fiori App',
      width: '240px',
      render: (r) => {
        if (!r.matchingFioriApp) {
          return (
            <span style={{ fontSize: '12px', color: 'var(--fiori-text-secondary, #64748B)', fontStyle: 'italic' }}>
              None verified
            </span>
          );
        }
        return (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  fontFamily: 'var(--font-mono)',
                  color: 'var(--fiori-primary, #0A6ED1)',
                  backgroundColor: 'var(--fiori-info-bg)',
                  padding: '1px 5px',
                  borderRadius: '2px'
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
      key: 'lastAssessed',
      header: 'Last Assessed',
      width: '130px',
      sortable: true,
      render: (r) => (
        <span style={{ fontSize: '12px', color: 'var(--fiori-text-secondary, #64748B)', whiteSpace: 'nowrap' }}>
          {r.lastAssessed}
        </span>
      )
    },
    {
      key: 'status',
      header: 'Status',
      width: '130px',
      sortable: true,
      render: (r) => <StatusBadge status={r.status} size="sm" />
    },
    {
      key: 'actions',
      header: 'Action',
      width: '150px',
      align: 'right',
      render: (r) => (
        <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
          <button
            type="button"
            className="fiori-btn fiori-btn-subtle"
            style={{ height: '28px', padding: '0 8px', fontSize: '11px' }}
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/assessment-results?id=${r.id}`);
            }}
          >
            View Details
          </button>
        </div>
      )
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
            S21 (200) • S/4HANA 2023
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
          boxShadow: 'var(--fiori-shadow-card)'
        }}
      >
        <SectionHeader
          title="All Recorded Assessments"
          description={`Showing ${filteredAssessments.length} of ${assessments.length} transactions assessed for S21 S/4HANA 2023.`}
        />

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

          <FilterControls
            groups={[
              {
                id: 'businessArea',
                label: 'Business Area',
                selectedValue: businessAreaFilter,
                options: [
                  { label: 'All Business Areas', value: 'ALL' },
                  ...uniqueBusinessAreas.map((b) => ({ label: b, value: b }))
                ]
              },
              {
                id: 'assessmentResult',
                label: 'Assessment Result',
                selectedValue: resultFilter,
                options: [
                  { label: 'All Results', value: 'ALL' },
                  { label: 'Explicit Successor', value: 'EXPLICIT_SUCCESSOR' },
                  { label: 'SAP GUI for HTML', value: 'SAP_GUI_HTML' },
                  { label: 'Functional Alternative', value: 'FUNCTIONAL_ALTERNATIVE' },
                  { label: 'Pending Verification', value: 'PENDING_VERIFICATION' },
                  { label: 'No Verified Match', value: 'NO_VERIFIED_MATCH' }
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
                  { label: 'Pending Verification', value: 'PENDING_VERIFICATION' }
                ]
              }
            ]}
            onFilterChange={(groupId, value) => {
              if (groupId === 'businessArea') setBusinessAreaFilter(value);
              if (groupId === 'assessmentResult') setResultFilter(value);
              if (groupId === 'classification') setClassificationFilter(value);
              if (groupId === 'status') setStatusFilter(value);
            }}
            hasActiveFilters={
              searchTerm !== '' ||
              businessAreaFilter !== 'ALL' ||
              resultFilter !== 'ALL' ||
              classificationFilter !== 'ALL' ||
              statusFilter !== 'ALL'
            }
            onReset={() => {
              setSearchTerm('');
              setBusinessAreaFilter('ALL');
              setResultFilter('ALL');
              setClassificationFilter('ALL');
              setStatusFilter('ALL');
            }}
          />
        </div>

        <DataTable
          columns={columns}
          data={filteredAssessments}
          keyExtractor={(item) => item.id}
          onRowClick={(item) => navigate(`/assessment-results?id=${item.id}`)}
          pageSize={10}
          defaultSortKey="lastAssessed"
          defaultSortOrder="desc"
        />
      </div>
    </div>
  );
};
