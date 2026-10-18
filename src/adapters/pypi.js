'use strict';

const { getJson } = require('../http');
const { makeResult, segments, need, expectObject } = require('../result');

const NAME = /^[A-Za-z0-9](?:[A-Za-z0-9._-]*[A-Za-z0-9])?$/;

module.exports = {
  id: 'pypi', name: 'PyPI',
  hosts: ['pypi.org'],
  status: 'partial',
  liveVerified: '2026-10-18',   // haqiqiy API bilan tekshirilgan (INTEGRATION=1)
  objectTypes: ['package'],
  idTypes: ['package_name'],
  requiredKeys: [], optionalKeys: [],
  limitation: "PyPI raqamli ID bermaydi — paket nomi (PEP 503 bo'yicha normallashtirilgan) identifikator hisoblanadi.",
  health: 'https://pypi.org/pypi/pip/json',

  parseUrl(url) {
    const s = segments(url.pathname);
    const name = (s[0] === 'project' || s[0] === 'pypi') ? s[1] : null;
    return name && NAME.test(name) ? { name } : null;
  },
  parseText(t) { return NAME.test(t) ? { name: t } : null; },

  async resolve(d) {
    const doc = need(expectObject(await getJson(`https://pypi.org/pypi/${encodeURIComponent(d.name)}/json`)), 'info');
    need(doc.info, 'name');
    const normalized = doc.info.name.toLowerCase().replace(/[-_.]+/g, '-');
    return makeResult({
      platform: 'PyPI', objectType: 'Paket', name: doc.info.name,
      ids: [{ type: 'package_name', value: normalized }],
      source: 'PyPI JSON API', status: 'partial',
      notes: ["PyPI raqamli ID bermaydi: normallashtirilgan paket nomi identifikator hisoblanadi."],
      url: `https://pypi.org/project/${normalized}/`
    });
  }
};
