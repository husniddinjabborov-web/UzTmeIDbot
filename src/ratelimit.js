'use strict';

/** Foydalanuvchi bo'yicha oddiy xotiradagi limit (serverless'da har bir instansiya uchun alohida). */
const hits = new Map();
const LIMIT = 12, WINDOW_MS = 60_000;

function allow(userId, now = Date.now()) {
  const arr = (hits.get(userId) || []).filter(t => now - t < WINDOW_MS);
  if (arr.length >= LIMIT) { hits.set(userId, arr); return false; }
  arr.push(now);
  hits.set(userId, arr);
  if (hits.size > 5000) for (const [k, v] of hits) if (!v.some(t => now - t < WINDOW_MS)) hits.delete(k);
  return true;
}

function reset() { hits.clear(); }

module.exports = { allow, reset, LIMIT, WINDOW_MS };
