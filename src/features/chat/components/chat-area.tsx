"use client";

import ChatInput from "./chat-input";
import MessageBubble from "./message-bubble";
import { useState } from "react";

interface Message {
  id: number;
  text: string;
  role: "user" | "ai";
}

export default function ChatArea() {
  const [messages, setMessages] = useState<Message[]>([]);

  const handleSendMessage = (message: string) => {
    setMessages([...messages, { id: messages.length + 1, text: message, role: "user" as const }]);
  };

  // Placeholder messages - in a real app, this would come from state
  const messagesa = [
    { id: 1, text: "Hej! Hur kan jag hjälpa till idag?", role: "ai" as const },
    { id: 2, text: "Jag undrar över X.", role: "user" as const },
    { id: 3, text: "Intressant fråga! Låt mig kolla upp det.", role: "ai" as const },
  ];

  return (
    <>
      <div className="flex-grow bg-gray-50 rounded-t-lg shadow-lg p-6 space-y-4 overflow-y-auto">
        {messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg.text} role={msg.role} />
        ))}
      </div>
      <ChatInput onSendMessage={handleSendMessage} />
    </>
  );
}
