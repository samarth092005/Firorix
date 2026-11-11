import { ValidationFinding, ApiResponse } from '../../types';
import { localStore } from './localStore';

const delay = (ms = 150) => new Promise(resolve => setTimeout(resolve, ms));

export const validationService = {
  async getValidationFindings(): Promise<ApiResponse<ValidationFinding[]>> {
    await delay();
    const findings = localStore.getValidationFindings();
    return { data: findings, success: true };
  }
};
