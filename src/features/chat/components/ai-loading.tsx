"use client";

import { useEffect, useState } from "react";
import { loadingMessages } from "../constants";

interface AILoadingProps {
  messages?: string[]; // optional array of loading messages
  interval?: number;   // ms between message switches (default 2000)
}

export default function AILoading({
  messages = loadingMessages,
  interval = 2000,
}: AILoadingProps) {
  const [msgIndex, setMsgIndex] = useState(0);
  const [dots, setDots] = useState(".");

  // cycle messages
  useEffect(() => {
    const id = setInterval(() => {
      setMsgIndex((i) => (i + 1) % messages.length);
    }, interval);
    return () => clearInterval(id);
  }, [messages.length, interval]);

  // animate ellipsis
  useEffect(() => {
    const dotFrames = [".", "..", "..."];
    const id = setInterval(() => {
      setDots((d) => {
        const next = dotFrames[(dotFrames.indexOf(d) + 1) % dotFrames.length];
        return next;
      });
    }, 500);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="text-gray-500 italic">
      {messages[msgIndex]}{dots}
    </div>
  );
}
