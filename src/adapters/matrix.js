'use strict';

const { getJson } = require('../http');
const { IdFinderError } = require('../errors');
const { makeResult, need, expectObject } = require('../result');

const SERVER = /^[A-Za-z0-9.-]+$/;   // port qo'llab-quvvatlanmaydi (SSRF yuzasini kamaytirish)

function parse(value) {
  const m = value.match(/^([@#!$])([^\s:]+):([A-Za-z0-9.-]+)$/);
  if (!m || !SERVER.test(m[3])) return null;
  return { sigil: m[1], full: value, local: m[2], server: m[3].toLowerCase() };
}

module.exports = {
  id: 'matrix', name: 'Matrix',
  hosts: ['matrix.to'],
  status: 'partial',
  objectTypes: ['user (MXID)', 'room alias', 'room id'],
  idTypes: ['user_id', 'room_id', 'event_id'],
  requiredKeys: [], optionalKeys: [],
  limitation: "Matrix ID'lari o'zi ma'noli (@user:server, !room:server). Alias → room ID faqat ochiq katalog yoqilgan serverlarda ishlaydi.",
  health: 'https://matrix.org/_matrix/client/versions',

  parseUrl(url) {
    const frag = decodeURIComponent((url.hash || '').replace(/^#\/?/, '')).split('?')[0].split('/')[0];
    return parse(frag);
  },
  parseText: parse,

  async resolve(d) {
    const platform = `Matrix (${d.server})`;
    if (d.sigil === '@') {
      let name;
      try {
        const p = expectObject(await getJson(`https://${d.server}/_matrix/client/v3/profile/${encodeURIComponent(d.full)}`, { dynamicHost: true }));
        name = p.displayname;
      } catch (e) {
        if (e instanceof IdFinderError && e.code === 'NOT_FOUND') throw e;
        return makeResult({ platform, objectType: 'Foydalanuvchi', ids: [{ type: 'user_id', value: d.full }], status: 'partial',
          source: 'Kiritilgan MXID (server tasdiqlamadi)', notes: ["Server profilni ochiq bermadi, MXID kiritilgan qiymatdan olindi."] });
      }
      return makeResult({ platform, objectType: 'Foydalanuvchi', name, ids: [{ type: 'user_id', value: d.full }], source: `Matrix Client-Server API (${d.server})` });
    }
    if (d.sigil === '#') {
      const r = need(expectObject(await getJson(`https://${d.server}/_matrix/client/v3/directory/room/${encodeURIComponent(d.full)}`, { dynamicHost: true })), 'room_id');
      return makeResult({ platform, objectType: 'Xona (alias orqali)', name: d.full, ids: [{ type: 'room_id', value: r.room_id }], source: `Matrix Client-Server API (${d.server})` });
    }
    if (d.sigil === '!') {
      return makeResult({ platform, objectType: 'Xona', ids: [{ type: 'room_id', value: d.full }], status: 'partial',
        source: 'Kiritilgan qiymat (tasdiqlanmagan)', notes: ["Bu allaqachon Matrix room ID; mavjudligi tekshirilmadi."] });
    }
    return makeResult({ platform, objectType: 'Hodisa (event)', ids: [{ type: 'event_id', value: d.full }], status: 'partial',
      source: 'Kiritilgan qiymat (tasdiqlanmagan)' });
  }
};
