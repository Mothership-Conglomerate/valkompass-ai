import { Message } from "@/types";

export const sendMessageToApi = async (userMessage: Message): Promise<Message> => {
  const response = await fetch("/api/chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ message: userMessage }),
  });

  if (!response.ok) {
    throw new Error(`API request failed with status ${response.status}`);
  }

  const data = await response.json();
  const message = data.message as Message;
  
  // Ensure timestamp is converted back to Date object from JSON string
  message.timestamp = new Date(message.timestamp);
  
  return message;
};
