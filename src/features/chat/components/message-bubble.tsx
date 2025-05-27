import ReactMarkdown from 'react-markdown';
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize';
import { deepmerge } from 'deepmerge-ts';

interface MessageBubbleProps {
  message: string;
  role: "user" | "ai";
}

export default function MessageBubble({ message, role }: MessageBubbleProps) {
  const isUser = role === "user";

  const customSchema = deepmerge(defaultSchema, {
    attributes: {
      ...defaultSchema.attributes,
      // Allow class attribute for syntax highlighting if you use rehype-prism or similar
      // e.g. code: [...(defaultSchema.attributes?.code || []), 'className'],
      // Allow id attribute for headers if needed for linking
      '*': [...(defaultSchema.attributes?.['*'] || []), 'id'],
    },
    // Add any tags you want to allow that might be stripped by default
    // For example, if you want to allow iframes (though be careful with these)
    // tagNames: [...(defaultSchema.tagNames || []), 'iframe'],
  });

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`prose p-3 rounded-lg max-w-lg text-white ${
          isUser ? "bg-indigo-500" : "bg-blue-500"
        } whitespace-pre-line`}
      >
        {isUser ? (
          message
        ) : (
          <ReactMarkdown rehypePlugins={[[rehypeSanitize, customSchema]]}>
            {message}
          </ReactMarkdown>
        )}
      </div>
    </div>
  );
}
