'use strict';

const { getJson } = require('../http');
const { env } = require('../config');
const { makeResult, segments, isSafeName, need, expectObject } = require('../result');

const API = 'https://api.github.com';
const RESERVED = new Set(['orgs', 'settings', 'topics', 'marketplace', 'features', 'login', 'explore', 'about',
  'pricing', 'sponsors', 'collections', 'trending', 'notifications', 'new', 'search', 'apps', 'enterprise', 'security', 'sitemap']);

function headers() {
  const h = { Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' };
  if (env('GITHUB_TOKEN')) h.Authorization = `Bearer ${env('GITHUB_TOKEN')}`;
  return h;
}
const get = path => getJson(`${API}${path}`, { headers: headers() }).then(expectObject);
const ownerIdType = t => (t === 'Organization' ? 'organization_id' : 'user_id');

module.exports = {
  id: 'github', name: 'GitHub', aliases: ['gh'],
  hosts: ['github.com'],
  status: 'full',
  objectTypes: ['user', 'organization', 'repository', 'issue', 'pull_request'],
  idTypes: ['user_id', 'organization_id', 'repository_id', 'issue_id', 'pull_request_id'],
  requiredKeys: [], optionalKeys: ['GITHUB_TOKEN'],
  health: 'https://api.github.com/zen',

  parseUrl(url) {
    const s = segments(url.pathname);
    if (!s.length || RESERVED.has(s[0].toLowerCase()) || !isSafeName(s[0])) return null;
    if (s.length === 1) return { kind: 'owner', owner: s[0] };
    if (!isSafeName(s[1])) return null;
    const repo = s[1].replace(/\.git$/, '');
    if (s.length === 2) return { kind: 'repo', owner: s[0], repo };
    if ((s[2] === 'issues' || s[2] === 'pull') && /^\d{1,10}$/.test(s[3] || '')) {
      return { kind: s[2] === 'pull' ? 'pull' : 'issue', owner: s[0], repo, number: s[3] };
    }
    return { kind: 'repo', owner: s[0], repo };   // /tree/..., /blob/... — repozitoriy sifatida
  },

  parseText(t) {
    const m = t.match(/^([A-Za-z0-9_.-]+)(?:\/([A-Za-z0-9_.-]+))?$/);
    if (!m) return null;
    return m[2] ? { kind: 'repo', owner: m[1], repo: m[2] } : { kind: 'owner', owner: m[1] };
  },

  async resolve(d) {
    const platform = 'GitHub', source = 'GitHub REST API';
    if (d.kind === 'owner') {
      const u = need(await get(`/users/${encodeURIComponent(d.owner)}`), 'id', 'login');
      const org = u.type === 'Organization';
      return makeResult({
        platform, objectType: org ? 'Tashkilot' : 'Foydalanuvchi', name: u.name || u.login, owner: u.login,
        ids: [{ type: ownerIdType(u.type), value: u.id }, { type: 'node_id', value: u.node_id }],
        source, url: u.html_url
      });
    }
    if (d.kind === 'repo') {
      const r = need(await get(`/repos/${encodeURIComponent(d.owner)}/${encodeURIComponent(d.repo)}`), 'id', 'full_name');
      return makeResult({
        platform, objectType: 'Repozitoriy', name: r.full_name, owner: r.owner && r.owner.login,
        ids: [{ type: 'repository_id', value: r.id }, { type: 'node_id', value: r.node_id },
              ...(r.owner ? [{ type: ownerIdType(r.owner.type), value: r.owner.id }] : [])],
        source, url: r.html_url
      });
    }
    const path = d.kind === 'pull' ? 'pulls' : 'issues';
    const i = need(await get(`/repos/${encodeURIComponent(d.owner)}/${encodeURIComponent(d.repo)}/${path}/${d.number}`), 'id', 'number');
    return makeResult({
      platform, objectType: d.kind === 'pull' ? 'Pull request' : 'Issue', name: i.title, owner: d.owner,
      ids: [{ type: d.kind === 'pull' ? 'pull_request_id' : 'issue_id', value: i.id }, { type: 'number', value: i.number }],
      source, url: i.html_url
    });
  }
};
