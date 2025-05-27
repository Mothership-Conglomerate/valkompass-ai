import { useState } from 'react';

interface ChatInputProps {
  onSendMessage: (message: string) => void;
}

export default function ChatInput({ onSendMessage }: ChatInputProps) {
  const [inputValue, setInputValue] = useState('');

  const handleSend = () => {
    if (inputValue.trim()) {
      onSendMessage(inputValue);
      setInputValue(''); // Clear input after sending
    }
  };

  return (
    <div className="bg-white/50 rounded-b-lg p-4 ">
      <div className="flex items-center">
        <input
          type="text"
          className="flex-grow p-3 border border-gray-300 rounded-l-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white/100"
          placeholder="Skriv ditt meddelande..."
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyUp={(e) => {
            if (e.key === 'Enter') {
              handleSend();
            }
          }}
        />
        <button
          className="bg-blue-500 hover:bg-blue-600 text-white font-semibold p-3 rounded-r-md"
          onClick={handleSend}
        >
          Skicka
        </button>
      </div>
    </div>
  );
}
