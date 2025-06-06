export interface Message {
  id: number;
  text: string;
  role: "user" | "ai";
  timestamp: Date;
  history: string;
} 