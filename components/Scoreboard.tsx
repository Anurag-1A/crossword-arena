"use client";

import { useEffect, useState } from "react";
import { db } from "@/firebase/clientApp";
import { doc, onSnapshot } from "firebase/firestore";
import UserStats from "@/components/UserStats";


export default function Scoreboard({ gameId }: { gameId: string }) {
  const [player, setPlayer] = useState(0);
  const [ai, setAi] = useState(0);
  const [status, setStatus] = useState("active");
  const [winner, setWinner] = useState<string | null>(null);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, "games", gameId), (snap) => {
      const d = snap.data() || {};
      setPlayer(d.player_score ?? 0);
      setAi(d.ai_score ?? 0);
      setStatus(d.game_status ?? "active");
      setWinner(d.winner ?? null);
    });
    return () => unsub();
  }, [gameId]);

  return (
  <div className="flex items-center justify-between">
    {/* Left: live scores */}
    <div className="flex gap-6">
      <span>Player: <b>{player}</b></span>
      <span>AI: <b>{ai}</b></span>
    </div>

    {/* Middle: compact user stats (Games / Wins / Losses) */}
    <div className="mx-4 w-28 shrink-0">
      <UserStats compact />
    </div>

    {/* Right: Winner / Status */}
    <div>
      {status === "completed" ? (
        <span className="px-3 py-1 rounded bg-gray-100 text-gray-900">
          Winner: <b>{winner}</b>
        </span>
      ) : (
        <span className="px-3 py-1 rounded bg-gray-100 text-gray-900">
          Game in progress…
        </span>
      )}
    </div>
  </div>
);

}
