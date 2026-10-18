'use strict';

const { getJson } = require('../http');
const { makeResult, segments, isSafeName, need, expectObject } = require('../result');

const get = p => getJson(`https://api.bitbucket.org/2.0${p}`).then(expectObject);

module.exports = {
  id: 'bitbucket', name: 'Bitbucket', aliases: ['bb'],
  hosts: ['bitbucket.org'],
  status: 'full',
  objectTypes: ['workspace', 'repository'],
  idTypes: ['workspace_id', 'repository_id'],
  requiredKeys: [], optionalKeys: [],
  unsupportedHint: 'Bitbucket ID lari UUID ({...}) ko\'rinishida bo\'ladi.',
  health: 'https://api.bitbucket.org/2.0/repositories?pagelen=1',

  parseUrl(url) {
    const s = segments(url.pathname);
    if (!s.length || !isSafeName(s[0]) || ['account', 'dashboard', 'product', 'features'].includes(s[0])) return null;
    if (s.length === 1) return { kind: 'workspace', ws: s[0] };
    if (!isSafeName(s[1])) return null;
    return { kind: 'repo', ws: s[0], repo: s[1] };
  },
  parseText(t) {
    const m = t.match(/^([A-Za-z0-9_.-]+)(?:\/([A-Za-z0-9_.-]+))?$/);
    if (!m) return null;
    return m[2] ? { kind: 'repo', ws: m[1], repo: m[2] } : { kind: 'workspace', ws: m[1] };
  },

  async resolve(d) {
    const platform = 'Bitbucket', source = 'Bitbucket REST API 2.0';
    if (d.kind === 'workspace') {
      const w = need(await get(`/workspaces/${encodeURIComponent(d.ws)}`), 'uuid', 'slug');
      return makeResult({ platform, objectType: 'Workspace', name: w.name || w.slug, owner: w.slug,
        ids: [{ type: 'workspace_id', value: w.uuid }], source, url: w.links && w.links.html && w.links.html.href });
    }
    const r = need(await get(`/repositories/${encodeURIComponent(d.ws)}/${encodeURIComponent(d.repo)}`), 'uuid', 'full_name');
    return makeResult({ platform, objectType: 'Repozitoriy', name: r.full_name, owner: d.ws,
      ids: [{ type: 'repository_id', value: r.uuid }, ...(r.workspace && r.workspace.uuid ? [{ type: 'workspace_id', value: r.workspace.uuid }] : [])],
      source, url: r.links && r.links.html && r.links.html.href });
  }
};
