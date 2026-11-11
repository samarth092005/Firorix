import {
  SapSystemRecord,
  SearchStatusCode,
  TransactionClassification,
  MetadataCompletenessStatus,
  TadirEvidence,
  ClassificationEvidenceDetails
} from '../types';
import { EvidenceClassifier } from '../engine/evidenceClassifier';
import { SapLookupResult, SapLookupSuccess, SapLookupFault } from './mockSapAdapter';

export interface LiveSapODataResponse {
  d?: {
    Tcode?: string;
    Text?: string;
    Program?: string;
    Screen?: string;
    Package?: string;
    Devclass?: string;
    Srcsystem?: string;
    SoftwareComponent?: string;
    Pgmid?: string;
    Object?: string;
    ObjName?: string;
    Exists?: boolean;
    Classification?: string;
  };
}

export class LiveSapAdapter {
  private timeoutMs: number;

  constructor(timeoutMs = 6000) {
    this.timeoutMs = timeoutMs;
  }

  /**
   * Queries S/4HANA target system (S21-200) via official read-only OData service:
   * GET /sap/opu/odata/sap/Z_FIORIX_DISCOVERY_SRV/TransactionSet('{tcode}')
   *
   * Architectural Invariant:
   * LIVE_SAP mode NEVER falls back to synthetic or demo mock data.
   * If the endpoint is unprovisioned, times out, or fails authentication,
   * a structured diagnostic fault is returned for SAP Basis/ABAP remediation.
   */
  public async queryTransaction(
    system: SapSystemRecord,
    rawTcode: string
  ): Promise<SapLookupResult> {
    // 1. Validate Input
    if (!rawTcode || typeof rawTcode !== 'string') {
      return {
        success: false,
        statusCode: 'INVALID_INPUT',
        system,
        errorMessage: 'Transaction code must not be empty.'
      };
    }

    const trimmed = rawTcode.trim().toUpperCase();
    if (trimmed.length === 0) {
      return {
        success: false,
        statusCode: 'INVALID_INPUT',
        system,
        errorMessage: 'Transaction code cannot be blank whitespace.'
      };
    }

    const sapTcodeRegex = /^[A-Z0-9_\-\/]{1,20}$/;
    if (!sapTcodeRegex.test(trimmed)) {
      return {
        success: false,
        statusCode: 'INVALID_INPUT',
        system,
        errorMessage: `Transaction code "${trimmed}" violates SAP naming conventions (maximum 20 characters, alphanumeric, underscores, hyphens, and slashes allowed).`
      };
    }

    // 2. Prepare Target Endpoint URL
    const baseUrl = system.odataServiceUrl || '/sap/opu/odata/sap/Z_FIORIX_DISCOVERY_SRV';
    const targetUrl = `${baseUrl}/TransactionSet('${encodeURIComponent(trimmed)}')?$format=json`;

    // 3. Dispatch Live HTTP Request with Timeout and AbortController
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(targetUrl, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
          'sap-client': system.client
        },
        signal: controller.signal
      });

      clearTimeout(timer);

      // 4. Handle HTTP Status Responses
      if (response.status === 401 || response.status === 403) {
        return {
          success: false,
          statusCode: 'ACCESS_DENIED',
          system,
          errorMessage: `Live SAP Authentication Failed (HTTP ${response.status}) on ${system.systemId} (Client ${system.client}). Target user lacks authorization for service Z_FIORIX_DISCOVERY_SRV or DDIC tables (TSTC/TADIR). Check PFCG authorization objects S_SERVICE and S_TABU_DIS.`,
          transaction: {
            tcode: trimmed,
            exists: false,
            classification: 'UNKNOWN',
            metadataStatus: 'NOT_AVAILABLE',
            evidence: [
              `Live endpoint queried: ${targetUrl}`,
              `HTTP status: ${response.status} ${response.statusText}`,
              'Authorization failure reported by target SAP Gateway'
            ]
          }
        };
      }

      if (response.status === 404) {
        return {
          success: false,
          statusCode: 'NOT_FOUND',
          system,
          errorMessage: `Transaction code "${trimmed}" does not exist in target SAP system ${system.systemId} (Client ${system.client}). TSTC record count is 0.`,
          transaction: {
            tcode: trimmed,
            exists: false,
            classification: 'UNKNOWN',
            metadataStatus: 'NOT_AVAILABLE',
            evidence: [
              `Target SAP Gateway endpoint queried: ${targetUrl}`,
              'TSTC lookup returned 0 matching records'
            ]
          }
        };
      }

      if (!response.ok) {
        return {
          success: false,
          statusCode: 'CONNECTION_ERROR',
          system,
          errorMessage: `Live SAP Gateway returned HTTP error ${response.status} (${response.statusText}) from ${targetUrl}. Ensure service Z_FIORIX_DISCOVERY_SRV is activated in /IWFND/MAINT_SERVICE on system ${system.systemId}.`
        };
      }

      const json = (await response.json()) as LiveSapODataResponse;
      const data = json?.d;

      if (!data) {
        return {
          success: false,
          statusCode: 'CONNECTION_ERROR',
          system,
          errorMessage: `Malformed OData payload returned from ${targetUrl}: missing root "d" element.`
        };
      }

      // 5. Parse DDIC and TADIR Evidence
      const exists = Boolean(data.Exists ?? true);
      const program = data.Program || undefined;
      const description = data.Text || undefined;
      const screenNumber = data.Screen || undefined;
      const devclass = data.Devclass || data.Package || undefined;
      const srcsystem = data.Srcsystem || undefined;
      const softwareComponent = data.SoftwareComponent || undefined;

      const tadir: TadirEvidence = {
        pgmid: data.Pgmid || 'R3TR',
        object: data.Object || 'TRAN',
        objName: data.ObjName || trimmed,
        devclass,
        srcsystem,
        softwareComponent
      };

      // 6. Evaluate Multi-Evidence Classification
      const classificationEval = EvidenceClassifier.classify({
        tcode: trimmed,
        program,
        packageName: devclass,
        originalSystem: srcsystem,
        softwareComponent,
        tadir
      });

      const metadataStatus: MetadataCompletenessStatus =
        program && description ? 'COMPLETE' : 'INCOMPLETE';

      const evidence = [
        `Live SAP S/4HANA query to ${system.systemId} (Client ${system.client})`,
        `OData Gateway service: ${baseUrl}`,
        `TSTC verification: ${exists ? 'EXISTS' : 'NOT FOUND'}`,
        description ? `TSTCT description: "${description}"` : 'TSTCT description: [Not found]',
        devclass ? `TADIR devclass: "${devclass}"` : 'TADIR devclass: [Pending/Missing]',
        srcsystem ? `TADIR srcsystem: "${srcsystem}"` : 'TADIR srcsystem: [Pending/Missing]',
        softwareComponent ? `Software component: "${softwareComponent}"` : 'Software component: [Unspecified]'
      ];

      if (classificationEval.details.conflictsDetected.length > 0) {
        evidence.push(...classificationEval.details.conflictsDetected);
      }

      return {
        success: true,
        system,
        transaction: {
          tcode: trimmed,
          exists,
          classification: classificationEval.classification,
          description,
          program,
          screenNumber,
          packageName: devclass,
          originalSystem: srcsystem,
          softwareComponent,
          metadataStatus,
          evidence,
          tadir,
          classificationDetails: classificationEval.details
        }
      };
    } catch (err: any) {
      clearTimeout(timer);

      // Distinguish timeout vs network abort vs connection refusal
      const isTimeout = err?.name === 'AbortError';
      const detailMsg = isTimeout
        ? `Request timed out after ${this.timeoutMs}ms while connecting to ${targetUrl}.`
        : `Network/CORS connection failed: ${err?.message || 'Host unreachable'}.`;

      return {
        success: false,
        statusCode: 'CONNECTION_ERROR',
        system,
        errorMessage: `Cannot establish live connection to SAP system ${system.systemId} (Client ${system.client}): ${detailMsg}
Remediation for Basis / ABAP Architect:
1. Verify S21 SAP Gateway service Z_FIORIX_DISCOVERY_SRV is active (/IWFND/MAINT_SERVICE).
2. Verify BTP Cloud Connector / reverse proxy route to /sap/opu/odata/sap/Z_FIORIX_DISCOVERY_SRV.
3. Verify network firewall rules and CORS allowance on SAP Web Dispatcher / ICM.
4. INVARIANT ENFORCED: FioriX in LIVE_SAP mode strictly refrains from falling back to synthetic mock data.`
      };
    }
  }
}

export const liveSapAdapter = new LiveSapAdapter();
