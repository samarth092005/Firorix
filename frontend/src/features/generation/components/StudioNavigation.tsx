import React from 'react';
import {
  FolderKanban,
  FileText,
  Database,
  Cpu,
  Code2,
  LayoutTemplate,
  CheckCircle2,
  PackageCheck,
  Wrench,
  LucideIcon
} from 'lucide-react';
import { StudioInternalView } from '../types';

interface StudioNavigationProps {
  activeView: StudioInternalView;
  onSelectView: (view: StudioInternalView) => void;
  hasActiveProject: boolean;
}

interface NavItem {
  id: StudioInternalView;
  label: string;
  icon: LucideIcon;
  requiresProject: boolean;
  phaseTag: string;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'projects', label: '1. Projects Dashboard', icon: FolderKanban, requiresProject: false, phaseTag: 'Dashboard' },
  { id: 'requirements', label: '2. Requirements Designer', icon: FileText, requiresProject: true, phaseTag: 'Scope' },
  { id: 'data-model', label: '3. Data Model Designer', icon: Database, requiresProject: true, phaseTag: 'CDS' },
  { id: 'architecture', label: '4. Architecture Designer', icon: Cpu, requiresProject: true, phaseTag: 'RAP' },
  { id: 'abap-generator', label: '5. ABAP Generator', icon: Code2, requiresProject: true, phaseTag: 'Source' },
  { id: 'ui-generator', label: '6. Fiori UI Generator', icon: LayoutTemplate, requiresProject: true, phaseTag: 'Fiori' },
  { id: 'preview-validation', label: '7. Preview & Validation', icon: CheckCircle2, requiresProject: true, phaseTag: 'Mock V4' },
  { id: 'review-export', label: '8. Review & Export', icon: PackageCheck, requiresProject: true, phaseTag: 'ZIP' },
  { id: 'environment', label: '9. Environment & Toolchain', icon: Wrench, requiresProject: false, phaseTag: 'Diagnostics' }
];

export const StudioNavigation: React.FC<StudioNavigationProps> = ({
  activeView,
  onSelectView,
  hasActiveProject
}) => {
  return (
    <div
      style={{
        backgroundColor: '#FFFFFF',
        borderBottom: '1px solid var(--fiori-border, #E2E8F0)',
        padding: '0 20px',
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        overflowX: 'auto',
        whiteSpace: 'nowrap'
      }}
    >
      {NAV_ITEMS.map((item) => {
        const Icon = item.icon;
        const isActive = activeView === item.id;
        const isDisabled = item.requiresProject && !hasActiveProject;

        return (
          <button
            key={item.id}
            type="button"
            disabled={isDisabled}
            onClick={() => onSelectView(item.id)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '12px 14px',
              border: 'none',
              background: 'none',
              cursor: isDisabled ? 'not-allowed' : 'pointer',
              opacity: isDisabled ? 0.45 : 1,
              borderBottom: isActive ? '3px solid #0066FF' : '3px solid transparent',
              color: isActive ? '#0066FF' : (isDisabled ? '#94A3B8' : '#334155'),
              fontWeight: isActive ? 700 : 500,
              fontSize: '13px',
              transition: 'all 0.15s ease',
              outline: 'none',
              position: 'relative'
            }}
            title={isDisabled ? 'Select or create a project from Projects Dashboard to open this workspace' : item.label}
          >
            <Icon size={15} color={isActive ? '#0066FF' : (isDisabled ? '#94A3B8' : '#64748B')} />
            <span>{item.label}</span>
            <span
              style={{
                fontSize: '10px',
                padding: '2px 6px',
                borderRadius: '10px',
                backgroundColor: isActive ? '#EFF6FF' : '#F1F5F9',
                color: isActive ? '#0066FF' : '#64748B',
                fontWeight: 600,
                marginLeft: '2px'
              }}
            >
              {item.phaseTag}
            </span>
          </button>
        );
      })}
    </div>
  );
};
