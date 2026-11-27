/**
 * Fiorify — PFCG Role to Fiori Launchpad Space / Page / Catalog Mapping Engine
 *
 * Maps classic SAP PFCG authorization roles & T-Codes to S/4HANA Fiori
 * Business Catalogs, Business Roles, Spaces, and Pages.
 */

export class PfcgRoleMappingEngine {
  /**
   * Read-only extraction of live SAP role/authorization metadata via BTP/Gateway OData.
   * Strictly uses HTTP GET and falls back gracefully when SAP is unreachable.
   * @param {string} roleName
   * @param {Object} connectivityProvider
   * @param {Object} options
   */
  async extractLiveRoleAuthorizations(roleName, connectivityProvider = null, options = {}) {
    const cleanRole = String(roleName || '').trim().toUpperCase();
    if (!cleanRole || !connectivityProvider || typeof connectivityProvider.executeQuery !== 'function') {
      return {
        roleName: cleanRole,
        provenance: 'STATIC_FALLBACK',
        liveVerified: false,
        authorizations: []
      };
    }

    const encodedRole = encodeURIComponent(cleanRole);
    const odataPath = `/sap/opu/odata/sap/APS_IAM_SI_SRV/RoleSet('${encodedRole}')?$format=json`;
    try {
      const res = await connectivityProvider.executeQuery(odataPath, {
        ...options,
        method: 'GET',
        headers: { Accept: 'application/json' }
      });

      if (res && res.success && res.data) {
        const entry = res.data?.d || res.data || {};
        return {
          roleName: cleanRole,
          provenance: 'LIVE_SAP_IAM_READ_ONLY',
          liveVerified: true,
          description: entry.Description || entry.RoleText || null,
          authorizations: Array.isArray(entry.Authorizations?.results)
            ? entry.Authorizations.results
            : (Array.isArray(entry.authorizations) ? entry.authorizations : [])
        };
      }

      return {
        roleName: cleanRole,
        provenance: 'STATIC_FALLBACK',
        liveVerified: false,
        httpStatus: res?.status || null,
        authorizations: []
      };
    } catch (err) {
      return {
        roleName: cleanRole,
        provenance: 'STATIC_FALLBACK',
        liveVerified: false,
        error: err.message,
        authorizations: []
      };
    }
  }

  /**
   * Maps PFCG roles to Fiori Launchpad Spaces, Pages, and Business Catalogs.
   * @param {Array<Object>} roles - [{ roleName, description, tcodes: string[] }]
   * @param {Object} catalogueAdapter - Official Fiori catalogue adapter
   * @param {Object} options - Optional { connectivityProvider } for live read-only role enrichment
   * @returns {Promise<Object>} Role migration plan
   */
  async mapRoles(roles = [], catalogueAdapter = null, options = {}) {
    if (!Array.isArray(roles) || roles.length === 0) {
      return { totalRoles: 0, mappings: [] };
    }

    const mappings = [];
    for (const role of roles) {
      const roleName = String(role.roleName || role.name || 'UNKNOWN_ROLE').trim().toUpperCase();
      const tcodes = Array.isArray(role.tcodes) ? role.tcodes.map((t) => String(t).trim().toUpperCase()).filter(Boolean) : [];
      const cleanStem = roleName.replace(/^Z_?/, '').replace(/[^A-Z0-9_]/g, '_');

      const catalogs = new Set();
      const businessRoles = new Set();
      const standardApps = [];
      const customTileCandidates = [];

      for (const tcode of tcodes) {
        let matches = [];
        if (catalogueAdapter && typeof catalogueAdapter.findByTCode === 'function') {
          matches = await catalogueAdapter.findByTCode(tcode);
        } else if (catalogueAdapter && typeof catalogueAdapter.search === 'function') {
          const searchRes = await catalogueAdapter.search({ q: tcode, limit: 3 });
          matches = searchRes?.apps || searchRes?.results || [];
        }

        const top = Array.isArray(matches) && matches.length > 0 ? matches[0] : null;
        if (top) {
          standardApps.push({
            tcode,
            appId: top.appId || top.fioriId,
            appName: top.appName,
            semanticObject: top.semanticObject || null,
            semanticAction: top.semanticAction || null
          });
          if (top.businessCatalog) catalogs.add(top.businessCatalog);
          if (top.businessRole) businessRoles.add(top.businessRole);
        } else {
          customTileCandidates.push({
            tcode,
            reason: tcode.startsWith('Z') || tcode.startsWith('Y')
              ? 'Custom Z/Y transaction — target for Clean Core RAP Fiori app or custom catalog tile.'
              : 'No standard Fiori app match in catalogue — review for SAP GUI for HTML tile or custom build.'
          });
        }
      }

      const liveRoleInfo = options?.connectivityProvider
        ? await this.extractLiveRoleAuthorizations(roleName, options.connectivityProvider, options)
        : null;

      mappings.push({
        pfcgRole: roleName,
        totalTcodes: tcodes.length,
        recommendedFioriSpace: `ZSP_${cleanStem}`.slice(0, 30),
        recommendedFioriPage: `ZPG_${cleanStem}`.slice(0, 30),
        recommendedBusinessCatalogs: Array.from(catalogs),
        recommendedBusinessRoles: Array.from(businessRoles),
        mappedStandardApps: standardApps,
        customTileCandidates,
        liveRoleMetadata: liveRoleInfo,
        coveragePercent: tcodes.length > 0 ? Math.round((standardApps.length / tcodes.length) * 100) : 0
      });
    }

    return {
      totalRoles: mappings.length,
      mappings
    };
  }
}

export const defaultPfcgRoleMappingEngine = new PfcgRoleMappingEngine();
export default defaultPfcgRoleMappingEngine;
