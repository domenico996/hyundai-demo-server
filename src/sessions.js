// src/sessions.js -- In-memory call session store
// Each session tracks the active agent and per-agent message history.

const logger = require('./logger');

const sessions = new Map();

function getOrCreate(callSid, from) {
  if (sessions.has(callSid)) return sessions.get(callSid);
  const session = {
    callSid,
    from,
    activeAgent: 'receptionist',
    vehicleInterest: null,
    callerName: null,
    callerPhone: null,
    pushSent: false,
    history: {
      receptionist: [],
      knowledge: [],
      scheduler: [],
    },
    startedAt: Date.now(),
  };
  sessions.set(callSid, session);
  logger.info('Session created', { callSid, from });
  return session;
}

function get(callSid) {
  return sessions.get(callSid) || null;
}

function end(callSid) {
  if (sessions.has(callSid)) {
    logger.info('Session ended', { callSid });
    sessions.delete(callSid);
  }
}

module.exports = { getOrCreate, get, end };
