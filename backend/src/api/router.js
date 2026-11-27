/**
 * Fiorify API — Central Route Dispatcher (/api/v1/*)
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
import { handleHealthRoutes } from '../routes/healthRoutes.js';
import { handleAuthRoutes } from '../routes/authRoutes.js';
import { handleSystemRoutes } from '../routes/systemRoutes.js';
import { handleCatalogueRoutes } from '../routes/catalogueRoutes.js';
import { handleDiscoveryRoutes } from '../routes/discoveryRoutes.js';
import { handleFitGapRoutes } from '../routes/fitGapRoutes.js';
import { handleAssessmentRoutes } from '../routes/assessmentRoutes.js';
import { handleHandoffRoutes } from '../routes/handoffRoutes.js';
import { handleGenerationProjectRoutes } from '../generation/routes/generationProjectRoutes.js';
import { handleGenerationRoutes } from '../generation/routes/generationRoutes.js';
import { handleMcpRoute } from '../mcp/routes/mcpRoutes.js';

export async function dispatchApiRoutes(req, res, url, context) {
  const {
    isProduction,
    currentUser,
    frontendDistDir,
    mcpService,
    checkAdminAuth
  } = context;

  const hasFrontendDist = fs.existsSync(path.join(frontendDistDir, 'index.html'));
  const prefersHtml = Boolean(req.headers.accept && req.headers.accept.includes('text/html'));

  // 1. Root API Index (when not serving HTML SPA)
  if (req.method === 'GET' && url.pathname === '/' && (!hasFrontendDist || !prefersHtml)) {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    if (isProduction && (!currentUser || currentUser.isUnauthenticated)) {
      res.end(JSON.stringify({ service: 'Fiorify Modernization API', status: 'UP', version: '1.2.0' }));
      return true;
    }
    res.end(JSON.stringify({
      service: 'Fiorify SAP Modernization & Discovery API',
      version: '1.2.0',
      engine: `Node ${process.version} (Modular API Architecture)`,
      targetSystem: 'S21 (Client 200) - SAP S/4HANA 2023 Private Edition',
      openApiSpec: '/api/v1/openapi.json',
      health: '/api/v1/health'
    }, null, 2));
    return true;
  }

  // 2. OpenAPI Specification
  if (req.method === 'GET' && url.pathname === '/api/v1/openapi.json') {
    const openApiPath = path.resolve(REPO_ROOT, 'backend', 'src', 'docs', 'openapi.json');
    if (fs.existsSync(openApiPath)) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(fs.readFileSync(openApiPath, 'utf8'));
    } else {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'OpenAPI spec not found' }));
    }
    return true;
  }

  // 3. Modular Domain Route Controllers
  if (await handleHealthRoutes(req, res, url, context)) return true;
  if (await handleAuthRoutes(req, res, url, context)) return true;
  if (await handleSystemRoutes(req, res, url, context)) return true;
  if (await handleCatalogueRoutes(req, res, url, context)) return true;
  if (await handleDiscoveryRoutes(req, res, url, context)) return true;
  if (await handleFitGapRoutes(req, res, url, context)) return true;
  if (await handleAssessmentRoutes(req, res, url, context)) return true;
  if (await handleHandoffRoutes(req, res, url, context)) return true;
  if (await handleGenerationProjectRoutes(req, res, url, context)) return true;
  if (await handleGenerationRoutes(req, res, url, context)) return true;
  if (await handleMcpRoute(req, res, url, { mcpService, checkAdminAuth })) return true;

  return false;
}
