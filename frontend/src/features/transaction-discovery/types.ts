import {
  TransactionDiscoveryResponse,
  BusinessContext,
  ApplicationRequirements,
  CatalogueReference
} from '../../services/contracts/types';

export type WizardStepId = 1 | 2 | 3 | 4 | 5;

export interface DiscoveryWizardState {
  currentStep: WizardStepId;
  tcode: string;
  systemId: string;
  client: string;
  targetRelease: string;
  sapMetadata: TransactionDiscoveryResponse | null;
  businessContext: BusinessContext;
  applicationRequirements: ApplicationRequirements;
  selectedCatalogueApp: CatalogueReference | null;
  isValidating: boolean;
  isSubmitting: boolean;
  validationErrors: Record<string, string>;
  submittedAssessmentId: string | null;
  submittedRequestId: string | null;
}

export interface PresetScenarioConfig {
  tcode: string;
  label: string;
  businessProcess: string;
  defaultScenario: string;
  defaultRequirements: string[];
  defaultFunctionality: string[];
  defaultObjective: string;
  defaultRole: string;
  defaultODataService: string;
}

export const PRESET_SCENARIOS: Record<string, PresetScenarioConfig> = {
  'F-53': {
    tcode: 'F-53',
    label: 'F-53 — Post Outgoing Payments',
    businessProcess: 'Financial Accounting — Outgoing Payment Processing (Accounts Payable)',
    defaultScenario: 'Standard vendor invoice open-item clearing and bank transfer execution',
    defaultRequirements: [
      'Multi-currency payment execution with automatic exchange rate conversion',
      'Automatic cash discount deduction according to payment terms',
      'Payment advice creation and vendor remittance notification',
      'House bank and payment method determination with clearing rules'
    ],
    defaultFunctionality: [
      'Dynamic open-item filtering by vendor account and invoice due date',
      'Difference posting with deduction reason code classification',
      'Partial payments and residual item creation'
    ],
    defaultObjective:
      'Evaluate migration from classic SAP GUI dynpro F-53 to standard SAP Fiori elements app F0773 (Manage Outgoing Payments), enabling modern open-item processing and bank payment reconciliation natively in Fiori Horizon.',
    defaultRole: 'Accounts Payable Accountant (SAP_BR_AP_ACCOUNTANT)',
    defaultODataService: 'FAR_OUTGOING_PAYMENT_SRV (OData V2)'
  },
  'F-28': {
    tcode: 'F-28',
    label: 'F-28 — Post Incoming Payments',
    businessProcess: 'Financial Accounting — Incoming Payment Processing (Accounts Receivable)',
    defaultScenario: 'Customer payment receipt with automated invoice open-item clearing',
    defaultRequirements: [
      'Customer billing reference and assignment document matching',
      'Automatic cash discount handling within agreed tolerance limits',
      'Dispute case linkage and cross-company code clearing'
    ],
    defaultFunctionality: [
      'Fast customer open-item search by billing document reference',
      'Overpayment and underpayment difference postings',
      'Automated write-off within defined financial thresholds'
    ],
    defaultObjective:
      'Assess standard Fiori successor F1345 (Post Incoming Payments) to streamline cash application, open-item clearing and customer difference resolution in S/4HANA 2023.',
    defaultRole: 'Accounts Receivable Accountant (SAP_BR_AR_ACCOUNTANT)',
    defaultODataService: 'FAP_POST_INCOMING_PAYMENTS_SRV (OData V2)'
  },
  'FS00': {
    tcode: 'FS00',
    label: 'FS00 — Manage G/L Account Master Data',
    businessProcess: 'Financial Accounting — General Ledger Master Data Management',
    defaultScenario: 'Central G/L account master record creation and maintenance across chart of accounts and company codes',
    defaultRequirements: [
      'Chart of Accounts segment specification (Account group, Balance sheet/P&L)',
      'Company code segment configuration (Account currency, Tax category, Recon flag)',
      'Primary/Secondary cost element category assignment'
    ],
    defaultFunctionality: [
      'Full change document history and timeline audit',
      'Open item management and line item display enablement',
      'Central posting block and deletion flag governance'
    ],
    defaultObjective:
      'Transition from classic Dynpro FS00 to SAP Fiori elements application F0984A (Manage G/L Account Master Data) with unified change tracking and mass maintenance capabilities.',
    defaultRole: 'General Ledger Accountant (SAP_BR_GL_ACCOUNTANT)',
    defaultODataService: 'GL_ACCOUNT_MD_SRV (OData V4)'
  },
  'OB08': {
    tcode: 'OB08',
    label: 'OB08 — Maintain Exchange Rates',
    businessProcess: 'Financial Accounting — Currency & Valuation Configuration',
    defaultScenario: 'Daily and historical foreign currency exchange rate maintenance',
    defaultRequirements: [
      'Direct and indirect currency quotation pairs',
      'Effective validity date intervals and exchange rate types (M, B, G)',
      'Spread calculation and inversion validation'
    ],
    defaultFunctionality: [
      'Tabular rate grid editing with validation against market spreads',
      'Bulk upload and rate change audit logging'
    ],
    defaultObjective:
      'Adopt SAP Fiori successor app F3616 (Currency Exchange Rates) to replace classic table maintenance transaction OB08.',
    defaultRole: 'General Ledger Accountant (SAP_BR_GL_ACCOUNTANT)',
    defaultODataService: 'C_EXCHANGERATE_CDS (OData V4)'
  },
  'FB03': {
    tcode: 'FB03',
    label: 'FB03 — Display Document',
    businessProcess: 'Financial Accounting — Document Display & Financial Audit',
    defaultScenario: 'Accounting document header, line items, and audit trail inspection',
    defaultRequirements: [
      'Document number, company code, and fiscal year selection',
      'Entry view versus General Ledger view switching',
      'Original invoice/billing reference document navigation'
    ],
    defaultFunctionality: [
      'Line item drilldown into customer/vendor/asset subledgers',
      'Display of attached supporting PDFs/scans (GOS attachments)'
    ],
    defaultObjective:
      'Enable SAP GUI for HTML Launchpad tile embedding for FB03 while evaluating modern companion app F0717 (Manage Journal Entries).',
    defaultRole: 'General Ledger Accountant (SAP_BR_GL_ACCOUNTANT)',
    defaultODataService: 'WebGUI ITS Service /sap/bc/gui/sap/its/webgui'
  },
  'FBL1N': {
    tcode: 'FBL1N',
    label: 'FBL1N — Vendor Line Items',
    businessProcess: 'Financial Accounting — Accounts Payable Reporting',
    defaultScenario: 'Open, cleared, and all vendor line item reporting and analysis',
    defaultRequirements: [
      'Vendor account range, company code, and status date selection',
      'Custom ALV layout preservation and sorting',
      'Mass change of payment terms and payment blocks'
    ],
    defaultFunctionality: [
      'Fast filtering by clearing status and net due date',
      'Export to spreadsheet and direct document drilldown'
    ],
    defaultObjective:
      'Evaluate catalog transition from classic report RFITEMAP (FBL1N) to standard Fiori app F0712 (Manage Supplier Line Items) in S21.',
    defaultRole: 'Accounts Payable Accountant (SAP_BR_AP_ACCOUNTANT)',
    defaultODataService: 'FAR_SUPPLIER_LINE_ITEMS_SRV (OData V2)'
  }
};
