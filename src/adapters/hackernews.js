'use strict';

const { getJson } = require('../http');
const { IdFinderError } = require('../errors');
const { makeResult } = require('../result');

const BASE = 'https://hacker-news.firebaseio.com/v0';

module.exports = {
  id: 'hackernews', name: 'Hacker News', aliases: ['hn'],
  hosts: ['news.ycombinator.com'],
  status: 'full',
  objectTypes: ['item (post/comment)', 'user'],
  idTypes: ['item_id', 'user_id'],
  requiredKeys: [], optionalKeys: [],
  limitation: "Hacker News foydalanuvchisining ID'si — uning username'i (raqamli ID yo'q).",
  health: `${BASE}/maxitem.json`,

  parseUrl(url) {
    const id = url.searchParams.get('id');
    if (!id) return null;
    if (url.pathname === '/item' && /^\d{1,10}$/.test(id)) return { kind: 'item', id };
    if (url.pathname === '/user' && /^[A-Za-z0-9_-]{2,15}$/.test(id)) return { kind: 'user', id };
    return null;
  },

  async resolve(d) {
    if (d.kind === 'item') {
      const item = await getJson(`${BASE}/item/${d.id}.json`);
      if (item === null) throw new IdFinderError('NOT_FOUND');
      if (typeof item !== 'object' || item.id === undefined) throw new IdFinderError('ID_MISSING');
      return makeResult({ platform: 'Hacker News', objectType: item.type === 'comment' ? 'Izoh' : 'Post', name: item.title,
        owner: item.by, ids: [{ type: 'item_id', value: item.id }], source: 'Hacker News Firebase API',
        url: `https://news.ycombinator.com/item?id=${item.id}` });
    }
    const u = await getJson(`${BASE}/user/${encodeURIComponent(d.id)}.json`);
    if (u === null) throw new IdFinderError('NOT_FOUND');
    if (typeof u !== 'object' || !u.id) throw new IdFinderError('ID_MISSING');
    return makeResult({ platform: 'Hacker News', objectType: 'Foydalanuvchi', name: u.id, owner: u.id,
      ids: [{ type: 'user_id', value: u.id }], source: 'Hacker News Firebase API', status: 'partial',
      notes: ["Hacker News foydalanuvchi ID'si — username (raqamli ID yo'q)."], url: `https://news.ycombinator.com/user?id=${u.id}` });
  }
};
