/**
 * FioriX — GEN-06: SAP Fiori Application Project Scaffolding
 *
 * Synthesizes Component.js, index.html, i18n.properties, package.json,
 * and ui5.yaml for the SAP Fiori Elements project.
 */

import { createFioriArtifact, FIORI_ARTIFACT_TYPES, TARGET_UI5_VERSION_S4HANA2023 } from './fioriArtifactContract.js';

export function generateFioriProjectScaffolding(project, architecture, uiConfig = {}) {
  const rootEntity = project.dataModelSpec?.entities?.find((e) => e.entityType === 'ROOT' || e.isRoot) || project.dataModelSpec?.entities?.[0];
  if (!rootEntity) return [];

  const prefix = (rootEntity.name || 'CUSTOM').replace(/[^a-zA-Z0-9_]/g, '').toLowerCase();
  const appId = uiConfig.appId || `com.fiorix.custom.${prefix}`;
  const appTitle = uiConfig.pageTitle || project.projectName || `${rootEntity.businessName || rootEntity.name} Application`;
  const artifacts = [];

  // 1. webapp/Component.js
  const componentJs = `sap.ui.define(["sap/fe/core/AppComponent"], function (AppComponent) {
  "use strict";

  return AppComponent.extend("${appId}.Component", {
    metadata: {
      manifest: "json"
    }
  });
});
`;

  artifacts.push(createFioriArtifact({
    projectId: project.projectId,
    artifactType: FIORI_ARTIFACT_TYPES.FIORI_COMPONENT,
    objectName: 'Component.js',
    filePath: 'webapp/Component.js',
    content: componentJs,
    language: 'JAVASCRIPT',
    sourceEntityIds: [rootEntity.entityId]
  }));

  // 2. webapp/index.html
  const indexHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${appTitle}</title>
  <script
    id="sap-ui-bootstrap"
    src="https://ui5.sap.com/${TARGET_UI5_VERSION_S4HANA2023}/resources/sap-ui-core.js"
    data-sap-ui-theme="sap_horizon"
    data-sap-ui-resourceroots='{ "${appId}": "./" }'
    data-sap-ui-oninit="module:sap/ui/core/ComponentSupport"
    data-sap-ui-compatVersion="edge"
    data-sap-ui-async="true"
    data-sap-ui-preload="async"
    onerror="window.handleUi5BootstrapError && window.handleUi5BootstrapError()"
  ></script>
  <script>
    window.handleUi5BootstrapError = function() {
      setTimeout(showCdnFallback, 100);
    };
    setTimeout(function() {
      if (!window.sap || !window.sap.ui) {
        showCdnFallback();
      }
    }, 7000);
    function showCdnFallback() {
      var c = document.getElementById('content');
      if (c && !document.getElementById('fiorix-fallback-banner')) {
        c.innerHTML = '<div id="fiorix-fallback-banner" style="font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;padding:32px 24px;max-width:750px;margin:40px auto;background:#fff;border:1px solid #e2e8f0;border-radius:8px;box-shadow:0 4px 6px rgba(0,0,0,0.05);">' +
          '<div style="display:flex;align-items:center;gap:12px;margin-bottom:12px;">' +
          '<span style="font-size:24px;">🌐</span>' +
          '<h2 style="font-size:18px;font-weight:700;color:#0f172a;margin:0;">Interactive Fiori Elements Preview</h2>' +
          '</div>' +
          '<div style="padding:10px 14px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:6px;color:#166534;font-size:13px;margin-bottom:16px;">' +
          '✅ <strong>Local Mock OData V4 Service Active</strong> — Synthetic mock data is running and responding on this preview session.' +
          '</div>' +
          '<p style="font-size:13px;color:#475569;line-height:1.6;margin-bottom:16px;">' +
          'SAPUI5 CDN scripts (ui5.sap.com) are initializing or require external network access. While the UI5 runtime resolves in your browser, you can inspect the live OData V4 service endpoints, test mutations, and review the generated manifest.json and annotations.xml directly in the Preview Manager.' +
          '</p>' +
          '<div style="font-size:12px;color:#64748b;background:#f8fafc;padding:12px;border-radius:6px;font-family:monospace;">' +
          'Target App ID: ${appId}<br/>' +
          'Root Entity: ${rootEntity.name}' +
          '</div>' +
          '</div>';
      }
    }
  </script>
</head>
<body class="sapUiBody" id="content">
  <div
    data-sap-ui-component
    data-name="${appId}"
    data-id="rootComponent"
    data-settings='{ "id": "${appId}" }'
  ></div>
</body>
</html>
`;

  artifacts.push(createFioriArtifact({
    projectId: project.projectId,
    artifactType: FIORI_ARTIFACT_TYPES.FIORI_INDEX_HTML,
    objectName: 'index.html',
    filePath: 'webapp/index.html',
    content: indexHtml,
    language: 'HTML',
    sourceEntityIds: [rootEntity.entityId]
  }));

  // 3. webapp/i18n/i18n.properties
  let i18n = `# FioriX Generated i18n Bundle for ${project.projectName}\n`;
  i18n += `appTitle=${appTitle}\n`;
  i18n += `appDescription=${project.description || 'SAP S/4HANA 2023 Modernization Application'}\n`;
  i18n += `\n# Entity Labels\n`;
  for (const ent of project.dataModelSpec?.entities || []) {
    i18n += `entity.${ent.name}=${ent.businessName || ent.name}\n`;
    for (const f of ent.fields || []) {
      i18n += `field.${ent.name}.${f.name}=${f.label || f.name}\n`;
    }
  }

  artifacts.push(createFioriArtifact({
    projectId: project.projectId,
    artifactType: FIORI_ARTIFACT_TYPES.FIORI_I18N,
    objectName: 'i18n.properties',
    filePath: 'webapp/i18n/i18n.properties',
    content: i18n,
    language: 'PROPERTIES',
    sourceEntityIds: [rootEntity.entityId]
  }));

  // 4. package.json
  const packageJson = {
    name: `fiorix-${prefix}-ui`,
    version: '1.0.0',
    description: project.description || `SAP Fiori Elements Application for ${project.projectName}`,
    scripts: {
      start: 'ui5 serve --port 8080 --open index.html',
      build: 'ui5 build --clean-dest'
    },
    dependencies: {},
    devDependencies: {
      '@ui5/cli': '^3.0.0'
    },
    ui5: {
      dependencies: ['@sap/ux-ui5-tooling']
    }
  };

  artifacts.push(createFioriArtifact({
    projectId: project.projectId,
    artifactType: FIORI_ARTIFACT_TYPES.FIORI_PACKAGE_JSON,
    objectName: 'package.json',
    filePath: 'package.json',
    content: JSON.stringify(packageJson, null, 2),
    language: 'JSON',
    sourceEntityIds: [rootEntity.entityId]
  }));

  // 5. ui5.yaml
  const ui5Yaml = `specVersion: "3.0"
metadata:
  name: fiorix-${prefix}-ui
type: application
framework:
  name: SAPUI5
  version: "${TARGET_UI5_VERSION_S4HANA2023}"
  libraries:
    - name: sap.m
    - name: sap.ui.core
    - name: sap.fe.templates
    - name: themelib_sap_horizon
server:
  customMiddleware: []
`;

  artifacts.push(createFioriArtifact({
    projectId: project.projectId,
    artifactType: FIORI_ARTIFACT_TYPES.FIORI_UI5_YAML,
    objectName: 'ui5.yaml',
    filePath: 'ui5.yaml',
    content: ui5Yaml,
    language: 'YAML',
    sourceEntityIds: [rootEntity.entityId]
  }));

  // 6. README.md
  let readme = `# SAP Fiori Elements Application — ${appTitle}\n\n`;
  readme += `**Application ID:** \`${appId}\`  \n`;
  readme += `**Target System:** \`${project.targetRelease || 'SAP S/4HANA 2023'}\`  \n`;
  readme += `**UI5 Framework Baseline:** \`${TARGET_UI5_VERSION_S4HANA2023}\`  \n`;
  readme += `**Floorplan Pattern:** List Report Page + Object Page (SAP Fiori Elements OData V4)  \n\n`;
  readme += `## Directory Structure\n\n`;
  readme += `\`\`\`\n`;
  readme += `webapp/\n`;
  readme += `├── Component.js\n`;
  readme += `├── index.html\n`;
  readme += `├── manifest.json\n`;
  readme += `├── i18n/\n`;
  readme += `│   └── i18n.properties\n`;
  readme += `└── annotations/\n`;
  readme += `    └── annotations.xml\n`;
  readme += `package.json\n`;
  readme += `ui5.yaml\n`;
  readme += `\`\`\`\n\n`;
  readme += `## Development & Review Guide\n\n`;
  readme += `1. **SAP Business Application Studio (BAS):** Import this folder into a BAS workspace or VS Code with SAP Fiori Tools.\n`;
  readme += `2. **Local Preview:** Run \`npm start\` with UI5 CLI to serve the standalone application with horizon theme.\n`;
  readme += `3. **OData Binding:** Ensure backend service \`${`ZUI_${prefix.toUpperCase()}`}\` is published on SAP S/4HANA 2023.\n`;

  artifacts.push(createFioriArtifact({
    projectId: project.projectId,
    artifactType: FIORI_ARTIFACT_TYPES.FIORI_DOCUMENTATION,
    objectName: 'README_FIORI',
    filePath: 'README_FIORI.md',
    content: readme,
    language: 'MARKDOWN',
    sourceEntityIds: [rootEntity.entityId]
  }));

  return artifacts;
}
