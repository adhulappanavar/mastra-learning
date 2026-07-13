import { createStep, createWorkflow } from '@mastra/core/workflows';
import { z } from 'zod';

const approvalStep = createStep({
  id: 'approvalStep',
  inputSchema: z.object({
    amount: z.number(),
    description: z.string(),
  }),
  suspendSchema: z.object({
    amount: z.number(),
    pending: z.boolean(),
  }),
  resumeSchema: z.object({
    approved: z.boolean(),
    approver: z.string(),
  }),
  execute: async ({ inputData, suspend, resumeData }) => {
    // If the amount is small (< 100), auto-approve without suspending
    if (inputData.amount < 100) {
      return { status: 'auto-approved', approver: 'system' };
    }

    // If we have resumeData, it means it was resumed
    if (resumeData) {
      return {
        status: resumeData.approved ? 'approved' : 'rejected',
        approver: resumeData.approver,
      };
    }

    // Suspend workflow and await approval
    await suspend({
      amount: inputData.amount,
      pending: true,
    });

    return { status: 'suspended', approver: '' };
  },
});

export const hitlWorkflow = createWorkflow({
  id: 'hitl-workflow',
  inputSchema: z.object({
    amount: z.number(),
    description: z.string(),
  }),
  outputSchema: z.object({
    status: z.string(),
    approver: z.string(),
  }),
})
  .then(approvalStep);

hitlWorkflow.commit();
