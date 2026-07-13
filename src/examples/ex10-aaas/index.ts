import { Mastra } from '@mastra/core/mastra';
import { writerAgent } from './agents/writer-agent';
import { editorAgent } from './agents/editor-agent';
import { contentPipeline } from './workflows/content-pipeline';
import { LiteLLMRealGateway } from './gateway';

// Initialize a self-contained Mastra instance for Ex10
export const mastra = new Mastra({
  agents: { writerAgent, editorAgent },
  workflows: { contentPipeline },
  gateways: {
    litellm: new LiteLLMRealGateway(),
  },
});

// If called directly via TSX, run the client execution pipeline
async function main() {
  // Check if we are running this script directly
  if (process.argv[1]?.endsWith('index.ts') || process.argv[1]?.endsWith('ex10-aaas')) {
    const topic = 'A scientist discovering time-travel using ancient radio frequencies';
    console.log('========================================================');
    console.log(`🚀 Executing self-contained Ex10 (AaaS) for topic:\n"${topic}"`);
    console.log('========================================================\n');

    try {
      const pipeline = mastra.getWorkflow('contentPipeline');
      const run = await pipeline.createRun();

      const workflowResult = await run.start({
        inputData: { topic },
      });

      if (workflowResult.status === 'success') {
        console.log('\n========================================================');
        console.log('🎉 Self-contained AaaS Workflow Executed Successfully!');
        console.log('========================================================');
        console.log('Final Edited Story output:');
        console.log(workflowResult.result.finalStory);
        console.log('========================================================');
      } else {
        console.error('Workflow failed with error:', workflowResult.error);
      }
    } catch (error) {
      console.error('Error executing workflow:', error);
    }
  }
}

main().catch(console.error);
