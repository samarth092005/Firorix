import {
  TransactionDiscoveryRequest,
  TransactionDiscoveryResponse,
  CatalogueReference
} from '../contracts/types';
import { transactionSearchService } from '../../features/transaction-checker/services/transactionSearchService';
import { mockSapAdapter } from '../../features/transaction-checker/adapters/mockSapAdapter';
import { fioriCatalogueAdapter } from '../catalogue/catalogueAdapter';
import { SapSystemRecord } from '../../features/transaction-checker/types';

export interface ISapDiscoveryAdapter {
  inspectTransaction(request: TransactionDiscoveryRequest): Promise<TransactionDiscoveryResponse>;
  getSystemMetadataSources(): {
    tables: { name: string; description: string; role: string }[];
    serviceEndpoint: string;
    serviceStatus: 'DEPLOYED_PENDING_INTEGRATION' | 'MOCK_SIMULATED';
  };
  getAvailableSystems(): SapSystemRecord[];
}

/**
 * SAP Discovery Adapter
 * Target: S21 / Client 200 / SAP S/4HANA 2023 Private Edition
 *
 * Potential SAP DDIC & Repository Sources:
 * - TSTC: Transaction code registry and main program linkage
 * - TSTCT: Transaction texts (language dependent)
 * - TADIR: Object directory (devclass, original system, author)
 * - TDEVC: Package hierarchy and software component assignment
 * - CVERS: Component release levels (S4CORE 108, SAP_BASIS 758)
 *
 * SAP Integration Service Contract:
 * Read-only Gateway OData Service: /sap/opu/odata/sap/Z_FIORIX_DISCOVERY_SRV
 */
class SapDiscoveryAdapter implements ISapDiscoveryAdapter {
  getSystemMetadataSources() {
    return {
      tables: [
        { name: 'TSTC', description: 'Transaction Codes & Program Dynpro Table', role: 'Verification of T-Code existence, primary executable program and dynpro screen.' },
        { name: 'TSTCT', description: 'Transaction Texts (Language Specific)', role: 'Standard descriptive text retrieval in target session language (EN).' },
        { name: 'TADIR', description: 'Directory of R/3 Repository Objects', role: 'Object classification, package (DEVCLASS), and original repository system (SRCSYSTEM).' },
        { name: 'TDEVC', description: 'Development Classes (Packages)', role: 'Package hierarchy and software component mapping (S4CORE).' },
        { name: 'CVERS', description: 'Release and Component Status Table', role: 'System software release and SP level verification (S4CORE 108 SP0003).' }
      ],
      serviceEndpoint: '/sap/opu/odata/sap/Z_FIORIX_DISCOVERY_SRV',
      serviceStatus: 'DEPLOYED_PENDING_INTEGRATION' as const
    };
  }

  getAvailableSystems(): SapSystemRecord[] {
    return mockSapAdapter.getAvailableSystems();
  }

  async inspectTransaction(request: TransactionDiscoveryRequest): Promise<TransactionDiscoveryResponse> {
    const cleanTcode = request.tcode.trim().toUpperCase();

    // Call underlying search engine
    const searchResponse = await transactionSearchService.search({
      systemId: request.systemId,
      tcode: cleanTcode,
      language: 'EN'
    });

    let isLiveSystem = request.systemId === 'S21-200' && searchResponse.mode === 'LIVE_SAP' && Boolean(searchResponse.transaction);
    let tx = searchResponse.transaction;

    // If live lookup failed (e.g. S21 live Gateway endpoint is not reachable in local/demo environment),
    // provide honest fallback to curated S21 demo snapshot while maintaining full DDIC metadata
    // and explicitly marking provenance as CURATED_DEMO_FIXTURE.
    if (!tx) {
      const fallbackLookup = mockSapAdapter.queryTransaction('S21-200-DEMO', cleanTcode);
      if (fallbackLookup.success && fallbackLookup.transaction) {
        tx = fallbackLookup.transaction;
        isLiveSystem = false;
      }
    }

    // Discover matching catalogue apps from official catalogue adapter
    const catalogueCandidates = await fioriCatalogueAdapter.getAppsByTCode(cleanTcode);

    const exists = tx?.exists ?? false;
    const classification = tx?.classification ?? 'UNKNOWN';

    return {
      requestId: request.requestId,
      tcode: cleanTcode,
      systemId: request.systemId,
      client: request.client,
      targetRelease: request.targetRelease,
      exists,
      classification,
      description: tx?.description || (exists ? 'SAP Transaction' : 'Transaction Not Found in Dictionary'),
      programName: tx?.program || 'UNKNOWN',
      screenNumber: tx?.screenNumber || '0100',
      packageName: tx?.packageName || (classification === 'CUSTOM' ? 'ZCUSTOM' : 'SAP_STANDARD'),
      originalSystem: tx?.originalSystem || (classification === 'CUSTOM' ? 'S21' : 'SAP'),
      softwareComponent: tx?.softwareComponent || 'S4CORE 108',
      metadataStatus: tx?.metadataStatus || (exists ? 'COMPLETE' : 'NOT_AVAILABLE'),
      isLiveVerified: isLiveSystem,
      provenance: isLiveSystem ? 'LIVE_SAP_S21' : 'CURATED_DEMO_FIXTURE',
      tadirEvidence: {
        pgmid: tx?.tadir?.pgmid || 'R3TR',
        object: tx?.tadir?.object || 'TRAN',
        objName: cleanTcode,
        devclass: tx?.tadir?.devclass || tx?.packageName || '',
        srcsystem: tx?.tadir?.srcsystem || tx?.originalSystem || ''
      },
      catalogueCandidates,
      timestamp: new Date().toISOString()
    };
  }
}

export const sapDiscoveryAdapter = new SapDiscoveryAdapter();
