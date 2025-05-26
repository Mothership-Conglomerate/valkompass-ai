"use client";

import ChatInput from "./chat-input";
import MessageBubble from "./message-bubble";
import { useState } from "react";
import { Message } from "../types/types";

export default function ChatArea() {
  const [messages, setMessages] = useState<Message[]>([]);

  const handleSendMessage = (message: string) => {
    setMessages([...messages, { id: messages.length + 1, text: message, role: "user" as const }]);
  };

  const clearMessages = () => {
    setMessages([]);
  };

  return (
    <>
      <div className="flex-grow bg-gray-50 rounded-t-lg shadow-lg p-6 flex flex-col">
        <div className="flex-grow space-y-4 overflow-y-auto">
          {messages.map((msg) => (
            <MessageBubble key={msg.id} message={msg.text} role={msg.role} />
          ))}
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
      <ChatInput onSendMessage={handleSendMessage} />
    </>
  );
}
