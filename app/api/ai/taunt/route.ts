// app/api/ai/taunt/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

// --- gentle helpers (do NOT over-strip) ---
function limitWords(s: string, max = 12) {
  const parts = s.trim().split(/\s+/);
  return parts.slice(0, max).join(" ");
}
// remove *only* common emoji blocks; leave normal letters & punctuation intact
function stripSomeEmojis(s: string) {
  // basic emoji blocks; avoids touching ASCII letters
  return s.replace(
    /[\u{1F300}-\u{1F6FF}\u{1F900}-\u{1F9FF}\u{1FA70}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}]/gu,
    ""
  );
}
function sanitizeLight(raw: string) {
  let s = raw.replace(/\r?\n/g, " ").trim();         // one line
  s = s.replace(/[*_~`]+/g, "");                     // strip markdown styling
  s = s.replace(/\s+/g, " ");                        // collapse spaces
  s = stripSomeEmojis(s);                            // remove emojis only
  s = s.replace(/^["'“”‘’\-\–\—\·\•\›\»]+/, "");     // trim leading quotes/bullets/dashes
  s = limitWords(s, 12);
  return s.trim();
}

const FALLBACKS = [
  "Claimed it.",
  "That one's mine.",
  "Snatched it.",
  "Edge taken.",
  "Booked it.",
  "Sealed the clue.",
];

export async function POST(req: Request) {
  try {
    const { state, playerName, word, remaining, playerScore, aiScore } = await req.json();

    const prompt = [
      "Role: You are a witty but friendly crossword rival.",
      "Task: Reply with EXACTLY ONE short sentence (<= 12 words).",
      "Style: Playful, confident; no toxicity; no emojis; no hashtags; no markdown.",
      state ? `Game state: ${state}` : "",
      typeof remaining === "number" ? `Words remaining: ${remaining}` : "",
      typeof playerScore === "number" && typeof aiScore === "number"
        ? `Scores -> Player: ${playerScore}, AI: ${aiScore}` : "",
      playerName ? `Player name: ${playerName}` : "",
      word ? `Solved word: ${word}` : "",
      "Return only the sentence. No quotes. No list numbering."
    ].filter(Boolean).join("\n");

    const res = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { temperature: 1.0, topP: 0.95, topK: 40, maxOutputTokens: 32 },
    });

    const raw = res.response.text() || "";
    const sanitized = sanitizeLight(raw);

    // DEBUG: show each stage so you can verify nothing collapses
    console.log("[taunt raw]", JSON.stringify(raw));
    console.log("[taunt sanitized]", JSON.stringify(sanitized));

    const taunt = sanitized || FALLBACKS[Math.floor(Math.random() * FALLBACKS.length)];
    return NextResponse.json({ taunt, source: sanitized ? "gemini" : "fallback" });
  } catch (e: any) {
    console.error("[/api/ai/taunt] error:", e?.message || e);
    const taunt = FALLBACKS[Math.floor(Math.random() * FALLBACKS.length)];
    return NextResponse.json({ taunt, source: "fallback" }, { status: 200 });
  }
}
