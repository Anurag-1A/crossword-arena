"use client";

import clsx from "clsx";
import type { ReactNode } from "react";

type Props = {
  open: boolean;
  winner: "player" | "ai" | null;
  playerScore: number;
  aiScore: number;
  children?: ReactNode; // <-- add this
};

export default function EndGameModal({
  open,
  winner,
  playerScore,
  aiScore,
  children,
}: Props) {
  if (!open) return null;

  const title =
    winner === "player" ? "You win! 🏆" :
    winner === "ai"     ? "AI wins! 🤖" :
                          "Game Over";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" />

      <div className="relative z-10 w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <h2 className="text-2xl font-bold text-center mb-3">{title}</h2>

        <div className="grid grid-cols-2 gap-3 text-center mb-4">
          <div className="rounded-lg border p-3">
            <div className="text-sm text-gray-500">Player</div>
            <div className={clsx("text-3xl font-extrabold", playerScore >= aiScore ? "text-green-600" : "text-gray-900")}>
              {playerScore}
            </div>
          </div>
          <div className="rounded-lg border p-3">
            <div className="text-sm text-gray-500">AI</div>
            <div className={clsx("text-3xl font-extrabold", aiScore > playerScore ? "text-red-600" : "text-gray-900")}>
              {aiScore}
            </div>
          </div>
        </div>

        {children /* action buttons from GamePage */}
      </div>
    </div>
  );
}
