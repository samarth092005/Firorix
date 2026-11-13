import { SapSystemRecord } from '../types';

/**
 * Synthetic Demo SAP Systems
 * Canonical source: data/systems.csv & FioriX_Phase1_Demo_Data.xlsx
 * Strictly for local mock demo.
 */
export const SYNTHETIC_SYSTEMS: SapSystemRecord[] = [
  {
    systemId: 'S21-200',
    systemName: 'S21 (Client 200) — S/4HANA 2023 Private Cloud (Live)',
    client: '200',
    release: 'SAP S/4HANA 2023 Private Edition',
    mode: 'LIVE_SAP',
    active: true,
    softwareComponents: ['S4CORE 108', 'SAP_BASIS 758', 'SAP_UI 758', 'SAP_GWFND 758'],
    rfcDestination: 'S21_RFC_DISCOVERY',
    odataServiceUrl: '/sap/opu/odata/sap/Z_FIORIX_DISCOVERY_SRV'
  }
];
