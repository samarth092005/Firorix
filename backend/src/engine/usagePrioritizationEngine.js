/**
 * Fiorify — Usage-Based Modernization Prioritization Engine (ST03N / STAD)
 *
 * Ranks classic SAP transactions by real production workload volume,
 * active user reach, and response latency to prioritize Fiori modernization ROI.
 */

export class UsagePrioritizationEngine {
  /**
   * Computes deterministic modernization priority scores (0-100) from ST03N/STAD metrics.
   * @param {Array<Object>} transactions
   * @returns {Object} Ranked prioritization summary
   */
  prioritize(transactions = []) {
    if (!Array.isArray(transactions) || transactions.length === 0) {
      return { totalEvaluated: 0, items: [] };
    }

    const maxSteps = Math.max(1, ...transactions.map((t) => Number(t.dialogSteps || 0)));
    const maxUsers = Math.max(1, ...transactions.map((t) => Number(t.activeUsers || 0)));

    const scored = transactions.map((tx) => {
      const tcode = String(tx.tcode || '').trim().toUpperCase();
      const dialogSteps = Math.max(0, Number(tx.dialogSteps || 0));
      const activeUsers = Math.max(0, Number(tx.activeUsers || 0));
      const avgResponseMs = Math.max(0, Number(tx.avgResponseMs || 0));

      // Weighted score: 50% dialog volume, 35% active user reach, 15% latency pain-point
      const stepScore = (Math.log10(dialogSteps + 1) / Math.log10(maxSteps + 1)) * 50;
      const userScore = (Math.log10(activeUsers + 1) / Math.log10(maxUsers + 1)) * 35;
      const latencyScore = Math.min(15, (avgResponseMs / 2000) * 15);
      const priorityScore = Math.round(Math.min(100, stepScore + userScore + latencyScore));

      let priorityTier = 'P4_LOW';
      if (priorityScore >= 75) priorityTier = 'P1_CRITICAL';
      else if (priorityScore >= 50) priorityTier = 'P2_HIGH';
      else if (priorityScore >= 25) priorityTier = 'P3_MEDIUM';

      return {
        tcode,
        dialogSteps,
        activeUsers,
        avgResponseMs,
        priorityScore,
        priorityTier,
        rationale: `${dialogSteps.toLocaleString()} dialog steps across ${activeUsers.toLocaleString()} active user(s) (avg ${avgResponseMs}ms).`
      };
    });

    scored.sort((a, b) => b.priorityScore - a.priorityScore);
    return {
      totalEvaluated: scored.length,
      p1CriticalCount: scored.filter((s) => s.priorityTier === 'P1_CRITICAL').length,
      items: scored
    };
  }
}

export const defaultUsagePrioritizationEngine = new UsagePrioritizationEngine();
export default defaultUsagePrioritizationEngine;
