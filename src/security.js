'use strict';

const dns = require('dns').promises;
const net = require('net');
const { IdFinderError } = require('./errors');

/** Ichki / lokal / zahiralangan IP manzillarni aniqlaydi (SSRF himoyasi). */
function isPrivateIp(ip) {
  if (net.isIPv4(ip)) {
    const [a, b] = ip.split('.').map(Number);
    return a === 0 || a === 10 || a === 127 ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 192 && b === 0) || (a === 198 && (b === 18 || b === 19)) ||
      a >= 224;
  }
  if (net.isIPv6(ip)) {
    const l = ip.toLowerCase();
    if (l === '::1' || l === '::') return true;
    if (/^f[cd]/.test(l) || /^fe[89ab]/.test(l) || /^ff/.test(l)) return true;
    if (l.startsWith('::ffff:')) {
      const m = l.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
      return m ? isPrivateIp(m[1]) : true;   // hex ko'rinishdagi mapped manzil — ehtiyot uchun rad
    }
    return false;
  }
  return true;
}

let lookupImpl = (host) => dns.lookup(host, { all: true });
/** Testlar uchun DNS'ni almashtirish. */
function setLookup(fn) { lookupImpl = fn; }

/** Host jamoat (public) IP'ga ishora qilishini tekshiradi. */
async function assertPublicHost(hostname) {
  const host = hostname.replace(/^\[|\]$/g, '');
  if (host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local') || host.endsWith('.internal')) {
    throw new IdFinderError('INVALID_URL', { detail: `blocked host ${host}` });
  }
  if (net.isIP(host)) {
    if (isPrivateIp(host)) throw new IdFinderError('INVALID_URL', { detail: `blocked ip ${host}` });
    return;
  }
  let addrs;
  try { addrs = await lookupImpl(host); }
  catch { throw new IdFinderError('NETWORK', { detail: `dns failed for ${host}` }); }
  if (!addrs.length || addrs.some(a => isPrivateIp(a.address))) {
    throw new IdFinderError('INVALID_URL', { detail: `host ${host} resolves to private address` });
  }
}

/** Foydalanuvchi matnidan URL obyektini xavfsiz ajratadi (faqat http/https). */
function parseUserUrl(raw) {
  let u;
  try { u = new URL(/^[a-z][a-z0-9+.-]*:\/\//i.test(raw) ? raw : `https://${raw}`); }
  catch { throw new IdFinderError('INVALID_URL'); }
  if (!['http:', 'https:'].includes(u.protocol)) throw new IdFinderError('INVALID_URL');
  if (u.username || u.password) throw new IdFinderError('INVALID_URL', { detail: 'credentials in url' });
  return u;
}

module.exports = { isPrivateIp, assertPublicHost, setLookup, parseUserUrl };
