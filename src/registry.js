'use strict';

const fs = require('fs');
const path = require('path');

/** src/adapters/ ichidagi har bir *.js fayl bitta yoki bir nechta adapter eksport qiladi. */
function load() {
  const dir = path.join(__dirname, 'adapters');
  const list = [];
  for (const f of fs.readdirSync(dir).sort()) {
    if (!f.endsWith('.js') || f.startsWith('_')) continue;
    const mod = require(path.join(dir, f));
    for (const a of (Array.isArray(mod) ? mod : [mod])) list.push(a);
  }
  return list;
}

const adapters = load();
const byId = new Map(adapters.map(a => [a.id, a]));

const byHost = new Map();
const aliasMap = new Map();
for (const a of adapters) {
  for (const h of a.hosts || []) byHost.set(h.toLowerCase(), a);
  for (const al of [a.id, ...(a.aliases || [])]) aliasMap.set(al.toLowerCase(), a);
}

/** Host bo'yicha adapter topish: aniq moslik, "www." olib tashlash, yoki adapter.matchHost(). */
function findByHost(hostname) {
  const h = hostname.toLowerCase();
  if (byHost.has(h)) return byHost.get(h);
  const bare = h.replace(/^www\./, '');
  if (byHost.has(bare)) return byHost.get(bare);
  return adapters.find(a => typeof a.matchHost === 'function' && a.matchHost(h)) || null;
}

module.exports = { adapters, byId, aliasMap, findByHost };
