import OpenAI from 'openai';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

if (!OPENAI_API_KEY) {
  throw new Error('OPENAI_API_KEY is not set in environment variables.');
}

const openai = new OpenAI({
  apiKey: OPENAI_API_KEY,
});

// Using text-embedding-3-small as it's newer and generally more performant/cost-effective
const EMBEDDING_MODEL = 'text-embedding-3-small';

export const getOpenAIEmbedding = async (text: string): Promise<number[]> => {
  if (!text || text.trim() === '') {
    console.warn('Attempted to get embedding for empty or whitespace-only string.');
    // Return a zero vector or handle as appropriate, but for now, an error or specific handling is better
    throw new Error('Cannot generate embedding for empty text.'); 
  }
  try {
    const response = await openai.embeddings.create({
      model: EMBEDDING_MODEL,
      input: text.replace(/\n/g, ' '), // OpenAI recommends replacing newlines with spaces
      dimensions: 1536, // Match the dimensions of your Neo4j vector index if fixed, or make configurable
    });
    return response.data[0].embedding;
  } catch (error) {
    console.error('Error getting embedding from OpenAI:', error);
    throw new Error('Failed to generate text embedding via OpenAI.');
  }
}; 