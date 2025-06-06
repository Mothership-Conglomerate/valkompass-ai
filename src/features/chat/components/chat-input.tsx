import { useState, useRef } from 'react';

interface ChatInputProps {
  onSendMessage: (message: string) => void;
}

export default function ChatInput({ onSendMessage }: ChatInputProps) {
  const [inputValue, setInputValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSend = () => {
    if (inputValue.trim()) {
      onSendMessage(inputValue);
      setInputValue(''); // Clear input after sending
      // Close keyboard on mobile after sending
      inputRef.current?.blur();
    }
  };

  return (
    <div className="bg-white/40 rounded-b-lg p-3 sm:p-4 border-t border-gray-200/50">
      <div className="flex items-stretch gap-2">
        <input
          ref={inputRef}
          type="text"
          className="flex-1 px-4 py-3 sm:py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-base resize-none transition-all duration-200"
          placeholder="Skriv ditt meddelande..."
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          // Prevent zoom on iOS
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck="false"
        />
        <button
          className="bg-blue-500 hover:bg-blue-600 active:bg-blue-700 text-white font-semibold px-4 py-3 sm:px-6 rounded-lg cursor-pointer transition-colors duration-200 touch-manipulation min-w-[60px] sm:min-w-[80px] flex items-center justify-center"
          onClick={handleSend}
          disabled={!inputValue.trim()}
          aria-label="Skicka meddelande"
        >
          <span className="hidden sm:inline">Skicka</span>
          <svg 
            className="w-5 h-5 sm:hidden" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" 
            />
          </svg>
        </button>
      </div>
    </div>
  );
}
