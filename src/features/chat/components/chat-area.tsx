"use client";

import ChatInput from "./chat-input";
import MessageBubble from "./message-bubble";
import MessageBubbleLoading from "./message-bubble-loading";
import { useChat } from "../hooks/use-chat"; // Updated import path
import { ChatHistoryDebug } from "@/components/chat-history-debug";
import Image from "next/image";

export default function ChatArea() {
  const { messages, sendMessage, clearMessages, isLoading, error } = useChat();

  return (
    <>
      <div className="bg-white/40 rounded-t-lg p-6 flex flex-col flex-grow">
        <div className={`flex-grow overflow-y-auto ${messages.length === 0 && !isLoading && !error ? 'flex items-center justify-center' : ''}`}>
          {messages.length === 0 && !isLoading && !error ? (
            <div className="flex flex-col items-center space-y-4 text-gray-600">
              <Image src={"/valkompass_transparent_no_text.avif"} alt="Valkompass" width={200} height={200} />
              <p className="text-lg font-medium text-gray-500">Skriv din fråga till valkompassen</p>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((msg) => (
                <MessageBubble key={msg.id} message={msg.text} role={msg.role} />
              ))}
              {isLoading && <MessageBubbleLoading />}
              {error && (
                <MessageBubble key="error" message={`Error: ${error}`} role="ai" />
              )}
            </div>
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
