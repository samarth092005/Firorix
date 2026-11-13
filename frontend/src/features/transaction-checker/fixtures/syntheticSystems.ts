import { SapSystemRecord } from '../types';

/**
 * Synthetic Demo SAP Systems
 * Canonical source: data/systems.csv & Fiorify_Phase1_Demo_Data.xlsx
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
    odataServiceUrl: '/sap/opu/odata/sap/Z_Fiorify_DISCOVERY_SRV'
  },
  {
    systemId: 'S21-200-DEMO',
    systemName: 'S21-DEMO (Client 200) — Reference Snapshot',
    client: '200',
    release: 'SAP S/4HANA 2023 Private Edition',
    mode: 'MOCK',
    active: true,
    softwareComponents: ['S4CORE 108', 'SAP_BASIS 758', 'SAP_UI 758', 'SAP_GWFND 758']
  },
  {
    systemId: 'S4H-DEV-200',
    systemName: 'S4H-DEV (Client 200) — Development Sandbox',
    client: '200',
    release: 'S4HANA_2023_FPS_DEMO',
    mode: 'MOCK',
    active: true
  },
  {
    systemId: 'S4H-QAS-200',
    systemName: 'S4H-QAS (Client 200) — QA Validation Sandbox',
    client: '200',
    release: 'S4HANA_2023_FPS_DEMO',
    mode: 'MOCK',
    active: true
  }
];
