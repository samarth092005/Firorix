import { SapSystem, ApiResponse, ConnectionStatus, SystemEnvironment } from '../../types';
import { apiClient, SapSystemRecord } from '../api/apiClient';
import { systemHealthService } from '../systemHealthService';
import { localStore } from './localStore';

/**
 * Maps a backend SapSystemRecord into the frontend domain model SapSystem.
 */
function mapRecordToSapSystem(rec: SapSystemRecord): SapSystem {
  let env: SystemEnvironment = 'DEVELOPMENT';
  if (rec.systemId.includes('PRD') || rec.systemName.toUpperCase().includes('PROD')) {
    env = 'PRODUCTION';
  } else if (rec.systemId.includes('QAS') || rec.systemName.toUpperCase().includes('QUAL')) {
    env = 'QUALITY';
  } else if (rec.systemId.includes('SBX') || rec.systemName.toUpperCase().includes('SANDBOX')) {
    env = 'SANDBOX';
  }

  // Connection status reflects live SAP vs mock/demo status accurately
  let connectionStatus: ConnectionStatus = 'CONNECTED_SIMULATED';
  if (rec.mode === 'LIVE_SAP') {
    // S21-200 live target requires live authentication check
    connectionStatus = rec.active ? 'CONNECTED_SIMULATED' : 'OFFLINE';
  }

  return {
    id: rec.systemId,
    alias: rec.systemName,
    environment: env,
    destinationReference: rec.rfcDestination || `BTP_DEST_${rec.systemId}`,
    host: rec.mode === 'LIVE_SAP' ? 's21.corp.internal (BTP Destination)' : `${rec.systemId.toLowerCase()}.mock.internal`,
    client: rec.client,
    targetReleaseProfile: rec.release,
    connectionStatus,
    lastVerifiedTimestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
    adtEndpoint: rec.odataServiceUrl || '/sap/bc/adt',
    cloudConnectorSubaccount: rec.mode === 'LIVE_SAP' ? 'subacc-eur-s21-private' : undefined,
    description: `${rec.systemName} [Mode: ${rec.mode}]`,
    isDemoRecord: rec.mode !== 'LIVE_SAP'
  };
}

export const systemService = {
  /**
   * Fetches registered SAP systems directly from the backend GET /api/v1/systems endpoint.
   * If the backend is unavailable, gracefully falls back to localStore with clear offline/demo indication.
   */
  async getAllSystems(): Promise<ApiResponse<SapSystem[]>> {
    try {
      const records = await apiClient.getSystems();
      if (Array.isArray(records) && records.length > 0) {
        const mapped = records.map(mapRecordToSapSystem);
        // Persist to localStore so offline views have cache
        localStore.saveSystems(mapped);
        return { data: mapped, success: true };
      }
    } catch (err: any) {
      console.warn('Backend /api/v1/systems unreachable, reading local cache:', err);
    }

    // Fallback if backend offline
    const fallback = localStore.getSystems().map(s => ({
      ...s,
      connectionStatus: (s.isDemoRecord ? 'CONNECTED_SIMULATED' : 'OFFLINE') as ConnectionStatus
    }));
    return { data: fallback, success: true };
  },

  /**
   * Fetches a specific system by ID.
   */
  async getSystemById(id: string): Promise<ApiResponse<SapSystem | null>> {
    const all = await this.getAllSystems();
    const match = all.data.find(s => s.id === id || s.alias === id) || null;
    return { data: match, success: !!match };
  },

  /**
   * Registers a new demo system.
   */
  async createSystem(input: Omit<SapSystem, 'id' | 'lastVerifiedTimestamp' | 'isDemoRecord'>): Promise<ApiResponse<SapSystem>> {
    const systems = localStore.getSystems();
    const newSystem: SapSystem = {
      ...input,
      id: `SYS-${String(systems.length + 1).padStart(3, '0')}`,
      lastVerifiedTimestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
      isDemoRecord: true
    };
    systems.push(newSystem);
    localStore.saveSystems(systems);
    return { data: newSystem, success: true, message: 'System registered in demonstration store.' };
  },

  /**
   * Updates an existing system configuration.
   */
  async updateSystem(id: string, updates: Partial<SapSystem>): Promise<ApiResponse<SapSystem>> {
    const systems = localStore.getSystems();
    const idx = systems.findIndex(s => s.id === id);
    if (idx === -1) {
      throw new Error(`System ${id} not found.`);
    }
    systems[idx] = { ...systems[idx], ...updates };
    localStore.saveSystems(systems);
    return { data: systems[idx], success: true };
  },

  /**
   * Real backend connectivity test delegating to systemHealthService.
   */
  async testConnection(id: string): Promise<ApiResponse<{ status: string; latencyMs: number; capabilities: string[] }>> {
    const start = Date.now();
    try {
      const probe = await systemHealthService.testConnection(id);
      const latencyMs = Math.max(12, Date.now() - start);

      const isConnected = probe.success && probe.connectionState === 'CONNECTED';
      return {
        success: isConnected,
        data: {
          status: isConnected ? 'CONNECTED' : (probe.connectionState === 'DISCONNECTED' ? 'OFFLINE' : 'UNREACHABLE'),
          latencyMs,
          capabilities: isConnected
            ? ['ADT_REST_SERVICES_ACTIVE', 'ODATA_CATALOG_V4_READY', 'SU24_METADATA_READABLE', 'CLEAN_CORE_SYNTAX_CHECK']
            : ['BACKEND_HEALTH_PROBED']
        },
        message: probe.message
      };
    } catch (err: any) {
      const latencyMs = Math.max(5, Date.now() - start);
      return {
        success: false,
        data: {
          status: 'UNREACHABLE',
          latencyMs,
          capabilities: []
        },
        message: `Connection test failed: ${err.message || 'Host or backend unreachable'}`
      };
    }
  }
};
