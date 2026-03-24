// src/elevenlabs.js — ElevenLabs TTS with per-agent voice support
const fetch  = require('node-fetch');
const logger = require('./logger');

// Per-agent voice IDs — set via environment variables
const VOICES = {
  receptionist: process.env.RECEPTIONIST_VOICE_ID || '21m00Tcm4TlvDq8ikWAM', // Rachel
  knowledge:    process.env.KNOWLEDGE_VOICE_ID    || 'ErXwobaYiN019PkySvjV', // Antoni
  scheduler:    process.env.SCHEDULER_VOICE_ID    || 'MF3mGyEYCl7XYWbV9V6O', // Elli
};

// Audio cache: key = `${voiceId}:${text}` → base64 audio URL
const _cache = new Map();

async function synthesize(text, agent = 'receptionist') {
  const apiKey  = process.env.ELEVENLABS_API_KEY;
  const voiceId = VOICES[agent] || VOICES.receptionist;
  const cacheKey = `${voiceId}:${text}`;

  if (_cache.has(cacheKey)) return _cache.get(cacheKey);

  if (!apiKey) {
    logger.warn('No ElevenLabs API key — skipping TTS');
    return null;
  }

  try {
    const res = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream`,
      {
        method:  'POST',
        headers: {
          'xi-api-key':    apiKey,
          'Content-Type':  'application/json',
          'Accept':        'audio/mpeg',
        },
        body: JSON.stringify({
          text,
          model_id: 'eleven_flash_v2_5',    // fastest model
          voice_settings: { stability: 0.45, similarity_boost: 0.80, style: 0.10 },
        }),
        signal: AbortSignal.timeout(8000),
      }
    );

    if (!res.ok) {
      logger.warn('ElevenLabs TTS failed', { status: res.status, agent });
      return null;
    }

    const buf  = await res.buffer();
    const b64  = buf.toString('base64');
    const dataUrl = `data:audio/mpeg;base64,${b64}`;
    _cache.set(cacheKey, dataUrl);
    return dataUrl;
  } catch (err) {
    logger.warn('ElevenLabs TTS error', { error: err.message, agent });
    return null;
  }
}

// Pre-warm the greeting audio for all agents on server start
async function warmGreetings(greetings) {
  for (const { text, agent } of greetings) {
    synthesize(text, agent).catch(() => {});
  }
}

function getVoiceId(agent) {
  return VOICES[agent] || VOICES.receptionist;
}

module.exports = { synthesize, warmGreetings, getVoiceId, VOICES };
