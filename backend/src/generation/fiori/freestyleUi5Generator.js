/**
 * Fiorify — GEN-06: Freestyle SAPUI5 Generator (Optional Alternative to Fiori Elements)
 *
 * Generates XML View, Controller, and Manifest for complex T-code replacements
 * requiring custom split-screen, tree tables, or bespoke UI5 logic.
 */

import { createFioriArtifact, FIORI_ARTIFACT_TYPES, TARGET_UI5_VERSION_S4HANA2023 } from './fioriArtifactContract.js';
import { formatCdsViewName } from '../abap/cdsViewEntityGenerator.js';

export function generateFreestyleUi5Artifacts(project, architecture, uiConfig = {}) {
  const rootEntity = project.dataModelSpec?.entities?.find((e) => e.entityType === 'ROOT' || e.isRoot) || project.dataModelSpec?.entities?.[0];
  if (!rootEntity) return [];

  const cleanName = (rootEntity.name || 'CUSTOM').replace(/[^a-zA-Z0-9_]/g, '');
  const prefix = cleanName.toLowerCase();
  const appId = uiConfig.appId || `com.fiorify.freestyle.${prefix}`;
  const serviceName = formatCdsViewName('ZUI_', cleanName).toUpperCase();
  const fields = rootEntity.fields || [];

  const columnsXml = fields.slice(0, 6).map((f) =>
    `          <Column><Text text="${f.label || f.name}" /></Column>`
  ).join('\n');
  const cellsXml = fields.slice(0, 6).map((f) =>
    `            <Text text="{${f.name}}" />`
  ).join('\n');

  const mainViewXml = `<mvc:View
  controllerName="${appId}.controller.Main"
  xmlns:mvc="sap.ui.core.mvc"
  xmlns="sap.m"
  displayBlock="true">
  <Page id="mainPage" title="${uiConfig.pageTitle || project.projectName || rootEntity.name}">
    <content>
      <Table id="itemsTable" items="{/${rootEntity.name}}" growing="true" growingThreshold="25">
        <headerToolbar>
          <OverflowToolbar>
            <Title text="${rootEntity.businessName || rootEntity.name}" level="H2" />
            <ToolbarSpacer />
            <SearchField width="18rem" search=".onSearch" />
            <Button text="Refresh" icon="sap-icon://refresh" press=".onRefresh" />
          </OverflowToolbar>
        </headerToolbar>
        <columns>
${columnsXml}
        </columns>
        <items>
          <ColumnListItem type="Navigation" press=".onItemPress">
            <cells>
${cellsXml}
            </cells>
          </ColumnListItem>
        </items>
      </Table>
    </content>
  </Page>
</mvc:View>
`;

  const mainControllerJs = `sap.ui.define([
  "sap/ui/core/mvc/Controller",
  "sap/ui/model/Filter",
  "sap/ui/model/FilterOperator",
  "sap/m/MessageToast"
], function (Controller, Filter, FilterOperator, MessageToast) {
  "use strict";

  return Controller.extend("${appId}.controller.Main", {
    onInit: function () {},

    onSearch: function (oEvent) {
      var sQuery = oEvent.getParameter("query") || "";
      var oTable = this.byId("itemsTable");
      var oBinding = oTable && oTable.getBinding("items");
      if (!oBinding) return;
      var sKeyField = "${fields[0]?.name || 'ID'}";
      oBinding.filter(sQuery ? [new Filter(sKeyField, FilterOperator.Contains, sQuery)] : []);
    },

    onRefresh: function () {
      var oModel = this.getView().getModel();
      if (oModel && oModel.refresh) oModel.refresh();
      MessageToast.show("Data refreshed");
    },

    onItemPress: function (oEvent) {
      var oCtx = oEvent.getSource().getBindingContext();
      if (oCtx) {
        MessageToast.show("Selected: " + oCtx.getPath());
      }
    }
  });
});
`;

  const manifest = {
    _version: '1.58.0',
    'sap.app': {
      id: appId,
      type: 'application',
      i18n: 'i18n/i18n.properties',
      applicationVersion: { version: '1.0.0' },
      title: uiConfig.pageTitle || project.projectName || rootEntity.name,
      dataSources: {
        mainService: {
          uri: `/sap/opu/odata4/sap/${serviceName.toLowerCase()}/srvd/sap/${serviceName.toLowerCase()}/0001/`,
          type: 'OData',
          settings: { odataVersion: '4.0' }
        }
      }
    },
    'sap.ui': { technology: 'UI5', deviceTypes: { desktop: true, tablet: true, phone: true } },
    'sap.ui5': {
      rootView: { viewName: `${appId}.view.Main`, type: 'XML', async: true, id: 'app' },
      dependencies: {
        minUI5Version: TARGET_UI5_VERSION_S4HANA2023,
        libs: { 'sap.m': {}, 'sap.ui.core': {} }
      },
      models: {
        '': { dataSource: 'mainService', preload: true, settings: { operationMode: 'Server' } }
      }
    }
  };

  return [
    createFioriArtifact({
      projectId: project.projectId,
      artifactType: FIORI_ARTIFACT_TYPES.FIORI_MANIFEST,
      objectName: 'manifest.json',
      filePath: 'webapp/manifest.json',
      content: JSON.stringify(manifest, null, 2),
      language: 'JSON',
      sourceEntityIds: [rootEntity.entityId],
      dependencies: [serviceName]
    }),
    createFioriArtifact({
      projectId: project.projectId,
      artifactType: FIORI_ARTIFACT_TYPES.FIORI_DOCUMENTATION,
      objectName: 'Main.view.xml',
      filePath: 'webapp/view/Main.view.xml',
      content: mainViewXml,
      language: 'XML',
      sourceEntityIds: [rootEntity.entityId]
    }),
    createFioriArtifact({
      projectId: project.projectId,
      artifactType: FIORI_ARTIFACT_TYPES.FIORI_DOCUMENTATION,
      objectName: 'Main.controller.js',
      filePath: 'webapp/controller/Main.controller.js',
      content: mainControllerJs,
      language: 'JAVASCRIPT',
      sourceEntityIds: [rootEntity.entityId]
    })
  ];
}
