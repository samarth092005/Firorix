import { CatalogueReference } from '../contracts/types';
import { OFFICIAL_FIORI_CATALOGUE_BASELINE } from './catalogueMetadata';

export interface CatalogueStatusInfo {
  source: string;
  officialPortalUrl: string;
  status: 'LOADED' | 'OUT_OF_SYNC' | 'NOT_INITIALIZED';
  totalApps: number;
  lastUpdated: string;
  importVersion: string;
  apiAvailabilityNote: string;
}

export interface IFioriCatalogueAdapter {
  searchApps(query: string, release?: string): Promise<CatalogueReference[]>;
  getAppById(appId: string): Promise<CatalogueReference | null>;
  getAppsByTCode(tcode: string): Promise<CatalogueReference[]>;
  getCatalogueStatus(): Promise<CatalogueStatusInfo>;
  importOfficialExport(records: Partial<CatalogueReference>[], sourceVersion: string): Promise<{ importedCount: number; status: string }>;
}

/**
 * ARCHITECTURAL INVESTIGATION REPORT: SAP FIORI APPS REFERENCE LIBRARY (FAL)
 * Target: https://fal.cloud.sap
 *
 * Findings:
 * 1. SAP does not provide an open, unauthenticated public REST or OData API endpoint for automated live consumption.
 * 2. The portal requires SAP Universal ID / SAP Passport authentication for personalized downloads.
 * 3. SAP provides an official "Download / Export" facility producing structured Excel/CSV files per release baseline.
 * 4. Architectural Directive: Brittle HTML scraping or reverse-engineering private internal microservice routes
 *    violates enterprise SAP guidelines and introduces breaking fragility.
 * 5. Supported Strategy: FioriX utilizes locally indexed release snapshots (curated from official FAL exports),
 *    combined with deep-links to official SAP documentation (https://fal.cloud.sap/apps/<appId>) and supported
 *    manual/batch baseline import sync.
 */
class FioriCatalogueAdapter implements IFioriCatalogueAdapter {
  private indexedApps: Map<string, CatalogueReference> = new Map();
  private tcodeIndex: Map<string, string[]> = new Map();
  private importVersion: string = 'FAL_2023_FPS02_BASELINE_V1';
  private lastSyncDate: string = '2026-11-04 08:00 (S21 Curated Baseline)';

  constructor() {
    this.reindex(OFFICIAL_FIORI_CATALOGUE_BASELINE);
  }

  private reindex(records: CatalogueReference[]) {
    this.indexedApps.clear();
    this.tcodeIndex.clear();

    for (const app of records) {
      this.indexedApps.set(app.appId.toUpperCase(), app);
      for (const tc of app.relatedTCodes) {
        const cleanTc = tc.trim().toUpperCase();
        const existing = this.tcodeIndex.get(cleanTc) || [];
        if (!existing.includes(app.appId)) {
          existing.push(app.appId);
          this.tcodeIndex.set(cleanTc, existing);
        }
      }
    }
  }

  async searchApps(query: string, release?: string): Promise<CatalogueReference[]> {
    const q = query.trim().toLowerCase();
    const results: CatalogueReference[] = [];

    for (const app of this.indexedApps.values()) {
      const matchesQuery =
        !q ||
        app.appId.toLowerCase().includes(q) ||
        app.appName.toLowerCase().includes(q) ||
        app.description.toLowerCase().includes(q) ||
        app.relatedTCodes.some((tc) => tc.toLowerCase().includes(q)) ||
        app.businessRoles.some((role) => role.toLowerCase().includes(q));

      const matchesRelease =
        !release ||
        app.supportedProductRelease.toLowerCase().includes(release.toLowerCase());

      if (matchesQuery && matchesRelease) {
        results.push(app);
      }
    }

    return results;
  }

  async getAppById(appId: string): Promise<CatalogueReference | null> {
    const cleanId = appId.trim().toUpperCase();
    return this.indexedApps.get(cleanId) || null;
  }

  async getAppsByTCode(tcode: string): Promise<CatalogueReference[]> {
    const cleanTc = tcode.trim().toUpperCase();
    const appIds = this.tcodeIndex.get(cleanTc) || [];
    const results: CatalogueReference[] = [];

    for (const id of appIds) {
      const app = this.indexedApps.get(id.toUpperCase());
      if (app) results.push(app);
    }

    return results;
  }

  async getCatalogueStatus(): Promise<CatalogueStatusInfo> {
    return {
      source: 'SAP Fiori Apps Reference Library (FAL)',
      officialPortalUrl: 'https://fal.cloud.sap',
      status: 'LOADED',
      totalApps: this.indexedApps.size,
      lastUpdated: this.lastSyncDate,
      importVersion: this.importVersion,
      apiAvailabilityNote:
        'Official SAP FAL provides batch Excel/CSV export. Direct automated public REST API is unsupported by SAP; locally indexed release snapshots are used with official deep links.'
    };
  }

  async importOfficialExport(
    records: Partial<CatalogueReference>[],
    sourceVersion: string
  ): Promise<{ importedCount: number; status: string }> {
    let count = 0;
    for (const rec of records) {
      if (!rec.appId || !rec.appName) continue;
      const fullRecord: CatalogueReference = {
        appId: rec.appId,
        appName: rec.appName,
        description: rec.description || '',
        relatedTCodes: rec.relatedTCodes || [],
        supportedProductRelease: rec.supportedProductRelease || 'SAP S/4HANA 2023',
        uiTechnology: rec.uiTechnology || 'SAP Fiori elements',
        businessRoles: rec.businessRoles || [],
        businessCatalogues: rec.businessCatalogues || [],
        odataServices: rec.odataServices || [],
        technicalComponent: rec.technicalComponent || 'S4CORE',
        implementationInfo: rec.implementationInfo || 'Imported via FAL baseline sync',
        officialSourceUrl: rec.officialSourceUrl || `https://fal.cloud.sap/apps/${rec.appId}`,
        sourceVerificationDate: new Date().toISOString().substring(0, 10),
        importVersion: sourceVersion,
        isCuratedDemoData: false
      };
      this.indexedApps.set(fullRecord.appId.toUpperCase(), fullRecord);
      count++;
    }

    this.importVersion = sourceVersion;
    this.lastSyncDate = new Date().toISOString().replace('T', ' ').substring(0, 16);
    this.reindex(Array.from(this.indexedApps.values()));

    return {
      importedCount: count,
      status: `Successfully indexed ${count} applications from ${sourceVersion}`
    };
  }
}

export const fioriCatalogueAdapter = new FioriCatalogueAdapter();
