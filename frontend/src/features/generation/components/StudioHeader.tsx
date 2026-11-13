import React from 'react';
import {
  Layers,
  FolderGit2,
  ShieldCheck,
  Server,
  RefreshCw,
  ArrowLeft,
  Calendar,
  AlertTriangle,
  HardDrive
} from 'lucide-react';
import { GenerationProject } from '../types';

interface StudioHeaderProps {
  project: GenerationProject | null;
  onBackToDashboard: () => void;
  onRefresh: () => void;
  isLoading?: boolean;
}

export const StudioHeader: React.FC<StudioHeaderProps> = ({
  project,
  onBackToDashboard,
  onRefresh,
  isLoading
}) => {
  const isArchived = project?.lifecycleStatus === 'ARCHIVED';

  return (
    <div
      style={{
        backgroundColor: '#FFFFFF',
        borderBottom: '1px solid var(--fiori-border, #E2E8F0)',
        padding: '16px 24px',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)'
      }}
    >
      {/* Top Banner: Breadcrumbs & Local-First Indicator */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
          marginBottom: '10px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {project && (
            <button
              type="button"
              className="fiori-btn fiori-btn-subtle"
              style={{ padding: '4px 8px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}
              onClick={onBackToDashboard}
            >
              <ArrowLeft size={14} /> Projects Dashboard
            </button>
          )}
          {project && <span style={{ color: '#94A3B8' }}>/</span>}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Layers size={16} color="#0066FF" />
            <span style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A' }}>
              FioriX Generation Studio
            </span>
          </div>
          <span
            style={{
              fontSize: '11px',
              padding: '2px 8px',
              borderRadius: '12px',
              backgroundColor: '#EFF6FF',
              color: '#0066FF',
              fontWeight: 700,
              border: '1px solid #BFDBFE'
            }}
          >
            Studio Active • Local-First
          </span>
        </div>

        {/* Local-First Indicator Pill */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
 

          <button
            type="button"
            className="fiori-btn fiori-btn-subtle"
            style={{ padding: '4px 10px', fontSize: '12px', height: '28px', display: 'flex', alignItems: 'center', gap: '6px' }}
            onClick={onRefresh}
            disabled={isLoading}
            title="Refresh current workspace"
          >
            <RefreshCw size={13} className={isLoading ? 'spin' : ''} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Main Title Row & Context Chips */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: '16px'
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <h1
              className="fiori-page-title"
              style={{
                margin: 0,
                fontSize: '20px',
                fontWeight: 700,
                color: '#0F172A',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              {project ? project.projectName : 'Custom Fiori Application Generation Studio'}
            </h1>

            {project && (
              <span
                style={{
                  fontSize: '11px',
                  padding: '2px 8px',
                  borderRadius: '4px',
                  backgroundColor: project.origin === 'DISCOVERY_BUILD' ? '#EDE9FE' : '#F1F5F9',
                  color: project.origin === 'DISCOVERY_BUILD' ? '#6D28D9' : '#475569',
                  fontWeight: 700,
                  border: `1px solid ${project.origin === 'DISCOVERY_BUILD' ? '#DDD6FE' : '#E2E8F0'}`
                }}
              >
                {project.origin === 'DISCOVERY_BUILD' ? 'DISCOVERY BUILD' : 'STANDALONE WORKSPACE'}
              </span>
            )}

            {project && (
              <span
                style={{
                  fontSize: '11px',
                  padding: '2px 8px',
                  borderRadius: '4px',
                  backgroundColor: isArchived ? '#FEE2E2' : '#DCFCE7',
                  color: isArchived ? '#991B1B' : '#166534',
                  fontWeight: 700,
                  border: `1px solid ${isArchived ? '#FCA5A5' : '#86EFAC'}`
                }}
              >
                Status: {project.lifecycleStatus}
              </span>
            )}
          </div>

          <p
            className="fiori-page-subtitle"
            style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#64748B' }}
          >
            {project
              ? (project.description || 'Custom RAP Managed application development project under Clean Core architecture.')
              : 'Architect, generate, validate and export Clean Core custom SAP Fiori applications for genuine functional gaps.'}
          </p>
        </div>

        {/* Project Context Metadata Bar */}
        {project && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
              flexWrap: 'wrap',
              fontSize: '12px',
              color: '#475569',
              padding: '8px 12px',
              backgroundColor: '#F8FAFC',
              borderRadius: '6px',
              border: '1px solid #E2E8F0'
            }}
          >
            <div>
              <span style={{ color: '#94A3B8', fontWeight: 600 }}>Project ID:</span>{' '}
              <code style={{ fontWeight: 700, color: '#0F172A' }}>{project.projectId}</code>
            </div>

            {project.sourceTransactionCode && (
              <div>
                <span style={{ color: '#94A3B8', fontWeight: 600 }}>T-Code:</span>{' '}
                <span
                  style={{
                    fontWeight: 700,
                    padding: '1px 6px',
                    borderRadius: '3px',
                    backgroundColor: '#FEF3C7',
                    color: '#92400E'
                  }}
                >
                  {project.sourceTransactionCode}
                </span>
              </div>
            )}

            {project.sourceAssessmentId && (
              <div>
                <span style={{ color: '#94A3B8', fontWeight: 600 }}>Assessment:</span>{' '}
                <code style={{ color: '#0284C7' }}>{project.sourceAssessmentId}</code>
              </div>
            )}

            <div>
              <span style={{ color: '#94A3B8', fontWeight: 600 }}>Target:</span>{' '}
              <span style={{ fontWeight: 600 }}>
                {project.targetRelease || 'SAP S/4HANA 2023'}
              </span>
              {project.sourceSystemId && (
                <span style={{ color: '#64748B' }}>
                  {' '}
                  ({project.sourceSystemId}
                  {project.sourceClient ? ` / ${project.sourceClient}` : ''})
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {isArchived && (
        <div
          style={{
            marginTop: '12px',
            padding: '8px 14px',
            backgroundColor: '#FEF2F2',
            border: '1px solid #FCA5A5',
            borderRadius: '6px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '12px',
            color: '#991B1B'
          }}
        >
          <AlertTriangle size={15} color="#DC2626" />
          <span>
            This project is currently <strong>ARCHIVED</strong> (Read-Only). Restore the project to resume editing and future generation milestones.
          </span>
        </div>
      )}
    </div>
  );
};
