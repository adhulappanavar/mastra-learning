import { Agent } from '@mastra/core/agent';
import { Mastra } from '@mastra/core/mastra';
import { type ProviderConfig, MastraModelGateway } from '@mastra/core/llm';
import { createOpenAI } from '@ai-sdk/openai';

// 1. Define the Custom LiteLLM Gateway
// This gateway intercepts model requests and forwards the provider's identifier 
// in the 'x-mastra-provider' header so the proxy server can log metrics per-agent.
class LiteLLMGateway extends MastraModelGateway {
  readonly id = 'litellm';
  readonly name = 'LiteLLM Proxy Gateway';

  async fetchProviders(): Promise<Record<string, ProviderConfig>> {
    return {
      'writer-provider': {
        name: 'Writer Agent Proxy',
        models: ['gpt-4o'],
        apiKeyEnvVar: 'LITELLM_API_KEY',
        gateway: 'litellm',
      },
      'coder-provider': {
        name: 'Coder Agent Proxy',
        models: ['gpt-4o'],
        apiKeyEnvVar: 'LITELLM_API_KEY',
        gateway: 'litellm',
      },
    };
  }

  async getApiKey(): Promise<string> {
    return process.env.LITELLM_API_KEY ?? 'mock-key-123';
  }

  async resolveLanguageModel({ modelId, providerId, apiKey }: { modelId: string; providerId: string; apiKey: string }) {
    // Pass the provider identifier as a header to LiteLLM for routing/tagging
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
  instructions: 'You write short, engaging creative stories.',
  model: 'litellm/writer-provider/gpt-4o', // Mapped to writer-provider
});

// 3. Define the Software Coder Agent
const coderAgent = new Agent({
  id: 'coder-agent',
  name: 'Software Coder Agent',
  instructions: 'You write clean code snippets.',
  model: 'litellm/coder-provider/gpt-4o', // Mapped to coder-provider
});

// 4. Initialize Mastra Container with multiple agents and custom gateway
const mastra = new Mastra({
  agents: { writerAgent, coderAgent },
  gateways: {
    litellm: new LiteLLMGateway(),
  },
});

// 5. Main execution routine
async function main() {
  console.log('Starting Client Program...');
  console.log('Sending requests to different agents running through local LiteLLM Proxy...\n');

  // Fetch agents from Mastra container
  const writer = mastra.getAgent('writerAgent');
  const coder = mastra.getAgent('coderAgent');

  // Trigger Request 1: Writer Agent
  console.log('🤖 Triggering Creative Writer Agent request...');
  const res1 = await writer.generate('Write a 1-sentence story about a lonely robot.');
  console.log('Writer Response:', res1.text.trim());

  console.log('\n----------------------------------------\n');

  // Trigger Request 2: Coder Agent
  console.log('🤖 Triggering Software Coder Agent request...');
  const res2 = await coder.generate('Write a TS function to check if a string is palindrome.');
  console.log('Coder Response:', res2.text.trim());

  console.log('\n----------------------------------------');
  console.log('🎉 Both requests finished successfully!');
  console.log('Check your browser at http://localhost:4000/ to see the separate agent metric counts!');
}

main().catch(console.error);
