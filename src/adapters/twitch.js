'use strict';

const { getJson, request, throwForStatus } = require('../http');
const { env } = require('../config');
const { IdFinderError } = require('../errors');
const { makeResult, segments, need, expectObject, expectArray } = require('../result');

let token = null;
const RESERVED = new Set(['directory', 'videos', 'downloads', 'jobs', 'turbo', 'settings', 'p', 'search', 'friends', 'subscriptions', 'wallet', 'drops']);

async function appToken() {
  if (token && token.exp > Date.now() + 30_000) return token.value;
  const q = new URLSearchParams({ client_id: env('TWITCH_CLIENT_ID'), client_secret: env('TWITCH_CLIENT_SECRET'), grant_type: 'client_credentials' });
  const res = await request(`https://id.twitch.tv/oauth2/token?${q}`, { method: 'POST' });
  throwForStatus(res, 'https://id.twitch.tv/oauth2/token');
  let j; try { j = JSON.parse(res.text); } catch { throw new IdFinderError('BAD_RESPONSE'); }
  if (!j.access_token) throw new IdFinderError('FORBIDDEN');
  token = { value: j.access_token, exp: Date.now() + (j.expires_in || 3600) * 1000 };
  return token.value;
}

module.exports = {
  id: 'twitch', name: 'Twitch',
  hosts: ['twitch.tv', 'm.twitch.tv'],
  status: 'needs_key',
  objectTypes: ['user (channel)'],
  idTypes: ['user_id'],
  requiredKeys: ['TWITCH_CLIENT_ID', 'TWITCH_CLIENT_SECRET'], optionalKeys: [],
  limitation: "Twitch Helix API uchun client credentials majburiy.",
  health: null,

  parseUrl(url) {
    const s = segments(url.pathname);
    return /^[A-Za-z0-9_]{3,25}$/.test(s[0] || '') && !RESERVED.has(s[0].toLowerCase()) ? { login: s[0].toLowerCase() } : null;
  },
  parseText(t) { return /^[A-Za-z0-9_]{3,25}$/.test(t) ? { login: t.toLowerCase() } : null; },

  async resolve(d) {
    if (!env('TWITCH_CLIENT_ID') || !env('TWITCH_CLIENT_SECRET')) throw new IdFinderError('NO_TOKEN');
    const body = expectObject(await getJson(`https://api.twitch.tv/helix/users?login=${encodeURIComponent(d.login)}`, {
      headers: { 'Client-Id': env('TWITCH_CLIENT_ID'), Authorization: `Bearer ${await appToken()}` }
    }));
    const data = expectArray(body.data);
    if (!data.length) throw new IdFinderError('NOT_FOUND');
    const u = need(data[0], 'id', 'login');
    return makeResult({ platform: 'Twitch', objectType: 'Foydalanuvchi (kanal)', name: u.display_name, owner: u.login,
      ids: [{ type: 'user_id', value: u.id }], source: 'Twitch Helix API', url: `https://www.twitch.tv/${u.login}` });
  }
};
