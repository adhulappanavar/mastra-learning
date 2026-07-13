import { mastra } from './index';

async function main() {
  const workflow = mastra.getWorkflow('hitlWorkflow');

  console.log('--- Case 1: Small Expense ($50) ---');
  const run1 = workflow.createRun();
  const res1 = await run1.start({
    triggerData: {
      amount: 50,
      description: 'Team Lunch',
    },
  });
  console.log('Result:', res1);

  console.log('\n--- Case 2: Large Expense ($250) ---');
  const run2 = workflow.createRun();
  console.log(`Starting run: ${run2.runId}`);
  const res2 = await run2.start({
    triggerData: {
      amount: 250,
      description: 'New Office Chair',
    },
  });
  
  console.log('Immediate return status:', res2.status);

  // Check state to confirm it is suspended
  const runState = await workflow.getWorkflowRunById(run2.runId);
  console.log(`Workflow Run Status in Database: ${runState?.status}`);

  if (runState?.status === 'suspended') {
    console.log('\nSimulating Manager Approval...');
    
    // Resume the workflow with approval data
    const finalRes = await workflow.resume({
      runId: run2.runId,
      stepId: 'approvalStep', // specify the suspended step
      resumeData: {
        approved: true,
        approver: 'Finance Manager',
      },
    });

    console.log('Final workflow result after resume:');
    console.log(finalRes);
  }
}

main().catch(console.error);
