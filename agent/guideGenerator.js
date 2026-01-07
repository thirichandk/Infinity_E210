import { callOllama } from "./ollama.js";

export async function generateGuide(goal, siteData) {
  const prompt = `
You are a universal website assistant.

User goal:
${JSON.stringify(goal)}

Website:
${JSON.stringify(siteData)}

Provide a clear, numbered, step-by-step guide in plain text.
Explain like a human assistant.
DO NOT return JSON.
`;

  const raw = await callOllama(prompt);

  if (!raw) return "";
  return typeof raw === "string" ? raw : String(raw);
}
