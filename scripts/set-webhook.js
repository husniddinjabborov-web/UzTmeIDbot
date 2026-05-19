// Webhook'ni o'rnatish uchun skript
// Ishlatish: VERCEL_URL=https://your-app.vercel.app BOT_TOKEN=123:ABC node scripts/set-webhook.js

const TOKEN      = process.env.BOT_TOKEN;
const VERCEL_URL = process.env.VERCEL_URL;

if (!TOKEN || !VERCEL_URL) {
  console.error('❌ BOT_TOKEN va VERCEL_URL kerak!');
  console.error('Misol: VERCEL_URL=https://your-app.vercel.app BOT_TOKEN=123:ABC node scripts/set-webhook.js');
  process.exit(1);
}

const webhookUrl = `${VERCEL_URL}/api/webhook`;
const apiUrl     = `https://api.telegram.org/bot${TOKEN}/setWebhook?url=${webhookUrl}`;

fetch(apiUrl)
  .then(r => r.json())
  .then(data => {
    if (data.ok) {
      console.log(`✅ Webhook o'rnatildi: ${webhookUrl}`);
    } else {
      console.error('❌ Xato:', data.description);
    }
  })
  .catch(err => console.error('❌ Tarmoq xatosi:', err.message));