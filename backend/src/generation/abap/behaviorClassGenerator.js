/**
 * Fiorify — GEN-05: Behavior Implementation Skeleton Generator (Sprint 13.3 / REM-GEN-01)
 *
 * Generates the ABAP Class skeleton (BP_I_*) providing local handler and saver
 * implementations with defensive EML scaffolding, %tky key consistency handling,
 * and explicit developer handover markers.
 */

import { createAbapArtifact, ABAP_ARTIFACT_TYPES } from './abapArtifactContract.js';
import { RAP_PROFILES } from '../architecture/architectureContract.js';

function toAbapMethodName(prefix, title) {
  let clean = (title || 'Action').replace(/[^a-zA-Z0-9]/g, '');
  if (clean.toLowerCase().startsWith(prefix.toLowerCase())) {
    clean = clean.slice(prefix.length);
  }
  return `${prefix}${clean}`.slice(0, 30);
}

export function generateBehaviorImplementationClass(project, architecture) {
  const artifacts = [];
  const entities = project.dataModelSpec?.entities || [];
  const requirements = project.requirementsSpec?.items || [];
  const rootEntity = entities.find((e) => e.entityType === 'ROOT' || e.isRoot) || entities[0];
  if (!rootEntity) return artifacts;

  const prefix = (rootEntity.name || 'CUSTOM').replace(/[^a-zA-Z0-9_]/g, '');
  const rootInterfaceName = `ZI_${prefix}`;
  const className = `BP_I_${prefix}`.toUpperCase();

  const confirmedValidations = requirements.filter((r) => r.status === 'CONFIRMED' && r.category === 'VALIDATION');
  const confirmedDeterminations = requirements.filter((r) => r.status === 'CONFIRMED' && r.category === 'DETERMINATION');
  const confirmedActions = requirements.filter((r) => r.status === 'CONFIRMED' && r.category === 'ACTION');

  const isUnmanaged = architecture?.selectedProfile === RAP_PROFILES.UNMANAGED_RAP;

  const developerCompletionMethods = ['get_instance_authorizations'];

  let code = `CLASS ${className.toLowerCase()} DEFINITION PUBLIC ABSTRACT FINAL FOR BEHAVIOR OF ${rootInterfaceName.toLowerCase()}.\n`;
  code += `ENDCLASS.\n\n`;
  code += `CLASS ${className.toLowerCase()} IMPLEMENTATION.\n`;
  code += `ENDCLASS.\n\n`;

  // Local Handler Definition & Implementation
  code += `/* ===================================================================== */\n`;
  code += `/* Local Handler Definition for ${rootEntity.name}                      */\n`;
  code += `/* ===================================================================== */\n`;
  code += `CLASS lhc_${rootEntity.name.toLowerCase()} DEFINITION INHERITING FROM cl_abap_behavior_handler.\n`;
  code += `  PRIVATE SECTION.\n`;
  code += `    METHODS get_instance_authorizations FOR INSTANCE AUTHORIZATION\n`;
  code += `      IMPORTING keys REQUEST requested_authorizations FOR ${rootEntity.name} RESULT result.\n\n`;

  if (isUnmanaged) {
    code += `    /* UNMANAGED RAP CRUD Operations */\n`;
    code += `    METHODS create FOR MODIFY\n`;
    code += `      IMPORTING entities FOR CREATE ${rootEntity.name}.\n\n`;
    code += `    METHODS update FOR MODIFY\n`;
    code += `      IMPORTING entities FOR UPDATE ${rootEntity.name}.\n\n`;
    code += `    METHODS delete FOR MODIFY\n`;
    code += `      IMPORTING keys FOR DELETE ${rootEntity.name} RESULT result.\n\n`;
    code += `    METHODS read FOR READ\n`;
    code += `      IMPORTING keys FOR READ ${rootEntity.name} RESULT result.\n\n`;
    code += `    METHODS lock FOR LOCK\n`;
    code += `      IMPORTING keys FOR LOCK ${rootEntity.name}.\n\n`;
    developerCompletionMethods.push('create', 'update', 'delete', 'read', 'lock');
  }

  for (const v of confirmedValidations) {
    const mName = toAbapMethodName('validate', v.title).toLowerCase();
    code += `    /* Implements Requirement: ${v.requirementId} */\n`;
    code += `    METHODS ${mName} FOR VALIDATE ON SAVE\n`;
    code += `      IMPORTING keys FOR ${rootEntity.name}~${mName}.\n\n`;
    developerCompletionMethods.push(mName);
  }

  for (const d of confirmedDeterminations) {
    const mName = toAbapMethodName('calculate', d.title).toLowerCase();
    code += `    /* Implements Requirement: ${d.requirementId} */\n`;
    code += `    METHODS ${mName} FOR DETERMINE ON MODIFY\n`;
    code += `      IMPORTING keys FOR ${rootEntity.name}~${mName}.\n\n`;
    developerCompletionMethods.push(mName);
  }

  for (const a of confirmedActions) {
    const mName = toAbapMethodName('execute', a.title).toLowerCase();
    code += `    /* Implements Requirement: ${a.requirementId} */\n`;
    code += `    METHODS ${mName} FOR MODIFY\n`;
    code += `      IMPORTING keys FOR ACTION ${rootEntity.name}~${mName} RESULT result.\n\n`;
    developerCompletionMethods.push(mName);
  }

  code += `ENDCLASS.\n\n`;

  // Local Handler Implementation
  code += `CLASS lhc_${rootEntity.name.toLowerCase()} IMPLEMENTATION.\n\n`;

  // get_instance_authorizations
  code += `  METHOD get_instance_authorizations.\n`;
  code += `    " HANDOVER STATUS: SCAFFOLD GENERATED - DOMAIN LOGIC EXTENSION REQUIRED\n`;
  code += `    " Evaluates requested instance authorizations against PFCG authorization profiles\n`;
  code += `    LOOP AT keys ASSIGNING FIELD-SYMBOL(<ls_key>).\n`;
  code += `      APPEND VALUE #( %tky = <ls_key>-%tky\n`;
  code += `                      %update = if_abap_behv=>auth-allowed\n`;
  code += `                      %delete = if_abap_behv=>auth-allowed ) TO result.\n`;
  code += `    ENDLOOP.\n`;
  code += `  ENDMETHOD.\n\n`;

  if (isUnmanaged) {
    code += `  METHOD create.\n`;
    code += `    /* =================================================================== */\n`;
    code += `    /* WARNING: UNMANAGED_RAP requires developer buffer implementation     */\n`;
    code += `    /* TODO: Implement custom buffer creation or legacy BAPI integration   */\n`;
    code += `    /* =================================================================== */\n`;
    code += `    " HANDOVER STATUS: SCAFFOLD GENERATED - DOMAIN LOGIC EXTENSION REQUIRED\n`;
    code += `    " UNMANAGED_RAP requires developer buffer implementation or legacy BAPI wrapper.\n`;
    code += `  ENDMETHOD.\n\n`;

    code += `  METHOD update.\n`;
    code += `    " HANDOVER STATUS: SCAFFOLD GENERATED - DOMAIN LOGIC EXTENSION REQUIRED\n`;
    code += `    " UNMANAGED_RAP requires developer buffer update logic.\n`;
    code += `  ENDMETHOD.\n\n`;

    code += `  METHOD delete.\n`;
    code += `    " HANDOVER STATUS: SCAFFOLD GENERATED - DOMAIN LOGIC EXTENSION REQUIRED\n`;
    code += `    " UNMANAGED_RAP requires developer buffer deletion logic.\n`;
    code += `  ENDMETHOD.\n\n`;

    code += `  METHOD read.\n`;
    code += `    " HANDOVER STATUS: SCAFFOLD GENERATED - DOMAIN LOGIC EXTENSION REQUIRED\n`;
    code += `    " Implement buffer and persistent database read for unmanaged entity.\n`;
    code += `  ENDMETHOD.\n\n`;

    code += `  METHOD lock.\n`;
    code += `    " HANDOVER STATUS: SCAFFOLD GENERATED - DOMAIN LOGIC EXTENSION REQUIRED\n`;
    code += `    " Implement unmanaged enqueue lock invocation.\n`;
    code += `  ENDMETHOD.\n\n`;
  }

  // Validation methods with defensive EML scaffolding
  for (const v of confirmedValidations) {
    const mName = toAbapMethodName('validate', v.title).toLowerCase();
    code += `  METHOD ${mName}.\n`;
    code += `    /* =================================================================== */\n`;
    code += `    /* REQUIREMENT: ${v.requirementId} - ${v.title}\n`;
    code += `    /* ACCEPTANCE CRITERIA:\n`;
    if (Array.isArray(v.acceptanceCriteria) && v.acceptanceCriteria.length > 0) {
      for (const ac of v.acceptanceCriteria) {
        code += `    /*   - ${ac}\n`;
      }
    } else {
      code += `    /*   - Validate input parameters and prevent invalid transactional save\n`;
    }
    code += `    /* =================================================================== */\n`;
    code += `    /* TODO: Read entity buffer using EML (ENTITY ${rootInterfaceName}) */\n`;
    code += `    " HANDOVER STATUS: SCAFFOLD GENERATED - DOMAIN LOGIC EXTENSION REQUIRED\n`;
    code += `    READ ENTITIES OF ${rootInterfaceName.toLowerCase()} IN LOCAL MODE\n`;
    code += `      ENTITY ${rootEntity.name.toLowerCase()}\n`;
    code += `      ALL FIELDS WITH CORRESPONDING #( keys )\n`;
    code += `      RESULT DATA(lt_entities)\n`;
    code += `      FAILED DATA(lt_read_failed).\n\n`;
    code += `    LOOP AT lt_entities ASSIGNING FIELD-SYMBOL(<ls_entity>).\n`;
    code += `      " Defensive check: verify key integrity and populate reported/failed on violation\n`;
    code += `      IF <ls_entity>-%tky IS INITIAL.\n`;
    code += `        APPEND VALUE #( %tky = <ls_entity>-%tky ) TO failed-${rootEntity.name.toLowerCase()}.\n`;
    code += `        APPEND VALUE #( %tky = <ls_entity>-%tky\n`;
    code += `                        %msg = new_message_with_text(\n`;
    code += `                                 severity = if_abap_behv_message=>severity-error\n`;
    code += `                                 text     = 'Mandatory entity key is unassigned.' )\n`;
    code += `                      ) TO reported-${rootEntity.name.toLowerCase()}.\n`;
    code += `      ENDIF.\n`;
    code += `    ENDLOOP.\n`;
    code += `  ENDMETHOD.\n\n`;
  }

  // Determination methods with defensive scaffolding
  for (const d of confirmedDeterminations) {
    const mName = toAbapMethodName('calculate', d.title).toLowerCase();
    code += `  METHOD ${mName}.\n`;
    code += `    /* =================================================================== */\n`;
    code += `    /* REQUIREMENT: ${d.requirementId} - ${d.title}\n`;
    code += `    /* =================================================================== */\n`;
    code += `    /* TODO: Read entity buffer using EML (ENTITY ${rootInterfaceName}) */\n`;
    code += `    " HANDOVER STATUS: SCAFFOLD GENERATED - DOMAIN LOGIC EXTENSION REQUIRED\n`;
    code += `    READ ENTITIES OF ${rootInterfaceName.toLowerCase()} IN LOCAL MODE\n`;
    code += `      ENTITY ${rootEntity.name.toLowerCase()}\n`;
    code += `      ALL FIELDS WITH CORRESPONDING #( keys )\n`;
    code += `      RESULT DATA(lt_entities).\n\n`;
    code += `    " Developer Extension Point: Calculate derived values and modify entity buffer\n`;
    code += `    /* TODO: Modify entity fields via EML */\n`;
    code += `    IF lt_entities IS NOT INITIAL.\n`;
    code += `      " MODIFY ENTITIES OF ${rootInterfaceName.toLowerCase()} IN LOCAL MODE\n`;
    code += `      "   ENTITY ${rootEntity.name.toLowerCase()}\n`;
    code += `      "   UPDATE FIELDS ( ... ) WITH VALUE #( ... ).\n`;
    code += `    ENDIF.\n`;
    code += `  ENDMETHOD.\n\n`;
  }

  // Action methods with defensive scaffolding
  for (const a of confirmedActions) {
    const mName = toAbapMethodName('execute', a.title).toLowerCase();
    code += `  METHOD ${mName}.\n`;
    code += `    /* =================================================================== */\n`;
    code += `    /* REQUIREMENT: ${a.requirementId} - ${a.title}\n`;
    code += `    /* =================================================================== */\n`;
    code += `    /* TODO: Execute action logic and return updated $self result */\n`;
    code += `    /* TODO: Read entity buffer using EML (ENTITY ${rootInterfaceName}) */\n`;
    code += `    " HANDOVER STATUS: SCAFFOLD GENERATED - DOMAIN LOGIC EXTENSION REQUIRED\n`;
    code += `    READ ENTITIES OF ${rootInterfaceName.toLowerCase()} IN LOCAL MODE\n`;
    code += `      ENTITY ${rootEntity.name.toLowerCase()}\n`;
    code += `      ALL FIELDS WITH CORRESPONDING #( keys )\n`;
    code += `      RESULT DATA(lt_entities)\n`;
    code += `      FAILED DATA(lt_failed).\n\n`;
    code += `    " Default scaffold response: return instance references to satisfy RAP action contract\n`;
    code += `    result = VALUE #( FOR ls_key IN keys ( %tky = ls_key-%tky %param = CORRESPONDING #( ls_key ) ) ).\n`;
    code += `  ENDMETHOD.\n\n`;
  }

  code += `ENDCLASS.\n`;

  if (isUnmanaged) {
    code += `\n/* ===================================================================== */\n`;
    code += `/* Local Saver Definition for Unmanaged RAP                              */\n`;
    code += `/* ===================================================================== */\n`;
    code += `CLASS lsc_${rootEntity.name.toLowerCase()} DEFINITION INHERITING FROM cl_abap_behavior_saver.\n`;
    code += `  PROTECTED SECTION.\n`;
    code += `    METHODS finalize REDEFINITION.\n`;
    code += `    METHODS check_before_save REDEFINITION.\n`;
    code += `    METHODS save REDEFINITION.\n`;
    code += `    METHODS cleanup REDEFINITION.\n`;
    code += `    METHODS cleanup_finalize REDEFINITION.\n`;
    code += `ENDCLASS.\n\n`;
    code += `CLASS lsc_${rootEntity.name.toLowerCase()} IMPLEMENTATION.\n`;
    code += `  METHOD finalize.\n`;
    code += `    " HANDOVER STATUS: SCAFFOLD GENERATED - DOMAIN LOGIC EXTENSION REQUIRED\n`;
    code += `  ENDMETHOD.\n\n`;
    code += `  METHOD check_before_save.\n`;
    code += `    " HANDOVER STATUS: SCAFFOLD GENERATED - DOMAIN LOGIC EXTENSION REQUIRED\n`;
    code += `  ENDMETHOD.\n\n`;
    code += `  METHOD save.\n`;
    code += `    /* =================================================================== */\n`;
    code += `    /* WARNING: UNMANAGED_RAP requires developer database commit logic     */\n`;
    code += `    /* TODO: Execute BAPI commit or transactional commit sequence          */\n`;
    code += `    /* =================================================================== */\n`;
    code += `    " HANDOVER STATUS: SCAFFOLD GENERATED - DOMAIN LOGIC EXTENSION REQUIRED\n`;
    code += `    " UNMANAGED_RAP requires developer database commit logic via BAPI or COMMIT WORK.\n`;
    code += `  ENDMETHOD.\n\n`;
    code += `  METHOD cleanup.\n`;
    code += `    " HANDOVER STATUS: SCAFFOLD GENERATED - DOMAIN LOGIC EXTENSION REQUIRED\n`;
    code += `  ENDMETHOD.\n\n`;
    code += `  METHOD cleanup_finalize.\n`;
    code += `    " HANDOVER STATUS: SCAFFOLD GENERATED - DOMAIN LOGIC EXTENSION REQUIRED\n`;
    code += `  ENDMETHOD.\n`;
    code += `ENDCLASS.\n`;
  }

  const limitations = [
    'Contains defensive RAP behavior scaffolding with EML boilerplate.',
    'Requires real ABAP developer implementation in Eclipse ADT before activation in S21.',
    'Requires developer domain logic extension in Eclipse ADT before activation in S21.'
  ];
  if (isUnmanaged) {
    limitations.push('UNMANAGED_RAP profile requires custom developer implementation for buffer management, CRUD handlers, and commit sequence.');
  }

  artifacts.push(createAbapArtifact({
    projectId: project.projectId,
    artifactType: ABAP_ARTIFACT_TYPES.RAP_BEHAVIOR_IMPLEMENTATION,
    objectName: className,
    filePath: `src/classes/${className.toLowerCase()}.clas.abap`,
    content: code,
    sourceEntityIds: [rootEntity.entityId],
    sourceRequirementIds: [...confirmedValidations, ...confirmedDeterminations, ...confirmedActions].map((r) => r.requirementId),
    dependencies: [rootInterfaceName],
    limitations,
    requiresDeveloperCompletion: true,
    developerCompletionMethods
  }));

  return artifacts;
}
