/**
 * FioriX — GEN-09: Workstation & Developer Toolchain Scanner
 *
 * Implements read-only, non-invasive detection of developer tools, runtimes,
 * and Eclipse ADT environments for S/4HANA 2023 development.
 *
 * Strict Compliance:
 * - Read-only inspection only (never modifies environment or installs software)
 * - Safe process execution with short timeouts
 * - Windows-first path discovery with cross-platform fallback
 */

import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import net from 'node:net';

/**
 * Safely executes a command and returns the trimmed stdout, or null on error.
 */
function safeExec(command, timeoutMs = 2500) {
  try {
    return execSync(command, {
      encoding: 'utf-8',
      timeout: timeoutMs,
      stdio: ['pipe', 'pipe', 'pipe'],
      windowsHide: true
    }).trim();
  } catch (err) {
    return null;
  }
}

/**
 * Checks if a TCP port is currently free on 127.0.0.1.
 */
function checkPortFree(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once('error', () => resolve(false));
    server.once('listening', () => {
      server.close(() => resolve(true));
    });
    server.listen(port, '127.0.0.1');
  });
}

export class ToolchainScanner {
  /**
   * Performs an end-to-end environment readiness scan.
   *
   * @returns {Promise<Object>} Scan result report
   */
  async scanEnvironment() {
    const tools = {};
    const recommendations = [];

    // 1. Node.js Check
    const nodeVersion = process.version;
    const nodeMajor = parseInt(nodeVersion.slice(1).split('.')[0], 10);
    const nodeOk = nodeMajor >= 20;
    tools.node = {
      name: 'Node.js Runtime',
      detected: true,
      version: nodeVersion,
      path: process.execPath,
      status: nodeOk ? 'READY' : 'UPGRADE_RECOMMENDED',
      details: nodeOk
        ? `Node.js ${nodeVersion} meets modern FioriX/UI5 baseline (>= v20.x).`
        : `Node.js ${nodeVersion} is below recommended v20.x.`
    };
    if (!nodeOk) {
      recommendations.push('Upgrade Node.js to v20 LTS or later from https://nodejs.org/');
    }

    // 2. npm Check
    const npmVersion = safeExec('npm --version');
    tools.npm = {
      name: 'npm Package Manager',
      detected: !!npmVersion,
      version: npmVersion || 'Not found',
      status: npmVersion ? 'READY' : 'ACTION_REQUIRED',
      details: npmVersion ? `npm ${npmVersion} available.` : 'npm command not accessible in PATH.'
    };

    // 3. Git Check
    const gitOutput = safeExec('git --version');
    tools.git = {
      name: 'Git Version Control',
      detected: !!gitOutput,
      version: gitOutput ? gitOutput.replace(/^git version\s*/i, '') : 'Not found',
      status: gitOutput ? 'READY' : 'OPTIONAL',
      details: gitOutput || 'Git not found on PATH. Recommended for ABAP git and project versioning.'
    };

    // 4. Java JDK / JRE Check (Required for Eclipse ADT)
    let javaVersion = safeExec('java -version 2>&1');
    if (!javaVersion && process.env.JAVA_HOME) {
      const javaBin = path.join(process.env.JAVA_HOME, 'bin', 'java');
      javaVersion = safeExec(`"${javaBin}" -version 2>&1`);
    }

    let javaParsed = null;
    if (javaVersion) {
      const match = javaVersion.match(/(?:java|openjdk) version "([^"]+)"|version "([^"]+)"/i);
      javaParsed = match ? (match[1] || match[2]) : javaVersion.split('\n')[0];
    }

    const javaOk = !!javaVersion;
    tools.java = {
      name: 'Java Development Kit (JDK)',
      detected: javaOk,
      version: javaParsed || (javaOk ? 'Detected' : 'Not found'),
      javaHome: process.env.JAVA_HOME || null,
      status: javaOk ? 'READY' : 'ACTION_REQUIRED',
      details: javaOk
        ? `Java runtime detected (${javaParsed || 'active'}). Required for Eclipse ADT.`
        : 'Java runtime not detected. Java 17 or 21 is required to run Eclipse ADT.'
    };
    if (!javaOk) {
      recommendations.push('Install Eclipse Temurin JDK 17 or 21 from https://adoptium.net/ for Eclipse ADT.');
    }

    // 5. Eclipse IDE & ADT Plugin Check
    const eclipseInfo = this._scanEclipseAndAdt();
    tools.eclipse = eclipseInfo.eclipse;
    tools.adt = eclipseInfo.adt;
    if (!eclipseInfo.eclipse.detected) {
      recommendations.push('Install Eclipse IDE for Java or C/C++ Developers from https://www.eclipse.org/downloads/');
    } else if (!eclipseInfo.adt.detected) {
      recommendations.push('Install ABAP Development Tools (ADT) in Eclipse via Help -> Install New Software -> https://tools.hana.ondemand.com/latest');
    }

    // 6. SAP GUI for Windows Check
    const sapGuiInfo = this._scanSapGui();
    tools.sapGui = sapGuiInfo;
    if (!sapGuiInfo.detected) {
      recommendations.push('SAP GUI for Windows is optional but recommended for classic transactions and SAP Logon connections.');
    }

    // 7. UI5 CLI / Fiori Tooling Check
    const ui5Version = safeExec('ui5 --version');
    tools.ui5Cli = {
      name: 'SAP UI5 CLI (@ui5/cli)',
      detected: !!ui5Version,
      version: ui5Version || 'Not globally installed (npx available)',
      status: ui5Version ? 'READY' : 'READY',
      details: ui5Version
        ? `UI5 CLI version ${ui5Version} detected.`
        : 'UI5 CLI is not globally installed; local npx @ui5/cli in generated fiori apps will be used.'
    };

    // 8. Port Status Scan (4004, 4050, 4051, 5173)
    const portChecks = await Promise.all([
      checkPortFree(4004).then((free) => ({ port: 4004, service: 'FioriX Backend', free })),
      checkPortFree(5173).then((free) => ({ port: 5173, service: 'FioriX Frontend (Vite)', free })),
      checkPortFree(4050).then((free) => ({ port: 4050, service: 'Local Preview Default', free })),
      checkPortFree(4051).then((free) => ({ port: 4051, service: 'Local Preview Alternate', free }))
    ]);

    // Overall Readiness Determination
    let overallStatus = 'READY';
    const criticalMissing = !tools.node.detected || (tools.java.status === 'ACTION_REQUIRED');
    const adtMissing = !tools.adt.detected;

    if (criticalMissing) {
      overallStatus = 'ACTION_REQUIRED';
    } else if (adtMissing) {
      overallStatus = 'PARTIALLY_READY';
    }

    return {
      timestamp: new Date().toISOString(),
      overallStatus,
      targetSystem: {
        systemId: 'S21',
        client: '200',
        release: 'SAP S/4HANA 2023 FPS01',
        sapBasis: '7.58',
        sapUi: '7.58'
      },
      tools,
      ports: portChecks,
      recommendations
    };
  }

  /**
   * Discovers Eclipse IDE and scans for installed ADT plugins.
   */
  _scanEclipseAndAdt() {
    const candidateDirs = [];

    if (process.platform === 'win32') {
      const userHome = process.env.USERPROFILE || '';
      const localAppData = process.env.LOCALAPPDATA || '';
      const progFiles = process.env.ProgramFiles || 'C:\\Program Files';
      const progFilesX86 = process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)';

      candidateDirs.push(
        path.join(userHome, 'eclipse'),
        path.join(localAppData, 'Programs', 'Eclipse'),
        path.join(progFiles, 'Eclipse'),
        path.join(progFilesX86, 'Eclipse')
      );

      // Also check standard eclipse-installer paths
      const installerFolder = path.join(userHome, '.p2', 'pool');
      if (fs.existsSync(installerFolder)) candidateDirs.push(installerFolder);
    }

    let foundEclipseDir = null;
    let eclipseVersion = null;
    let adtFound = false;
    let adtVersion = null;

    for (const baseDir of candidateDirs) {
      if (!fs.existsSync(baseDir)) continue;

      try {
        const entries = fs.readdirSync(baseDir, { withFileTypes: true });
        for (const entry of entries) {
          const subPath = path.join(baseDir, entry.name);
          const exePath = path.join(subPath, 'eclipse.exe');
          if (fs.existsSync(exePath)) {
            foundEclipseDir = subPath;
            break;
          }
        }
      } catch {}
      if (foundEclipseDir) break;
    }

    if (foundEclipseDir) {
      eclipseVersion = 'Installed';

      // Check for ADT plugins in plugins or dropins directory
      const pluginsDir = path.join(foundEclipseDir, 'plugins');
      const dropinsDir = path.join(foundEclipseDir, 'dropins');

      const checkDir = (dir) => {
        if (!fs.existsSync(dir)) return;
        try {
          const files = fs.readdirSync(dir);
          for (const f of files) {
            if (f.startsWith('com.sap.adt') || f.startsWith('com.sap.netweaver.adt')) {
              adtFound = true;
              const vMatch = f.match(/_([0-9]+\.[0-9]+\.[0-9]+)/);
              if (vMatch) adtVersion = vMatch[1];
              break;
            }
          }
        } catch {}
      };

      checkDir(pluginsDir);
      if (!adtFound) checkDir(dropinsDir);
    }

    return {
      eclipse: {
        name: 'Eclipse IDE',
        detected: !!foundEclipseDir,
        installPath: foundEclipseDir || null,
        version: eclipseVersion || 'Not found',
        status: foundEclipseDir ? 'READY' : 'ACTION_REQUIRED',
        details: foundEclipseDir
          ? `Eclipse found at ${foundEclipseDir}.`
          : 'Eclipse IDE installation not detected in standard directories.'
      },
      adt: {
        name: 'ABAP Development Tools (ADT)',
        detected: adtFound,
        version: adtVersion || (adtFound ? 'Detected' : 'Not installed'),
        status: adtFound ? 'READY' : 'ACTION_REQUIRED',
        details: adtFound
          ? `SAP ADT plugin detected (${adtVersion || 'active'}).`
          : 'ADT plugin not detected in Eclipse plugins directory. Required for editing ABAP RAP code on S21.'
      }
    };
  }

  /**
   * Scans for SAP GUI for Windows.
   */
  _scanSapGui() {
    const candidatePaths = [
      'C:\\Program Files (x86)\\SAP\\FrontEnd\\SAPgui\\saplogon.exe',
      'C:\\Program Files\\SAP\\FrontEnd\\SAPgui\\saplogon.exe'
    ];

    let foundPath = null;
    for (const p of candidatePaths) {
      if (fs.existsSync(p)) {
        foundPath = p;
        break;
      }
    }

    return {
      name: 'SAP GUI for Windows',
      detected: !!foundPath,
      installPath: foundPath,
      version: foundPath ? 'Installed' : 'Not found',
      status: foundPath ? 'READY' : 'OPTIONAL',
      details: foundPath
        ? `SAP GUI found at ${foundPath}.`
        : 'SAP GUI not detected in standard location (C:\\Program Files (x86)\\SAP\\FrontEnd\\SAPgui\\).'
    };
  }
}

export const defaultToolchainScanner = new ToolchainScanner();
