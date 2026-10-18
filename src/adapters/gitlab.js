'use strict';

const { getJson } = require('../http');
const { env } = require('../config');
const { IdFinderError } = require('../errors');
const { makeResult, segments, isSafeName, need, expectObject, expectArray } = require('../result');

const API = 'https://gitlab.com/api/v4';
const headers = () => (env('GITLAB_TOKEN') ? { 'PRIVATE-TOKEN': env('GITLAB_TOKEN') } : {});
const get = p => getJson(`${API}${p}`, { headers: headers() });
const isNotFound = e => e instanceof IdFinderError && e.code === 'NOT_FOUND';

module.exports = {
  id: 'gitlab', name: 'GitLab', aliases: ['gl'],
  hosts: ['gitlab.com'],
  status: 'full',
  objectTypes: ['user', 'group', 'project', 'issue'],
  idTypes: ['user_id', 'group_id', 'project_id', 'issue_id'],
  requiredKeys: [], optionalKeys: ['GITLAB_TOKEN'],
  health: 'https://gitlab.com/api/v4/version',

  parseUrl(url) {
    const all = segments(url.pathname);
    const dash = all.indexOf('-');
    const s = dash === -1 ? all : all.slice(0, dash);
    const rest = dash === -1 ? [] : all.slice(dash + 1);
    if (!s.length || !s.every(isSafeName)) return null;
    if (s.length === 1) return { kind: 'owner', path: s[0] };
    const base = { path: s.join('/').replace(/\.git$/, '') };
    if (rest[0] === 'issues' && /^\d{1,10}$/.test(rest[1] || '')) return { kind: 'issue', ...base, iid: rest[1] };
    return { kind: 'project', ...base };
  },

  parseText(t) {
    const parts = t.split('/');
    if (!parts.every(isSafeName)) return null;
    return parts.length === 1 ? { kind: 'owner', path: parts[0] } : { kind: 'project', path: t };
  },

  async resolve(d) {
    const platform = 'GitLab', source = 'GitLab REST API';
    const enc = encodeURIComponent(d.path);

    if (d.kind === 'owner') {
      const users = expectArray(await get(`/users?username=${enc}`));
      if (users.length) {
        const u = need(users[0], 'id', 'username');
        return makeResult({ platform, objectType: 'Foydalanuvchi', name: u.name || u.username, owner: u.username,
          ids: [{ type: 'user_id', value: u.id }], source, url: u.web_url });
      }
      try {
        const g = need(expectObject(await get(`/groups/${enc}`)), 'id', 'full_path');
        return makeResult({ platform, objectType: 'Guruh', name: g.name, owner: g.full_path,
          ids: [{ type: 'group_id', value: g.id }], source, url: g.web_url });
      } catch (e) { if (!isNotFound(e)) throw e; throw new IdFinderError('NOT_FOUND'); }
    }

    if (d.kind === 'issue') {
      const i = need(expectObject(await get(`/projects/${enc}/issues/${d.iid}`)), 'id', 'iid');
      return makeResult({ platform, objectType: 'Issue', name: i.title, owner: d.path,
        ids: [{ type: 'issue_id', value: i.id }, { type: 'issue_iid', value: i.iid }, { type: 'project_id', value: i.project_id }],
        source, url: i.web_url });
    }

    try {
      const p = need(expectObject(await get(`/projects/${enc}`)), 'id', 'path_with_namespace');
      return makeResult({ platform, objectType: 'Loyiha (project)', name: p.path_with_namespace, owner: p.namespace && p.namespace.full_path,
        ids: [{ type: 'project_id', value: p.id }, ...(p.namespace ? [{ type: 'namespace_id', value: p.namespace.id }] : [])],
        source, url: p.web_url });
    } catch (e) {
      if (!isNotFound(e)) throw e;
      // Ichki guruh (subgroup) bo'lishi mumkin
      const g = need(expectObject(await get(`/groups/${enc}`)), 'id', 'full_path');
      return makeResult({ platform, objectType: 'Guruh', name: g.name, owner: g.full_path,
        ids: [{ type: 'group_id', value: g.id }], source, url: g.web_url });
    }
  }
};
