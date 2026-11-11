/**
 * FioriX — GEN-05: ABAP Documentation Generator
 *
 * Generates comprehensive developer documentation detailing the RAP model,
 * artifact catalog, requirement traceability, and step-by-step ADT activation guide.
 */

import { createAbapArtifact, ABAP_ARTIFACT_TYPES } from './abapArtifactContract.js';

export function generateAbapDocumentation(project, architecture, artifactsList) {
  const rootEntity = project.dataModelSpec?.entities?.find((e) => e.entityType === 'ROOT' || e.isRoot) || project.dataModelSpec?.entities?.[0];
  const reqs = project.requirementsSpec?.items || [];
  const confirmedReqs = reqs.filter((r) => r.status === 'CONFIRMED');

  let md = `# ABAP RAP Modernization Project Documentation\n\n`;
  md += `**Project:** ${project.projectName} (\`${project.projectId}\`)\n`;
  md += `**Target SAP Baseline:** ${project.targetRelease || 'SAP S/4HANA 2023 On-Premise'}\n`;
  md += `**Target Package:** \`${project.targetPackage || 'ZCUSTOM_CORE'}\`\n`;
  md += `**RAP Architecture Profile:** \`${architecture.selectedProfile}\`\n`;
  md += `**Draft Enabled:** \`${architecture.draftDecision?.enabled ? 'YES' : 'NO'}\`\n\n`;

  md += `## 1. Architectural Summary & Clean Core Compliance\n\n`;
  md += `- **Clean Core Tier:** ${architecture.cleanCoreImplications?.tier || 'TIER_2_DEV_EXT'}\n`;
  md += `- **Rationale:** ${architecture.rationale}\n`;
  md += `- **Lock Strategy:** \`${architecture.lockStrategy}\`\n`;
  md += `- **ETag Strategy:** \`${architecture.etagStrategy}\`\n`;
  md += `- **Service Protocol:** \`${architecture.serviceProtocol}\`\n\n`;

  md += `## 2. Generated Artifact Catalog (${artifactsList.length} Objects)\n\n`;
  md += `| Object Name | Artifact Type | File Path | Language | Status |\n`;
  md += `| :--- | :--- | :--- | :---: | :---: |\n`;
  for (const art of artifactsList) {
    md += `| \`${art.objectName}\` | ${art.artifactType} | \`${art.filePath}\` | ${art.language} | Ready for Review |\n`;
  }
  md += `\n`;

  md += `## 3. Requirements Traceability Matrix\n\n`;
  md += `| Requirement ID | Title | Category | Implementation Mapping |\n`;
  md += `| :--- | :--- | :--- | :--- |\n`;
  for (const r of confirmedReqs) {
    let mapping = 'Interface & Projection View CDS Field';
    if (r.category === 'VALIDATION') mapping = 'Behavior Definition (validation on save) & LHC Handler';
    else if (r.category === 'DETERMINATION') mapping = 'Behavior Definition (determination on modify) & LHC Handler';
    else if (r.category === 'ACTION') mapping = 'Behavior Definition custom action & LHC Handler';
    md += `| \`${r.requirementId}\` | ${r.title} | ${r.category} | ${mapping} |\n`;
  }
  md += `\n`;

  md += `## 4. Activation Order in Eclipse ADT\n\n`;
  md += `To import and activate this project in SAP S/4HANA 2023 (e.g. S21) using ABAP Development Tools (ADT):\n\n`;
  md += `1. **Database Tables:** Create and activate transparent table \`${architecture.rootEntity?.tableName}\``;
  if (architecture.draftDecision?.enabled) {
    md += ` and draft table \`${architecture.rootEntity?.draftTableName}\``;
  }
  md += `.\n`;
  md += `2. **Child Tables:** Create and activate any child persistence tables.\n`;
  md += `3. **Interface CDS Views:** Create and activate \`ZI_*\` view entities.\n`;
  md += `4. **Consumption CDS Views:** Create and activate \`ZC_*\` view entities.\n`;
  md += `5. **Metadata Extensions:** Create and activate \`*.mde\` metadata extensions.\n`;
  md += `6. **Access Control (DCL):** Create and activate DCL roles.\n`;
  md += `7. **Behavior Definition (BDEF):** Create and activate root and child behavior definitions.\n`;
  md += `8. **Behavior Class Implementation:** Create class \`BP_I_*\` and implement the generated \`TODO\` blocks.\n`;
  md += `9. **Service Definition (SRVD):** Create and activate \`ZUI_*\`.\n`;
  md += `10. **Service Binding (SRVB):** Publish the OData V4 UI service binding.\n\n`;

  md += `> [!IMPORTANT]\n`;
  md += `> FioriX does not perform automatic SAP deployment or activation. All objects must be imported via Git-enabled ABAP (abapGit) or created manually in Eclipse ADT under governance.\n`;

  return [
    createAbapArtifact({
      projectId: project.projectId,
      artifactType: ABAP_ARTIFACT_TYPES.ABAP_DOCUMENTATION,
      objectName: 'README_ABAP',
      filePath: 'README_ABAP.md',
      content: md,
      language: 'MARKDOWN',
      sourceEntityIds: project.dataModelSpec?.entities?.map((e) => e.entityId) || [],
      sourceRequirementIds: confirmedReqs.map((r) => r.requirementId)
    })
  ];
}
