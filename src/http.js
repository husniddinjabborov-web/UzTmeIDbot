'use strict';

const { IdFinderError } = require('./errors');
const { assertPublicHost } = require('./security');
const logger = require('./logger');

const MAX_BYTES = 2 * 1024 * 1024;
const UA = 'UniversalIdFinderBot/2.0 (+https://t.me/UzTmeIDbot)';

let fetchImpl = (...a) => globalThis.fetch(...a);
/** Testlar uchun fetch'ni almashtirish. */
function setFetch(fn) { fetchImpl = fn; }

/**
 * Xavfsiz HTTP so'rov:
 *  - faqat https;
 *  - redirect qo'lda kuzatiladi (maks. 3), har bir yangi host jamoat IP ekani tekshiriladi;
 *  - `dynamicHost: true` bo'lsa (host foydalanuvchi ma'lumotidan olingan) boshidan DNS tekshiriladi;
 *  - timeout va javob hajmi cheklangan.
 */
async function request(url, { method = 'GET', headers = {}, body, dynamicHost = false, timeoutMs = 8000, maxRedirects = 3 } = {}) {
  let current;
  try { current = new URL(url); } catch { throw new IdFinderError('INVALID_URL'); }
  let originHost = dynamicHost ? null : current.hostname;

  for (let hop = 0; hop <= maxRedirects; hop++) {
    if (current.protocol !== 'https:') throw new IdFinderError('INVALID_URL', { detail: 'non-https' });
    if (current.hostname !== originHost) {
      await assertPublicHost(current.hostname);
      originHost = current.hostname;
    }
    let res;
    try {
      res = await fetchImpl(current.href, {
        method, body, redirect: 'manual',
        headers: { 'User-Agent': UA, Accept: 'application/json', ...headers },
        signal: AbortSignal.timeout(timeoutMs)
      });
    } catch (err) {
      if (err instanceof IdFinderError) throw err;
      throw new IdFinderError('NETWORK', { detail: err.message });
    }
    if (res.status >= 300 && res.status < 400 && res.headers.get('location')) {
      current = new URL(res.headers.get('location'), current);
      originHost = null; // keyingi hostni majburan tekshiramiz
      continue;
    }
    let text;
    try { text = await res.text(); }
    catch (err) { throw new IdFinderError('NETWORK', { detail: err.message }); }
    if (text.length > MAX_BYTES) throw new IdFinderError('BAD_RESPONSE', { detail: 'response too large' });
    return { status: res.status, headers: res.headers, text };
  }
  throw new IdFinderError('BAD_RESPONSE', { detail: 'too many redirects' });
}

/** HTTP status kodlarini domen xatolariga aylantiradi. */
function throwForStatus(res, url) {
  const s = res.status;
  if (s >= 200 && s < 300) return;
  const detail = `${s} ${new URL(url).hostname}`;
  const remaining = res.headers.get && res.headers.get('x-ratelimit-remaining');
  if (s === 429 || ((s === 403 || s === 401) && remaining === '0')) throw new IdFinderError('RATE_LIMIT', { detail });
  if (s === 404 || s === 410) throw new IdFinderError('NOT_FOUND', { detail });
  if (s === 401 || s === 403) throw new IdFinderError('FORBIDDEN', { detail });
  if (s >= 500) throw new IdFinderError('UPSTREAM_DOWN', { detail });
  throw new IdFinderError('BAD_RESPONSE', { detail });
}

async function getJson(url, opts = {}) {
  const res = await request(url, opts);
  try { throwForStatus(res, url); }
  catch (e) { logger.warn(`[http] ${e.code} ${e.detail || ''}`); throw e; }
  try { return JSON.parse(res.text); }
  catch { throw new IdFinderError('BAD_RESPONSE', { detail: 'invalid json' }); }
}

module.exports = { request, getJson, throwForStatus, setFetch };
