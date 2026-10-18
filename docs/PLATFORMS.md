# Qo'llab-quvvatlanadigan platformalar

> Bu fayl `npm run docs` orqali avtomatik yaratiladi. Qo'lda tahrirlamang.

**"Jonli tekshirilgan"** — adapter haqiqiy API bilan sinovdan o'tganini bildiradi. "yo'q (faqat mock)" — kod mock javoblar bilan tekshirilgan, lekin haqiqiy API bilan hali sinalmagan.

| # | Platforma | Holat | Aniqlanadigan ID turlari | API kalitlari | Jonli tekshirilgan | Cheklov / izoh |
|---|---|---|---|---|---|---|
| 1 | Telegram | ishlaydi | user/chat/kanal/bot/forum ID | — | — | Botning asosiy (avvalgi) funksiyasi |
| 2 | Discord | qisman ishlaydi | server_id, channel_id, message_id | — | yo'q (faqat mock) | Username orqali foydalanuvchi ID'sini topib bo'lmaydi (Discord buni ochiq API'da bermaydi). Server/kanal/xabar ID'lari havoladan olinadi. |
| 3 | Slack | qisman: faqat havoladan ID ajratadi | workspace_id, channel_id, message_ts | — | yo'q (faqat mock) | Slack ID'larini API orqali olish uchun workspace'ga bot o'rnatish va OAuth kerak; bot faqat havoladagi ID'ni ajratadi. |
| 4 | WhatsApp | **tayyor emas** | — | — | — | Ochiq ID API'si yo'q; WhatsApp Business API faqat o'z biznes raqamingiz uchun. |
| 5 | Facebook | qisman: faqat havoladan ID ajratadi | profile_id, group_id, post_id | — | yo'q (faqat mock) | Username sahifalari uchun ID olish Graph API (ilova + ruxsat) talab qiladi; faqat havoladagi raqamli ID'lar ajratiladi. |
| 6 | Instagram | **tayyor emas** | — | — | — | Graph API ilova ko'rib chiqishi va Business akkaunt talab qiladi; havoladagi shortcode API ID emas. |
| 7 | X | qisman: faqat havoladan ID ajratadi | post_id | — | yo'q (faqat mock) | Username → user ID uchun X API pullik (v2) tarifi kerak. Faqat post ID'si havoladan olinadi. |
| 8 | Reddit | qisman ishlaydi | subreddit_id, user_id, post_id, comment_id, fullname | REDDIT_CLIENT_ID, REDDIT_CLIENT_SECRET | yo'q (faqat mock) | Kalitlarsiz Reddit server IP'larini ko'pincha bloklaydi; post/izoh ID'lari havoladan olinadi va faqat kalit bilan API orqali tasdiqlanadi. |
| 9 | LinkedIn | **tayyor emas** | — | — | — | API faqat tasdiqlangan hamkorlar uchun; scraping shartlarni buzadi. |
| 10 | Twitch | tayyor, lekin API kaliti kerak | user_id | TWITCH_CLIENT_ID (majburiy), TWITCH_CLIENT_SECRET (majburiy) | yo'q (faqat mock) | Twitch Helix API uchun client credentials majburiy. |
| 11 | Matrix | qisman ishlaydi | user_id, room_id, event_id | — | yo'q (faqat mock) | Matrix ID'lari o'zi ma'noli (@user:server, !room:server). Alias → room ID faqat ochiq katalog yoqilgan serverlarda ishlaydi. |
| 12 | YouTube | qisman ishlaydi | video_id, channel_id, playlist_id | YOUTUBE_API_KEY | yo'q (faqat mock) | @handle, /c/ va /user/ havolalari uchun YOUTUBE_API_KEY majburiy. Kalitsiz video/kanal/pleylist ID'si havoladan olinadi (tasdiqlanmaydi). |
| 13 | TikTok | qisman: faqat havoladan ID ajratadi | video_id | — | yo'q (faqat mock) | Qisqa havolalar (vm.tiktok.com) kuzatilmaydi; profil ID'si ochiq API'da yo'q. |
| 14 | Pinterest | qisman: faqat havoladan ID ajratadi | pin_id | — | yo'q (faqat mock) | Faqat pin ID'si havoladan olinadi; profil/doska uchun Pinterest API OAuth talab qiladi. |
| 15 | Mastodon | qisman ishlaydi | account_id, status_id | MASTODON_HOSTS | yo'q (faqat mock) | Mastodon ID lari faqat o'sha server (instance) ichida amal qiladi. Faqat ro'yxatdagi serverlar (MASTODON_HOSTS orqali kengaytiriladi). |
| 16 | Bluesky | ishlaydi (to'liq) | did, post_uri, post_cid | — | yo'q (faqat mock) |  |
| 17 | GitHub | ishlaydi (to'liq) | user_id, organization_id, repository_id, issue_id, pull_request_id | GITHUB_TOKEN | yo'q (faqat mock) |  |
| 18 | GitLab | ishlaydi (to'liq) | user_id, group_id, project_id, issue_id | GITLAB_TOKEN | yo'q (faqat mock) |  |
| 19 | Bitbucket | ishlaydi (to'liq) | workspace_id, repository_id | — | yo'q (faqat mock) |  |
| 20 | Stack Overflow | ishlaydi (to'liq) | user_id, question_id, answer_id | STACKEXCHANGE_KEY | yo'q (faqat mock) | Anonim so'rovlar kuniga ~300 ta (IP bo'yicha); kalit bilan 10 000 ta. |
| 21 | Stack Exchange | ishlaydi (to'liq) | user_id, question_id, answer_id | STACKEXCHANGE_KEY | yo'q (faqat mock) | Anonim so'rovlar kuniga ~300 ta (IP bo'yicha); kalit bilan 10 000 ta. |
| 22 | Hugging Face | qisman ishlaydi | model_id, dataset_id, space_id, internal_id | — | yo'q (faqat mock) | Foydalanuvchi/tashkilot ID'lari ochiq API'da tasdiqlanmagan; faqat model, dataset va space. |
| 23 | npm | qisman ishlaydi | package_name | — | ha (2026-10-18) | npm raqamli ID bermaydi — reyestrdagi yagona identifikator paket nomi. |
| 24 | PyPI | qisman ishlaydi | package_name | — | ha (2026-10-18) | PyPI raqamli ID bermaydi — paket nomi (PEP 503 bo'yicha normallashtirilgan) identifikator hisoblanadi. |
| 25 | Docker Hub | qisman ishlaydi | user_id, organization_id | — | yo'q (faqat mock) | Repozitoriy uchun alohida ID tasdiqlanmagan: faqat egasining (user/org) ID'si qaytariladi. |
| 26 | SourceForge | **tayyor emas** | — | — | — | Hali tekshirilmagan: barqaror ochiq ID sxemasi tasdiqlanmadi. |
| 27 | Codeberg | ishlaydi (to'liq) | user_id, repository_id | GITEA_HOSTS | yo'q (faqat mock) |  |
| 28 | Gitea | ishlaydi (to'liq) | user_id, repository_id | GITEA_HOSTS | yo'q (faqat mock) |  |
| 29 | Google Drive | qisman: faqat havoladan ID ajratadi | file_id, folder_id, document_id | — | yo'q (faqat mock) | ID havoladan olinadi; fayl ulashilganligi yoki mavjudligi tekshirilmaydi. |
| 30 | Google Cloud | **tayyor emas** | — | — | — | Loyiha/resurs ID'lari OAuth yoki service account talab qiladi; ular odatda shaxsiy. |
| 31 | Firebase | **tayyor emas** | — | — | — | Loyiha ID'lari shaxsiy; ochiq qidiruv API'si yo'q. |
| 32 | Supabase | **tayyor emas** | — | — | — | Management API shaxsiy token talab qiladi. |
| 33 | AWS | **tayyor emas** | — | — | — | Hisob/resurs ID'lari shaxsiy (IAM autentifikatsiyasi kerak). |
| 34 | Cloudflare | **tayyor emas** | — | — | — | Zone/account ID'lari faqat o'z API tokeningiz bilan olinadi. |
| 35 | Vercel | **tayyor emas** | — | — | — | API token talab qiladi; loyihalar odatda shaxsiy. |
| 36 | Netlify | **tayyor emas** | — | — | — | API token talab qiladi; saytlar odatda shaxsiy. |
| 37 | Notion | qisman: faqat havoladan ID ajratadi | page_or_database_id | — | yo'q (faqat mock) | Havoladan sahifa va database'ni farqlab bo'lmaydi; ID UUID formatiga keltiriladi. |
| 38 | Trello | **tayyor emas** | — | — | — | API key + token talab qilinadi, doskalar ko'pincha shaxsiy. |
| 39 | Jira | **tayyor emas** | — | — | — | Har bir Jira nusxasi alohida va autentifikatsiya talab qiladi. |
| 40 | Linear | **tayyor emas** | — | — | — | API kaliti talab qilinadi (ish maydoni shaxsiy). |
| 41 | Stripe | **tayyor emas** | — | — | — | Faqat o'z maxfiy kalitingiz bilan; mijoz/to'lov ma'lumotlari shaxsiy — bot bunga ruxsatsiz kirmaydi. |
| 42 | PayPal | **tayyor emas** | — | — | — | OAuth va merchant hisobi talab qilinadi; to'lov ma'lumotlari shaxsiy. |
| 43 | Figma | qisman: faqat havoladan ID ajratadi | file_key | — | yo'q (faqat mock) | Figma'da fayl identifikatori — «file key»; havoladan olinadi. |
| 44 | Product Hunt | **tayyor emas** | — | — | — | GraphQL API token talab qiladi; hali sozlanmagan. |
| 45 | Medium | **tayyor emas** | — | — | — | Ochiq API yopilgan; ID olishning rasmiy usuli yo'q. |
| 46 | Dev.to | ishlaydi (to'liq) | user_id, article_id | — | yo'q (faqat mock) |  |
| 47 | Hashnode | ishlaydi (to'liq) | user_id, publication_id | — | yo'q (faqat mock) |  |
| 48 | Hacker News | ishlaydi (to'liq) | item_id, user_id | — | yo'q (faqat mock) | Hacker News foydalanuvchisining ID'si — uning username'i (raqamli ID yo'q). |
| 49 | Vimeo | qisman: faqat havoladan ID ajratadi | video_id | — | yo'q (faqat mock) | Faqat video ID'si havoladan olinadi (Vimeo API OAuth talab qiladi). |
| 50 | Dailymotion | qisman ishlaydi | video_id, user_id | — | yo'q (faqat mock) | Faqat video; foydalanuvchi sahifalari qo'llab-quvvatlanmaydi. |
