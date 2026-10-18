'use strict';

const { getJson } = require('../http');
const { makeResult, segments, isSafeName, need, expectObject } = require('../result');

module.exports = {
  id: 'devto', name: 'Dev.to', aliases: ['dev'],
  hosts: ['dev.to'],
  status: 'full',
  objectTypes: ['user', 'article'],
  idTypes: ['user_id', 'article_id'],
  requiredKeys: [], optionalKeys: [],
  health: 'https://dev.to/api/articles?per_page=1',

  parseUrl(url) {
    const s = segments(url.pathname);
    if (!s.length || !isSafeName(s[0]) || ['t', 'tags', 'search', 'listings', 'podcasts', 'videos', 'enter', 'new', 'about', 'settings', 'dashboard'].includes(s[0])) return null;
    if (s.length === 1) return { kind: 'user', username: s[0] };
    if (isSafeName(s[1])) return { kind: 'article', username: s[0], slug: s[1] };
    return null;
  },
  parseText(t) { return isSafeName(t) ? { kind: 'user', username: t } : null; },

  async resolve(d) {
    const platform = 'Dev.to', source = 'Forem (Dev.to) API';
    if (d.kind === 'user') {
      const u = need(expectObject(await getJson(`https://dev.to/api/users/by_username?url=${encodeURIComponent(d.username)}`)), 'id', 'username');
      return makeResult({ platform, objectType: 'Foydalanuvchi', name: u.name, owner: u.username,
        ids: [{ type: 'user_id', value: u.id }], source, url: `https://dev.to/${u.username}` });
    }
    const a = need(expectObject(await getJson(`https://dev.to/api/articles/${encodeURIComponent(d.username)}/${encodeURIComponent(d.slug)}`)), 'id');
    return makeResult({ platform, objectType: 'Maqola', name: a.title, owner: a.user && a.user.username,
      ids: [{ type: 'article_id', value: a.id }, ...(a.user && a.user.user_id ? [{ type: 'user_id', value: a.user.user_id }] : [])], source, url: a.url });
  }
};
