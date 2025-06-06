export interface Message {
  id: string;
  text: string;
  role: "user" | "ai";
  timestamp: Date;
  history?: string;
} 