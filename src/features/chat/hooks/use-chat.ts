import { useState } from 'react';
import { Message } from '@/types';
import { sendMessageToApi } from '../api/chat-api';

/**
 * Formats chat history into a string representation
 * @param messages Array of messages to format
 * @param maxLength Maximum length of the formatted history (default: 5000)
 * @returns Formatted history string truncated to maxLength
 */
const formatChatHistory = (messages: Message[], maxLength: number = 5000): string => {
  if (messages.length === 0) {
    return '';
  }

  // Filter to only include user messages, not AI responses
  const userMessages = messages.filter(msg => msg.role === 'user');
  
  if (userMessages.length === 0) {
    return '';
  }

  // Format each user message with timestamp
  const formattedMessages = userMessages.map(msg => {
    return `\n${msg.text}`;
  });

  // Join all messages with newlines
  const fullHistory = formattedMessages.join('\n\n');

  // Truncate to maxLength if necessary
  if (fullHistory.length <= maxLength) {
    return fullHistory;
  }

  // Truncate and add indicator
  const truncated = fullHistory.substring(fullHistory.length - maxLength + 20); // Leave room for truncation indicator
  const truncationIndicator = '...[truncated]...\n\n';
  
  // Find the first complete message boundary after truncation
  const firstNewlineIndex = truncated.indexOf('\n\n');
  if (firstNewlineIndex !== -1) {
    return truncationIndicator + truncated.substring(firstNewlineIndex + 2);
  }
  
  return truncationIndicator + truncated;
};

export const useChat = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendMessage = async (messageText: string) => {
    // Format current chat history for this message
    const chatHistory = formatChatHistory(messages);

    const newUserMessage: Message = {
      id: Date.now(), // Using timestamp for unique ID, consider more robust solution for production
      text: messageText,
      role: 'user' as const,
      timestamp: new Date(),
      history: chatHistory, // Include the formatted chat history
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
        history: '', // Error messages don't need history
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
