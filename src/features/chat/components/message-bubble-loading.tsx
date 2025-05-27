"use client";

import AILoading from "./ai-loading";

export default function MessageBubbleLoading() {
  return (
    <div className="flex p-4 justify-start">
      <div className="prose p-3 rounded-lg bg-transparent border w-full text-gray-500">
        <AILoading />
      </div>
    </div>
  );
} 