import { CheckCircle2, Clock, HelpCircle, AlertCircle, XCircle } from 'lucide-react';
import { RequirementCategory, RequirementPriority, RequirementStatus } from '../types';

export const CATEGORY_LABELS: Record<RequirementCategory, string> = {
  BUSINESS: 'Business Requirement',
  FUNCTIONAL: 'Functional Requirement',
  TECHNICAL: 'Technical / Architecture',
  NON_FUNCTIONAL: 'Non-Functional (Security/Perf)',
  DATA_READ: 'Data Read / Query',
  DATA_CREATE: 'Data Create / Insert',
  DATA_UPDATE: 'Data Update / Change',
  DATA_DELETE: 'Data Deletion',
  BUSINESS_RULE: 'Business Rule',
  VALIDATION: 'Field & Entity Validation',
  DETERMINATION: 'Field Determination',
  ACTION: 'Custom Business Action',
  UI_INTERACTION: 'UI & Interaction',
  AUTHORIZATION: 'Authorization & Security',
  REPORTING: 'Reporting & Analytics',
  INTEGRATION: 'Integration & API',
  OTHER: 'General / Other'
};

export const PRIORITY_BADGES: Record<RequirementPriority, { label: string; bg: string; text: string }> = {
  MUST_HAVE: { label: 'Must Have', bg: '#fee2e2', text: '#991b1b' },
  SHOULD_HAVE: { label: 'Should Have', bg: '#fef3c7', text: '#92400e' },
  NICE_TO_HAVE: { label: 'Nice to Have', bg: '#f1f5f9', text: '#475569' }
};

export const STATUS_CONFIG: Record<RequirementStatus, { label: string; bg: string; text: string; icon: any }> = {
  CONFIRMED: { label: 'Confirmed', bg: '#ecfdf5', text: '#065f46', icon: CheckCircle2 },
  DRAFT: { label: 'Pending Review', bg: '#f8fafc', text: '#475569', icon: Clock },
  NEEDS_CLARIFICATION: { label: 'Needs Clarification', bg: '#fffbeb', text: '#b45309', icon: HelpCircle },
  DEFERRED: { label: 'Deferred', bg: '#f1f5f9', text: '#64748b', icon: AlertCircle },
  REJECTED: { label: 'Rejected', bg: '#fef2f2', text: '#991b1b', icon: XCircle }
};
