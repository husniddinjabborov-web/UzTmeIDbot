'use strict';
/** docs/PLATFORMS.md ni katalog va adapterlardan avtomatik hosil qiladi: `npm run docs` */
const fs = require('fs');
const path = require('path');
const { entries } = require('../src/catalog');

const rows = entries().map(e => {
  const a = e.adapter;
  if (e.status === 'existing') return `| ${e.n} | ${e.name} | ishlaydi | user/chat/kanal/bot/forum ID | — | — | Botning asosiy (avvalgi) funksiyasi |`;
  if (!a) return `| ${e.n} | ${e.name} | **tayyor emas** | — | — | — | ${e.reason} |`;
  const keys = [...a.requiredKeys.map(k => `${k} (majburiy)`), ...a.optionalKeys].join(', ') || '—';
  const live = a.liveVerified ? `ha (${a.liveVerified})` : "yo'q (faqat mock)";
  return `| ${e.n} | ${e.name} | ${e.label.split(' · ')[0]} | ${a.idTypes.join(', ')} | ${keys} | ${live} | ${a.limitation || ''} |`;
});

const md = `# Qo'llab-quvvatlanadigan platformalar

> Bu fayl \`npm run docs\` orqali avtomatik yaratiladi. Qo'lda tahrirlamang.

**"Jonli tekshirilgan"** — adapter haqiqiy API bilan sinovdan o'tganini bildiradi. "yo'q (faqat mock)" — kod mock javoblar bilan tekshirilgan, lekin haqiqiy API bilan hali sinalmagan.

| # | Platforma | Holat | Aniqlanadigan ID turlari | API kalitlari | Jonli tekshirilgan | Cheklov / izoh |
|---|---|---|---|---|---|---|
${rows.join('\n')}
`;
fs.writeFileSync(path.join(__dirname, '..', 'docs', 'PLATFORMS.md'), md);
console.log('docs/PLATFORMS.md yozildi');
