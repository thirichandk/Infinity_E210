import { callOllama } from "./ollama.js";

function hostFromUrl(url){
  try{ const u = new URL(url); return u.hostname.replace(/^www\./,''); }catch(e){ return null; }
}

const DOMAIN_HINTS = {
  'amazon.com': 'Search for the product, use filters on the left, click a result, choose size/color, add to cart, and proceed to checkout.',
  'booking.com': 'Enter city and dates, pick room, select rate and continue to reserve with guest details.',
  'airbnb.com': 'Search destination, set dates and guests, filter, select listing, read rules, request to book or instant book.',
  'expedia.com': 'Search flights/hotels, compare rates, select, then enter traveler and payment details to complete booking.'
};

export async function generateGuide(goal, siteData){
  const host = siteData && siteData.url ? hostFromUrl(siteData.url) : (siteData && siteData.domain ? siteData.domain : null);

  // Build a domain-aware instruction for the model.
  let domainHint = '';
  if(host && DOMAIN_HINTS[host]) domainHint = `Known site hint: ${DOMAIN_HINTS[host]}`;
  else if(host) domainHint = `Site host appears to be ${host}. If you are familiar with this site, tailor the steps to its typical user flow.`;

  const prompt = `
You are a pragmatic website assistant that writes concise, actionable step-by-step instructions a human can follow on a website.

User goal:
${JSON.stringify(goal)}

Website:
${JSON.stringify(siteData)}

${domainHint}

Return a clear, numbered list of plain-text steps the user should follow. Do NOT return JSON. Be specific to the website when a domain or URL is provided: include which page to open, which search or form fields to use, and what values to enter when applicable.
`;

  const raw = await callOllama(prompt);

  if(!raw) return '';
  return typeof raw === 'string' ? raw : String(raw);
}
