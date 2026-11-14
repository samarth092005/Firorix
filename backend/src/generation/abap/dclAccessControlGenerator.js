/**
 * Fiorify — GEN-05: DCL Access Control Generator (Sprint 13.3 / REM-GEN-03)
 *
 * Generates ABAP CDS Access Control (DCL) for Root Interface View
 * enforcing domain-realistic Clean Core PFCG authorization checks.
 *
 * Domain Mappings:
 * - Sales Order (VA01 / SD): V_VBAK_VKO (Sales Org: VKORG)
 * - Purchase Order (ME21N / MM): M_BEST_EKO (Purchasing Org: EKORG)
 * - Material Master (MM01 / MM): M_MATE_WRK (Plant: WERKS)
 * - Journal Entry / Finance (FB01 / FI): F_BKPF_BUK (Company Code: BUKRS)
 * - Generic Fallback: S_TABU_DIS (Table Authorization Group)
 */

import { createAbapArtifact, ABAP_ARTIFACT_TYPES } from './abapArtifactContract.js';

function findFieldByNames(entity, candidates) {
  if (!Array.isArray(entity.fields)) return null;
  for (const candidate of candidates) {
    const found = entity.fields.find(
      (f) => f.name?.toLowerCase() === candidate.toLowerCase() ||
             f.sapField?.toLowerCase() === candidate.toLowerCase() ||
             f.businessName?.toLowerCase() === candidate.toLowerCase()
    );
    if (found) return found.name;
  }
  return null;
}

export function generateDclAccessControl(project, architecture) {
  const entities = project.dataModelSpec?.entities || [];
  const rootEntity = entities.find((e) => e.entityType === 'ROOT' || e.isRoot) || entities[0];
  if (!rootEntity) return [];

  const prefix = (rootEntity.name || 'CUSTOM').replace(/[^a-zA-Z0-9_]/g, '');
  const rootInterfaceName = `ZI_${prefix}`;
  const dclRoleName = `Z_${prefix}_DCL`.toUpperCase();

  const tcode = (project.transactionCode || project.baseTransaction || '').toUpperCase();
  const entityName = (rootEntity.name || '').toUpperCase();
  const businessName = (rootEntity.businessName || '').toUpperCase();
  const combinedContext = `${tcode} ${entityName} ${businessName}`;

  let authObject = 'S_TABU_DIS';
  let mappingStatus = 'GENERIC_FALLBACK_REQUIRES_MAPPING';
  let aspectSnippet = '';
  let rationale = '';

  // 1. Purchasing Domain (ME21N, Purchase Order, MM-PUR)
  if (tcode.startsWith('ME') || combinedContext.includes('PURCHAS') || combinedContext.includes('BUY') || combinedContext.includes('PROCURE')) {
    authObject = 'M_BEST_EKO';
    mappingStatus = 'REALISTIC_DOMAIN_MAPPED';
    const field = findFieldByNames(rootEntity, ['PurchasingOrganization', 'PurchasingOrg', 'ekorg', 'Purch_Org']);
    if (field) {
      aspectSnippet = `( ${field} ) = aspect pfcg_auth( M_BEST_EKO, EKORG, ACTVT = '03' );`;
    } else {
      aspectSnippet = `( ) = aspect pfcg_auth( M_BEST_EKO, ACTVT = '03' );`;
    }
    rationale = 'Mapped to Purchasing Organization authorization object M_BEST_EKO (MM).';
  }
  // 2. Sales Domain (VA01, Sales Order, SD)
  else if (tcode.startsWith('VA') || combinedContext.includes('SALES') || combinedContext.includes('CUST_ORDER')) {
    authObject = 'V_VBAK_VKO';
    mappingStatus = 'REALISTIC_DOMAIN_MAPPED';
    const field = findFieldByNames(rootEntity, ['SalesOrganization', 'SalesOrg', 'vkorg', 'Sales_Org']);
    if (field) {
      aspectSnippet = `( ${field} ) = aspect pfcg_auth( V_VBAK_VKO, VKORG, ACTVT = '03' );`;
    } else {
      aspectSnippet = `( ) = aspect pfcg_auth( V_VBAK_VKO, ACTVT = '03' );`;
    }
    rationale = 'Mapped to Sales Organization authorization object V_VBAK_VKO (SD).';
  }
  // 3. Material Domain (MM01, Material Master, MM-IM)
  else if (tcode.startsWith('MM') || combinedContext.includes('MATERIAL') || combinedContext.includes('PRODUCT')) {
    authObject = 'M_MATE_WRK';
    mappingStatus = 'REALISTIC_DOMAIN_MAPPED';
    const field = findFieldByNames(rootEntity, ['Plant', 'werks', 'Factory', 'Site']);
    if (field) {
      aspectSnippet = `( ${field} ) = aspect pfcg_auth( M_MATE_WRK, WERKS, ACTVT = '03' );`;
    } else {
      aspectSnippet = `( ) = aspect pfcg_auth( M_MATE_WRK, ACTVT = '03' );`;
    }
    rationale = 'Mapped to Plant authorization object M_MATE_WRK (MM).';
  }
  // 4. Financial Domain (FB01, Journal Entry, FI-GL)
  else if (tcode.startsWith('FB') || combinedContext.includes('JOURNAL') || combinedContext.includes('FINANCE') || combinedContext.includes('ACCOUNTING')) {
    authObject = 'F_BKPF_BUK';
    mappingStatus = 'REALISTIC_DOMAIN_MAPPED';
    const field = findFieldByNames(rootEntity, ['CompanyCode', 'bukrs', 'Company_Code']);
    if (field) {
      aspectSnippet = `( ${field} ) = aspect pfcg_auth( F_BKPF_BUK, BUKRS, ACTVT = '03' );`;
    } else {
      aspectSnippet = `( ) = aspect pfcg_auth( F_BKPF_BUK, ACTVT = '03' );`;
    }
    rationale = 'Mapped to Company Code authorization object F_BKPF_BUK (FI).';
  }
  // 5. Generic Fallback
  else {
    authObject = 'S_TABU_DIS';
    mappingStatus = 'GENERIC_FALLBACK_REQUIRES_MAPPING';
    aspectSnippet = `/* GENERIC FALLBACK: Domain not matched to standard SD/MM/FI objects. Manual mapping required in ADT. */\n            ( ) = aspect pfcg_auth( S_TABU_DIS, ACTVT = '03', DICBERCLS = '&NC&' );`;
    rationale = 'Entity context did not match standard ERP domain patterns. Fallback S_TABU_DIS applied.';
  }

  let dcl = `@EndUserText.label: 'Access Control for ${rootEntity.businessName || rootEntity.name}'\n`;
  dcl += `@MappingRole: true\n`;
  dcl += `define role ${dclRoleName} {\n`;
  dcl += `  grant\n`;
  dcl += `    select\n`;
  dcl += `      on\n`;
  dcl += `        ${rootInterfaceName}\n`;
  dcl += `          where\n`;
  dcl += `            ${aspectSnippet}\n`;
  dcl += `}\n`;

  const limitations = mappingStatus === 'REALISTIC_DOMAIN_MAPPED'
    ? [`Generated realistic domain authorization object ${authObject}. Review PFCG role assignments in target SAP client.`]
    : [
        'Enforces default S_TABU_DIS generic authorization check.',
        'Requires ABAP security review in Eclipse ADT to configure specific domain authorization objects.'
      ];

  return [
    createAbapArtifact({
      projectId: project.projectId,
      artifactType: ABAP_ARTIFACT_TYPES.DCL_ACCESS_CONTROL,
      objectName: dclRoleName,
      filePath: `src/dcl/${dclRoleName.toLowerCase()}.dcls.asdcls`,
      content: dcl,
      sourceEntityIds: [rootEntity.entityId],
      dependencies: [rootInterfaceName],
      limitations,
      authorizationMappingStatus: mappingStatus,
      authorizationObject: authObject,
      authorizationRationale: rationale
    })
  ];
}
