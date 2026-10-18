'use strict';

const { parseUserUrl } = require('./security');
const { IdFinderError } = require('./errors');

const TELEGRAM_HOSTS = new Set(['t.me', 'telegram.me', 'telegram.dog', 'www.t.me']);

const URL_RE = /(?:https?:\/\/[^\s<>"]+)/i;
const BARE_DOMAIN_RE = /(?:^|\s)((?:[a-z0-9-]+\.)+[a-z]{2,}(?::\d+)?\/[^\s<>"]*)/i;
const BARE_HOST_ONLY_RE = /^(?:[a-z0-9-]+\.)+[a-z]{2,}$/i;
const MATRIX_RE = /^[@#!$][^\s:]+:[A-Za-z0-9.-]+(?::\d+)?$/;

/**
 * Kiruvchi matnni tahlil qiladi:
 *   { kind: 'url', url: URL }                         — havola (Telegram havolalari bundan mustasno)
 *   { kind: 'platform_text', alias, rest }            — "github owner/repo" / "npm:express"
 *   { kind: 'matrix', value }                         — @user:server, #alias:server, !room:server
 *   { kind: 'none' }                                  — bu modulga tegishli emas (eski oqimga qoldiriladi)
 */
function parseInput(text, aliasMap) {
  const t = String(text || '').trim();
  if (!t || t.length > 500) return { kind: 'none' };

  let m = t.match(URL_RE) || t.match(BARE_DOMAIN_RE);
  if (m) {
    const raw = (m[1] || m[0]).replace(/[),.;!?]+$/, '');
    let url;
    try { url = parseUserUrl(raw); } catch (e) { if (e instanceof IdFinderError) return { kind: 'invalid_url' }; throw e; }
    if (TELEGRAM_HOSTS.has(url.hostname.toLowerCase())) return { kind: 'none' };
    return { kind: 'url', url };
  }

  if (MATRIX_RE.test(t)) return { kind: 'matrix', value: t };

  // "platforma qiymat" yoki "platforma:qiymat"
  const pm = t.match(/^([a-z][a-z0-9.-]{1,20})(?:\s*:\s*|\s+)(\S.*)$/i);
  if (pm && aliasMap.has(pm[1].toLowerCase()) && pm[2].split(/\s+/).length <= 2) {
    return { kind: 'platform_text', alias: pm[1].toLowerCase(), rest: pm[2].trim() };
  }
  return { kind: 'none' };
}

module.exports = { parseInput, TELEGRAM_HOSTS };
