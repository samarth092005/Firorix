import { TransactionCode, TechnicalObject, ApiResponse, FilterState } from '../../types';
import { localStore } from './localStore';

const delay = (ms = 150) => new Promise(resolve => setTimeout(resolve, ms));

export const transactionService = {
  async getAllTransactions(filter?: FilterState): Promise<ApiResponse<TransactionCode[]>> {
    await delay();
    let txs = localStore.getTransactions();

    if (filter?.searchQuery) {
      const q = filter.searchQuery.toUpperCase().trim();
      txs = txs.filter(t => t.tcode.toUpperCase().includes(q) || t.description.toUpperCase().includes(q) || t.programName.toUpperCase().includes(q));
    }

    if (filter?.module && filter.module !== 'ALL') {
      txs = txs.filter(t => t.module === filter.module);
    }

    if (filter?.status && filter.status !== 'ALL') {
      txs = txs.filter(t => t.assessmentStatus === filter.status);
    }

    return { data: txs, success: true };
  },

  async getTransactionByCode(tcode: string): Promise<ApiResponse<TransactionCode | null>> {
    await delay();
    const txs = localStore.getTransactions();
    const match = txs.find(t => t.tcode.toUpperCase() === tcode.toUpperCase()) || null;
    return { data: match, success: !!match };
  },

  async getTechnicalObjectsForTCode(tcode: string): Promise<ApiResponse<TechnicalObject[]>> {
    await delay();
    const objs = localStore.getTechnicalObjects();
    // In our rich demo data, objects are mapped to VA01 / generic
    return { data: objs, success: true };
  }
};
