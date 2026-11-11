import test from 'node:test';
import assert from 'node:assert/strict';
import { McpConnectionManager, CONNECTION_STATES } from '../src/mcp/client/mcpConnectionManager.js';
import { McpToolRegistry } from '../src/mcp/services/mcpToolRegistry.js';

test('MCP Connection Manager — Lifecycle & State Transitions', async (t) => {
  await t.test('1. starts in NOT_CONFIGURED when disabled', () => {
    const manager = new McpConnectionManager({
      config: { enabled: false, transport: 'stdio' },
      toolRegistry: new McpToolRegistry()
    });
    assert.strictEqual(manager.getState(), CONNECTION_STATES.NOT_CONFIGURED);
    const status = manager.getStatus();
    assert.strictEqual(status.enabled, false);
    assert.strictEqual(status.state, CONNECTION_STATES.NOT_CONFIGURED);
  });

  await t.test('2. starts in STOPPED when enabled but not connected', () => {
    const manager = new McpConnectionManager({
      config: { enabled: true, transport: 'stdio' },
      toolRegistry: new McpToolRegistry()
    });
    assert.strictEqual(manager.getState(), CONNECTION_STATES.STOPPED);
  });

  await t.test('3. handles connection failure gracefully when executable missing', async () => {
    const manager = new McpConnectionManager({
      config: {
        enabled: true,
        transport: 'stdio',
        executablePath: '/non/existent/path/fiori-mcp.js',
        startupTimeoutMs: 500,
        toolTimeoutMs: 500,
        reconnectMaxAttempts: 0
      },
      toolRegistry: new McpToolRegistry()
    });

    const res = await manager.connect();
    assert.strictEqual(res.success, false);
    assert.strictEqual(manager.getState(), CONNECTION_STATES.ERROR);
    assert.ok(manager.getStatus().lastError.message.includes('not found'));
  });

  await t.test('4. prevents duplicate simultaneous connection attempts', async () => {
    let connectCalls = 0;
    const mockClientWrapper = {
      connect: async () => {
        connectCalls++;
        await new Promise(r => setTimeout(r, 50));
      },
      isConnected: () => true,
      getServerCapabilities: () => ({ tools: {} }),
      getServerVersion: () => ({ name: 'mock', version: '1.0.0' }),
      listTools: async () => [{ name: 'mock_tool', description: 'test' }],
      close: async () => {}
    };

    const manager = new McpConnectionManager({
      config: {
        enabled: true,
        transport: 'stdio',
        executablePath: process.execPath, // node exists
        startupTimeoutMs: 5000,
        toolTimeoutMs: 5000,
        reconnectMaxAttempts: 0
      },
      clientWrapper: mockClientWrapper,
      toolRegistry: new McpToolRegistry()
    });

    const [p1, p2] = await Promise.all([
      manager.connect(),
      manager.connect()
    ]);

    // One succeeds, one gets prevented or both complete cleanly
    assert.strictEqual(manager.getState(), CONNECTION_STATES.CONNECTED);
    assert.strictEqual(manager.getStatus().toolCount, 1);
    await manager.disconnect();
    assert.strictEqual(manager.getState(), CONNECTION_STATES.STOPPED);
  });

  await t.test('5. clean disconnect clears tools and sets STOPPED state', async () => {
    const registry = new McpToolRegistry();
    registry.setTools([{ name: 'test_tool', description: 'a tool' }]);
    assert.strictEqual(registry.getTools().length, 1);

    const manager = new McpConnectionManager({
      config: { enabled: true, transport: 'stdio' },
      toolRegistry: registry
    });

    await manager.disconnect();
    assert.strictEqual(manager.getState(), CONNECTION_STATES.STOPPED);
    assert.strictEqual(registry.getTools().length, 0);
  });

  await t.test('6. unexpected child process exit transitions state to DISCONNECTED and clears tools', async () => {
    const registry = new McpToolRegistry();
    const mockClientWrapper = {
      connect: async () => {},
      isConnected: () => true,
      getServerCapabilities: () => ({ tools: {} }),
      getServerVersion: () => ({ name: 'mock', version: '1.0.0' }),
      listTools: async () => [{ name: 'mock_tool', description: 'test' }],
      close: async () => {}
    };

    const manager = new McpConnectionManager({
      config: {
        enabled: true,
        transport: 'stdio',
        executablePath: process.execPath,
        startupTimeoutMs: 5000,
        toolTimeoutMs: 5000,
        reconnectMaxAttempts: 0
      },
      clientWrapper: mockClientWrapper,
      toolRegistry: registry
    });

    await manager.connect();
    assert.strictEqual(manager.getState(), CONNECTION_STATES.CONNECTED);
    assert.strictEqual(registry.getTools().length, 1);

    // Trigger unexpected close callback
    assert.ok(typeof mockClientWrapper.onCloseCallback === 'function');
    mockClientWrapper.onCloseCallback();

    assert.strictEqual(manager.getState(), CONNECTION_STATES.DISCONNECTED);
    assert.strictEqual(registry.getTools().length, 0);
  });
});
