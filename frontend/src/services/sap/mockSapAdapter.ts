import {
  SapSystemRecord,
  TransactionFixture,
  SearchStatusCode,
  TransactionClassification,
  MetadataCompletenessStatus,
  TadirEvidence,
  ClassificationEvidenceDetails
} from '../contracts/types';
import { SYNTHETIC_SYSTEMS } from './fixtures/syntheticSystems';
import { SYNTHETIC_TRANSACTIONS } from './fixtures/syntheticTransactions';
import { EvidenceClassifier } from './engine/evidenceClassifier';

export interface SapLookupSuccess {
  success: true;
  system: SapSystemRecord;
  transaction: {
    tcode: string;
    exists: boolean;
    classification: TransactionClassification;
    description?: string;
    program?: string;
    screenNumber?: string;
    packageName?: string;
    originalSystem?: string;
    softwareComponent?: string;
    metadataStatus: MetadataCompletenessStatus;
    evidence: string[];
    tadir?: TadirEvidence;
    classificationDetails?: ClassificationEvidenceDetails;
  };
}

export interface SapLookupFault {
  success: false;
  statusCode: SearchStatusCode;
  system?: SapSystemRecord;
  errorMessage: string;
  transaction?: {
    tcode: string;
    exists: boolean;
    classification: TransactionClassification;
    metadataStatus: MetadataCompletenessStatus;
    evidence: string[];
    tadir?: TadirEvidence;
    classificationDetails?: ClassificationEvidenceDetails;
  };
}

export type SapLookupResult = SapLookupSuccess | SapLookupFault;

export class MockSapAdapter {
  private systems: SapSystemRecord[] = SYNTHETIC_SYSTEMS;
  private transactions: TransactionFixture[] = SYNTHETIC_TRANSACTIONS;

  public getAvailableSystems(): SapSystemRecord[] {
    return [...this.systems];
  }

  public getSystemById(systemId: string): SapSystemRecord | undefined {
    return this.systems.find((s) => s.systemId === systemId);
  }

  /**
   * Validates and queries synthetic SAP transaction metadata.
   * Deterministic mock adapter - strictly no network or RFC calls.
   */
  public queryTransaction(systemId: string, rawTcode: string): SapLookupResult {
    // 1. Verify system configuration
    const system = this.getSystemById(systemId);
    if (!system || !system.active) {
      return {
        success: false,
        statusCode: 'SYSTEM_NOT_CONFIGURED',
        errorMessage: `System "${systemId}" is not configured or recognized in the synthetic landscape registry.`
      };
    }

    // 2. Validate input format
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

    // SAP T-Code naming convention: 1-20 characters, alphanumeric with /, _, -
    const sapTcodeRegex = /^[A-Z0-9_\-\/]{1,20}$/;
    if (!sapTcodeRegex.test(trimmed)) {
      return {
        success: false,
        statusCode: 'INVALID_INPUT',
        system,
        errorMessage: `Transaction code "${trimmed}" violates SAP naming conventions (maximum 20 characters, alphanumeric, underscores, hyphens, and slashes allowed).`
      };
    }

    // 3. Locate transaction fixture
    // Match by tcode in the synthetic fixture dataset
    const fixture = this.transactions.find(
      (t) => t.tcode.toUpperCase() === trimmed
    );

    // 4. Handle lookup behaviors and simulated faults
    if (fixture) {
      if (fixture.lookupBehavior === 'CONNECTION_ERROR') {
        return {
          success: false,
          statusCode: 'CONNECTION_ERROR',
          system,
          errorMessage: 'Simulated connection error: RFC/ADT destination communication timed out.'
        };
      }

      if (fixture.lookupBehavior === 'ACCESS_DENIED') {
        return {
          success: false,
          statusCode: 'ACCESS_DENIED',
          system,
          errorMessage: 'Simulated authorization failure: User lacks S_TCODE authorization for this transaction in the mock system.'
        };
      }

      // Multi-evidence classification using TADIR, namespace, package, and original system
      const classificationEval = EvidenceClassifier.classify({
        tcode: fixture.tcode,
        program: fixture.program,
        packageName: fixture.packageName,
        originalSystem: fixture.originalSystem,
        softwareComponent: fixture.softwareComponent,
        tadir: fixture.tadir,
        existingClassification: fixture.classification
      });

      const combinedEvidence = [...fixture.evidence];
      if (
        classificationEval.details.conflictsDetected.length > 0 &&
        !combinedEvidence.some((e) => e.includes('Conflicting evidence'))
      ) {
        combinedEvidence.push(...classificationEval.details.conflictsDetected);
      }

      return {
        success: true,
        system,
        transaction: {
          tcode: fixture.tcode,
          exists: fixture.exists,
          classification: classificationEval.classification,
          description: fixture.description,
          program: fixture.program,
          screenNumber: fixture.screenNumber,
          packageName: fixture.packageName,
          originalSystem: fixture.originalSystem,
          softwareComponent: fixture.softwareComponent,
          metadataStatus: fixture.metadataStatus,
          evidence: combinedEvidence,
          tadir: fixture.tadir,
          classificationDetails: classificationEval.details
        }
      };
    }

    // 5. Transaction Not Found in Mock Repository
    return {
      success: false,
      statusCode: 'NOT_FOUND',
      system,
      errorMessage: `Transaction code "${trimmed}" does not exist in mock system ${system.systemId}.`,
      transaction: {
        tcode: trimmed,
        exists: false,
        classification: 'UNKNOWN',
        metadataStatus: 'NOT_AVAILABLE',
        evidence: [
          'Synthetic TSTC fixture queried: 0 records found',
          'Synthetic TADIR catalog: no package registration found'
        ]
      }
    };
  }
}

export const mockSapAdapter = new MockSapAdapter();
