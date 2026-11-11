import {
  SapSystem,
  TransactionCode,
  Assessment,
  BusinessRequirement,
  FioriApplication,
  FitGapResult,
  Recommendation,
  GeneratedApplicationBlueprint,
  ValidationFinding,
  DiscoveryJob,
  AuditEvent
} from '../../types';

import {
  INITIAL_SYSTEMS,
  INITIAL_TRANSACTIONS,
  INITIAL_ASSESSMENTS,
  INITIAL_TECHNICAL_OBJECTS,
  INITIAL_REQUIREMENTS,
  INITIAL_FIORI_CATALOGUE,
  INITIAL_FIT_GAP,
  INITIAL_RECOMMENDATIONS,
  INITIAL_BLUEPRINTS,
  INITIAL_VALIDATION_FINDINGS,
  INITIAL_DISCOVERY_JOBS,
  INITIAL_AUDIT_EVENTS
} from './demoData';

const STORAGE_KEYS = {
  SYSTEMS: 'fiorix_systems',
  TRANSACTIONS: 'fiorix_transactions',
  ASSESSMENTS: 'fiorix_assessments',
  REQUIREMENTS: 'fiorix_requirements',
  CATALOGUE: 'fiorix_catalogue',
  FIT_GAP: 'fiorix_fit_gap',
  RECOMMENDATIONS: 'fiorix_recommendations',
  BLUEPRINTS: 'fiorix_blueprints',
  JOBS: 'fiorix_jobs',
  AUDIT: 'fiorix_audit'
};

function getItem<T>(key: string, defaultValue: T): T {
  try {
    if (typeof localStorage === 'undefined') return defaultValue;
    const raw = localStorage.getItem(key);
    if (!raw) return defaultValue;
    return JSON.parse(raw);
  } catch (e) {
    console.warn(`Error reading localStorage key ${key}:`, e);
    return defaultValue;
  }
}

function setItem<T>(key: string, value: T): void {
  try {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.warn(`Error writing localStorage key ${key}:`, e);
  }
}

export const localStore = {
  getSystems(): SapSystem[] {
    return getItem(STORAGE_KEYS.SYSTEMS, INITIAL_SYSTEMS);
  },
  saveSystems(data: SapSystem[]): void {
    setItem(STORAGE_KEYS.SYSTEMS, data);
  },

  getTransactions(): TransactionCode[] {
    return getItem(STORAGE_KEYS.TRANSACTIONS, INITIAL_TRANSACTIONS);
  },
  saveTransactions(data: TransactionCode[]): void {
    setItem(STORAGE_KEYS.TRANSACTIONS, data);
  },

  getAssessments(): Assessment[] {
    return getItem(STORAGE_KEYS.ASSESSMENTS, INITIAL_ASSESSMENTS);
  },
  saveAssessments(data: Assessment[]): void {
    setItem(STORAGE_KEYS.ASSESSMENTS, data);
  },

  getRequirements(): BusinessRequirement[] {
    return getItem(STORAGE_KEYS.REQUIREMENTS, INITIAL_REQUIREMENTS);
  },
  saveRequirements(data: BusinessRequirement[]): void {
    setItem(STORAGE_KEYS.REQUIREMENTS, data);
  },

  getCatalogue(): FioriApplication[] {
    return getItem(STORAGE_KEYS.CATALOGUE, INITIAL_FIORI_CATALOGUE);
  },
  saveCatalogue(data: FioriApplication[]): void {
    setItem(STORAGE_KEYS.CATALOGUE, data);
  },

  getFitGap(): FitGapResult[] {
    return getItem(STORAGE_KEYS.FIT_GAP, INITIAL_FIT_GAP);
  },
  saveFitGap(data: FitGapResult[]): void {
    setItem(STORAGE_KEYS.FIT_GAP, data);
  },

  getRecommendations(): Recommendation[] {
    return getItem(STORAGE_KEYS.RECOMMENDATIONS, INITIAL_RECOMMENDATIONS);
  },
  saveRecommendations(data: Recommendation[]): void {
    setItem(STORAGE_KEYS.RECOMMENDATIONS, data);
  },

  getBlueprints(): Record<string, GeneratedApplicationBlueprint> {
    return getItem(STORAGE_KEYS.BLUEPRINTS, INITIAL_BLUEPRINTS);
  },
  saveBlueprints(data: Record<string, GeneratedApplicationBlueprint>): void {
    setItem(STORAGE_KEYS.BLUEPRINTS, data);
  },

  getJobs(): DiscoveryJob[] {
    return getItem(STORAGE_KEYS.JOBS, INITIAL_DISCOVERY_JOBS);
  },
  saveJobs(data: DiscoveryJob[]): void {
    setItem(STORAGE_KEYS.JOBS, data);
  },

  getAuditEvents(): AuditEvent[] {
    return getItem(STORAGE_KEYS.AUDIT, INITIAL_AUDIT_EVENTS);
  },
  saveAuditEvents(data: AuditEvent[]): void {
    setItem(STORAGE_KEYS.AUDIT, data);
  },

  getTechnicalObjects(): typeof INITIAL_TECHNICAL_OBJECTS {
    return INITIAL_TECHNICAL_OBJECTS;
  },

  getValidationFindings(): ValidationFinding[] {
    return INITIAL_VALIDATION_FINDINGS;
  },

  resetAll(): void {
    Object.values(STORAGE_KEYS).forEach(k => localStorage.removeItem(k));
  }
};
