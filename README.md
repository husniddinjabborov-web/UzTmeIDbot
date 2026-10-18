# UzTmeIDbot — Universal ID Finder

Telegram bot: ID'larni aniqlaydi. Avvalgi funksiyalar (Telegram user/chat/kanal ID, forward, `t.me` havolalari, `/mention`, inline) o'zgarmagan.
Yangi: GitHub, GitLab, YouTube, Discord, Reddit va boshqa platformalar havolalari/username'lari bo'yicha **API'dan olingan haqiqiy ID**.

## Foydalanish

```
https://github.com/torvalds/linux      → repository_id, owner user_id
github torvalds                        → user_id
npm express · pypi requests · @user:matrix.org
/json <havola>                         → mashina o'qiydigan JSON
/platforms · /status · /search · /cancel
```

Natija ostidagi **📋 Nusxalash** tugmasi ID'ni bir bosishda nusxalaydi (Telegram `copy_text`).
Holat `qisman` bo'lsa — ID havoladan olingan yoki to'liq tasdiqlanmagan; sababi xabarda yoziladi.

## O'rnatish

```bash
npm install
cp .env.example .env      # BOT_TOKEN va ixtiyoriy kalitlarni kiriting
npm start                 # polling rejimi (bot.js)
npm test                  # mock testlar (tarmoqsiz)
INTEGRATION=1 npm run test:integration   # haqiqiy API bilan (GitHub tokeni tavsiya etiladi)
```

Vercel: `api/webhook.js`, `BOT_TOKEN` va ixtiyoriy kalitlarni Environment Variables'ga qo'shing, so'ng `npm run setup-webhook`.

## Arxitektura

```
Telegram (api/webhook.js | bot.js)
   └─ src/telegram/handlers.js     buyruqlar, rate limit, formatlash
        └─ src/resolver.js         matn → parser → adapter → standart natija
             ├─ src/parser.js      URL / "platforma qiymat" / Matrix ID
             ├─ src/registry.js    src/adapters/*.js ni avtomatik yuklaydi
             ├─ src/adapters/*     har platforma uchun alohida adapter
             ├─ src/http.js        xavfsiz HTTP (https-only, SSRF, timeout, redirect)
             └─ src/security.js    ichki IP / localhost rad etish
```

`t.me` havolalari va `@username` — avvalgidek eski kod orqali ishlaydi.

## Hujjatlar

- [docs/PLATFORMS.md](docs/PLATFORMS.md) — 50 platformaning holati, ID turlari, kalitlar, cheklovlar
- [docs/ADDING_ADAPTER.md](docs/ADDING_ADAPTER.md) — yangi platforma qo'shish

## Ma'lum cheklovlar

- Faqat **npm** va **PyPI** adapterlari haqiqiy API bilan sinalgan; qolganlari mock bilan. Jonli tekshirish uchun `INTEGRATION=1` testini o'z kalitlaringiz bilan ishga tushiring.
- 18 ta platforma amalga oshirilmagan (sabablari `docs/PLATFORMS.md` da).
- Rate limit xotirada (serverless'da har instansiya uchun alohida); `/status` ro'yxatdagi ochiq manzillarni tekshiradi, kalit talab qiladigan xizmatlarni emas.
- `/search` holat saqlamaydi: u shunchaki ko'rsatma va `force_reply` yuboradi.
- DNS rebinding'dan to'liq himoya yo'q: `dynamicHost` so'rovlarida DNS tekshiruvi va ulanish orasida kichik vaqt oynasi bor (host ro'yxatlari bilan cheklangan).
