import { AuditEvent, ApiResponse, DiscoveryJob } from '../../types';
import { localStore } from './localStore';

const delay = (ms = 150) => new Promise(resolve => setTimeout(resolve, ms));

export const auditService = {
  async getAuditEvents(): Promise<ApiResponse<AuditEvent[]>> {
    await delay();
    const events = localStore.getAuditEvents();
    return { data: events, success: true };
  },

  async getJobs(): Promise<ApiResponse<DiscoveryJob[]>> {
    await delay();
    const jobs = localStore.getJobs();
    return { data: jobs, success: true };
  },

  async recordAuditEvent(event: Omit<AuditEvent, 'id' | 'timestamp' | 'correlationId'>): Promise<void> {
    const events = localStore.getAuditEvents();
    const newEvent: AuditEvent = {
      ...event,
      id: `AUD-${String(events.length + 1).padStart(3, '0')}`,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
      correlationId: `corr-${Math.random().toString(36).substring(2, 10)}`
    };
    events.unshift(newEvent);
    localStore.saveAuditEvents(events);
  }
};
