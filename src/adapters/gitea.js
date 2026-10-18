'use strict';

const { getJson } = require('../http');
const { list } = require('../config');
const { IdFinderError } = require('../errors');
const { makeResult, segments, isSafeName, need, expectObject } = require('../result');

/** Codeberg + GITEA_HOSTS (vergul bilan ajratilgan) orqali qo'shilgan Gitea nusxalari. */
const hosts = () => ['codeberg.org', ...list('GITEA_HOSTS')];
const get = (host, p) => getJson(`https://${host}/api/v1${p}`, { dynamicHost: host !== 'codeberg.org' });

module.exports = {
  id: 'gitea', name: 'Gitea / Codeberg', aliases: ['codeberg'],
  hosts: ['codeberg.org'],
  matchHost: h => hosts().includes(h),
  status: 'full',
  objectTypes: ['user', 'organization', 'repository'],
  idTypes: ['user_id', 'repository_id'],
  requiredKeys: [], optionalKeys: ['GITEA_HOSTS'],
  health: 'https://codeberg.org/api/v1/version',

  parseUrl(url) {
    const s = segments(url.pathname);
    if (!s.length || !isSafeName(s[0])) return null;
    const host = url.hostname.toLowerCase().replace(/^www\./, '');
    if (s.length === 1) return { kind: 'owner', host, owner: s[0] };
    if (!isSafeName(s[1])) return null;
    return { kind: 'repo', host, owner: s[0], repo: s[1].replace(/\.git$/, '') };
  },
  parseText(t) {
    const m = t.match(/^([A-Za-z0-9_.-]+)(?:\/([A-Za-z0-9_.-]+))?$/);
    if (!m) return null;
    return m[2] ? { kind: 'repo', host: 'codeberg.org', owner: m[1], repo: m[2] } : { kind: 'owner', host: 'codeberg.org', owner: m[1] };
  },

  async resolve(d) {
    if (!hosts().includes(d.host)) throw new IdFinderError('UNKNOWN_PLATFORM');
    const platform = d.host === 'codeberg.org' ? 'Codeberg' : `Gitea (${d.host})`;
    const source = `Gitea API (${d.host})`;
    if (d.kind === 'owner') {
      const u = need(expectObject(await get(d.host, `/users/${encodeURIComponent(d.owner)}`)), 'id', 'login');
      return makeResult({ platform, objectType: 'Foydalanuvchi / tashkilot', name: u.full_name || u.login, owner: u.login,
        ids: [{ type: 'user_id', value: u.id }], source, url: u.html_url });
    }
    const r = need(expectObject(await get(d.host, `/repos/${encodeURIComponent(d.owner)}/${encodeURIComponent(d.repo)}`)), 'id', 'full_name');
    return makeResult({ platform, objectType: 'Repozitoriy', name: r.full_name, owner: r.owner && r.owner.login,
      ids: [{ type: 'repository_id', value: r.id }, ...(r.owner ? [{ type: 'user_id', value: r.owner.id }] : [])],
      source, url: r.html_url });
  }
};
