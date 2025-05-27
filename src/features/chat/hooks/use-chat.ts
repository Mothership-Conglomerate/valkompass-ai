import { useState } from 'react';
import { Message } from '@/types';
import { sendMessageToApi } from '../api/chat-api';

export const useChat = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendMessage = async (messageText: string) => {
    const newUserMessage: Message = {
      id: Date.now(), // Using timestamp for unique ID, consider more robust solution for production
      text: messageText,
      role: 'user' as const,
      timestamp: new Date(),
    };
    setMessages((prevMessages) => [...prevMessages, newUserMessage]);
    setIsLoading(true);
    setError(null);

    try {
      const aiMessage = await sendMessageToApi(newUserMessage);
      setMessages((prevMessages) => [...prevMessages, aiMessage]);
    } catch (e) {
      const err = e as Error;
      setError(err.message || 'Failed to get response from AI.');
      // Optionally add an error message to the chat
      const errorMessage: Message = {
        id: Date.now() + 1, // Ensure unique ID
        text: "Sorry, I couldn't get a response. Please try again.",
        role: 'ai' as const,
        timestamp: new Date(),
      };
      setMessages((prevMessages) => [...prevMessages, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const clearMessages = () => {
    setMessages([]);
    setError(null);
  };

  return {
    messages,
    isLoading,
    error,
    sendMessage,
    clearMessages,
  };
};
