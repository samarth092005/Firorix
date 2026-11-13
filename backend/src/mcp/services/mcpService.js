import { defaultMcpConfig } from '../config/mcpConfig.js';
import { defaultMcpConnectionManager, CONNECTION_STATES } from '../client/mcpConnectionManager.js';
import { defaultMcpToolRegistry } from './mcpToolRegistry.js';
import { McpToolExecutor, defaultMcpToolExecutor } from './mcpToolExecutor.js';
import { mcpLogger } from '../utils/mcpLogger.js';

export class McpService {
  constructor(options = {}) {
    this.config = options.config || defaultMcpConfig;
    this.connectionManager = options.connectionManager || defaultMcpConnectionManager;
    this.toolRegistry = options.toolRegistry || defaultMcpToolRegistry;
    this.toolExecutor = options.toolExecutor || new McpToolExecutor({
      connectionManager: this.connectionManager,
      toolRegistry: this.toolRegistry
    });
  }

  /**
   * Initializes the MCP subsystem.
   * Auto-connects if MCP_AUTO_CONNECT=true and MCP_ENABLED=true.
   */
  async initialize() {
    mcpLogger.info(`Initializing Fiorify MCP subsystem (Enabled: ${this.config.enabled}, AutoConnect: ${this.config.autoConnect})`);
    if (this.config.enabled && this.config.autoConnect) {
      try {
        await this.connectionManager.connect();
      } catch (err) {
        mcpLogger.warn(`Initial auto-connect attempt failed (subsystem remains operational): ${err.message}`);
      }
    }
  }

  /**
   * Returns current status summary.
   */
  getStatus() {
    const connStatus = this.connectionManager.getStatus();
    const summary = this.toolRegistry.getSummary();

    return {
      enabled: this.config.enabled,
      connectionState: connStatus.state,
      serverPackage: this.config.serverPackage,
      serverVersion: this.config.serverVersion,
      transport: this.config.transport,
      lastConnectedAt: connStatus.lastConnectedAt,
      lastToolDiscoveryAt: connStatus.lastToolDiscoveryAt,
      toolCount: summary.total,
      allowedToolCount: summary.allowedCount,
      blockedToolCount: summary.blockedCount,
      errorSummary: connStatus.lastError,
      serverCapabilities: connStatus.serverCapabilities,
      serverVersionReported: connStatus.serverVersionReported
    };
  }

  /**
   * Returns health diagnosis distinguishing backend, process, handshake, discovery, and SAP.
   */
  getHealth() {
    const status = this.getStatus();
    const state = this.connectionManager.getState();
    const isConnected = state === CONNECTION_STATES.CONNECTED;

    return {
      status: isConnected ? 'HEALTHY' : (this.config.enabled ? 'DEGRADED' : 'DISABLED'),
      timestamp: new Date().toISOString(),
      components: {
        backendAvailability: {
          status: 'UP',
          message: 'Fiorify backend HTTP service is running'
        },
        mcpSubsystemConfigured: {
          status: this.config.enabled ? 'ENABLED' : 'DISABLED',
          package: this.config.serverPackage,
          version: this.config.serverVersion
        },
        mcpProcessAvailability: {
          status: isConnected ? 'RUNNING' : (state === 'ERROR' ? 'FAILED' : 'STOPPED'),
          connectionState: state
        },
        mcpHandshakeStatus: {
          status: isConnected ? 'SUCCESS' : 'PENDING_OR_FAILED',
          serverReportedVersion: status.serverVersionReported
        },
        toolDiscoveryStatus: {
          status: status.toolCount > 0 ? 'DISCOVERED' : 'UNAVAILABLE',
          count: status.toolCount,
          lastDiscoveryAt: status.lastToolDiscoveryAt
        },
        sapSystemConnectivity: {
          status: 'NOT_TESTED_VIA_MCP',
          verified: false,
          note: 'MCP process connection does not guarantee live SAP system reachability without explicit tool execution'
        }
      }
    };
  }

  /**
   * Retrieves all discovered tools.
   */
  getTools() {
    const state = this.connectionManager.getState();
    if (state !== CONNECTION_STATES.CONNECTED) {
      return {
        available: false,
        connectionState: state,
        message: 'Tools unavailable: MCP server is not connected',
        tools: []
      };
    }

    return {
      available: true,
      connectionState: state,
      total: this.toolRegistry.getTools().length,
      tools: this.toolRegistry.getTools()
    };
  }

  /**
   * Connects or reconnects the MCP server.
   */
  async connect(options = {}) {
    return this.connectionManager.connect(options);
  }

  /**
   * Disconnects the MCP server.
   */
  async disconnect() {
    return this.connectionManager.disconnect();
  }

  /**
   * Executes an approved tool.
   */
  async executeTool(toolName, args, options) {
    return this.toolExecutor.execute(toolName, args, options);
  }

  /**
   * Clean shutdown.
   */
  async shutdown() {
    await this.connectionManager.destroy();
  }
}

export const defaultMcpService = new McpService();
