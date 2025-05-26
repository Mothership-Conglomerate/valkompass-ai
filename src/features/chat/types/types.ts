export interface Message {
  id: number;
  text: string;
  role: "user" | "ai";
} 