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

  const uiPrefs = {
    ...(project.requirementsSpec?.uiPreferences || {}),
    ...(uiConfig || {})
  };
  const floorplan = String(uiPrefs.floorplan || '').toUpperCase();
  const isWorklist = floorplan === 'WORKLIST';
  const isAnalytical = floorplan === 'ANALYTICAL_LIST_PAGE';
  const isOverviewPage = floorplan === 'OVERVIEW_PAGE';
  const isWizard = floorplan === 'FREESTYLE_WIZARD';
  const visibleCols = Array.isArray(uiPrefs.visibleColumns) && uiPrefs.visibleColumns.length > 0
    ? fields.filter((f) => uiPrefs.visibleColumns.includes(f.name))
    : fields.slice(0, 6);
  const displayFields = visibleCols.length > 0 ? visibleCols : fields.slice(0, 6);

  const columnsXml = displayFields.map((f) =>
    `          <Column><Text text="${f.label || f.name}" /></Column>`
  ).join('\n');
  const cellsXml = displayFields.map((f) =>
    `            <Text text="{${f.name}}" />`
  ).join('\n');

  const formInputsXml = displayFields.map((f) =>
    `              <Label text="${f.label || f.name}" />\n              <Input value="{/${rootEntity.name}/0/${f.name}}" placeholder="Enter ${f.label || f.name}" />`
  ).join('\n');

  let mainViewXml;
  if (isWorklist) {
    mainViewXml = `<mvc:View
  controllerName="${appId}.controller.Main"
  xmlns:mvc="sap.ui.core.mvc"
  xmlns="sap.m"
  displayBlock="true">
  <Page id="mainPage" title="${uiConfig.pageTitle || project.projectName || rootEntity.name} — Action Worklist">
    <content>
      <IconTabBar id="worklistTabs" select=".onRefresh" class="sapUiResponsiveContentPadding">
        <items>
          <IconTabFilter key="all" text="All Items" count="4" icon="sap-icon://list" />
          <IconTabFilter key="pending" text="Pending Action" count="2" icon="sap-icon://pending" iconColor="Critical" />
          <IconTabFilter key="approved" text="Processed" count="2" icon="sap-icon://accept" iconColor="Positive" />
        </items>
        <content>
          <Table id="itemsTable" mode="MultiSelect" items="{/${rootEntity.name}}" growing="true" growingThreshold="25">
            <headerToolbar>
              <OverflowToolbar>
                <Title text="${rootEntity.businessName || rootEntity.name} Action Queue" level="H2" />
                <ToolbarSpacer />
                <SearchField width="16rem" search=".onSearch" />
                <Button text="Bulk Approve" type="Emphasized" icon="sap-icon://accept" press=".onRefresh" />
                <Button text="Refresh" icon="sap-icon://refresh" press=".onRefresh" />
              </OverflowToolbar>
            </headerToolbar>
            <columns>
${columnsXml}
              <Column hAlign="End"><Text text="Decision" /></Column>
            </columns>
            <items>
              <ColumnListItem type="Navigation" press=".onItemPress">
                <cells>
${cellsXml}
                  <HBox justifyContent="End">
                    <Button text="Approve" type="Accept" press=".onRefresh" class="sapUiTinyMarginEnd" />
                    <Button text="Reject" type="Reject" press=".onRefresh" />
                  </HBox>
                </cells>
              </ColumnListItem>
            </items>
          </Table>
        </content>
      </IconTabBar>
    </content>
  </Page>
</mvc:View>
`;
  } else if (isAnalytical) {
    mainViewXml = `<mvc:View
  controllerName="${appId}.controller.Main"
  xmlns:mvc="sap.ui.core.mvc"
  xmlns="sap.m"
  displayBlock="true">
  <Page id="mainPage" title="${uiConfig.pageTitle || project.projectName || rootEntity.name} — KPI &amp; Analytics">
    <content>
      <VBox class="sapUiSmallMargin">
        <HBox wrap="Wrap" class="sapUiSmallMarginBottom">
          <GenericTile header="Total ${rootEntity.businessName || rootEntity.name}s" subheader="Period Volume" class="sapUiTinyMarginEnd sapUiTinyMarginBottom" press=".onRefresh">
            <TileContent><NumericContent value="4" indicator="Up" valueColor="Good" /></TileContent>
          </GenericTile>
          <GenericTile header="Open / Pending" subheader="Action Required" class="sapUiTinyMarginEnd sapUiTinyMarginBottom" press=".onRefresh">
            <TileContent><NumericContent value="2" valueColor="Critical" /></TileContent>
          </GenericTile>
          <GenericTile header="SLA Compliance" subheader="Clean Core Target" class="sapUiTinyMarginBottom">
            <TileContent><NumericContent value="96%" valueColor="Good" /></TileContent>
          </GenericTile>
        </HBox>
        <Panel headerText="Status Distribution Breakdown" expandable="true" expanded="true" class="sapUiSmallMarginBottom">
          <VBox class="sapUiSmallMargin">
            <Label text="Completed / Released (68%)" />
            <ProgressIndicator percentValue="68" displayValue="68% Released" state="Success" class="sapUiTinyMarginBottom" />
            <Label text="Pending Approval (24%)" />
            <ProgressIndicator percentValue="24" displayValue="24% Pending" state="Warning" class="sapUiTinyMarginBottom" />
            <Label text="Blocked / Exception (8%)" />
            <ProgressIndicator percentValue="8" displayValue="8% Blocked" state="Error" />
          </VBox>
        </Panel>
        <Table id="itemsTable" items="{/${rootEntity.name}}" growing="true" growingThreshold="25">
          <headerToolbar>
            <OverflowToolbar>
              <Title text="Analytical Drill-Down" level="H2" />
              <ToolbarSpacer />
              <SearchField width="16rem" search=".onSearch" />
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
      </VBox>
    </content>
  </Page>
</mvc:View>
`;
  } else if (isOverviewPage) {
    mainViewXml = `<mvc:View
  controllerName="${appId}.controller.Main"
  xmlns:mvc="sap.ui.core.mvc"
  xmlns="sap.m"
  displayBlock="true">
  <Page id="mainPage" title="${uiConfig.pageTitle || project.projectName || rootEntity.name} — Overview Cockpit">
    <content>
      <HBox wrap="Wrap" class="sapUiSmallMargin">
        <GenericTile header="Total ${rootEntity.businessName || rootEntity.name}s" subheader="Active Records" class="sapUiTinyMarginEnd sapUiTinyMarginBottom" press=".onRefresh">
          <TileContent><NumericContent value="4" indicator="Up" valueColor="Good" /></TileContent>
        </GenericTile>
        <GenericTile header="Pending Action" subheader="Requires Review" class="sapUiTinyMarginEnd sapUiTinyMarginBottom" press=".onRefresh">
          <TileContent><NumericContent value="2" valueColor="Critical" /></TileContent>
        </GenericTile>
        <GenericTile header="Clean Core Compliance" subheader="OData V4 Ready" class="sapUiTinyMarginBottom">
          <TileContent><NumericContent value="100%" valueColor="Good" /></TileContent>
        </GenericTile>
      </HBox>
      <Table id="itemsTable" items="{/${rootEntity.name}}" growing="true" growingThreshold="25" class="sapUiSmallMarginTop">
        <headerToolbar>
          <OverflowToolbar>
            <Title text="${rootEntity.businessName || rootEntity.name} Quick Queue" level="H2" />
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
  } else if (isWizard) {
    mainViewXml = `<mvc:View
  controllerName="${appId}.controller.Main"
  xmlns:mvc="sap.ui.core.mvc"
  xmlns="sap.m"
  xmlns:f="sap.ui.layout.form"
  displayBlock="true">
  <Page id="mainPage" title="${uiConfig.pageTitle || project.projectName || rootEntity.name} — Guided Entry">
    <content>
      <Wizard id="guidedWizard" complete=".onRefresh">
        <WizardStep id="stepGeneral" title="Step 1: ${rootEntity.businessName || rootEntity.name} Details" validated="true">
          <f:SimpleForm editable="true" layout="ResponsiveGridLayout">
            <f:content>
${formInputsXml}
            </f:content>
          </f:SimpleForm>
        </WizardStep>
        <WizardStep id="stepReview" title="Step 2: Review Records" validated="true">
          <Table id="itemsTable" items="{/${rootEntity.name}}" growing="true" growingThreshold="25">
            <headerToolbar>
              <OverflowToolbar>
                <Title text="Existing ${rootEntity.businessName || rootEntity.name} Records" level="H2" />
                <ToolbarSpacer />
                <SearchField width="16rem" search=".onSearch" />
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
        </WizardStep>
      </Wizard>
    </content>
  </Page>
</mvc:View>
`;
  } else {
    mainViewXml = `<mvc:View
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
  }

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

  const confirmedReqIds = (project.requirementsSpec?.items || [])
    .filter((r) => r.status === 'CONFIRMED')
    .map((r) => r.requirementId);

  return [
    createFioriArtifact({
      projectId: project.projectId,
      artifactType: FIORI_ARTIFACT_TYPES.FIORI_MANIFEST,
      objectName: 'manifest.json',
      filePath: 'webapp/manifest.json',
      content: JSON.stringify(manifest, null, 2),
      language: 'JSON',
      sourceEntityIds: [rootEntity.entityId],
      sourceRequirementIds: confirmedReqIds,
      dependencies: [serviceName]
    }),
    createFioriArtifact({
      projectId: project.projectId,
      artifactType: FIORI_ARTIFACT_TYPES.FIORI_DOCUMENTATION,
      objectName: 'Main.view.xml',
      filePath: 'webapp/view/Main.view.xml',
      content: mainViewXml,
      language: 'XML',
      sourceEntityIds: [rootEntity.entityId],
      sourceRequirementIds: confirmedReqIds
    }),
    createFioriArtifact({
      projectId: project.projectId,
      artifactType: FIORI_ARTIFACT_TYPES.FIORI_DOCUMENTATION,
      objectName: 'Main.controller.js',
      filePath: 'webapp/controller/Main.controller.js',
      content: mainControllerJs,
      language: 'JAVASCRIPT',
      sourceEntityIds: [rootEntity.entityId],
      sourceRequirementIds: confirmedReqIds
    })
  ];
}
