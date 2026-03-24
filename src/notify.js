// src/notify.js -- Expo push notifications for lead & missed call alerts
const fetch  = require('node-fetch');
const logger = require('./logger');

const EXPO_PUSH_URL = 'https://exp.host/-/api/v2/push';

function getToken() {
  return process.env.EXPO_PUSH_TOKEN;
}

async function sendPush(title, body, data = {}) {
  const token = getToken();
  if (!token) {
    logger.warn('No EXPO_PUSH_TOKEN set --skipping push');
    return;
  }
  const msg = { to: token, title, body, data };
  try {
    const res = await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(msg),
      signal: AbortSignal.timeout(5000),
    });
    const json = await res.json();
    logger.info('Push sent', { title, status: res.status });
  } catch (err) {
    logger.error('Push failed', { error: err.message });
  }
}

async function lead(callerName, callerPhone, notes = '') {
  const body = [callerName, callerPhone, notes].filter(Boolean).join(' | ');
  await sendPush('💥 New Lead', body, { type: 'lead', name: callerName, phone: callerPhone });
}

async function missed(from) {
  await sendPush('🔝 Missed Call', `Missed call from ${from}`, { type: 'missed', from });
}

module.exports = { lead, missed };
