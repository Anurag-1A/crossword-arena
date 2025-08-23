// lib/gameService.ts
import { db } from "@/firebase/clientApp";
import {
  doc,
  setDoc,
  updateDoc,
  serverTimestamp,
  getDoc,
  addDoc,
  collection,
  onSnapshot,
  query,
  orderBy,
  runTransaction,
  increment,
  Unsubscribe,
} from "firebase/firestore";
import { v4 as uuidv4 } from "uuid";

/** Creating new game doc */
export async function createGame(puzzleId: string) {
  const gameId = uuidv4(); // unique id per game
  await setDoc(doc(db, "games", gameId), {
    puzzle_id: puzzleId,
    player_score: 0,
    ai_score: 0,
    solved_count: 0,     // progress counter
    total_words: null,   // set right after with setGameTotals()
    game_status: "active", // "active" | "completed"
    winner: null,          // "player" | "ai" | null
    created_at: serverTimestamp(),
  });
  return gameId;
}

/** Store how many words this puzzle has (call once after createGame) */
export async function setGameTotals(gameId: string, totalWords: number) {
  await updateDoc(doc(db, "games", gameId), {
    total_words: totalWords,
    // solved_count stays 0 (created above)
  });
}

/**
 * Transaction-safe solve.
 * Prevents double scoring if player & AI submit same word close together.
 * Also auto-completes the game when all words are solved.
 */
export async function solveWordAtomic(opts: {
  gameId: string;
  wordId: string;               // e.g., "A1"
  word: string;                 // e.g., "CAT"
  solvedBy: "player" | "ai";
}) {
  const { gameId, wordId, word, solvedBy } = opts;
  const gameRef = doc(db, "games", gameId);
  const wordRef = doc(db, "games", gameId, "solved_words", wordId);

  await runTransaction(db, async (tx) => {
    // If word is already solved it, do nothing
    const wordSnap = await tx.get(wordRef);
    if (wordSnap.exists()) return;

    const gameSnap = await tx.get(gameRef);
    if (!gameSnap.exists()) throw new Error("Game not found");

    const data = gameSnap.data() || {};
    const playerScore = Number(data.player_score ?? 0);
    const aiScore     = Number(data.ai_score ?? 0);
    const solvedCount = Number(data.solved_count ?? 0);
    const totalWords  = (data.total_words ?? null) as number | null;

    // 1) Create solved word record
    tx.set(wordRef, {
      word,
      solved_by: solvedBy, // "player" | "ai"
      timestamp: serverTimestamp(),
    });

    // Incrementing score and solved_count
    const nextSolvedCount = solvedCount + 1;
    const updates: Record<string, any> = {
      solved_count: nextSolvedCount,
      [`${solvedBy}_score`]:
        solvedBy === "player" ? playerScore + 1 : aiScore + 1,
    };

    // 3) If all words solved, close game & set winner
    if (typeof totalWords === "number" && nextSolvedCount >= totalWords) {
      const finalPlayer = solvedBy === "player" ? playerScore + 1 : playerScore;
      const finalAi     = solvedBy === "ai"     ? aiScore + 1     : aiScore;

      updates.game_status = "completed";
      // Tie-breaker rule (adjust if desired): player wins ties
      updates.winner = finalPlayer >= finalAi ? "player" : "ai";
    }

    tx.update(gameRef, updates);
  });
}

/** Optional: manual score adjustment if ever needed */
export async function updateScore(
  gameId: string,
  who: "player" | "ai",
  delta = 1
) {
  await updateDoc(doc(db, "games", gameId), {
    [`${who}_score`]: increment(delta),
  });
}

/** Force end the game (e.g., timeout/quit) */
export async function endGame(gameId: string, winner: "player" | "ai") {
  await updateDoc(doc(db, "games", gameId), {
    game_status: "completed",
    winner,
  });
}

/** Chat: add a message (player or AI) */
export async function addMessage(
  gameId: string,
  sender: "player" | "ai",
  message: string
) {
  await addDoc(collection(db, "chat_messages", gameId, "messages"), {
    sender,
    message,
    timestamp: serverTimestamp(),
  });
}

/** Subscribe to the game doc (score, status, winner, etc.) */
export function subscribeGame(
  gameId: string,
  cb: (data: any | undefined) => void
): Unsubscribe {
  return onSnapshot(doc(db, "games", gameId), (snap) => cb(snap.data()));
}

/** Subscribe to solved words (who solved which word) */
export function subscribeSolvedWords(
  gameId: string,
  cb: (rows: Array<{ id: string; data: any }>) => void
): Unsubscribe {
  const colRef = collection(db, "games", gameId, "solved_words");
  return onSnapshot(colRef, (snap) =>
    cb(snap.docs.map((d) => ({ id: d.id, data: d.data() })))
  );
}

/** Subscribe to chat messages (ordered by time) */
export function subscribeMessages(
  gameId: string,
  cb: (rows: Array<{ id: string; data: any }>) => void
): Unsubscribe {
  const q = query(
    collection(db, "chat_messages", gameId, "messages"),
    orderBy("timestamp", "asc")
  );
  return onSnapshot(q, (snap) =>
    cb(snap.docs.map((d) => ({ id: d.id, data: d.data() })))
  );
}


