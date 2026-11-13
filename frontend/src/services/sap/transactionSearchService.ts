/**
 * FioriX — Transaction Search Service
 *
 * Dispatches T-Code search and discovery to the central backend API:
 * POST /api/v1/tcode-search
 *
 * Conforms strictly to production architecture:
 * - Direct connection to backend endpoint via central apiClient.
 * - No client-side mock/live adapter orchestration.
 * - Honest handling of loading, success, empty, and connection error states.
 * - Preserves search history and diagnostic telemetry.
 * - Never fabricates fake successful responses when the backend is offline.
 */

import {
  TCodeSearchRequest,
  TCodeSearchResponse
} from '../contracts/types';
import { apiClient, ApiError } from '../api/apiClient';
import { searchHistoryStore } from './searchHistoryStore';

export class TransactionSearchService {
  /**
   * Dispatches a deterministic T-Code search against the central backend API endpoint:
   * POST /api/v1/tcode-search
   */
  public async search(request: TCodeSearchRequest): Promise<TCodeSearchResponse> {
    const rawTcode = typeof request.tcode === 'string' ? request.tcode.trim().toUpperCase() : '';
    const systemId = request.systemId?.trim() || 'S21-200';
    const isLiveMode = systemId === 'S21-200';

    try {
      const response = await apiClient.searchTCode({
        systemId,
        tcode: request.tcode,
        language: request.language || 'EN',
        mode: request.mode
      });

      // Record to history if valid search result
      if (
        response.overallStatus === 'MATCH_FOUND' ||
        response.overallStatus === 'EXPLICIT_SUCCESSOR' ||
        response.overallStatus === 'SAME_TRANSACTION_CLASSIC' ||
        response.overallStatus === 'SAP_GUI_HTML' ||
        response.overallStatus === 'FUNCTIONAL_ALTERNATIVE' ||
        response.overallStatus === 'CATALOGUE_PENDING_VERIFICATION' ||
        response.overallStatus === 'NO_STANDARD_APP_EXISTS' ||
        response.overallStatus === 'NO_VERIFIED_MATCH' ||
        response.overallStatus === 'METADATA_INCOMPLETE' ||
        response.overallStatus === 'NOT_FOUND' ||
        response.overallStatus === 'CONNECTION_ERROR' ||
        response.overallStatus === 'ACCESS_DENIED'
      ) {
        searchHistoryStore.addEntry({
          systemId: response.system?.systemId || systemId,
          tcode: response.transaction?.tcode || rawTcode || 'UNKNOWN',
          resultStatus: response.overallStatus,
          classification: response.transaction?.classification,
          candidateCount: response.matching?.candidates?.length || 0
        });
      }

      return response;
    } catch (err: any) {
      // Honest error handling when backend is unreachable or returns an error status.
      // NEVER fabricate a successful response.
      const isApiError = err instanceof ApiError;
      const isTimeout = isApiError ? err.isTimeout : false;
      const statusCode = isApiError ? err.statusCode : 0;

      let overallStatus: TCodeSearchResponse['overallStatus'] = 'CONNECTION_ERROR';
      if (statusCode === 401 || statusCode === 403) {
        overallStatus = 'ACCESS_DENIED';
      } else if (statusCode === 400) {
        overallStatus = 'INVALID_INPUT';
      }

      const errorMessage =
        err.message ||
        (isTimeout ? 'Request timed out contacting backend.' : 'Backend service is unavailable.');

      const fallbackResponse: TCodeSearchResponse = {
        requestId: `ERR-${Date.now().toString().slice(-6)}`,
        mode: isLiveMode ? 'LIVE_SAP' : 'MOCK',
        timestamp: new Date().toISOString(),
        system: {
          systemId,
          systemName: isLiveMode ? 'S21 SAP S/4HANA 2023 Private Edition' : 'Target System',
          client: isLiveMode ? '200' : '---',
          release: isLiveMode ? 'SAP S/4HANA 2023 Private Edition' : 'UNKNOWN',
          mode: isLiveMode ? 'LIVE_SAP' : 'MOCK'
        },
        matching: {
          status: overallStatus,
          candidates: []
        },
        overallStatus,
        diagnostics: {
          provenance: [
            isLiveMode ? `Live SAP Gateway endpoint (system ${systemId})` : 'FioriX Central API Client',
            'Backend connectivity layer'
          ],
          classificationEvidence: [],
          matchingRuleApplied: `Lookup terminated due to backend communication failure (${overallStatus}).`,
          warnings: [
            isTimeout
              ? 'Backend API request timed out.'
              : `Backend connection error: ${errorMessage}`
          ],
          releaseCompatibilityEvaluated: {
            systemRelease: 'UNKNOWN',
            evaluatedCandidates: 0,
            compatibleCount: 0,
            incompatibleCount: 0
          },
          excludedCandidates: [],
          decisionExplanation: `The backend service could not be reached. ${errorMessage}`
        },
        errorMessage
      };

      searchHistoryStore.addEntry({
        systemId,
        tcode: rawTcode || 'UNKNOWN',
        resultStatus: overallStatus,
        candidateCount: 0
      });

      return fallbackResponse;
    }
  }
}

export const transactionSearchService = new TransactionSearchService();
