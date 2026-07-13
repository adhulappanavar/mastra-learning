import { Agent } from '@mastra/core/agent';
import { MCPClient } from '@mastra/mcp';

async function main() {
  console.log('--- Model Context Protocol (MCP) Setup Demonstration ---');

  // 1. Initializing MCP Client to connect to external servers
  console.log('Configuring MCPClient with standard servers...');
  
  const mcpClient = new MCPClient({
    id: 'learning-mcp-client',
    servers: {
      // Connect to a local stdio-based server (e.g. Memory server or Filesystem server)
      filesystem: {
        command: 'npx',
        args: ['-y', '@modelcontextprotocol/server-filesystem', '/Users/anildhulappanavar/work/AI-Tooling'],
      },
      // Connect to a remote SSE endpoint (e.g. remote tool providers)
      braveSearch: {
        url: new URL('https://api.search.brave.com/mcp/sse'), // example endpoint
      }
    }
  });

  console.log('Initialized client.');
  
  // 2. Listing tools from the MCP servers to pass to the agent
  console.log('Fetching available tools from the MCP Client...');
  // Note: mcpClient.listTools() will make active stdio/SSE calls to discover schemas
  // We wrap it in a mock demo context to prevent runtime crashes if servers are not active.
  try {
    const mcpTools = mcpClient.listTools();
    
    // 3. Registering discovered tools with an Agent
    const mcpAgent = new Agent({
      id: 'mcp-agent',
      name: 'MCP Enabled Agent',
      instructions: 'You are an agent with access to external tools via the Model Context Protocol.',
      model: 'google/gemini-3.5-flash',
      tools: {
        ...mcpTools, // Pass all dynamically loaded MCP tools
      }
    });

    console.log(`Registered agent "${mcpAgent.name}" with ${Object.keys(mcpTools).length} MCP tools!`);
  } catch (error) {
    console.log('Discovery failed (as expected without live servers running).');
    console.log('Below is the clean code structure to achieve this:');
    console.log(`
      import { Agent } from '@mastra/core/agent';
      import { MCPClient } from '@mastra/mcp';

      const mcpClient = new MCPClient({
        id: 'my-mcp-client',
        servers: {
          hackernews: {
            command: 'npx',
            args: ['-y', '@devabdultech/hn-mcp-server'],
          }
        }
      });

      const tools = mcpClient.listTools();
      const agent = new Agent({
        id: 'agent-with-mcp',
        model: 'google/gemini-3.5-flash',
        tools: { ...tools }
      });
    `);
  }
}

main().catch(console.error);
