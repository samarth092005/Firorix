import { TCodeAppMapping } from '../types';

/**
 * Synthetic T-Code to Fiori App Mappings
 * Canonical source: data/tcode_app_mappings.csv
 * Strictly deterministic demo data.
 */
export const SYNTHETIC_MAPPINGS: TCodeAppMapping[] = [
  {
    mappingId: 'MAP-001',
    systemId: 'S4H-DEV-200',
    tcode: 'ME21N',
    appId: 'DEMO_APP_PO_001',
    matchType: 'DIRECT_MATCH',
    rationale: 'Exact T-Code association in synthetic demo catalogue.',
    reviewStatus: 'APPROVED_FOR_DEMO',
    releaseCompatibility: 'COMPATIBLE'
  },
  {
    mappingId: 'MAP-002',
    systemId: 'S4H-DEV-200',
    tcode: 'VA01',
    appId: 'DEMO_APP_SO_001',
    matchType: 'DIRECT_MATCH',
    rationale: 'Exact T-Code association in synthetic demo catalogue.',
    reviewStatus: 'APPROVED_FOR_DEMO',
    releaseCompatibility: 'COMPATIBLE'
  },
  {
    mappingId: 'MAP-003',
    systemId: 'S4H-DEV-200',
    tcode: 'ZPURCHASE',
    appId: 'DEMO_APP_PUR_002',
    matchType: 'RELATED_MATCH',
    rationale: 'Curated demo mapping: related purchasing workflow; equivalence is not established.',
    reviewStatus: 'APPROVED_FOR_DEMO',
    releaseCompatibility: 'COMPATIBLE'
  },
  {
    mappingId: 'MAP-004',
    systemId: 'S4H-DEV-200',
    tcode: 'ME21N',
    appId: 'DEMO_APP_OLD_001',
    matchType: 'POSSIBLE_MATCH',
    rationale: 'Legacy candidate intentionally incompatible with selected demo release.',
    reviewStatus: 'APPROVED_FOR_DEMO',
    releaseCompatibility: 'INCOMPATIBLE'
  },
  {
    mappingId: 'MAP-005',
    systemId: 'S4H-DEV-200',
    tcode: 'OB08',
    appId: 'F3616',
    matchType: 'EXPLICIT_SUCCESSOR',
    rationale: 'SAP-designated successor confirmed: Currency Exchange Rates (F3616) built on SAP Fiori elements.',
    reviewStatus: 'APPROVED_FOR_DEMO',
    releaseCompatibility: 'COMPATIBLE'
  },
  {
    mappingId: 'MAP-006',
    systemId: 'S4H-DEV-200',
    tcode: 'FB03',
    appId: 'FB03',
    matchType: 'SAP_GUI_HTML',
    rationale: 'Classic SAP GUI transaction hosted in Fiori Launchpad via SAP GUI for HTML (WebGUI). This is NOT a native SAP Fiori elements application.',
    reviewStatus: 'APPROVED_FOR_DEMO',
    releaseCompatibility: 'COMPATIBLE'
  },
  {
    mappingId: 'MAP-007',
    systemId: 'S4H-DEV-200',
    tcode: 'FBL1N',
    appId: 'PENDING',
    matchType: 'CATALOGUE_PENDING_VERIFICATION',
    rationale: 'TSTC and TSTCT verified. TADIR classification and official Fiori catalogue matching remain pending verification.',
    reviewStatus: 'PENDING_VERIFICATION',
    releaseCompatibility: 'UNKNOWN'
  },
  {
    mappingId: 'MAP-008',
    systemId: 'S4H-DEV-200',
    tcode: 'FB01',
    appId: 'F0717',
    matchType: 'FUNCTIONAL_ALTERNATIVE',
    rationale: 'Functional alternative: Manage Journal Entries (F0717) built on SAP Fiori elements is the official modern successor workflow for classic document posting.',
    reviewStatus: 'APPROVED_FOR_DEMO',
    releaseCompatibility: 'COMPATIBLE'
  },
  {
    mappingId: 'MAP-009',
    systemId: 'S4H-DEV-200',
    tcode: 'ZNOAPP',
    appId: 'NONE',
    matchType: 'NO_STANDARD_APP_EXISTS',
    rationale: 'Customer custom finance transaction. Verified absence: no standard SAP Fiori application exists for this customer development.',
    reviewStatus: 'APPROVED_FOR_DEMO',
    releaseCompatibility: 'COMPATIBLE'
  },
  {
    mappingId: 'MAP-010',
    systemId: 'S4H-DEV-200',
    tcode: 'F-53',
    appId: 'F0773',
    matchType: 'EXPLICIT_SUCCESSOR',
    rationale: 'SAP Simplification Item confirmed: Manage Outgoing Payments (F0773) is the explicit standard successor for F-53.',
    reviewStatus: 'APPROVED_FOR_DEMO',
    releaseCompatibility: 'COMPATIBLE'
  },
  {
    mappingId: 'MAP-011',
    systemId: 'S4H-DEV-200',
    tcode: 'F-28',
    appId: 'F1345',
    matchType: 'EXPLICIT_SUCCESSOR',
    rationale: 'Post Incoming Payments (F1345) is the explicit standard SAP Fiori successor for customer payment processing F-28.',
    reviewStatus: 'APPROVED_FOR_DEMO',
    releaseCompatibility: 'COMPATIBLE'
  },
  {
    mappingId: 'MAP-012',
    systemId: 'S4H-DEV-200',
    tcode: 'FS00',
    appId: 'F0984A',
    matchType: 'EXPLICIT_SUCCESSOR',
    rationale: 'Manage G/L Account Master Data (F0984A) is the designated standard Fiori successor for FS00 G/L maintenance.',
    reviewStatus: 'APPROVED_FOR_DEMO',
    releaseCompatibility: 'COMPATIBLE'
  }
];
