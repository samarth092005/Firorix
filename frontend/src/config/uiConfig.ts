/**
 * Fiorify UI & Landscape Configuration
 * 
 * Centralized configuration for dynamic UI strings, default SAP landscapes,
 * brand identities, and demonstration fallbacks.
 * Enables zero-hardcoding across all views, modals, and export utilities.
 */

export interface SystemProfile {
  id: string;
  name: string;
  client: string;
  softwareComponent: string;
  basisRelease: string;
  gatewayCatalogPath: string;
  isCloud: boolean;
}

export interface UIConfig {
  brand: {
    name: string;
    productName: string;
    tagline: string;
    workspaceName: string;
  };
  defaultSystem: SystemProfile;
  safetyBanner: {
    title: string;
    getDescription: (systemId: string) => string;
  };
  suggestedTCodes: Array<{
    tcode: string;
    description: string;
    module: string;
    complexity?: 'Low' | 'Medium' | 'High';
  }>;
  showcaseProjects: Array<{
    id: string;
    title: string;
    tcode: string;
    description: string;
    targetRelease: string;
    status: string;
  }>;
}

export const uiConfig: UIConfig = {
  brand: {
    name: 'Fiorify',
    productName: 'Fiorify Generation Studio',
    tagline: 'Custom RAP Managed application development project under Clean Core architecture.',
    workspaceName: import.meta.env.VITE_WORKSPACE_NAME || 'Modernization Workspace',
  },

  defaultSystem: {
    id: import.meta.env.VITE_DEFAULT_SAP_SYSTEM_ID || 'S21',
    name: import.meta.env.VITE_DEFAULT_SAP_SYSTEM_NAME || 'S21 Private Cloud',
    client: import.meta.env.VITE_DEFAULT_SAP_CLIENT || '200',
    softwareComponent: import.meta.env.VITE_DEFAULT_SAP_SOFTWARE_COMPONENT || 'S4CORE 108',
    basisRelease: import.meta.env.VITE_DEFAULT_SAP_BASIS_RELEASE || 'SAP_BASIS 758',
    gatewayCatalogPath: '/sap/opu/odata/IWFND/CATALOGSERVICE;v=2/CatalogService/',
    isCloud: true,
  },

  safetyBanner: {
    title: 'SAP Clean Core Safety Directives Enforced',
    getDescription: (systemId: string = 'S21') =>
      `Fiorify executes 100% read-only diagnostic and verification calls. The execution engine stops at the SAP Write Boundary without creating unapproved repository objects in ${systemId}.`,
  },

  suggestedTCodes: [
    { tcode: 'F-53', description: 'Post Outgoing Payments - For Suppliers', module: 'FI-AP', complexity: 'Medium' },
    { tcode: 'ME21N', description: 'Create Purchase Order', module: 'MM-PUR', complexity: 'High' },
    { tcode: 'VA01', description: 'Create Sales Order', module: 'SD-SLS', complexity: 'High' },
    { tcode: 'FS00', description: 'G/L Account Master Record Maintenance', module: 'FI-GL', complexity: 'Low' },
    { tcode: 'ST22', description: 'ABAP Dump Analysis (Runtime Errors)', module: 'BC-ABA', complexity: 'Medium' },
    { tcode: 'MM01', description: 'Create Material Master', module: 'MM-MD', complexity: 'High' },
  ],

  showcaseProjects: [
    {
      id: 'SHOWCASE-ME21N',
      title: 'ME21N — Manage Purchase Orders',
      tcode: 'ME21N',
      description: 'End-to-end procurement modernization converting classic Dynpro screen 0100 into a Fiori Elements List Report & Object Page.',
      targetRelease: 'SAP S/4HANA 2023',
      status: 'AVAILABLE',
    },
    {
      id: 'SHOWCASE-F53',
      title: 'F-53 — Post Outgoing Payments',
      tcode: 'F-53',
      description: 'Accounts Payable supplier payment modernization with automated clearing and real-time bank ledger validation.',
      targetRelease: 'SAP S/4HANA 2023',
      status: 'AVAILABLE',
    },
  ],
};

/**
 * Format system identifier for badge display (e.g. "S21-200" or "S21:200")
 */
export function formatSystemBadge(systemId?: string, client?: string, separator: string = '-'): string {
  const sys = systemId || uiConfig.defaultSystem.id;
  const clnt = client || uiConfig.defaultSystem.client;
  return `${sys}${separator}${clnt}`;
}

/**
 * Format target release and component stamp
 */
export function formatSystemTargetStamp(systemId?: string, client?: string, component?: string): string {
  const sys = systemId || uiConfig.defaultSystem.id;
  const clnt = client || uiConfig.defaultSystem.client;
  const comp = component || uiConfig.defaultSystem.softwareComponent;
  return `TARGET: ${sys} / CLIENT ${clnt} (${comp})`;
}
