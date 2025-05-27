import { NextRequest, NextResponse } from "next/server";
import { Message } from "@/types";
import { getGeminiChatResponse } from "@/lib/gemini-service";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const userMessage: Message = body.message;

    if (!userMessage || typeof userMessage.text !== 'string') {
      return NextResponse.json({ error: "Invalid message format" }, { status: 400 });
    }

    const aiTextResponse = await getGeminiChatResponse(userMessage.text);

    const aiResponse: Message = {
      id: Date.now(), // Simple ID generation
      text: aiTextResponse,
      role: "ai",
      timestamp: new Date(),
    };

    return NextResponse.json({ message: aiResponse }, { status: 200 });
  } catch (error) {
    console.error("Error processing chat request in API route:", error);
    // Check if the error is an instance of Error to safely access message property
    const errorMessage = error instanceof Error ? error.message : "Failed to process chat request due to an internal error.";
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
