import { createStep, createWorkflow } from '@mastra/core/workflows';
import { z } from 'zod';

// Step 1: Generate raw draft using writerAgent
const writeStep = createStep({
  id: 'write-draft',
  inputSchema: z.object({
    topic: z.string(),
  }),
  outputSchema: z.object({
    draft: z.string(),
  }),
  execute: async ({ inputData, mastra }) => {
    console.log(`[Step 1/3] Generating raw draft for topic: "${inputData.topic}"...`);
    const writer = mastra.getAgent('writerAgent');
    const response = await writer.generate(`Write a short draft story about: ${inputData.topic}`);
    const draft = response.text.trim();
    console.log(`-> Draft Generated: "${draft}"`);
    return { draft };
  },
});

// Step 2: Deterministic analyzer step (checks word count and characters)
const analyzeStep = createStep({
  id: 'analyze-draft',
  inputSchema: z.object({
    draft: z.string(),
  }),
  outputSchema: z.object({
    wordCount: z.number(),
    charCount: z.number(),
    draft: z.string(),
  }),
  execute: async ({ inputData }) => {
    console.log(`[Step 2/3] Analyzing raw draft metrics...`);
    const words = inputData.draft.split(/\s+/).filter(Boolean);
    const metrics = {
      wordCount: words.length,
      charCount: inputData.draft.length,
      draft: inputData.draft,
    };
    console.log(`-> Metrics calculated - Words: ${metrics.wordCount}, Characters: ${metrics.charCount}`);
    return metrics;
  },
});

// Step 3: Edit and polish draft using editorAgent
const editStep = createStep({
  id: 'edit-draft',
  inputSchema: z.object({
    wordCount: z.number(),
    charCount: z.number(),
    draft: z.string(),
  }),
  outputSchema: z.object({
    finalStory: z.string(),
  }),
  execute: async ({ inputData, mastra }) => {
    console.log(`[Step 3/3] Editing raw draft based on metrics (Word Count: ${inputData.wordCount})...`);
    const editor = mastra.getAgent('editorAgent');
    const prompt = `Refine this raw draft:\n"${inputData.draft}"\n\nEditor Note: The raw draft is ${inputData.wordCount} words. Make it punchier and polished.`;
    const response = await editor.generate(prompt);
    const finalStory = response.text.trim();
    console.log(`-> Final Edited Story: "${finalStory}"`);
    return { finalStory };
  },
});

// Assemble the Workflow DAG
export const contentPipeline = createWorkflow({
  id: 'content-pipeline-workflow',
  inputSchema: z.object({
    topic: z.string(),
  }),
  outputSchema: z.object({
    finalStory: z.string(),
  }),
})
  .then(writeStep)
  .then(analyzeStep)
  .then(editStep)
  .commit();
