'use strict';

const { getJson } = require('../http');
const { env } = require('../config');
const { IdFinderError } = require('../errors');
const { makeResult, segments, expectObject } = require('../result');

const STANDALONE = { 'stackoverflow.com': 'stackoverflow', 'superuser.com': 'superuser', 'serverfault.com': 'serverfault',
  'askubuntu.com': 'askubuntu', 'mathoverflow.net': 'mathoverflow.net', 'stackapps.com': 'stackapps' };
const NOT_SITES = new Set(['api', 'meta', 'www', 'blog', 'data']);

function siteOf(host) {
  const h = host.replace(/^www\./, '');
  if (STANDALONE[h]) return STANDALONE[h];
  const m = h.match(/^([a-z0-9-]+)\.stackexchange\.com$/);
  if (m && !NOT_SITES.has(m[1])) return m[1];
  const mm = h.match(/^meta\.([a-z0-9-]+)\.stackexchange\.com$/);
  return mm ? `${mm[1]}.meta` : null;
}

async function api(path, site) {
  const q = new URLSearchParams({ site });
  if (env('STACKEXCHANGE_KEY')) q.set('key', env('STACKEXCHANGE_KEY'));
  const body = expectObject(await getJson(`https://api.stackexchange.com/2.3/${path}?${q}`));
  if (!Array.isArray(body.items)) throw new IdFinderError('BAD_RESPONSE');
  if (!body.items.length) throw new IdFinderError('NOT_FOUND');
  return body.items[0];
}

const adapter = (id, name, hosts, matchHost) => ({
  id, name, hosts, matchHost,
  status: 'full',
  objectTypes: ['user', 'question', 'answer'],
  idTypes: ['user_id', 'question_id', 'answer_id'],
  requiredKeys: [], optionalKeys: ['STACKEXCHANGE_KEY'],
  limitation: "Anonim so'rovlar kuniga ~300 ta (IP bo'yicha); kalit bilan 10 000 ta.",
  health: 'https://api.stackexchange.com/2.3/info?site=stackoverflow',

  parseUrl(url) {
    const site = siteOf(url.hostname.toLowerCase());
    if (!site) return null;
    if (id === 'stackoverflow' && site !== 'stackoverflow') return null;
    if (id === 'stackexchange' && site === 'stackoverflow') return null;
    const s = segments(url.pathname);
    const num = v => /^\d{1,12}$/.test(v || '');
    if (s[0] === 'users' && num(s[1])) return { kind: 'user', site, id: s[1] };
    if ((s[0] === 'questions' || s[0] === 'q') && num(s[1])) return { kind: 'question', site, id: s[1] };
    if (s[0] === 'a' && num(s[1])) return { kind: 'answer', site, id: s[1] };
    return null;
  },

  async resolve(d) {
    const platform = name, source = 'Stack Exchange API 2.3';
    if (d.kind === 'user') {
      const u = await api(`users/${d.id}`, d.site);
      return makeResult({ platform, objectType: 'Foydalanuvchi', name: u.display_name, owner: d.site,
        ids: [{ type: 'user_id', value: u.user_id }, ...(u.account_id ? [{ type: 'account_id', value: u.account_id }] : [])], source, url: u.link });
    }
    if (d.kind === 'question') {
      const q = await api(`questions/${d.id}`, d.site);
      return makeResult({ platform, objectType: 'Savol', name: q.title, owner: q.owner && q.owner.display_name,
        ids: [{ type: 'question_id', value: q.question_id }, ...(q.owner && q.owner.user_id ? [{ type: 'user_id', value: q.owner.user_id }] : [])], source, url: q.link });
    }
    const a = await api(`answers/${d.id}`, d.site);
    return makeResult({ platform, objectType: 'Javob', owner: a.owner && a.owner.display_name,
      ids: [{ type: 'answer_id', value: a.answer_id }, { type: 'question_id', value: a.question_id }], source });
  }
});

module.exports = [
  adapter('stackoverflow', 'Stack Overflow', ['stackoverflow.com'], null),
  Object.assign(adapter('stackexchange', 'Stack Exchange', [], h => siteOf(h) !== null && siteOf(h) !== 'stackoverflow'), { aliases: ['se'] })
];
module.exports[0].aliases = ['so'];
