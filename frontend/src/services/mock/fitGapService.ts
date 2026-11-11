import { FitGapResult, Recommendation, ApiResponse } from '../../types';
import { localStore } from './localStore';

const delay = (ms = 150) => new Promise(resolve => setTimeout(resolve, ms));

export const fitGapService = {
  async getFitGapResultsForAssessment(assessmentId: string): Promise<ApiResponse<FitGapResult[]>> {
    await delay();
    const all = localStore.getFitGap();
    const filtered = all.filter(f => f.assessmentId === assessmentId);
    return { data: filtered, success: true };
  },

  async getRecommendationForAssessment(assessmentId: string): Promise<ApiResponse<Recommendation | null>> {
    await delay();
    const all = localStore.getRecommendations();
    const match = all.find(r => r.assessmentId === assessmentId) || null;
    return { data: match, success: !!match };
  },

  async saveRecommendation(rec: Recommendation): Promise<ApiResponse<Recommendation>> {
    await delay(200);
    const all = localStore.getRecommendations();
    const idx = all.findIndex(r => r.assessmentId === rec.assessmentId);
    if (idx !== -1) {
      all[idx] = rec;
    } else {
      all.push(rec);
    }
    localStore.saveRecommendations(all);

    // Update assessment outcome
    const assessments = localStore.getAssessments();
    const aIdx = assessments.findIndex(a => a.id === rec.assessmentId);
    if (aIdx !== -1) {
      assessments[aIdx].recommendationOutcome = rec.outcome;
      assessments[aIdx].updatedDate = new Date().toISOString().replace('T', ' ').substring(0, 19);
      localStore.saveAssessments(assessments);
    }

    return { data: rec, success: true, message: 'Recommendation recorded successfully.' };
  }
};
