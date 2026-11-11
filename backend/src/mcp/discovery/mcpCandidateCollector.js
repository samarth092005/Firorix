/**
 * FioriX MCP Subsystem — Discovery Candidate Collector
 *
 * Extracts Fiori application candidate references from MCP tool responses,
 * normalizes candidate records, and merges them with the local canonical FAL catalogue.
 * Preserves strict source provenance, tags duplicate and conflicting fields,
 * and maintains the integrity of the 32-record canonical catalogue baseline.
 */

import { officialFioriCatalogueAdapter } from '../../adapters/officialFioriCatalogueAdapter.js';

export const CANDIDATE_SOURCES = {
  LOCAL_OFFICIAL_CATALOGUE: 'LOCAL_OFFICIAL_CATALOGUE',
  MCP_FIORI_DISCOVERY: 'MCP_FIORI_DISCOVERY',
  MCP_DOCUMENTATION_DISCOVERY: 'MCP_DOCUMENTATION_DISCOVERY',
  LIVE_SAP_DISCOVERY: 'LIVE_SAP_DISCOVERY',
  CURATED_FIXTURE: 'CURATED_FIXTURE'
};

const FIORI_APP_ID_REGEX = /\b(F[0-9]{4}[A-Z]?)\b/g;

export class McpCandidateCollector {
  constructor(options = {}) {
    this.catalogueAdapter = options.catalogueAdapter || officialFioriCatalogueAdapter;
  }

  /**
   * Extracts candidate applications from MCP execution results and merges them with local catalogue candidates.
   *
   * @param {Array<Object>} executionResults - Results from McpToolExecutor
   * @param {Array<Object>} localCatalogueCandidates - Initial candidates from officialFioriCatalogueAdapter
   * @param {import('./mcpTransactionContext.js').McpTransactionContext} context
   * @returns {Promise<{ mergedCandidates: Array<Object>, mcpDiscoveredCount: number, duplicatesCount: number }>}
   */
  async collectAndMergeCandidates(executionResults = [], localCatalogueCandidates = [], context = {}) {
    const rawMcpCandidates = this._extractCandidatesFromResults(executionResults);

    // Build map of local catalogue candidates by normalized App ID
    const candidateMap = new Map();
    let duplicatesCount = 0;
    let newMcpDiscoveredCount = 0;

    // 1. Seed candidate map with official local catalogue records
    for (const localApp of localCatalogueCandidates) {
      if (!localApp || !localApp.appId) continue;
      const key = localApp.appId.toUpperCase();
      candidateMap.set(key, {
        ...localApp,
        source: CANDIDATE_SOURCES.LOCAL_OFFICIAL_CATALOGUE,
        sources: [CANDIDATE_SOURCES.LOCAL_OFFICIAL_CATALOGUE],
        inLocalCatalogue: true,
        conflictingFields: [],
        mcpEnrichment: null
      });
    }

    // 2. Merge or add MCP-discovered candidates
    for (const mcpCand of rawMcpCandidates) {
      const key = mcpCand.appId.toUpperCase();

      if (candidateMap.has(key)) {
        // Candidate already present from local catalogue: merge non-conflicting metadata
        duplicatesCount++;
        const existing = candidateMap.get(key);

        const conflicting = [];
        // Check for conflicting descriptions or titles if both present
        if (mcpCand.appName && existing.appName && mcpCand.appName.toLowerCase() !== existing.appName.toLowerCase()) {
          conflicting.push({
            field: 'appName',
            catalogueValue: existing.appName,
            mcpValue: mcpCand.appName
          });
        }

        // Add source to sources array if not present
        if (!existing.sources.includes(mcpCand.source)) {
          existing.sources.push(mcpCand.source);
        }

        existing.conflictingFields = [...(existing.conflictingFields || []), ...conflicting];
        existing.mcpEnrichment = {
          discoveredViaTool: mcpCand.originalMcpTool,
          mcpSnippet: mcpCand.description,
          discoveryTimestamp: mcpCand.discoveryTimestamp
        };
      } else {
        // Check if candidate exists in canonical local catalogue cache
        let canonicalApp = null;
        try {
          canonicalApp = await this.catalogueAdapter.getAppById(mcpCand.appId);
        } catch {
          // ignore lookup error
        }

        if (canonicalApp) {
          // Exists in catalogue cache, just wasn't in initial search results
          duplicatesCount++;
          candidateMap.set(key, {
            ...canonicalApp,
            source: CANDIDATE_SOURCES.LOCAL_OFFICIAL_CATALOGUE,
            sources: [CANDIDATE_SOURCES.LOCAL_OFFICIAL_CATALOGUE, mcpCand.source],
            inLocalCatalogue: true,
            conflictingFields: [],
            mcpEnrichment: {
              discoveredViaTool: mcpCand.originalMcpTool,
              mcpSnippet: mcpCand.description,
              discoveryTimestamp: mcpCand.discoveryTimestamp
            }
          });
        } else {
          // Truly external candidate discovered via MCP (not in local 32-record catalogue)
          newMcpDiscoveredCount++;
          candidateMap.set(key, {
            appId: mcpCand.appId,
            appName: mcpCand.appName || `SAP Fiori Application ${mcpCand.appId}`,
            description: mcpCand.description || 'Discovered via SAP Fiori MCP tooling; pending target verification.',
            appType: mcpCand.appType || 'Transactional',
            uiTechnology: mcpCand.uiTechnology || 'SAP Fiori elements',
            businessProcess: mcpCand.businessProcess || context.userRequirement?.businessProcess || 'Pending Verification',
            lineOfBusiness: mcpCand.lineOfBusiness || 'Pending Verification',
            productVersion: mcpCand.productVersion || 'Pending Target Verification',
            softwareComponent: mcpCand.softwareComponent || null,
            businessRole: mcpCand.businessRole || null,
            odataServices: mcpCand.odataServices || [],
            source: mcpCand.source,
            sources: [mcpCand.source],
            provenance: mcpCand.source,
            inLocalCatalogue: false,
            isExternalMcpDiscovered: true,
            originalMcpTool: mcpCand.originalMcpTool,
            discoveryTimestamp: mcpCand.discoveryTimestamp,
            conflictingFields: [],
            verificationStatus: 'PENDING_TARGET_VERIFICATION',
            limitations: [
              `Discovered via MCP tool "${mcpCand.originalMcpTool}".`,
              'Not verified in local canonical FAL catalogue cache.',
              'Release compatibility and target system deployment must be evaluated.'
            ]
          });
        }
      }
    }

    return {
      mergedCandidates: Array.from(candidateMap.values()),
      mcpDiscoveredCount: newMcpDiscoveredCount,
      duplicatesCount
    };
  }

  /**
   * Extracts raw candidate objects from execution results.
   *
   * @private
   * @param {Array<Object>} executionResults
   * @returns {Array<Object>}
   */
  _extractCandidatesFromResults(executionResults = []) {
    const discovered = [];
    const seenIds = new Set();

    for (const exec of executionResults) {
      if (!exec || !exec.success) continue;

      const toolName = exec.toolName;
      const text = exec.result?.text || exec.result?.rawText || '';
      const parsed = exec.result?.parsed;

      // A. Structured arrays (e.g. from list_fiori_apps or mock fixtures)
      if (Array.isArray(parsed)) {
        for (const item of parsed) {
          const id = item.appId || item.id;
          if (id && typeof id === 'string' && !seenIds.has(id.toUpperCase())) {
            seenIds.add(id.toUpperCase());
            discovered.push({
              appId: id.toUpperCase(),
              appName: item.appName || item.title || item.name || id,
              description: item.description || null,
              appType: item.appType || item.type || 'Transactional',
              uiTechnology: item.uiTechnology || 'SAP Fiori elements',
              businessProcess: item.businessProcess || null,
              lineOfBusiness: item.lineOfBusiness || null,
              productVersion: item.productVersion || null,
              odataServices: Array.isArray(item.odataServices) ? item.odataServices : [],
              source: CANDIDATE_SOURCES.MCP_FIORI_DISCOVERY,
              originalMcpTool: toolName,
              discoveryTimestamp: exec.timestamp || new Date().toISOString()
            });
          }
        }
      }

      // B. Regex scan of textual documentation output (e.g. search_docs)
      if (text && typeof text === 'string') {
        const matches = text.match(FIORI_APP_ID_REGEX);
        if (matches) {
          for (const match of matches) {
            const appId = match.toUpperCase();
            if (!seenIds.has(appId)) {
              seenIds.add(appId);

              // Extract context snippet around the match
              const matchIdx = text.indexOf(match);
              const start = Math.max(0, matchIdx - 100);
              const end = Math.min(text.length, matchIdx + 150);
              const snippet = text.slice(start, end).replace(/\s+/g, ' ').trim();

              discovered.push({
                appId,
                appName: `App ${appId}`,
                description: `Referenced in documentation snippet: "...${snippet}..."`,
                appType: 'Transactional',
                uiTechnology: 'SAP Fiori elements',
                businessProcess: null,
                lineOfBusiness: null,
                productVersion: null,
                odataServices: [],
                source: CANDIDATE_SOURCES.MCP_DOCUMENTATION_DISCOVERY,
                originalMcpTool: toolName,
                discoveryTimestamp: exec.timestamp || new Date().toISOString()
              });
            }
          }
        }
      }
    }

    return discovered;
  }
}

export const defaultMcpCandidateCollector = new McpCandidateCollector();
