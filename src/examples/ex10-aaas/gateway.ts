import { type ProviderConfig, MastraModelGateway } from '@mastra/core/llm';
import { createOpenAI } from '@ai-sdk/openai';

export class LiteLLMRealGateway extends MastraModelGateway {
  readonly id = 'litellm';
  readonly name = 'Real LiteLLM Proxy Gateway';

  async fetchProviders(): Promise<Record<string, ProviderConfig>> {
    return {
      'writer-provider': {
        name: 'Writer Proxy',
        models: ['gpt-4o'], // Mapped to gemini-3.1-flash-lite in litellm-config.yaml
        apiKeyEnvVar: 'LITELLM_MASTER_KEY',
        gateway: 'litellm',
      },
      'editor-provider': {
        name: 'Editor Proxy',
        models: ['gpt-4o'], // Mapped to gemini-3.1-flash-lite in litellm-config.yaml
        apiKeyEnvVar: 'LITELLM_MASTER_KEY',
        gateway: 'litellm',
      },
    };
  }

  async getApiKey(modelId: string): Promise<string> {
    return process.env.LITELLM_MASTER_KEY ?? 'sk-mastra-proxy-key-123';
  }

  buildUrl(modelId: string, envVars: Record<string, string>): string | undefined {
    return 'http://localhost:4000/v1';
  }

  async resolveLanguageModel({ modelId, providerId, apiKey }: { modelId: string; providerId: string; apiKey: string }) {
    return createOpenAI({
      apiKey,
      baseURL: 'http://localhost:4000/v1',
      headers: {
        'x-mastra-provider': providerId,
      },
    }).chat(modelId);
  }
}
