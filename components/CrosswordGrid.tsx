"use client";

import { useEffect, useMemo, useState } from "react";
import { getPuzzleById } from "@/data/puzzles";
import { db } from "@/firebase/clientApp";
import { doc, onSnapshot } from "firebase/firestore";
import { solveWordAtomic, subscribeSolvedWords } from "@/lib/gameService";
import clsx from "clsx";

type Cell = {
  row: number; col: number;
  solution?: string;        // correct letter
  number?: number;          // clue number (rendered small in corner)
  wordIds: string[];        // words passing through this cell (e.g., ["A1","D2"])
};

export default function CrosswordGrid({ gameId }: { gameId: string }) {
  const [puzzleId, setPuzzleId] = useState<string | null>(null);
  const [activeWordId, setActiveWordId] = useState<string | null>(null);
  const [grid, setGrid] = useState<Cell[][]>([]);
  const [typingMap, setTypingMap] = useState<Record<string, string>>({});
  const [lockedBy, setLockedBy] = useState<Map<string, "player" | "ai">>(new Map());
  const [submitting, setSubmitting] = useState(false);

  // 1) listen to game doc to get puzzle_id
  useEffect(() => {
    const unsub = onSnapshot(doc(db, "games", gameId), (snap) => {
      const data = snap.data();
      if (data?.puzzle_id) setPuzzleId(data.puzzle_id as string);
    });
    return () => unsub();
  }, [gameId]);

  const puzzle = useMemo(() => (puzzleId ? getPuzzleById(puzzleId) : null), [puzzleId]);

  // 2) build 10x10 grid and place letters + clue numbers
  useEffect(() => {
    if (!puzzle) return;
    const N = puzzle.size;
    const g: Cell[][] = Array.from({ length: N }, (_, r) =>
      Array.from({ length: N }, (_, c) => ({ row: r, col: c, wordIds: [] as string[] }))
    );

    puzzle.words.forEach((w) => {
      for (let i = 0; i < w.answer.length; i++) {
        const r = w.row + (w.direction === "down" ? i : 0);
        const c = w.col + (w.direction === "across" ? i : 0);
        const cell = g[r][c];
        cell.solution = w.answer[i];
        cell.wordIds.push(w.id);
        if (i === 0) cell.number = w.number;
      }
    });

    setGrid(g);
    setTypingMap({});         // reset local typing when puzzle changes
    setActiveWordId(null);    // clear selection
  }, [puzzle]);

  // 3) subscribe to solved_words to lock/paint words (who solved what)
  useEffect(() => {
    if (!puzzleId) return;
    const unsub = subscribeSolvedWords(gameId, (rows) => {
      const m = new Map<string, "player" | "ai">();
      rows.forEach(({ id, data }) => {
        const who = (data.solved_by as "player" | "ai") || undefined;
        if (who) m.set(id, who);
      });
      setLockedBy(m);
    });
    return () => unsub();
  }, [gameId, puzzleId]);

  // active word cells set (for yellow highlight)
  const activeCells = useMemo(() => {
    if (!activeWordId || !puzzle) return new Set<string>();
    const w = puzzle.words.find((x) => x.id === activeWordId);
    if (!w) return new Set<string>();
    const ids = new Set<string>();
    for (let i = 0; i < w.answer.length; i++) {
      const r = w.row + (w.direction === "down" ? i : 0);
      const c = w.col + (w.direction === "across" ? i : 0);
      ids.add(`${r}-${c}`);
    }
    return ids;
  }, [activeWordId, puzzle]);

  // click a cell -> select one of the words crossing it
  const onCellClick = (r: number, c: number) => {
    if (!puzzle) return;
    const wids = grid[r]?.[c]?.wordIds || [];
    // prefer an unsolved word if both across/down cross here
    const firstUnsolved = wids.find((wid) => !lockedBy.get(wid));
    setActiveWordId(firstUnsolved ?? wids[0] ?? null);
  };

  // type a letter (only for unlocked cells)
  const onType = (r: number, c: number, ch: string) => {
    const key = `${r}-${c}`;
    setTypingMap((m) => ({ ...m, [key]: ch.toUpperCase().slice(-1) }));
  };

  // submit active word if fully and correctly typed
  const trySubmitActiveWord = async () => {
    if (!puzzle || !activeWordId || submitting) return;
    const w = puzzle.words.find((x) => x.id === activeWordId);
    if (!w) return;

    // skip if already solved by someone
    if (lockedBy.get(w.id)) return;

    // build the string from current typing
    let built = "";
    for (let i = 0; i < w.answer.length; i++) {
      const r = w.row + (w.direction === "down" ? i : 0);
      const c = w.col + (w.direction === "across" ? i : 0);
      const key = `${r}-${c}`;
      built += (typingMap[key] || "").toUpperCase();
    }

    if (built.length !== w.answer.length) return; // incomplete
    if (built !== w.answer) return;               // incorrect

    try {
      setSubmitting(true);
      await solveWordAtomic({ gameId, wordId: w.id, word: w.answer, solvedBy: "player" });
      // clear local typing for that word (board will re-render from solved_words)
      setTypingMap((m) => {
        const copy = { ...m };
        for (let i = 0; i < w.answer.length; i++) {
          const r = w.row + (w.direction === "down" ? i : 0);
          const c = w.col + (w.direction === "across" ? i : 0);
          delete copy[`${r}-${c}`];
        }
        return copy;
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (!puzzle || grid.length === 0) {
    return <div className="text-sm text-gray-500">Loading puzzle…</div>;
  }

  const N = puzzle.size;

  return (
    <div className="flex flex-col">
      <div className="grid" style={{ gridTemplateColumns: `repeat(${N}, 2.25rem)` }}>
        {grid.flatMap((row, r) =>
          row.map((cell, c) => {
            const key = `${r}-${c}`;
            const isActive = activeCells.has(key);
            const isBlocked = !cell.solution; // empty spots = black cells

            // is this cell part of any solved word?
            const solvedByForCell: "player" | "ai" | null = (() => {
              for (const wid of cell.wordIds) {
                const who = lockedBy.get(wid);
                if (who) return who;
              }
              return null;
            })();

            const locked = Boolean(solvedByForCell);
            const bgClass = isBlocked
              ? "bg-black cursor-not-allowed"
              : locked
              ? solvedByForCell === "player"
                ? "bg-blue-200"
                : "bg-red-200"
              : isActive
              ? "bg-yellow-200"
              : "bg-white";

            // show typed value only if not locked; otherwise show the correct solution letter
            const displayValue = locked
              ? (cell.solution ?? "")
              : (typingMap[key] || "");

            // live per-cell correctness color (only when user typed)
            const correctnessClass =
              !locked && displayValue
                ? displayValue === cell.solution
                  ? "text-green-600"
                  : "text-red-600"
                : "";

            return (
              <div key={key} className="relative">
                {cell.number && (
                  <span className="absolute top-0 left-0 text-[10px] leading-none p-[2px]">
                    {cell.number}
                  </span>
                )}
                <input
                  disabled={isBlocked || locked}
                  value={displayValue}
                  maxLength={1}
                  onChange={(e) => onType(r, c, e.target.value)}
                  onClick={() => onCellClick(r, c)}
                  className={clsx(
                    "w-9 h-9 border text-center font-bold uppercase",
                    bgClass,
                    isBlocked && "text-transparent",
                    correctnessClass
                  )}
                />
              </div>
            );
          })
        )}
      </div>

      <button
        onClick={trySubmitActiveWord}
        disabled={submitting}
        className={clsx(
          "mt-3 px-3 py-1 rounded text-white",
          submitting ? "bg-blue-300 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700"
        )}
      >
        {submitting ? "Submitting…" : "Submit Word"}
      </button>
    </div>
  );
}
