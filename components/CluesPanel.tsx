"use client";

import { useEffect, useMemo, useState } from "react";
import { db } from "@/firebase/clientApp";
import { doc, onSnapshot } from "firebase/firestore";
import { getPuzzleById } from "@/data/puzzles";

export default function CluesPanel({ gameId }: { gameId: string }) {
  const [puzzleId, setPuzzleId] = useState<string | null>(null);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, "games", gameId), (snap) => {
      setPuzzleId(snap.data()?.puzzle_id || null);
    });
    return () => unsub();
  }, [gameId]);

  const puzzle = useMemo(() => (puzzleId ? getPuzzleById(puzzleId) : null), [puzzleId]);

  if (!puzzle) return <div className="w-64">Loading clues…</div>;

  const across = puzzle.words.filter(w => w.direction === "across").sort((a,b)=>a.number-b.number);
  const down   = puzzle.words.filter(w => w.direction === "down").sort((a,b)=>a.number-b.number);

  return (
    <div className="w-64">
      <h2 className="font-bold mb-2">Across</h2>
      <ul className="text-sm space-y-1 mb-4">
        {across.map(w => (
          <li key={w.id}><b>{w.number}.</b> {w.clue} ({w.answer.length})</li>
        ))}
      </ul>

      <h2 className="font-bold mb-2">Down</h2>
      <ul className="text-sm space-y-1">
        {down.map(w => (
          <li key={w.id}><b>{w.number}.</b> {w.clue} ({w.answer.length})</li>
        ))}
      </ul>
    </div>
  );
}
