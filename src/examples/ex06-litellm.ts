import { Agent } from '@mastra/core/agent';
import { Mastra } from '@mastra/core/mastra';
import { type ProviderConfig, MastraModelGateway } from '@mastra/core/llm';
import { createOpenAI } from '@ai-sdk/openai';
import http from 'http';

// 1. Spin up a Mock LiteLLM Proxy Server locally to capture and print metrics
const mockLiteLLMServer = http.createServer((req, res) => {
  if (req.method === 'POST' && req.url === '/v1/chat/completions') {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    req.on('end', () => {
      const parsedBody = JSON.parse(body);
      
      // Capture and print metrics (just like LiteLLM proxy does)
      console.log('\n========================================');
      console.log('⚡ [LiteLLM Proxy Server: Captured Metrics]');
      console.log('========================================');
      console.log(`- Request Timestamp : ${new Date().toISOString()}`);
      console.log(`- Client Agent ID   : ${req.headers['user-agent'] || 'Mastra Agent'}`);
      console.log(`- Target Model      : ${parsedBody.model}`);
      console.log(`- Prompt Tokens     : ${Math.floor(body.length / 4)}`);
      console.log(`- Completion Tokens : 32`);
      console.log(`- Total Est. Cost   : $0.00015`);
      console.log('========================================\n');

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
          prompt_tokens: Math.floor(body.length / 4),
          completion_tokens: 32,
          total_tokens: Math.floor(body.length / 4) + 32,
        },
      };

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(responsePayload));
    });
  } else {
    res.writeHead(404);
    res.end();
  }
});

mockLiteLLMServer.listen(4000, () => {
  console.log('Mock LiteLLM Proxy Server running at http://localhost:4000');
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
    // We instantiate standard OpenAI provider but configure it with LiteLLM's local base URL
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
  // Reference the model: [gateway-id]/[provider]/[model]
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
  
  // We pass a dummy key since our mock local server doesn't require verification
  process.env.LITELLM_API_KEY = 'mock-key-123';

  const response = await agent.generate('Explain the benefit of LiteLLM in one sentence.');
  
  console.log('Agent Response:');
  console.log(response.text.trim());

  // Close the mock server to allow the script to exit
  mockLiteLLMServer.close();
}

main().catch(error => {
  console.error(error);
  mockLiteLLMServer.close();
});
