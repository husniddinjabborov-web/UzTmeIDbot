require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');

const TOKEN = process.env.BOT_TOKEN;

if (!TOKEN) {
  console.error('❌ BOT_TOKEN topilmadi! .env faylini tekshiring.');
  process.exit(1);
}

const bot = new TelegramBot(TOKEN, { polling: true });

// ─── Yordamchi funksiyalar ─────────────────────────────────────────────────────

function turKorinishi(tur) {
  const turlar = {
    user:       '👤 Oddiy foydalanuvchi',
    premium:    '⭐ Premium foydalanuvchi',
    bot:        '🤖 Bot',
    group:      '👥 Guruh',
    channel:    '📢 Kanal',
    forum:      '💬 Forum',
    my_group:   '👥 Mening guruhim',
    my_channel: '📢 Mening kanalim',
    my_forum:   '💬 Mening forumim',
  };
  return turlar[tur] || '❓ Noma\'lum';
}

// ─── Asosiy menyu ─────────────────────────────────────────────────────────────

function asosiyMenyu(chatId, ism) {
  bot.sendMessage(
    chatId,
    `🔍 Quyidagi tugmalardan birini tanlang:\n\n` +
    `• <b>User / Premium / Bot</b> — foydalanuvchi ID'sini aniqlash\n` +
    `• <b>Group / Channel / Forum</b> — guruh/kanal/forum ID'sini aniqlash\n` +
    `• <b>My Group / My Channel / My Forum</b> — o'zingiznikini ulashish`,
    {
      parse_mode: 'HTML',
      reply_markup: {
        keyboard: [
          [
            { text: '👤 User',    request_user: { request_id: 10, user_is_bot: false, user_is_premium: false } },
            { text: '⭐ Premium', request_user: { request_id: 11, user_is_bot: false, user_is_premium: true  } },
            { text: '🤖 Bot',     request_user: { request_id: 12, user_is_bot: true                          } }
          ],
          [
            { text: '👥 Group',   request_chat: { request_id: 20, chat_is_channel: false, chat_is_forum: false } },
            { text: '📢 Channel', request_chat: { request_id: 21, chat_is_channel: true                        } },
            { text: '💬 Forum',   request_chat: { request_id: 22, chat_is_channel: false, chat_is_forum: true  } }
          ],
          [
            { text: '👥 My Group',   request_chat: { request_id: 30, chat_is_channel: false, chat_is_forum: false, chat_is_created: true } },
            { text: '📢 My Channel', request_chat: { request_id: 31, chat_is_channel: true,                        chat_is_created: true } },
            { text: '💬 My Forum',   request_chat: { request_id: 32, chat_is_channel: false, chat_is_forum: true,  chat_is_created: true } }
          ]
        ],
        resize_keyboard: true
      }
    }
  ).catch(err => console.error('Menyu xatosi:', err.message));
}

// ─── ID natijasini yuborish ────────────────────────────────────────────────────

function idNatijasi(chatId, tur, id) {
  const turNomi = turKorinishi(tur);

  const matn =
    `✅ <b>${turNomi}</b>\n\n` +
    `◆ ID: <code>${id}</code>`;

  bot.sendMessage(chatId, matn, {
    parse_mode: 'HTML',
    reply_markup: {
      inline_keyboard: [
        [
          { text: `📋 ID nusxalash: ${id}`, callback_data: `copy_${id}` }
        ],
        [
          { text: '🚀 ID ulashish', switch_inline_query: `${turNomi} ID: ${id}` }
        ]
      ]
    }
  }).catch(err => console.error('Natija xatosi:', err.message));
}

// ─── /start ───────────────────────────────────────────────────────────────────

bot.onText(/\/start/, (msg) => {
  const ism    = msg.from.first_name || 'Foydalanuvchi';
  const userId = msg.from.id;
  const chatId = msg.chat.id;

  // Avval foydalanuvchining o'z ID'sini ko'rsat
  bot.sendMessage(
    chatId,
    `👋 Salom, <b>${ism}</b>!\n\n` +
    `🆔 <b>Sizning ID'ingiz:</b> <code>${userId}</code>\n\n` +
    `📌 Biror xabarni <b>forward</b> qiling — men uning ID'ini aniqlayman!`,
    { parse_mode: 'HTML' }
  ).then(() => asosiyMenyu(chatId, ism))
   .catch(err => console.error('/start xatosi:', err.message));
});

// ─── /id — o'z ma'lumotlaringizni bilish ──────────────────────────────────────

bot.onText(/\/id/, (msg) => {
  const userId   = msg.from.id;
  const chatId   = msg.chat.id;
  const userName = msg.from.username ? `@${msg.from.username}` : 'Yo\'q';

  bot.sendMessage(
    chatId,
    `🆔 <b>Sizning ma'lumotlaringiz:</b>\n\n` +
    `◆ User ID: <code>${userId}</code>\n` +
    `◆ Chat ID: <code>${chatId}</code>\n` +
    `◆ Username: ${userName}`,
    { parse_mode: 'HTML' }
  ).catch(err => console.error('/id xatosi:', err.message));
});

// ─── /help ────────────────────────────────────────────────────────────────────

bot.onText(/\/help/, (msg) => {
  bot.sendMessage(
    msg.chat.id,
    `📖 <b>Buyruqlar ro'yxati:</b>\n\n` +
    `/start — Asosiy menyuni ochish\n` +
    `/id    — O'z ID'ingizni bilish\n` +
    `/help  — Yordam\n\n` +
    `<b>Tugmalar:</b>\n` +
    `👤 <b>User</b>       — oddiy foydalanuvchi ID'si\n` +
    `⭐ <b>Premium</b>    — premium foydalanuvchi ID'si\n` +
    `🤖 <b>Bot</b>        — bot ID'si\n` +
    `👥 <b>Group</b>      — guruh ID'si\n` +
    `📢 <b>Channel</b>    — kanal ID'si\n` +
    `💬 <b>Forum</b>      — forum ID'si\n` +
    `👥 <b>My Group</b>   — o'z guruhingiz ID'si\n` +
    `📢 <b>My Channel</b> — o'z kanalingiz ID'si\n` +
    `💬 <b>My Forum</b>   — o'z forumingiz ID'si`,
    { parse_mode: 'HTML' }
  ).catch(err => console.error('/help xatosi:', err.message));
});

// ─── Xabarlarni qabul qilish ──────────────────────────────────────────────────

bot.on('message', (msg) => {
  // Buyruqlarni o'tkazib yuboring
  if (msg.text && msg.text.startsWith('/')) return;

  // ── Forward qilingan xabarlarni aniqlash ──────────────────────────────────
  if (msg.forward_origin) {
    const origin = msg.forward_origin;
    let matn = '';

    if (origin.type === 'user') {
      // Oddiy foydalanuvchidan forward
      const user = origin.sender_user;
      const id   = user.id;
      const ism  = user.first_name || 'Noma\'lum';
      const username = user.username ? `@${user.username}` : 'Yo\'q';
      matn =
        `✅ <b>👤 Forward: Foydalanuvchi</b>\n\n` +
        `◆ Ismi: <b>${ism}</b>\n` +
        `◆ Username: ${username}\n` +
        `◆ ID: <code>${id}</code>`;
      return bot.sendMessage(msg.chat.id, matn, {
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [
            [{ text: `📋 ID nusxalash: ${id}`, callback_data: `copy_${id}` }],
            [{ text: '🚀 ID ulashish', switch_inline_query: `Foydalanuvchi ID: ${id}` }]
          ]
        }
      }).catch(err => console.error('Forward user xatosi:', err.message));
    }

    if (origin.type === 'hidden_user') {
      // Foydalanuvchi o'z maxfiyligini yoqib qo'ygan
      matn =
        `⚠️ <b>Forward: Foydalanuvchi</b>\n\n` +
        `❌ ID'ni olib bo'lmadi!\n` +
        `📌 Sabab: Foydalanuvchi forward'da o'z ismini yashirgan.`;
      return bot.sendMessage(msg.chat.id, matn, { parse_mode: 'HTML' })
        .catch(err => console.error('Forward hidden_user xatosi:', err.message));
    }

    if (origin.type === 'chat') {
      // Guruh yoki kanaldan forward
      const chat = origin.sender_chat;
      const id   = chat.id;
      const title = chat.title || 'Noma\'lum';
      const tur   = chat.type === 'channel' ? '📢 Kanal' : '👥 Guruh';
      matn =
        `✅ <b>Forward: ${tur}</b>\n\n` +
        `◆ Nomi: <b>${title}</b>\n` +
        `◆ ID: <code>${id}</code>`;
      return bot.sendMessage(msg.chat.id, matn, {
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [
            [{ text: `📋 ID nusxalash: ${id}`, callback_data: `copy_${id}` }],
            [{ text: '🚀 ID ulashish', switch_inline_query: `${tur} ID: ${id}` }]
          ]
        }
      }).catch(err => console.error('Forward chat xatosi:', err.message));
    }

    if (origin.type === 'channel') {
      // Kanal xabaridan forward (to'liq ma'lumot)
      const chat = origin.chat;
      const id   = chat.id;
      const title = chat.title || 'Noma\'lum';
      matn =
        `✅ <b>Forward: 📢 Kanal</b>\n\n` +
        `◆ Nomi: <b>${title}</b>\n` +
        `◆ ID: <code>${id}</code>`;
      return bot.sendMessage(msg.chat.id, matn, {
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [
            [{ text: `📋 ID nusxalash: ${id}`, callback_data: `copy_${id}` }],
            [{ text: '🚀 ID ulashish', switch_inline_query: `Kanal ID: ${id}` }]
          ]
        }
      }).catch(err => console.error('Forward channel xatosi:', err.message));
    }

    // Noma'lum forward turi
    matn = `⚠️ <b>Forward:</b>\n\n❌ ID'ni olib bo'lmadi!\n📌 Sabab: Noma'lum forward turi.`;
    return bot.sendMessage(msg.chat.id, matn, { parse_mode: 'HTML' })
      .catch(err => console.error('Forward noma\'lum xatosi:', err.message));
  }

  // ── Eski usul: forward_from (eski Telegram API versiyalari uchun) ──────────
  if (msg.forward_from) {
    const user = msg.forward_from;
    const id   = user.id;
    const ism  = user.first_name || 'Noma\'lum';
    const username = user.username ? `@${user.username}` : 'Yo\'q';
    const matn =
      `✅ <b>👤 Forward: Foydalanuvchi</b>\n\n` +
      `◆ Ismi: <b>${ism}</b>\n` +
      `◆ Username: ${username}\n` +
      `◆ ID: <code>${id}</code>`;
    return bot.sendMessage(msg.chat.id, matn, {
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: [
          [{ text: `📋 ID nusxalash: ${id}`, callback_data: `copy_${id}` }],
          [{ text: '🚀 ID ulashish', switch_inline_query: `Foydalanuvchi ID: ${id}` }]
        ]
      }
    }).catch(err => console.error('forward_from xatosi:', err.message));
  }

  if (msg.forward_from_chat) {
    const chat  = msg.forward_from_chat;
    const id    = chat.id;
    const title = chat.title || 'Noma\'lum';
    const tur   = chat.type === 'channel' ? '📢 Kanal' : '👥 Guruh';
    const matn =
      `✅ <b>Forward: ${tur}</b>\n\n` +
      `◆ Nomi: <b>${title}</b>\n` +
      `◆ ID: <code>${id}</code>`;
    return bot.sendMessage(msg.chat.id, matn, {
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: [
          [{ text: `📋 ID nusxalash: ${id}`, callback_data: `copy_${id}` }],
          [{ text: '🚀 ID ulashish', switch_inline_query: `${tur} ID: ${id}` }]
        ]
      }
    }).catch(err => console.error('forward_from_chat xatosi:', err.message));
  }

  if (msg.forward_sender_name) {
    // Foydalanuvchi forward'da ismini yashirgan (eski API)
    const matn =
      `⚠️ <b>Forward: Foydalanuvchi</b>\n\n` +
      `❌ ID'ni olib bo'lmadi!\n` +
      `📌 Sabab: Foydalanuvchi forward'da o'z ismini yashirgan.`;
    return bot.sendMessage(msg.chat.id, matn, { parse_mode: 'HTML' })
      .catch(err => console.error('forward_sender_name xatosi:', err.message));
  }

  // ── Foydalanuvchi ulashildi (User / Premium / Bot) ────────────────────────
  if (msg.users_shared) {
    const reqId = msg.users_shared.request_id;
    const users = msg.users_shared.users;

    if (!users || users.length === 0) {
      return bot.sendMessage(msg.chat.id, '⚠️ Foydalanuvchi ma\'lumoti topilmadi.');
    }

    let tur = 'user';
    if (reqId === 11) tur = 'premium';
    if (reqId === 12) tur = 'bot';

    users.forEach(user => idNatijasi(msg.chat.id, tur, user.user_id));
    return;
  }

  // ── Chat ulashildi (Group / Channel / Forum / My ...) ─────────────────────
  if (msg.chat_shared) {
    const reqId  = msg.chat_shared.request_id;
    const chatId = msg.chat_shared.chat_id;

    const turMap = {
      20: 'group',
      21: 'channel',
      22: 'forum',
      30: 'my_group',
      31: 'my_channel',
      32: 'my_forum',
    };

    const tur = turMap[reqId] || 'group';
    idNatijasi(msg.chat.id, tur, chatId);
    return;
  }
});

// ─── Callback — nusxalash ─────────────────────────────────────────────────────

bot.on('callback_query', (query) => {
  if (!query.data.startsWith('copy_')) return;

  const id = query.data.replace('copy_', '');

  bot.answerCallbackQuery(query.id, {
    text: `✅ ${id} — nusxalandi!`,
    show_alert: false
  }).catch(err => console.error('Callback xatosi:', err.message));
});

// ─── Inline mode ──────────────────────────────────────────────────────────────

bot.on('inline_query', (query) => {
  const matn = query.query.trim();
  if (!matn) return;

  const natijalar = [
    {
      type:  'article',
      id:    '1',
      title: `ID: ${matn}`,
      description: 'ID ni ulashish uchun bosing',
      input_message_content: {
        message_text: `🆔 ID: <code>${matn}</code>`,
        parse_mode:   'HTML'
      }
    }
  ];

  bot.answerInlineQuery(query.id, natijalar, { cache_time: 0 })
    .catch(err => console.error('Inline xatosi:', err.message));
});

// ─── Xato ushlash ─────────────────────────────────────────────────────────────

bot.on('polling_error', (err) => {
  console.error('⚠️  Polling xatosi:', err.message);
});

process.on('unhandledRejection', (reason) => {
  console.error('❌ Kutilmagan xato:', reason);
});

console.log('✅ Bot muvaffaqiyatli ishga tushdi!');