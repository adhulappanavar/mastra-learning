import { Agent } from '@mastra/core/agent';
import { Mastra } from '@mastra/core/mastra';
import { Memory } from '@mastra/memory';
import { LibSQLStore } from '@mastra/libsql';

// 1. Define the Agent with Memory
const tutorAgent = new Agent({
  id: 'tutor-agent',
  name: 'Tutor Agent',
  instructions: 'You are a helpful programming tutor. Keep your responses short and friendly.',
  model: 'google/gemini-3.5-flash',
  memory: new Memory(), // Enable memory
});

// 2. Initialize Mastra with LibSQL storage provider
const mastra = new Mastra({
  agents: { tutorAgent },
  storage: new LibSQLStore({
    id: 'mastra-storage',
    url: 'file:./mastra.db', // Persist messages in local database file
  }),
});

// 3. Run the Agent in a multi-turn conversation
async function main() {
  const agent = mastra.getAgent('tutorAgent');
  const threadId = 'tutor-session-' + Date.now();
  const resourceId = 'alice-user'; // Explicit resource identifier

  console.log(`Starting chat session. threadId: ${threadId}, resourceId: ${resourceId}\n`);

  // Turn 1
  console.log('User: "Hi! My name is Alice, and I want to learn Python."');
  const res1 = await agent.generate('Hi! My name is Alice, and I want to learn Python.', {
    memory: {
      thread: threadId,
      resource: resourceId,
    },
  });
  console.log('Agent:', res1.text.trim());

  console.log('\n----------------------------------------\n');

  // Turn 2
  console.log('User: "What was my name again, and what language do I want to learn?"');
  const res2 = await agent.generate('What was my name again, and what language do I want to learn?', {
    memory: {
      thread: threadId,
      resource: resourceId,
    },
  });
  console.log('Agent:', res2.text.trim());
}

main().catch(console.error);
