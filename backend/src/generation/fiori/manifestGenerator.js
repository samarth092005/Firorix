/**
 * FioriX — GEN-06: SAP Fiori Elements Manifest Generator
 *
 * Generates webapp/manifest.json for OData V4 List Report & Object Page
 * strictly matching GEN-05 Service Definition and Binding specifications.
 */

import { createFioriArtifact, FIORI_ARTIFACT_TYPES, TARGET_UI5_VERSION_S4HANA2023 } from './fioriArtifactContract.js';

export function generateFioriManifest(project, architecture, uiConfig = {}) {
  const rootEntity = project.dataModelSpec?.entities?.find((e) => e.entityType === 'ROOT' || e.isRoot) || project.dataModelSpec?.entities?.[0];
  if (!rootEntity) return null;

  const prefix = (rootEntity.name || 'CUSTOM').replace(/[^a-zA-Z0-9_]/g, '').toLowerCase();
  const appId = uiConfig.appId || `com.fiorix.custom.${prefix}`;
  const serviceName = `ZUI_${prefix.toUpperCase()}`;
  const mainServiceUri = `/sap/opu/odata4/sap/${serviceName.toLowerCase()}/srvd/sap/${serviceName.toLowerCase()}/0001/`;

  const childEntities = (project.dataModelSpec?.entities || []).filter((e) => e.entityId !== rootEntity.entityId);

  const targetUi5Version = uiConfig.minUI5Version || TARGET_UI5_VERSION_S4HANA2023;

  const manifest = {
    _version: '1.58.0',
    'sap.app': {
      id: appId,
      type: 'application',
      i18n: 'i18n/i18n.properties',
      applicationVersion: {
        version: '1.0.0'
      },
      title: uiConfig.pageTitle || project.projectName || `${rootEntity.businessName || rootEntity.name} Application`,
      description: project.description || `Generated SAP Fiori Elements Modernization Application for S/4HANA 2023`,
      dataSources: {
        mainService: {
          uri: mainServiceUri,
          type: 'OData',
          settings: {
            annotations: ['annotation'],
            odataVersion: '4.0'
          }
        },
        annotation: {
          type: 'ODataAnnotation',
          uri: 'annotations/annotations.xml',
          settings: {
            localUri: 'annotations/annotations.xml'
          }
        }
      },
      sourceTemplate: {
        id: 'fiorix.fe.lrop.v4',
        version: '1.0.0'
      }
    },
    'sap.ui': {
      technology: 'UI5',
      icons: {
        icon: 'sap-icon://document'
      },
      deviceTypes: {
        desktop: true,
        tablet: true,
        phone: true
      }
    },
    'sap.ui5': {
      flexEnabled: true,
      dependencies: {
        minUI5Version: targetUi5Version,
        libs: {
          'sap.m': {},
          'sap.ui.core': {},
          'sap.fe.templates': {}
        }
      },
      contentDensities: {
        compact: true,
        cozy: true
      },
      models: {
        '': {
          dataSource: 'mainService',
          preload: true,
          settings: {
            synchronizationMode: 'None',
            operationMode: 'Server',
            autoExpandSelect: true,
            earlyRequests: true
          }
        },
        i18n: {
          type: 'sap.ui.model.resource.ResourceModel',
          settings: {
            bundleName: `${appId}.i18n.i18n`
          }
        }
      },
      resources: {
        css: []
      },
      routing: {
        config: {
          routerClass: 'sap.f.routing.Router',
          async: true
        },
        routes: [
          {
            pattern: ':?query:',
            name: `${rootEntity.name}ListReport`,
            target: `${rootEntity.name}ListReport`
          },
          {
            pattern: `${rootEntity.name}({${rootEntity.name}Key}):?query:`,
            name: `${rootEntity.name}ObjectPage`,
            target: `${rootEntity.name}ObjectPage`
          }
        ],
        targets: {
          [`${rootEntity.name}ListReport`]: {
            type: 'Component',
            id: `${rootEntity.name}ListReport`,
            name: 'sap.fe.templates.ListReport',
            options: {
              settings: {
                entitySet: rootEntity.name,
                initialLoad: 'Enabled',
                tableSettings: {
                  type: 'ResponsiveTable'
                },
                navigation: {
                  [rootEntity.name]: {
                    detail: {
                      route: `${rootEntity.name}ObjectPage`
                    }
                  }
                }
              }
            }
          },
          [`${rootEntity.name}ObjectPage`]: {
            type: 'Component',
            id: `${rootEntity.name}ObjectPage`,
            name: 'sap.fe.templates.ObjectPage',
            options: {
              settings: {
                entitySet: rootEntity.name,
                editableHeaderContent: false,
                navigation: Object.fromEntries(
                  childEntities.map((c) => [
                    `_${c.name}`,
                    { detail: { route: `${c.name}ObjectPage` } }
                  ])
                )
              }
            }
          }
        }
      }
    }
  };

  return createFioriArtifact({
    projectId: project.projectId,
    artifactType: FIORI_ARTIFACT_TYPES.FIORI_MANIFEST,
    objectName: 'manifest.json',
    filePath: 'webapp/manifest.json',
    content: JSON.stringify(manifest, null, 2),
    language: 'JSON',
    sourceEntityIds: [rootEntity.entityId],
    dependencies: [serviceName]
  });
}
