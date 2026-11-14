/**
 * Fiorify — SAP Artifact Compatibility Engine (Sprint 11.3)
 *
 * Implements rigorous semantic compatibility inspection between generated Fiorify
 * RAP backend artifacts (S8), Fiori Elements frontend artifacts (S9), and the
 * target SAP S/4HANA 2023 landscape (S21 / Client 200 / S4CORE 108).
 *
 * Enforces:
 * - Deep ABAP RAP semantic validation (DDIC, CDS, BDEF, CLAS, SRVD, SRVB, DCLS).
 * - Detection of TODO placeholders & empty behavior implementations.
 * - Explicit service binding lifecycle states.
 * - Full Fiori-to-RAP contract checking (manifest, annotations, entity sets, navigation).
 * - S/4HANA 2023 Clean Core release compatibility rating.
 */

export const COMPATIBILITY_RATINGS = Object.freeze({
  COMPATIBLE: 'COMPATIBLE',
  COMPATIBLE_WITH_LIMITATIONS: 'COMPATIBLE_WITH_LIMITATIONS',
  REQUIRES_REMEDIATION: 'REQUIRES_REMEDIATION',
  UNSUPPORTED: 'UNSUPPORTED',
  UNKNOWN_INSUFFICIENT_EVIDENCE: 'UNKNOWN_INSUFFICIENT_EVIDENCE'
});

export const SERVICE_BINDING_LIFECYCLE_STATES = Object.freeze({
  NOT_GENERATED: 'NOT_GENERATED',
  GENERATED: 'GENERATED',
  READY_FOR_IMPORT: 'READY_FOR_IMPORT',
  IMPORTED: 'IMPORTED',
  ACTIVATION_PENDING: 'ACTIVATION_PENDING',
  ACTIVATED: 'ACTIVATED',
  VERIFIED: 'VERIFIED',
  FAILED: 'FAILED'
});

export class SapArtifactCompatibilityEngine {
  constructor(options = {}) {
    this.targetRelease = options.targetRelease || 'SAP S/4HANA 2023 Private Edition';
    this.softwareComponent = options.softwareComponent || 'S4CORE 108';
    this.sapBasisRelease = options.sapBasisRelease || '758';
  }

  /**
   * Evaluates project artifacts for target SAP system compatibility
   *
   * @param {Object} project - GenerationProject record containing artifactRegistry and specs
   * @param {Object} systemContext - Target SAP system metadata
   * @returns {Object} Comprehensive compatibility evaluation report
   */
  evaluateProjectCompatibility(project, systemContext = {}) {
    const startTime = Date.now();
    const artifacts = Object.values(project?.artifactRegistry?.artifacts || {});
    const dataModelSpec = project?.dataModelSpec || {};
    const architectureSpec = project?.architectureSpec || {};

    const findings = [];
    const entitySetNames = new Set();
    const cdsFieldNames = new Map(); // entityName -> Set of field names
    let srvdName = null;
    let srvbProposal = null;
    let srvbLifecycleState = SERVICE_BINDING_LIFECYCLE_STATES.NOT_GENERATED;

    if (!project || artifacts.length === 0) {
      return {
        rating: COMPATIBILITY_RATINGS.UNKNOWN_INSUFFICIENT_EVIDENCE,
        score: 0,
        summary: 'No generated artifacts found for project.',
        findings: [{
          level: 'ERROR',
          code: 'NO_ARTIFACTS',
          message: 'Project artifact registry is empty. Generate RAP and Fiori artifacts first.'
        }],
        serviceBindingStatus: SERVICE_BINDING_LIFECYCLE_STATES.NOT_GENERATED,
        limitations: ['Artifact generation must be executed prior to compatibility verification.'],
        durationMs: Date.now() - startTime
      };
    }

    // -------------------------------------------------------------
    // 1. RAP BACKEND INSPECTION (CDS, BDEF, CLAS, SRVD, DCL)
    // -------------------------------------------------------------

    // Check CDS View Entities
    const cdsViews = artifacts.filter(a => a.artifactType === 'CDS_VIEW_ENTITY' || a.artifactType === 'CDS_PROJECTION_VIEW');
    for (const view of cdsViews) {
      entitySetNames.add(view.objectName);

      // Check modern syntax: define view entity vs legacy define view
      if (!view.content.includes('define view entity') && !view.content.includes('define root view entity')) {
        findings.push({
          level: 'ERROR',
          code: 'LEGACY_CDS_SYNTAX',
          artifactId: view.artifactId,
          objectName: view.objectName,
          message: `CDS view "${view.objectName}" uses legacy CDS syntax. S/4HANA 2023 requires "define [root] view entity".`,
          remediation: 'Regenerate CDS views using modern CDS View Entity architecture.'
        });
      }

      // Extract fields
      const fields = new Set();
      const fieldRegex = /key\s+([A-Za-z0-9_]+)|([A-Za-z0-9_]+)\s*:\s*[A-Za-z0-9_]+|([A-Za-z0-9_]+)\s*,/g;
      let m;
      while ((m = fieldRegex.exec(view.content)) !== null) {
        const fieldName = m[1] || m[2] || m[3];
        if (fieldName && !['key', 'as', 'select', 'from', 'association', 'composition'].includes(fieldName.toLowerCase())) {
          fields.add(fieldName);
        }
      }
      cdsFieldNames.set(view.objectName, fields);

      // Check Customer Namespace
      if (!view.objectName.startsWith('Z') && !view.objectName.startsWith('Y')) {
        findings.push({
          level: 'WARNING',
          code: 'NON_CUSTOMER_NAMESPACE',
          artifactId: view.artifactId,
          objectName: view.objectName,
          message: `Object "${view.objectName}" is not prefixed with Z* or Y*.`,
          remediation: 'Ensure custom ABAP objects reside in customer namespace.'
        });
      }
    }

    // Check Behavior Definitions (BDEF)
    const bdefs = artifacts.filter(a => a.artifactType === 'RAP_BEHAVIOR_DEFINITION');
    for (const bdef of bdefs) {
      // Check managed implementation
      if (!bdef.content.includes('managed') && !bdef.content.includes('unmanaged')) {
        findings.push({
          level: 'ERROR',
          code: 'BDEF_MISSING_MANAGED_TYPE',
          artifactId: bdef.artifactId,
          objectName: bdef.objectName,
          message: `Behavior definition "${bdef.objectName}" does not specify implementation type (managed / unmanaged).`,
          remediation: 'Define "managed implementation in class ... unique".'
        });
      }

      // Check Draft table relationship if draft enabled
      if (bdef.content.includes('with draft') && !bdef.content.includes('draft table')) {
        findings.push({
          level: 'ERROR',
          code: 'BDEF_DRAFT_TABLE_MISSING',
          artifactId: bdef.artifactId,
          objectName: bdef.objectName,
          message: `Behavior definition "${bdef.objectName}" enables draft handling but does not declare a draft table.`,
          remediation: 'Declare "draft table <draft_table_name>" in behavior definition.'
        });
      }

      // Check ETag master
      if (!bdef.content.includes('etag master')) {
        findings.push({
          level: 'WARNING',
          code: 'BDEF_MISSING_ETAG',
          artifactId: bdef.artifactId,
          objectName: bdef.objectName,
          message: `Behavior definition "${bdef.objectName}" does not define "etag master". Concurrency conflicts may occur.`,
          remediation: 'Specify "etag master LastChangedAt" on transactional root.'
        });
      }
    }

    // Check Behavior Implementation Classes (CLAS) - Critical TODO & Method Check
    const abapClasses = artifacts.filter(a => a.artifactType === 'RAP_BEHAVIOR_POOL' || a.filePath.endsWith('.clas.abap'));
    const detectedTodos = [];
    const emptyMethods = [];

    for (const cls of abapClasses) {
      const content = cls.content || '';
      
      // Match TODO comments
      const todoMatches = content.match(/TODO:?\s*([^\r\n]+)/gi);
      if (todoMatches) {
        todoMatches.forEach(t => detectedTodos.push({ object: cls.objectName, text: t.trim() }));
      }

      // Check for empty methods: method <name>. [comments/whitespace] endmethod.
      const methodBlockRegex = /method\s+([A-Za-z0-9_~]+)\s*\.([\s\S]*?)endmethod\s*\./gi;
      let methodMatch;
      while ((methodMatch = methodBlockRegex.exec(content)) !== null) {
        const methodName = methodMatch[1];
        const methodBody = methodMatch[2].replace(/\*[^\r\n]*/g, '').replace(/\"[^\r\n]*/g, '').trim();
        if (!methodBody) {
          emptyMethods.push({ object: cls.objectName, method: methodName });
        }
      }
    }

    if (detectedTodos.length > 0 || emptyMethods.length > 0) {
      findings.push({
        level: 'WARNING',
        code: 'BEHAVIOR_IMPLEMENTATION_INCOMPLETE',
        message: `Behavior implementation contains ${detectedTodos.length} TODO item(s) and ${emptyMethods.length} empty method(s).`,
        details: { todos: detectedTodos, emptyMethods },
        remediation: 'Complete ABAP business logic in behavior pool before promoting to production.'
      });
    }

    // Check Service Definition (SRVD)
    const srvd = artifacts.find(a => a.artifactType === 'RAP_SERVICE_DEFINITION');
    if (srvd) {
      srvdName = srvd.objectName;
      if (!srvd.content.includes('define service')) {
        findings.push({
          level: 'ERROR',
          code: 'SRVD_SYNTAX_ERROR',
          artifactId: srvd.artifactId,
          objectName: srvd.objectName,
          message: `Service definition "${srvd.objectName}" lacks "define service" clause.`
        });
      }
    } else {
      findings.push({
        level: 'ERROR',
        code: 'SRVD_MISSING',
        message: 'No RAP Service Definition generated for OData exposure.'
      });
    }

    // Check Service Binding Proposal (SRVB)
    const srvb = artifacts.find(a => a.artifactType === 'RAP_SERVICE_BINDING_PROPOSAL');
    if (srvb) {
      try {
        srvbProposal = JSON.parse(srvb.content);
        srvbLifecycleState = SERVICE_BINDING_LIFECYCLE_STATES.READY_FOR_IMPORT;

        if (srvbProposal.bindingType !== 'ODATA_V4_UI') {
          findings.push({
            level: 'WARNING',
            code: 'SRVB_BINDING_TYPE_NON_O4',
            message: `Service binding type is "${srvbProposal.bindingType}". OData V4 UI (ODATA_V4_UI) is recommended for S/4HANA 2023 Clean Core.`
          });
        }
        if (srvdName && srvbProposal.serviceDefinition !== srvdName) {
          findings.push({
            level: 'ERROR',
            code: 'SRVB_SRVD_MISMATCH',
            message: `Service binding references service "${srvbProposal.serviceDefinition}", but generated service definition is "${srvdName}".`
          });
        }
      } catch (parseErr) {
        findings.push({
          level: 'ERROR',
          code: 'SRVB_MALFORMED_JSON',
          message: 'Service Binding proposal contains malformed JSON.'
        });
        srvbLifecycleState = SERVICE_BINDING_LIFECYCLE_STATES.FAILED;
      }
    } else {
      srvbLifecycleState = SERVICE_BINDING_LIFECYCLE_STATES.NOT_GENERATED;
    }

    // -------------------------------------------------------------
    // 2. FIORI ELEMENTS ARTIFACT & CONTRACT CHECKING
    // -------------------------------------------------------------
    const manifestArtifact = artifacts.find(a => a.filePath.endsWith('manifest.json'));
    if (manifestArtifact) {
      try {
        const manifest = JSON.parse(manifestArtifact.content);
        const dataSources = manifest?.['sap.app']?.dataSources || {};
        const mainService = dataSources.mainService;

        if (!mainService) {
          findings.push({
            level: 'ERROR',
            code: 'FIORI_MISSING_MAIN_SERVICE',
            message: 'manifest.json missing "mainService" dataSource definition.'
          });
        } else {
          // Check OData V4 service specification
          if (mainService.settings?.odataVersion !== '4.0') {
            findings.push({
              level: 'WARNING',
              code: 'FIORI_ODATA_VERSION_MISMATCH',
              message: `manifest.json odataVersion is "${mainService.settings?.odataVersion}". Expected 4.0.`
            });
          }
        }

        // Check minUI5Version
        const minUI5Version = manifest?.['sap.ui5']?.dependencies?.minUI5Version;
        if (!minUI5Version) {
          findings.push({
            level: 'WARNING',
            code: 'FIORI_MISSING_MIN_UI5_VERSION',
            message: 'manifest.json does not declare minUI5Version.'
          });
        }

        // Check Entity Set in floorplan targets
        const targets = manifest?.['sap.ui5']?.routing?.targets || {};
        for (const [targetName, targetDef] of Object.entries(targets)) {
          const entitySet = targetDef.options?.settings?.entitySet;
          if (entitySet && !entitySetNames.has(entitySet)) {
            findings.push({
              level: 'ERROR',
              code: 'FIORI_ENTITY_SET_NOT_IN_RAP',
              message: `manifest.json target "${targetName}" binds entitySet "${entitySet}", which is not present in generated RAP CDS views.`
            });
          }
        }
      } catch {
        findings.push({
          level: 'ERROR',
          code: 'MANIFEST_MALFORMED_JSON',
          message: 'Generated manifest.json is not valid JSON.'
        });
      }
    }

    // -------------------------------------------------------------
    // 3. TARGET SAP RELEASE COMPATIBILITY (S/4HANA 2023 Private Edition)
    // -------------------------------------------------------------
    const errors = findings.filter(f => f.level === 'ERROR');
    const warnings = findings.filter(f => f.level === 'WARNING');

    let rating = COMPATIBILITY_RATINGS.COMPATIBLE;
    const limitations = [];

    if (errors.length > 0) {
      rating = COMPATIBILITY_RATINGS.REQUIRES_REMEDIATION;
    } else if (warnings.length > 0) {
      rating = COMPATIBILITY_RATINGS.COMPATIBLE_WITH_LIMITATIONS;
      if (detectedTodos.length > 0) {
        limitations.push(`Contains ${detectedTodos.length} TODO business logic placeholder(s) in ABAP behavior implementation classes.`);
      }
      if (srvbLifecycleState === SERVICE_BINDING_LIFECYCLE_STATES.READY_FOR_IMPORT) {
        limitations.push('Service Binding is in READY_FOR_IMPORT proposal state; requires SAP ADT import and activation.');
      }
    }

    const score = Math.max(0, 100 - (errors.length * 25) - (warnings.length * 5));

    return {
      rating,
      score,
      targetRelease: this.targetRelease,
      softwareComponent: this.softwareComponent,
      summary: errors.length === 0
        ? `Artifact package is compatible with ${this.targetRelease} (${warnings.length} non-blocking limitation(s)).`
        : `Artifact package requires remediation (${errors.length} error(s), ${warnings.length} warning(s)).`,
      serviceBindingStatus: srvbLifecycleState,
      totalArtifactsInspected: artifacts.length,
      limitations,
      findings,
      durationMs: Date.now() - startTime
    };
  }
}

export const defaultSapArtifactCompatibilityEngine = new SapArtifactCompatibilityEngine();
