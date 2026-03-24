// src/config-store.js — runtime configuration (env vars + runtime overrides)
const config = {
  // Agent names (customisable)
  receptionist_name: process.env.RECEPTIONIST_NAME || 'Aria',
  knowledge_name:    process.env.KNOWLEDGE_NAME    || 'Alex',
  scheduler_name:    process.env.SCHEDULER_NAME    || 'Sam',

  // Brand context
  brand_name:  process.env.BRAND_NAME  || 'Hyundai USA',
  dealer_name: process.env.DEALER_NAME || '',

  // Server
  webhook_secret: process.env.WEBHOOK_SECRET || '',
  admin_password: process.env.ADMIN_PASSWORD || 'admin',
};

module.exports = config;
