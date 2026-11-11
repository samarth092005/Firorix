import React from 'react';
import { createBrowserRouter, Navigate, useSearchParams } from 'react-router-dom';
import { AppShell } from '../components/layout/AppShell';

// Sprint 1 & 2 Canonical Features
import { LandingPage } from '../features/landing/LandingPage';
import { LoginPage } from '../features/auth/LoginPage';
import { OverviewPage } from '../features/overview/OverviewPage';
import { TransactionDiscoveryPage } from '../features/transaction-discovery/TransactionDiscoveryPage';
import { AssessmentResultsPage } from '../features/assessment-results/AssessmentResultsPage';
import { AssessmentHistoryPage } from '../features/assessment-history/AssessmentHistoryPage';
import { SystemConfigurationPage } from '../features/system-configuration/SystemConfigurationPage';
import { McpManagementPage } from '../features/mcp/McpManagementPage';

// Preserved Legacy Features (Non-destructive preservation)
import { SystemsPage } from '../features/systems/SystemsPage';
import { SystemDetailPage } from '../features/systems/SystemDetailPage';
import { ExplorerPage } from '../features/explorer/ExplorerPage';
import { TCodeDetailPage } from '../features/explorer/TCodeDetailPage';
import { JobsPage } from '../features/jobs/JobsPage';
import { AssessmentsPage } from '../features/assessments/AssessmentsPage';
import { NewAssessmentPage } from '../features/assessments/NewAssessmentPage';
import { AssessmentWorkspacePage } from '../features/assessments/AssessmentWorkspacePage';
import { CataloguePage } from '../features/catalogue/CataloguePage';
import { AppDetailPage } from '../features/catalogue/AppDetailPage';
import { GenerationStudioPage } from '../features/generation/GenerationStudioPage';
import { GeneratedArtifactsPage } from '../features/generation/GeneratedArtifactsPage';
import { ValidationPage } from '../features/validation/ValidationPage';
import { ApprovalsPage } from '../features/governance/ApprovalsPage';
import { AuditPage } from '../features/audit/AuditPage';
import { SettingsPage } from '../features/settings/SettingsPage';
import { NotFoundPage } from '../features/notfound/NotFoundPage';
import { localStore } from '../services/mock/localStore';

/**
 * Contextual Redirect for Legacy Routes
 */
interface ContextualRedirectProps {
  targetTab: string;
  preferredAssessmentId?: string;
}

const ContextualAssessmentRedirect: React.FC<ContextualRedirectProps> = ({
  targetTab,
  preferredAssessmentId
}) => {
  const [searchParams] = useSearchParams();
  const assessments = localStore.getAssessments();
  const idFromQuery = searchParams.get('assessmentId') || searchParams.get('id');

  let targetId = idFromQuery;
  if (!targetId) {
    if (preferredAssessmentId && assessments.some(a => a.id === preferredAssessmentId)) {
      targetId = preferredAssessmentId;
    } else {
      targetId = assessments[0]?.id || 'ASM-2026-001';
    }
  }

  return <Navigate to={`/assessments/${targetId}?tab=${targetTab}`} replace />;
};

export const router = createBrowserRouter([
  // Public Landing Page
  {
    path: '/',
    element: <LandingPage />
  },
  {
    path: '/landing',
    element: <LandingPage />
  },
  // Public Split Login Page
  {
    path: '/login',
    element: <LoginPage />
  },
  // Enterprise Application Shell
  {
    element: <AppShell />,
    children: [
      // 1. Overview Dashboard (Sprint 2 Centerpiece / Work Page)
      {
        path: '/overview',
        element: <OverviewPage />
      },
      // 2. Transaction Discovery (Sprint 1 Core & Transaction Checker integration)
      {
        path: '/transaction-discovery',
        element: <TransactionDiscoveryPage />
      },
      // Backward compatibility for transaction-checker route
      {
        path: '/transaction-checker',
        element: <TransactionDiscoveryPage />
      },
      // 3. Assessment Results
      {
        path: '/assessment-results',
        element: <AssessmentResultsPage />
      },
      {
        path: '/assessment-results/:id',
        element: <AssessmentResultsPage />
      },
      // 4. Assessment History
      {
        path: '/assessment-history',
        element: <AssessmentHistoryPage />
      },
      // 5. System & Configuration
      {
        path: '/system-configuration',
        element: <SystemConfigurationPage />
      },
      // SAP Fiori MCP Management
      {
        path: '/system-configuration/mcp',
        element: <McpManagementPage />
      },
      {
        path: '/mcp',
        element: <McpManagementPage />
      },
      // Redirects for legacy routes
      {
        path: '/dashboard',
        element: <Navigate to="/overview" replace />
      },
      {
        path: 'systems',
        element: <Navigate to="/system-configuration" replace />
      },
      {
        path: 'systems/:id',
        element: <SystemDetailPage />
      },
      {
        path: 'explorer',
        element: <ExplorerPage />
      },
      {
        path: 'explorer/:tcode',
        element: <TCodeDetailPage />
      },
      {
        path: 'jobs',
        element: <JobsPage />
      },
      {
        path: 'jobs/:id',
        element: <JobsPage />
      },
      {
        path: 'assessments',
        element: <Navigate to="/assessment-history" replace />
      },
      {
        path: 'assessments/new',
        element: <NewAssessmentPage />
      },
      {
        path: 'assessments/:id',
        element: <AssessmentWorkspacePage />
      },
      {
        path: 'catalogue',
        element: <CataloguePage />
      },
      {
        path: 'catalogue/:id',
        element: <AppDetailPage />
      },
      {
        path: 'requirements',
        element: <ContextualAssessmentRedirect targetTab="business_context_requirements" preferredAssessmentId="ASM-2026-001" />
      },
      {
        path: 'fit-gap',
        element: <ContextualAssessmentRedirect targetTab="fit_gap" preferredAssessmentId="ASM-2026-001" />
      },
      {
        path: 'recommendations',
        element: <ContextualAssessmentRedirect targetTab="recommendation" preferredAssessmentId="ASM-2026-001" />
      },
      {
        path: 'generation-studio',
        element: <GenerationStudioPage />
      },
      {
        path: 'generation',
        element: <GenerationStudioPage />
      },
      {
        path: 'generation/artifacts',
        element: <GeneratedArtifactsPage />
      },
      {
        path: 'validation',
        element: <ValidationPage />
      },
      {
        path: 'approvals',
        element: <ApprovalsPage />
      },
      {
        path: 'audit',
        element: <AuditPage />
      },
      {
        path: 'settings',
        element: <SettingsPage />
      },
      {
        path: '*',
        element: <NotFoundPage />
      }
    ]
  }
]);
