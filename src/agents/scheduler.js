// src/agents/scheduler.js
// Agent 3: Scheduler — collects name + phone, confirms interest, fires push notification
// Voice: SCHEDULER_VOICE_ID (friendly neutral, e.g. Elli)

const fetch    = require('node-fetch');
const config   = require('../config-store');
const logger   = require('../logger');
const notify   = require('../notify');

const ANTHROPIC_API = 'https://api.anthropic.com/v1/messages';

const NAME  = () => config.scheduler_name  || 'Sam';
const BRAND = () => config.brand_name      || 'Hyundai USA';

// Greeting when transferred from receptionist or knowledge worker
function greeting(session) {
  const vehicle = session.vehicleInterest ? ` for the ${session.vehicleInterest}` : '';
  const name    = session.callerName ? `, ${session.callerName}` : '';
  return `Hi${name}! I'm ${NAME()} — I handle scheduling here at ${BRAND()}. I'd love to get you set up for a test drive${vehicle}. Can I start with your name?`;
}

function systemPrompt() {
  return `You are ${NAME()}, the scheduling coordinator for ${BRAND()}.
Your job is to collect the caller's name and phone number to book a test drive or callback, then confirm and wrap up.

COLLECTION ORDER:
1. Ask for their name (if not already known).
2. Ask for their best callback number.
3. Confirm both back to them clearly.
4. Thank them warmly and let them know someone will be in touch within one business day.
5. Hang up.

RULES:
- Be warm, efficient, and brief. This is a scheduling call, not a product call.
- Do NOT answer product questions — if asked, say "our specialist Alex covered that — I'm just here to get you booked in!"
- Once you have name + phone, set action to "complete" and include callerName + callerPhone.
- Use contractions. Be friendly. Under 25 words per turn.

RESPOND WITH VALID JSON ONLY:
{
  "say": "words to speak aloud",
  "action": "gather",
  "callerName": null,
  "callerPhone": null
}

When done collecting both name and phone:
{
  "say": "Perfect — we've got you down! Someone from our team will reach out within one business day. Thanks for your interest in Hyundai!",
  "action": "complete",
  "callerName": "Jane Smith",
  "callerPhone": "602-555-0142"
}`;
}

async function think(session) {
  const history = session.history.scheduler;
  let messages = [...history];
  if (messages.length === 0 || messages[0].role !== 'user') {
    messages = [{ role: 'user', content: '(connected to scheduler)' }, ...messages];
  }
  try {
    const res = await fetch(ANTHROPIC_API, {
      method:  'POST',
      headers: {
        'Content-Type':      'application/json',
        'x-api-key':         process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model:      'claude-haiku-4-5-20251001',
        max_tokens: 250,
        system:     systemPrompt(),
        messages,
      }),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) { console.error('Scheduler Claude error'); return null; }
    const data  = await res.json();
    const raw   = data.content?.[0]?.text || '';
    const clean = raw.replace(/```(?:json)?\n?/g, '').replace(/```/g, '').trim();
    const result = JSON.parse(clean);
    return result;
  } catch (err) { return null; }
}

async function fireLead(session, callerName, callerPhone) {
  const vehicle = session.vehicleInterest || 'unspecified vehicle';
  const notes   = `Interested in ${vehicle}`;
  await notify.lead(callerName, callerPhone, notes);
}

module.exports = { greeting, think, fireLead, NAME };
