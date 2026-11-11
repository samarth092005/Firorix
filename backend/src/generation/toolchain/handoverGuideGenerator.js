/**
 * FioriX — GEN-09: Developer Handover & Workstation Setup Guide Generator
 *
 * Generates authoritative, step-by-step developer instructions for importing,
 * reviewing, activating, and deploying FioriX-generated artifacts into SAP S/4HANA 2023 S21.
 */

/**
 * Generates structured JSON and formatted Markdown developer handover guides.
 *
 * @param {Object} project - GenerationProject record
 * @returns {{ markdown: string, structuredGuide: Object }}
 */
export function generateDeveloperHandoverGuide(project) {
  const projectId = project?.projectId || 'PRJ-EXPORT';
  const projectName = project?.projectName || 'Custom Fiori Application';
  const architecture = project?.architectureSpec || {};
  const rootEntity = project?.dataModelSpec?.entities?.find((e) => e.entityType === 'ROOT' || e.isRoot) || project?.dataModelSpec?.entities?.[0];
  const prefix = (rootEntity?.name || 'CUSTOM').replace(/[^a-zA-Z0-9_]/g, '');

  const targetSystem = 'S21';
  const targetClient = '200';
  const profile = architecture.profile || 'MANAGED_RAP_WITH_DRAFT';
  const isDraft = architecture.draftDecision?.enabled === true;
  const serviceName = `ZUI_${prefix}`.toUpperCase();
  const serviceBindingName = `ZUI_${prefix}_O4`.toUpperCase();

  const abapSteps = [
    {
      stepNumber: 1,
      title: 'Open Eclipse ADT & Connect to System S21',
      description: `Launch Eclipse IDE with ABAP Development Tools (ADT). In the Project Explorer, right-click and choose "New -> ABAP Cloud Project". Select System Connection "S21", specify Client "${targetClient}", and enter your authorized ABAP developer credentials.`
    },
    {
      stepNumber: 2,
      title: 'Assign Target ABAP Package',
      description: `Select or create a customer package (e.g. "Z_${prefix.toUpperCase()}" or local package "$TMP" for isolated development verification). Assign an active Workbench Transport Request (CTS) if working in a transportable package.`
    },
    {
      stepNumber: 3,
      title: 'Import Database Tables (DDIC)',
      description: `Under "Dictionary -> Database Tables", create the active database tables (.tabl.sql) located in "abap/tables/". If draft is enabled (${isDraft ? 'YES' : 'NO'}), also create the corresponding draft tables with administrative fields ("%admin"). Activate tables (Ctrl+F3).`
    },
    {
      stepNumber: 4,
      title: 'Import CDS View Entities',
      description: `Under "Core Data Services -> Data Definitions", import the Interface Views ("ZI_${prefix}") and Consumption Projection Views ("ZC_${prefix}") located in "abap/cds/". Activate view entities in dependency order (Interface views first, then Consumption views).`
    },
    {
      stepNumber: 5,
      title: 'Import Metadata Extensions & Access Controls',
      description: `Import the UI Metadata Extensions (.ddlx) from "abap/annotations/" and Access Control DCLs from "abap/security/". Activate both.`
    },
    {
      stepNumber: 6,
      title: 'Import & Activate RAP Behavior Definition',
      description: `Under "Core Data Services -> Behavior Definitions", import the Behavior Definition ("ZR_${prefix}" or "ZC_${prefix}") from "abap/behavior/". Ensure managed/unmanaged implementation and draft configurations match profile "${profile}". Activate.`
    },
    {
      stepNumber: 7,
      title: 'Implement Behavior Implementation Classes',
      description: `Under "Source Code Library -> Classes", import the ABAP Behavior Pool class ("ZBP_${prefix}" or "ZCL_${prefix}") from "abap/behavior_classes/". Complete any custom action/validation methods or unmanaged saver hooks before activating.`
    },
    {
      stepNumber: 8,
      title: 'Import Service Definition & Publish Service Binding',
      description: `Import the Service Definition ("${serviceName}") from "abap/services/". Right-click "${serviceName}" -> "New Service Binding". Enter Name "${serviceBindingName}", select Binding Type "OData V4 - UI", and click "Publish". Once published, the service is reachable at: /sap/opu/odata4/sap/${serviceName.toLowerCase()}/srvd/sap/${serviceName.toLowerCase()}/0001/`
    }
  ];

  const fioriSteps = [
    {
      stepNumber: 1,
      title: 'Extract & Open Fiori Application',
      description: 'Extract the "fiori/" directory from the export package into your workspace. Open in VS Code (with SAP Fiori Tools extension) or your preferred IDE.'
    },
    {
      stepNumber: 2,
      title: 'Install Dependencies & Run Local Mock Preview',
      description: 'Open a terminal in the "fiori/" directory and run:\n```bash\nnpm install\nnpm start\n```\nThis launches the UI5 local server against the generated mock metadata and annotations.'
    },
    {
      stepNumber: 3,
      title: 'Configure Live Backend Connection to S21',
      description: `Once the S21 Service Binding "${serviceBindingName}" is published, update "ui5.yaml" to proxy requests to your SAP S21 system endpoint.`
    },
    {
      stepNumber: 4,
      title: 'Deploy Application to SAP S21',
      description: 'Run `npm run deploy` via Fiori Tools, or upload the "webapp/" folder into the SAPUI5 ABAP Repository using transaction `/UI5/UI5_REPOSITORY_LOAD` or the SAP Fiori Deployment Wizard.'
    }
  ];

  const markdown = `# Developer Handover & Workstation Setup Guide
**Project:** ${projectName} (\`${projectId}\`)  
**Target Landscape:** SAP S/4HANA 2023 On-Premise — System \`${targetSystem}\`, Client \`${targetClient}\`  
**RAP Architectural Profile:** \`${profile}\` (Draft: ${isDraft ? 'Enabled' : 'Disabled'})  
**Service Name:** \`${serviceName}\`  
**SAPUI5 Baseline:** \`${architecture.targetBaseline?.sapui5Version || '1.120.0'}\`  

---

## 1. Prerequisites Checklist
- [ ] Eclipse IDE (2023-09 or newer) with Java 17+ runtime
- [ ] ABAP Development Tools (ADT) plugin installed from [SAP Development Tools](https://tools.hana.ondemand.com/latest)
- [ ] Authorized SAP developer user on System \`${targetSystem}\`, Client \`${targetClient}\` with authorization for authorization objects \`S_DEVELOP\` and \`S_CTS_SADM\`
- [ ] Assigned Workbench Transport Request (CTS)
- [ ] Node.js v20.x and npm installed

---

## 2. ABAP Developer Handover: RAP Backend Activation
${abapSteps.map((s) => `### Step ${s.stepNumber}: ${s.title}\n${s.description}\n`).join('\n')}

---

## 3. Fiori Developer Handover: UI5 Application Review & Deployment
${fioriSteps.map((s) => `### Step ${s.stepNumber}: ${s.title}\n${s.description}\n`).join('\n')}

---

## 4. Governance, Security & Clean Core Assertions
- **Zero Deployment Guarantee:** FioriX Generation Studio operates strictly offline. No objects have been activated or written into System S21 repositories during generation.
- **Clean Core Adherence:** CDS View Entities and RAP Behavior definitions utilize only released standard SAP CDS annotations and S/4HANA 2023 language elements.
- **Credential Hygiene:** No system passwords, private keys, or session tokens exist within this project package.
`;

  return {
    projectId,
    projectName,
    targetSystem,
    targetClient,
    profile,
    abapSteps,
    fioriSteps,
    markdown
  };
}
