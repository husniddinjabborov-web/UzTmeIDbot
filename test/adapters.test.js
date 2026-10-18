'use strict';

const { test, describe, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const { mockRoutes, mockAll, mockNetworkDown, cleanEnv } = require('./helpers');
const { resolveInput } = require('../src/resolver');
const { formatResult, toJson } = require('../src/format');
const registry = require('../src/registry');
const fixtures = require('./fixtures');
const urlOnly = require('./url-only.fixtures');

const idsOf = r => Object.fromEntries(r.ids.map(i => [i.type, i.value]));
async function run(input) { return (await resolveInput(input)).results[0]; }
async function fails(input, code) {
  await assert.rejects(() => resolveInput(input), e => { assert.equal(e.code, code, `kutilgan ${code}, olingan ${e.code}`); return true; });
}
function setEnv(env) { cleanEnv(); Object.assign(process.env, env || {}); }

// ── Tarmoqqa chiqadigan adapterlar: spetsifikatsiyadagi 10 ta holat ────────────
for (const fx of fixtures) {
  describe(`adapter: ${fx.id}`, () => {
    beforeEach(() => setEnv(fx.env));

    test('1. to\'g\'ri ommaviy URL → haqiqiy ID (mock)', async () => {
      mockRoutes(fx.routes);
      const r = await run(fx.input);
      assert.equal(r.status, fx.status || 'ok');
      for (const [type, value] of Object.entries(fx.expect)) assert.equal(idsOf(r)[type], value, `${type}`);
    });

    test('2. noto\'g\'ri/qo\'llab-quvvatlanmaydigan yo\'l → UNSUPPORTED_OBJECT', async () => {
      mockAll(200, {});
      await fails(`https://${fx.host}/`, 'UNSUPPORTED_OBJECT');
    });

    test('3. mavjud bo\'lmagan obyekt (404) → NOT_FOUND', async () => {
      mockAll(404, { message: 'Not Found' });
      await fails(fx.input, 'NOT_FOUND');
    });

    if (fx.text) test('4. username / "platforma qiymat" orqali qidirish', async () => {
      mockRoutes(fx.text.routes);
      const r = await run(fx.text.input);
      for (const [type, value] of Object.entries(fx.text.expect)) assert.equal(idsOf(r)[type], value);
    });

    test('6. ruxsat yetarli emas (403) → FORBIDDEN', async () => {
      mockAll(403, { message: 'Forbidden' });
      await fails(fx.input, 'FORBIDDEN');
    });

    test('7. API rate limit (429) → RATE_LIMIT', async () => {
      mockAll(429, {});
      await fails(fx.input, 'RATE_LIMIT');
    });

    test('7b. GitHub uslubidagi 403 + x-ratelimit-remaining: 0 → RATE_LIMIT', async () => {
      mockAll(403, {}, { 'x-ratelimit-remaining': '0' });
      await fails(fx.input, 'RATE_LIMIT');
    });

    test('8. API javobida ID yo\'q → ID_MISSING / BAD_RESPONSE / NOT_FOUND (soxta ID yasalmaydi)', async () => {
      mockAll(200, { unexpected: true });
      await assert.rejects(() => resolveInput(fx.input), e => {
        assert.ok(['ID_MISSING', 'BAD_RESPONSE', 'NOT_FOUND'].includes(e.code), e.code);
        return true;
      });
    });

    test('9. kutilmagan javob (HTML) → BAD_RESPONSE; 5xx → UPSTREAM_DOWN; tarmoq → NETWORK', async () => {
      mockAll(200, '<html>maintenance</html>');
      await fails(fx.input, 'BAD_RESPONSE');
      mockAll(503, {});
      await fails(fx.input, 'UPSTREAM_DOWN');
      mockNetworkDown();
      await fails(fx.input, 'NETWORK');
    });

    test('10. natija standart formatga aylanadi (HTML + JSON)', async () => {
      mockRoutes(fx.routes);
      const r = await run(fx.input);
      const html = formatResult(r);
      assert.match(html, /<b>Platforma:<\/b>/);
      assert.match(html, /<b>ID qiymati:<\/b> <code>.+<\/code>/);
      assert.ok(!/undefined|null/.test(html), 'bo\'sh maydonlar yashirilishi kerak');
      const j = JSON.parse(toJson(r));
      assert.deepEqual(j.ids, idsOf(r));
    });

    for (const ex of fx.extra || []) {
      test(`qo'shimcha holat: ${ex.name}`, async () => {
        mockRoutes(ex.routes);
        const r = await run(ex.input);
        assert.equal(r.status, ex.status || 'ok');
        for (const [type, value] of Object.entries(ex.expect)) assert.equal(idsOf(r)[type], value, type);
      });
    }
  });
}

// ── Havoladan ID ajratadigan adapterlar (tarmoqsiz) ───────────────────────────
describe('url-only adapterlar', () => {
  beforeEach(() => { cleanEnv(); mockNetworkDown(); });   // tarmoqqa chiqmasligi tekshiriladi

  for (const fx of urlOnly) {
    test(`${fx.id}: ${fx.input}`, async () => {
      const r = await run(fx.input);
      assert.equal(r.status, 'partial', 'tasdiqlanmagan natija "ok" deb ko\'rsatilmasligi kerak');
      assert.match(r.source, /tasdiqlanmagan/);
      for (const [type, value] of Object.entries(fx.expect)) assert.equal(idsOf(r)[type], value, type);
    });
  }

  for (const id of new Set(urlOnly.map(f => f.id))) {
    const host = urlOnly.find(f => f.id === id).host;
    test(`${id}: qo'llab-quvvatlanmaydigan yo'l → UNSUPPORTED_OBJECT`, async () => {
      await fails(`https://${host}/`, 'UNSUPPORTED_OBJECT');
    });
  }

  test('x: profil havolasi ID sifatida taxmin qilinmaydi', async () => {
    await fails('https://x.com/elonmusk', 'UNSUPPORTED_OBJECT');
  });
  test('facebook: username sahifasi uchun ID o\'ylab topilmaydi', async () => {
    await fails('https://www.facebook.com/zuck', 'UNSUPPORTED_OBJECT');
  });
});

// ── Kalit talab qiladigan holatlar (5-holat) ──────────────────────────────────
describe('API kaliti talab qilinadigan holatlar', () => {
  beforeEach(() => { cleanEnv(); mockNetworkDown(); });

  test('youtube @handle kalitsiz → NO_TOKEN (so\'rov yuborilmaydi)', async () => {
    await fails('https://www.youtube.com/@somehandle', 'NO_TOKEN');
  });
  test('youtube video kalitsiz → faqat havoladan, "partial"', async () => {
    const r = await run('https://youtu.be/dQw4w9WgXcQ');
    assert.equal(r.status, 'partial');
    assert.equal(idsOf(r).video_id, 'dQw4w9WgXcQ');
  });
  test('twitch kalitsiz → NO_TOKEN', async () => {
    await fails('https://www.twitch.tv/twitchdev', 'NO_TOKEN');
  });
  test('reddit post kalitsiz → URL\'dan, "partial"', async () => {
    const r = await run('https://www.reddit.com/r/test/comments/abc123/some_title/');
    assert.equal(r.status, 'partial');
    assert.deepEqual(idsOf(r), { post_id: 'abc123', fullname: 't3_abc123' });
  });
  test('reddit izoh kalitsiz → comment_id va post_id', async () => {
    const r = await run('https://www.reddit.com/r/test/comments/abc123/some_title/def456/');
    assert.equal(idsOf(r).comment_id, 'def456');
  });
  test('reddit post kalit bilan → API orqali tasdiqlanadi', async () => {
    Object.assign(process.env, { REDDIT_CLIENT_ID: 'id', REDDIT_CLIENT_SECRET: 'secret' });
    const calls = mockRoutes([
      [/access_token/, 200, { access_token: 't', expires_in: 3600 }],
      [/oauth\.reddit\.com\/api\/info\?id=t3_abc123/, 200, { data: { children: [{ data: { title: 'T', author: 'bob' } }] } }]
    ]);
    const r = await run('https://www.reddit.com/r/test/comments/abc123/t/');
    assert.equal(r.status, 'ok');
    assert.ok(calls.some(c => /oauth\.reddit\.com/.test(c.url)));
  });
  test('reddit post kalit bilan, lekin mavjud emas → NOT_FOUND', async () => {
    Object.assign(process.env, { REDDIT_CLIENT_ID: 'id', REDDIT_CLIENT_SECRET: 'secret' });
    mockRoutes([[/access_token/, 200, { access_token: 't2', expires_in: 3600 }], [/api\/info/, 200, { data: { children: [] } }]]);
    await fails('https://www.reddit.com/r/test/comments/zzzzzz/t/', 'NOT_FOUND');
  });
  test('github tokeni berilsa Authorization header yuboriladi, aks holda yo\'q', async () => {
    let calls = mockRoutes([[/./, 200, { id: 1, login: 'a', type: 'User', node_id: 'x' }]]);
    await run('github a');
    assert.equal(calls[0].opts.headers.Authorization, undefined);
    process.env.GITHUB_TOKEN = 'ghp_testtoken123';
    calls = mockRoutes([[/./, 200, { id: 1, login: 'a', type: 'User', node_id: 'x' }]]);
    await run('github a');
    assert.equal(calls[0].opts.headers.Authorization, 'Bearer ghp_testtoken123');
  });
});

// ── Platformaga xos mantiq ────────────────────────────────────────────────────
describe('platformaga xos holatlar', () => {
  beforeEach(() => cleanEnv());

  test('discord: kanal/xabar havolasi → barcha ID havoladan, "partial"', async () => {
    mockNetworkDown();
    const r = await run('https://discord.com/channels/111111111111111111/222222222222222222/333333333333333333');
    assert.equal(r.status, 'partial');
    assert.deepEqual(idsOf(r), { server_id: '111111111111111111', channel_id: '222222222222222222', message_id: '333333333333333333' });
  });
  test('discord: shaxsiy xabarlar (@me) → PRIVATE', async () => {
    mockNetworkDown();
    await fails('https://discord.com/channels/@me/222222222222222222', 'PRIVATE');
  });
  test('discord: taklifda guild yo\'q → ID_MISSING', async () => {
    mockAll(200, { code: 'abc', channel: { id: '1' } });
    await fails('https://discord.gg/abc', 'ID_MISSING');
  });
  test('matrix: foydalanuvchi MXID server tasdiqlasa "ok"', async () => {
    mockRoutes([[/profile\/%40alice%3Amatrix\.org/, 200, { displayname: 'Alice' }]]);
    const r = await run('@alice:matrix.org');
    assert.equal(r.status, 'ok');
    assert.equal(idsOf(r).user_id, '@alice:matrix.org');
  });
  test('matrix: server profilni bermasa → "partial" (tasdiqlanmagan deb belgilanadi)', async () => {
    mockAll(403, {});
    const r = await run('@alice:matrix.org');
    assert.equal(r.status, 'partial');
  });
  test('matrix: mavjud bo\'lmagan foydalanuvchi → NOT_FOUND', async () => {
    mockAll(404, { errcode: 'M_NOT_FOUND' });
    await fails('@ghost:matrix.org', 'NOT_FOUND');
  });
  test('mastodon: ro\'yxatdan tashqari server → UNKNOWN_PLATFORM (SSRF himoyasi)', async () => {
    mockNetworkDown();
    await fails('https://evil.example.com/@alice', 'UNKNOWN_PLATFORM');
  });
  test('mastodon: MASTODON_HOSTS orqali qo\'shilgan server ishlaydi', async () => {
    process.env.MASTODON_HOSTS = 'social.example.org';
    mockRoutes([[/social\.example\.org\/api\/v1\/accounts\/lookup\?acct=bob$/, 200, { id: '55', acct: 'bob', username: 'bob' }]]);
    assert.equal(idsOf(await run('https://social.example.org/@bob')).account_id, '55');
  });
  test('gitea: GITEA_HOSTS orqali qo\'shilgan nusxa ishlaydi', async () => {
    process.env.GITEA_HOSTS = 'git.example.org';
    mockRoutes([[/git\.example\.org\/api\/v1\/repos\/a\/b$/, 200, { id: 8, full_name: 'a/b', owner: { id: 2, login: 'a' } }]]);
    assert.equal(idsOf(await run('https://git.example.org/a/b')).repository_id, '8');
  });
  test('stackexchange: stackoverflow havolasi stackexchange adapteriga tushmaydi', async () => {
    mockRoutes([[/site=stackoverflow/, 200, { items: [{ user_id: 1, display_name: 'x', link: 'l' }] }]]);
    assert.equal((await resolveInput('https://stackoverflow.com/users/1/x')).results[0].platform, 'Stack Overflow');
  });
  test('github: .git va /tree/ yo\'llari repozitoriy sifatida aniqlanadi', async () => {
    mockRoutes([[/repos\/o\/r$/, 200, { id: 5, full_name: 'o/r', node_id: 'n', owner: { id: 1, login: 'o', type: 'User' } }]]);
    assert.equal(idsOf(await run('https://github.com/o/r.git')).repository_id, '5');
    assert.equal(idsOf(await run('https://github.com/o/r/tree/main/src')).repository_id, '5');
  });
  test('github: zahiralangan yo\'llar (settings, marketplace) → UNSUPPORTED_OBJECT', async () => {
    mockNetworkDown();
    await fails('https://github.com/settings/profile', 'UNSUPPORTED_OBJECT');
  });
  test('github: path injection urinishi API\'ga yuborilmaydi', async () => {
    const calls = mockRoutes([[/./, 200, {}]]);
    await assert.rejects(() => resolveInput('https://github.com/a%2F..%2F..%2Forgs/b'));
    assert.equal(calls.length, 0);
  });
  test('hackernews: bo\'sh (null) javob → NOT_FOUND', async () => {
    mockAll(200, 'null');
    await fails('https://news.ycombinator.com/item?id=99999999', 'NOT_FOUND');
  });
  test('adapter xatosi boshqa adapterlarga ta\'sir qilmaydi', async () => {
    mockRoutes([[/api\.github\.com/, 500, {}], [/registry\.npmjs\.org/, 200, { name: 'express' }]]);
    await fails('github octo/hello', 'UPSTREAM_DOWN');
    assert.equal(idsOf(await run('npm express')).package_name, 'express');
  });
});

describe('reyestr yaxlitligi', () => {
  test('har bir adapter majburiy maydonlarga ega va id\'lar noyob', () => {
    const seen = new Set();
    for (const a of registry.adapters) {
      assert.ok(a.id && a.name && a.status, `${a.id}`);
      assert.ok(['full', 'partial', 'url_only', 'needs_key'].includes(a.status), `${a.id}: status`);
      assert.equal(typeof a.parseUrl, 'function', `${a.id}: parseUrl`);
      assert.equal(typeof a.resolve, 'function', `${a.id}: resolve`);
      assert.ok(Array.isArray(a.objectTypes) && Array.isArray(a.idTypes), `${a.id}: objectTypes/idTypes`);
      assert.ok(!seen.has(a.id), `takroriy id: ${a.id}`);
      seen.add(a.id);
    }
  });
  test('har bir adapter fixture bilan qoplangan', () => {
    const covered = new Set([...fixtures.map(f => f.id), ...urlOnly.map(f => f.id)]);
    const missing = registry.adapters.map(a => a.id).filter(id => !covered.has(id));
    assert.deepEqual(missing, []);
  });
});
