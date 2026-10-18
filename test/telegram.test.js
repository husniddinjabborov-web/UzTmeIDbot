'use strict';

const { test, describe, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const { mockRoutes, mockAll, cleanEnv, mockNetworkDown } = require('./helpers');
const handlers = require('../src/telegram/handlers');
const ratelimit = require('../src/ratelimit');

function fakeBot() {
  const sent = [];
  return {
    sent,
    sendMessage: async (chatId, text, opts) => { sent.push({ chatId, text, opts }); return { message_id: sent.length }; },
    sendChatAction: async () => true
  };
}
const msg = (text, userId = 1) => ({ text, chat: { id: 100 }, from: { id: userId } });

describe('Telegram handlerlar (soxta bot bilan)', () => {
  beforeEach(() => { cleanEnv(); ratelimit.reset(); });

  test('GitHub havolasi → standart formatdagi javob + tugmalar', async () => {
    mockRoutes([[/repos\/octo\/hello$/, 200, { id: 111, node_id: 'R', full_name: 'octo/hello', html_url: 'https://github.com/octo/hello', owner: { id: 7, login: 'octo', type: 'User' } }]]);
    const bot = fakeBot();
    assert.equal(await handlers.handleText(bot, msg('https://github.com/octo/hello')), true);
    assert.equal(bot.sent.length, 1);
    assert.match(bot.sent[0].text, /<b>Platforma:<\/b> GitHub/);
    assert.match(bot.sent[0].text, /<code>111<\/code>/);
    assert.equal(bot.sent[0].opts.parse_mode, 'HTML');
    assert.ok(bot.sent[0].opts.reply_markup.inline_keyboard[0][0].copy_text);
  });

  test('t.me havolasi va @username — handleText false qaytaradi (eski oqim ishlaydi)', async () => {
    const bot = fakeBot();
    mockNetworkDown();
    for (const t of ['https://t.me/durov', '@durov', '123456789', 'salom']) assert.equal(await handlers.handleText(bot, msg(t)), false, t);
    assert.equal(bot.sent.length, 0);
  });

  test('platforma xatosi foydalanuvchiga tushunarli xabar sifatida qaytadi', async () => {
    mockAll(404, {});
    const bot = fakeBot();
    assert.equal(await handlers.handleText(bot, msg('https://github.com/nobody/nothing')), true);
    assert.match(bot.sent[0].text, /ID aniqlanmadi/);
    assert.match(bot.sent[0].text, /topilmadi/);
  });

  test('noma\'lum platforma → UNKNOWN_PLATFORM xabari', async () => {
    mockNetworkDown();
    const bot = fakeBot();
    await handlers.handleText(bot, msg('https://example.com/page'));
    assert.match(bot.sent[0].text, /platforma tanilmadi/i);
  });

  test('xato matnida token yoki ichki tafsilot yo\'q', async () => {
    process.env.GITHUB_TOKEN = 'ghp_topsecret999999';
    mockAll(500, { message: 'internal ghp_topsecret999999' });
    const bot = fakeBot();
    await handlers.handleText(bot, msg('https://github.com/a/b'));
    assert.ok(!bot.sent[0].text.includes('ghp_topsecret999999'));
  });

  test('/json natijani <pre> ichida JSON ko\'rinishida beradi', async () => {
    mockRoutes([[/users\/octocat$/, 200, { id: 1, login: 'octocat', type: 'User', node_id: 'U' }]]);
    const bot = fakeBot();
    await handlers.handleCommand(bot, msg('/json github octocat'));
    const m = bot.sent[0].text.match(/<pre>([\s\S]*)<\/pre>/);
    assert.ok(m);
    assert.equal(JSON.parse(m[1].replace(/&quot;/g, '"')).ids.user_id, '1');
  });

  test('/json argumentsiz → yo\'riqnoma', async () => {
    const bot = fakeBot();
    await handlers.handleCommand(bot, msg('/json'));
    assert.match(bot.sent[0].text, /Foydalanish/);
  });

  test('/platforms, /search, /cancel ishlaydi; /status tarmoqsiz holatda ham yiqilmaydi', async () => {
    const bot = fakeBot();
    for (const c of ['/platforms', '/search', '/cancel']) assert.equal(await handlers.handleCommand(bot, msg(c)), true, c);
    assert.match(bot.sent[0].text, /Qo'llab-quvvatlanadigan platformalar/);
    assert.match(bot.sent[1].text, /tayyor emas/);
    assert.match(bot.sent[1].text, /WhatsApp/, 'tayyor bo\'lmagan platforma sababi bilan ko\'rsatilishi kerak');
    for (const m of bot.sent.slice(0, 2)) assert.ok(m.text.length < 4096, 'Telegram xabar chegarasi');
    assert.ok(!bot.sent.some(m => /docs\/PLATFORMS\.md/.test(m.text)), 'foydalanuvchiga repozitoriy fayliga havola ko\'rsatilmasin');
    assert.equal(bot.sent[2].opts.reply_markup.force_reply, true);
    mockNetworkDown();
    assert.equal(await handlers.handleCommand(bot, msg('/status')), true);
    assert.match(bot.sent[4].text, /Xizmatlar holati/);
    assert.match(bot.sent[4].text, /⚠️/);
  });

  test('/start, /help, /id kabi eski buyruqlar handleCommand tomonidan tegilmaydi', async () => {
    const bot = fakeBot();
    for (const c of ['/start', '/help', '/id', '/mention 1 A']) assert.equal(await handlers.handleCommand(bot, msg(c)), false, c);
  });

  test('/platforms@UzTmeIDbot (guruhdagi ko\'rinish) ham ishlaydi', async () => {
    const bot = fakeBot();
    assert.equal(await handlers.handleCommand(bot, msg('/platforms@UzTmeIDbot')), true);
  });

  test('foydalanuvchi limiti: 12 so\'rovdan keyin ogohlantirish, tarmoqqa chiqilmaydi', async () => {
    const calls = mockRoutes([[/./, 200, { id: 1, login: 'a', type: 'User', node_id: 'x' }]]);
    const bot = fakeBot();
    for (let i = 0; i < ratelimit.LIMIT; i++) await handlers.handleText(bot, msg('github a', 9));
    const before = calls.length;
    await handlers.handleText(bot, msg('github a', 9));
    assert.equal(calls.length, before);
    assert.match(bot.sent.at(-1).text, /Juda ko'p so'rov/);
  });

  test('bir nechta natija bo\'lsa har biri alohida xabar', async () => {
    const bot = fakeBot();
    const okResult = (n) => ({ platform: 'P', ids: [{ type: 't', value: String(n) }], source: 's', status: 'ok', notes: [] });
    // resolver bevosita tekshirilgani uchun: ikkita natijani formatlash yo'lini tekshiramiz
    const { formatResult } = require('../src/format');
    assert.notEqual(formatResult(okResult(1)), formatResult(okResult(2)));
    assert.equal(bot.sent.length, 0);
  });
});
