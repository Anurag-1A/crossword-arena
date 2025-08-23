import "server-only";
// lib/aiService.ts
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" }); 

export async function geminiGuessWord(opts: {
  clue: string; length: number; pattern?: string; // pattern like C?T
}) {
  const { clue, length, pattern } = opts;
  const prompt = [
    "You solve crossword clues. Respond with ONLY the single UPPERCASE answer, no punctuation.",
    `Clue: ${clue}`,
    `Length: ${length}`,
    pattern ? `Known pattern: ${pattern}` : "",
  ].join("\n");

  const res = await model.generateContent(prompt);
  const text = res.response.text().trim().toUpperCase();
  // text formatting
  const guess = text.replace(/[^A-Z]/g, "").slice(0, length);
  return guess;
}

export async function geminiTaunt(context: {
  state: "won_word" | "player_solved" | "close_game" | "losing" | "winning";
  playerName?: string;
  word?: string;
}) {
  const p = [
    "You are a witty but friendly crossword rival.",
    "Reply with a SHORT (max 12 words) one-liner. No emojis.",
    `State: ${context.state}`,
    context.playerName ? `Player: ${context.playerName}` : "",
    context.word ? `Word: ${context.word}` : "",
  ].join("\n");
  const res = await model.generateContent(p);
  return res.response.text().trim();
}
