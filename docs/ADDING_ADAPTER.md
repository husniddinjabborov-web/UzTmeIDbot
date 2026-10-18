# Yangi platforma qo'shish

1. `src/adapters/<nom>.js` fayl yarating (fayl nomi `_` bilan boshlanmasin). `src/registry.js` uni **avtomatik** yuklaydi.
2. Adapter obyektini eksport qiling (bir faylda bir nechta adapter kerak bo'lsa — massiv).
3. `test/fixtures.js` ga mock fixture qo'shing (yoki faqat havoladan ID olsa — `test/url-only.fixtures.js` ga). Reyestr testi fixture yo'q adapterni rad etadi.
4. `src/catalog.js` dagi mos qatorga `adapter: '<id>'` yozing, so'ng `npm run docs` va `npm test`.

## Namuna

```js
'use strict';
const { getJson } = require('../http');                 // xavfsiz HTTP: https-only, timeout, redirect nazorati
const { makeResult, segments, isSafeName, need, expectObject } = require('../result');

module.exports = {
  id: 'example', name: 'Example', aliases: ['ex'],      // aliases → "ex alice" ko'rinishidagi kiritish
  hosts: ['example.com'],                               // yoki matchHost: h => h.endsWith('.example.com')
  status: 'full',                                       // full | partial | url_only | needs_key
  objectTypes: ['user'], idTypes: ['user_id'],
  requiredKeys: [], optionalKeys: ['EXAMPLE_TOKEN'],    // /status shu yerdan o'qiydi
  limitation: "Cheklovlar bo'lsa shu yerda halol yozing.",
  health: 'https://api.example.com/ping',               // ixtiyoriy: /status uchun ochiq manzil

  // URL → deskriptor. Tanimasa null qaytaring (foydalanuvchiga UNSUPPORTED_OBJECT ko'rsatiladi).
  parseUrl(url) {
    const s = segments(url.pathname);
    return isSafeName(s[0]) ? { kind: 'user', username: s[0] } : null;   // yo'lga qo'yiladigan nomni DOIM tekshiring
  },
  parseText(t) { return isSafeName(t) ? { kind: 'user', username: t } : null; },   // ixtiyoriy

  async resolve(d) {
    const u = need(expectObject(await getJson(`https://api.example.com/users/${encodeURIComponent(d.username)}`)), 'id');
    return makeResult({
      platform: 'Example', objectType: 'Foydalanuvchi', name: u.name, owner: u.login,
      ids: [{ type: 'user_id', value: u.id }],          // faqat API javobidan olingan qiymatlar
      source: 'Example REST API', url: u.html_url
    });
  }
};
```

## Qoidalar

- **ID'ni hech qachon taxmin qilmang.** API bermagan maydon uchun `need()` `ID_MISSING` ko'taradi.
- Havola segmentidan olingan, API bilan tasdiqlanmagan ID → `status: 'partial'` va `source: "Havola (API orqali tasdiqlanmagan)"`.
- Foydalanuvchi ma'lumotidan **host** olinadigan bo'lsa (Mastodon, Matrix, Gitea kabi), `getJson(..., { dynamicHost: true })` ishlating va hostni oldindan ro'yxat bilan cheklang.
- Token faqat `process.env` / `src/config.js` orqali; xato matnlari va loglarga tushmasin (`logger.redact` bor).
- Xatolar `IdFinderError` (kodlar: `src/errors.js`) orqali ko'tariladi; HTTP status → xato xaritasi `src/http.js` da.
- Adapter faqat o'z platformasi bilan shug'ullanadi: bir adapterdagi xato boshqalarga ta'sir qilmaydi.
- Haqiqiy API bilan sinab ko'rgach `liveVerified: '<sana>'` qo'ying (faqat rostdan tekshirgan bo'lsangiz).
