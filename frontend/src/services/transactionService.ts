import { transactionSearchService } from '../features/transaction-checker/services/transactionSearchService';
import { TCodeSearchResponse } from '../features/transaction-checker/types';

export interface ITransactionService {
  verifyTransaction(systemId: string, tcode: string): Promise<TCodeSearchResponse>;
}

class TransactionService implements ITransactionService {
  async verifyTransaction(systemId: string = 'S21-200', tcode: string): Promise<TCodeSearchResponse> {
    return transactionSearchService.search({
      systemId,
      tcode,
      language: 'EN'
    });
  }
}

export const transactionService = new TransactionService();
