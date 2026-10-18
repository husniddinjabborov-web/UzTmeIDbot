'use strict';

const { getJson } = require('../http');
const { makeResult, segments, need, expectObject } = require('../result');

const NAME = /^(?:@[a-z0-9~][a-z0-9._~-]*\/)?[a-z0-9~][a-z0-9._~-]*$/;

module.exports = {
  id: 'npm', name: 'npm',
  hosts: ['npmjs.com', 'registry.npmjs.org'],
  status: 'partial',
  liveVerified: '2026-10-18',   // haqiqiy API bilan tekshirilgan (INTEGRATION=1)
  objectTypes: ['package'],
  idTypes: ['package_name'],
  requiredKeys: [], optionalKeys: [],
  limitation: "npm raqamli ID bermaydi — reyestrdagi yagona identifikator paket nomi.",
  health: 'https://registry.npmjs.org/-/ping',

  parseUrl(url) {
    const s = segments(url.pathname);
    let name;
    if (url.hostname.includes('registry')) name = s.join('/');
    else if (s[0] === 'package') name = s[1] && s[1].startsWith('@') ? `${s[1]}/${s[2] || ''}` : s[1];
    return name && NAME.test(name) ? { name } : null;
  },
  parseText(t) { return NAME.test(t) ? { name: t } : null; },

  async resolve(d) {
    const doc = need(expectObject(await getJson(`https://registry.npmjs.org/${d.name.replace('/', '%2F')}`, {
      headers: { Accept: 'application/vnd.npm.install-v1+json' }
    })), 'name');
    return makeResult({
      platform: 'npm', objectType: 'Paket', name: doc.name,
      ids: [{ type: 'package_name', value: doc.name }],
      source: 'npm registry API', status: 'partial',
      notes: ["npm raqamli ID bermaydi: paket nomi reyestrdagi yagona identifikator."],
      url: `https://www.npmjs.com/package/${doc.name}`
    });
  }
};
