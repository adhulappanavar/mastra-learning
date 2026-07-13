import http from 'http';

// Global server state to persist captured metrics
const metricsState = {
  requestsCount: 0,
  totalCost: 0,
  agentStats: {} as Record<string, { requests: number; cost: number }>,
  logs: [] as Array<{
    timestamp: string;
    agentId: string;
    model: string;
    promptTokens: number;
    completionTokens: number;
    cost: number;
    messages: any[];
  }>,
};

// Spin up the local HTTP Server representing a standalone LiteLLM Proxy Instance
const server = http.createServer((req, res) => {
  const url = req.url || '';

  // API Route: Handle Chat Completions POST requests
  if (req.method === 'POST' && url === '/v1/chat/completions') {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    req.on('end', () => {
      const parsedBody = JSON.parse(body);
      const promptTokens = Math.floor(body.length / 4);
      const completionTokens = 32;
      const cost = 0.00015; // Simulated cost in dollars

      // Extract calling agent identifier from custom headers
      const rawAgentId = (req.headers['x-mastra-provider'] as string) || 'unknown-provider';
      const agentId = rawAgentId.replace('-provider', '').toUpperCase();

      // Log details to the server terminal
      console.log(`[LiteLLM Proxy] Captured request from AGENT: ${agentId} | Model: ${parsedBody.model}`);
      
      // Update global metrics state
      metricsState.requestsCount += 1;
      metricsState.totalCost += cost;
      
      if (!metricsState.agentStats[agentId]) {
        metricsState.agentStats[agentId] = { requests: 0, cost: 0 };
      }
      metricsState.agentStats[agentId].requests += 1;
      metricsState.agentStats[agentId].cost += cost;

      metricsState.logs.unshift({
        timestamp: new Date().toLocaleTimeString(),
        agentId,
        model: parsedBody.model,
        promptTokens,
        completionTokens,
        cost,
        messages: parsedBody.messages,
      });

      const responsePayload = {
        id: 'chatcmpl-litellmMock123',
        object: 'chat.completion',
        created: Math.floor(Date.now() / 1000),
        model: parsedBody.model,
        choices: [
          {
            index: 0,
            message: {
              role: 'assistant',
              content: `[LiteLLM Proxy Routed Response] Hello! Processed request successfully for ${agentId} Agent.`,
            },
            finish_reason: 'stop',
          },
        ],
        usage: {
          prompt_tokens: promptTokens,
          completion_tokens: completionTokens,
          total_tokens: promptTokens + completionTokens,
        },
      };

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(responsePayload));
    });
  } 
  // API Route: Get Live Metrics for the Dashboard
  else if (req.method === 'GET' && url === '/api/metrics') {
    res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
    res.end(JSON.stringify(metricsState));
  }
  // Web Route: Render the LiteLLM Dashboard UI
  else if (req.method === 'GET' && (url === '/' || url === '/ui/models-and-endpoints/' || url.startsWith('/ui'))) {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>LiteLLM Proxy - Multi-Agent Dashboard</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg-primary: #0f172a;
      --bg-secondary: #1e293b;
      --bg-tertiary: #334155;
      --text-main: #f8fafc;
      --text-muted: #94a3b8;
      --accent-color: #6366f1;
      --accent-hover: #4f46e5;
      --border-color: #334155;
      --success: #10b981;
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      font-family: 'Inter', sans-serif;
      background-color: var(--bg-primary);
      color: var(--text-main);
      display: flex;
      height: 100vh;
      overflow: hidden;
    }

    .sidebar {
      width: 260px;
      background-color: #0b0f19;
      border-right: 1px solid var(--border-color);
      display: flex;
      flex-direction: column;
      padding: 24px 16px;
      flex-shrink: 0;
      overflow-y: auto;
    }

    .brand {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 32px;
      padding: 0 8px;
    }

    .brand-logo {
      width: 28px;
      height: 28px;
      background-color: var(--accent-color);
      border-radius: 6px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      color: white;
      font-size: 14px;
    }

    .brand-title {
      font-size: 18px;
      font-weight: 600;
      color: var(--text-main);
    }

    .brand-version {
      font-size: 11px;
      background-color: var(--bg-tertiary);
      color: var(--text-muted);
      padding: 2px 6px;
      border-radius: 12px;
      margin-left: auto;
    }

    .menu-group {
      margin-bottom: 24px;
    }

    .menu-header {
      font-size: 10px;
      text-transform: uppercase;
      font-weight: 700;
      letter-spacing: 0.05em;
      color: var(--text-muted);
      margin-bottom: 8px;
      padding: 0 8px;
    }

    .menu-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 10px 12px;
      color: var(--text-muted);
      font-size: 13px;
      font-weight: 500;
      text-decoration: none;
      border-radius: 8px;
      transition: all 0.2s ease;
      cursor: pointer;
    }

    .menu-item:hover, .menu-item.active {
      color: var(--text-main);
      background-color: var(--bg-secondary);
    }

    .menu-item.active {
      border-left: 3px solid var(--accent-color);
    }

    .main-content {
      flex-grow: 1;
      display: flex;
      flex-direction: column;
      height: 100%;
      overflow-y: auto;
    }

    .top-navbar {
      height: 64px;
      border-bottom: 1px solid var(--border-color);
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 32px;
      background-color: #0b0f19;
    }

    .top-nav-left {
      font-size: 14px;
      color: var(--text-muted);
    }

    .content-body {
      padding: 32px;
      display: flex;
      flex-direction: column;
      gap: 24px;
    }

    .page-header {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .page-title {
      font-size: 24px;
      font-weight: 700;
    }

    .stats-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 16px;
    }

    .stat-card {
      background-color: var(--bg-secondary);
      border: 1px solid var(--border-color);
      border-radius: 12px;
      padding: 20px;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .stat-label {
      font-size: 12px;
      color: var(--text-muted);
    }

    .stat-value {
      font-size: 28px;
      font-weight: 700;
    }

    /* Agent breakdown section */
    .agent-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 16px;
    }

    .agent-card {
      background-color: var(--bg-secondary);
      border: 1px solid var(--border-color);
      border-radius: 12px;
      padding: 20px;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .agent-title {
      font-size: 16px;
      font-weight: 600;
      color: #38bdf8;
      display: flex;
      justify-content: space-between;
    }

    .agent-stats {
      display: flex;
      justify-content: space-between;
      font-size: 13px;
      color: var(--text-muted);
    }

    /* Logs view */
    .logs-section {
      background-color: var(--bg-secondary);
      border: 1px solid var(--border-color);
      border-radius: 12px;
      padding: 24px;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .logs-header {
      font-size: 16px;
      font-weight: 600;
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .pulse-dot {
      width: 10px;
      height: 10px;
      background-color: var(--success);
      border-radius: 50%;
      animation: pulse 1.5s infinite;
    }

    @keyframes pulse {
      0% { transform: scale(0.9); opacity: 0.6; }
      50% { transform: scale(1.1); opacity: 1; }
      100% { transform: scale(0.9); opacity: 0.6; }
    }

    .log-row {
      font-family: monospace;
      font-size: 12px;
      background-color: #0b0f19;
      border: 1px solid var(--border-color);
      border-radius: 8px;
      padding: 12px 16px;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .log-meta {
      display: flex;
      justify-content: space-between;
      color: var(--text-muted);
      border-bottom: 1px solid var(--border-color);
      padding-bottom: 4px;
      margin-bottom: 4px;
    }

    .log-content {
      color: #38bdf8;
    }
  </style>
</head>
<body>

  <div class="sidebar">
    <div class="brand">
      <div class="brand-logo">L</div>
      <div class="brand-title">LiteLLM</div>
      <div class="brand-version">v1.93.0</div>
    </div>

    <!-- AI GATEWAY -->
    <div class="menu-group">
      <div class="menu-header">AI Gateway</div>
      <a class="menu-item"><span class="menu-icon">🔑</span> Virtual Keys</a>
      <a class="menu-item"><span class="menu-icon">🛝</span> Playground</a>
      <a class="menu-item active"><span class="menu-icon">🌐</span> Models + Endpoints</a>
      <a class="menu-item"><span class="menu-icon">🤖</span> Agentic</a>
      <a class="menu-item"><span class="menu-icon">🔌</span> MCP Servers</a>
      <a class="menu-item"><span class="menu-icon">📚</span> Skills</a>
      <a class="menu-item"><span class="menu-icon">🛡️</span> Guardrails</a>
      <a class="menu-item"><span class="menu-icon">⚙️</span> Policies</a>
      <a class="menu-item"><span class="menu-icon">🛠️</span> Tools</a>
    </div>

    <!-- OBSERVABILITY -->
    <div class="menu-group">
      <div class="menu-header">Observability</div>
      <a class="menu-item"><span class="menu-icon">📊</span> Usage</a>
      <a class="menu-item"><span class="menu-icon">📝</span> Logs</a>
      <a class="menu-item"><span class="menu-icon">📈</span> Guardrails Monitor</a>
    </div>

    <!-- ACCESS CONTROL -->
    <div class="menu-group">
      <div class="menu-header">Access Control</div>
      <a class="menu-item"><span class="menu-icon">👥</span> Teams</a>
      <a class="menu-item"><span class="menu-icon">👤</span> Internal Users</a>
      <a class="menu-item"><span class="menu-icon">🏢</span> Organizations</a>
      <a class="menu-item"><span class="menu-icon">🔒</span> Access Groups</a>
      <a class="menu-item"><span class="menu-icon">💰</span> Budgets</a>
    </div>

    <!-- DEVELOPER TOOLS -->
    <div class="menu-group">
      <div class="menu-header">Developer Tools</div>
      <a class="menu-item"><span class="menu-icon">💻</span> API Reference</a>
    </div>
  </div>

  <div class="main-content">
    <div class="top-navbar">
      <div class="top-nav-left">LiteLLM Standalone Proxy Gateway</div>
      <div>Status: <span style="color: var(--success); font-weight: bold;">ONLINE</span></div>
    </div>

    <div class="content-body">
      <div class="page-header">
        <h1 class="page-title">LiteLLM Model Management (Multi-Agent)</h1>
      </div>

      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-label">Total Requests</div>
          <div class="stat-value" id="total-requests">0</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Total Cost Accumulation</div>
          <div class="stat-value" id="total-cost">$0.00000</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Connected Clients</div>
          <div class="stat-value" id="clients-count">0</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Active Host Endpoint</div>
          <div class="stat-value" style="font-size: 16px; font-weight: normal; margin-top: 10px;">http://localhost:4000</div>
        </div>
      </div>

      <!-- Agent Breakdown Stats -->
      <h2>Agent Observability Metrics</h2>
      <div class="agent-grid" id="agent-grid">
        <div style="grid-column: span 2; font-style: italic; color: var(--text-muted);">No agent stats registered yet. Run ex07-agents-client.ts to see traffic!</div>
      </div>

      <!-- Real-time Logs -->
      <div class="logs-section">
        <div class="logs-header">
          <div class="pulse-dot"></div>
          <span>Real-time Router Log Stream</span>
        </div>
        <div id="logs-container">
          <div style="font-style: italic; color: var(--text-muted); font-size: 13px;">Listening for proxy calls...</div>
        </div>
      </div>
    </div>
  </div>

  <script>
    async function refreshMetrics() {
      try {
        const res = await fetch('/api/metrics');
        const data = await res.json();

        document.getElementById('total-requests').textContent = data.requestsCount;
        document.getElementById('total-cost').textContent = '$' + data.totalCost.toFixed(5);
        
        const uniqueAgents = Object.keys(data.agentStats);
        document.getElementById('clients-count').textContent = uniqueAgents.length;

        // Render Agent Cards
        const agentGrid = document.getElementById('agent-grid');
        if (uniqueAgents.length === 0) {
          agentGrid.innerHTML = '<div style="grid-column: span 2; font-style: italic; color: var(--text-muted);">No agent stats registered yet. Run ex07-agents-client.ts to see traffic!</div>';
        } else {
          agentGrid.innerHTML = uniqueAgents.map(id => {
            const stats = data.agentStats[id];
            return \`
              <div class="agent-card">
                <div class="agent-title">
                  <span>🤖 \${id} Agent</span>
                  <span style="color: var(--success);">active</span>
                </div>
                <div class="agent-stats">
                  <span>Requests: <strong>\${stats.requests}</strong></span>
                  <span>Costs: <strong>\$\${stats.cost.toFixed(5)}</strong></span>
                </div>
              </div>
            \`;
          }).join('');
        }

        // Render Logs
        const logsContainer = document.getElementById('logs-container');
        if (data.logs.length === 0) {
          logsContainer.innerHTML = '<div style="font-style: italic; color: var(--text-muted); font-size: 13px;">Listening for proxy calls...</div>';
        } else {
          logsContainer.innerHTML = data.logs.map(log => \`
            <div class="log-row">
              <div class="log-meta">
                <span>⏰ \${log.timestamp}</span>
                <span>👤 Agent: <strong>\${log.agentId}</strong></span>
                <span>🤖 Model: \${log.model}</span>
                <span>💵 Cost: \$\${log.cost.toFixed(5)}</span>
              </div>
              <div class="log-content">Prompt query: "\${log.messages[0]?.content || ''}"</div>
            </div>
          \`).join('');
        }
      } catch (e) {
        console.error(e);
      }
    }

    setInterval(refreshMetrics, 1000);
    refreshMetrics();
  </script>
</body>
</html>
`);
  } else {
    res.writeHead(404);
    res.end();
  }
});

server.listen(4000, () => {
  console.log('========================================================');
  console.log('🚀 Standalone LiteLLM Proxy Server Running!');
  console.log('- API endpoint : http://localhost:4000/v1');
  console.log('- Dashboard UI : http://localhost:4000');
  console.log('========================================================');
  console.log('Listening for request metrics... Press Ctrl+C to close.\n');
});
