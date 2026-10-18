'use strict';

/**
 * Faqat HAVOLA ichidan ID ajratadigan adapterlar (tarmoqqa so'rov yubormaydi).
 * Natijalar doim status: 'partial' va "API orqali tasdiqlanmagan" deb belgilanadi.
 * Ro'yxatda bo'lmagan obyekt turlari (masalan X/TikTok profillari) UNSUPPORTED_OBJECT beradi.
 */
const { makeResult, segments } = require('../result');

function urlOnly({ id, name, aliases = [], hosts, matchHost, objectTypes, idTypes, limitation, unsupportedHint, extract }) {
  return {
    id, name, aliases, hosts, matchHost, status: 'url_only',
    objectTypes, idTypes, requiredKeys: [], optionalKeys: [], limitation, unsupportedHint, health: null,
    parseUrl: extract,
    async resolve(d) {
      return makeResult({
        platform: d.platform || name, objectType: d.objectType, ids: d.ids, status: 'partial',
        source: "Havola (API orqali tasdiqlanmagan)",
        notes: d.notes || ["ID havola ichidan olindi; obyekt mavjudligi platforma API'si orqali tekshirilmadi."]
      });
    }
  };
}

const digits = v => /^\d{5,25}$/.test(v || '');

module.exports = [
  urlOnly({
    id: 'slack', name: 'Slack', hosts: ['slack.com', 'app.slack.com'], matchHost: h => h.endsWith('.slack.com'),
    objectTypes: ['channel', 'workspace', 'message'], idTypes: ['workspace_id', 'channel_id', 'message_ts'],
    limitation: "Slack ID'larini API orqali olish uchun workspace'ga bot o'rnatish va OAuth kerak; bot faqat havoladagi ID'ni ajratadi.",
    unsupportedHint: "Kanal havolasini yuboring (…slack.com/archives/C0123ABCD).",
    extract(url) {
      const s = segments(url.pathname);
      if (s[0] === 'archives' && /^[CGD][A-Z0-9]{6,}$/.test(s[1] || '')) {
        const ids = [{ type: 'channel_id', value: s[1] }];
        const m = (s[2] || '').match(/^p(\d{10})(\d{6})$/);
        if (m) ids.push({ type: 'message_ts', value: `${m[1]}.${m[2]}` });
        return { objectType: m ? 'Xabar' : 'Kanal', ids };
      }
      if (s[0] === 'client' && /^T[A-Z0-9]{6,}$/.test(s[1] || '') && /^[CGD][A-Z0-9]{6,}$/.test(s[2] || '')) {
        return { objectType: 'Kanal', ids: [{ type: 'workspace_id', value: s[1] }, { type: 'channel_id', value: s[2] }] };
      }
      return null;
    }
  }),
  urlOnly({
    id: 'x', name: 'X (Twitter)', aliases: ['twitter'], hosts: ['x.com', 'twitter.com', 'mobile.twitter.com'],
    objectTypes: ['post (tweet)'], idTypes: ['post_id'],
    limitation: "Username → user ID uchun X API pullik (v2) tarifi kerak. Faqat post ID'si havoladan olinadi.",
    unsupportedHint: "Profil ID'sini ochiq API orqali olib bo'lmaydi. Post havolasini yuboring (x.com/user/status/123…).",
    extract(url) {
      const s = segments(url.pathname);
      if (s[1] === 'status' && /^\d{5,25}$/.test(s[2] || '')) return { objectType: 'Post', ids: [{ type: 'post_id', value: s[2] }] };
      return null;
    }
  }),
  urlOnly({
    id: 'tiktok', name: 'TikTok', hosts: ['tiktok.com'], matchHost: h => h.endsWith('.tiktok.com') && !h.startsWith('vm.') && !h.startsWith('vt.'),
    objectTypes: ['video'], idTypes: ['video_id'],
    limitation: "Qisqa havolalar (vm.tiktok.com) kuzatilmaydi; profil ID'si ochiq API'da yo'q.",
    unsupportedHint: "To'liq video havolasini yuboring (tiktok.com/@user/video/123…).",
    extract(url) {
      const s = segments(url.pathname);
      if (/^@/.test(s[0] || '') && s[1] === 'video' && digits(s[2])) return { objectType: 'Video', ids: [{ type: 'video_id', value: s[2] }] };
      return null;
    }
  }),
  urlOnly({
    id: 'pinterest', name: 'Pinterest', hosts: ['pinterest.com'], matchHost: h => /(^|\.)pinterest\.[a-z.]+$/.test(h),
    objectTypes: ['pin'], idTypes: ['pin_id'],
    limitation: "Faqat pin ID'si havoladan olinadi; profil/doska uchun Pinterest API OAuth talab qiladi.",
    unsupportedHint: "Pin havolasini yuboring (pinterest.com/pin/123…).",
    extract(url) {
      const s = segments(url.pathname);
      return s[0] === 'pin' && digits(s[1]) ? { objectType: 'Pin', ids: [{ type: 'pin_id', value: s[1] }] } : null;
    }
  }),
  urlOnly({
    id: 'facebook', name: 'Facebook', aliases: ['fb'], hosts: ['facebook.com', 'm.facebook.com', 'fb.com'],
    objectTypes: ['profile (profile.php)', 'group (raqamli)', 'post'], idTypes: ['profile_id', 'group_id', 'post_id'],
    limitation: "Username sahifalari uchun ID olish Graph API (ilova + ruxsat) talab qiladi; faqat havoladagi raqamli ID'lar ajratiladi.",
    unsupportedHint: "Facebook username'dan ID olish uchun Graph API ruxsati kerak. profile.php?id=…, /groups/<raqam> yoki /posts/<raqam> ko'rinishidagi havola yuboring.",
    extract(url) {
      const s = segments(url.pathname);
      if (s[0] === 'profile.php' && digits(url.searchParams.get('id'))) return { objectType: 'Profil', ids: [{ type: 'profile_id', value: url.searchParams.get('id') }] };
      if (s[0] === 'groups' && digits(s[1])) return { objectType: 'Guruh', ids: [{ type: 'group_id', value: s[1] }] };
      if (s[1] === 'posts' && /^\d{5,25}$/.test(s[2] || '')) return { objectType: 'Post', ids: [{ type: 'post_id', value: s[2] }] };
      return null;
    }
  }),
  urlOnly({
    id: 'vimeo', name: 'Vimeo', hosts: ['vimeo.com', 'player.vimeo.com'],
    objectTypes: ['video'], idTypes: ['video_id'],
    limitation: "Faqat video ID'si havoladan olinadi (Vimeo API OAuth talab qiladi).",
    extract(url) {
      const s = segments(url.pathname);
      const id = s[0] === 'video' ? s[1] : s[0];
      return /^\d{4,12}$/.test(id || '') ? { objectType: 'Video', ids: [{ type: 'video_id', value: id }] } : null;
    }
  }),
  urlOnly({
    id: 'googledrive', name: 'Google Drive / Docs', aliases: ['gdrive', 'drive'], hosts: ['drive.google.com', 'docs.google.com'],
    objectTypes: ['file', 'folder', 'document/sheet/slides'], idTypes: ['file_id', 'folder_id', 'document_id'],
    limitation: "ID havoladan olinadi; fayl ulashilganligi yoki mavjudligi tekshirilmaydi.",
    extract(url) {
      const s = segments(url.pathname);
      const ID = /^[A-Za-z0-9_-]{15,}$/;
      const di = s.indexOf('d');
      if (di !== -1 && ID.test(s[di + 1] || '')) {
        const kind = url.hostname === 'drive.google.com' ? ['Fayl', 'file_id'] : [{ document: 'Hujjat', spreadsheets: 'Jadval', presentation: 'Taqdimot', forms: 'Forma' }[s[0]] || 'Hujjat', 'document_id'];
        return { objectType: kind[0], ids: [{ type: kind[1], value: s[di + 1] }] };
      }
      const fi = s.indexOf('folders');
      if (fi !== -1 && ID.test(s[fi + 1] || '')) return { objectType: 'Papka', ids: [{ type: 'folder_id', value: s[fi + 1] }] };
      const q = url.searchParams.get('id');
      return q && ID.test(q) ? { objectType: 'Fayl', ids: [{ type: 'file_id', value: q }] } : null;
    }
  }),
  urlOnly({
    id: 'figma', name: 'Figma', hosts: ['figma.com'],
    objectTypes: ['file'], idTypes: ['file_key'],
    limitation: "Figma'da fayl identifikatori — «file key»; havoladan olinadi.",
    extract(url) {
      const s = segments(url.pathname);
      return ['file', 'design', 'proto', 'board', 'slides'].includes(s[0]) && /^[A-Za-z0-9]{15,30}$/.test(s[1] || '')
        ? { objectType: 'Fayl', ids: [{ type: 'file_key', value: s[1] }] } : null;
    }
  }),
  urlOnly({
    id: 'notion', name: 'Notion', hosts: ['notion.so', 'www.notion.so'], matchHost: h => h.endsWith('.notion.site') || h.endsWith('.notion.so'),
    objectTypes: ['page / database'], idTypes: ['page_or_database_id'],
    limitation: "Havoladan sahifa va database'ni farqlab bo'lmaydi; ID UUID formatiga keltiriladi.",
    extract(url) {
      const m = url.pathname.match(/([0-9a-f]{32})(?:[/?#]|$)/i) || url.pathname.match(/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i);
      if (!m) return null;
      const h = m[1].replace(/-/g, '').toLowerCase();
      const uuid = `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
      return { objectType: 'Sahifa yoki database', ids: [{ type: 'page_or_database_id', value: uuid }] };
    }
  })
];
