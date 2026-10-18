'use strict';

const { byId } = require('./registry');
const { env } = require('./config');

/**
 * Spetsifikatsiyadagi 50 ta platforma va ularning haqiqiy holati.
 * `adapter` bor bo'lsa — holat adapterning o'z `status` maydonidan olinadi.
 * `reason` — amalga oshirilmagan platformalar uchun sabab.
 */
const ENTRIES = [
  { name: 'Telegram', existing: true },
  { name: 'Discord', adapter: 'discord' },
  { name: 'Slack', adapter: 'slack' },
  { name: 'WhatsApp', reason: "Ochiq ID API'si yo'q; WhatsApp Business API faqat o'z biznes raqamingiz uchun." },
  { name: 'Facebook', adapter: 'facebook' },
  { name: 'Instagram', reason: "Graph API ilova ko'rib chiqishi va Business akkaunt talab qiladi; havoladagi shortcode API ID emas." },
  { name: 'X', adapter: 'x' },
  { name: 'Reddit', adapter: 'reddit' },
  { name: 'LinkedIn', reason: "API faqat tasdiqlangan hamkorlar uchun; scraping shartlarni buzadi." },
  { name: 'Twitch', adapter: 'twitch' },
  { name: 'Matrix', adapter: 'matrix' },
  { name: 'YouTube', adapter: 'youtube' },
  { name: 'TikTok', adapter: 'tiktok' },
  { name: 'Pinterest', adapter: 'pinterest' },
  { name: 'Mastodon', adapter: 'mastodon' },
  { name: 'Bluesky', adapter: 'bluesky' },
  { name: 'GitHub', adapter: 'github' },
  { name: 'GitLab', adapter: 'gitlab' },
  { name: 'Bitbucket', adapter: 'bitbucket' },
  { name: 'Stack Overflow', adapter: 'stackoverflow' },
  { name: 'Stack Exchange', adapter: 'stackexchange' },
  { name: 'Hugging Face', adapter: 'huggingface' },
  { name: 'npm', adapter: 'npm' },
  { name: 'PyPI', adapter: 'pypi' },
  { name: 'Docker Hub', adapter: 'dockerhub' },
  { name: 'SourceForge', reason: "Hali tekshirilmagan: barqaror ochiq ID sxemasi tasdiqlanmadi." },
  { name: 'Codeberg', adapter: 'gitea' },
  { name: 'Gitea', adapter: 'gitea' },
  { name: 'Google Drive', adapter: 'googledrive' },
  { name: 'Google Cloud', reason: "Loyiha/resurs ID'lari OAuth yoki service account talab qiladi; ular odatda shaxsiy." },
  { name: 'Firebase', reason: "Loyiha ID'lari shaxsiy; ochiq qidiruv API'si yo'q." },
  { name: 'Supabase', reason: "Management API shaxsiy token talab qiladi." },
  { name: 'AWS', reason: "Hisob/resurs ID'lari shaxsiy (IAM autentifikatsiyasi kerak)." },
  { name: 'Cloudflare', reason: "Zone/account ID'lari faqat o'z API tokeningiz bilan olinadi." },
  { name: 'Vercel', reason: "API token talab qiladi; loyihalar odatda shaxsiy." },
  { name: 'Netlify', reason: "API token talab qiladi; saytlar odatda shaxsiy." },
  { name: 'Notion', adapter: 'notion' },
  { name: 'Trello', reason: "API key + token talab qilinadi, doskalar ko'pincha shaxsiy." },
  { name: 'Jira', reason: "Har bir Jira nusxasi alohida va autentifikatsiya talab qiladi." },
  { name: 'Linear', reason: "API kaliti talab qilinadi (ish maydoni shaxsiy)." },
  { name: 'Stripe', reason: "Faqat o'z maxfiy kalitingiz bilan; mijoz/to'lov ma'lumotlari shaxsiy — bot bunga ruxsatsiz kirmaydi." },
  { name: 'PayPal', reason: "OAuth va merchant hisobi talab qilinadi; to'lov ma'lumotlari shaxsiy." },
  { name: 'Figma', adapter: 'figma' },
  { name: 'Product Hunt', reason: "GraphQL API token talab qiladi; hali sozlanmagan." },
  { name: 'Medium', reason: "Ochiq API yopilgan; ID olishning rasmiy usuli yo'q." },
  { name: 'Dev.to', adapter: 'devto' },
  { name: 'Hashnode', adapter: 'hashnode' },
  { name: 'Hacker News', adapter: 'hackernews' },
  { name: 'Vimeo', adapter: 'vimeo' },
  { name: 'Dailymotion', adapter: 'dailymotion' }
];

function entries() {
  return ENTRIES.map((e, i) => {
    const n = i + 1;
    if (e.existing) return { n, name: e.name, status: 'existing', label: "ishlaydi (botning asosiy funksiyasi)" };
    if (!e.adapter) return { n, name: e.name, status: 'not_implemented', label: 'tayyor emas', reason: e.reason };
    const a = byId.get(e.adapter);
    const keysOk = a.requiredKeys.every(k => env(k));
    const map = {
      full: 'ishlaydi (to\'liq)',
      partial: 'qisman ishlaydi',
      url_only: "qisman: faqat havoladan ID ajratadi",
      needs_key: keysOk ? 'ishlaydi (kalit sozlangan)' : 'tayyor, lekin API kaliti kerak'
    };
    const live = a.liveVerified ? '' : " · jonli API'da tekshirilmagan";
    return { n, name: e.name, status: a.status, label: map[a.status] + live, adapter: a, note: a.limitation, keysOk, liveVerified: !!a.liveVerified };
  });
}

module.exports = { entries, ENTRIES };
