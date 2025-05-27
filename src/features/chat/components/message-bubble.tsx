import ReactMarkdown from 'react-markdown';

interface MessageBubbleProps {
  message: string;
  role: "user" | "ai";
}

export default function MessageBubble({ message, role }: MessageBubbleProps) {
  const isUser = role === "user";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`prose p-3 rounded-lg max-w-lg text-white ${
          isUser ? "bg-indigo-500" : "bg-blue-500"
        } whitespace-pre-line`}
      >
        {isUser ? message : <ReactMarkdown>{message}</ReactMarkdown>}
      </div>
    </div>
  );
}
