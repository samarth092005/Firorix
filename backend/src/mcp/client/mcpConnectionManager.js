import EventEmitter from 'node:events';
import fs from 'node:fs';
import { McpClientWrapper } from './mcpClient.js';
import { defaultMcpConfig, validateMcpConfig } from '../config/mcpConfig.js';
import { defaultMcpToolRegistry } from '../services/mcpToolRegistry.js';
import { mcpLogger } from '../utils/mcpLogger.js';
import { McpConnectionError } from '../utils/mcpErrors.js';

export const CONNECTION_STATES = {
  NOT_CONFIGURED: 'NOT_CONFIGURED',
  STOPPED: 'STOPPED',
  STARTING: 'STARTING',
  CONNECTING: 'CONNECTING',
  CONNECTED: 'CONNECTED',
  DEGRADED: 'DEGRADED',
  DISCONNECTED: 'DISCONNECTED',
  ERROR: 'ERROR'
};

export class McpConnectionManager extends EventEmitter {
  constructor(options = {}) {
    super();
    this.config = { ...defaultMcpConfig, ...(options.config || {}) };
    this.toolRegistry = options.toolRegistry || defaultMcpToolRegistry;
    this.clientWrapper = options.clientWrapper || new McpClientWrapper();

    this.state = this.config.enabled ? CONNECTION_STATES.STOPPED : CONNECTION_STATES.NOT_CONFIGURED;
    this.lastConnectedAt = null;
    this.lastToolDiscoveryAt = null;
    this.lastError = null;
    this.reconnectAttempts = 0;
    this.isConnecting = false;
    this.serverMetadata = null;
    this._reconnectTimer = null;

    // Process lifecycle event handlers
    this.clientWrapper.onCloseCallback = () => {
      if (this.state === CONNECTION_STATES.CONNECTED || this.state === CONNECTION_STATES.CONNECTING) {
        mcpLogger.warn('MCP child process terminated unexpectedly.');
        this.toolRegistry.clear();
        this._setState(CONNECTION_STATES.DISCONNECTED, new McpConnectionError('MCP process exited unexpectedly'));
      }
    };

    this.clientWrapper.onErrorCallback = (err) => {
      mcpLogger.error(`MCP child process error: ${err.message || err}`);
      if (this.state === CONNECTION_STATES.CONNECTED) {
        this._setState(CONNECTION_STATES.ERROR, err);
      }
    };
  }

  getState() {
    return this.state;
  }

  getStatus() {
    return {
      enabled: this.config.enabled,
      state: this.state,
      serverPackage: this.config.serverPackage,
      serverVersion: this.config.serverVersion,
      transport: this.config.transport,
      lastConnectedAt: this.lastConnectedAt,
      lastToolDiscoveryAt: this.lastToolDiscoveryAt,
      toolCount: this.toolRegistry.getTools().length,
      serverVersionReported: this.serverMetadata?.version || null,
      serverCapabilities: this.serverMetadata?.capabilities || null,
      lastError: this.lastError ? {
        message: this.lastError.message,
        code: this.lastError.code || 'MCP_ERROR',
        timestamp: this.lastError.timestamp
      } : null,
      reconnectAttempts: this.reconnectAttempts
    };
  }

  _setState(newState, error = null) {
    const oldState = this.state;
    this.state = newState;
    if (error) {
      this.lastError = {
        message: error.message || String(error),
        code: error.code || 'MCP_ERROR',
        timestamp: new Date().toISOString()
      };
    }
    mcpLogger.info(`Connection state changed: ${oldState} -> ${newState}`);
    this.emit('stateChange', { oldState, newState, error });
  }

  /**
   * Connects to the SAP Fiori MCP server and discovers tools.
   *
   * @param {object} [overrideOptions]
   * @returns {Promise<{ success: boolean, state: string, toolsCount: number }>}
   */
  async connect(overrideOptions = {}) {
    // Prevent duplicate simultaneous connection attempts
    if (this.isConnecting) {
      mcpLogger.warn('Connection attempt already in progress.');
      return { success: false, state: this.state, error: 'Connection attempt already in progress' };
    }

    if (this.state === CONNECTION_STATES.CONNECTED && this.clientWrapper.isConnected()) {
      mcpLogger.info('MCP server is already connected.');
      return { success: true, state: this.state, toolsCount: this.toolRegistry.getTools().length };
    }

    this.isConnecting = true;
    this._setState(CONNECTION_STATES.STARTING);

    const config = { ...this.config, ...overrideOptions };
    const configValidation = validateMcpConfig(config);
    if (!configValidation.isValid) {
      const err = new McpConnectionError(configValidation.errors.join('; '));
      this._setState(CONNECTION_STATES.ERROR, err);
      this.isConnecting = false;
      return { success: false, state: this.state, error: err.message };
    }

    try {
      // 1. Verify executable exists
      const execPath = config.executablePath;
      if (!fs.existsSync(execPath)) {
        throw new McpConnectionError(`MCP server executable not found at path: ${execPath}`);
      }

      this._setState(CONNECTION_STATES.CONNECTING);

      // 2. Launch and perform handshake
      await this.clientWrapper.connect({
        command: process.execPath, // node
        args: [execPath],
        env: {
          LOG_LEVEL: config.logLevel
        },
        timeoutMs: config.startupTimeoutMs
      });

      // 3. Retrieve server metadata
      const capabilities = this.clientWrapper.getServerCapabilities();
      const version = this.clientWrapper.getServerVersion();
      this.serverMetadata = { capabilities, version };

      // 4. Retrieve and register tools
      const tools = await this.clientWrapper.listTools(config.toolTimeoutMs);
      this.toolRegistry.setTools(tools, {
        serverVersion: version,
        serverCapabilities: capabilities
      });

      this.lastConnectedAt = new Date().toISOString();
      this.lastToolDiscoveryAt = this.toolRegistry.lastDiscoveredAt;
      this.lastError = null;
      this.reconnectAttempts = 0;

      // 5. Mark as CONNECTED only after full verification
      this._setState(CONNECTION_STATES.CONNECTED);
      this.isConnecting = false;

      return {
        success: true,
        state: this.state,
        toolsCount: tools.length
      };
    } catch (err) {
      mcpLogger.error(`MCP connection failed: ${err.message}`);
      this.toolRegistry.clear();
      this._setState(CONNECTION_STATES.ERROR, err);
      this.isConnecting = false;

      await this.clientWrapper.close().catch(() => {});

      return {
        success: false,
        state: this.state,
        error: err.message
      };
    }
  }

  /**
   * Performs controlled disconnect and cleanup.
   */
  async disconnect() {
    if (this._reconnectTimer) {
      clearTimeout(this._reconnectTimer);
      this._reconnectTimer = null;
    }

    this.isConnecting = false;
    this.toolRegistry.clear();
    await this.clientWrapper.close().catch(() => {});
    this._setState(this.config.enabled ? CONNECTION_STATES.STOPPED : CONNECTION_STATES.NOT_CONFIGURED);

    return {
      success: true,
      state: this.state
    };
  }

  /**
   * Invokes tool on the active client.
   */
  async callTool(toolName, args, timeoutMs) {
    if (this.state !== CONNECTION_STATES.CONNECTED || !this.clientWrapper.isConnected()) {
      throw new McpConnectionError('Cannot invoke tool: MCP server is not in CONNECTED state.');
    }

    return this.clientWrapper.callTool(toolName, args, timeoutMs || this.config.toolTimeoutMs);
  }

  /**
   * Safe process termination hook.
   */
  async destroy() {
    await this.disconnect();
    this.removeAllListeners();
  }
}

export const defaultMcpConnectionManager = new McpConnectionManager();
