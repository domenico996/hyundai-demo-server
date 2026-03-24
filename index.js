// index.js — entry point
require('dotenv').config();

const express = require('express');
const logger  = require('./src/logger');
const el      = require('./src/elevenlabs');
const config  = require('./src/config-store');
const routes  = require('./src/routes');

const app  = express();
const PORT = process.env.PORT || 3000;

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(express.urlencoded({ extended: false })); // Twilio posts form-encoded
app.use(express.json());

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/', routes);

// ── 404 ───────────────────────────────────────────────────────────────────────
app.use((req, res) => res.status(404).send('Not found'));

// ── Start ─────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  logger.info(`🚗 ${config.brand_name} Demo Server started`, { port: PORT });
  logger.info('Agents', {
    receptionist: config.receptionist_name,
    knowledge:    config.knowledge_name,
    scheduler:    config.scheduler_name,
  });

  // Pre-warm all three agent greetings so first callers don't wait for TTS
  const { receptionist } = require('./src/agents/receptionist');
  el.warmGreetings([
    { text: `Thank you for calling ${config.brand_name}. This is ${config.receptionist_name} — how can I help you today?`, agent: 'receptionist' },
    { text: `Hi! I'm ${config.knowledge_name}, ${config.brand_name}'s product specialist. Which vehicle are you interested in learning about today?`, agent: 'knowledge' },
    { text: `Hi! I'm ${config.scheduler_name} — I handle scheduling here at ${config.brand_name}. Can I start with your name?`, agent: 'scheduler' },
  ]);

  if (!process.env.ANTHROPIC_API_KEY)   logger.warn('⚠️  ANTHROPIC_API_KEY not set');
  if (!process.env.ELEVENLABS_API_KEY)  logger.warn('⚠️  ELEVENLABS_API_KEY not set — will use Twilio TTS fallback');
  if (!process.env.TWILIO_ACCOUNT_SID)  logger.warn('⚠️  TWILIO_ACCOUNT_SID not set');
});
