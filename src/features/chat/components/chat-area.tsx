"use client";

import ChatInput from "./chat-input";
import MessageBubble from "./message-bubble";
import MessageBubbleLoading from "./message-bubble-loading";
import { useChat } from "../hooks/use-chat"; // Updated import path
import { ChatHistoryDebug } from "@/components/chat-history-debug";

export default function ChatArea() {
  const { messages, sendMessage, clearMessages, isLoading, error } = useChat();

  return (
    <>
      <div className="bg-white/50 rounded-t-lg p-6 flex flex-col flex-grow">
        <div className="flex-grow space-y-4 overflow-y-auto">
          {messages.map((msg) => (
            <MessageBubble key={msg.id} message={msg.text} role={msg.role} />
          ))}
          {isLoading && <MessageBubbleLoading />}
          {error && (
             <MessageBubble key="error" message={`Error: ${error}`} role="ai" />
          )}
        </div>
        {messages.length > 0 && (
          <div className="pt-4">
            <div className="flex justify-end">
              <button
                onClick={clearMessages}
                className="bg-transparent hover:underline text-sm text-gray-500 cursor-pointer"
              >
                Rensa chatten
              </button>
            </div>
            <ChatHistoryDebug messages={messages} />
          </div>
        )}
      </div>
      <ChatInput onSendMessage={sendMessage} />
    </>
  );
}
