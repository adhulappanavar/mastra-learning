import { Agent } from '@mastra/core/agent';
import { Mastra } from '@mastra/core/mastra';
import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

// Tool 1: Fibonacci Calculator
const fibonacciTool = createTool({
  id: 'fibonacci-tool',
  description: 'Calculate the N-th Fibonacci number.',
  inputSchema: z.object({
    n: z.number().int().nonnegative().describe('The index N of the Fibonacci sequence (0-indexed)'),
  }),
  outputSchema: z.object({
    value: z.number(),
  }),
  execute: async ({ n }) => {
    console.log(`[Tool Execute] Fibonacci called for N = ${n}`);
    let a = 0, b = 1;
    for (let i = 0; i < n; i++) {
      const temp = a;
      a = b;
      b = temp + b;
    }
    return { value: a };
  },
});

// Tool 2: Prime Number Checker
const primeCheckTool = createTool({
  id: 'prime-check-tool',
  description: 'Check if a number is a prime number.',
  inputSchema: z.object({
    number: z.number().int().positive().describe('The integer to check for primality'),
  }),
  outputSchema: z.object({
    isPrime: z.boolean(),
    reason: z.string(),
  }),
  execute: async ({ number }) => {
    console.log(`[Tool Execute] Prime check called for number = ${number}`);
    if (number <= 1) return { isPrime: false, reason: 'Numbers <= 1 are not prime.' };
    for (let i = 2; i <= Math.sqrt(number); i++) {
      if (number % i === 0) {
        return { isPrime: false, reason: `Divisible by ${i}.` };
      }
    }
    return { isPrime: true, reason: 'No divisors found; it is prime.' };
  },
});

// Tool 3: Factorial Calculator
const factorialTool = createTool({
  id: 'factorial-tool',
  description: 'Calculate the factorial of a number.',
  inputSchema: z.object({
    n: z.number().int().nonnegative().max(100).describe('The integer to calculate factorial for'),
  }),
  outputSchema: z.object({
    value: z.number(),
  }),
  execute: async ({ n }) => {
    console.log(`[Tool Execute] Factorial called for N = ${n}`);
    let result = 1;
    for (let i = 2; i <= n; i++) {
      result *= i;
    }
    return { value: result };
  },
});

// 2. Define the Agent equipped with Multiple Tools
const multiMathAgent = new Agent({
  id: 'multi-math-agent',
  name: 'Multi-Math Agent',
  instructions: 'You are an advanced mathematical assistant. Choose the correct tool (fibonacci, prime check, or factorial) depending on what the user asks.',
  model: 'google/gemini-3.5-flash',
  tools: {
    fibonacci: fibonacciTool,
    primeCheck: primeCheckTool,
    factorial: factorialTool,
  },
});

// 3. Initialize Mastra
const mastra = new Mastra({
  agents: { multiMathAgent },
});

// 4. Run the Agent with test queries
async function main() {
  const agent = mastra.getAgent('multiMathAgent');
  
  console.log('--- Query 1: Factorial ---');
  const res1 = await agent.generate('Find the factorial of 6.');
  console.log('Response:', res1.text.trim());

  console.log('\n--- Query 2: Fibonacci + Prime ---');
  const res2 = await agent.generate('Find the 10th Fibonacci number and check if it is a prime number.');
  console.log('Response:', res2.text.trim());
}

main().catch(console.error);
