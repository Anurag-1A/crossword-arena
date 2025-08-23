"use client";

import { useEffect, useRef, useState } from "react";
import { addDoc, collection, onSnapshot, orderBy, query, serverTimestamp } from "firebase/firestore";
import { db } from "@/firebase/clientApp";
import { useUser } from "@clerk/nextjs";

type Msg = { sender: "player" | "ai"; message: string; timestamp?: any };

export default function ChatBox({ gameId }: { gameId: string }) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const { user } = useUser();
  const scroller = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const q = query(collection(db, "chat_messages", gameId, "messages"), orderBy("timestamp", "asc"));
    const unsub = onSnapshot(q, (snap) => {
      setMessages(snap.docs.map((d) => d.data() as Msg));
      setTimeout(() => scroller.current?.scrollTo({ top: scroller.current.scrollHeight }), 0);
    });
    return () => unsub();
  }, [gameId]);

  const send = async () => {
    const text = input.trim();
    if (!text) return;
    setInput("");
    await addDoc(collection(db, "chat_messages", gameId, "messages"), {
      sender: "player",
      message: text,
      timestamp: serverTimestamp(),
      name: user?.firstName || "Player",
    });
  };

  return (
    <div className="flex flex-col h-full">
      <div ref={scroller} className="flex-1 overflow-y-auto mb-3 border p-2 rounded space-y-2">
        {messages.length === 0 && <p className="text-gray-500 text-sm">No messages yet…</p>}
        {messages.map((m, i) => (
          <div key={i} className={m.sender === "player" ? "text-blue-700" : "text-orange-700"}>
            <b>{m.sender === "player" ? "You" : "AI"}:</b> {m.message}
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="flex-1 border rounded px-2 py-1"
          placeholder="Type a message…"
          onKeyDown={(e) => e.key === "Enter" && send()}
        />
        <button onClick={send} className="px-3 py-1 bg-blue-600 text-white rounded">Send</button>
      </div>
    </div>
  );
}
