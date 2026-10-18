'use strict';

const { getJson } = require('../http');
const { makeResult, segments, isSafeName, need, expectObject } = require('../result');

const KINDS = { models: ['Model', 'model_id'], datasets: ['Dataset', 'dataset_id'], spaces: ['Space', 'space_id'] };
const RESERVED = new Set(['docs', 'blog', 'join', 'login', 'settings', 'pricing', 'tasks', 'papers', 'organizations', 'collections', 'new', 'chat']);

module.exports = {
  id: 'huggingface', name: 'Hugging Face', aliases: ['hf'],
  hosts: ['huggingface.co', 'hf.co'],
  status: 'partial',
  objectTypes: ['model', 'dataset', 'space'],
  idTypes: ['model_id', 'dataset_id', 'space_id', 'internal_id'],
  requiredKeys: [], optionalKeys: [],
  limitation: "Foydalanuvchi/tashkilot ID'lari ochiq API'da tasdiqlanmagan; faqat model, dataset va space.",
  unsupportedHint: "Hugging Face uchun model/dataset/space havolasini yuboring (masalan huggingface.co/gpt2).",
  health: 'https://huggingface.co/api/models?limit=1',

  parseUrl(url) {
    let s = segments(url.pathname);
    let kind = 'models';
    if (s[0] === 'datasets' || s[0] === 'spaces') { kind = s[0]; s = s.slice(1); }
    else if (s[0] === 'models') return null;
    else if (RESERVED.has(s[0])) return null;
    if (!s.length || !isSafeName(s[0])) return null;
    if (s[1] && s[1] !== 'tree' && s[1] !== 'blob' && s[1] !== 'resolve' && !isSafeName(s[1])) return null;
    if (kind === 'models' && s.length === 1) return { kind, repo: s[0] };           // masalan: gpt2
    if (s.length < 2) return null;                                                   // faqat "user" sahifasi
    return { kind, repo: `${s[0]}/${s[1]}` };
  },

  async resolve(d) {
    const [label, idType] = KINDS[d.kind];
    const path = d.repo.split('/').map(encodeURIComponent).join('/');
    const doc = need(expectObject(await getJson(`https://huggingface.co/api/${d.kind}/${path}`)), 'id');
    return makeResult({
      platform: 'Hugging Face', objectType: label, name: doc.id, owner: doc.author || doc.id.split('/')[0],
      ids: [{ type: idType, value: doc.id }, ...(doc._id ? [{ type: 'internal_id', value: doc._id }] : [])],
      source: 'Hugging Face Hub API',
      url: `https://huggingface.co/${d.kind === 'models' ? '' : d.kind + '/'}${doc.id}`
    });
  }
};
