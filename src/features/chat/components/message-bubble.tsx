interface MessageBubbleProps {
  message: string;
  role: "user" | "ai";
}

export default function MessageBubble({ message, role }: MessageBubbleProps) {
  const isUser = role === "user";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`p-3 rounded-lg max-w-xs text-white ${
          isUser ? "bg-indigo-500" : "bg-blue-500"
        }`}
      >
        {message}
      </div>
    </div>
  );
}
