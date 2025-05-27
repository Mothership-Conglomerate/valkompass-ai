import { GoogleGenerativeAI } from "@google/generative-ai";
import { getOpenAIEmbedding } from "./openai-service";
import { getContextFromKB, RetrievedContext } from "./knowledge-base-service";
import { SYSTEM_INSTRUCTION, SYSTEM_INSTRUCTION_NO_CONTEXT } from "./prompt";

const API_KEY = process.env.GEMINI_API_KEY;

if (!API_KEY) {
  throw new Error("GEMINI_API_KEY is not set in environment variables.");
}

const genAI = new GoogleGenerativeAI(API_KEY);
const model = genAI.getGenerativeModel({
  model: "gemini-1.5-flash-latest",
});

const generationConfig = {
  temperature: 0.7, // Slightly lower temperature for more factual RAG responses
  topK: 1,
  topP: 1,
  maxOutputTokens: 2048,
};

// Chat history will now store user queries and final RAG answers
const chatHistory: { role: "user" | "model"; parts: { text: string }[] }[] = [];

const formatContextForPrompt = (context: RetrievedContext): string => {
  let formattedContext = `Relevant Topic: ${context.topicName}\nDescription: ${context.topicDescription}\n\n`;
  if (context.segments.length > 0) {
    formattedContext += "Relevant Segments from Documents:\n";
    context.segments.forEach((seg, index) => {
      // Include publicUrl in the source information if available
      const sourceInfo = seg.publicUrl 
        ? `(Source URL: ${seg.publicUrl}, Document: ${seg.documentPath}, Page: ${seg.segmentPage || 'N/A'})` 
        : `(Source Document: ${seg.documentPath}, Page: ${seg.segmentPage || 'N/A'})`;
      formattedContext += `  ${index + 1}. Text: "${seg.segmentText}" ${sourceInfo}\n`;
    });
  }
  return formattedContext;
};

export const getGeminiChatResponse = async (userMessageText: string, clientHistory?: string): Promise<string> => {
  try {
    // 1. Get embedding for user message
    const queryEmbedding = await getOpenAIEmbedding(userMessageText);

    // 2. Fetch context from Neo4j
    const retrievedContext = await getContextFromKB(queryEmbedding);
    console.log("Got context from KB", retrievedContext);
    
    let promptForGemini = "";

    let systemInstruction = SYSTEM_INSTRUCTION;
    
    // Include client-side chat history if available
    const historyContext = clientHistory && clientHistory.trim() 
      ? `\nPrevious User Questions:\n${clientHistory}\n\n` 
      : '';
    
    if (retrievedContext && (retrievedContext.segments.length > 0 || retrievedContext.topicName)) {
      const formattedContext = formatContextForPrompt(retrievedContext);
      promptForGemini = `Context:\n${formattedContext}\n\n${historyContext}\n\nUser Question: ${userMessageText}\n\nAnswer:`;
    } else {
      // Fallback if no context is found, or handle as a direct question to Gemini without RAG
      // For now, we'll still use a modified prompt that encourages it to say if it doesn't know from its general knowledge.
      promptForGemini = historyContext + userMessageText; // Send user message directly if no context
      systemInstruction = SYSTEM_INSTRUCTION_NO_CONTEXT;
      console.warn("No specific context found from KB for the query. Proceeding with a general response.");
    }

    const chat = model.startChat({
      generationConfig,
      history: [
        ...chatHistory,
        // Construct a specific history turn for this RAG query if needed,
        // or let the system prompt guide the current turn.
        // For now, the system prompt directly prefaces the user query with context.
      ],
      // Apply system instruction. For some models, system instruction is a specific parameter.
      // For gemini-1.5-flash, it's typically part of the first message or overall instructions.
      // We will prepend it to the user's effective prompt.
    });

    const fullPrompt = systemInstruction + "\n\n" + promptForGemini;
    
    const result = await chat.sendMessage(fullPrompt);
    const response = result.response;
    const text = response.text();

    // Update main chat history with the user's original question and AI's RAG-informed answer
    chatHistory.push({ role: "user", parts: [{ text: userMessageText }] });
    chatHistory.push({ role: "model", parts: [{ text }] });

    if (chatHistory.length > 10) { // Keep history to last 5 exchanges (10 messages)
      chatHistory.splice(0, chatHistory.length - 10);
    }

    return text;
  } catch (error) {
    console.error("Error in RAG pipeline or getting response from Gemini:", error);
    // Provide a more user-friendly error or a fallback response
    if (error instanceof Error && error.message.includes("OPENAI_API_KEY")){
        return "OpenAI API key is not configured correctly. Please check server logs.";
    } else if (error instanceof Error && error.message.includes("Neo4j")){
        return "Could not connect to the knowledge base. Please check server logs.";
    }
    return "Sorry, I encountered an error trying to answer your question. Please try again later.";
  }
}; 