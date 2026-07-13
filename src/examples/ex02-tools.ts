import { Agent } from '@mastra/core/agent';
import { Mastra } from '@mastra/core/mastra';
import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

// 1. Create a Custom Tool
const calculatorTool = createTool({
  id: 'calculator-tool',
  description: 'Perform basic math operations: add, subtract, multiply, or divide two numbers.',
  inputSchema: z.object({
    operation: z.enum(['add', 'subtract', 'multiply', 'divide']).describe('The operation to perform'),
    a: z.number().describe('First number'),
    b: z.number().describe('Second number'),
  }),
  outputSchema: z.object({
    result: z.number(),
  }),
  execute: async ({ operation, a, b }) => {
    console.log(`[Tool Execute] Performing: ${a} ${operation} ${b}`);
    switch (operation) {
      case 'add': return { result: a + b };
      case 'subtract': return { result: a - b };
      case 'multiply': return { result: a * b };
      case 'divide': return { result: a / b };
      default: throw new Error('Unsupported operation');
    }
  },
});

// 2. Define the Agent equipped with the Tool
const mathAgent = new Agent({
  id: 'math-agent',
  name: 'Math Agent',
  instructions: 'You are a helpful math assistant. Answer user queries. If a calculation is needed, use the calculator tool.',
  model: 'google/gemini-3.5-flash',
  tools: { calculator: calculatorTool }, // Register tool on agent
});

// 3. Initialize Mastra
const mastra = new Mastra({
  agents: { mathAgent },
});

// 4. Run the Agent
async function main() {
  const agent = mastra.getAgent('mathAgent');
  
  console.log('Asking Math Agent: "What is 142 multiplied by 47?"');
  const response = await agent.generate('What is 142 multiplied by 47?');
  
  console.log('\nResponse:');
  console.log(response.text.trim());
}

main().catch(console.error);
