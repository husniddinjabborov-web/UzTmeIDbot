'use strict';

const { resolveInput } = require('../resolver');
const { IdFinderError } = require('../errors');
const { formatResult, formatError, toJson, keyboard, esc } = require('../format');
const { entries } = require('../catalog');
const { adapters } = require('../registry');
const { request } = require('../http');
const { allow } = require('../ratelimit');
const logger = require('../logger');

const HTML = { parse_mode: 'HTML', disable_web_page_preview: true };

/** Matn modulga tegishli bo'lsa javob beradi va true qaytaradi; aks holda false (eski oqim davom etadi). */
async function handleUniversalText(bot, chatId, userId, text, { json = false } = {}) {
  let outcome;
  try {
    outcome = await resolveInput(text);
  } catch (err) {
    await sendError(bot, chatId, err);
    return true;
  }
  if (outcome === null) return false;

  for (const r of outcome.results) {
    if (json) await bot.sendMessage(chatId, `<pre>${esc(toJson(r))}</pre>`, HTML);
    else await bot.sendMessage(chatId, formatResult(r), { ...HTML, reply_markup: keyboard(r) });
  }
  return true;
}

async function sendError(bot, chatId, err) {
  if (!(err instanceof IdFinderError)) {
    logger.error(`[telegram] kutilmagan xato: ${err && err.message}`);
    err = new IdFinderError('BAD_RESPONSE');
  } else if (err.detail) {
    logger.warn(`[telegram] ${err.platform || '-'} ${err.code}: ${err.detail}`);
  }
  await bot.sendMessage(chatId, formatError(err), HTML).catch(() => {});
}

// ─── Buyruqlar ────────────────────────────────────────────────────────────────

function platformsText() {
  const list = entries();
  const group = (title, pred) => {
    const rows = list.filter(pred).map(e => `${e.n}. ${esc(e.name)} — ${esc(e.label)}`);
    return rows.length ? `<b>${title}</b>\n${rows.join('\n')}` : '';
  };
  return [
    '🌐 <b>Qo\'llab-quvvatlanadigan platformalar</b>',
    group('✅ To\'liq ishlaydi', e => e.status === 'full' || e.status === 'existing' || (e.status === 'needs_key' && e.keysOk)),
    group('🟡 Qisman ishlaydi', e => e.status === 'partial' || e.status === 'url_only' || (e.status === 'needs_key' && !e.keysOk)),
    group('⛔ Hozircha tayyor emas', e => e.status === 'not_implemented'),
    'Tafsilot: <code>docs/PLATFORMS.md</code>. Sabablar uchun: /status'
  ].filter(Boolean).join('\n\n');
}

let statusCache = { at: 0, text: '' };

async function statusText() {
  if (Date.now() - statusCache.at < 60_000) return statusCache.text;
  const checks = adapters.filter(a => a.health);
  const settled = await Promise.all(checks.map(async a => {
    const t0 = Date.now();
    try {
      const res = await request(a.health, { timeoutMs: 4000 });
      return { a, ok: res.status < 500, ms: Date.now() - t0, code: res.status };
    } catch { return { a, ok: false, ms: Date.now() - t0, code: 'xato' }; }
  }));
  const lines = settled.map(s => `${s.ok ? '✅' : '⚠️'} ${esc(s.a.name)} — ${s.ok ? `${s.ms} ms` : `javob yo'q (${s.code})`}`);
  const needKeys = adapters.filter(a => a.requiredKeys.length).map(a => {
    const ok = a.requiredKeys.every(k => process.env[k] && process.env[k].trim());
    return `${ok ? '🔑' : '🚫'} ${esc(a.name)} — kalit ${ok ? 'sozlangan' : 'sozlanmagan'}`;
  });
  const text = [
    '📡 <b>Xizmatlar holati</b>', lines.join('\n'),
    needKeys.length ? `<b>API kalitlari:</b>\n${needKeys.join('\n')}` : '',
    '<i>Eslatma: tekshiruv platforma API\'sining ochiq manziliga yuboriladi; Reddit, YouTube, Twitch va havoladan ID ajratuvchi adapterlar tekshirilmaydi.</i>'
  ].filter(Boolean).join('\n\n');
  statusCache = { at: Date.now(), text };
  return text;
}

/** /platforms /search /status /cancel /json — true qaytarsa, buyruq qayta ishlangan. */
async function handleCommand(bot, msg) {
  const m = (msg.text || '').match(/^\/([a-z_]+)(?:@\w+)?(?:\s+([\s\S]*))?$/i);
  if (!m) return false;
  const cmd = m[1].toLowerCase(), arg = (m[2] || '').trim();
  const chatId = msg.chat.id, userId = msg.from.id;

  if (cmd === 'platforms') { await bot.sendMessage(chatId, platformsText(), HTML); return true; }

  if (cmd === 'status') {
    if (!allow(userId)) return rateLimited(bot, chatId);
    await bot.sendChatAction(chatId, 'typing').catch(() => {});
    await bot.sendMessage(chatId, await statusText(), HTML);
    return true;
  }

  if (cmd === 'search') {
    await bot.sendMessage(chatId,
      '🔎 <b>Qidirish</b>\n\nHavola yoki platforma va nom yuboring:\n' +
      '• <code>https://github.com/torvalds/linux</code>\n• <code>github torvalds/linux</code>\n• <code>npm express</code>\n• <code>@user:matrix.org</code>\n\n' +
      'JSON ko\'rinishi uchun: <code>/json &lt;havola&gt;</code>\nRo\'yxat: /platforms',
      { ...HTML, reply_markup: { force_reply: true, input_field_placeholder: 'Havola yoki "github owner/repo"' } });
    return true;
  }

  if (cmd === 'cancel') {
    await bot.sendMessage(chatId, '✅ Bekor qilindi. Bot har so\'rovni alohida bajaradi, shuning uchun kutayotgan amal yo\'q. Asosiy menyu: /start',
      { reply_markup: { remove_keyboard: false } });
    return true;
  }

  if (cmd === 'json') {
    if (!arg) { await bot.sendMessage(chatId, 'Foydalanish: <code>/json https://github.com/owner/repo</code>', HTML); return true; }
    if (!allow(userId)) return rateLimited(bot, chatId);
    const handled = await handleUniversalText(bot, chatId, userId, arg, { json: true });
    if (!handled) await bot.sendMessage(chatId, 'Bu havola yoki formatni tanimadim. /platforms', HTML);
    return true;
  }
  return false;
}

async function rateLimited(bot, chatId) {
  await bot.sendMessage(chatId, `⏳ ${new IdFinderError('USER_RATE_LIMIT').message}`);
  return true;
}

/** Rate limit bilan o'ralgan umumiy matn kirish nuqtasi. */
async function handleText(bot, msg) {
  const { parseInput } = require('../parser');
  const { aliasMap } = require('../registry');
  const p = parseInput(msg.text, aliasMap);
  if (p.kind === 'none') return false;                       // eski oqim davom etadi
  if (!allow(msg.from.id)) return rateLimited(bot, msg.chat.id);
  await bot.sendChatAction(msg.chat.id, 'typing').catch(() => {});
  return handleUniversalText(bot, msg.chat.id, msg.from.id, msg.text);
}

module.exports = { handleText, handleCommand, handleUniversalText, platformsText, statusText };
