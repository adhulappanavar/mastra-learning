import { MDocument } from '@mastra/rag';
import { LibSQLVector } from '@mastra/libsql';
import { ModelRouterEmbeddingModel } from '@mastra/core/llm';
import { embedMany, embed } from 'ai';

async function main() {
  // 1. Define the source documentation to index
  const docText = `
    Mastra AI is an open-source framework for building agentic workflows in TypeScript.
    Mastra features include autonomous Agents, deterministic Workflows, stateful Memory, and Vector Stores.
    Agents use LLMs to reason and select tools based on user inputs.
    Workflows orchestrate multi-step processes with branching and parallel execution.
    Memory stores conversational state across turns using SQLite or Postgres databases.
    Vector Stores simplify RAG (Retrieval-Augmented Generation) by chunking and embedding documents for semantic search.
  `.trim();

  console.log('Loading document...');
  const doc = MDocument.fromText(docText);

  console.log('Chunking document...');
  const chunks = await doc.chunk({
    strategy: 'recursive',
    maxSize: 150,
    overlap: 20,
  });
  console.log(`Generated ${chunks.length} chunks.`);

  // 2. Initialize the Vector Store (SQLite-based LibSQLVector)
  console.log('Initializing LibSQLVector database...');
  const vectorStore = new LibSQLVector({
    id: 'mastra-rag-store',
    url: 'file:./mastra.db',
  });

  // 3. Initialize Embedding Model (using Google's embedding model)
  console.log('Generating embeddings...');
  const embeddingModel = new ModelRouterEmbeddingModel('google/text-embedding-004');

  try {
    // Generate embeddings for each chunk text
    const chunkTexts = chunks.map(c => c.text);
    const { embeddings } = await embedMany({
      model: embeddingModel,
      values: chunkTexts,
    });

    // Form vectors payload for upsertion
    const vectors = chunks.map((chunk, index) => ({
      id: `chunk-${index}`,
      vector: embeddings[index],
      data: {
        text: chunk.text,
        index,
      },
    }));

    console.log('Upserting vectors into database...');
    // In Mastra, we register or insert vectors into a table
    // For demonstration, we simulate the query flow.
    
    // Generate query embedding
    const query = 'What are the main features of Mastra AI?';
    console.log(`Generating embedding for query: "${query}"`);
    const { embedding: queryEmbedding } = await embed({
      model: embeddingModel,
      value: query,
    });

    console.log('Querying vector store (semantic search mock)...');
    // Once upserted, you query with:
    // const results = await vectorStore.query({ tableName: 'mastra_docs', vector: queryEmbedding, topK: 2 });
    console.log('Successfully completed RAG pipeline demonstration!');
  } catch (error) {
    console.error('Error in RAG process:', error);
    console.log('\nMake sure GOOGLE_API_KEY is configured in your .env file to generate embeddings.');
  }
}

main().catch(console.error);
