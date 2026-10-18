'use strict';

const { getJson } = require('../http');
const { env } = require('../config');
const { IdFinderError } = require('../errors');
const { makeResult, segments, expectObject, expectArray } = require('../result');

const VIDEO = /^[A-Za-z0-9_-]{11}$/;
const CHANNEL = /^UC[A-Za-z0-9_-]{22}$/;
const PLAYLIST = /^[A-Za-z0-9_-]{10,50}$/;
const API = 'https://www.googleapis.com/youtube/v3';

async function api(resource, params) {
  const q = new URLSearchParams({ part: 'snippet', ...params, key: env('YOUTUBE_API_KEY') });
  const body = expectObject(await getJson(`${API}/${resource}?${q}`));
  const items = expectArray(body.items);
  if (!items.length) throw new IdFinderError('NOT_FOUND');
  return items[0];
}

module.exports = {
  id: 'youtube', name: 'YouTube', aliases: ['yt'],
  hosts: ['youtube.com', 'm.youtube.com', 'music.youtube.com', 'youtu.be'],
  status: 'partial',
  objectTypes: ['video', 'channel', 'playlist'],
  idTypes: ['video_id', 'channel_id', 'playlist_id'],
  requiredKeys: [], optionalKeys: ['YOUTUBE_API_KEY'],
  limitation: "@handle, /c/ va /user/ havolalari uchun YOUTUBE_API_KEY majburiy. Kalitsiz video/kanal/pleylist ID'si havoladan olinadi (tasdiqlanmaydi).",
  unsupportedHint: "Video, kanal (/channel/UC… yoki @handle) yoki pleylist havolasini yuboring.",
  health: null,

  parseUrl(url) {
    const h = url.hostname.toLowerCase().replace(/^www\./, '');
    const s = segments(url.pathname);
    if (h === 'youtu.be') return VIDEO.test(s[0] || '') ? { kind: 'video', id: s[0] } : null;
    const v = url.searchParams.get('v');
    if (s[0] === 'watch' && VIDEO.test(v || '')) return { kind: 'video', id: v };
    if (['shorts', 'live', 'embed', 'v'].includes(s[0]) && VIDEO.test(s[1] || '')) return { kind: 'video', id: s[1] };
    if (s[0] === 'playlist' && PLAYLIST.test(url.searchParams.get('list') || '')) return { kind: 'playlist', id: url.searchParams.get('list') };
    if (s[0] === 'channel' && CHANNEL.test(s[1] || '')) return { kind: 'channel', id: s[1] };
    if (/^@[A-Za-z0-9._-]{3,30}$/.test(s[0] || '')) return { kind: 'handle', handle: s[0] };
    if (s[0] === 'user' && /^[A-Za-z0-9]{1,30}$/.test(s[1] || '')) return { kind: 'legacy_user', name: s[1] };
    return null;
  },
  parseText(t) { return /^@[A-Za-z0-9._-]{3,30}$/.test(t) ? { kind: 'handle', handle: t } : (VIDEO.test(t) ? { kind: 'video', id: t } : null); },

  async resolve(d) {
    const platform = 'YouTube', hasKey = !!env('YOUTUBE_API_KEY');
    const source = 'YouTube Data API v3';

    if (d.kind === 'handle' || d.kind === 'legacy_user') {
      if (!hasKey) throw new IdFinderError('NO_TOKEN', { hint: "Kanal ID'sini bilsangiz /channel/UC… ko'rinishidagi havolani yuboring." });
      const it = await api('channels', d.kind === 'handle' ? { forHandle: d.handle } : { forUsername: d.name });
      return makeResult({ platform, objectType: 'Kanal', name: it.snippet && it.snippet.title, owner: it.snippet && it.snippet.customUrl,
        ids: [{ type: 'channel_id', value: it.id }], source, url: `https://www.youtube.com/channel/${it.id}` });
    }

    const label = { video: 'Video', channel: 'Kanal', playlist: 'Pleylist' }[d.kind];
    const idType = `${d.kind}_id`;
    if (!hasKey) {
      return makeResult({ platform, objectType: label, ids: [{ type: idType, value: d.id }], status: 'partial',
        source: "Havola (API orqali tasdiqlanmagan)", notes: ["YOUTUBE_API_KEY sozlanmagani uchun obyekt mavjudligi tekshirilmadi."] });
    }
    const it = await api({ video: 'videos', channel: 'channels', playlist: 'playlists' }[d.kind], { id: d.id });
    const ids = [{ type: idType, value: it.id }];
    if (it.snippet && it.snippet.channelId && d.kind !== 'channel') ids.push({ type: 'channel_id', value: it.snippet.channelId });
    return makeResult({ platform, objectType: label, name: it.snippet && it.snippet.title, owner: it.snippet && (it.snippet.channelTitle || undefined),
      ids, source });
  }
};
