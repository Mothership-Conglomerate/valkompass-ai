import { NextRequest, NextResponse } from "next/server";
import { Message } from "@/types";
import { getGeminiChatResponse } from "@/lib/gemini-service";
import { withAnalytics, getUserId } from "@/lib/middleware/analytics";
import { trackEvent } from "@/lib/posthog";

async function chatHandler(req: NextRequest) {
  const startTime = Date.now();
  const userId = getUserId(req);
  
  try {
    const body = await req.json();
    const userMessage: Message = body.message;

    if (!userMessage || typeof userMessage.text !== 'string') {
      return NextResponse.json({ error: "Invalid message format" }, { status: 400 });
    }

    // Track chat message event (backend only)
    await trackEvent(userId, 'chat_message_sent', {
      message_length: userMessage.text.length,
      message_type: 'user',
    });

    const aiTextResponse = await getGeminiChatResponse(userMessage.text, userMessage.history);

    const aiResponse: Message = {
      id: Date.now(), // Simple ID generation
      text: aiTextResponse,
      role: "ai",
      timestamp: new Date(),
      history: userMessage.history || '', // Include the history from user message or empty string
    };

    const duration = Date.now() - startTime;

    // Track successful chat response (backend only)
    await trackEvent(userId, 'chat_response_generated', {
      response_length: aiTextResponse.length,
      duration_ms: duration,
      success: true,
    });

    return NextResponse.json({ message: aiResponse }, { status: 200 });
  } catch (error) {
    console.error("Error processing chat request in API route:", error);
    
    const duration = Date.now() - startTime;
    
    // Track chat error (backend only)
    await trackEvent(userId, 'chat_error', {
      error_message: error instanceof Error ? error.message : 'Unknown error',
      duration_ms: duration,
    });
    
    // Check if the error is an instance of Error to safely access message property
    const errorMessage = error instanceof Error ? error.message : "Failed to process chat request due to an internal error.";
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

export const POST = withAnalytics(chatHandler);
