'use strict';

const { getJson } = require('../http');
const { IdFinderError } = require('../errors');
const { makeResult, segments, need, expectObject, expectArray } = require('../result');

const BASE = 'https://public.api.bsky.app/xrpc';
const ACTOR = /^(?:did:[a-z]+:[A-Za-z0-9._:%-]+|(?:[A-Za-z0-9-]+\.)+[A-Za-z]{2,})$/;

async function profile(actor) {
  return need(expectObject(await getJson(`${BASE}/app.bsky.actor.getProfile?actor=${encodeURIComponent(actor)}`)), 'did', 'handle');
}

module.exports = {
  id: 'bluesky', name: 'Bluesky', aliases: ['bsky'],
  hosts: ['bsky.app'],
  status: 'full',
  objectTypes: ['profile', 'post'],
  idTypes: ['did', 'post_uri', 'post_cid'],
  requiredKeys: [], optionalKeys: [],
  health: `${BASE}/app.bsky.actor.getProfile?actor=bsky.app`,

  parseUrl(url) {
    const s = segments(url.pathname);
    if (s[0] !== 'profile' || !ACTOR.test(s[1] || '')) return null;
    if (s[2] === 'post' && /^[a-z0-9]{6,20}$/.test(s[3] || '')) return { kind: 'post', actor: s[1], rkey: s[3] };
    return { kind: 'profile', actor: s[1] };
  },
  parseText(t) { const a = t.replace(/^@/, ''); return ACTOR.test(a) ? { kind: 'profile', actor: a } : null; },

  async resolve(d) {
    const p = await profile(d.actor);
    if (d.kind === 'profile') {
      return makeResult({ platform: 'Bluesky', objectType: 'Profil', name: p.displayName || p.handle, owner: p.handle,
        ids: [{ type: 'did', value: p.did }], source: 'Bluesky (AT Protocol) API', url: `https://bsky.app/profile/${p.handle}` });
    }
    const uri = `at://${p.did}/app.bsky.feed.post/${d.rkey}`;
    const body = expectObject(await getJson(`${BASE}/app.bsky.feed.getPosts?uris=${encodeURIComponent(uri)}`));
    const posts = expectArray(body.posts);
    if (!posts.length) throw new IdFinderError('NOT_FOUND');
    return makeResult({ platform: 'Bluesky', objectType: 'Post', owner: p.handle,
      ids: [{ type: 'post_uri', value: posts[0].uri }, { type: 'post_cid', value: posts[0].cid }, { type: 'did', value: p.did }],
      source: 'Bluesky (AT Protocol) API', url: `https://bsky.app/profile/${p.handle}/post/${d.rkey}` });
  }
};
