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
  Send,
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
  { id: 'spec-lifecycle', label: '5. Specification Lifecycle', icon: CheckCircle2, requiresProject: true, phaseTag: 'Governance' },
  { id: 'abap-generator', label: '6. ABAP Generator', icon: Code2, requiresProject: true, phaseTag: 'Source' },
  { id: 'ui-generator', label: '7. Fiori UI Generator', icon: LayoutTemplate, requiresProject: true, phaseTag: 'Fiori' },
  { id: 'preview-validation', label: '8. Preview & Validation', icon: CheckCircle2, requiresProject: true, phaseTag: 'Mock V4' },
  { id: 'review-export', label: '9. Review & Export', icon: PackageCheck, requiresProject: true, phaseTag: 'ZIP' },
  { id: 'deployment', label: '10. SAP Deployment', icon: Send, requiresProject: true, phaseTag: 'SAP DEV' },
  { id: 'environment', label: '11. Environment & Toolchain', icon: Wrench, requiresProject: false, phaseTag: 'Diagnostics' }
];

export const StudioNavigation: React.FC<StudioNavigationProps> = ({
  activeView,
  onSelectView,
  hasActiveProject
}) => {
  return (
    <nav className="studio-navigation-bar" aria-label="Generation Studio 9 Phases Navigation">
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
            className={`studio-nav-btn ${isActive ? 'active' : ''}`}
            title={isDisabled ? 'Select or create a project from Projects Dashboard to open this workspace' : item.label}
          >
            <Icon size={15} color={isActive ? 'var(--studio-primary)' : (isDisabled ? 'var(--studio-text-subtle)' : 'var(--studio-text-muted)')} />
            <span>{item.label}</span>
            <span className="studio-nav-tag">
              {item.phaseTag}
            </span>
          </button>
        );
      })}
    </nav>
  );
};
