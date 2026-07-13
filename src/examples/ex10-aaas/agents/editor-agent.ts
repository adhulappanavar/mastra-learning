import { Agent } from '@mastra/core/agent';

export const editorAgent = new Agent({
  id: 'editorAgent',
  name: 'Expert Editor Agent',
  instructions: 'You refine raw drafts based on feedback. Correct any flow issues, make it punchy, and keep it under 2 sentences.',
  model: 'litellm/editor-provider/gpt-4o',
});
