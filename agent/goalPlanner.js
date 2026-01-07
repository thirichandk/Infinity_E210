import { callOllama } from "./ollama.js";

function safeParse(raw) {
  if (!raw) return null;
  if (typeof raw !== "string") return raw;
  try { return JSON.parse(raw); } catch (e) {
    const m = raw.match(/\{[\s\S]*\}/);
    if (m) {
      try { return JSON.parse(m[0]); } catch (er) { /* */ }
    }
    return { intent: "UNKNOWN", target: raw };
  }
}

export async function planGoal(userQuery) {
  const prompt = `
User query: "${userQuery}"

Extract intent and target.
Return JSON ONLY.

{
  "intent": "BUY | BOOK | SEARCH | FIND",
  "target": "what user wants"
}
`;

  const raw = await callOllama(prompt);
  return safeParse(raw);
}
