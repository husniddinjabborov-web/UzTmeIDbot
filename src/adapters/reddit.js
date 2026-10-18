'use strict';

const { getJson, request, throwForStatus } = require('../http');
const { env } = require('../config');
const { IdFinderError } = require('../errors');
const { makeResult, segments, need, expectObject } = require('../result');

let token = null; // { value, exp }

async function accessToken() {
  if (token && token.exp > Date.now() + 30_000) return token.value;
  const basic = Buffer.from(`${env('REDDIT_CLIENT_ID')}:${env('REDDIT_CLIENT_SECRET')}`).toString('base64');
  const res = await request('https://www.reddit.com/api/v1/access_token', {
    method: 'POST', body: 'grant_type=client_credentials',
    headers: { Authorization: `Basic ${basic}`, 'Content-Type': 'application/x-www-form-urlencoded' }
  });
  throwForStatus(res, 'https://www.reddit.com/api/v1/access_token');
  let j; try { j = JSON.parse(res.text); } catch { throw new IdFinderError('BAD_RESPONSE'); }
  if (!j.access_token) throw new IdFinderError('FORBIDDEN', { detail: 'reddit token rejected' });
  token = { value: j.access_token, exp: Date.now() + (j.expires_in || 3600) * 1000 };
  return token.value;
}

const hasCreds = () => !!(env('REDDIT_CLIENT_ID') && env('REDDIT_CLIENT_SECRET'));

async function api(path) {
  if (hasCreds()) {
    return expectObject(await getJson(`https://oauth.reddit.com${path}`, { headers: { Authorization: `Bearer ${await accessToken()}` } }));
  }
  // Kalitsiz rejim: Reddit ko'pincha server IP'larini bloklaydi (403/429) — bu holat xato sifatida qaytariladi.
  return expectObject(await getJson(`https://www.reddit.com${path}.json`));
}

module.exports = {
  id: 'reddit', name: 'Reddit',
  hosts: ['reddit.com', 'old.reddit.com', 'np.reddit.com', 'redd.it'],
  status: 'partial',
  objectTypes: ['subreddit', 'user', 'post', 'comment'],
  idTypes: ['subreddit_id', 'user_id', 'post_id', 'comment_id', 'fullname'],
  requiredKeys: [], optionalKeys: ['REDDIT_CLIENT_ID', 'REDDIT_CLIENT_SECRET'],
  limitation: "Kalitlarsiz Reddit server IP'larini ko'pincha bloklaydi; post/izoh ID'lari havoladan olinadi va faqat kalit bilan API orqali tasdiqlanadi.",
  health: null,

  parseUrl(url) {
    const h = url.hostname.toLowerCase();
    const s = segments(url.pathname);
    if (h === 'redd.it') return /^[a-z0-9]{5,8}$/.test(s[0] || '') ? { kind: 'post', id: s[0] } : null;
    if ((s[0] === 'r' || s[0] === 'R') && /^[A-Za-z0-9_]{2,21}$/.test(s[1] || '')) {
      if (s[2] === 'comments' && /^[a-z0-9]{5,8}$/.test(s[3] || '')) {
        return { kind: /^[a-z0-9]{5,8}$/.test(s[5] || '') ? 'comment' : 'post', sub: s[1], id: s[3], commentId: s[5] };
      }
      return { kind: 'subreddit', sub: s[1] };
    }
    if ((s[0] === 'user' || s[0] === 'u') && /^[A-Za-z0-9_-]{3,20}$/.test(s[1] || '')) return { kind: 'user', name: s[1] };
    return null;
  },
  parseText(t) {
    const m = t.match(/^(?:r\/|u\/|\/r\/|\/u\/)?([A-Za-z0-9_-]{2,21})$/);
    if (!m) return null;
    return /^u\//.test(t) || /^\/u\//.test(t) ? { kind: 'user', name: m[1] } : { kind: 'subreddit', sub: m[1] };
  },

  async resolve(d) {
    const platform = 'Reddit', source = 'Reddit API';
    if (d.kind === 'subreddit') {
      const j = need(await api(`/r/${encodeURIComponent(d.sub)}/about`), 'data');
      need(j.data, 'id', 'name');
      return makeResult({ platform, objectType: 'Subreddit', name: j.data.display_name_prefixed || `r/${d.sub}`, owner: j.data.display_name,
        ids: [{ type: 'subreddit_id', value: j.data.id }, { type: 'fullname', value: j.data.name }], source, url: `https://www.reddit.com/r/${j.data.display_name || d.sub}/` });
    }
    if (d.kind === 'user') {
      const j = need(await api(`/user/${encodeURIComponent(d.name)}/about`), 'data');
      need(j.data, 'id', 'name');
      return makeResult({ platform, objectType: 'Foydalanuvchi', name: j.data.name, owner: j.data.name,
        ids: [{ type: 'user_id', value: j.data.id }, { type: 'fullname', value: `t2_${j.data.id}` }], source, url: `https://www.reddit.com/user/${j.data.name}/` });
    }
    // post / comment — ID havoladan olinadi, kalit bo'lsa API bilan tasdiqlanadi
    const isComment = d.kind === 'comment';
    const fullname = isComment ? `t1_${d.commentId}` : `t3_${d.id}`;
    const ids = isComment
      ? [{ type: 'comment_id', value: d.commentId }, { type: 'post_id', value: d.id }, { type: 'fullname', value: fullname }]
      : [{ type: 'post_id', value: d.id }, { type: 'fullname', value: fullname }];
    if (hasCreds()) {
      const j = await api(`/api/info?id=${fullname}`);
      const kids = j.data && j.data.children;
      if (!Array.isArray(kids) || !kids.length) throw new IdFinderError('NOT_FOUND');
      return makeResult({ platform, objectType: isComment ? 'Izoh' : 'Post', name: kids[0].data && kids[0].data.title, owner: kids[0].data && kids[0].data.author,
        ids, source });
    }
    return makeResult({ platform, objectType: isComment ? 'Izoh' : 'Post', owner: d.sub, ids, status: 'partial',
      source: "Havola (API orqali tasdiqlanmagan)", notes: ["REDDIT_CLIENT_ID/SECRET sozlanmagani uchun ID mavjudligi tekshirilmadi."] });
  }
};
