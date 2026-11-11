import { apiClient } from './api/apiClient';

export interface CatalogueStatusResponse {
  status: 'LOADED' | 'OUT_OF_SYNC' | 'NOT_INITIALIZED';
  version: string;
  totalAppsCatalogued: number;
  lastUpdated: string;
  isCuratedDemo: boolean;
}

export interface ICatalogueStatusService {
  getCatalogueStatus(): Promise<CatalogueStatusResponse>;
}

class CatalogueStatusService implements ICatalogueStatusService {
  async getCatalogueStatus(): Promise<CatalogueStatusResponse> {
    try {
      const res = await apiClient.getCatalogueStatus();
      return {
        status: res.status.totalRecords > 0 ? 'LOADED' : 'NOT_INITIALIZED',
        version: res.status.sourceVersion || 'SAP S/4HANA Reference Library',
        totalAppsCatalogued: res.status.totalRecords,
        lastUpdated: res.status.lastSuccessfulImport || 'Not available',
        isCuratedDemo: false
      };
    } catch {
      return {
        status: 'NOT_INITIALIZED',
        version: 'SAP S/4HANA Reference Library',
        totalAppsCatalogued: 0,
        lastUpdated: 'Unavailable (Backend Offline)',
        isCuratedDemo: false
      };
    }
  }
}

export const catalogueStatusService = new CatalogueStatusService();
