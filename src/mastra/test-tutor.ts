import { mastra } from './index';

async function main() {
  const agent = mastra.getAgent('tutorAgent');
  const threadId = 'tutor-thread-' + Date.now();

  console.log(`Starting session with threadId: ${threadId}`);

  console.log('\n--- Turn 1 ---');
  console.log('User: "Hi, I am John. I want to learn TypeScript today!"');
  try {
    const response1 = await agent.generate('Hi, I am John. I want to learn TypeScript today!', {
      threadId,
    });
    console.log('Tutor:', response1.text);
  } catch (error) {
    console.error('Turn 1 error:', error);
  }

  console.log('\n--- Turn 2 ---');
  console.log('User: "What was my name again, and what did I want to learn today?"');
  try {
    const response2 = await agent.generate('What was my name again, and what did I want to learn today?', {
      threadId,
    });
    console.log('Tutor:', response2.text);
  } catch (error) {
    console.error('Turn 2 error:', error);
  }
}

main().catch(console.error);
