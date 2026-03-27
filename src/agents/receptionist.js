// src/agents/receptionist.js
// Agent 1: Receptionist — greets callers, routes to Knowledge Worker or Scheduler
// Voice: RECEPTIONIST_VOICE_ID (warm female, e.g. Rachel)

const fetch        = require('node-fetch');
const config       = require('../config-store');
const logger       = require('../logger');

const ANTHROPIC_API = 'https://api.anthropic.com/v1/messages';

const NAME = () => config.receptionist_name || 'Aria';
const BRAND = () => config.brand_name || 'Hyundai USA';
const DEALER = () => config.dealer_name ? ` at ${config.dealer_name}` : '';

function greeting() {
  return `Thank you for calling ${BRAND()}${DEALER()}. This is ${NAME()} — how can I help you today?`;
}

function systemPrompt() {
  return `You are ${NAME()}, the receptionist for ${BRAND()}${DEALER()}.
Your only job is to warmly greet the caller and route them to the right specialist.

TWO ROUTING OPTIONS:
1. "knowledge" - If the caller wants to know about vehicles, models, trims, pricing, features, EVs, or anything product-related.
2. "scheduler" - If the caller wants to schedule a test drive, appointment, or speak with sales.

RULES:
- Keep responses to 1-2 sentences.
- Do NOT answer product questions yourself - route to Knowledge Worker.
- Do NOT take down contact info yourself - route to Scheduler.
- Sound warm and human. Use contractions.

RESPOND WITH VALID JSON ONLY:
{ "say": "words to speak aloud", "route": null }
When ready to transfer:
{ "say": "Let me connect you with our product specialist", "route": "knowledge" }
{ "say": "Ill get Sam from our scheduling team", "route": "scheduler" }`;
}

async function think(session) {
  const history = session.history.receptionist;
  let messages = [...history];
  if (messages.length === 0 || messages[0].role !== 'user') {
    messages = [{ role: 'user', content: '(caller connected)' }, ...messages];
  }
  try {
    const res = await fetch(ANTHROPIC_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': process.env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: 'claude-haiku-4-5-20251001', max_tokens: 200, system: systemPrompt(), messages }),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const raw = data.content?.[0]?.text || '';
    return JSON.parse(raw.replace(/```(?:json)?\n?/g, '').replace(/```/g, '').trim());
  } catch (err) { return null; }
}

module.exports = { greeting, think, NAME };
