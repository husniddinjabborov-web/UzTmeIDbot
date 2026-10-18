'use strict';

const { getJson } = require('../http');
const { list } = require('../config');
const { IdFinderError } = require('../errors');
const { makeResult, segments, need, expectObject } = require('../result');

const DEFAULT_HOSTS = ['mastodon.social', 'mastodon.online', 'fosstodon.org', 'hachyderm.io', 'mas.to', 'infosec.exchange', 'mstdn.social', 'mastodon.world'];
const hosts = () => [...new Set([...DEFAULT_HOSTS, ...list('MASTODON_HOSTS')])];

module.exports = {
  id: 'mastodon', name: 'Mastodon',
  hosts: DEFAULT_HOSTS,
  matchHost: h => hosts().includes(h),
  status: 'partial',
  objectTypes: ['account', 'status'],
  idTypes: ['account_id', 'status_id'],
  requiredKeys: [], optionalKeys: ['MASTODON_HOSTS'],
  limitation: "Mastodon ID lari faqat o'sha server (instance) ichida amal qiladi. Faqat ro'yxatdagi serverlar (MASTODON_HOSTS orqali kengaytiriladi).",
  health: 'https://mastodon.social/api/v1/instance',

  parseUrl(url) {
    const host = url.hostname.toLowerCase();
    const s = segments(url.pathname);
    const m = (s[0] || '').match(/^@([A-Za-z0-9_.-]{1,60})$/);
    if (!m) return null;
    if (/^\d{5,25}$/.test(s[1] || '')) return { kind: 'status', host, id: s[1], acct: m[1] };
    return s.length === 1 ? { kind: 'account', host, acct: m[1] } : null;
  },

  async resolve(d) {
    if (!hosts().includes(d.host)) throw new IdFinderError('UNKNOWN_PLATFORM');
    const dyn = !DEFAULT_HOSTS.includes(d.host);
    const note = "Bu ID faqat shu server (instance) ichida amal qiladi.";
    if (d.kind === 'account') {
      const a = need(expectObject(await getJson(`https://${d.host}/api/v1/accounts/lookup?acct=${encodeURIComponent(d.acct)}`, { dynamicHost: dyn })), 'id', 'acct');
      return makeResult({ platform: `Mastodon (${d.host})`, objectType: 'Akkaunt', name: a.display_name || a.username, owner: a.acct,
        ids: [{ type: 'account_id', value: a.id }], source: `Mastodon API (${d.host})`, status: 'partial', notes: [note], url: a.url });
    }
    const st = need(expectObject(await getJson(`https://${d.host}/api/v1/statuses/${d.id}`, { dynamicHost: dyn })), 'id');
    return makeResult({ platform: `Mastodon (${d.host})`, objectType: 'Post (status)', owner: st.account && st.account.acct,
      ids: [{ type: 'status_id', value: st.id }, ...(st.account ? [{ type: 'account_id', value: st.account.id }] : [])],
      source: `Mastodon API (${d.host})`, status: 'partial', notes: [note], url: st.url });
  }
};
