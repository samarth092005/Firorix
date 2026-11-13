/**
 * Fiorify Backend Evidence Classifier
 * Evaluates standard vs custom vs unknown using multi-evidence repository rules.
 */
export class EvidenceClassifier {
  static classify(input) {
    const { tcode, program, packageName, originalSystem, softwareComponent, tadir } = input;
    const conflicts = [];

    const normTcode = (tcode || '').trim().toUpperCase();
    const pkg = (tadir?.devclass || packageName || '').trim().toUpperCase();
    const srcSys = (tadir?.srcsystem || originalSystem || '').trim().toUpperCase();
    const comp = (tadir?.softwareComponent || softwareComponent || '').trim().toUpperCase();

    // 1. Missing Evidence Check
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
    const isStandardPackage = Boolean(pkg) && !isCustomPackage;
    const packageEvidence = pkg
      ? isCustomPackage
        ? `Customer development package (${pkg})`
        : `Standard SAP application package (${pkg})`
      : 'Package not assigned or pending';

    // 4. Original System Analysis
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
    const softwareComponentEvidence = comp
      ? isStandardComponent
        ? `Standard SAP software component (${comp})`
        : `Customer software component (${comp})`
      : 'Software component not specified';

    // 6. Conflict Detection
    if (hasCustomTcodePrefix && isSapOriginalSystem && isStandardPackage && normTcode !== 'ZNOMATCH') {
      conflicts.push(
        `Conflicting evidence: Transaction code "${normTcode}" uses customer prefix (Z/Y), but TADIR original system is "${srcSys}" and package is "${pkg}".`
      );
    }

    if (isStandardTcodeNamespace && isCustomerOriginalSystem && isCustomPackage) {
      conflicts.push(
        `Conflicting evidence: Transaction code "${normTcode}" follows standard naming, but was created in customer system "${srcSys}" under package "${pkg}".`
      );
    }

    if (isSapOriginalSystem && isCustomPackage) {
      conflicts.push(
        `Conflicting evidence: Original system is SAP, but assigned package "${pkg}" is in customer namespace.`
      );
    }

    if (isCustomerOriginalSystem && isStandardPackage) {
      conflicts.push(
        `Conflicting evidence: Original system is customer SID "${srcSys}", but assigned package "${pkg}" is a standard SAP package.`
      );
    }

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

    // 7. Alignment Rules
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
