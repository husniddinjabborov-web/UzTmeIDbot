// Lokal ishlab chiqish uchun (polling rejimi)
// Ishlatish: BOT_TOKEN=123:ABC node local.js

require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');

const TOKEN = process.env.BOT_TOKEN;
if (!TOKEN) {
  console.error('❌ BOT_TOKEN topilmadi!');
  process.exit(1);
}

// Lokal uchun polling rejimi
const bot = new TelegramBot(TOKEN, { polling: true });

// Webhook handler'ni import qilamiz
// Lekin bot instance'ni almashtiramiz
const webhookHandler = require('./api/webhook');

// Barcha update'larni webhook handler orqali o'tkazamiz
bot.on('message',       msg    => webhookHandler({ method: 'POST', body: { message: msg } },        { status: () => ({ json: () => {} }) }));
bot.on('callback_query', q     => webhookHandler({ method: 'POST', body: { callback_query: q } },   { status: () => ({ json: () => {} }) }));
bot.on('inline_query',   q     => webhookHandler({ method: 'POST', body: { inline_query: q } },     { status: () => ({ json: () => {} }) }));

bot.on('polling_error', err => console.error('Polling xatosi:', err.message));

console.log('🔄 Lokal polling rejimida ishlamoqda...');