import { Agent } from '@mastra/core/agent';
import { Mastra } from '@mastra/core/mastra';
import { type ProviderConfig, MastraModelGateway } from '@mastra/core/llm';
import { createOpenAI } from '@ai-sdk/openai';
import http from 'http';
import readline from 'readline';

// Global server state to persist captured metrics
const metricsState = {
  requestsCount: 0,
  totalCost: 0,
  logs: [] as Array<{
    timestamp: string;
    model: string;
    promptTokens: number;
    completionTokens: number;
    cost: number;
    messages: any[];
  }>,
};

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const waitForKey = () => new Promise((resolve) => rl.question('\n[SYSTEM] Press Enter to stop the LiteLLM mock server and exit the program...\n', resolve));

// 1. Spin up the local HTTP Server with the Premium LiteLLM Dashboard UI
const mockLiteLLMServer = http.createServer((req, res) => {
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

      // Log to terminal console
      console.log('\n========================================');
      console.log('⚡ [LiteLLM Proxy Server: Captured Metrics]');
      console.log('========================================');
      console.log(`- Request Timestamp : ${new Date().toISOString()}`);
      console.log(`- Target Model      : ${parsedBody.model}`);
      console.log(`- Prompt Tokens     : ${promptTokens}`);
      console.log(`- Completion Tokens : ${completionTokens}`);
      console.log(`- Total Est. Cost   : $${cost}`);
      console.log('========================================\n');

      // Update global metrics state
      metricsState.requestsCount += 1;
      metricsState.totalCost += cost;
      metricsState.logs.unshift({
        timestamp: new Date().toLocaleTimeString(),
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
              content: 'Hello! I am a response routed through your LiteLLM metrics proxy. I have successfully tracked your usage.',
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
  <title>LiteLLM Proxy - Model Management</title>
  <!-- Google Fonts: Inter -->
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

    /* Sidebar Styling */
    .sidebar {
      width: 260px;
      background-color: #0b0f19;
      border-right: 1px border var(--border-color);
      display: flex;
      flex-direction: column;
      padding: 24px 16px;
      flex-shrink: 0;
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

    .menu-icon {
      font-size: 16px;
      width: 20px;
      text-align: center;
    }

    /* Main Area Styling */
    .main-content {
      flex-grow: 1;
      display: flex;
      flex-direction: column;
      height: 100%;
      overflow-y: auto;
      background-color: var(--bg-primary);
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

    .top-nav-right {
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .workspace-badge {
      font-size: 12px;
      background-color: var(--bg-secondary);
      border: 1px solid var(--border-color);
      padding: 6px 12px;
      border-radius: 8px;
      color: var(--text-main);
    }

    .content-body {
      padding: 32px;
      display: flex;
      flex-direction: column;
      gap: 24px;
    }

    /* Header block */
    .page-header {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .page-title {
      font-size: 24px;
      font-weight: 700;
    }

    .page-subtitle {
      font-size: 14px;
      color: var(--text-muted);
    }

    /* Optimization Banner */
    .banner {
      background: linear-gradient(135deg, #1e1b4b, #2e1065);
      border: 1px solid #4c1d95;
      border-radius: 12px;
      padding: 16px 24px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
    }

    .banner-text {
      font-size: 13px;
      line-height: 1.5;
    }

    .banner-button {
      background-color: var(--accent-color);
      color: white;
      border: none;
      padding: 8px 16px;
      border-radius: 8px;
      font-weight: 500;
      font-size: 12px;
      cursor: pointer;
      white-space: nowrap;
      transition: background-color 0.2s;
    }

    .banner-button:hover {
      background-color: var(--accent-hover);
    }

    /* Summary Stats Grid */
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
      font-weight: 500;
    }

    .stat-value {
      font-size: 28px;
      font-weight: 700;
      color: var(--text-main);
    }

    /* Tabs navigation */
    .tabs-bar {
      display: flex;
      border-bottom: 1px solid var(--border-color);
      gap: 24px;
    }

    .tab-item {
      padding: 12px 4px;
      font-size: 14px;
      color: var(--text-muted);
      font-weight: 500;
      cursor: pointer;
      border-bottom: 2px solid transparent;
      transition: all 0.2s;
    }

    .tab-item.active {
      color: var(--accent-color);
      border-bottom-color: var(--accent-color);
    }

    /* Filter Bar */
    .filter-bar {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .search-input {
      background-color: var(--bg-secondary);
      border: 1px solid var(--border-color);
      border-radius: 8px;
      padding: 10px 16px;
      color: var(--text-main);
      font-size: 13px;
      width: 280px;
      outline: none;
    }

    .search-input:focus {
      border-color: var(--accent-color);
    }

    .btn {
      background-color: var(--bg-secondary);
      border: 1px solid var(--border-color);
      color: var(--text-main);
      padding: 10px 16px;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 500;
      cursor: pointer;
      transition: background-color 0.2s;
    }

    .btn:hover {
      background-color: var(--bg-tertiary);
    }

    /* Tables Container */
    .table-container {
      background-color: var(--bg-secondary);
      border: 1px solid var(--border-color);
      border-radius: 12px;
      overflow: hidden;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      text-align: left;
    }

    th {
      background-color: #162031;
      padding: 14px 20px;
      font-size: 11px;
      text-transform: uppercase;
      font-weight: 600;
      color: var(--text-muted);
      border-bottom: 1px solid var(--border-color);
    }

    td {
      padding: 16px 20px;
      font-size: 13px;
      border-bottom: 1px solid var(--border-color);
      color: var(--text-main);
    }

    tr:last-child td {
      border-bottom: none;
    }

    .model-link {
      font-weight: 600;
      color: #38bdf8;
      text-decoration: none;
    }

    .model-info-cell {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .model-provider-badge {
      font-size: 10px;
      color: var(--text-muted);
    }

    .badge-manual {
      background-color: #064e3b;
      color: #34d399;
      font-size: 10px;
      padding: 2px 8px;
      border-radius: 12px;
      font-weight: 600;
      display: inline-block;
    }

    /* Toggle Switch Styling */
    .switch {
      position: relative;
      display: inline-block;
      width: 38px;
      height: 22px;
    }

    .switch input {
      opacity: 0;
      width: 0;
      height: 0;
    }

    .slider {
      position: absolute;
      cursor: pointer;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background-color: var(--bg-tertiary);
      transition: .3s;
      border-radius: 34px;
    }

    .slider:before {
      position: absolute;
      content: "";
      height: 16px;
      width: 16px;
      left: 3px;
      bottom: 3px;
      background-color: white;
      transition: .3s;
      border-radius: 50%;
    }

    input:checked + .slider {
      background-color: var(--success);
    }

    input:checked + .slider:before {
      transform: translateX(16px);
    }

    /* Logs Area Styling */
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
      white-space: pre-wrap;
    }
  </style>
</head>
<body>

  <!-- Left Sidebar -->
  <div class="sidebar">
    <div class="brand">
      <div class="brand-logo">L</div>
      <div class="brand-title">LiteLLM</div>
      <div class="brand-version">v1.93.0</div>
    </div>

    <!-- Gateway section -->
    <div class="menu-group">
      <div class="menu-header">AI Gateway</div>
      <a class="menu-item"><span class="menu-icon">🔑</span> Virtual Keys</a>
      <a class="menu-item"><span class="menu-icon">🛝</span> Playground</a>
      <a class="menu-item active"><span class="menu-icon">🌐</span> Models + Endpoints</a>
      <a class="menu-item"><span class="menu-icon">🤖</span> Agentic</a>
      <a class="menu-item"><span class="menu-icon">🔌</span> MCP Servers</a>
    </div>

    <!-- Observability section -->
    <div class="menu-group">
      <div class="menu-header">Observability</div>
      <a class="menu-item"><span class="menu-icon">📊</span> Usage</a>
      <a class="menu-item"><span class="menu-icon">📝</span> Logs</a>
      <a class="menu-item"><span class="menu-icon">🛡️</span> Guardrails</a>
    </div>

    <!-- Access section -->
    <div class="menu-group">
      <div class="menu-header">Access Control</div>
      <a class="menu-item"><span class="menu-icon">👥</span> Teams</a>
      <a class="menu-item"><span class="menu-icon">👤</span> Internal Users</a>
      <a class="menu-item"><span class="menu-icon">💰</span> Budgets</a>
    </div>
  </div>

  <!-- Main Content Panel -->
  <div class="main-content">
    <div class="top-navbar">
      <div class="top-nav-left">Workspace: <strong>Personal</strong></div>
      <div class="top-nav-right">
        <div class="workspace-badge">Personal Team Workspace</div>
      </div>
    </div>

    <div class="content-body">
      <div class="page-header">
        <h1 class="page-title">Model Management</h1>
        <p class="page-subtitle">Add, configuration and monitor proxy model routing endpoints.</p>
      </div>

      <!-- Optimization Banner -->
      <div class="banner">
        <div class="banner-text">
          <strong>Help shape cost optimization:</strong> We are gathering analytics to improve route load balancing and active budget management algorithms.
        </div>
        <button class="banner-button">Share Feedback</button>
      </div>

      <!-- Live Observability Cards -->
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-label">Total Proxy Requests</div>
          <div class="stat-value" id="req-count">0</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Accumulated Cost Est.</div>
          <div class="stat-value" id="cost-accum">$0.00000</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Active Keys Configured</div>
          <div class="stat-value">1</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">System Health Status</div>
          <div class="stat-value" style="color: var(--success);">Healthy</div>
        </div>
      </div>

      <!-- Tabs -->
      <div class="tabs-bar">
        <div class="tab-item active">All Models</div>
        <div class="tab-item">Add Model</div>
        <div class="tab-item">LLM Credentials</div>
        <div class="tab-item">Health Status</div>
      </div>

      <!-- Search & Filters -->
      <div class="filter-bar">
        <input type="text" class="search-input" placeholder="Search model names..." id="search-box">
        <button class="btn">Filters</button>
        <button class="btn">Reset Filters</button>
      </div>

      <!-- Models Table -->
      <div class="table-container">
        <table>
          <thead>
            <tr>
              <th>Model ID</th>
              <th>Model Information</th>
              <th>Credentials</th>
              <th>Created By</th>
              <th>Costs (In/Out)</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody id="models-tbody">
            <tr>
              <td><a class="model-link" href="#">gpt-4o</a></td>
              <td>
                <div class="model-info-cell">
                  <strong>openai/gpt-4o</strong>
                  <span class="model-provider-badge">Mapped to local mock endpoint</span>
                </div>
              </td>
              <td><span class="badge-manual">Manual</span></td>
              <td>Defined in config</td>
              <td>In: $2.50 / Out: $10.00</td>
              <td>
                <label class="switch">
                  <input type="checkbox" checked>
                  <span class="slider"></span>
                </label>
              </td>
            </tr>
            <tr>
              <td><a class="model-link" href="#">claude-sonnet-4-6</a></td>
              <td>
                <div class="model-info-cell">
                  <strong>anthropic/claude-sonnet-4-6</strong>
                  <span class="model-provider-badge">anthropic proxy</span>
                </div>
              </td>
              <td><span class="badge-manual">Manual</span></td>
              <td>Defined in config</td>
              <td>In: $3.00 / Out: $15.00</td>
              <td>
                <label class="switch">
                  <input type="checkbox" checked>
                  <span class="slider"></span>
                </label>
              </td>
            </tr>
            <tr>
              <td><a class="model-link" href="#">claude-haiku-4-5</a></td>
              <td>
                <div class="model-info-cell">
                  <strong>anthropic/claude-haiku-4-5</strong>
                  <span class="model-provider-badge">anthropic proxy</span>
                </div>
              </td>
              <td><span class="badge-manual">Manual</span></td>
              <td>Defined in config</td>
              <td>In: $1.00 / Out: $4.00</td>
              <td>
                <label class="switch">
                  <input type="checkbox" checked>
                  <span class="slider"></span>
                </label>
              </td>
            </tr>
            <tr>
              <td><a class="model-link" href="#">gemini-3.5-flash</a></td>
              <td>
                <div class="model-info-cell">
                  <strong>google/gemini-3.5-flash</strong>
                  <span class="model-provider-badge">google proxy</span>
                </div>
              </td>
              <td><span class="badge-manual">Manual</span></td>
              <td>Defined in config</td>
              <td>In: $0.075 / Out: $0.30</td>
              <td>
                <label class="switch">
                  <input type="checkbox" checked>
                  <span class="slider"></span>
                </label>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Real-time Logs section -->
      <div class="logs-section">
        <div class="logs-header">
          <div class="pulse-dot"></div>
          <span>Real-time Captured Proxy Requests</span>
        </div>
        <div id="logs-container" style="display: flex; flex-direction: column; gap: 10px;">
          <div style="color: var(--text-muted); font-size: 13px; font-style: italic;">Waiting for incoming metrics requests...</div>
        </div>
      </div>

    </div>
  </div>

  <script>
    // Live update metrics and captured logs from API
    async function updateMetrics() {
      try {
        const res = await fetch('/api/metrics');
        const data = await res.json();
        
        // Update stats
        document.getElementById('req-count').textContent = data.requestsCount;
        document.getElementById('cost-accum').textContent = '$' + data.totalCost.toFixed(5);
        
        // Update logs list
        const container = document.getElementById('logs-container');
        if (data.logs.length === 0) {
          container.innerHTML = '<div style="color: var(--text-muted); font-size: 13px; font-style: italic;">Waiting for incoming metrics requests...</div>';
        } else {
          container.innerHTML = data.logs.map(log => \`
            <div class="log-row">
              <div class="log-meta">
                <span>⏰ \${log.timestamp}</span>
                <span>🤖 Model: \${log.model}</span>
                <span>💡 Tokens: \${log.promptTokens} In / \${log.completionTokens} Out</span>
                <span>💵 Cost: \$\${log.cost.toFixed(5)}</span>
              </div>
              <div class="log-content">User query: "\${log.messages[0]?.content || ''}"</div>
            </div>
          \`).join('');
        }
      } catch (e) {
        console.error('Error fetching metrics', e);
      }
    }

    // Refresh every 1 second
    setInterval(updateMetrics, 1000);
    updateMetrics();

    // Table Filtering
    document.getElementById('search-box').addEventListener('input', function(e) {
      const val = e.target.value.toLowerCase();
      const rows = document.querySelectorAll('#models-tbody tr');
      rows.forEach(row => {
        const text = row.querySelector('td').textContent.toLowerCase();
        if (text.includes(val)) {
          row.style.display = '';
        } else {
          row.style.display = 'none';
        }
      });
    });
  </script>
</body>
</html>
`);
  } 
  else {
    res.writeHead(404);
    res.end();
  }
});

mockLiteLLMServer.listen(4000, () => {
  console.log('Mock LiteLLM Proxy Server and Dashboard running at http://localhost:4000');
});

// 2. Define the Custom LiteLLM Gateway for Mastra
class LiteLLMGateway extends MastraModelGateway {
  readonly id = 'litellm';
  readonly name = 'LiteLLM Proxy Gateway';

  async fetchProviders(): Promise<Record<string, ProviderConfig>> {
    return {
      'litellm-provider': {
        name: 'LiteLLM Proxy',
        models: ['gpt-4o', 'claude-3-5-sonnet'], // Supported models configured in LiteLLM
        apiKeyEnvVar: 'LITELLM_API_KEY',
        gateway: 'litellm',
      },
    };
  }

  async getApiKey(): Promise<string> {
    return process.env.LITELLM_API_KEY ?? 'mock-key';
  }

  async resolveLanguageModel({ modelId, apiKey }: { modelId: string; providerId: string; apiKey: string }) {
    return createOpenAI({
      apiKey,
      baseURL: 'http://localhost:4000/v1',
    }).chat(modelId);
  }
}

// 3. Create the Agent using our LiteLLM provider
const litellmAgent = new Agent({
  id: 'litellm-agent',
  name: 'LiteLLM Monitored Agent',
  instructions: 'You are an agent whose usage metrics are tracked by a LiteLLM proxy gateway.',
  model: 'litellm/litellm-provider/gpt-4o',
});

// 4. Initialize Mastra with our Custom Gateway
const mastra = new Mastra({
  agents: { litellmAgent },
  gateways: {
    litellm: new LiteLLMGateway(),
  },
});

// 5. Execute the Agent
async function main() {
  const agent = mastra.getAgent('litellmAgent');

  console.log('Sending message to LiteLLM Monitored Agent...');
  
  process.env.LITELLM_API_KEY = 'mock-key-123';

  const response = await agent.generate('Explain the benefit of LiteLLM in one sentence.');
  
  console.log('Agent Response:');
  console.log(response.text.trim());

  // Wait for keypress before closing server
  await waitForKey();
  rl.close();
  mockLiteLLMServer.close();
}

main().catch(async (error) => {
  console.error(error);
  await waitForKey();
  rl.close();
  mockLiteLLMServer.close();
});
