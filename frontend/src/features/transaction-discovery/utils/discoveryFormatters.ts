import type { CatalogueReference } from '../../../services/contracts/types';

export type DiscoverySearchProgressState =
  | 'IDLE'
  | 'VALIDATING'
  | 'CONNECTING'
  | 'SEARCHING_TRANSACTION'
  | 'COLLECTING_EVIDENCE'
  | 'SEARCHING_CATALOGUE'
  | 'MATCHING'
  | 'ASSESSING'
  | 'COMPLETED'
  | 'PARTIAL_RESULTS'
  | 'ACCESS_DENIED'
  | 'SOURCE_UNAVAILABLE'
  | 'INSUFFICIENT_EVIDENCE'
  | 'FAILED';

export function formatCandidateDetails(candidate: CatalogueReference | null) {
  if (!candidate) return { cleanDesc: '', roles: [] as string[] };

  let cleanDesc = (candidate.description || '').trim();
  let roles: string[] = Array.isArray(candidate.businessRoles) && candidate.businessRoles.length > 0
    ? [...candidate.businessRoles]
    : [];

  const isRoleDump = cleanDesc.includes(' : ') && (cleanDesc.length > 180 || roles.length === 0);
  if (isRoleDump) {
    const roleMatches = cleanDesc.match(/([A-Z][A-Za-z0-9\s\-–/()]+?)\s*:\s*([^:]+?)(?=(?:[A-Z][A-Za-z0-9\s\-–/()]+?\s*:)|$)/g);
    if (roleMatches && roleMatches.length > 0) {
      const parsedRoles: string[] = [];
      roleMatches.forEach((m: string) => {
        const colonIdx = m.indexOf(':');
        if (colonIdx > 0) {
          const rName = m.substring(0, colonIdx).trim();
          if (rName.length >= 3 && rName.length < 55 && !rName.includes('.')) {
            parsedRoles.push(rName);
          }
        }
      });
      if (parsedRoles.length > 0 && roles.length === 0) {
        roles = Array.from(new Set(parsedRoles));
      }
    }

    cleanDesc = `Official SAP Fiori successor for ${candidate.appName || candidate.appId}${candidate.technicalComponent ? ` (${candidate.technicalComponent})` : ''}. Enables browser-based workflows aligned with S/4HANA Clean Core.`;
  }

  if (!cleanDesc) {
    cleanDesc = 'Standard SAP Fiori successor identified in official SAP Fiori Apps Reference Library.';
  }

  return { cleanDesc, roles };
}
