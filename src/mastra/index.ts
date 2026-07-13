import { Mastra } from '@mastra/core/mastra';
import { PinoLogger } from '@mastra/loggers';
import { LibSQLStore } from '@mastra/libsql';
import { DuckDBStore } from "@mastra/duckdb";
import { MastraCompositeStore } from '@mastra/core/storage';
import { Observability, MastraStorageExporter, MastraPlatformExporter, SensitiveDataFilter } from '@mastra/observability';
import { type ProviderConfig, MastraModelGateway } from '@mastra/core/llm';
import { createOpenAI } from '@ai-sdk/openai';

// Workflows imports
import { weatherWorkflow } from './workflows/weather-workflow';
import { publishWorkflow } from './workflows/publish-pipeline';
import { hitlWorkflow } from './workflows/hitl-pipeline';
import { contentPipeline } from '../examples/ex10-aaas/workflows/content-pipeline';

// Agents imports
import { weatherAgent } from './agents/weather-agent';
import { summarizerAgent } from './agents/summarizer-agent';
import { travelAdvisorAgent } from './agents/travel-advisor-agent';
import { tutorAgent } from './agents/tutor-agent';
import { writerAgent } from '../examples/ex10-aaas/agents/writer-agent';
import { editorAgent } from '../examples/ex10-aaas/agents/editor-agent';

// Scorers
import { toolCallAppropriatenessScorer, completenessScorer, translationScorer } from './scorers/weather-scorer';

// Custom gateway routing LLM calls through local database-backed LiteLLM Proxy on port 4000
class LiteLLMRealGateway extends MastraModelGateway {
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

export const mastra = new Mastra({
  workflows: { weatherWorkflow, publishWorkflow, hitlWorkflow, contentPipeline },
  agents: { weatherAgent, summarizerAgent, travelAdvisorAgent, tutorAgent, writerAgent, editorAgent },
  scorers: { toolCallAppropriatenessScorer, completenessScorer, translationScorer },
  gateways: {
    litellm: new LiteLLMRealGateway(),
  },
  storage: new MastraCompositeStore({
    id: 'composite-storage',
    default: new LibSQLStore({
      id: "mastra-storage",
      url: "file:./mastra.db",
    }),
    domains: {
      observability: await new DuckDBStore().getStore('observability'),
    }
  }),
  logger: new PinoLogger({
    name: 'Mastra',
    level: 'info',
  }),
  observability: new Observability({
    configs: {
      default: {
        serviceName: 'mastra',
        exporters: [
          new MastraStorageExporter(),
          new MastraPlatformExporter(),
        ],
        spanOutputProcessors: [
          new SensitiveDataFilter(),
        ],
      },
    },
  }),
});
