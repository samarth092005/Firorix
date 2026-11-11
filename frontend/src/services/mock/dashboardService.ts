import { ApiResponse, Assessment, DiscoveryJob } from '../../types';
import { localStore } from './localStore';

export interface DashboardMetrics {
  transactionsAssessedCount: number;
  standardFioriAppsEvaluatedCount: number;
  openFunctionalGapsCount: number;
  draftApplicationsCount: number;
  recentAssessments: Assessment[];
  recentJobs: DiscoveryJob[];
  systemHealth: {
    totalSystems: number;
    connectedSystems: number;
    offlineSystems: number;
  };
}

const delay = (ms = 150) => new Promise(resolve => setTimeout(resolve, ms));

export const dashboardService = {
  async getMetrics(): Promise<ApiResponse<DashboardMetrics>> {
    await delay();
    const assessments = localStore.getAssessments();
    const transactions = localStore.getTransactions();
    const catalogue = localStore.getCatalogue();
    const fitGap = localStore.getFitGap();
    const blueprints = localStore.getBlueprints();
    const jobs = localStore.getJobs();
    const systems = localStore.getSystems();

    const openGaps = fitGap.filter(f => f.coverageStatus === 'UNSUPPORTED' || f.coverageStatus === 'UNKNOWN').length;

    return {
      success: true,
      data: {
        transactionsAssessedCount: transactions.filter(t => t.assessmentStatus !== 'NOT_ASSESSED').length,
        standardFioriAppsEvaluatedCount: catalogue.length,
        openFunctionalGapsCount: openGaps,
        draftApplicationsCount: Object.keys(blueprints).length,
        recentAssessments: assessments.slice(0, 5),
        recentJobs: jobs.slice(0, 4),
        systemHealth: {
          totalSystems: systems.length,
          connectedSystems: systems.filter(s => s.connectionStatus === 'CONNECTED_SIMULATED').length,
          offlineSystems: systems.filter(s => s.connectionStatus === 'OFFLINE').length
        }
      }
    };
  }
};
