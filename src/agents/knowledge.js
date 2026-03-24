// src/agents/knowledge.js
// Agent 2: Knowledge Worker — Hyundai product expert
// Voice: KNOWLEDGE_VOICE_ID (confident male, e.g. Antoni)
// Starts by asking which vehicle, gives trim overview, answers deep questions.
// Uses approved Q&A script from /src/data/script.json as priority answers.

const fetch        = require('node-fetch');
const path         = require('path');
const fs           = require('fs');
const config       = require('../config-store');
const logger       = require('../logger');
const { HYUNDAI_KNOWLEDGE } = require('../data/hyundai');

const ANTHROPIC_API = 'https://api.anthropic.com/v1/messages';
const SCRIPT_PATH   = path.join(__dirname, '../data/script.json');

const NAME  = () => config.knowledge_name || 'Alex';
const BRAND = () => config.brand_name || 'Hyundai USA';

// Greeting when transferred from receptionist
function greeting(session) {
  const name = session.callerName ? `, ${session.callerName}` : '';
  return `Hi${name}! I'm ${NAME()}, ${BRAND()}'s product specialist. Which vehicle are you interested in learning about today?`;
}

// Load the approved Q&A script (hot-reloaded on each call so admin edits take effect immediately)
function loadScript() {
  try {
    const raw = fs.readFileSync(SCRIPT_PATH, 'utf8');
    return JSON.parse(raw).filter(e => e.approved);
  } catch { return []; }
}

function buildScriptContext(scriptEntries) {
  if (!scriptEntries.length) return '';
  const lines = scriptEntries.map(e => `Q: ${e.question}\nA: ${e.answer}`).join('\n\n');
  return `\n\nAPPROVED SCRIPT — use these exact answers when the question matches:\n${lines}`;
}

function systemPrompt(vehicleInterest) {
  const script = loadScript();
  const scriptCtx = buildScriptContext(script);
  const vehicleCtx = vehicleInterest
    ? `\nThe caller has already expressed interest in the ${vehicleInterest}. Focus your answers there.`
    : '';

  return `You are ${NAME()}, a knowledgeable and enthusiastic product specialist for ${BRAND()}.

YOUR JOB:
1. First, ask which vehicle the caller is interested in (if not already known).
2. Once they name a vehicle, give a brief high-level overview of the available trims — 2–3 sentences max.
3. Then answer any follow-up questions in detail using the knowledge base below.
4. At the end of the conversation, offer to transfer to Sam in scheduling for a test drive.

VOICE RULES:
- Keep each response under 40 words unless giving a trim overview (which can be longer).
- Sound enthusiastic and knowledgeable, not like you're reading a brochure.
- Use contractions. Vary your openings.
- Never say "certainly", "I understand", or "I apologize".
${vehicleCtx}

KNOWLEDGE BASE:
${HYUNDAI_KNOWLEDGE}
${scriptCtx}

RESPOND WITH VALID JSON ONLY:
{
  "say": "words to speak aloud",
  "action": "gather",
  "vehicleInterest": null,
  "offerScheduler": false
}

Override action when ending:
- "action": "transfer_scheduler" — when caller wants to book a test drive or speak to sales
- "action": "hangup" — when caller is done and satisfied
- Set "vehicleInterest" to the vehicle name once identified (e.g. "Tucson", "Ioniq 5")
- Set "offerScheduler": true when suggesting the caller book a test drive`;
}

async function think(session) {
  const history = session.history.knowledge;
  let messages = [...history];
  if (messages.length === 0 || messages[0].role !== 'user') {
    messages = [{ role: 'user', content: '(connected to knowledge specialist)' }, ...messages];
  }
  const budget = session.vehicleInterest ? 400 : 250;
  try {
    const res = await fetch(ANTHROPIC_API, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', 'x&api-key': process.env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: 'claude-haiku-4-5-20251001', max_tokens: budget, system: systemPrompt(session.vehicleInterest), messages }),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const data  = await res.json();
    const raw   = data.content?.[0]?.text || '';
    const clean = raw.replace(/```(?:json)?\n?/g, '').replace(/```/g, '').trim();
    return JSON.parse(clean);
  } catch (err) { return null; }
}

module.exports = { greeting, think, NAME };
