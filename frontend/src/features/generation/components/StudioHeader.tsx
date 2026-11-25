import React from 'react';
import { uiConfig } from '../../../config/uiConfig';
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
    <header className="studio-header">
      {/* Top Banner: Breadcrumbs & Actions */}
      <div className="studio-header-top">
        <div className="studio-breadcrumbs">
          {project && (
            <button
              type="button"
              className="studio-btn-back"
              onClick={onBackToDashboard}
            >
              <ArrowLeft size={14} /> Projects Dashboard
            </button>
          )}
          {project && <span style={{ color: 'var(--studio-text-subtle)' }}>/</span>}
          <div className="studio-brand-title">
            <Layers size={16} color="var(--studio-primary)" />
            <span>{uiConfig.brand.productName}</span>
          </div>
        </div>

        {/* Studio Actions */}
        <div className="studio-header-actions">
          <button
            type="button"
            className="studio-btn-icon"
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
      <div className="studio-header-main">
        <div>
          <div className="studio-project-title-group">
            <h1 className="studio-project-heading">
              {project ? project.projectName : 'Custom Fiori Application Generation Studio'}
            </h1>

            {project && (
              <span className={`studio-chip ${project.origin === 'DISCOVERY_BUILD' ? 'primary' : ''}`}>
                {project.origin === 'DISCOVERY_BUILD' ? 'DISCOVERY BUILD' : 'STANDALONE WORKSPACE'}
              </span>
            )}

            {project && (
              <span className={`studio-chip ${isArchived ? '' : 'success'}`}>
                Status: {project.lifecycleStatus}
              </span>
            )}
          </div>

          <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: 'var(--studio-text-muted)' }}>
            {project
              ? (project.description || 'Clean Core custom SAP Fiori application synthesized for SAP S/4HANA.')
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
              color: 'var(--studio-text-muted)',
              padding: '8px 14px',
              backgroundColor: 'var(--studio-surface-subtle)',
              borderRadius: 'var(--studio-radius-sm)',
              border: '1px solid var(--studio-border)'
            }}
          >
            {project.sourceTransactionCode && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ color: 'var(--studio-text-subtle)', fontWeight: 600 }}>Source T-Code:</span>
                <span
                  style={{
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: '4px',
                    backgroundColor: '#EFF6FF',
                    color: '#1D4ED8',
                    border: '1px solid #BFDBFE'
                  }}
                >
                  {project.sourceTransactionCode}
                </span>
              </div>
            )}

            <div>
              <span style={{ color: 'var(--studio-text-subtle)', fontWeight: 600 }}>Target Release:</span>{' '}
              <span style={{ fontWeight: 600, color: 'var(--studio-text-main)' }}>
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

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ color: 'var(--studio-text-subtle)', fontWeight: 600 }}>Project:</span>
              <span style={{ fontSize: '11px', color: '#64748B' }}>
                {project.projectId}
              </span>
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
    </header>
  );
};
