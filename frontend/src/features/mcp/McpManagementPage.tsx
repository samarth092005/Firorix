import React, { useState, useEffect } from 'react';
import { apiClient } from '../../services/api/apiClient';
import type {
  McpStatusInfo,
  McpTool,
  McpExecutionResponse
} from '../../types/mcp';
import {
  PageHeader,
  Breadcrumbs,
  SectionHeader,
  StatusBadge,
  InformationPanel,
  LoadingState,
  KPICard
} from '../../components/common';
import {
  Server,
  Play,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ShieldCheck,
  ShieldAlert,
  Search,
  ExternalLink,
  Layers,
  Terminal,
  Activity,
  Lock,
  Clock,
  Code2
} from 'lucide-react';

export const McpManagementPage: React.FC = () => {
  const [status, setStatus] = useState<McpStatusInfo | null>(null);
  const [tools, setTools] = useState<McpTool[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isConnecting, setIsConnecting] = useState<boolean>(false);
  const [selectedTool, setSelectedTool] = useState<McpTool | null>(null);
  const [toolArguments, setToolArguments] = useState<Record<string, any>>({});
  const [isExecuting, setIsExecuting] = useState<boolean>(false);
  const [executionResult, setExecutionResult] = useState<McpExecutionResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [adminSecret, setAdminSecret] = useState<string>(() => {
    return sessionStorage.getItem('Fiorify_admin_secret') || '';
  });
  const [showAdminSecretInput, setShowAdminSecretInput] = useState<boolean>(false);
  const [filterCategory, setFilterCategory] = useState<string>('ALL');

  const fetchStatusAndTools = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const statusRes = await apiClient.getMcpStatus();
      if (statusRes.success) {
        setStatus(statusRes.status);
      }

      const toolsRes = await apiClient.getMcpTools();
      if (toolsRes.success && toolsRes.available) {
        setTools(toolsRes.tools);
        if (toolsRes.tools.length > 0 && !selectedTool) {
          const firstAllowed = toolsRes.tools.find(t => t.isAllowed) || toolsRes.tools[0];
          setSelectedTool(firstAllowed);
          initArgumentsForTool(firstAllowed);
        }
      } else {
        setTools([]);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to fetch MCP status and tool inventory');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStatusAndTools();
  }, []);

  const initArgumentsForTool = (tool: McpTool) => {
    const initialArgs: Record<string, any> = {};
    const schemaProps = tool.inputSchema?.properties || {};
    for (const [key, prop] of Object.entries(schemaProps)) {
      if ((prop as any).default !== undefined) {
        initialArgs[key] = (prop as any).default;
      } else if ((prop as any).type === 'array') {
        initialArgs[key] = [];
      } else if ((prop as any).type === 'number') {
        initialArgs[key] = 0;
      } else {
        initialArgs[key] = '';
      }
    }
    // Specific convenient defaults for read-only tools
    if (tool.name === 'search_docs' && !initialArgs.query) {
      initialArgs.query = 'List Report';
    }
    if (tool.name === 'list_fiori_apps' && (!initialArgs.searchPath || initialArgs.searchPath.length === 0)) {
      initialArgs.searchPath = ['.'];
    }
    setToolArguments(initialArgs);
    setExecutionResult(null);
  };

  const handleSelectTool = (tool: McpTool) => {
    setSelectedTool(tool);
    initArgumentsForTool(tool);
  };

  const handleConnect = async () => {
    setIsConnecting(true);
    setErrorMessage(null);
    try {
      await apiClient.connectMcp(adminSecret || undefined);
      await fetchStatusAndTools();
    } catch (err: any) {
      setErrorMessage(`Connect failed: ${err.message}`);
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    setIsConnecting(true);
    setErrorMessage(null);
    try {
      await apiClient.disconnectMcp(adminSecret || undefined);
      await fetchStatusAndTools();
      setSelectedTool(null);
      setExecutionResult(null);
    } catch (err: any) {
      setErrorMessage(`Disconnect failed: ${err.message}`);
    } finally {
      setIsConnecting(false);
    }
  };

  const handleExecute = async () => {
    if (!selectedTool || !selectedTool.isAllowed) return;

    setIsExecuting(true);
    setExecutionResult(null);
    setErrorMessage(null);

    try {
      // Clean up string arguments: parse arrays/numbers if needed
      const processedArgs: Record<string, any> = { ...toolArguments };
      const schemaProps = selectedTool.inputSchema?.properties || {};
      for (const [key, prop] of Object.entries(schemaProps)) {
        if ((prop as any).type === 'array' && typeof processedArgs[key] === 'string') {
          processedArgs[key] = processedArgs[key].split(',').map((s: string) => s.trim()).filter(Boolean);
        } else if ((prop as any).type === 'number' && typeof processedArgs[key] === 'string') {
          processedArgs[key] = Number(processedArgs[key]);
        }
      }

      const res = await apiClient.executeMcpTool(selectedTool.name, processedArgs, {
        adminSecret: adminSecret || undefined
      });
      setExecutionResult(res);
    } catch (err: any) {
      setErrorMessage(`Tool execution error: ${err.message}`);
    } finally {
      setIsExecuting(false);
    }
  };

  const isConnected = status?.connectionState === 'CONNECTED';
  const filteredTools = tools.filter(t => {
    if (filterCategory === 'ALL') return true;
    if (filterCategory === 'ALLOWED') return t.isAllowed;
    if (filterCategory === 'BLOCKED') return !t.isAllowed;
    return t.category === filterCategory;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', paddingBottom: '40px' }}>
      {/* Breadcrumbs & Header */}
      <div>
        <PageHeader
          title="SAP Fiori MCP Server Integration"
          breadcrumbs={
            <Breadcrumbs
              items={[
                { label: 'System & Configuration', to: '/system-configuration' },
                { label: 'SAP Fiori MCP Server' }
              ]}
            />
          }
          systemContextBadge={
            <StatusBadge
              status={isConnected ? 'HEALTHY' : (status?.enabled ? 'WARNING' : 'DISCONNECTED')}
              variant={isConnected ? 'success' : (status?.enabled ? 'warning' : 'neutral')}
              customLabel={status?.connectionState || 'UNKNOWN'}
            />
          }
          actions={[
            ...(isConnected
              ? [
                  {
                    label: isConnecting ? 'Disconnecting...' : 'Disconnect',
                    icon: RotateCcw,
                    variant: 'secondary' as const,
                    onClick: handleDisconnect,
                    disabled: isConnecting
                  }
                ]
              : [
                  {
                    label: isConnecting ? 'Connecting...' : 'Connect MCP Server',
                    icon: Server,
                    variant: 'primary' as const,
                    onClick: handleConnect,
                    disabled: isConnecting
                  }
                ]),
            {
              label: isLoading ? 'Refreshing...' : 'Refresh',
              icon: RotateCcw,
              variant: 'subtle' as const,
              onClick: fetchStatusAndTools,
              disabled: isLoading
            }
          ]}
        />
      </div>

      {/* Error notification banner if any */}
      {errorMessage && (
        <div
          style={{
            padding: '12px 16px',
            backgroundColor: '#FFF2F0',
            border: '1px solid #FFCCC7',
            borderRadius: 'var(--radius-sm, 6px)',
            color: '#CF1322',
            fontSize: '13px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <AlertTriangle size={16} />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* KPI Overview Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '16px'
        }}
      >
        <KPICard
          label="MCP Connection State"
          value={status?.connectionState || 'NOT_CONFIGURED'}
          description={status?.transport ? `Transport: ${status.transport.toUpperCase()}` : 'Stdio Protocol'}
          icon={Activity}
          tone={isConnected ? 'success' : 'default'}
        />
        <KPICard
          label="Server Package"
          value={status?.serverPackage ? '@sap-ux/fiori-mcp-server' : 'Not installed'}
          description={status?.serverVersion ? `Pinned v${status.serverVersion}` : 'Version unpinned'}
          icon={Server}
          tone="info"
        />
        <KPICard
          label="Discovered Tools"
          value={String(status?.toolCount || tools.length)}
          description={`${status?.allowedToolCount || 0} allowed (read-only), ${status?.blockedToolCount || 0} disabled`}
          icon={Layers}
          tone="warning"
        />
        <KPICard
          label="Execution Policy"
          value="Conservative Allowlist"
          description="All file-generation & modification blocked"
          icon={ShieldCheck}
          tone="purple"
        />
      </div>

      {/* Main Grid: Left Tools Explorer & Right Execution Panel */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(320px, 1fr) minmax(480px, 1.6fr)',
          gap: '20px',
          alignItems: 'start'
        }}
      >
        {/* Left Column: Tool Explorer */}
        <div
          style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid var(--fiori-border, #E2E8F0)',
            borderRadius: 'var(--radius-md, 10px)',
            padding: '20px',
            boxShadow: 'var(--fiori-shadow-card)',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <SectionHeader
              title="Discovered MCP Tools"
              description="Live tool inventory retrieved directly via MCP protocol handshake."
            />
          </div>

          {/* Filter Bar */}
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {['ALL', 'ALLOWED', 'BLOCKED'].map(cat => (
              <button
                key={cat}
                type="button"
                onClick={() => setFilterCategory(cat)}
                style={{
                  padding: '4px 10px',
                  fontSize: '11px',
                  fontWeight: 600,
                  borderRadius: '4px',
                  border: filterCategory === cat ? '1px solid #0A6ED1' : '1px solid #E2E8F0',
                  backgroundColor: filterCategory === cat ? '#EBF5FE' : '#F8FAFC',
                  color: filterCategory === cat ? '#0A6ED1' : '#64748B',
                  cursor: 'pointer'
                }}
              >
                {cat}
              </button>
            ))}
          </div>

          {isLoading ? (
            <LoadingState message="Discovering tools from SAP Fiori MCP server..." />
          ) : !isConnected ? (
            <div
              style={{
                padding: '24px 16px',
                textAlign: 'center',
                backgroundColor: '#F8FAFC',
                borderRadius: '6px',
                border: '1px dashed #CBD5E1',
                color: '#64748B',
                fontSize: '13px'
              }}
            >
              <Server size={32} style={{ margin: '0 auto 10px', opacity: 0.5 }} />
              <div style={{ fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                MCP Server Disconnected
              </div>
              <div>Click &quot;Connect MCP Server&quot; to initialize protocol handshake.</div>
            </div>
          ) : filteredTools.length === 0 ? (
            <div style={{ padding: '20px', textAlign: 'center', color: '#64748B', fontSize: '13px' }}>
              No tools match filter criteria.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '560px', overflowY: 'auto' }}>
              {filteredTools.map(tool => {
                const isSelected = selectedTool?.name === tool.name;
                return (
                  <div
                    key={tool.name}
                    onClick={() => handleSelectTool(tool)}
                    style={{
                      padding: '12px 14px',
                      borderRadius: '8px',
                      border: isSelected ? '2px solid #0A6ED1' : '1px solid #E2E8F0',
                      backgroundColor: isSelected ? '#F0F7FF' : '#FFFFFF',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <span style={{ fontWeight: 600, fontSize: '13px', color: '#1D2D3E' }}>
                        {tool.name}
                      </span>
                      {tool.isAllowed ? (
                        <span
                          style={{
                            fontSize: '10px',
                            fontWeight: 700,
                            padding: '2px 6px',
                            borderRadius: '4px',
                            backgroundColor: '#E6F4EA',
                            color: '#137333'
                          }}
                        >
                          READ-ONLY
                        </span>
                      ) : (
                        <span
                          style={{
                            fontSize: '10px',
                            fontWeight: 700,
                            padding: '2px 6px',
                            borderRadius: '4px',
                            backgroundColor: '#FCE8E6',
                            color: '#C5221F'
                          }}
                        >
                          BLOCKED
                        </span>
                      )}
                    </div>
                    <div
                      style={{
                        fontSize: '12px',
                        color: '#64748B',
                        lineHeight: 1.4,
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden'
                      }}
                    >
                      {tool.description}
                    </div>
                    <div style={{ display: 'flex', gap: '6px', marginTop: '6px', fontSize: '11px', color: '#94A3B8' }}>
                      <span>Category: {tool.category}</span>
                      {tool.requiredProperties?.length > 0 && (
                        <span>• Req: {tool.requiredProperties.join(', ')}</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Tool Detail & Execution Panel */}
        <div
          style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid var(--fiori-border, #E2E8F0)',
            borderRadius: 'var(--radius-md, 10px)',
            padding: '20px',
            boxShadow: 'var(--fiori-shadow-card)',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px'
          }}
        >
          {selectedTool ? (
            <>
              {/* Header */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <h3 style={{ margin: '0 0 6px 0', fontSize: '16px', fontWeight: 700, color: '#1D2D3E' }}>
                      {selectedTool.name}
                    </h3>
                    <div style={{ fontSize: '13px', color: '#556B82', lineHeight: 1.4 }}>
                      {selectedTool.description}
                    </div>
                  </div>
                  <div>
                    {selectedTool.isAllowed ? (
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 700,
                          padding: '4px 8px',
                          borderRadius: '4px',
                          backgroundColor: '#E6F4EA',
                          color: '#137333',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                      >
                        <ShieldCheck size={12} />
                        APPROVED READ-ONLY
                      </span>
                    ) : (
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 700,
                          padding: '4px 8px',
                          borderRadius: '4px',
                          backgroundColor: '#FCE8E6',
                          color: '#C5221F',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                      >
                        <ShieldAlert size={12} />
                        DISCOVERED — EXECUTION DISABLED
                      </span>
                    )}
                  </div>
                </div>

                {/* Policy note if blocked */}
                {!selectedTool.isAllowed && (
                  <div
                    style={{
                      marginTop: '12px',
                      padding: '10px 14px',
                      backgroundColor: '#FFF7E6',
                      border: '1px solid #FFE7BA',
                      borderRadius: '6px',
                      fontSize: '12px',
                      color: '#D46B08',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}
                  >
                    <Lock size={14} />
                    <span>
                      {selectedTool.policyReason ||
                        'Application generation and modification tools are blocked in MCP-01/MCP-02 milestone by policy.'}
                    </span>
                  </div>
                )}
              </div>

              {/* Arguments Input Form (For Read-Only Tools) */}
              {selectedTool.isAllowed ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {/* Admin Key & Authorization Badge */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 12px',
                      backgroundColor: '#F8FAFC',
                      border: '1px solid #E2E8F0',
                      borderRadius: '6px',
                      fontSize: '12px'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#16A34A' }}>
                      <ShieldCheck size={14} />
                      <span style={{ fontWeight: 600, color: '#0F172A' }}>Admin Authenticated</span>
                      <span style={{ color: '#64748B', fontFamily: 'monospace', fontSize: '11px' }}>
                        ({adminSecret ? `${adminSecret.slice(0, 8)}...` : 'Default Secret'})
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowAdminSecretInput(!showAdminSecretInput)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#0066FF',
                        fontSize: '11px',
                        cursor: 'pointer',
                        fontWeight: 600
                      }}
                    >
                      {showAdminSecretInput ? 'Hide Key' : 'Configure Key'}
                    </button>
                  </div>

                  {showAdminSecretInput && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <label style={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>
                        Administrative Secret (X-Fiorify-Admin-Secret):
                      </label>
                      <input
                        type="password"
                        value={adminSecret}
                        onChange={(e) => {
                          setAdminSecret(e.target.value);
                          if (e.target.value) {
                            sessionStorage.setItem('Fiorify_admin_secret', e.target.value);
                          } else {
                            sessionStorage.removeItem('Fiorify_admin_secret');
                          }
                        }}
                        placeholder="Enter admin secret..."
                        style={{
                          padding: '6px 10px',
                          fontSize: '12px',
                          border: '1px solid #CBD5E1',
                          borderRadius: '6px',
                          fontFamily: 'monospace'
                        }}
                      />
                    </div>
                  )}

                  <div style={{ fontWeight: 600, fontSize: '13px', color: '#1D2D3E' }}>
                    Tool Arguments (Validated against InputSchema)
                  </div>

                  {selectedTool.inputSchema?.properties &&
                  Object.keys(selectedTool.inputSchema.properties).length > 0 ? (
                    Object.entries(selectedTool.inputSchema.properties).map(([propName, propDef]: [string, any]) => {
                      const isRequired = selectedTool.requiredProperties?.includes(propName);
                      return (
                        <div key={propName} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <label style={{ fontSize: '12px', fontWeight: 600, color: '#334155' }}>
                            {propName} {isRequired && <span style={{ color: '#CF1322' }}>*</span>}
                            <span style={{ fontWeight: 400, color: '#64748B', marginLeft: '6px' }}>
                              ({propDef.type || 'any'})
                            </span>
                          </label>
                          {propDef.description && (
                            <div style={{ fontSize: '11px', color: '#64748B' }}>
                              {propDef.description}
                            </div>
                          )}
                          <input
                            type="text"
                            value={
                              Array.isArray(toolArguments[propName])
                                ? toolArguments[propName].join(', ')
                                : toolArguments[propName] ?? ''
                            }
                            onChange={(e) =>
                              setToolArguments(prev => ({
                                ...prev,
                                [propName]: e.target.value
                              }))
                            }
                            placeholder={propDef.default !== undefined ? String(propDef.default) : `Enter ${propName}...`}
                            style={{
                              padding: '8px 12px',
                              fontSize: '13px',
                              border: '1px solid #CBD5E1',
                              borderRadius: '6px',
                              outline: 'none'
                            }}
                          />
                        </div>
                      );
                    })
                  ) : (
                    <div style={{ fontSize: '12px', color: '#64748B', fontStyle: 'italic' }}>
                      This tool requires no input arguments.
                    </div>
                  )}

                  <div style={{ marginTop: '8px' }}>
                    <button
                      type="button"
                      onClick={handleExecute}
                      disabled={isExecuting || !isConnected}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '10px 18px',
                        fontSize: '13px',
                        fontWeight: 600,
                        color: '#FFFFFF',
                        backgroundColor: isExecuting || !isConnected ? '#94A3B8' : '#0A6ED1',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: isExecuting || !isConnected ? 'not-allowed' : 'pointer'
                      }}
                    >
                      <Play size={14} className={isExecuting ? 'animate-spin' : ''} />
                      {isExecuting ? 'Invoking MCP Tool...' : `Execute ${selectedTool.name}`}
                    </button>
                  </div>
                </div>
              ) : null}

              {/* Execution Result Panel */}
              {executionResult && (
                <div
                  style={{
                    backgroundColor: executionResult.success ? '#F8FAFC' : '#FFF1F0',
                    border: executionResult.success ? '1px solid #E2E8F0' : '1px solid #FFA39E',
                    borderRadius: '8px',
                    padding: '16px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600, fontSize: '13px' }}>
                      {executionResult.success ? (
                        <CheckCircle2 size={16} color="#188918" />
                      ) : (
                        <XCircle size={16} color="#CF1322" />
                      )}
                      <span>Execution Result: {executionResult.executionStatus}</span>
                    </div>
                    <div style={{ fontSize: '11px', color: '#64748B' }}>
                      Duration: {executionResult.durationMs}ms • Provenance: {executionResult.provenance}
                    </div>
                  </div>

                  {executionResult.error ? (
                    <div style={{ color: '#CF1322', fontSize: '12px' }}>
                      <strong>{executionResult.error.code}:</strong> {executionResult.error.message}
                      {executionResult.error.details && (
                        <pre style={{ fontSize: '11px', marginTop: '4px', overflowX: 'auto' }}>
                          {JSON.stringify(executionResult.error.details, null, 2)}
                        </pre>
                      )}
                    </div>
                  ) : null}

                  {executionResult.result?.parsed ? (
                    <div>
                      <div style={{ fontSize: '11px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                        Parsed Structured Content:
                      </div>
                      <pre
                        style={{
                          backgroundColor: '#0F172A',
                          color: '#F8FAFC',
                          padding: '12px',
                          borderRadius: '6px',
                          fontSize: '11px',
                          fontFamily: 'monospace',
                          maxHeight: '260px',
                          overflowY: 'auto'
                        }}
                      >
                        {JSON.stringify(executionResult.result.parsed, null, 2)}
                      </pre>
                    </div>
                  ) : executionResult.result?.rawText ? (
                    <div>
                      <div style={{ fontSize: '11px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                        Response Output:
                      </div>
                      <pre
                        style={{
                          backgroundColor: '#F1F5F9',
                          color: '#1E293B',
                          padding: '12px',
                          borderRadius: '6px',
                          fontSize: '11px',
                          fontFamily: 'monospace',
                          maxHeight: '260px',
                          overflowY: 'auto',
                          whiteSpace: 'pre-wrap'
                        }}
                      >
                        {executionResult.result.rawText}
                      </pre>
                    </div>
                  ) : null}
                </div>
              )}

            </>
          ) : (
            <div style={{ padding: '40px', textAlign: 'center', color: '#94A3B8' }}>
              Select a tool from the left to inspect its schema and execute read-only operations.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
