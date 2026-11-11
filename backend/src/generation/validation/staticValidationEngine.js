/**
 * FioriX — GEN-05 & GEN-06 Static Validation Engine
 *
 * Implements rigorous, honest static verification of generated ABAP RAP artifacts,
 * Fiori Elements UI5 files, and cross-artifact consistency contracts for S/4HANA 2023.
 */

import { computeSha256 } from '../abap/abapArtifactContract.js';

export class StaticValidationEngine {
  /**
   * Runs the complete multi-stage static validation suite across project artifacts.
   *
   * @param {Object} project - The GenerationProject record
   * @returns {Object} Comprehensive validation report
   */
  validateProject(project) {
    const findings = [];
    const registry = project.artifactRegistry?.artifacts || {};
    const artifacts = Object.values(registry);
    const entities = project.dataModelSpec?.entities || [];
    const architecture = project.architectureSpec || {};

    // -------------------------------------------------------------
    // STAGE 1: GEN-05 ABAP/RAP Static Checks
    // -------------------------------------------------------------
    const rootEntity = entities.find((e) => e.entityType === 'ROOT' || e.isRoot) || entities[0];
    if (!rootEntity) {
      findings.push({
        ruleId: 'RULE_GEN05_NO_ROOT_ENTITY',
        severity: 'ERROR',
        category: 'ABAP_CDS',
        artifactId: null,
        message: 'No ROOT entity defined in CDS data model.',
        explanation: 'ABAP RAP architecture requires at least one root view entity (define root view entity) to act as transactional anchor.',
        suggestedCorrection: 'Designate a root entity in Data Model Designer.',
        evidenceBasis: 'SAP S/4HANA 2023 RAP Specification'
      });
    }

    // Customer Namespace check (Z* or Y*)
    for (const ent of entities) {
      if (!ent.name.startsWith('Z') && !ent.name.startsWith('Y') && !ent.name.startsWith('I_') && !ent.name.startsWith('C_')) {
        findings.push({
          ruleId: 'RULE_GEN05_CUSTOMER_NAMESPACE',
          severity: 'WARNING',
          category: 'ABAP_NAMING',
          artifactId: null,
          location: `Entity: ${ent.name}`,
          message: `Entity "${ent.name}" does not begin with standard customer prefix (Z or Y).`,
          explanation: 'SAP ABAP customer objects must reside in customer namespace (Z* or Y*) to avoid collision with standard SAP delivery.',
          suggestedCorrection: `Prefix entity name with 'Z' (e.g. Z${ent.name}).`,
          evidenceBasis: 'SAP S/4HANA Clean Core Guidelines'
        });
      }
    }

    // Check Service Definition exposing existing projections
    const srvdArtifact = artifacts.find((a) => a.artifactType === 'RAP_SERVICE_DEFINITION');
    const projArtifacts = artifacts.filter((a) => a.artifactType === 'CDS_PROJECTION_VIEW');

    if (srvdArtifact) {
      for (const proj of projArtifacts) {
        if (!srvdArtifact.content.includes(proj.objectName)) {
          findings.push({
            ruleId: 'RULE_GEN05_SRVD_EXPOSURE_MISSING',
            severity: 'ERROR',
            category: 'RAP_SERVICE',
            artifactId: srvdArtifact.artifactId,
            location: srvdArtifact.filePath,
            message: `Service Definition "${srvdArtifact.objectName}" does not expose projection view "${proj.objectName}".`,
            explanation: 'All generated transactional projection views must be exposed in the service definition to be accessible via OData.',
            suggestedCorrection: `Add 'expose ${proj.objectName} as ...;' to ${srvdArtifact.objectName}.`,
            evidenceBasis: 'ABAP RAP Service Definition Specification'
          });
        }
      }
    }

    // Check Service Binding Proposal references Service Definition
    const srvbArtifact = artifacts.find((a) => a.artifactType === 'RAP_SERVICE_BINDING_PROPOSAL');
    if (srvbArtifact && srvdArtifact) {
      try {
        const srvbJson = JSON.parse(srvbArtifact.content);
        if (srvbJson.serviceDefinition !== srvdArtifact.objectName) {
          findings.push({
            ruleId: 'RULE_GEN05_SRVB_REF_MISMATCH',
            severity: 'ERROR',
            category: 'RAP_SERVICE',
            artifactId: srvbArtifact.artifactId,
            location: srvbArtifact.filePath,
            message: `Service Binding proposal references service "${srvbJson.serviceDefinition}", but generated Service Definition is "${srvdArtifact.objectName}".`,
            explanation: 'Service binding must directly bind the generated service definition.',
            suggestedCorrection: `Update referenced service definition to "${srvdArtifact.objectName}".`,
            evidenceBasis: 'ABAP Development Tools Service Binding Model'
          });
        }
      } catch {
        findings.push({
          ruleId: 'RULE_GEN05_SRVB_MALFORMED_JSON',
          severity: 'ERROR',
          category: 'FORMAT',
          artifactId: srvbArtifact.artifactId,
          location: srvbArtifact.filePath,
          message: 'Service binding proposal contains malformed JSON.',
          explanation: 'Planning configuration must be valid JSON.',
          suggestedCorrection: 'Regenerate service binding proposal.',
          evidenceBasis: 'JSON RFC 8259'
        });
      }
    }

    // Behavior Definition matches architecture profile
    const bdefArtifacts = artifacts.filter((a) => a.artifactType === 'RAP_BEHAVIOR_DEFINITION');
    if (architecture.draftDecision?.enabled) {
      const rootBdef = bdefArtifacts.find((b) => b.objectName.startsWith('ZI_'));
      if (rootBdef && !rootBdef.content.includes('with draft')) {
        findings.push({
          ruleId: 'RULE_GEN05_DRAFT_DECLARATION_MISSING',
          severity: 'ERROR',
          category: 'RAP_BEHAVIOR',
          artifactId: rootBdef.artifactId,
          location: rootBdef.filePath,
          message: 'Architecture specifies Draft enabled, but Behavior Definition lacks "with draft;" declaration.',
          explanation: 'When draft is selected, root BDEF must specify "with draft;" and declare draft tables.',
          suggestedCorrection: 'Add "with draft;" to behavior definition header.',
          evidenceBasis: 'SAP RAP Draft Specification'
        });
      }
    }

    // -------------------------------------------------------------
    // STAGE 2: GEN-06 SAP Fiori Elements Static Checks
    // -------------------------------------------------------------
    const manifestArtifact = artifacts.find((a) => a.artifactType === 'FIORI_MANIFEST');
    if (manifestArtifact) {
      let manifestJson;
      try {
        manifestJson = JSON.parse(manifestArtifact.content);
      } catch (e) {
        findings.push({
          ruleId: 'RULE_GEN06_MANIFEST_INVALID_JSON',
          severity: 'ERROR',
          category: 'FIORI_MANIFEST',
          artifactId: manifestArtifact.artifactId,
          location: manifestArtifact.filePath,
          message: `Manifest JSON is syntactically invalid: ${e.message}`,
          explanation: 'SAPUI5 applications fail to bootstrap if manifest.json cannot be parsed as valid JSON.',
          suggestedCorrection: 'Fix JSON syntax in manifest.json.',
          evidenceBasis: 'SAPUI5 Manifest Specification'
        });
      }

      if (manifestJson) {
        // OData V4 check
        const ds = manifestJson['sap.app']?.dataSources?.mainService;
        if (!ds || ds.settings?.odataVersion !== '4.0') {
          findings.push({
            ruleId: 'RULE_GEN06_ODATA_V4_MISMATCH',
            severity: 'ERROR',
            category: 'FIORI_MANIFEST',
            artifactId: manifestArtifact.artifactId,
            location: 'sap.app.dataSources.mainService',
            message: 'Main service dataSource is not configured for OData version 4.0.',
            explanation: 'GEN-06 SAP Fiori Elements List Report & Object Page floorplans require OData V4.',
            suggestedCorrection: 'Set dataSources.mainService.settings.odataVersion to "4.0".',
            evidenceBasis: 'SAP Fiori Elements for OData V4 Guidelines'
          });
        }

        // EntitySet existence check in routing targets
        const targets = manifestJson['sap.ui5']?.routing?.targets || {};
        for (const [tKey, tVal] of Object.entries(targets)) {
          const entitySet = tVal.options?.settings?.entitySet;
          if (entitySet) {
            const entExists = entities.some((e) => e.name === entitySet);
            if (!entExists) {
              findings.push({
                ruleId: 'RULE_GEN06_TARGET_ENTITYSET_MISSING',
                severity: 'ERROR',
                category: 'FIORI_ROUTING',
                artifactId: manifestArtifact.artifactId,
                location: `sap.ui5.routing.targets.${tKey}`,
                message: `Routing target "${tKey}" references nonexistent entitySet "${entitySet}".`,
                explanation: 'Fiori Elements routing targets must bind to entities exposed by the OData service.',
                suggestedCorrection: `Verify entitySet name against data model entities: [${entities.map((e) => e.name).join(', ')}].`,
                evidenceBasis: 'SAP Fiori Elements Floorplan Specification'
              });
            }
          }
        }
      }
    }

    // Annotations XML Syntax Check
    const annotArtifact = artifacts.find((a) => a.artifactType === 'FIORI_ANNOTATIONS_XML');
    if (annotArtifact) {
      if (!annotArtifact.content.includes('<edmx:Edmx') || !annotArtifact.content.includes('</edmx:Edmx>')) {
        findings.push({
          ruleId: 'RULE_GEN06_ANNOTATION_XML_MALFORMED',
          severity: 'ERROR',
          category: 'FIORI_ANNOTATION',
          artifactId: annotArtifact.artifactId,
          location: annotArtifact.filePath,
          message: 'Annotations XML is missing valid root <edmx:Edmx> tag.',
          explanation: 'OData V4 vocabulary annotations must be enclosed within <edmx:Edmx> root element.',
          suggestedCorrection: 'Ensure annotations.xml has valid EDMX wrapping.',
          evidenceBasis: 'OData V4 XML Vocabulary Standard'
        });
      }

      // Verify that property paths referenced in annotations exist on entity
      if (rootEntity && annotArtifact.content) {
        const entityFields = new Set((rootEntity.fields || []).map((f) => f.name));
        const pathMatches = [...annotArtifact.content.matchAll(/Path="([^"#@]+)"/g)].map((m) => m[1]);
        for (const p of pathMatches) {
          if (!entityFields.has(p) && p !== 'ID') {
            findings.push({
              ruleId: 'RULE_GEN06_ANNOTATION_FIELD_NOT_FOUND',
              severity: 'ERROR',
              category: 'FIORI_ANNOTATION',
              artifactId: annotArtifact.artifactId,
              location: annotArtifact.filePath,
              message: `Annotation references property "${p}" which does not exist on entity "${rootEntity.name}".`,
              explanation: 'Fiori Elements XML annotations must bind to valid properties exposed by the underlying entity.',
              suggestedCorrection: `Update or regenerate annotations.xml to align with current entity fields: [${Array.from(entityFields).join(', ')}].`,
              evidenceBasis: 'OData V4 Annotation Model'
            });
          }
        }
      }
    }

    // -------------------------------------------------------------
    // STAGE 3: Cross-Artifact Consistency Checks
    // -------------------------------------------------------------
    // Verify Checksums match stored content
    for (const art of artifacts) {
      const actualHash = computeSha256(art.content);
      if (actualHash !== art.checksum) {
        findings.push({
          ruleId: 'RULE_CROSS_CHECKSUM_MISMATCH',
          severity: 'ERROR',
          category: 'REGISTRY_INTEGRITY',
          artifactId: art.artifactId,
          location: art.filePath,
          message: `SHA-256 checksum mismatch for "${art.objectName}": stored "${art.checksum}", computed "${actualHash}".`,
          explanation: 'Artifact content was modified out-of-band without updating its cryptographic checksum.',
          suggestedCorrection: 'Re-save artifact through the authoritative ArtifactRegistry API.',
          evidenceBasis: 'FioriX Cryptographic Provenance Standard'
        });
      }
    }

    // Check requirement traceability
    const confirmedReqs = (project.requirementsSpec?.items || []).filter((r) => r.status === 'CONFIRMED');
    const coveredReqIds = new Set();
    for (const art of artifacts) {
      if (Array.isArray(art.sourceRequirementIds)) {
        art.sourceRequirementIds.forEach((id) => coveredReqIds.add(id));
      }
    }

    for (const cr of confirmedReqs) {
      if (!coveredReqIds.has(cr.requirementId)) {
        findings.push({
          ruleId: 'RULE_CROSS_REQUIREMENT_UNTRACED',
          severity: 'WARNING',
          category: 'REQUIREMENTS_TRACEABILITY',
          artifactId: null,
          message: `Confirmed requirement "${cr.requirementId}" (${cr.title}) has no mapped generated artifacts.`,
          explanation: 'Every confirmed business requirement should map to at least one CDS field, validation, determination, or action.',
          suggestedCorrection: 'Inspect requirement implementation mapping in Behavior Definition or CDS entities.',
          evidenceBasis: 'Clean Core Requirements Traceability'
        });
      }
    }

    const errorsCount = findings.filter((f) => f.severity === 'ERROR').length;
    const warningsCount = findings.filter((f) => f.severity === 'WARNING').length;

    const status = errorsCount === 0 ? (warningsCount === 0 ? 'VALID' : 'VALID_WITH_WARNINGS') : 'INVALID';

    return {
      status,
      isValid: errorsCount === 0,
      totalFindings: findings.length,
      errorsCount,
      warningsCount,
      findings,
      evaluatedAt: new Date().toISOString()
    };
  }
}

export const defaultStaticValidationEngine = new StaticValidationEngine();
