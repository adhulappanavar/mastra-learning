import { mastra } from './index';

async function main() {
  const agent = mastra.getAgent('travelAdvisorAgent');

  console.log('Sending trip planning request to Travel Advisor Agent...');
  try {
    const response = await agent.generate('I am planning a trip to Tokyo. What should I pack and do?');
    console.log('\n--- Travel Advice Output ---');
    console.log(response.text);
  } catch (error) {
    console.error('Error running agent:', error);
  }
}

main().catch(console.error);
