'use client';

import { useState } from 'react';
import { Message } from '@/types';

interface ChatHistoryDebugProps {
  messages: Message[];
}

export function ChatHistoryDebug({ messages }: ChatHistoryDebugProps) {
  const [isVisible, setIsVisible] = useState(false);

  // Only show in development mode
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  // Get the latest user message with history
  const latestUserMessage = messages
    .filter(msg => msg.role === 'user')
    .slice(-1)[0];

  if (!latestUserMessage || !latestUserMessage.history) {
    return null;
  }

  return (
    <div className="border-t pt-4 mt-4">
      <button
        onClick={() => setIsVisible(!isVisible)}
        className="text-sm text-gray-500 hover:text-gray-700 underline"
      >
        {isVisible ? 'Hide' : 'Show'} Chat History Debug
      </button>
      
      {isVisible && (
        <div className="mt-2 p-3 bg-gray-50 rounded text-xs font-mono">
          <div className="mb-2 font-semibold text-gray-700">
            Chat History Sent with Latest Message:
          </div>
          <div className="whitespace-pre-wrap text-gray-600 max-h-48 overflow-y-auto">
            {latestUserMessage.history || '(No history)'}
          </div>
          <div className="mt-2 text-gray-500">
            Length: {latestUserMessage.history.length} characters
          </div>
        </div>
      )}
    </div>
  );
} 