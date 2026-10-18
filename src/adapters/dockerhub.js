'use strict';

const { getJson } = require('../http');
const { IdFinderError } = require('../errors');
const { makeResult, segments, isSafeName, need, expectObject } = require('../result');

const get = p => getJson(`https://hub.docker.com/v2${p}`).then(expectObject);

module.exports = {
  id: 'dockerhub', name: 'Docker Hub', aliases: ['docker'],
  hosts: ['hub.docker.com'],
  status: 'partial',
  objectTypes: ['user', 'organization', 'repository (egasi orqali)'],
  idTypes: ['user_id', 'organization_id'],
  requiredKeys: [], optionalKeys: [],
  limitation: "Repozitoriy uchun alohida ID tasdiqlanmagan: faqat egasining (user/org) ID'si qaytariladi.",
  health: 'https://hub.docker.com/v2/repositories/library/hello-world/',

  parseUrl(url) {
    const s = segments(url.pathname);
    if (s[0] === '_' && isSafeName(s[1])) return { kind: 'repo', ns: 'library', repo: s[1] };
    if (s[0] === 'r' && isSafeName(s[1]) && isSafeName(s[2])) return { kind: 'repo', ns: s[1], repo: s[2] };
    if ((s[0] === 'u' || s[0] === 'orgs') && isSafeName(s[1])) return { kind: 'owner', ns: s[1] };
    return null;
  },
  parseText(t) {
    const m = t.match(/^([a-z0-9_.-]+)(?:\/([a-z0-9_.-]+))?$/i);
    if (!m) return null;
    return m[2] ? { kind: 'repo', ns: m[1], repo: m[2] } : { kind: 'owner', ns: m[1] };
  },

  async resolve(d) {
    const platform = 'Docker Hub', source = 'Docker Hub API';
    const notes = [];
    if (d.kind === 'repo') {
      const r = need(await get(`/repositories/${encodeURIComponent(d.ns)}/${encodeURIComponent(d.repo)}/`), 'name');
      if (d.ns === 'library') {
        return makeResult({ platform, objectType: 'Repozitoriy (rasmiy)', name: `library/${r.name}`, owner: 'library',
          ids: [{ type: 'repository_name', value: `library/${r.name}` }], source, status: 'partial',
          notes: ["Rasmiy (library) repozitoriylar uchun raqamli/UUID ID API'da berilmaydi."], url: `https://hub.docker.com/_/${r.name}` });
      }
      notes.push("Repozitoriyning o'z ID'si tasdiqlanmagan; egasining ID'si ko'rsatildi.");
    }
    let owner, type;
    try { owner = need(await get(`/users/${encodeURIComponent(d.ns)}/`), 'id', 'username'); type = 'user_id'; }
    catch (e) {
      if (!(e instanceof IdFinderError) || e.code !== 'NOT_FOUND') throw e;
      owner = need(await get(`/orgs/${encodeURIComponent(d.ns)}/`), 'id'); type = 'organization_id';
    }
    return makeResult({ platform, objectType: d.kind === 'repo' ? 'Repozitoriy egasi' : (type === 'user_id' ? 'Foydalanuvchi' : 'Tashkilot'),
      name: d.kind === 'repo' ? `${d.ns}/${d.repo}` : d.ns, owner: d.ns,
      ids: [{ type, value: owner.id }], source, status: d.kind === 'repo' ? 'partial' : 'ok', notes });
  }
};
