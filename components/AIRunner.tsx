        "use client";

        import { useEffect, useRef, useState } from "react";
        import { useUser } from "@clerk/nextjs";
        import { db } from "@/firebase/clientApp";
        import {
        doc,
        onSnapshot,
        runTransaction,
        collection,
        onSnapshot as onColSnapshot,
        } from "firebase/firestore";
        import { getPuzzleById } from "@/data/puzzles";
        //import { geminiGuessWord, geminiTaunt } from "@/lib/aiService"; 
        import { solveWordAtomic, addMessage } from "@/lib/gameService";

        type SolverState = {
        isOwner: boolean;
        status: "active" | "completed";
        puzzleId: string | null;
        solvedIds: Set<string>;
        };

        export default function AIRunner({ gameId }: { gameId: string }) {
        const { user } = useUser();
        const [state, setState] = useState<SolverState>({
            isOwner: false,
            status: "active",
            puzzleId: null,
            solvedIds: new Set(),
        });
        const intervalRef = useRef<NodeJS.Timeout | null>(null);
        const lastAiMsgRef = useRef<string>("");
        // 1) Claim AI ownership once (transaction)
        useEffect(() => {
            if (!user?.id) return;
            const gameRef = doc(db, "games", gameId);

            runTransaction(db, async (tx) => {
            const snap = await tx.get(gameRef);
            if (!snap.exists()) return;
            const d: any = snap.data();
            // claim if empty
            if (!d.ai_owner) {
                tx.update(gameRef, { ai_owner: user.id });
            }
            }).catch(() => {/* ignore for now */});
        }, [gameId, user?.id]);

        // 2) Subscribe to game doc (status, puzzle_id, ownership)
        useEffect(() => {
            const gameRef = doc(db, "games", gameId);
            const unsub = onSnapshot(gameRef, (snap) => {
            const d: any = snap.data() || {};
            setState((s) => ({
                ...s,
                status: d.game_status || "active",
                puzzleId: d.puzzle_id || null,
                isOwner: !!user?.id && d.ai_owner === user.id,
            }));
            });
            return () => unsub();
        }, [gameId, user?.id]);

        // 3) Subscribe to solved words (keep a set for quick checks)
        useEffect(() => {
            const col = collection(db, "games", gameId, "solved_words");
            const unsub = onColSnapshot(col, (snap) => {
            const set = new Set<string>();
            snap.forEach((doc) => set.add(doc.id));
            setState((s) => ({ ...s, solvedIds: set }));
            });
            return () => unsub();
        }, [gameId]);

        
        useEffect(() => {
            // clear any existing loop
            if (intervalRef.current) clearInterval(intervalRef.current);

            if (!state.isOwner || state.status !== "active" || !state.puzzleId) return;

            intervalRef.current = setInterval(async () => {
            // loading puzzle
            const puzzle = getPuzzleById(state.puzzleId!);
            if (!puzzle) return;

            // find unsolved words
            const candidates = puzzle.words.filter((w) => !state.solvedIds.has(w.id));
            if (candidates.length === 0) return;

            // pick a random candidate
            const w = candidates[Math.floor(Math.random() * candidates.length)];

            // TODO: Use Gemini guess here. For now, simulate a realistic AI:
            // const guess = await geminiGuessWord({ clue: w.clue, length: w.answer.length });
            const guess = Math.random() < 0.7 ? w.answer : ""; // 70% chance to "get it right" for testing

            if (guess === w.answer) {
            try {
                await solveWordAtomic({ gameId, wordId: w.id, word: w.answer, solvedBy: "ai" });

                let taunt: string | null = null;

                try {
                const res = await fetch("/api/ai/taunt", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ state: "won_word", word: w.answer }),
                    cache: "no-store",
                });

                console.log("[taunt] status:", res.status);
                const rawBody = await res.text();
                console.log("[taunt] raw:", rawBody);

                if (res.ok) {
                    const json = JSON.parse(rawBody);
                    if (json && typeof json.taunt === "string" && json.taunt.trim()) {
                    taunt = json.taunt.trim();
                    } else {
                    console.warn("[taunt] missing taunt in JSON:", json);
                    }
                } else {
                    console.warn("[taunt] HTTP error:", res.status, rawBody);
                }
                } catch (err) {
                console.warn("[taunt] fetch failed:", err);
                }

                // Only now, if still null, use a fallback (so we can prove API wiring)
                if (!taunt) {
                const pool = ["Got one.", "Claimed it.", "That one's mine.", "Snatched it.", "Edge taken.", "Booked it.", "Sealed the clue."];
                taunt = pool[Math.floor(Math.random() * pool.length)];
                }

                // De-dupe by (taunt + word) so each solved word can post
                const key = `${taunt}|${w.id}`;
                if (lastAiMsgRef.current !== key) {
                await addMessage(gameId, "ai", taunt);
                lastAiMsgRef.current = key;
                }
            } catch {
                // ignore race errors
            }
            }

        }, 4000 + Math.random() * 3000); // every 4–7s

            return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
            intervalRef.current = null;
            };
        }, [gameId, state.isOwner, state.status, state.puzzleId, state.solvedIds]);

        return null; // headless
        }
