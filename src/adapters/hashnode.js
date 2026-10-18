'use strict';

const { getJson } = require('../http');
const { IdFinderError } = require('../errors');
const { makeResult, segments, isSafeName, expectObject } = require('../result');

async function gql(query, variables) {
  const body = expectObject(await getJson('https://gql.hashnode.com', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ query, variables })
  }));
  if (body.errors && !body.data) throw new IdFinderError('BAD_RESPONSE', { detail: 'graphql errors' });
  return expectObject(body.data || {});
}

module.exports = {
  id: 'hashnode', name: 'Hashnode',
  hosts: ['hashnode.com'],
  matchHost: h => h.endsWith('.hashnode.dev'),
  status: 'full',
  objectTypes: ['user', 'publication'],
  idTypes: ['user_id', 'publication_id'],
  requiredKeys: [], optionalKeys: [],
  health: null,

  parseUrl(url) {
    const h = url.hostname.toLowerCase();
    if (h.endsWith('.hashnode.dev')) return { kind: 'publication', host: h };
    const s = segments(url.pathname);
    const m = (s[0] || '').match(/^@([A-Za-z0-9_-]+)$/);
    return m && isSafeName(m[1]) ? { kind: 'user', username: m[1] } : null;
  },

  async resolve(d) {
    if (d.kind === 'user') {
      const { user } = await gql('query($u:String!){ user(username:$u){ id username name } }', { u: d.username });
      if (!user) throw new IdFinderError('NOT_FOUND');
      return makeResult({ platform: 'Hashnode', objectType: 'Foydalanuvchi', name: user.name, owner: user.username,
        ids: [{ type: 'user_id', value: user.id }], source: 'Hashnode GraphQL API', url: `https://hashnode.com/@${user.username}` });
    }
    const { publication } = await gql('query($h:String!){ publication(host:$h){ id title } }', { h: d.host });
    if (!publication) throw new IdFinderError('NOT_FOUND');
    return makeResult({ platform: 'Hashnode', objectType: 'Publication (blog)', name: publication.title, owner: d.host,
      ids: [{ type: 'publication_id', value: publication.id }], source: 'Hashnode GraphQL API', url: `https://${d.host}` });
  }
};
