import { Agent } from '@mastra/core/agent';
import { Mastra } from '@mastra/core/mastra';
import { type ProviderConfig, MastraModelGateway } from '@mastra/core/llm';
import { createOpenAI } from '@ai-sdk/openai';

// 1. Define the Custom Gateway pointing to the REAL local LiteLLM Proxy on port 4000
class LiteLLMRealGateway extends MastraModelGateway {
  readonly id = 'litellm';
  readonly name = 'Real LiteLLM Proxy Gateway';

  async fetchProviders(): Promise<Record<string, ProviderConfig>> {
    return {
      'writer-provider': {
        name: 'Writer Proxy',
        models: ['gpt-4o'], // Mapped to gemini-3.5-flash in litellm-config.yaml
        apiKeyEnvVar: 'LITELLM_API_KEY',
        gateway: 'litellm',
      },
      'coder-provider': {
        name: 'Coder Proxy',
        models: ['gpt-4o'], // Mapped to gemini-3.5-flash in litellm-config.yaml
        apiKeyEnvVar: 'LITELLM_API_KEY',
        gateway: 'litellm',
      },
    };
  }

  async getApiKey(): Promise<string> {
    // When DB is enabled, LiteLLM expects a valid key starting with 'sk-' (like our Master Key)
    return process.env.LITELLM_MASTER_KEY ?? 'sk-mastra-proxy-key-123';
  }

  async resolveLanguageModel({ modelId, providerId, apiKey }: { modelId: string; providerId: string; apiKey: string }) {
    // We target the real LiteLLM server on port 4000, passing the providerId as a custom header
    return createOpenAI({
      apiKey,
      baseURL: 'http://localhost:4000/v1',
      headers: {
        'x-mastra-provider': providerId,
      },
    }).chat(modelId);
  }
}

// 2. Define the Creative Writer Agent
const writerAgent = new Agent({
  id: 'writer-agent',
  name: 'Creative Writer Agent',
  instructions: 'You write short, engaging 1-sentence creative stories.',
  model: 'litellm/writer-provider/gpt-4o',
});

// 3. Define the Coder Agent
const coderAgent = new Agent({
  id: 'coder-agent',
  name: 'Software Coder Agent',
  instructions: 'You write a 1-sentence explanation of software terms.',
  model: 'litellm/coder-provider/gpt-4o',
});

// 4. Initialize Mastra
const mastra = new Mastra({
  agents: { writerAgent, coderAgent },
  gateways: {
    litellm: new LiteLLMRealGateway(),
  },
});

// 5. Execute agents routing through the real LiteLLM proxy
async function main() {
  console.log('Sending requests to the REAL LiteLLM Proxy on http://localhost:4000...');
  
  const writer = mastra.getAgent('writerAgent');
  const coder = mastra.getAgent('coderAgent');

  try {
    // Request 1: Writer Agent (routes via LiteLLM -> Gemini 3.5 Flash)
    console.log('\n🤖 Sending request to Writer Agent...');
    const res1 = await writer.generate('Write a story about a spaceship exploring a new galaxy.');
    console.log('Writer response from Gemini (via LiteLLM):');
    console.log(res1.text.trim());

    console.log('\n----------------------------------------\n');

    // Request 2: Coder Agent (routes via LiteLLM -> Gemini 3.5 Flash)
    console.log('🤖 Sending request to Coder Agent...');
    const res2 = await coder.generate('Explain what a closure is in JavaScript.');
    console.log('Coder response from Gemini (via LiteLLM):');
    console.log(res2.text.trim());
    
    console.log('\n========================================');
    console.log('🎉 Both agents successfully executed and completed requests!');
    console.log('Open http://localhost:4000/ in your browser to inspect the real LiteLLM Admin UI dashboard!');
    console.log('========================================');
  } catch (error) {
    console.error('Error during client execution:', error);
  }
}

main().catch(console.error);
