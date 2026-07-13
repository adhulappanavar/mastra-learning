import { Agent } from '@mastra/core/agent';
import { Mastra } from '@mastra/core/mastra';

// 1. Define the Agent
const helloAgent = new Agent({
  id: 'hello-agent',
  name: 'Hello Agent',
  instructions: 'You are a friendly assistant. Keep your responses short and sweet (under 2 sentences).',
  model: 'google/gemini-3.5-flash',
});

// 2. Initialize Mastra
const mastra = new Mastra({
  agents: { helloAgent },
});

// 3. Execute the agent
async function main() {
  const agent = mastra.getAgent('helloAgent');
  
  console.log('Sending message to Hello Agent...');
  const response = await agent.generate('Say hello to the world!');
  
  console.log('\nResponse:');
  console.log(response.text.trim());
}

main().catch(console.error);
