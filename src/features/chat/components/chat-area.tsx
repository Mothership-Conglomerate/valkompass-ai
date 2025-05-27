"use client";

import ChatInput from "./chat-input";
import MessageBubble from "./message-bubble";
import { useChat } from "../hooks/use-chat"; // Updated import path

export default function ChatArea() {
  const { messages, sendMessage, clearMessages, isLoading, error } = useChat();

  return (
    <>
      <div className="flex-grow bg-gray-50 rounded-t-lg shadow-lg p-6 flex flex-col">
        <div className="flex-grow space-y-4 overflow-y-auto">
          {messages.map((msg) => (
            <MessageBubble key={msg.id} message={msg.text} role={msg.role} />
          ))}
          {isLoading && (
            <MessageBubble key="loading" message="AI tänker..." role="ai" />
          )}
          {error && (
             <MessageBubble key="error" message={`Error: ${error}`} role="ai" />
          )}
        </div>
        {messages.length > 0 && (
          <div className="pt-4 flex justify-end">
            <button
              onClick={clearMessages}
              className="bg-transparent hover:underline text-sm text-gray-500"
            >
              Rensa chatten
            </button>
          </div>
        )}
      </div>
      <ChatInput onSendMessage={sendMessage} />
    </>
  );
}
