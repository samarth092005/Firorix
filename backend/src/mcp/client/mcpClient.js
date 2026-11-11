import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { McpConnectionError, McpTimeoutError, McpExecutionError } from '../utils/mcpErrors.js';
import { mcpLogger } from '../utils/mcpLogger.js';

/**
 * Low-level MCP Client wrapper integrating with @modelcontextprotocol/sdk.
 */
export class McpClientWrapper {
  constructor(clientInfo = { name: 'fiorix-backend', version: '1.0.0' }) {
    this.clientInfo = clientInfo;
    this.client = null;
    this.transport = null;
    this._isConnected = false;
    this.onCloseCallback = null;
    this.onErrorCallback = null;
  }

  /**
   * Connects to the MCP server via stdio transport.
   *
   * @param {object} options
   * @param {string} options.command Path to node or binary
   * @param {string[]} options.args Arguments
   * @param {Record<string, string>} [options.env] Environment variables
   * @param {number} [options.timeoutMs] Startup timeout
   * @returns {Promise<void>}
   */
  async connect({ command, args, env = {}, timeoutMs = 30000 }) {
    try {
      mcpLogger.info(`Connecting to MCP server via stdio: ${command} ${args.join(' ')}`);

      this.transport = new StdioClientTransport({
        command,
        args,
        env: {
          ...process.env,
          ...env
        }
      });

      this.transport.onclose = () => {
        mcpLogger.info('MCP Stdio transport closed.');
        this._isConnected = false;
        if (typeof this.onCloseCallback === 'function') {
          this.onCloseCallback();
        }
      };

      this.transport.onerror = (err) => {
        mcpLogger.error(`MCP Stdio transport error: ${err.message || err}`);
        if (typeof this.onErrorCallback === 'function') {
          this.onErrorCallback(err);
        }
      };

      this.client = new Client(
        {
          name: this.clientInfo.name,
          version: this.clientInfo.version
        },
        {
          capabilities: {}
        }
      );

      // Startup connection with bounded timeout
      const connectPromise = this.client.connect(this.transport);
      let timer = null;
      const timeoutPromise = new Promise((_, reject) => {
        timer = setTimeout(() => {
          reject(new McpTimeoutError(`MCP server connection timed out after ${timeoutMs}ms`));
        }, timeoutMs);
      });

      await Promise.race([connectPromise, timeoutPromise]);
      if (timer) clearTimeout(timer);

      this._isConnected = true;
      mcpLogger.info('MCP Client handshake and connection successful.');
    } catch (err) {
      this._isConnected = false;
      await this.close().catch(() => {});
      if (err instanceof McpTimeoutError) {
        throw err;
      }
      throw new McpConnectionError(`Failed to connect to MCP server: ${err.message}`, err);
    }
  }

  /**
   * Returns whether the client is currently connected.
   */
  isConnected() {
    return this._isConnected && this.client !== null;
  }

  /**
   * Retrieves server capabilities returned during initialization.
   */
  getServerCapabilities() {
    if (!this.client) return null;
    return this.client.getServerCapabilities?.() || null;
  }

  /**
   * Retrieves server version info.
   */
  getServerVersion() {
    if (!this.client) return null;
    return this.client.getServerVersion?.() || null;
  }

  /**
   * Lists tools discovered from the connected MCP server.
   *
   * @param {number} [timeoutMs=15000]
   * @returns {Promise<Array<object>>}
   */
  async listTools(timeoutMs = 15000) {
    if (!this.isConnected()) {
      throw new McpConnectionError('Cannot list tools: MCP client is not connected.');
    }

    try {
      let timer = null;
      const listPromise = this.client.listTools();
      const timeoutPromise = new Promise((_, reject) => {
        timer = setTimeout(() => {
          reject(new McpTimeoutError(`Listing MCP tools timed out after ${timeoutMs}ms`));
        }, timeoutMs);
      });

      const result = await Promise.race([listPromise, timeoutPromise]);
      if (timer) clearTimeout(timer);

      return result?.tools || [];
    } catch (err) {
      if (err instanceof McpTimeoutError) throw err;
      throw new McpExecutionError(`Failed to list tools from MCP server: ${err.message}`, err);
    }
  }

  /**
   * Calls a tool on the MCP server.
   *
   * @param {string} toolName
   * @param {object} args
   * @param {number} [timeoutMs=60000]
   * @returns {Promise<object>} Raw tool execution result
   */
  async callTool(toolName, args = {}, timeoutMs = 60000) {
    if (!this.isConnected()) {
      throw new McpConnectionError(`Cannot call tool "${toolName}": MCP client is not connected.`);
    }

    try {
      let timer = null;
      const callPromise = this.client.callTool({
        name: toolName,
        arguments: args
      });

      const timeoutPromise = new Promise((_, reject) => {
        timer = setTimeout(() => {
          reject(new McpTimeoutError(`Tool "${toolName}" execution timed out after ${timeoutMs}ms`));
        }, timeoutMs);
      });

      const result = await Promise.race([callPromise, timeoutPromise]);
      if (timer) clearTimeout(timer);

      return result;
    } catch (err) {
      if (err instanceof McpTimeoutError) throw err;
      throw new McpExecutionError(`Error invoking tool "${toolName}": ${err.message}`, err);
    }
  }

  /**
   * Closes the client and transport cleanly.
   */
  async close() {
    this._isConnected = false;
    try {
      if (this.transport) {
        await this.transport.close();
      }
    } catch (err) {
      mcpLogger.warn(`Error closing MCP transport: ${err.message}`);
    } finally {
      this.transport = null;
      this.client = null;
    }
  }
}
