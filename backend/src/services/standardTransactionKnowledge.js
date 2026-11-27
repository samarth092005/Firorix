/**
 * Fiorify — Authoritative Standard SAP Transaction & Modern Fiori Successor Knowledge Base
 *
 * Loads curated datasets from backend/src/services/knowledge/*.json and provides
 * deterministic title synthesis, S/4HANA Simplification lookup, and WebGUI/Custom synthesis.
 */

import fs from 'node:fs';

function loadKnowledgeJson(fileName) {
  const fileUrl = new URL(`./knowledge/${fileName}`, import.meta.url);
  return JSON.parse(fs.readFileSync(fileUrl, 'utf8'));
}

export const S4HANA_SIMPLIFICATION_LIST = Object.freeze(loadKnowledgeJson('simplificationList.json'));
export const STANDARD_TRANSACTION_CATALOG = loadKnowledgeJson('standardTransactions.json');
export const STANDARD_FIORI_APPLICATIONS = loadKnowledgeJson('standardFioriApps.json');

export function getSimplificationItem(tcode) {
  if (!tcode) return null;
  const key = String(tcode).trim().toUpperCase();
  return S4HANA_SIMPLIFICATION_LIST[key] || null;
}

export function synthesizeTransactionTitle(tcode) {
  if (!tcode) return 'Custom Business Application';
  const clean = String(tcode).trim().toUpperCase();

  if (STANDARD_TRANSACTION_CATALOG[clean]?.description) {
    return STANDARD_TRANSACTION_CATALOG[clean].description;
  }

  if (clean.startsWith('Z') || clean.startsWith('Y')) {
    const tokens = clean.replace(/^[ZY]_?/, '').split('_').filter(Boolean);
    if (tokens.length > 0) {
      const formatted = tokens
        .map((tok) => tok.charAt(0).toUpperCase() + tok.slice(1).toLowerCase())
        .join(' ');
      return `${formatted} Custom Application`;
    }
    return `Custom Modernization (${clean})`;
  }

  if (/^ME/i.test(clean)) return `Purchasing & Sourcing Processing (${clean})`;
  if (/^MM/i.test(clean)) return `Material Master Management (${clean})`;
  if (/^MC/i.test(clean)) return `Logistics Information System (LIS) Analysis (${clean})`;
  if (/^VA/i.test(clean)) return `Sales Order Processing (${clean})`;
  if (/^VF/i.test(clean)) return `Billing & Invoicing Processing (${clean})`;
  if (/^VL/i.test(clean)) return `Outbound Delivery Processing (${clean})`;
  if (/^VK/i.test(clean)) return `Sales Pricing & Condition Maintenance (${clean})`;
  if (/^(OV|OX)/i.test(clean)) return `Enterprise Structure Configuration (${clean})`;
  if (/^OB/i.test(clean)) return `Financial Accounting Customizing (${clean})`;
  if (/^(FB|F-|FS)/i.test(clean)) return `Financial Accounting & Posting (${clean})`;
  if (/^(IW|PM)/i.test(clean)) return `Plant Maintenance Work Order (${clean})`;
  if (/^(CO|MD|CR|CS)/i.test(clean)) return `Production Planning & Orders (${clean})`;
  if (/^(CJ|CN|PS)/i.test(clean)) return `Project Systems Processing (${clean})`;
  if (/^(KS|KP|KO)/i.test(clean)) return `Controlling & Cost Accounting (${clean})`;
  if (/^(PA|PB)/i.test(clean)) return `Human Capital Management (${clean})`;
  if (/^(QA|QE|QP)/i.test(clean)) return `Quality Management Processing (${clean})`;
  if (/^(LT|LX)/i.test(clean)) return `Warehouse Management Operations (${clean})`;
  if (/^(ST|SM|SE|SU|PF)/i.test(clean)) return `System Administration & Diagnostics (${clean})`;

  return `SAP Transaction ${clean}`;
}

export function inferLineOfBusiness(tcode) {
  const tc = (tcode || '').toUpperCase();
  if (tc.startsWith('M') || tc.startsWith('MB') || tc.startsWith('ME')) return 'Supply Chain / Procurement';
  if (tc.startsWith('V') || tc.startsWith('SD')) return 'Sales and Distribution';
  if (tc.startsWith('F') || tc.startsWith('OB') || tc.startsWith('FS') || tc.startsWith('BP')) return 'Finance';
  if (tc.startsWith('K') || (tc.startsWith('CO') && !tc.startsWith('CO0'))) return 'Controlling';
  if (tc.startsWith('CO') || tc.startsWith('CS') || tc.startsWith('MD') || tc.startsWith('CR')) return 'Manufacturing / PP';
  if (tc.startsWith('I') || tc.startsWith('PM')) return 'Asset Management';
  if (tc.startsWith('Q')) return 'Quality Management';
  if (tc.startsWith('S') || tc.startsWith('SE') || tc.startsWith('SM') || tc.startsWith('SU') || tc.startsWith('PFCG')) return 'Technology / Basis';
  if (tc.startsWith('Z') || tc.startsWith('Y')) return 'Custom Applications';
  return 'Cross-Functional';
}

export function synthesizeWebGuiApp(rawTcode) {
  const clean = (rawTcode || '').trim().toUpperCase();
  const known = STANDARD_TRANSACTION_CATALOG[clean];
  const appName = known ? `${known.description} (SAP GUI)` : `${clean} (SAP GUI for HTML)`;
  const lineOfBusiness = known ? known.lineOfBusiness : inferLineOfBusiness(clean);

  return {
    appId: clean,
    appName,
    description: known
      ? `Classic SAP transaction ${clean} (${known.description}) hosted directly in SAP Fiori Launchpad via SAP GUI for HTML (WebGUI bridge).`
      : `Standard SAP GUI transaction ${clean} hosted in SAP Fiori Launchpad via WebGUI tile.`,
    appType: 'SAP GUI',
    uiTechnology: 'SAP GUI for HTML',
    businessProcess: lineOfBusiness,
    lineOfBusiness,
    productVersion: 'SAP S/4HANA 2023 Private Edition',
    softwareComponent: known?.softwareComponent || 'S4CORE 108',
    businessRole: 'SAP_BR_BUSINESS_PROCESS_SPECIALIST',
    businessCatalog: 'SAP_TC_CA_PR_BE_APPS',
    technicalCatalog: 'SAP_TC_FIN_FO_COMMON',
    odataServices: [],
    sapui5Component: undefined,
    leadingTransactionCodes: [clean],
    documentationUrl: `https://fioriappslibrary.hana.ondemand.com/sap/fix/externalViewer/#/detail/Apps('${clean}')/`,
    provenance: 'OFFICIAL_CATALOGUE_CACHED',
    isSynthesizedWebGui: true
  };
}

export function synthesizeCustomApp(rawTcode) {
  const clean = (rawTcode || '').trim().toUpperCase();
  return {
    appId: clean,
    appName: `${clean} (Custom Transaction — Generation Studio Target)`,
    description: `Customer proprietary transaction ${clean}. Standard SAP Fiori catalog contains public standard applications only. Modernise this transaction using Fiorify Generation Studio with ABAP RAP and SAP Fiori Elements.`,
    appType: 'Custom Transaction',
    uiTechnology: 'SAP Fiori elements (Custom RAP)',
    businessProcess: 'Custom Modernization',
    lineOfBusiness: 'Custom Application',
    productVersion: 'SAP S/4HANA 2023 Private Edition',
    softwareComponent: 'LOCAL_CUSTOMER',
    businessRole: 'Z_BR_CUSTOM_USER',
    businessCatalog: 'Z_BC_CUSTOM',
    technicalCatalog: 'Z_TC_CUSTOM',
    odataServices: [],
    leadingTransactionCodes: [clean],
    documentationUrl: '/generation-studio',
    provenance: 'CUSTOM_WORKSPACE',
    isCustom: true
  };
}
