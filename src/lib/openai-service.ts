import OpenAI from 'openai';
import { trackEmbeddingCall } from './posthog';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

if (!OPENAI_API_KEY) {
  throw new Error('OPENAI_API_KEY is not set in environment variables.');
}

const openai = new OpenAI({
  apiKey: OPENAI_API_KEY,
});

// Using text-embedding-3-small as it's newer and generally more performant/cost-effective
const EMBEDDING_MODEL = 'text-embedding-3-small';
const DIMENSIONS = 1536;

// Rough cost calculation for text-embedding-3-small: $0.00002 per 1K tokens
const calculateEmbeddingCost = (textLength: number): number => {
  // Rough approximation: 1 token ≈ 4 characters
  const estimatedTokens = textLength / 4;
  return (estimatedTokens / 1000) * 0.00002;
};

export const getOpenAIEmbedding = async (text: string, messageId: string, distinctId?: string): Promise<number[]> => {
  if (!text || text.trim() === '') {
    console.warn('Attempted to get embedding for empty or whitespace-only string.');
    throw new Error('Cannot generate embedding for empty text.'); 
  }

  const startTime = Date.now();
  const cleanText = text.replace(/\n/g, ' '); // OpenAI recommends replacing newlines with spaces
  
  try {
    const response = await openai.embeddings.create({
      model: EMBEDDING_MODEL,
      input: cleanText,
      dimensions: DIMENSIONS,
    });

    const duration = Date.now() - startTime;
    const cost = calculateEmbeddingCost(cleanText.length);

    // Track successful embedding call
    if (distinctId) {
      await trackEmbeddingCall(distinctId, 'openai', EMBEDDING_MODEL, {
        textLength: cleanText.length,
        dimensions: DIMENSIONS,
        duration,
        success: true,
        cost,
        messageId,
      });
    }

    return response.data[0].embedding;
  } catch (error) {
    const duration = Date.now() - startTime;
    
    // Track failed embedding call
    if (distinctId) {
      await trackEmbeddingCall(distinctId, 'openai', EMBEDDING_MODEL, {
        textLength: cleanText.length,
        dimensions: DIMENSIONS,
        duration,
        success: false,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        messageId,
      });
    }

    console.error('Error getting embedding from OpenAI:', error);
    throw new Error('Failed to generate text embedding via OpenAI.');
  }
}; 