import { FioriAppRecord, TCodeAppMapping } from '../types';
import { SYNTHETIC_FIORI_CATALOGUE } from '../fixtures/syntheticCatalogue';
import { SYNTHETIC_MAPPINGS } from '../fixtures/syntheticMappings';

export class MockCatalogueAdapter {
  private catalogue: FioriAppRecord[] = SYNTHETIC_FIORI_CATALOGUE;
  private mappings: TCodeAppMapping[] = SYNTHETIC_MAPPINGS;

  /**
   * Look up Fiori App definition by synthetic App ID
   */
  public getAppById(appId: string): FioriAppRecord | undefined {
    return this.catalogue.find((app) => app.appId === appId);
  }

  /**
   * Find approved mappings for a given T-Code.
   * Deterministic lookup against verified fixture records only.
   * Zero keyword guessing or similarity inference.
   */
  public getMappingsForTCode(tcode: string): TCodeAppMapping[] {
    const normalized = tcode.trim().toUpperCase();
    return this.mappings.filter(
      (m) =>
        m.tcode.toUpperCase() === normalized &&
        (m.reviewStatus === 'APPROVED_FOR_DEMO' || m.reviewStatus === 'PENDING_VERIFICATION')
    );
  }

  /**
   * Get all catalogue entries
   */
  public getAllCatalogueApps(): FioriAppRecord[] {
    return [...this.catalogue];
  }
}

export const mockCatalogueAdapter = new MockCatalogueAdapter();
