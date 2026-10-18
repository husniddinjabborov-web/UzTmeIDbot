'use strict';

const { test, describe, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const { mockRoutes, mockAll, cleanEnv, mockNetworkDown } = require('./helpers');
const { isPrivateIp, assertPublicHost, setLookup, parseUserUrl } = require('../src/security');
const { request, setFetch } = require('../src/http');
const { parseInput } = require('../src/parser');
const { aliasMap } = require('../src/registry');
const { resolveInput } = require('../src/resolver');
const { formatResult, formatError, keyboard } = require('../src/format');
const { makeResult } = require('../src/result');
const { IdFinderError } = require('../src/errors');
const logger = require('../src/logger');
const ratelimit = require('../src/ratelimit');
const { entries, ENTRIES } = require('../src/catalog');

describe('xavfsizlik (SSRF)', () => {
  test('ichki IP manzillar rad etiladi', () => {
    for (const ip of ['127.0.0.1', '10.0.0.5', '172.16.0.1', '172.31.255.255', '192.168.1.1', '169.254.169.254', '0.0.0.0', '100.64.0.1', '::1', 'fc00::1', 'fe80::1', '::ffff:127.0.0.1', '::ffff:7f00:1']) {
      assert.ok(isPrivateIp(ip), ip);
    }
  });
  test('jamoat IP manzillar ruxsat etiladi', () => {
    for (const ip of ['8.8.8.8', '93.184.216.34', '172.32.0.1', '2606:4700:4700::1111']) assert.ok(!isPrivateIp(ip), ip);
  });
  test('localhost va .internal host nomlari rad etiladi', async () => {
    for (const h of ['localhost', 'foo.localhost', 'db.internal', 'printer.local', '127.0.0.1', '[::1]']) {
      await assert.rejects(() => assertPublicHost(h), e => e.code === 'INVALID_URL', h);
    }
  });
  test('host ichki IP\'ga resolve bo\'lsa rad etiladi (DNS rebinding oddiy holat)', async () => {
    setLookup(async () => [{ address: '10.1.2.3', family: 4 }]);
    await assert.rejects(() => assertPublicHost('evil.example.com'), e => e.code === 'INVALID_URL');
    setLookup(async () => [{ address: '93.184.216.34', family: 4 }, { address: '192.168.0.1', family: 4 }]);
    await assert.rejects(() => assertPublicHost('mixed.example.com'), e => e.code === 'INVALID_URL');
    setLookup(async () => [{ address: '93.184.216.34', family: 4 }]);
  });
  test('http:// va credentials bilan URL rad etiladi', async () => {
    assert.throws(() => parseUserUrl('ftp://github.com/a/b'), e => e.code === 'INVALID_URL');
    assert.throws(() => parseUserUrl('https://user:pass@github.com/a/b'), e => e.code === 'INVALID_URL');
    mockAll(200, {});
    await assert.rejects(() => request('http://api.github.com/x'), e => e.code === 'INVALID_URL');
  });
  test('redirect ichki manzilga olib borsa to\'xtatiladi', async () => {
    mockRoutes([[/start\.example/, 302, '', { location: 'https://127.0.0.1/admin' }]]);
    await assert.rejects(() => request('https://start.example.com/x'), e => e.code === 'INVALID_URL');
  });
  test('redirect http:// ga olib borsa to\'xtatiladi', async () => {
    mockRoutes([[/start\.example/, 301, '', { location: 'http://example.com/' }]]);
    await assert.rejects(() => request('https://start.example.com/x'), e => e.code === 'INVALID_URL');
  });
  test('cheksiz redirect to\'xtatiladi', async () => {
    mockRoutes([[/./, 302, '', { location: 'https://loop.example.com/again' }]]);
    await assert.rejects(() => request('https://loop.example.com/x'), e => e.code === 'BAD_RESPONSE');
  });
  test('katta javob rad etiladi', async () => {
    mockAll(200, 'x'.repeat(2 * 1024 * 1024 + 1));
    await assert.rejects(() => request('https://api.github.com/x'), e => e.code === 'BAD_RESPONSE');
  });
  test('timeout NETWORK xatosiga aylanadi', async () => {
    const keepAlive = setInterval(() => {}, 10);   // AbortSignal.timeout unref qilingan — sikl tugab qolmasligi uchun
    setFetch(async (u, o) => new Promise((_, rej) => o.signal.addEventListener('abort', () => rej(new DOMException('timeout', 'TimeoutError')))));
    try { await assert.rejects(() => request('https://api.github.com/x', { timeoutMs: 20 }), e => e.code === 'NETWORK'); }
    finally { clearInterval(keepAlive); }
  });
  test('ruxsat etilmagan domen resolver orqali hech qanday so\'rov yubormaydi', async () => {
    const calls = mockRoutes([[/./, 200, {}]]);
    await assert.rejects(() => resolveInput('https://evil.example.com/a/b'), e => e.code === 'UNKNOWN_PLATFORM');
    await assert.rejects(() => resolveInput('http://169.254.169.254/latest/meta-data'), e => e.code === 'UNKNOWN_PLATFORM');
    assert.equal(calls.length, 0);
  });
});

describe('parser', () => {
  const p = t => parseInput(t, aliasMap);
  test('Telegram havolalari va @username eski oqimga qoldiriladi', () => {
    for (const t of ['https://t.me/durov', 't.me/c/123456789', '@durov', '123456789', '-1001234567890', 'https://t.me/+AbCdEf']) {
      assert.equal(p(t).kind, 'none', t);
    }
  });
  test('havola turlari', () => {
    assert.equal(p('https://github.com/a/b').kind, 'url');
    assert.equal(p('github.com/a/b').kind, 'url');
    assert.equal(p('qarang: https://github.com/a/b, rahmat').url.pathname, '/a/b');
    assert.equal(p('http://[bad').kind, 'invalid_url');   // buzilgan havola → foydalanuvchiga INVALID_URL xabari
  });
  test('"platforma qiymat" va "platforma:qiymat"', () => {
    assert.deepEqual(p('github torvalds/linux'), { kind: 'platform_text', alias: 'github', rest: 'torvalds/linux' });
    assert.deepEqual(p('npm:express'), { kind: 'platform_text', alias: 'npm', rest: 'express' });
    assert.equal(p('gh a/b').alias, 'gh');
  });
  test('oddiy gaplar va noma\'lum so\'zlar e\'tiborsiz qoldiriladi', () => {
    for (const t of ['salom', 'github haqida gapirib bering iltimos', 'qanday ishlaydi', '', '   ']) assert.equal(p(t).kind, 'none', t);
  });
  test('Matrix identifikatorlari tanib olinadi', () => {
    assert.equal(p('@alice:matrix.org').kind, 'matrix');
    assert.equal(p('#room:matrix.org').kind, 'matrix');
    assert.equal(p('!abc:matrix.org').kind, 'matrix');
  });
  test('juda uzun matn rad etiladi', () => assert.equal(p('a'.repeat(501)).kind, 'none'));
  test('resolver: noto\'g\'ri URL → INVALID_URL, tanish bo\'lmagan matn → null', async () => {
    assert.equal(await resolveInput('oddiy matn'), null);
    await assert.rejects(() => resolveInput('https://user:pw@github.com/a/b'), e => e.code === 'INVALID_URL');
  });
});

describe('format', () => {
  const base = { platform: 'GitHub', objectType: 'Repozitoriy', name: 'o/r', owner: 'o', ids: [{ type: 'repository_id', value: '1' }], source: 'GitHub REST API', status: 'ok', notes: [] };
  test('mavjud bo\'lmagan maydonlar yashiriladi', () => {
    const h = formatResult(makeResult({ platform: 'X', ids: [{ type: 'post_id', value: '5' }], source: 's' }));
    assert.ok(!h.includes('Obyekt nomi') && !h.includes('Username') && !h.includes('Obyekt turi'));
  });
  test('HTML escape (XSS / parse_mode buzilishi)', () => {
    const h = formatResult({ ...base, name: '<b>&evil</b>', owner: 'a<b' });
    assert.ok(h.includes('&lt;b&gt;&amp;evil&lt;/b&gt;') && !h.includes('<b>&evil'));
  });
  test('holat: ok → muvaffaqiyatli, partial → qisman', () => {
    assert.match(formatResult(base), /muvaffaqiyatli/);
    assert.match(formatResult({ ...base, status: 'partial', notes: ['eslatma'] }), /qisman[\s\S]*eslatma/);
  });
  test('tugmalar: nusxalash (copy_text), ulashish, ochish', () => {
    const kb = keyboard({ ...base, url: 'https://github.com/o/r' }).inline_keyboard;
    assert.deepEqual(kb[0][0].copy_text, { text: '1' });
    assert.ok(kb[1].some(b => b.url === 'https://github.com/o/r'));
    const long = keyboard({ ...base, ids: [{ type: 'x', value: 'v'.repeat(300) }] }).inline_keyboard;
    assert.equal(long[0][0].copy_text, undefined, 'copy_text 256 belgidan oshmasligi kerak');
  });
  test('http:// URL tugmaga qo\'yilmaydi', () => {
    const kb = keyboard({ ...base, url: 'http://insecure.example.com' }).inline_keyboard;
    assert.ok(!kb[1].some(b => b.url));
  });
  test('makeResult ID bo\'sh bo\'lsa ID_MISSING', () => {
    assert.throws(() => makeResult({ platform: 'x', ids: [{ type: 'a', value: '' }, { type: 'b', value: null }], source: 's' }), e => e.code === 'ID_MISSING');
  });
  test('xato xabarida texnik tafsilot chiqmaydi', () => {
    const e = new IdFinderError('FORBIDDEN', { detail: '403 api.github.com SECRET-INTERNAL' });
    e.platform = 'GitHub';
    const t = formatError(e);
    assert.ok(!t.includes('SECRET-INTERNAL') && t.includes('GitHub'));
  });
});

describe('logger va limit', () => {
  test('tokenlar loglardan yashiriladi', () => {
    process.env.GITHUB_TOKEN = 'ghp_supersecretvalue123';
    const out = logger.redact('xato ghp_supersecretvalue123 https://api.telegram.org/bot123456:ABCDEFGHIJKLMNOPQRSTUVWXYZ0123/getMe?key=AIzaSyXYZ');
    assert.ok(!out.includes('ghp_supersecretvalue123') && !out.includes('ABCDEFGHIJKLMNOPQRSTUVWXYZ0123') && !out.includes('AIzaSyXYZ'), out);
    cleanEnv();
  });
  test('foydalanuvchi limiti: 12 so\'rovdan keyin bloklanadi, oyna o\'tgach ochiladi', () => {
    ratelimit.reset();
    const t0 = 1_000_000;
    for (let i = 0; i < ratelimit.LIMIT; i++) assert.ok(ratelimit.allow(42, t0 + i));
    assert.ok(!ratelimit.allow(42, t0 + 100));
    assert.ok(ratelimit.allow(43, t0 + 100), 'boshqa foydalanuvchiga ta\'sir qilmaydi');
    assert.ok(ratelimit.allow(42, t0 + ratelimit.WINDOW_MS + 1000));
  });
});

describe('katalog (50 platforma)', () => {
  test('ro\'yxatda aynan 50 ta platforma bor va har biri uchun holat berilgan', () => {
    assert.equal(ENTRIES.length, 50);
    for (const e of entries()) {
      assert.ok(e.label && e.status, e.name);
      if (e.status === 'not_implemented') assert.ok(e.reason, `${e.name}: sabab ko'rsatilishi shart`);
    }
  });
  test('"to\'liq" deb belgilangan platformalar uchun adapter mavjud', () => {
    for (const e of entries().filter(x => x.status === 'full')) assert.ok(e.adapter, e.name);
  });
});
