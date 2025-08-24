"use client";

import { useEffect, useState } from "react";
import { db } from "@/firebase/clientApp";
import { doc, onSnapshot } from "firebase/firestore";

import Scoreboard from "./Scoreboard";
import CrosswordGrid from "./CrosswordGrid";
import CluesPanel from "./CluesPanel";
import ChatBox from "./ChatBox";
import AIRunner from "./AIRunner";
import EndGameModal from "./EndGameModal"; 
import { useRouter } from "next/navigation";

import { PUZZLES, getPuzzleById } from "@/data/puzzles";
import { createGame, setGameTotals } from "@/lib/gameService";

import { useUser } from "@clerk/nextjs";
import { applyUserStatsOnce } from "@/lib/gameService";


export default function GamePage({ gameId }: { gameId: string }) {
  const router = useRouter();
  const { user } = useUser();
  // subscribe to game to know when it's completed + scores
  const [gameStatus, setGameStatus] = useState<"active" | "completed">("active");
  const [winner, setWinner] = useState<"player" | "ai" | null>(null);
  const [playerScore, setPlayerScore] = useState(0);
  const [aiScore, setAiScore] = useState(0);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, "games", gameId), (snap) => {
      const d = snap.data() as
        | {
            game_status?: "active" | "completed";
            winner?: "player" | "ai" | null;
            player_score?: number;
            ai_score?: number;
          }
        | undefined;

      setGameStatus(d?.game_status ?? "active");
      setWinner(d?.winner ?? null);
      setPlayerScore(d?.player_score ?? 0);
      setAiScore(d?.ai_score ?? 0);
    });
    return () => unsub();
  }, [gameId]);

  useEffect(() => {
  if (gameStatus === "completed" && user?.id) {
    applyUserStatsOnce({ gameId, userId: user.id }).catch(() => {});
    }
  }, [gameStatus, user?.id, gameId]);


  // "Play Again" → start a fresh random game and route into it
  const handlePlayAgain = async () => {
    const pick = PUZZLES[Math.floor(Math.random() * PUZZLES.length)];
    const newId = await createGame(pick.id);
    const puzzle = getPuzzleById(pick.id)!;
    await setGameTotals(newId, puzzle.words.length);
    router.push(`/game/${newId}`);
  };

  return (
    <main className="flex flex-col h-screen">
      {/* Scoreboard */}
      <div className="p-4 bg-gray-900 text-white">
        <Scoreboard gameId={gameId} />
      </div>

      {/* Main game area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left side: Crossword grid + clues */}
        <div className="flex flex-col flex-1 p-6 overflow-y-auto">
          <h1 className="text-2xl font-bold mb-4">Crossword Battle</h1>
          <div className="flex gap-6">
            <CrosswordGrid gameId={gameId} />
            <CluesPanel gameId={gameId} />
          </div>
        </div>

        {/* Right side: Chat */}
        <div className="w-80 border-l border-gray-300 p-4">
          <ChatBox gameId={gameId} />
        </div>
      </div>

      {/* AI loop (only runs for the ai_owner internally) */}
      <AIRunner gameId={gameId} />

      {/* End-of-game modal */}
      <EndGameModal
        open={gameStatus === "completed"}
        winner={winner}
        playerScore={playerScore}
        aiScore={aiScore}
        // Back to lobby:
        // onClose is optional; modal blocks by design when game is done
        // Buttons are inside the modal:
        //  - Back to Lobby
        //  - Play Again )
      >
        <div className="mt-4 flex gap-2">
          <button
            onClick={() => router.push("/lobby")}
            className="flex-1 rounded-lg bg-blue-600 text-white px-4 py-2 hover:bg-blue-700"
          >
            Back to Lobby
          </button>
          <button
            onClick={handlePlayAgain}
            className="flex-1 rounded-lg bg-green-600 text-white px-4 py-2 hover:bg-green-700"
          >
            Play Again
          </button>
        </div>
      </EndGameModal>
    </main>
  );
}

