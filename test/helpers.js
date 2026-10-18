'use strict';

process.env.IDFINDER_QUIET = '1';
const { setFetch } = require('../src/http');
const { setLookup } = require('../src/security');

// DNS har doim jamoat IP qaytaradi (testlar tarmoqqa chiqmaydi)
setLookup(async () => [{ address: '93.184.216.34', family: 4 }]);

/** routes: [[RegExp, status, body, headers?], ...]; mos kelmagan so'rov — xato (mock yetishmayapti). */
function mockRoutes(routes, calls = []) {
  setFetch(async (url, opts = {}) => {
    calls.push({ url, opts });
    for (const [re, status, body, headers] of routes) {
      if (re.test(url)) {
        const text = typeof body === 'string' ? body : JSON.stringify(body);
        return new Response(text, { status, headers: headers || {} });
      }
    }
    throw new Error(`UNMOCKED ${url}`);
  });
  return calls;
}

/** Barcha so'rovlarga bir xil javob. */
function mockAll(status, body, headers) { return mockRoutes([[/./, status, body, headers]]); }
function mockNetworkDown() { setFetch(async () => { throw new TypeError('fetch failed'); }); }

const ENV_KEYS = ['GITHUB_TOKEN', 'GITLAB_TOKEN', 'YOUTUBE_API_KEY', 'REDDIT_CLIENT_ID', 'REDDIT_CLIENT_SECRET',
  'TWITCH_CLIENT_ID', 'TWITCH_CLIENT_SECRET', 'STACKEXCHANGE_KEY', 'GITEA_HOSTS', 'MASTODON_HOSTS', 'BOT_TOKEN'];
function cleanEnv() { for (const k of ENV_KEYS) delete process.env[k]; }

module.exports = { mockRoutes, mockAll, mockNetworkDown, cleanEnv };
