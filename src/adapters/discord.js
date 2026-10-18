'use strict';

const { getJson } = require('../http');
const { IdFinderError } = require('../errors');
const { makeResult, segments, need, expectObject } = require('../result');

const SNOWFLAKE = /^\d{15,21}$/;
const CODE = /^[A-Za-z0-9-]{2,32}$/;

module.exports = {
  id: 'discord', name: 'Discord', aliases: ['dc'],
  hosts: ['discord.com', 'discord.gg', 'discordapp.com', 'ptb.discord.com', 'canary.discord.com'],
  status: 'partial',
  objectTypes: ['server (invite orqali)', 'channel', 'message'],
  idTypes: ['server_id', 'channel_id', 'message_id'],
  requiredKeys: [], optionalKeys: [],
  limitation: "Username orqali foydalanuvchi ID'sini topib bo'lmaydi (Discord buni ochiq API'da bermaydi). Server/kanal/xabar ID'lari havoladan olinadi.",
  unsupportedHint: "Taklif havolasi (discord.gg/…) yoki xabar havolasini (discord.com/channels/…) yuboring. Foydalanuvchi ID'si uchun Discord'da Developer Mode yoqib, profilni o'ng tugma bilan bosing → «Copy User ID».",
  health: 'https://discord.com/api/v10/gateway',

  parseUrl(url) {
    const h = url.hostname.toLowerCase();
    const s = segments(url.pathname);
    if (h === 'discord.gg') return CODE.test(s[0] || '') ? { kind: 'invite', code: s[0] } : null;
    if (s[0] === 'invite' && CODE.test(s[1] || '')) return { kind: 'invite', code: s[1] };
    if (s[0] === 'channels') {
      if (s[1] === '@me') return { kind: 'dm' };
      if (SNOWFLAKE.test(s[1] || '') && SNOWFLAKE.test(s[2] || '')) {
        return { kind: 'channel', guild: s[1], channel: s[2], message: SNOWFLAKE.test(s[3] || '') ? s[3] : undefined };
      }
    }
    return null;
  },
  parseText(t) { return CODE.test(t) ? { kind: 'invite', code: t } : null; },

  async resolve(d) {
    if (d.kind === 'dm') throw new IdFinderError('PRIVATE');
    if (d.kind === 'channel') {
      const ids = [{ type: 'server_id', value: d.guild }, { type: 'channel_id', value: d.channel }];
      if (d.message) ids.push({ type: 'message_id', value: d.message });
      return makeResult({ platform: 'Discord', objectType: d.message ? 'Xabar' : 'Kanal', ids, status: 'partial',
        source: "Havola (API orqali tasdiqlanmagan)", notes: ["ID'lar havola ichidan olindi; mavjudligi Discord API orqali tekshirilmadi."] });
    }
    const inv = need(expectObject(await getJson(`https://discord.com/api/v10/invites/${encodeURIComponent(d.code)}?with_counts=true`)), 'code');
    if (!inv.guild || !inv.guild.id) throw new IdFinderError('ID_MISSING', { hint: "Bu taklif serverga tegishli emas (guruh DM yoki profil taklifi bo'lishi mumkin)." });
    const ids = [{ type: 'server_id', value: inv.guild.id }];
    if (inv.channel && inv.channel.id) ids.push({ type: 'channel_id', value: inv.channel.id });
    return makeResult({ platform: 'Discord', objectType: 'Server (taklif orqali)', name: inv.guild.name, ids, source: 'Discord API v10',
      extra: inv.approximate_member_count ? { members: inv.approximate_member_count } : undefined });
  }
};
