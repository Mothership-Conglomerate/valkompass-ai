import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "@google/generative-ai";
import { getOpenAIEmbedding } from "./openai-service";
import { getContextFromKB, RetrievedContext, RetrievedSegment } from "./knowledge-base-service";
import { SYSTEM_INSTRUCTION, SYSTEM_INSTRUCTION_NO_CONTEXT } from "./prompt";

const API_KEY = process.env.GEMINI_API_KEY;

if (!API_KEY) {
  throw new Error("GEMINI_API_KEY is not set in environment variables.");
}

const genAI = new GoogleGenerativeAI(API_KEY);
const model = genAI.getGenerativeModel({
  model: "gemini-2.5-flash",
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

const generateLLMSearchQueries = async (userMessageText: string, clientHistory?: string): Promise<string[]> => {
  const prompt = `Based on the following user message and chat history, generate 1 to 4 concise search queries that can be used to retrieve relevant information from a knowledge base about Swedish politics.
Return the queries as a JSON array of strings. For example: ["query 1", "query 2"].
If the user message is simple and seems like a direct question, you can return an array with just that message as the query.

Chat History:
${clientHistory || "No history provided."}

User Message:
${userMessageText}

Search Queries (JSON array):`;

  try {
    const queryGenModel = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const result = await queryGenModel.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.5,
        maxOutputTokens: 200,
        topK: 1,
        topP: 1,
      },
    });
    const responseText = result.response.text();
    console.log("LLM response for query generation:", responseText);

    let jsonString: string | null = null;

    // 1. Try to extract from a JSON markdown code block
    const markdownMatch = responseText.match(/```(?:json)?\s*(\[[\s\S]*?\])\s*```/);
    if (markdownMatch && markdownMatch[1]) {
      jsonString = markdownMatch[1];
      console.log("Extracted JSON string from markdown block:", jsonString);
    } else {
      // 2. If not in a markdown block, try to find the first standalone JSON array
      const standaloneMatch = responseText.match(/\[[\s\S]*?\]/);
      if (standaloneMatch && standaloneMatch[0]) {
        jsonString = standaloneMatch[0];
        console.log("Extracted JSON string using standalone regex:", jsonString);
      }
    }

    if (jsonString) {
      try {
        // Sanitize the string further: remove leading/trailing whitespace that might break JSON.parse
        jsonString = jsonString.trim();
        const queries = JSON.parse(jsonString);
        if (Array.isArray(queries) && queries.every(q => typeof q === 'string') && queries.length > 0 && queries.length <= 4) {
          console.log("Generated KB search queries:", queries);
          return queries;
        }
        console.warn("Parsed JSON is not a valid query array:", queries);
      } catch (e) {
        console.error("Failed to parse extracted JSON string.", "String was:", jsonString, "Error:", e);
      }
    }
    
    console.warn("Failed to parse LLM-generated queries or invalid format. Falling back to user message.", "Full response was:", responseText);
    return [userMessageText]; // Fallback
  } catch (error) {
    console.error("Error generating search queries with LLM:", error);
    return [userMessageText]; // Fallback to user's original message
  }
};

const mergeAndDeduplicateContexts = (contexts: (RetrievedContext | null)[]): RetrievedContext | null => {
  if (!contexts || contexts.every(c => c === null)) {
    return null;
  }

  const validContexts = contexts.filter(c => c !== null) as RetrievedContext[];
  if (validContexts.length === 0) {
    return null;
  }

  // For simplicity, take topic from the first valid context that has one.
  // A more sophisticated approach might involve LLM-based summarization or ranking.
  const primaryTopicContext = validContexts.find(c => c.topicName && c.topicDescription);
  const topicName = primaryTopicContext?.topicName || "Aggregated Topics";
  const topicDescription = primaryTopicContext?.topicDescription || "Information retrieved from multiple queries.";

  const allSegments: RetrievedSegment[] = [];
  const seenSegments = new Set<string>(); // To track unique segments "text@@@path"

  validContexts.forEach(context => {
    context.segments.forEach(segment => {
      const segmentIdentifier = `${segment.segmentText}@@@${segment.documentPath}`;
      if (!seenSegments.has(segmentIdentifier)) {
        allSegments.push(segment);
        seenSegments.add(segmentIdentifier);
      }
    });
  });

  // Optional: Sort segments by similarity score if needed, though they come pre-sorted per query.
  // For now, maintaining the order from concatenated results.

  return {
    topicName,
    topicDescription,
    segments: allSegments,
  };
};

export const getGeminiChatResponse = async (userMessageText: string, clientHistory?: string): Promise<string> => {
  try {
    // 1. Generate search queries using LLM
    const searchQueries = await generateLLMSearchQueries(userMessageText, clientHistory);
    console.log("Search queries", searchQueries);
    // 2. For each query: get embedding and fetch context from Neo4j in parallel
    const contextPromises = searchQueries.map(async (query) => {
      try {
        const queryEmbedding = await getOpenAIEmbedding(query);
        // Fetch with a limit of 15 segments per query
        return await getContextFromKB(queryEmbedding, 15); 
      } catch (error) {
        console.error(`Error fetching context for query "${query}":`, error);
        return null; // Return null if a specific query fails
      }
    });

    const retrievedContextsArray = await Promise.all(contextPromises);
    
    // 3. Merge and deduplicate contexts
    const mergedContext = mergeAndDeduplicateContexts(retrievedContextsArray);
    
    let promptForGemini = "";
    let systemInstruction = SYSTEM_INSTRUCTION;
    
    const historyContext = clientHistory && clientHistory.trim() 
      ? `\nRecent Chat History:\n${clientHistory}\n\n` 
      : '';
    
    if (mergedContext && (mergedContext.segments.length > 0 || mergedContext.topicName)) {
      const formattedContext = formatContextForPrompt(mergedContext);
      promptForGemini = `Context:\\n${formattedContext}${historyContext}User Question: ${userMessageText}\\n\\nAnswer:`;
    } else {
      promptForGemini = historyContext + userMessageText;
      systemInstruction = SYSTEM_INSTRUCTION_NO_CONTEXT;
      console.warn("No specific context found from KB for any query. Proceeding with a general response.");
    }

    const chat = model.startChat({
      generationConfig,
      history: [
        ...chatHistory,
      ],
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