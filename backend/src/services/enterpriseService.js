/**
 * FioriX — Enterprise Assessment & Modernization Planning Service (ENTERPRISE-01)
 *
 * Implements:
 * - Multi-system assessment isolation and multi-level hierarchy (Transaction, Process, System).
 * - Multi-transaction parent-child aggregation without data loss.
 * - Business process mapping and cross-object dependency analysis.
 * - Real-time Enterprise Modernization Portfolio derived dynamically from persisted records.
 * - Prioritized Modernization Roadmap with sequenced work items.
 * - DEV / QAS / PRD Deployment Readiness tracking.
 * - Exportable audit and executive modernization reports.
 */

import { defaultAssessmentStore, LIFECYCLE_STATES } from './assessmentStore.js';
import { defaultSystemRegistry } from '../adapters/systemRegistry.js';
import { RECOMMENDATION_OUTCOMES } from '../engine/recommendationEngine.js';

export const ASSESSMENT_LEVELS = Object.freeze({
  TRANSACTION: 'TRANSACTION',
  PROCESS: 'PROCESS',
  SYSTEM: 'SYSTEM'
});

export const DEPLOYMENT_STAGES = Object.freeze({
  DEV_READINESS: 'DEV_READINESS',
  QAS_VALIDATION: 'QAS_VALIDATION',
  BUSINESS_ACCEPTANCE: 'BUSINESS_ACCEPTANCE',
  PRODUCTION_READINESS: 'PRODUCTION_READINESS',
  DEPLOYMENT_APPROVED: 'DEPLOYMENT_APPROVED',
  POST_DEPLOYMENT_VERIFICATION: 'POST_DEPLOYMENT_VERIFICATION'
});

export class EnterpriseService {
  constructor(options = {}) {
    this.assessmentStore = options.assessmentStore || defaultAssessmentStore;
    this.systemRegistry = options.systemRegistry || defaultSystemRegistry;
  }

  /**
   * Retrieves aggregated Enterprise Modernization Portfolio metrics dynamically from real stored records.
   */
  async getPortfolioMetrics(systemId = null) {
    const filters = systemId ? { systemId } : {};
    const assessments = await this.assessmentStore.list(filters);

    const systemsAssessed = new Set();
    const transactionsAnalyzed = new Set();
    let verifiedFioriMatches = 0;
    let functionalAlternatives = 0;
    let criticalGaps = 0;
    let pendingApprovals = 0;

    const outcomes = {
      [RECOMMENDATION_OUTCOMES.ADOPT]: 0,
      [RECOMMENDATION_OUTCOMES.CONFIGURE]: 0,
      [RECOMMENDATION_OUTCOMES.EXTEND]: 0,
      [RECOMMENDATION_OUTCOMES.BUILD]: 0,
      [RECOMMENDATION_OUTCOMES.REVIEW]: 0,
      [RECOMMENDATION_OUTCOMES.PENDING_VERIFICATION]: 0,
      [RECOMMENDATION_OUTCOMES.INSUFFICIENT_EVIDENCE]: 0
    };

    const cleanCoreTiers = {
      TIER_1_KEY_USER: 0,
      TIER_2_CLOUD_DEVELOPER: 0,
      TIER_3_CLASSIC_CORE: 0,
      STANDARD_ADOPTION: 0
    };

    let totalScore = 0;
    let scoredCount = 0;

    for (const asm of assessments) {
      if (asm.systemId) systemsAssessed.add(asm.systemId);
      if (asm.tcode) transactionsAnalyzed.add(asm.tcode);

      if (asm.lifecycleStatus === LIFECYCLE_STATES.PENDING_REVIEW) {
        pendingApprovals++;
      }

      const outcome = asm.recommendation?.outcome;
      if (outcome && outcomes[outcome] !== undefined) {
        outcomes[outcome]++;
      }

      if (asm.assessmentResult === 'VERIFIED_FIT' || asm.assessmentResult === 'EXPLICIT_SUCCESSOR') {
        verifiedFioriMatches++;
      } else if (asm.assessmentResult === 'FUNCTIONAL_ALTERNATIVE' || asm.assessmentResult === 'PARTIAL_FIT') {
        functionalAlternatives++;
      }

      const gaps = Array.isArray(asm.identifiedGaps) ? asm.identifiedGaps : [];
      criticalGaps += gaps.filter((g) => g.severity === 'CRITICAL').length;

      const tier = asm.recommendation?.extensibilityStrategy?.tier;
      if (tier === 'TIER_1_KEY_USER') cleanCoreTiers.TIER_1_KEY_USER++;
      else if (tier === 'TIER_2_CLOUD_DEVELOPER') cleanCoreTiers.TIER_2_CLOUD_DEVELOPER++;
      else if (tier === 'TIER_3_CLASSIC_CORE') cleanCoreTiers.TIER_3_CLASSIC_CORE++;
      else cleanCoreTiers.STANDARD_ADOPTION++;

      if (typeof asm.fitGapScore === 'number' && asm.fitGapScore > 0) {
        totalScore += asm.fitGapScore;
        scoredCount++;
      }
    }

    const registeredSystems = this.systemRegistry.listSystems();
    const averageScore = scoredCount > 0 ? Math.round((totalScore / scoredCount) * 10) / 10 : 0;

    const bySystem = {};
    for (const asm of assessments) {
      const sid = asm.systemId || 'UNKNOWN';
      if (!bySystem[sid]) {
        bySystem[sid] = { total: 0, byOutcome: {} };
      }
      bySystem[sid].total++;
      const outc = asm.recommendation?.outcome || 'REVIEW';
      bySystem[sid].byOutcome[outc] = (bySystem[sid].byOutcome[outc] || 0) + 1;
    }

    return {
      totalAssessments: assessments.length,
      systemsAssessedCount: systemsAssessed.size,
      systemsAssessed: Array.from(systemsAssessed),
      configuredSystemsCount: registeredSystems.length,
      transactionsAnalyzedCount: transactionsAnalyzed.size,
      transactionsAnalyzed: Array.from(transactionsAnalyzed),
      verifiedFioriMatches,
      functionalAlternatives,
      criticalGaps,
      pendingApprovals,
      averageFitGapScore: averageScore,
      recommendationsByOutcome: outcomes,
      byOutcome: outcomes,
      bySystem,
      cleanCoreTiers,
      evidenceCoveragePercent: assessments.length > 0
        ? Math.round((assessments.filter((a) => a.evidenceConfidence === 'HIGH' || a.evidenceConfidence === 'MEDIUM').length / assessments.length) * 100)
        : 0,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Generates a sequenced, actionable Modernization Roadmap based on real persisted assessments.
   */
  async generateRoadmap(systemId = null) {
    const filters = systemId ? { systemId } : {};
    const assessments = await this.assessmentStore.list(filters);

    const workItems = [];
    let counter = 1;

    for (const asm of assessments) {
      const outcome = asm.recommendation?.outcome || 'REVIEW';
      let priority = 'MEDIUM';
      let businessImpact = 'MEDIUM';
      let technicalImpact = 'MEDIUM';

      if (outcome === RECOMMENDATION_OUTCOMES.ADOPT) {
        priority = 'HIGH';
        businessImpact = 'HIGH';
        technicalImpact = 'LOW';
      } else if (outcome === RECOMMENDATION_OUTCOMES.CONFIGURE) {
        priority = 'HIGH';
        businessImpact = 'HIGH';
        technicalImpact = 'MEDIUM';
      } else if (outcome === RECOMMENDATION_OUTCOMES.EXTEND) {
        priority = 'MEDIUM';
        businessImpact = 'MEDIUM';
        technicalImpact = 'MEDIUM';
      } else if (outcome === RECOMMENDATION_OUTCOMES.BUILD) {
        priority = 'CRITICAL';
        businessImpact = 'HIGH';
        technicalImpact = 'HIGH';
      } else if (outcome === RECOMMENDATION_OUTCOMES.REVIEW) {
        priority = 'LOW';
        businessImpact = 'MEDIUM';
        technicalImpact = 'HIGH';
      }

      workItems.push({
        workItemId: `WI-${String(counter++).padStart(3, '0')}`,
        title: `Modernize ${asm.tcode}: ${asm.description || asm.matchingFioriApp?.appName || 'Business Transaction'}`,
        systemId: asm.systemId || 'S21-200',
        businessProcess: asm.businessArea || 'General Business Area',
        relatedAssessmentId: asm.id,
        tcode: asm.tcode,
        targetFioriAppId: asm.matchingFioriApp?.appId || null,
        targetFioriAppName: asm.matchingFioriApp?.appName || null,
        recommendationOutcome: outcome,
        priority,
        businessImpact,
        technicalImpact,
        responsibleRole: outcome === 'BUILD' ? 'Lead ABAP Architect' : (outcome === 'CONFIGURE' ? 'Security / Basis Team' : 'SAP Functional Consultant'),
        approvalState: asm.lifecycleStatus,
        plannedStatus: asm.lifecycleStatus === 'APPROVED' ? 'SCHEDULED_FOR_SPRINT' : 'PENDING_APPROVAL',
        deploymentStage: asm.deploymentReadiness?.stage || 'DEV_READINESS',
        dependencies: [
          ...(asm.matchingFioriApp?.odataServices || []),
          ...(asm.matchingFioriApp?.businessRoles || [])
        ],
        remediationStepsCount: asm.actionableRemediationPlan?.length || 0
      });
    }

    // Sequence work items by priority
    const priorityOrder = { CRITICAL: 1, HIGH: 2, MEDIUM: 3, LOW: 4 };
    workItems.sort((a, b) => (priorityOrder[a.priority] || 5) - (priorityOrder[b.priority] || 5));

    const phases = {
      wave1_standardAdoption: workItems.filter(w => w.recommendationOutcome === 'ADOPT'),
      wave2_configureAndExtend: workItems.filter(w => w.recommendationOutcome === 'CONFIGURE' || w.recommendationOutcome === 'EXTEND'),
      wave3_cleanCoreBuild: workItems.filter(w => w.recommendationOutcome === 'BUILD'),
      wave4_assessmentReview: workItems.filter(w => !['ADOPT', 'CONFIGURE', 'EXTEND', 'BUILD'].includes(w.recommendationOutcome))
    };

    return {
      totalWorkItems: workItems.length,
      systemId: systemId || 'ALL_LANDSCAPES',
      generatedAt: new Date().toISOString(),
      phases,
      workItems
    };
  }

  /**
   * Creates a multi-transaction Process-Level Assessment (parent-child relationship).
   */
  async createProcessAssessment(processPayload, userContext) {
    const {
      processId,
      processName,
      systemId = 'S21-200',
      description = '',
      transactions = []
    } = processPayload;

    if (!processName || !Array.isArray(transactions) || transactions.length === 0) {
      throw new Error('Process assessment requires a processName and an array of transactions.');
    }

    const childIds = [];
    let aggregateScore = 0;
    let totalGaps = 0;

    // Create child transaction assessments
    for (const item of transactions) {
      const tcode = typeof item === 'string' ? item : item.tcode;
      const childPayload = {
        tcode,
        systemId,
        businessArea: processName,
        classification: 'STANDARD',
        description: `Process step for ${tcode} under ${processName}`,
        assessmentLevel: ASSESSMENT_LEVELS.TRANSACTION,
        businessProcessId: processId || `PROC-${Date.now()}`
      };
      const child = await this.assessmentStore.create(childPayload, null, userContext);
      childIds.push(child.id);
      aggregateScore += (child.fitGapScore || 0);
      totalGaps += (child.gapsCount || 0);
    }

    const avgScore = Math.round(aggregateScore / transactions.length);

    // Create Parent Assessment Record
    const parentPayload = {
      id: `ASM-PROC-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
      tcode: `PROC_${transactions.length}_TXS`,
      systemId,
      businessArea: processName,
      description: description || `Multi-transaction process assessment for ${processName}`,
      classification: 'STANDARD',
      fitGapScore: avgScore,
      gapsCount: totalGaps,
      assessmentLevel: ASSESSMENT_LEVELS.PROCESS,
      childAssessmentIds: childIds,
      businessProcessId: processId || `PROC-${Date.now()}`
    };

    const parent = await this.assessmentStore.create(parentPayload, null, userContext);
    return {
      parentAssessment: parent,
      childAssessmentsCount: childIds.length,
      childAssessmentIds: childIds
    };
  }

  /**
   * Tracks deployment readiness stage progression without executing live production writes.
   */
  async updateDeploymentReadiness(assessmentId, readinessUpdate, userContext) {
    const existing = await this.assessmentStore.getById(assessmentId);
    if (!existing) {
      throw new Error(`Assessment "${assessmentId}" not found.`);
    }

    const currentReadiness = existing.deploymentReadiness || {
      stage: DEPLOYMENT_STAGES.DEV_READINESS,
      devReady: false,
      qasValidated: false,
      businessAccepted: false,
      productionReady: false,
      approvedForDeployment: false
    };

    const updatedReadiness = {
      ...currentReadiness,
      ...readinessUpdate,
      lastUpdated: new Date().toISOString(),
      updatedBy: userContext?.name || 'Lead SAP Architect'
    };

    return await this.assessmentStore.update(
      assessmentId,
      { deploymentReadiness: updatedReadiness, action: 'DEPLOYMENT_READINESS_UPDATED' },
      userContext?.name || 'Lead SAP Architect',
      `Deployment readiness advanced to stage ${updatedReadiness.stage}.`,
      userContext
    );
  }

  /**
   * Exports an audit or executive modernization report.
   */
  async exportReport(reportType, filters = {}) {
    const portfolio = await this.getPortfolioMetrics(filters.systemId);
    const roadmap = await this.generateRoadmap(filters.systemId);
    const assessments = await this.assessmentStore.list(filters);

    return {
      reportType: String(reportType).toUpperCase(),
      title: `FioriX Enterprise SAP Modernization Report: ${reportType}`,
      generatedAt: new Date().toISOString(),
      systemScope: filters.systemId || 'ALL_CONFIGURED_SYSTEMS',
      executiveSummary: {
        totalAssessments: portfolio.totalAssessments,
        verifiedFioriMatches: portfolio.verifiedFioriMatches,
        pendingApprovals: portfolio.pendingApprovals,
        criticalGaps: portfolio.criticalGaps,
        averageFitGapScore: portfolio.averageFitGapScore
      },
      portfolio,
      roadmap,
      records: assessments.map((a) => ({
        id: a.id,
        tcode: a.tcode,
        systemId: a.systemId,
        lifecycleStatus: a.lifecycleStatus,
        fitGapScore: a.fitGapScore,
        outcome: a.recommendation?.outcome || 'REVIEW',
        candidateAppId: a.matchingFioriApp?.appId || 'NONE',
        candidateAppName: a.matchingFioriApp?.appName || 'NONE',
        deploymentStage: a.deploymentReadiness?.stage || 'DEV_READINESS'
      }))
    };
  }

  /**
   * Renders report as formatted Markdown
   */
  renderReportMarkdown(report) {
    const p = report.portfolio || {};
    const e = report.executiveSummary || {};
    return [
      `# FioriX Enterprise Modernization Report — ${report.title || report.reportType}`,
      `**Generated At:** ${report.generatedAt}`,
      `**System Scope:** ${report.systemScope}`,
      '',
      '## Executive Summary',
      `- **Total Assessments Analyzed:** ${e.totalAssessments || 0}`,
      `- **Verified Standard Fiori Matches:** ${e.verifiedFioriMatches || 0}`,
      `- **Pending Governance Approvals:** ${e.pendingApprovals || 0}`,
      `- **Critical Functional Gaps:** ${e.criticalGaps || 0}`,
      `- **Average Fit-Gap Score:** ${e.averageFitGapScore || 0}%`,
      '',
      '## Modernization Roadmap Overview',
      `- **Wave 1 (Standard Fiori Adoption):** ${report.roadmap?.phases?.wave1_standardAdoption?.length || 0} initiatives`,
      `- **Wave 2 (Configure & Low-Code Extensibility):** ${report.roadmap?.phases?.wave2_configureAndExtend?.length || 0} initiatives`,
      `- **Wave 3 (Clean Core Custom Applications):** ${report.roadmap?.phases?.wave3_cleanCoreBuild?.length || 0} initiatives`,
      '',
      '## Assessment Inventory',
      '| Assessment ID | Transaction | System | Lifecycle | Outcome | Fit Score | Candidate App |',
      '|---|---|---|---|---|---|---|',
      ...(report.records || []).map(r => `| ${r.id} | ${r.tcode} | ${r.systemId} | ${r.lifecycleStatus} | ${r.outcome} | ${r.fitGapScore}% | ${r.candidateAppId} |`),
      '',
      '---',
      '*FioriX — Enterprise Architecture & SAP Modernization Intelligence Platform*'
    ].join('\n');
  }
}

export const defaultEnterpriseService = new EnterpriseService();
export const enterpriseService = defaultEnterpriseService;
