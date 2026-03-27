// src/voice.js â Main Twilio webhook dispatcher
// Routes incoming calls and gather responses to the correct agent module.

const sessions     = require('./sessions');
const el           = require('./elevenlabs');
const twiml        = require('./twiml');
const logger       = require('./logger');
const notify       = require('./notify');
const receptionist = require('./agents/receptionist');
const knowledge    = require('./agents/knowledge');
const scheduler    = require('./agents/scheduler');

// ââ Shared say() helper ââââââââââââââââââââââââââââââââââââââââââââââââââââââ
async function say(res, text, type, callSid, agent = 'receptionist') {
  const audioUrl = await el.synthesize(text, agent);
  const xml = type === 'hangup'
    ? twiml.speakAndHangup(text, audioUrl)
    : twiml.speakAndGather(text, audioUrl, '/gather');
  return res.type('text/xml').send(xml);
}

const FALLBACK = "I'm so sorry â I ran into a quick issue. Let me get someone to call you right back.";

function transferToKnowledge(session) {
  return `Let me connect you with ${knowledge.NAME()}, our product specialist â one moment.`;
}
function transferToScheduler(session) {
  return `I'll get ${scheduler.NAME()} from our scheduling team on the line â just a sec.`;
}

// ââ POST /voice â Twilio calls this when a new call comes in âââââââââââââââââ
async function handleVoice(req, res) {
  const { CallSid, From = 'unknown' } = req.body;
  logger.info('Incoming call', { CallSid, From });

  const session = sessions.getOrCreate(CallSid, From);
  const text    = receptionist.greeting();

  session.history.receptionist.push({ role: 'assistant', content: text });
  return say(res, text, 'gather', CallSid, 'receptionist');
}

// ââ POST /gather â Twilio posts speech here after each <Gather> ââââââââââââââ
async function handleGather(req, res) {
  const { CallSid, From = 'unknown', SpeechResult: speech = '' } = req.body;
  const session = sessions.getOrCreate(CallSid, From);
  const agent   = session.activeAgent;

  logger.info('Gather received', { CallSid, agent, speech: speech.slice(0, 80) });

  // ââ RECEPTIONIST ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
  if (agent === 'receptionist') {
    if (speech) session.history.receptionist.push({ role: 'user', content: speech });

    const result = await receptionist.think(session);
    if (!result) return say(res, FALLBACK, 'hangup', CallSid, 'receptionist');

    session.history.receptionist.push({ role: 'assistant', content: result.say });

    if (result.route === 'knowledge') {
      session.activeAgent = 'knowledge';
      const announcement  = transferToKnowledge(session);
      const kGreeting     = knowledge.greeting(session);
      const audioAnnounce = await el.synthesize(announcement, 'receptionist');
      const audioGreet    = await el.synthesize(kGreeting, 'knowledge');
      session.history.knowledge.push({ role: 'assistant', content: kGreeting });
      return res.type('text/xml').send(buildTransferTwiml(announcement, audioAnnounce, kGreeting, audioGreet));
    }

    if (result.route === 'scheduler') {
      session.activeAgent = 'scheduler';
      const announcement  = transferToScheduler(session);
      const sGreeting     = scheduler.greeting(session);
      const audioAnnounce = await el.synthesize(announcement, 'receptionist');
      const audioGreet    = await el.synthesize(sGreeting, 'scheduler');
      session.history.scheduler.push({ role: 'assistant', content: sGreeting });
      return res.type('text/xml').send(buildTransferTwiml(announcement, audioAnnounce, sGreeting, audioGreet));
    }

    return say(res, result.say, 'gather', CallSid, 'receptionist');
  }

  // ââ KNOWLEDGE WORKER ââââââââââââââââââââââââââââââââââââââââââââââââââââââ
  if (agent === 'knowledge') {
    if (speech) session.history.knowledge.push({ role: 'user', content: speech });

    const result = await knowledge.think(session);
    if (!result) return say(res, FALLBACK, 'hangup', CallSid, 'knowledge');

    if (result.vehicleInterest && !session.vehicleInterest) {
      session.vehicleInterest = result.vehicleInterest;
      logger.info('Vehicle interest captured', { CallSid, vehicle: result.vehicleInterest });
    }

    session.history.knowledge.push({ role: 'assistant', content: result.say });

    if (result.action === 'transfer_scheduler') {
      session.activeAgent = 'scheduler';
      const announcement  = `I'll hand you over to ${scheduler.NAME()} to get you booked in â one moment.`;
      const sGreeting     = scheduler.greeting(session);
      const audioAnnounce = await el.synthesize(announcement, 'knowledge');
      const audioGreet    = await el.synthesize(sGreeting, 'scheduler');
      session.history.scheduler.push({ role: 'assistant', content: sGreeting });
      return res.type('text/xml').send(buildTransferTwiml(announcement, audioAnnounce, sGreeting, audioGreet));
    }

    if (result.action === 'hangup') {
      sessions.end(CallSid);
      return say(res, result.say, 'hangup', CallSid, 'knowledge');
    }

    return say(res, result.say, 'gather', CallSid, 'knowledge');
  }

  // ââ SCHEDULER âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
  if (agent === 'scheduler') {
    if (speech) session.history.scheduler.push({ role: 'user', content: speech });

    const result = await scheduler.think(session);
    if (!result) return say(res, FALLBACK, 'hangup', CallSid, 'scheduler');

    session.history.scheduler.push({ role: 'assistant', content: result.say });

    if (result.callerName)  session.callerName  = result.callerName;
    if (result.callerPhone) session.callerPhone = result.callerPhone;

    if (result.action === 'complete') {
      await scheduler.fireLead(
        session,
        result.callerName  || session.callerName  || 'Unknown',
        result.callerPhone || session.callerPhone || From
      );
      sessions.end(CallSid);
      return say(res, result.say, 'hangup', CallSid, 'scheduler');
    }

    return say(res, result.say, 'gather', CallSid, 'scheduler');
  }

  logger.error('Unknown agent state', { CallSid, agent });
  return say(res, FALLBACK, 'hangup', CallSid, 'receptionist');
}

// ââ POST /status â Twilio call status callbacks ââââââââââââââââââââââââââââââ
async function handleStatus(req, res) {
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

// ââ Transfer TwiML builder âââââââââââââââââââââââââââââââââââââââââââââââââââ
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
  <Gather input="speech" action="/gather" method="POST" speechTimeout="auto" timeout="8" actionOnEmptyResult="true">
    ${greetPart}
  </Gather>
  <Redirect method="POST">/gather?SpeechResult=</Redirect>
</Response>`;
}

module.exports = { handleVoice, handleGather, handleStatus };
