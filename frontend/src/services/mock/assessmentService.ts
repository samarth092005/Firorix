import { Assessment, BusinessRequirement, ApiResponse, FilterState } from '../../types';
import { localStore } from './localStore';

const delay = (ms = 150) => new Promise(resolve => setTimeout(resolve, ms));

export const assessmentService = {
  async getAllAssessments(filter?: FilterState): Promise<ApiResponse<Assessment[]>> {
    await delay();
    let items = localStore.getAssessments();

    if (filter?.searchQuery) {
      const q = filter.searchQuery.toLowerCase().trim();
      items = items.filter(a => a.tcode.toLowerCase().includes(q) || a.title.toLowerCase().includes(q));
    }

    if (filter?.status && filter.status !== 'ALL') {
      items = items.filter(a => a.status === filter.status);
    }

    return { data: items, success: true };
  },

  async getAssessmentById(id: string): Promise<ApiResponse<Assessment | null>> {
    await delay();
    const items = localStore.getAssessments();
    const match = items.find(a => a.id === id) || null;
    return { data: match, success: !!match };
  },

  async createAssessment(input: {
    systemId: string;
    systemAlias: string;
    tcode: string;
    title: string;
    businessProcess: string;
    targetRelease: string;
    ownerName: string;
  }): Promise<ApiResponse<Assessment>> {
    await delay(300);
    const items = localStore.getAssessments();
    const year = new Date().getFullYear();
    const newId = `ASM-${year}-${String(items.length + 1).padStart(3, '0')}`;

    const newAssessment: Assessment = {
      id: newId,
      title: input.title || `${input.tcode} Assessment & Fiori Transition`,
      tcode: input.tcode.toUpperCase().trim(),
      systemId: input.systemId,
      systemAlias: input.systemAlias,
      status: 'IN_PROGRESS',
      currentStep: 'TECHNICAL',
      progressPercent: 25,
      ownerName: input.ownerName || 'Lead SAP Consultant',
      createdDate: new Date().toISOString().replace('T', ' ').substring(0, 19),
      updatedDate: new Date().toISOString().replace('T', ' ').substring(0, 19),
      businessProcess: input.businessProcess || 'General Processing',
      targetRelease: input.targetRelease || 'SAP S/4HANA 2022 FPS02',
      isDemoRecord: true
    };

    items.unshift(newAssessment);
    localStore.saveAssessments(items);

    // Also create a linked discovery job
    const jobs = localStore.getJobs();
    jobs.unshift({
      id: `JOB-${year}-${String(jobs.length + 80).padStart(3, '0')}`,
      jobType: 'DISCOVERY_SCAN',
      systemAlias: input.systemAlias,
      targetTCode: input.tcode.toUpperCase().trim(),
      status: 'RUNNING',
      progressPercent: 35,
      createdDate: new Date().toISOString().replace('T', ' ').substring(0, 19),
      startedDate: new Date().toISOString().replace('T', ' ').substring(0, 19),
      executedBy: input.ownerName || 'Lead SAP Consultant',
      stageDetails: `Simulating discovery: Connecting via Cloud Connector to query TSTC and TADIR for ${input.tcode.toUpperCase()}...`
    });
    localStore.saveJobs(jobs);

    return { data: newAssessment, success: true, message: 'Assessment created and discovery job dispatched.' };
  },

  async getRequirementsForAssessment(assessmentId: string): Promise<ApiResponse<BusinessRequirement[]>> {
    await delay();
    const all = localStore.getRequirements();
    const filtered = all.filter(r => r.assessmentId === assessmentId);
    return { data: filtered, success: true };
  },

  async addRequirement(req: Omit<BusinessRequirement, 'id' | 'isConfirmed'>): Promise<ApiResponse<BusinessRequirement>> {
    await delay(150);
    const all = localStore.getRequirements();
    const newReq: BusinessRequirement = {
      ...req,
      id: `REQ-${String(all.length + 1).padStart(3, '0')}`,
      isConfirmed: req.reviewStatus === 'CONFIRMED'
    };
    all.push(newReq);
    localStore.saveRequirements(all);
    return { data: newReq, success: true };
  },

  async updateRequirement(id: string, updates: Partial<BusinessRequirement>): Promise<ApiResponse<BusinessRequirement>> {
    await delay(150);
    const all = localStore.getRequirements();
    const idx = all.findIndex(r => r.id === id);
    if (idx === -1) throw new Error('Requirement not found');
    all[idx] = { ...all[idx], ...updates, isConfirmed: updates.reviewStatus === 'CONFIRMED' ? true : all[idx].isConfirmed };
    localStore.saveRequirements(all);
    return { data: all[idx], success: true };
  }
};
