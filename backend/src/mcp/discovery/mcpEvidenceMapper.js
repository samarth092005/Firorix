/**
 * FioriX MCP Subsystem — Discovery Evidence Mapper
 *
 * Maps MCP tool execution outputs into canonical FioriX technical evidence records,
 * preserving authoritative evidence classifications and attaching explicit source provenance.
 */

import { EVIDENCE_CLASSIFICATIONS, CONFIDENCE_LEVELS } from '../../engine/technicalEvidenceEngine.js';

export class McpEvidenceMapper {
  /**
   * Maps an MCP tool execution result into one or more structured evidence records.
   *
   * @param {Object} executionResult - Normalized response from McpToolExecutor
   * @param {import('./mcpTransactionContext.js').McpTransactionContext} context
   * @returns {Array<Object>} Normalized evidence records
   */
  mapToolExecutionToEvidence(executionResult, context) {
    if (!executionResult) return [];

    const { toolName, success, result, error, executionStatus, timestamp } = executionResult;
    const evidenceList = [];

    // Unique evidence identifier generator
    const createEvidenceId = (suffix = '01') =>
      `EVD-MCP-${toolName.toUpperCase().replace(/[^A-Z0-9]/g, '_')}-${suffix}`;

    // Common MCP provenance metadata
    const buildMcpProvenance = (sourceType, verificationStatus = EVIDENCE_CLASSIFICATIONS.PENDING_VERIFICATION) => ({
      sourceType,
      sourceTool: toolName,
      serverPackage: '@sap-ux/fiori-mcp-server',
      serverVersion: '1.15.24',
      retrievedAt: timestamp || new Date().toISOString(),
      targetSystem: context.targetSystem?.systemId || null,
      verificationStatus,
      sourceReference: result?.meta?.sourceReference || null
    });

    // 1. Handle Execution Failure or Policy Blocking
    if (!success) {
      const isAuth = error?.code === 'MCP_AUTHORIZATION_FAILED' || error?.statusCode === 401 || error?.statusCode === 403;
      const classification = isAuth
        ? EVIDENCE_CLASSIFICATIONS.BLOCKED_BY_AUTHORIZATION
        : EVIDENCE_CLASSIFICATIONS.UNAVAILABLE;

      evidenceList.push({
        evidenceId: createEvidenceId('ERR'),
        evidenceType: 'MCP_TOOL_EXECUTION',
        category: 'MCP_DIAGNOSTIC',
        sourceSystem: 'MCP_CLIENT_SUBSYSTEM',
        sourceName: toolName,
        sourceRecordId: toolName,
        retrievedValue: {
          executionStatus,
          errorCode: error?.code || 'UNKNOWN_ERROR',
          errorMessage: error?.message || 'Tool execution unsuccessful'
        },
        evidenceValue: {
          executionStatus,
          error: error?.message
        },
        confidence: CONFIDENCE_LEVELS.UNKNOWN,
        reliabilityScore: 0,
        verified: false,
        classification,
        provenance: buildMcpProvenance('MCP_EXECUTION_FAILURE', classification),
        limitations: [
          `MCP tool ${toolName} execution ended in status ${executionStatus}: ${error?.message || 'Failed'}.`,
          'No authoritative metadata collected from this invocation.'
        ],
        missingEvidence: [`Authoritative output from tool ${toolName}`],
        verificationRequirements: ['Ensure MCP server connection is active and tool arguments are valid.']
      });
      return evidenceList;
    }

    // 2. Map Successful Output by Tool Type
    switch (toolName) {
      case 'search_docs': {
        const textContent = result?.text || '';
        const parsedData = result?.parsed;
        const queryUsed = executionResult.arguments?.query || context.searchQuery || '';

        evidenceList.push({
          evidenceId: createEvidenceId('DOC'),
          evidenceType: 'SAP_DOCUMENTATION_EVIDENCE',
          category: 'DOCUMENTATION',
          sourceSystem: 'SAP_FIORI_DOCS_PORTAL',
          sourceName: 'search_docs',
          sourceRecordId: queryUsed,
          retrievedValue: parsedData || textContent,
          evidenceValue: {
            query: queryUsed,
            summaryText: textContent.slice(0, 500),
            rawSnippetLength: textContent.length
          },
          confidence: CONFIDENCE_LEVELS.MEDIUM,
          reliabilityScore: 70,
          verified: false,
          classification: EVIDENCE_CLASSIFICATIONS.PENDING_VERIFICATION,
          provenance: buildMcpProvenance('MCP_DOCUMENTATION_RESPONSE', EVIDENCE_CLASSIFICATIONS.PENDING_VERIFICATION),
          limitations: [
            'Documentation results provide conceptual guidance and guidelines.',
            'Documentation evidence does NOT establish live system availability on target landscape.',
            'Cannot independently confirm transaction equivalence or authorization.'
          ],
          missingEvidence: [
            'Live S21 Gateway catalog corroboration',
            'Target system PFCG role authorization verification'
          ],
          verificationRequirements: [
            'Verify mentioned Fiori application IDs in canonical FAL catalogue or live S21 system.'
          ]
        });
        break;
      }

      case 'list_sap_systems': {
        const systems = Array.isArray(result?.parsed)
          ? result.parsed
          : (Array.isArray(result?.parsed?.systems) ? result.parsed.systems : []);

        evidenceList.push({
          evidenceId: createEvidenceId('SYS'),
          evidenceType: 'SAP_SYSTEM_CONFIGURATION_EVIDENCE',
          category: 'ENVIRONMENT_CONFIGURATION',
          sourceSystem: 'MCP_USER_SYSTEM_STORE',
          sourceName: 'list_sap_systems',
          sourceRecordId: 'CONFIGURED_SYSTEMS',
          retrievedValue: systems,
          evidenceValue: {
            configuredSystemCount: systems.length,
            systems: systems.slice(0, 5)
          },
          confidence: CONFIDENCE_LEVELS.MEDIUM,
          reliabilityScore: 65,
          verified: false,
          classification: EVIDENCE_CLASSIFICATIONS.PENDING_VERIFICATION,
          provenance: buildMcpProvenance('MCP_SYSTEM_DISCOVERY_RESPONSE', EVIDENCE_CLASSIFICATIONS.PENDING_VERIFICATION),
          limitations: [
            'Configured system entries reflect local user configuration stores.',
            'Presence in configuration does NOT guarantee live network reachability or RFC/Gateway availability.',
            'Does NOT establish target client authorization or user permissions.'
          ],
          missingEvidence: [
            'Live BTP destination health check confirmation',
            'Target Gateway service collection reachability'
          ],
          verificationRequirements: [
            'Execute live BTP destination smoke test or Gateway catalog probe to verify live connectivity.'
          ]
        });
        break;
      }

      case 'list_fiori_apps': {
        const apps = Array.isArray(result?.parsed)
          ? result.parsed
          : (Array.isArray(result?.parsed?.apps) ? result.parsed.apps : []);

        evidenceList.push({
          evidenceId: createEvidenceId('APPS'),
          evidenceType: 'FIORI_LOCAL_APP_INSPECTION',
          category: 'LOCAL_WORKSPACE',
          sourceSystem: 'LOCAL_WORKSPACE_SCAN',
          sourceName: 'list_fiori_apps',
          sourceRecordId: executionResult.arguments?.searchPath || 'WORKSPACE',
          retrievedValue: apps,
          evidenceValue: {
            discoveredAppCount: apps.length,
            discoveredApps: apps.slice(0, 10)
          },
          confidence: CONFIDENCE_LEVELS.MEDIUM,
          reliabilityScore: 60,
          verified: false,
          classification: EVIDENCE_CLASSIFICATIONS.PENDING_VERIFICATION,
          provenance: buildMcpProvenance('MCP_FIORI_DISCOVERY_RESPONSE', EVIDENCE_CLASSIFICATIONS.PENDING_VERIFICATION),
          limitations: [
            'Discovered applications from local directory require matching against standard catalogue.',
            'Local project presence does not indicate deployed S/4HANA target availability.'
          ],
          missingEvidence: [
            'Official FAL catalogue record verification'
          ],
          verificationRequirements: [
            'Match discovered app manifests against canonical catalogue.'
          ]
        });
        break;
      }

      case 'list_functionality':
      case 'get_functionality_details': {
        evidenceList.push({
          evidenceId: createEvidenceId('FUNC'),
          evidenceType: 'FIORI_MODIFICATION_FUNCTIONALITY',
          category: 'FUNCTIONAL_SPECIFICATION',
          sourceSystem: 'MCP_FIORI_SERVER',
          sourceName: toolName,
          sourceRecordId: executionResult.arguments?.functionalityId || toolName,
          retrievedValue: result?.parsed || result?.text || null,
          evidenceValue: {
            functionalityDetails: result?.parsed || result?.text?.slice(0, 300)
          },
          confidence: CONFIDENCE_LEVELS.MEDIUM,
          reliabilityScore: 60,
          verified: false,
          classification: EVIDENCE_CLASSIFICATIONS.PENDING_VERIFICATION,
          provenance: buildMcpProvenance('MCP_FUNCTIONALITY_RESPONSE', EVIDENCE_CLASSIFICATIONS.PENDING_VERIFICATION),
          limitations: [
            'Functionality details describe modification options for existing projects, not transaction replacements.'
          ],
          missingEvidence: [],
          verificationRequirements: []
        });
        break;
      }

      default: {
        evidenceList.push({
          evidenceId: createEvidenceId('GEN'),
          evidenceType: 'MCP_GENERIC_RESULT',
          category: 'MCP_DISCOVERY',
          sourceSystem: 'MCP_SERVER',
          sourceName: toolName,
          sourceRecordId: toolName,
          retrievedValue: result?.parsed || result?.text || null,
          evidenceValue: { summary: (result?.text || '').slice(0, 300) },
          confidence: CONFIDENCE_LEVELS.LOW,
          reliabilityScore: 40,
          verified: false,
          classification: EVIDENCE_CLASSIFICATIONS.PENDING_VERIFICATION,
          provenance: buildMcpProvenance('MCP_GENERIC_RESPONSE', EVIDENCE_CLASSIFICATIONS.PENDING_VERIFICATION),
          limitations: ['Generic MCP tool output without dedicated domain mapper.'],
          missingEvidence: [],
          verificationRequirements: []
        });
        break;
      }
    }

    return evidenceList;
  }
}

export const defaultMcpEvidenceMapper = new McpEvidenceMapper();
