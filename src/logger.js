'use strict';

const { env } = require('./config');

const SECRET_ENV = [
  'BOT_TOKEN', 'GITHUB_TOKEN', 'GITLAB_TOKEN', 'YOUTUBE_API_KEY', 'REDDIT_CLIENT_SECRET',
  'TWITCH_CLIENT_SECRET', 'STACKEXCHANGE_KEY', 'DISCORD_BOT_TOKEN'
];

/** Loglarga token tushib qolmasligi uchun barcha maxfiy qiymatlarni yashiradi. */
function redact(text) {
  let s = String(text);
  for (const name of SECRET_ENV) {
    const v = env(name);
    if (v && v.length >= 6) s = s.split(v).join('[REDACTED]');
  }
  // URL ichidagi bot tokenlari va ?key= parametrlari
  s = s.replace(/bot\d{6,}:[A-Za-z0-9_-]{20,}/g, 'bot[REDACTED]')
       .replace(/([?&](?:key|token|access_token|client_secret)=)[^&\s]+/gi, '$1[REDACTED]');
  return s;
}

function make(level) {
  return (...args) => process.env.IDFINDER_QUIET === '1' ? undefined : console[level](redact(args.map(a => (a instanceof Error ? a.message : typeof a === 'string' ? a : JSON.stringify(a))).join(' ')));
}

module.exports = { info: make('log'), warn: make('warn'), error: make('error'), redact };
