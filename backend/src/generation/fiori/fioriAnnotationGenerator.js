/**
 * Fiorify — GEN-06: SAP Fiori Elements XML Annotation Generator
 *
 * Generates webapp/annotations/annotations.xml for OData V4 client-side
 * UI vocabulary enrichment matching GEN-05 CDS views.
 */

import { createFioriArtifact, FIORI_ARTIFACT_TYPES } from './fioriArtifactContract.js';

export function generateFioriAnnotationsXml(project, architecture, uiConfig = {}) {
  const rootEntity = project.dataModelSpec?.entities?.find((e) => e.entityType === 'ROOT' || e.isRoot) || project.dataModelSpec?.entities?.[0];
  if (!rootEntity) return null;

  const prefix = (rootEntity.name || 'CUSTOM').replace(/[^a-zA-Z0-9_]/g, '');
  const serviceName = `ZUI_${prefix}`.toUpperCase();
  const rootProjName = `ZC_${prefix}`;
  const fields = rootEntity.fields || [];

  let xml = `<?xml version="1.0" encoding="utf-8"?>\n`;
  xml += `<edmx:Edmx xmlns:edmx="http://docs.oasis-open.org/odata/ns/edmx" Version="4.0">\n`;
  xml += `  <edmx:Reference Uri="https://sap.github.io/odata-vocabularies/vocabularies/Common.xml">\n`;
  xml += `    <edmx:Include Namespace="com.sap.vocabularies.Common.v1" Alias="Common"/>\n`;
  xml += `  </edmx:Reference>\n`;
  xml += `  <edmx:Reference Uri="https://sap.github.io/odata-vocabularies/vocabularies/UI.xml">\n`;
  xml += `    <edmx:Include Namespace="com.sap.vocabularies.UI.v1" Alias="UI"/>\n`;
  xml += `  </edmx:Reference>\n`;
  xml += `  <edmx:DataServices>\n`;
  xml += `    <Schema xmlns="http://docs.oasis-open.org/odata/ns/edm" Namespace="${serviceName}.annotations">\n`;
  xml += `      <Annotations Target="${serviceName}.${rootProjName}">\n`;

  // UI.HeaderInfo
  xml += `        <Annotation Term="UI.HeaderInfo">\n`;
  xml += `          <Record Type="UI.HeaderInfoType">\n`;
  xml += `            <PropertyValue Property="TypeName" String="${rootEntity.businessName || rootEntity.name}"/>\n`;
  xml += `            <PropertyValue Property="TypeNamePlural" String="${rootEntity.businessName || rootEntity.name}s"/>\n`;
  const titleField = fields.find((f) => f.semanticRole === 'DOCUMENT_NUMBER' || f.isKey)?.name || fields[0]?.name || 'ID';
  xml += `            <PropertyValue Property="Title">\n`;
  xml += `              <Record Type="UI.DataField">\n`;
  xml += `                <PropertyValue Property="Value" Path="${titleField}"/>\n`;
  xml += `              </Record>\n`;
  xml += `            </PropertyValue>\n`;
  xml += `          </Record>\n`;
  xml += `        </Annotation>\n\n`;

  // UI.SelectionFields
  xml += `        <Annotation Term="UI.SelectionFields">\n`;
  xml += `          <Collection>\n`;
  const filterFields = fields.filter((f) => f.semanticRole === 'DOCUMENT_NUMBER' || f.isKey || f.semanticRole === 'STATUS').slice(0, 4);
  for (const ff of (filterFields.length > 0 ? filterFields : fields.slice(0, 2))) {
    xml += `            <PropertyPath>${ff.name}</PropertyPath>\n`;
  }
  xml += `          </Collection>\n`;
  xml += `        </Annotation>\n\n`;

  // UI.LineItem
  xml += `        <Annotation Term="UI.LineItem">\n`;
  xml += `          <Collection>\n`;
  for (const f of fields) {
    xml += `            <Record Type="UI.DataField">\n`;
    xml += `              <PropertyValue Property="Value" Path="${f.name}"/>\n`;
    xml += `              <PropertyValue Property="Label" String="${f.label || f.name}"/>\n`;
    xml += `            </Record>\n`;
  }
  xml += `          </Collection>\n`;
  xml += `        </Annotation>\n\n`;

  // UI.Facets
  xml += `        <Annotation Term="UI.Facets">\n`;
  xml += `          <Collection>\n`;
  xml += `            <Record Type="UI.ReferenceFacet">\n`;
  xml += `              <PropertyValue Property="ID" String="GeneralInfoFacet"/>\n`;
  xml += `              <PropertyValue Property="Label" String="General Information"/>\n`;
  xml += `              <PropertyValue Property="Target" AnnotationPath="@UI.FieldGroup#GeneralInformation"/>\n`;
  xml += `            </Record>\n`;
  xml += `          </Collection>\n`;
  xml += `        </Annotation>\n\n`;

  // UI.FieldGroup#GeneralInformation
  xml += `        <Annotation Term="UI.FieldGroup" Qualifier="GeneralInformation">\n`;
  xml += `          <Record Type="UI.FieldGroupType">\n`;
  xml += `            <PropertyValue Property="Data">\n`;
  xml += `              <Collection>\n`;
  for (const f of fields) {
    xml += `                <Record Type="UI.DataField">\n`;
    xml += `                  <PropertyValue Property="Value" Path="${f.name}"/>\n`;
    xml += `                  <PropertyValue Property="Label" String="${f.label || f.name}"/>\n`;
    xml += `                </Record>\n`;
  }
  xml += `              </Collection>\n`;
  xml += `            </PropertyValue>\n`;
  xml += `          </Record>\n`;
  xml += `        </Annotation>\n`;

  xml += `      </Annotations>\n`;
  xml += `    </Schema>\n`;
  xml += `  </edmx:DataServices>\n`;
  xml += `</edmx:Edmx>\n`;

  return createFioriArtifact({
    projectId: project.projectId,
    artifactType: FIORI_ARTIFACT_TYPES.FIORI_ANNOTATIONS_XML,
    objectName: 'annotations.xml',
    filePath: 'webapp/annotations/annotations.xml',
    content: xml,
    language: 'XML',
    sourceEntityIds: [rootEntity.entityId],
    dependencies: [serviceName]
  });
}
