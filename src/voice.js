// src/voice.js — Main Twilio webhook dispatcher
// Routes incoming calls and gather responses to the correct agent module.
// Each agent is a separate module with its own Claude system prompt and ElevenLabs voice.

const sessions      = require('./sessions');
const el            = require('./elevenlabs');
const twiml         = require('./twiml');
const logger        = require('./logger');
const notify        = require('./notify');
const receptionist  = require('./agents/receptionist');
const knowledge     = require('./agents/knowledge');
const scheduler     = require('./agents/scheduler');

// ── Shared say() helper ───────────────────────────────────────────────────────
// Synthesizes speech via ElevenLabs (agent-specific voice) then returns TwiML.
async function say(res, text, type, callSid, agent = 'receptionist') {
  const audioUrl = await el.synthesize(text, agent);
  const xml = type === 'hangup'
    ? twiml.speakAndHangup(text, audioUrl)
    : twiml.speakAndGather(text, audioUrl, '/gather');
  return res.type('text/xml').send(xml);
}

// ── Fallback strings ──────────────────────────────────────────────────────────────
const FALLBACK = "I'm so sorry — I ran into a quick issue. Let me get someone to call you right back.";

// ── Transfer announcement strings ───────────────────────────────────────────────────function transferToKnowledge(session) {
  return `Let me connect you with ${knowledge.NAME()}, our product specialist — one moment.`;
}
function transferToScheduler(session) {
  return `I'll get ${scheduler.NAME()} from our scheduling team on the line — just a sec.`;
}

// ──────────────────────────────────────────────────────────────────────────────
// POST /voice — Twilio calls this when a new call comes in
// ──────────────────────────────────────────────────────────────────────────────
async function handleVoice(req, res) {
  const { CallSid, From = 'unknown' } = req.body;
  logger.info('Incoming call', { CallSid, From });

  const session = sessions.getOrCreate(CallSid, From);
  const text    = receptionist.greeting();

  // Seed receptionist history with its own greeting
  session.history.receptionist.push({ role: 'assistant', content: text });

  return say(res, text, 'gather', CallSid, 'receptionist');
}

// ────────────────────────────────────────────────────────────────────────────── // POST /gather — Twilio posts speech here after each <Gather>
// ──────────────────────────────────────────────────────────────────────────────async function handleGather(req, res) {
  const { CallSid, From = 'unknown', SpeechResult: speech = '' } = req.body;
  const session = sessions.getOrCreate(CallSid, From);
  const agent   = session.activeAgent;

  logger.info('Gather received', { CallSid, agent, speech: speech.slice(0, 80) });

  // ── RECEPTIONIST ────────────────────────────────────────────────────────────────────────────────────  if (agent === 'receptionist') {
    if (speech) {
      session.history.receptionist.push({ role: 'user', content: speech });
    }

    const result = await receptionist.think(session);
    if (!result) return say(res, FALLBACK, 'hangup', CallSid, 'receptionist');

    session.history.receptionist.push({ role: 'assistant', content: result.say });

    if (result.route === 'knowledge') {
      // Two-step transfer: receptionist says goodbye, then knowledge worker greets
      session.activeAgent = 'knowledge';
      const announcement = transferToKnowledge(session);
      const kGreeting    = knowledge.greeting(session);
      // We chain both in one response: play announcement then immediately gather with knowledge greeting
      const audioAnnounce = await el.synthesize(announcement, 'receptionist');
      const audioGreet    = await el.synthesize(kGreeting, 'knowledge');
      session.history.knowledge.push({ role: 'assistant', content: kGreeting });

      // Build combined TwiML: play receptionist farewell, then knowledge greeting + gather
      const xml = buildTransferTwiml(announcement, audioAnnounce, kGreeting, audioGreet);
      return res.type('text/xml').send(xml);
    }

    if (result.route === 'scheduler') {
      session.activeAgent = 'scheduler';
      const announcement = transferToScheduler(session);
      const sGreeting    = scheduler.greeting(session);
      const audioAnnounce = await el.synthesize(announcement, 'receptionist');
      const audioGreet    = await el.synthesize(sGreeting, 'scheduler');
      session.history.scheduler.push({ role: 'assistant', content: sGreeting });

      const xml = buildTransferTwiml(announcement, audioAnnounce, sGreeting, audioGreet);
      return res.type('text/xml').send(xml);
    }

    // Keep gathering with receptionist
    return say(res, result.say, 'gather', CallSid, 'receptionist');
  }

  // ── KNOWLEDGE WORKER ─────────────────────────────────────────────────────────────────────────────  if (agent === 'knowledge') {
    if (speech) {
      session.history.knowledge.push({ role: 'user', content: speech });
    }

    const result = await knowledge.think(session);
    if (!result) return say(res, FALLBACK, 'hangup', CallSid, 'knowledge');

    // Update vehicle interest if newly identified
    if (result.vehicleInterest && !session.vehicleInterest) {
      session.vehicleInterest = result.vehicleInterest;
      logger.info('Vehicle interest captured', { CallSid, vehicle: result.vehicleInterest });
    }

    session.history.knowledge.push({ role: 'assistant', content: result.say });

    if (result.action === 'transfer_scheduler') {
      session.activeAgent  = 'scheduler';
      const announcement  = `I'll hand you over to ${scheduler.NAME()} to get you booked in — one moment.`;
      const sGreeting     = scheduler.greeting(session);
      const audioAnnounce = await el.synthesize(announcement, 'knowledge');
      const audioGreet    = await el.synthesize(sGreeting, 'scheduler');
      session.history.scheduler.push({ role: 'assistant', content: sGreeting });

      const xml = buildTransferTwiml(announcement, audioAnnounce, sGreeting, audioGreet);
      return res.type('text/xml').send(xml);
    }

    if (result.action === 'hangup') {
      sessions.end(CallSid);
      return say(res, result.say, 'hangup', CallSid, 'knowledge');
    }

    return say(res, result.say, 'gather', CallSid, 'knowledge');
  }

  // ── SCHEDULER ──────────────────────────────────────────────────────────────────────────────────  if (agent === 'scheduler') {
    if (speech) {
      session.history.scheduler.push({ role: 'user', content: speech });
    }

    const result = await scheduler.think(session);
    if (!result) return say(res, FALLBACK, 'hangup', CallSid, 'scheduler');

    session.history.scheduler.push({ role: 'assistant', content: result.say });

    // Update session with collected info
    if (result.callerName)  session.callerName  = result.callerName;
    if (result.callerPhone) session.callerPhone = result.callerPhone;

    if (result.action === 'complete') {
      // Fire push notification with the lead details
      await scheduler.fireLead(session, result.callerName || session.callerName || 'Unknown', result.callerPhone || session.callerPhone || From);
      sessions.end(CallSid);
      return say(res, result.say, 'hangup', CallSid, 'scheduler');
    }

    return say(res, result.say, 'gather', CallSid, 'scheduler');
  }

  // Fallback -- unknown agent state
  logger.error('Unknown agent state', { CallSid, agent });
  return say(res, FALLBACK, 'hangup', CallSid, 'receptionist');
}

// ── POST /status — Twilio call status callbacks ─────────────────────────────────────────────────────async function handleStatus(req, res) {
  const { CallSid, CallStatus, From } = req.body;
  logger.info('Call status', { CallSid, CallStatus });

  if (['completed', 'failed', 'busy', 'no-answer'].includes(CallStatus)) {
    const session = sessions.get(CallSid);
    if (session && !session.pushSent) {
      await notify.missed(From || session.from || 'unknown');
    }
    sessions.end(CallSid);
  }

  res.sendStatus(204);
}

// ── Transfer TwiML builder ───────────────────────────────────────────────────────────────────
// Plays agent A farewell, then agent B greeting + gather — to dead air.
function buildTransferTwiml(announceText, announceAudio, greetText, greetAudio) {
  const announcePart = announceAudio
    ? `<Play>${announceAudio}</Play>`
    : `<Say voice="Polly.Joanna-Neural">${twiml.escapeXml(announceText)}</Say>`;

  const greetPart = greetAudio
    ? `<Play>${greetAudio}</Play>`
    : `<Say voice="Polly.Joanna-Neural">${twiml.escapeXml(greetText)}</Say>`;

  return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  ${announcePart}
  <Pause length="1"/>
  <Gather input="speech" action="/gather" method="POST"
          speechTimeout="auto" timeout="8" actionOnEmptyResult="true">
    ${greetPart}
  </Gather>
  <Redirect method="POST">/gather?SpeechResult=</Redirect>
</Response>`;
}

module.exports = { handleVoice, handleGather, handleStatus };
