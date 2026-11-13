import React from 'react';
import { createBrowserRouter, Navigate, useSearchParams } from 'react-router-dom';
import { AppShell } from '../components/layout/AppShell';
import { localStore } from '../services/mock/localStore';

// Top-level Suspense Fallback for standalone routes (Landing, Login)
const TopLevelSuspenseFallback: React.FC = () => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', width: '100vw' }}>
    <div style={{ textAlign: 'center' }}>
      <div style={{
        width: '40px',
        height: '40px',
        border: '3px solid #E5E7EB',
        borderTop: '3px solid #0070F2',
        borderRadius: '50%',
        animation: 'spin 0.8s linear infinite',
        margin: '0 auto 12px auto'
      }} />
      <span style={{ fontSize: '13px', color: '#6B7280', fontFamily: '72, -apple-system, BlinkMacSystemFont, sans-serif' }}>
        Loading Fiorify...
      </span>
    </div>
  </div>
);

const withTopLevelSuspense = (Component: React.ComponentType) => (
  <React.Suspense fallback={<TopLevelSuspenseFallback />}>
    <Component />
  </React.Suspense>
);

// Sprint 1 & 2 Canonical Features (Code-split via dynamic import)
const LandingPage = React.lazy(() => import('../features/landing/LandingPage').then(m => ({ default: m.LandingPage })));
const LoginPage = React.lazy(() => import('../features/auth/LoginPage').then(m => ({ default: m.LoginPage })));
const OverviewPage = React.lazy(() => import('../features/overview/OverviewPage').then(m => ({ default: m.OverviewPage })));
const TransactionDiscoveryPage = React.lazy(() => import('../features/transaction-discovery/TransactionDiscoveryPage').then(m => ({ default: m.TransactionDiscoveryPage })));
const AssessmentResultsPage = React.lazy(() => import('../features/assessment-results/AssessmentResultsPage').then(m => ({ default: m.AssessmentResultsPage })));
const AssessmentHistoryPage = React.lazy(() => import('../features/assessment-history/AssessmentHistoryPage').then(m => ({ default: m.AssessmentHistoryPage })));
const SystemConfigurationPage = React.lazy(() => import('../features/system-configuration/SystemConfigurationPage').then(m => ({ default: m.SystemConfigurationPage })));
const McpManagementPage = React.lazy(() => import('../features/mcp/McpManagementPage').then(m => ({ default: m.McpManagementPage })));

// Preserved Legacy Features (Code-split via dynamic import)
const SystemsPage = React.lazy(() => import('../features/systems/SystemsPage').then(m => ({ default: m.SystemsPage })));
const SystemDetailPage = React.lazy(() => import('../features/systems/SystemDetailPage').then(m => ({ default: m.SystemDetailPage })));
const ExplorerPage = React.lazy(() => import('../features/explorer/ExplorerPage').then(m => ({ default: m.ExplorerPage })));
const TCodeDetailPage = React.lazy(() => import('../features/explorer/TCodeDetailPage').then(m => ({ default: m.TCodeDetailPage })));
const JobsPage = React.lazy(() => import('../features/jobs/JobsPage').then(m => ({ default: m.JobsPage })));
const AssessmentsPage = React.lazy(() => import('../features/assessments/AssessmentsPage').then(m => ({ default: m.AssessmentsPage })));
const AssessmentWorkspacePage = React.lazy(() => import('../features/assessments/AssessmentWorkspacePage').then(m => ({ default: m.AssessmentWorkspacePage })));
const CataloguePage = React.lazy(() => import('../features/catalogue/CataloguePage').then(m => ({ default: m.CataloguePage })));
const AppDetailPage = React.lazy(() => import('../features/catalogue/AppDetailPage').then(m => ({ default: m.AppDetailPage })));
const GenerationStudioPage = React.lazy(() => import('../features/generation/GenerationStudioPage').then(m => ({ default: m.GenerationStudioPage })));
const GeneratedArtifactsPage = React.lazy(() => import('../features/generation/GeneratedArtifactsPage').then(m => ({ default: m.GeneratedArtifactsPage })));
const SettingsPage = React.lazy(() => import('../features/settings/SettingsPage').then(m => ({ default: m.SettingsPage })));
const NotFoundPage = React.lazy(() => import('../features/notfound/NotFoundPage').then(m => ({ default: m.NotFoundPage })));

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

  return <Navigate to={`/assessment-results/${targetId}?tab=${targetTab}`} replace />;
};

export const router = createBrowserRouter([
  // Public Landing Page
  {
    path: '/',
    element: withTopLevelSuspense(LandingPage)
  },
  {
    path: '/landing',
    element: withTopLevelSuspense(LandingPage)
  },
  // Public Split Login Page
  {
    path: '/login',
    element: withTopLevelSuspense(LoginPage)
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
        element: <Navigate to="/transaction-discovery" replace />
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
        element: <Navigate to="/generation-studio" replace />
      },
      {
        path: 'generation/artifacts',
        element: <GeneratedArtifactsPage />
      },
      {
        path: 'validation',
        element: <Navigate to="/generation-studio?view=preview-validation" replace />
      },
      {
        path: 'approvals',
        element: <Navigate to="/assessment-history?status=PENDING_REVIEW" replace />
      },
      {
        path: 'audit',
        element: <Navigate to="/assessment-history" replace />
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
