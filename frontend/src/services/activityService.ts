import { ActivityEvent } from './contracts/types';
import { demoDataProvider } from './mock/demoAssessmentProvider';

export interface IActivityService {
  getRecentActivity(limit?: number): Promise<ActivityEvent[]>;
}

class ActivityService implements IActivityService {
  async getRecentActivity(limit: number = 10): Promise<ActivityEvent[]> {
    return demoDataProvider.getRecentActivity(limit);
  }
}

export const activityService = new ActivityService();
