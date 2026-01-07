import { callOllama } from "./ollama.js";

function safeParse(raw) {
  if (!raw) return null;
  if (typeof raw !== "string") return raw;
  try {
    return JSON.parse(raw);
  } catch (e) {
    const m = raw.match(/\{[\s\S]*\}/);
    if (m) {
      try { return JSON.parse(m[0]); } catch (er) { /* fallthrough */ }
    }
    return { intent: "UNKNOWN", domain: "unknown", options: [], guidance: raw };
  }
}

export async function resolveIntent(userWish) {
  const prompt = `
User wish: "${userWish}"

Identify:
1. Intent
2. Domain type
3. Suitable websites (with URLs)

Return ONLY valid JSON:

{
  "intent": "",
  "domain": "",
  "options": [
    { "name": "", "url": "" }
  ],
  "guidance": ""
}
`;

  const raw = await callOllama(prompt);
  const parsed = safeParse(raw);
  return parsed;
}
