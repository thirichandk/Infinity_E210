import { callOllama } from "./ollama.js";

function extractStepsFromText(text){
  if(!text) return [];
  // split on newlines and capture lines that look like steps
  const lines = text.split(/\r?\n/).map(l=>l.trim()).filter(Boolean);
  const steps = [];
  for(const line of lines){
    // remove leading numbering like "1.", "01)", "-"
    const clean = line.replace(/^\d+\.|^\d+\)|^[-•\*]\s*/,'').trim();
    if(clean) steps.push({ text: clean });
  }
  return steps;
}

export async function generateGuide(goal, siteData){
  const prompt = `
You are a universal website assistant.

User goal:
${JSON.stringify(goal)}

Website:
${JSON.stringify(siteData)}

Provide a concise, numbered, step-by-step guide the user can follow on the website.
Return ONLY valid JSON in this format:
{
  "steps": [ { "text": "..." } ]
}
If you cannot produce JSON, return clear steps in plain text.
`;

  const raw = await callOllama(prompt);

  if(!raw) return { steps: [] };

  // If model returns an object-like string, try to parse JSON
  if(typeof raw !== 'string'){
    if(Array.isArray(raw.steps)) return raw;
    return { steps: [{ text: String(raw) }] };
  }

  try{
    const parsed = JSON.parse(raw);
    if(parsed && Array.isArray(parsed.steps)) return parsed;
    // sometimes model returns {"steps": "1. ..."}
    if(parsed && typeof parsed.steps === 'string'){
      return { steps: extractStepsFromText(parsed.steps) };
    }
  }catch(e){ /* not JSON */ }

  // fallback: extract lines from plain text
  const steps = extractStepsFromText(raw);
  return { steps };
}
