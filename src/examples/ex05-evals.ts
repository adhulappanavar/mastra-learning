import { Agent } from '@mastra/core/agent';
import { Mastra } from '@mastra/core/mastra';
import { createScorer } from '@mastra/core/evals';

// 1. Define the Agent to evaluate
const codeAgent = new Agent({
  id: 'code-agent',
  name: 'Code Agent',
  instructions: 'You write code blocks in JavaScript/TypeScript based on user requests. Always wrap code in standard markdown code blocks (e.g. ```javascript).',
  model: 'google/gemini-2.0-flash',
});

// 2. Define a Custom Evaluator (Scorer)
// This scorer validates if the agent output correctly returned a markdown code block (```)
const codeBlockScorer = createScorer({
  id: 'code-block-scorer',
  description: 'Checks if the assistant response contains markdown code block formatting.',
})
  .preprocess(({ run }) => {
    return { outputText: run.output || '' };
  })
  .analyze(({ results }) => {
    const text = results.preprocessStepResult?.outputText || '';
    const hasCodeBlock = text.includes('```');
    return { hasCodeBlock };
  })
  .generateScore(({ results }) => {
    return results.analyzeStepResult?.hasCodeBlock ? 1 : 0;
  })
  .generateReason(({ score }) => {
    return score === 1 
      ? 'Pass: The response successfully contains markdown code blocks.' 
      : 'Fail: The response did not contain code block formatting.';
  });

// 3. Initialize Mastra
const mastra = new Mastra({
  agents: { codeAgent },
});

// 4. Execute the Agent and Run the Scorer Manually
async function main() {
  const agent = mastra.getAgent('codeAgent');
  
  console.log('Query: "Write a function to add two numbers in JavaScript."');
  
  // We provide a mocked LLM output so that the evaluation pipeline runs successfully
  // even if you hit Gemini free-tier daily rate limits!
  const mockAgentResponse = `
Here is the code to add two numbers in JavaScript:

\`\`\`javascript
function add(a, b) {
  return a + b;
}
\`\`\`
  `.trim();

  console.log('\n--- Simulated Agent Output ---');
  console.log(mockAgentResponse);

  console.log('\n----------------------------------------\n');
  console.log('Evaluating Simulated Output using Scorer...');

  // Manually run the scorer with the mocked input/output
  const evalResultMock = await codeBlockScorer.run({
    input: 'Write a function to add two numbers in JavaScript.',
    output: mockAgentResponse,
  });

  console.log(`Evaluation Score (Mocked): ${evalResultMock.score} / 1`);
  console.log(`Reason (Mocked): ${evalResultMock.reason}`);

  // Try calling the live LLM
  console.log('\n----------------------------------------\n');
  console.log('Attempting live LLM generation (subject to quota limits)...');
  try {
    const response = await agent.generate('Write a function to add two numbers in JavaScript.');
    console.log('\n--- Live Agent Output ---');
    console.log(response.text.trim());

    const evalResultLive = await codeBlockScorer.run({
      input: 'Write a function to add two numbers in JavaScript.',
      output: response.text,
    });

    console.log(`Evaluation Score (Live): ${evalResultLive.score} / 1`);
    console.log(`Reason (Live): ${evalResultLive.reason}`);
  } catch (error) {
    console.log('\nLive LLM Call skipped/failed (possibly due to daily rate limit quotas).');
    console.log('Ensure you have a valid billing plan or wait for the quota window to reset.');
  }
}

main().catch(console.error);
