/**
 * FioriFy — Landing Page Synthetic Product Preview Dataset
 *
 * Provides realistic, self-contained demonstration metadata for the
 * Hero section's live transaction analysis dashboard preview.
 * Strictly mock demonstration data — no backend or live SAP connection.
 */

export interface PreviewPurchaseOrder {
  poNumber: string;
  supplier: string;
  companyCode: string;
  status: 'Approved' | 'Pending' | 'In Review';
  netAmount: string;
  currency: string;
}

export interface LandingPreviewTransaction {
  tcode: string;
  module: string;
  description: string;
  program: string;
  tables: string[];
  authObject: string;
  targetLandscape: string;
  environmentBadge: string;
  analysisSummary: {
    tcodeIdentified: boolean;
    ddicAnalyzed: boolean;
    standardMatchFound: boolean;
    fitGapCompleted: boolean;
  };
  recommendation: {
    appId: string;
    appName: string;
    matchStatus: string;
    complianceTier: string;
    odataVersion: string;
    pfcgRole: string;
  };
  sampleRecords: PreviewPurchaseOrder[];
}

export const HERO_PRODUCT_PREVIEW_DATA: LandingPreviewTransaction = {
  tcode: 'ME21N',
  module: 'Procurement (MM-PUR)',
  description: 'Create Purchase Order',
  program: 'SAPLMEGUI',
  tables: ['EKKO', 'EKPO', 'EKET', 'EKKN'],
  authObject: 'M_BEST_BSA',
  targetLandscape: 'SAP S/4HANA 2023 FPS01',
  environmentBadge: 'Mock / Demo Environment',
  analysisSummary: {
    tcodeIdentified: true,
    ddicAnalyzed: true,
    standardMatchFound: true,
    fitGapCompleted: true,
  },
  recommendation: {
    appId: 'F0842A',
    appName: 'Manage Purchase Orders',
    matchStatus: 'Verified Demo Match',
    complianceTier: 'Tier 1 — Standard Adoption',
    odataVersion: 'OData V4 Supported',
    pfcgRole: 'SAP_BR_PURCHASER',
  },
  sampleRecords: [
    {
      poNumber: '45000123',
      supplier: 'ABC Industrial',
      companyCode: '1000',
      status: 'Approved',
      netAmount: '14,250.00',
      currency: 'USD',
    },
    {
      poNumber: '45000124',
      supplier: 'Global Supplies',
      companyCode: '1000',
      status: 'Pending',
      netAmount: '3,840.50',
      currency: 'USD',
    },
    {
      poNumber: '45000125',
      supplier: 'Prime Components',
      companyCode: '2000',
      status: 'In Review',
      netAmount: '28,100.00',
      currency: 'EUR',
    },
  ],
};
