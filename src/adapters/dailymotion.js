'use strict';

const { getJson } = require('../http');
const { makeResult, segments, need, expectObject } = require('../result');

module.exports = {
  id: 'dailymotion', name: 'Dailymotion',
  hosts: ['dailymotion.com', 'dai.ly'],
  status: 'partial',
  objectTypes: ['video'],
  idTypes: ['video_id', 'user_id'],
  requiredKeys: [], optionalKeys: [],
  limitation: "Faqat video; foydalanuvchi sahifalari qo'llab-quvvatlanmaydi.",
  health: 'https://api.dailymotion.com/video/x2m8jpp?fields=id',

  parseUrl(url) {
    const s = segments(url.pathname);
    const id = url.hostname.endsWith('dai.ly') ? s[0] : (s[0] === 'video' ? (s[1] || '').split('_')[0] : null);
    return id && /^[a-z0-9]{4,12}$/i.test(id) ? { id } : null;
  },

  async resolve(d) {
    const v = need(expectObject(await getJson(`https://api.dailymotion.com/video/${encodeURIComponent(d.id)}?fields=id,title,owner`)), 'id');
    return makeResult({ platform: 'Dailymotion', objectType: 'Video', name: v.title, owner: v.owner,
      ids: [{ type: 'video_id', value: v.id }, ...(v.owner ? [{ type: 'user_id', value: v.owner }] : [])],
      source: 'Dailymotion Data API', url: `https://www.dailymotion.com/video/${v.id}` });
  }
};
