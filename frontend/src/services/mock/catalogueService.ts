import { FioriApplication, ApiResponse, FilterState } from '../../types';
import { localStore } from './localStore';

const delay = (ms = 150) => new Promise(resolve => setTimeout(resolve, ms));

export const catalogueService = {
  async searchCatalogue(filter?: FilterState): Promise<ApiResponse<FioriApplication[]>> {
    await delay();
    let apps = localStore.getCatalogue();

    if (filter?.searchQuery) {
      const q = filter.searchQuery.toLowerCase().trim();
      apps = apps.filter(a =>
        a.appId.toLowerCase().includes(q) ||
        a.appName.toLowerCase().includes(q) ||
        a.businessRole.toLowerCase().includes(q) ||
        a.lineOfBusiness.toLowerCase().includes(q)
      );
    }

    return { data: apps, success: true };
  },

  async getAppById(id: string): Promise<ApiResponse<FioriApplication | null>> {
    await delay();
    const apps = localStore.getCatalogue();
    const match = apps.find(a => a.id === id || a.appId.toLowerCase() === id.toLowerCase()) || null;
    return { data: match, success: !!match };
  }
};
