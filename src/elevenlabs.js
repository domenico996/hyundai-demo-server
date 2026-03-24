// src/elevenlabs.js — ElevenLabs TTS with per-agent voices + audio cache
// Falls back gracefully if ELEVENLABS_API_KEY is not set.

const fetch  = require('node-fetch');
const logger = require('./logger');

// Per-agent voice ID map --- set via env vars
const VOICES = {
  receptionist: () => process.env.RECEPTIONIST_VOICE_ID || '21m00Tcm4TlvDq8ikWAM', // Rachel
  knowledge:   () => process.env.KNOWLEDGE_VOICE_ID   || 'ErXwobaYiN019PkySvjV',   // Antoni
  scheduler:   () => process.env.SCHEDULER_VOICE_ID   || 'MF3mGyEYCl7XYWbV9V6O',   // Elli
};

// Simple in-memory cache: text => public audio URL
const cache = new Map();

// Twilio-accessible host for served audio files (not used in this impl -- we return ElevenLabs URLs directly)
// Twilio can stream directly from ElevenLabs storage URLs.

async function synthesize(text, agent = 'receptionist') {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    logger.debug('ElevenLabs key not set -- skipping TTS, will use Twilio TTS');
    return null;
  }

  const cacheKey = `${agent}:${text}`;
  if (cache.has(cacheKey)) {
    logger.debug('EL cache hit', { agent, len: text.length });
    return cache.get(cacheKey);
  }

  const voiceId = VOICES(agent] ? VOICES[agent]() : VOICES.receptionist();

  try {
    logger.debug('EL synthesizing', { agent, voiceId, len: text.length });
    const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp_22p00&optimize_streaming_latency=3`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'xi-api-key': apiKey,
      },
      body: JSON.stringify({
        text,
        model_id: 'eleven_turbo_v2_5',
        voice_settings: { stability: 0.45, similarity_boost: 0.75, style: 0.0, use_speaker_boost: true },
      }),
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) {
      logger.warn('EL TTS failed', { status: res.status });
      return null;
    }

    // ElevenLabs returns raw mp3 bytes -- we need a publicly accessible URL for Twilio
    // Strategy: use ElevenLabs 'history' API to get public playback URL,
    // but the simplest approach is to use their streaming with a signed URL.
    // For max simplicity here: pipe the audio to a temp file served by our own server.
    const buffer = Buffer.from(await res.arrayBuffer());
    const filename = `${Date.now()}_${agent}.mp3`;
    const fs = require('fs');
    const path = require('path');
    const dir = path.join(__dirname, '../tmp/audio');
    fs.mkdirSync(dir, { recursive: true });
    const filePath = path.join(dir, filename);
    fs.writeFileSync(filePath, buffer);
    const publicUrl = `${process.env.PUBLIC_URL}/audio/${filename}`;
    cache.set(cacheKey, publicUrl);
    logger.info('EL added to cache', { agent, url: publicUrl });
    return publicUrl;
  } catch (err) {
    logger.error('EL synthesis error', { error: err.message });
    return null;
  }
}

// Pre-warm a list of { text, agent } greetings into cache
async function warmGreetings(list) {
  for (const { text, agent } of list) {
    await synthesize(text, agent).catch(() => {});
  }
}

mmodule.exports = { synthesize, warmGreetings };
