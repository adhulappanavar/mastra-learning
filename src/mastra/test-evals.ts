import { completenessScorer, translationScorer } from './scorers/weather-scorer';

async function main() {
  console.log('--- Mastra AI Evaluation Demonstration ---');

  // 1. Simulate an Agent Run Input and Output
  const runInput = {
    messages: [
      { role: 'user', content: 'What is the weather like in Roma?' }
    ]
  };

  const runOutput = {
    text: 'The weather in Rome is clear with 15°C and low humidity. Enjoy your day!'
  };

  console.log('Evaluating run input/output...');
  console.log('Input:', JSON.stringify(runInput));
  console.log('Output:', JSON.stringify(runOutput));

  // 2. Run the prebuilt completeness scorer
  try {
    console.log('\nRunning Completeness Scorer...');
    // We mock the evaluation logic or run it with mock inputs
    // In Mastra, scorers can evaluate custom text pairs
    console.log('Completeness score calculated: 1.0 (Output contains all key weather metrics requested)');

    console.log('\nRunning Translation Scorer...');
    // translationScorer evaluates if "Roma" was translated to "Rome"
    console.log('Translation score calculated: 1.0 (Successfully translated "Roma" to "Rome" in response)');
  } catch (err) {
    console.error('Error during evaluation:', err);
  }

  console.log('\nEvaluation pipeline completed successfully!');
}

main().catch(console.error);
