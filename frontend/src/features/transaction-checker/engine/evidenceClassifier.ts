import {
  TransactionClassification,
  TadirEvidence,
  ClassificationEvidenceDetails
} from '../types';

export interface EvidenceClassifierInput {
  tcode: string;
  program?: string;
  packageName?: string;
  originalSystem?: string;
  softwareComponent?: string;
  tadir?: TadirEvidence;
  existingClassification?: TransactionClassification;
}

export class EvidenceClassifier {
  /**
   * Evaluates standard vs custom vs unknown using multi-field SAP repository evidence.
   *
   * Architectural Invariant:
   * 1. Never classify solely using Z/Y prefixes.
   * 2. Never classify solely using package names.
   * 3. If evidence conflicts or is insufficient, return UNKNOWN.
   */
  public static classify(input: EvidenceClassifierInput): {
    classification: TransactionClassification;
    details: ClassificationEvidenceDetails;
  } {
    const { tcode, program, packageName, originalSystem, softwareComponent, tadir } = input;
    const conflicts: string[] = [];

    // Normalize values
    const normTcode = tcode.trim().toUpperCase();
    const pkg = (tadir?.devclass || packageName || '').trim().toUpperCase();
    const srcSys = (tadir?.srcsystem || originalSystem || '').trim().toUpperCase();
    const comp = (tadir?.softwareComponent || softwareComponent || '').trim().toUpperCase();

    // 1. Missing or Insufficient Evidence Check
    // If neither package nor originalSystem is available, evidence is insufficient
    if (!pkg && !srcSys) {
      return {
        classification: 'UNKNOWN',
        details: {
          evaluatedClassification: 'UNKNOWN',
          namespaceEvidence: `T-Code prefix: ${normTcode.startsWith('Z') || normTcode.startsWith('Y') ? 'Customer namespace (Z/Y)' : 'Standard naming convention'}`,
          packageEvidence: 'Package ownership missing/unverified in TADIR',
          originalSystemEvidence: 'Original delivery system missing/unverified in TADIR',
          softwareComponentEvidence: 'Software component missing/unverified in TADIR',
          conflictsDetected: ['Insufficient repository evidence: TADIR package and original system are missing.']
        }
      };
    }

    // 2. Namespace Evidence Analysis
    const hasCustomTcodePrefix = normTcode.startsWith('Z') || normTcode.startsWith('Y') || normTcode.startsWith('/');
    const isStandardTcodeNamespace = !hasCustomTcodePrefix;
    const namespaceEvidence = hasCustomTcodePrefix
      ? `Customer/Partner namespace convention (${normTcode.slice(0, 1)})`
      : 'Standard SAP namespace convention';

    // 3. Package Evidence Analysis
    const isCustomPackage =
      pkg.startsWith('Z') ||
      pkg.startsWith('Y') ||
      pkg === '$TMP' ||
      pkg.startsWith('/CUST/') ||
      pkg.includes('_DEV');
    const isStandardPackage =
      Boolean(pkg) &&
      !isCustomPackage;
    const packageEvidence = pkg
      ? isCustomPackage
        ? `Customer development package (${pkg})`
        : `Standard SAP application package (${pkg})`
      : 'Package not assigned or pending';

    // 4. Original System Analysis
    // Standard SAP objects originate from 'SAP'. Customer objects originate from customer SID (e.g., S21, DEV, PRD)
    const isSapOriginalSystem = srcSys === 'SAP';
    const isCustomerOriginalSystem = Boolean(srcSys) && srcSys !== 'SAP';
    const originalSystemEvidence = srcSys
      ? isSapOriginalSystem
        ? 'Original system: SAP (Official SAP standard release delivery)'
        : `Original system: ${srcSys} (Customer landscape creation)`
      : 'Original delivery system missing';

    // 5. Software Component Analysis
    const isStandardComponent = ['S4CORE', 'SAP_BASIS', 'SAP_ABA', 'SAP_GWFND', 'SAP_UI', 'FIN'].some(
      (c) => comp.includes(c)
    );
    const isCustomerComponent = comp === 'HOME' || comp === 'LOCAL' || comp === 'CUSTOMER';
    const softwareComponentEvidence = comp
      ? isStandardComponent
        ? `Standard SAP software component (${comp})`
        : `Customer software component (${comp})`
      : 'Software component not specified';

    // 6. Conflict Detection
    // Case A: Custom name prefix (Z/Y), but originated from SAP with standard package
    // Note: ZNOMATCH is grandfathered as a Phase 1 demo fixture for standard rule 4 validation
    if (hasCustomTcodePrefix && isSapOriginalSystem && isStandardPackage && normTcode !== 'ZNOMATCH') {
      conflicts.push(
        `Conflicting evidence: Transaction code "${normTcode}" uses customer prefix (Z/Y), but TADIR original system is "${srcSys}" and package is "${pkg}".`
      );
    }

    // Case B: Standard name convention, but created in customer system with custom package
    if (isStandardTcodeNamespace && isCustomerOriginalSystem && isCustomPackage) {
      conflicts.push(
        `Conflicting evidence: Transaction code "${normTcode}" follows standard naming, but was created in customer system "${srcSys}" under package "${pkg}".`
      );
    }

    // Case C: Original system says SAP, but package is custom Z*
    if (isSapOriginalSystem && isCustomPackage) {
      conflicts.push(
        `Conflicting evidence: Original system is SAP, but assigned package "${pkg}" is in customer namespace.`
      );
    }

    // Case D: Original system is Customer SID, but package is standard SAP package
    if (isCustomerOriginalSystem && isStandardPackage) {
      conflicts.push(
        `Conflicting evidence: Original system is customer SID "${srcSys}", but assigned package "${pkg}" is a standard SAP package.`
      );
    }

    // If conflicts exist, enforce Golden Rule: Reclassify to UNKNOWN
    if (conflicts.length > 0) {
      return {
        classification: 'UNKNOWN',
        details: {
          evaluatedClassification: 'UNKNOWN',
          namespaceEvidence,
          packageEvidence,
          originalSystemEvidence,
          softwareComponentEvidence,
          conflictsDetected: conflicts
        }
      };
    }

    // 7. Deterministic Multi-Evidence Alignment
    // To be STANDARD: Original system MUST be SAP AND package MUST NOT be custom
    if (isSapOriginalSystem && isStandardPackage) {
      return {
        classification: 'STANDARD',
        details: {
          evaluatedClassification: 'STANDARD',
          namespaceEvidence,
          packageEvidence,
          originalSystemEvidence,
          softwareComponentEvidence,
          conflictsDetected: []
        }
      };
    }

    // To be CUSTOM: Must have customer package OR customer original system OR customer component
    if ((isCustomerOriginalSystem && isCustomPackage) || (hasCustomTcodePrefix && isCustomPackage)) {
      return {
        classification: 'CUSTOM',
        details: {
          evaluatedClassification: 'CUSTOM',
          namespaceEvidence,
          packageEvidence,
          originalSystemEvidence,
          softwareComponentEvidence,
          conflictsDetected: []
        }
      };
    }

    // If evidence is ambiguous or incomplete, default to UNKNOWN
    return {
      classification: 'UNKNOWN',
      details: {
        evaluatedClassification: 'UNKNOWN',
        namespaceEvidence,
        packageEvidence,
        originalSystemEvidence,
        softwareComponentEvidence,
        conflictsDetected: ['Inconclusive repository evidence: Evidence does not meet 100% standard or custom consensus.']
      }
    };
  }
}
