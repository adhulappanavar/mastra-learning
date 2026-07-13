import { mastra } from './index';

async function main() {
  const workflow = mastra.getWorkflow('publishWorkflow');

  console.log('Creating run...');
  const { runId, start } = workflow.createRun();

  console.log(`Executing workflow run ${runId}...`);
  try {
    const result = await start({
      triggerData: {
        content: `
          TypeScript is a strongly typed programming language that builds on JavaScript, giving you better tooling at any scale.
          It was developed and is maintained by Microsoft. By adding static types to JavaScript, it helps catch bugs early and improves developer productivity.
          Mastra utilizes TypeScript extensively to build type-safe agents, tools, and workflows.
        `,
      },
    });
    console.log('\n--- Workflow Execution Result ---');
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('Error running workflow:', error);
  }
}

main().catch(console.error);
