/**
 * Fiorify MCP Subsystem — Discovery Orchestrator
 *
 * Coordinates MCP-assisted discovery operations for transaction and requirement queries:
 * 1. Evaluates execution policy against current connection and registry state.
 * 2. Invokes approved tools in a bounded, fault-isolated manner.
 * 3. Maps tool responses into canonical technical evidence records.
 * 4. Extracts candidates and merges them with the canonical local catalogue.
 * 5. Returns structured telemetry, provenance, and failure isolation indicators.
 */

import { defaultMcpService } from '../services/mcpService.js';
import { McpTransactionContext } from './mcpTransactionContext.js';
import { defaultMcpDiscoveryPolicy } from './mcpDiscoveryPolicy.js';
import { defaultMcpEvidenceMapper } from './mcpEvidenceMapper.js';
import { defaultMcpCandidateCollector } from './mcpCandidateCollector.js';
import { McpDiscoveryResult } from './mcpDiscoveryResult.js';
import { mcpLogger } from '../utils/mcpLogger.js';

export class McpDiscoveryOrchestrator {
  constructor(options = {}) {
    this.mcpService = options.mcpService || defaultMcpService;
    this.policy = options.policy || defaultMcpDiscoveryPolicy;
    this.evidenceMapper = options.evidenceMapper || defaultMcpEvidenceMapper;
    this.candidateCollector = options.candidateCollector || defaultMcpCandidateCollector;
  }

  /**
   * Executes MCP-assisted discovery for a given transaction context.
   *
   * @param {Object} rawParams - Request parameters (tcode, description, requirement, mcpOptions, etc.)
   * @param {Array<Object>} [initialLocalCandidates] - Candidates found in local catalogue
   * @returns {Promise<{ discoveryResult: McpDiscoveryResult, mergedCandidates: Array<Object>, mcpEvidence: Array<Object> }>}
   */
  async executeAssistedDiscovery(rawParams = {}, initialLocalCandidates = []) {
    const startTime = Date.now();
    const context = new McpTransactionContext(rawParams);

    const mcpStatus = this.mcpService.getStatus();
    const toolRegistry = this.mcpService.toolRegistry;

    // 1. Evaluate policy and plan
    const plan = this.policy.evaluatePlan(context, mcpStatus, toolRegistry);

    if (!plan.shouldExecute) {
      mcpLogger.info(`MCP assisted discovery skipped. Reason: ${plan.reason}`);
      const emptyResult = new McpDiscoveryResult({
        success: true,
        status: plan.reason,
        mcpStatus,
        toolsInvoked: [],
        toolsSkipped: plan.skippedTools || [],
        toolsFailed: [],
        mcpCandidates: [],
        mcpEvidence: [],
        executionDurationMs: Date.now() - startTime
      });

      return {
        discoveryResult: emptyResult,
        mergedCandidates: initialLocalCandidates,
        mcpEvidence: []
      };
    }

    // 2. Execute planned tools with per-tool timeout and isolation
    const toolsInvoked = [];
    const toolsFailed = [];
    const executionResults = [];

    for (const call of plan.plannedCalls) {
      const callStart = Date.now();
      try {
        mcpLogger.info(`Orchestrator executing approved MCP tool: ${call.toolName}`);
        const res = await this.mcpService.executeTool(
          call.toolName,
          call.arguments,
          { timeoutMs: call.timeoutMs }
        );

        const durationMs = Date.now() - callStart;
        executionResults.push(res);

        if (res.success) {
          toolsInvoked.push({
            toolName: call.toolName,
            executionStatus: res.executionStatus || 'SUCCESS',
            durationMs
          });
        } else {
          toolsFailed.push({
            toolName: call.toolName,
            executionStatus: res.executionStatus || 'FAILED',
            error: res.error?.message || 'Execution unsuccessful',
            durationMs
          });
        }
      } catch (err) {
        const durationMs = Date.now() - callStart;
        mcpLogger.warn(`MCP tool invocation caught error for ${call.toolName}: ${err.message}`);
        const errorExec = {
          toolName: call.toolName,
          success: false,
          executionStatus: 'FAILED',
          error: { message: err.message, code: 'MCP_INVOCATION_ERROR' },
          timestamp: new Date().toISOString()
        };
        executionResults.push(errorExec);
        toolsFailed.push({
          toolName: call.toolName,
          executionStatus: 'FAILED',
          error: err.message,
          durationMs
        });
      }
    }

    // 3. Map execution outputs to canonical technical evidence
    const mcpEvidence = [];
    for (const execResult of executionResults) {
      try {
        const mapped = this.evidenceMapper.mapToolExecutionToEvidence(execResult, context);
        if (Array.isArray(mapped)) {
          mcpEvidence.push(...mapped);
        }
      } catch (mapErr) {
        mcpLogger.warn(`Evidence mapping error for ${execResult.toolName}: ${mapErr.message}`);
      }
    }

    // 4. Extract and merge candidates with local catalogue
    let mergedCandidates = initialLocalCandidates;
    let mcpDiscoveredCount = 0;
    let duplicatesCount = 0;

    try {
      const mergeOutput = await this.candidateCollector.collectAndMergeCandidates(
        executionResults,
        initialLocalCandidates,
        context
      );
      mergedCandidates = mergeOutput.mergedCandidates;
      mcpDiscoveredCount = mergeOutput.mcpDiscoveredCount;
      duplicatesCount = mergeOutput.duplicatesCount;
    } catch (mergeErr) {
      mcpLogger.warn(`Candidate collection/merging error: ${mergeErr.message}`);
    }

    const durationMs = Date.now() - startTime;
    const isSuccess = toolsFailed.length === 0 || toolsInvoked.length > 0;

    const discoveryResult = new McpDiscoveryResult({
      success: isSuccess,
      status: isSuccess ? 'COMPLETED' : 'DEGRADED',
      mcpStatus,
      toolsInvoked,
      toolsSkipped: plan.skippedTools || [],
      toolsFailed,
      candidatesEnrichedCount: duplicatesCount,
      mcpDiscoveredCandidatesCount: mcpDiscoveredCount,
      mcpEvidence,
      executionDurationMs: durationMs
    });

    return {
      discoveryResult,
      mergedCandidates,
      mcpEvidence
    };
  }
}

export const defaultMcpDiscoveryOrchestrator = new McpDiscoveryOrchestrator();
