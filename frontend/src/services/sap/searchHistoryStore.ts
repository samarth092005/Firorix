import { SearchHistoryItem, SearchStatusCode, TransactionClassification } from '../contracts/types';

const STORAGE_KEY = 'Fiorify_phase1_search_history_v1';

export class SearchHistoryStore {
  private inMemoryFallback: SearchHistoryItem[] = [];

  public getHistory(): SearchHistoryItem[] {
    try {
      if (typeof localStorage !== 'undefined') {
        const data = localStorage.getItem(STORAGE_KEY);
        if (data) {
          const parsed = JSON.parse(data);
          if (Array.isArray(parsed)) return parsed;
        }
      }
      return [...this.inMemoryFallback];
    } catch {
      return [...this.inMemoryFallback];
    }
  }

  public addEntry(entry: {
    systemId: string;
    tcode: string;
    resultStatus: SearchStatusCode;
    classification?: TransactionClassification;
    candidateCount: number;
  }): SearchHistoryItem {
    const history = this.getHistory();
    const newItem: SearchHistoryItem = {
      id: `HIST-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      systemId: entry.systemId,
      tcode: entry.tcode,
      timestamp: new Date().toISOString(),
      resultStatus: entry.resultStatus,
      classification: entry.classification,
      candidateCount: entry.candidateCount
    };

    // Prepend, deduplicate by tcode+system, keep latest 15
    const filtered = history.filter(
      (h) => !(h.tcode === entry.tcode && h.systemId === entry.systemId)
    );
    const updated = [newItem, ...filtered].slice(0, 15);

    this.inMemoryFallback = updated;

    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      }
    } catch {
      // Ignore quota errors in demo mode
    }

    return newItem;
  }

  public clearHistory(): void {
    this.inMemoryFallback = [];
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem(STORAGE_KEY);
      }
    } catch {
      // Ignore
    }
  }
}

export const searchHistoryStore = new SearchHistoryStore();
