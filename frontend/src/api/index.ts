/**
 * Fiorify Frontend — Domain-Scoped API Facades
 *
 * Groups the central apiClient into clean domain modules so feature pages
 * import only their domain API without depending on a monolithic client.
 */

import { apiClient } from '../services/api/apiClient';

export const healthApi = {
  getHealth: () => apiClient.getHealth(),
  getSystems: () => apiClient.getSystems(),
  runDiagnostics: (systemId: string) => apiClient.runSystemDiagnostics(systemId),
  getGatewayServices: () => apiClient.getGatewayServices()
};

export const discoveryApi = {
  searchTCode: (payload: Parameters<typeof apiClient.searchTCode>[0]) =>
    apiClient.searchTCode(payload),
  discoverTransaction: (tcode: string) =>
    apiClient.discoverTransaction(tcode),
  matchFioriApps: (payload: Parameters<typeof apiClient.matchFioriApps>[0]) =>
    apiClient.matchFioriApps(payload),
  discoverAndMatch: (payload: Parameters<typeof apiClient.discoverAndMatch>[0]) =>
    apiClient.discoverAndMatch(payload)
};

export const assessmentApi = {
  list: (filters?: Parameters<typeof apiClient.getAssessments>[0]) =>
    apiClient.getAssessments(filters),
  getById: (id: string) => apiClient.getAssessmentById(id),
  create: (payload: Parameters<typeof apiClient.createAssessment>[0]) =>
    apiClient.createAssessment(payload),
  update: (id: string, payload: Parameters<typeof apiClient.updateAssessment>[1]) =>
    apiClient.updateAssessment(id, payload),
  getSummary: () => apiClient.getAssessmentSummary()
};

export const catalogueApi = {
  search: (params: Parameters<typeof apiClient.searchCatalogue>[0]) =>
    apiClient.searchCatalogue(params),
  getAppById: (appId: string) => apiClient.getCatalogueAppById(appId),
  getStatus: () => apiClient.getCatalogueStatus()
};

export const mcpApi = {
  getStatus: () => apiClient.getMcpStatus(),
  getTools: () => apiClient.getMcpTools(),
  getHealth: () => apiClient.getMcpHealth(),
  connect: () => apiClient.connectMcp(),
  disconnect: () => apiClient.disconnectMcp()
};

export { apiClient };
