import { mastra } from './index';

async function main() {
  const agent = mastra.getAgent('summarizerAgent');
  
  const textToSummarize = `
    Mastra is an open-source TypeScript framework designed for building production-ready AI agents, workflows, and AI-powered applications. 
    It provides a modular set of primitives that allow developers to integrate AI features into existing web stacks (like React, Next.js, and Node.js) or deploy them as standalone services.
    Mastra includes tools for managing memory, orchestration, data integration, Model Context Protocol (MCP) clients/servers, and observability out of the box.
    Developers love it because it emphasizes type-safety, observability, and structured programming over experimental prompt hacking.
  `;

  console.log('Sending text to Summarizer Agent...');
  try {
    const response = await agent.generate(textToSummarize);
    console.log('\n--- Summary Output ---');
    console.log(response.text);
  } catch (error) {
    console.error('Error running agent:', error);
  }
}

main().catch(console.error);
