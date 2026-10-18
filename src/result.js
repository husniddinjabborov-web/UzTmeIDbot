'use strict';

const { IdFinderError } = require('./errors');

/**
 * Standart natija. Barcha adapterlar shu funksiya orqali natija qaytaradi.
 *  ids    — [{ type: 'repository_id', value: '123' }]  (kamida bitta)
 *  source — ma'lumot manbasi (masalan 'GitHub REST API' yoki 'Havola (API orqali tasdiqlanmagan)')
 *  status — 'ok' (API orqali tasdiqlangan) | 'partial' (qisman / tasdiqlanmagan)
 */
function makeResult({ platform, objectType, name, owner, ids, source, status = 'ok', notes = [], url, extra }) {
  const clean = (ids || [])
    .filter(i => i && i.type && i.value !== undefined && i.value !== null && String(i.value) !== '')
    .map(i => ({ type: String(i.type), value: String(i.value) }));
  if (!clean.length) throw new IdFinderError('ID_MISSING');
  return { platform, objectType, name, owner, ids: clean, source, status, notes, url, extra };
}

/** Yo'l segmentlari (bo'sh segmentlarsiz, URL-dekodlangan). */
function segments(pathname) {
  return pathname.split('/').filter(Boolean).map(s => { try { return decodeURIComponent(s); } catch { return s; } });
}

/** URL yo'liga qo'yiladigan nomlar uchun xavfsiz belgilar. */
const SAFE_NAME = /^[A-Za-z0-9_.-]+$/;
const isSafeName = s => typeof s === 'string' && s.length > 0 && s.length <= 100 && SAFE_NAME.test(s);

/** API javobidagi maydon mavjudligini tekshiradi. */
function need(obj, ...keys) {
  for (const k of keys) {
    if (obj === null || typeof obj !== 'object' || obj[k] === undefined || obj[k] === null) {
      throw new IdFinderError('ID_MISSING', { detail: `missing ${k}` });
    }
  }
  return obj;
}

function expectObject(v) {
  if (v === null || typeof v !== 'object' || Array.isArray(v)) throw new IdFinderError('BAD_RESPONSE', { detail: 'expected object' });
  return v;
}
function expectArray(v) {
  if (!Array.isArray(v)) throw new IdFinderError('BAD_RESPONSE', { detail: 'expected array' });
  return v;
}

module.exports = { makeResult, segments, isSafeName, need, expectObject, expectArray };
