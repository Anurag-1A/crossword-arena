"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createGame, setGameTotals } from "@/lib/gameService";
import { PUZZLES } from "@/data/puzzles";

export default function LobbyPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [puzzleId, setPuzzleId] = useState(PUZZLES[0]?.id ?? "puzzle_1");

  const handleStartGame = async () => {
    try {
      setLoading(true);

      // Pick the selected puzzle (or fall back to a random one)
      const selected =
        PUZZLES.find((p) => p.id === puzzleId) ??
        PUZZLES[Math.floor(Math.random() * PUZZLES.length)];

      if (!selected) {
        alert("No puzzles yet.");
        return;
      }

      // 1) Create Firestore game
      const gameId = await createGame(selected.id);

      // 2) Store total words so we can auto-complete when all are solved
      await setGameTotals(gameId, selected.words.length);

      // 3) Go to the game
      router.push(`/game/${gameId}`);
    } catch (err) {
      console.error(err);
      alert("Failed to start game. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex flex-col items-center justify-center min-h-[70vh] gap-6 p-6">
      <h1 className="text-4xl font-bold">Lobby</h1>
      <p className="text-gray-600">Choose a puzzle and start a new match.</p>

      <div className="flex items-center gap-3">
        <label htmlFor="puzzle" className="text-sm font-medium">
          Puzzle:
        </label>
        <select
          id="puzzle"
          className="border rounded px-3 py-2"
          value={puzzleId}
          onChange={(e) => setPuzzleId(e.target.value)}
        >
          {PUZZLES.map((p) => (
            <option key={p.id} value={p.id}>
              {p.id} ({p.words.length} words)
            </option>
          ))}
        </select>
      </div>

      <button
        onClick={handleStartGame}
        disabled={loading}
        className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-60"
      >
        {loading ? "Starting…" : "Start New Game"}
      </button>
    </main>
  );
}
