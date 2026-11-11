import { defaultMcpService } from '../services/mcpService.js';
import { sanitizeErrorMessage } from '../../adapters/btpDestinationAdapter.js';

const MCP_MAX_BODY_SIZE = 100 * 1024; // 100KB limit for MCP request payloads

/**
 * Handles all MCP HTTP API requests.
 *
 * @param {import('node:http').IncomingMessage} req
 * @param {import('node:http').ServerResponse} res
 * @param {URL} url
 * @param {object} context
 * @param {import('../services/mcpService.js').McpService} [context.mcpService]
 * @param {() => boolean} [context.checkAdminAuth]
 * @returns {Promise<boolean>} True if the request was handled by MCP router, false otherwise.
 */
export async function handleMcpRoute(req, res, url, context = {}) {
  const mcpService = context.mcpService || defaultMcpService;
  const checkAdminAuth = context.checkAdminAuth || (() => true);

  // 1. GET /api/v1/mcp/status
  if (req.method === 'GET' && url.pathname === '/api/v1/mcp/status') {
    const status = mcpService.getStatus();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      success: true,
      status
    }, null, 2));
    return true;
  }

  // 2. GET /api/v1/mcp/tools
  if (req.method === 'GET' && url.pathname === '/api/v1/mcp/tools') {
    const toolsData = mcpService.getTools();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      success: true,
      ...toolsData
    }, null, 2));
    return true;
  }

  // 3. GET /api/v1/mcp/health
  if (req.method === 'GET' && url.pathname === '/api/v1/mcp/health') {
    const health = mcpService.getHealth();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      success: true,
      health
    }, null, 2));
    return true;
  }

  // 4. POST /api/v1/mcp/connect (Admin Protected)
  if (req.method === 'POST' && url.pathname === '/api/v1/mcp/connect') {
    if (!checkAdminAuth()) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: false,
        statusCode: 'UNAUTHORIZED',
        errorMessage: 'Administrative authentication required to manage MCP connection.'
      }, null, 2));
      return true;
    }

    try {
      const connectResult = await mcpService.connect();
      const httpCode = connectResult.success ? 200 : 502;
      res.writeHead(httpCode, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        ...connectResult,
        status: mcpService.getStatus()
      }, null, 2));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: false,
        statusCode: 'MCP_CONNECTION_ERROR',
        errorMessage: sanitizeErrorMessage(err.message || 'Failed to connect to MCP server')
      }, null, 2));
    }
    return true;
  }

  // 5. POST /api/v1/mcp/disconnect (Admin Protected)
  if (req.method === 'POST' && url.pathname === '/api/v1/mcp/disconnect') {
    if (!checkAdminAuth()) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: false,
        statusCode: 'UNAUTHORIZED',
        errorMessage: 'Administrative authentication required to manage MCP connection.'
      }, null, 2));
      return true;
    }

    try {
      const disconnectResult = await mcpService.disconnect();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        ...disconnectResult,
        status: mcpService.getStatus()
      }, null, 2));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: false,
        statusCode: 'MCP_DISCONNECT_ERROR',
        errorMessage: sanitizeErrorMessage(err.message || 'Failed to disconnect MCP server')
      }, null, 2));
    }
    return true;
  }

  // 6. POST /api/v1/mcp/tools/:toolName/execute (Admin Protected)
  const executeMatch = url.pathname.match(/^\/api\/v1\/mcp\/tools\/([a-zA-Z0-9_-]+)\/execute$/);
  if (req.method === 'POST' && executeMatch) {
    if (!checkAdminAuth()) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: false,
        statusCode: 'UNAUTHORIZED',
        errorMessage: 'Administrative authentication required to execute MCP tools.'
      }, null, 2));
      return true;
    }

    const toolName = decodeURIComponent(executeMatch[1]);

    return new Promise((resolve) => {
      let bodyStr = '';
      let bodyLength = 0;

      req.on('data', (chunk) => {
        bodyLength += chunk.length;
        if (bodyLength > MCP_MAX_BODY_SIZE) {
          res.writeHead(413, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            success: false,
            statusCode: 'PAYLOAD_TOO_LARGE',
            errorMessage: `Payload exceeds maximum limit of ${MCP_MAX_BODY_SIZE} bytes`
          }));
          req.destroy();
          resolve(true);
        } else {
          bodyStr += chunk;
        }
      });

      req.on('end', async () => {
        let payload = {};
        if (bodyStr.trim()) {
          try {
            payload = JSON.parse(bodyStr);
          } catch {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
              success: false,
              statusCode: 'INVALID_JSON',
              errorMessage: 'Request body must be valid JSON'
            }));
            resolve(true);
            return;
          }
        }

        const toolArgs = payload.arguments && typeof payload.arguments === 'object' && !Array.isArray(payload.arguments)
          ? payload.arguments
          : (payload.args && typeof payload.args === 'object' && !Array.isArray(payload.args) ? payload.args : payload);

        try {
          const executionResult = await mcpService.executeTool(toolName, toolArgs, {
            timeoutMs: payload.timeoutMs
          });

          // Determine suitable HTTP status code based on executionStatus
          let httpCode = 200;
          if (!executionResult.success) {
            if (executionResult.executionStatus === 'BLOCKED') {
              httpCode = 403;
            } else if (executionResult.error?.code === 'MCP_TOOL_NOT_FOUND') {
              httpCode = 404;
            } else if (executionResult.error?.code === 'MCP_INVALID_ARGUMENTS') {
              httpCode = 400;
            } else if (executionResult.executionStatus === 'TIMEOUT') {
              httpCode = 504;
            } else {
              httpCode = 500;
            }
          }

          res.writeHead(httpCode, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(executionResult, null, 2));
        } catch (err) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            success: false,
            toolName,
            executionStatus: 'FAILED',
            errorMessage: sanitizeErrorMessage(err.message || 'Execution failed')
          }, null, 2));
        }
        resolve(true);
      });
    });
  }

  // Not an MCP route
  return false;
}
