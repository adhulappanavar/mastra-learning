import { Agent } from '@mastra/core/agent';

export const summarizerAgent = new Agent({
  id: 'summarizer-agent',
  name: 'Summarizer Agent',
  instructions: `You are an expert summarizer. Your task is to analyze the provided text and produce a structured, high-quality summary.
Your summary must:
- Start with a single-sentence overview of the text.
- Provide a list of key points or bullet points.
- Highlight any actionable insights or important names/dates if present.
- Keep the language concise and clear.`,
  model: 'google/gemini-3.5-flash',
});
