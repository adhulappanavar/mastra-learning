import { Agent } from '@mastra/core/agent';

export const writerAgent = new Agent({
  id: 'writerAgent',
  name: 'Creative Writer Agent',
  instructions: 'You write short drafts of creative stories based on topics. Keep it under 2 sentences.',
  model: 'litellm/writer-provider/gpt-4o',
});
