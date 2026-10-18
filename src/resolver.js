'use strict';

const { IdFinderError } = require('./errors');
const { parseInput } = require('./parser');
const registry = require('./registry');
const logger = require('./logger');

/**
 * Matn → natijalar ro'yxati.
 * Qaytaradi: null (bu modulga tegishli emas) yoki { results: [...] }.
 * Xato bo'lsa IdFinderError ko'taradi (platforma nomi `err.platform` da).
 */
async function resolveInput(text) {
  const parsed = parseInput(text, registry.aliasMap);
  if (parsed.kind === 'none') return null;
  if (parsed.kind === 'invalid_url') throw new IdFinderError('INVALID_URL');

  let adapter, descriptor;

  if (parsed.kind === 'url') {
    adapter = registry.findByHost(parsed.url.hostname);
    if (!adapter) throw new IdFinderError('UNKNOWN_PLATFORM');
    descriptor = adapter.parseUrl(parsed.url);
  } else if (parsed.kind === 'matrix') {
    adapter = registry.byId.get('matrix');
    descriptor = adapter.parseText(parsed.value);
  } else {
    adapter = registry.aliasMap.get(parsed.alias);
    if (typeof adapter.parseText !== 'function') {
      throw withPlatform(new IdFinderError('UNSUPPORTED_OBJECT', { hint: `${adapter.name} uchun to'liq havola yuboring.` }), adapter);
    }
    descriptor = adapter.parseText(parsed.rest);
  }

  if (!descriptor) {
    throw withPlatform(new IdFinderError('UNSUPPORTED_OBJECT', { hint: adapter.unsupportedHint }), adapter);
  }

  try {
    const out = await adapter.resolve(descriptor);
    const results = (Array.isArray(out) ? out : [out]).filter(Boolean);
    if (!results.length || results.some(r => !r.ids || !r.ids.length)) throw new IdFinderError('ID_MISSING');
    return { results };
  } catch (err) {
    if (err instanceof IdFinderError) throw withPlatform(err, adapter);
    logger.error(`[resolver] ${adapter.id} kutilmagan xato: ${err.message}`);
    throw withPlatform(new IdFinderError('BAD_RESPONSE', { detail: err.message }), adapter);
  }
}

function withPlatform(err, adapter) { err.platform = adapter.name; return err; }

module.exports = { resolveInput };
