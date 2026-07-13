import { createStep, createWorkflow } from '@mastra/core/workflows';
import { z } from 'zod';

// Step 1a: Generate Title
const generateTitleStep = createStep({
  id: 'generateTitleStep',
  description: 'Generates a catchy title for the article',
  inputSchema: z.object({
    content: z.string().describe('The article content'),
  }),
  outputSchema: z.object({
    title: z.string(),
  }),
  execute: async ({ inputData, mastra }) => {
    const agent = mastra?.getAgent('summarizerAgent');
    if (!agent) {
      throw new Error('Summarizer agent not found');
    }

    const response = await agent.generate(
      `Generate a short, catchy title (under 10 words) for the following article. Output ONLY the title, no quotes or styling:\n\n${inputData.content}`
    );

    return {
      title: response.text.trim(),
    };
  },
});

// Step 1b: Generate SEO Tags
const generateSeoTagsStep = createStep({
  id: 'generateSeoTagsStep',
  description: 'Generates SEO description and keywords',
  inputSchema: z.object({
    content: z.string().describe('The article content'),
  }),
  outputSchema: z.object({
    description: z.string(),
    keywords: z.array(z.string()),
  }),
  execute: async ({ inputData, mastra }) => {
    const agent = mastra?.getAgent('summarizerAgent');
    if (!agent) {
      throw new Error('Summarizer agent not found');
    }

    const response = await agent.generate(
      `For the following article, extract an SEO description (under 150 characters) and 5 keywords. 
Return the output as a JSON object with keys "description" (string) and "keywords" (array of strings). Do not include markdown code block formatting.`,
      {
        structuredOutput: {
          schema: z.object({
            description: z.string(),
            keywords: z.array(z.string()),
          }),
        },
      }
    );

    // If structured output is used, response.object holds the parsed data
    if (response.object) {
      return response.object;
    }

    // Fallback if not parsed
    try {
      const data = JSON.parse(response.text.trim());
      return {
        description: data.description || '',
        keywords: data.keywords || [],
      };
    } catch {
      return {
        description: 'No description generated.',
        keywords: [],
      };
    }
  },
});

// Step 2: Combine and Publish
const publishStep = createStep({
  id: 'publishStep',
  description: 'Combines title, SEO, and original content into a finalized article',
  inputSchema: z.object({
    generateTitleStep: z.object({ title: z.string() }),
    generateSeoTagsStep: z.object({ description: z.string(), keywords: z.array(z.string()) }),
  }),
  outputSchema: z.object({
    publishedArticle: z.string(),
  }),
  execute: async ({ inputData, context }) => {
    const originalContent = (context?.triggerData as { content?: string })?.content || '';
    const title = inputData.generateTitleStep.title;
    const { description, keywords } = inputData.generateSeoTagsStep;

    const publishedArticle = `
# ${title}

**Meta Description:** ${description}
**Keywords:** ${keywords.join(', ')}

---

${originalContent.trim()}
    `.trim();

    return {
      publishedArticle,
    };
  },
});

// Define and build the Workflow
export const publishWorkflow = createWorkflow({
  id: 'publish-workflow',
  inputSchema: z.object({
    content: z.string().describe('The article content'),
  }),
  outputSchema: z.object({
    publishedArticle: z.string(),
  }),
})
  .parallel([generateTitleStep, generateSeoTagsStep])
  .then(publishStep);

publishWorkflow.commit();
