"use client";
import Link from "next/link";
import { useUser } from "@clerk/nextjs";

export default function Home() {
  const { isSignedIn, user, isLoaded } = useUser();

  return (
    <main className="flex flex-col items-center p-10">
      <h1 className="text-3xl font-bold">Crossword Battle Arena</h1>

      {!isLoaded ? (
        <p className="mt-4 text-lg">Loading…</p>
      ) : isSignedIn ? (
        <>
          <p className="mt-4 text-lg">Welcome back, {user?.firstName || "Player"} 👋</p>
          <Link
            href="/lobby"
            className="mt-6 px-5 py-2 rounded bg-green-600 text-white hover:bg-green-700"
          >
            Start New Game
          </Link>
        </>
      ) : (
        <p className="mt-4 text-lg">
          Please sign in from the top-right to start playing.
        </p>
      )}
    </main>
  );
}
