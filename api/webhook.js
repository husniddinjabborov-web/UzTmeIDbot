const TelegramBot = require('node-telegram-bot-api');

const TOKEN = process.env.BOT_TOKEN;

// Webhook rejimida bot (polling: false)
const bot = new TelegramBot(TOKEN);

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

function asosiyMenyu(chatId) {
  return bot.sendMessage(
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
  );
}

// ─── ID natijasini yuborish ────────────────────────────────────────────────────

function idNatijasi(chatId, tur, id) {
  const turNomi = turKorinishi(tur);
  return bot.sendMessage(chatId,
    `✅ <b>${turNomi}</b>\n\n◆ ID: <code>${id}</code>`,
    {
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: [
          [{ text: `📋 ID nusxalash: ${id}`, callback_data: `copy_${id}` }],
          [{ text: '🚀 ID ulashish', switch_inline_query: `${turNomi} ID: ${id}` }]
        ]
      }
    }
  );
}

// ─── Update'ni qayta ishlash ───────────────────────────────────────────────────

async function handleUpdate(update) {
  // ── Callback query ──────────────────────────────────────────────────────────
  if (update.callback_query) {
    const query = update.callback_query;
    if (query.data && query.data.startsWith('copy_')) {
      const id = query.data.replace('copy_', '');
      await bot.answerCallbackQuery(query.id, {
        text: `✅ ${id} — nusxalandi!`,
        show_alert: false
      });
    }
    return;
  }

  // ── Inline query ────────────────────────────────────────────────────────────
  if (update.inline_query) {
    const query = update.inline_query;
    const matn  = query.query.trim();
    if (matn) {
      await bot.answerInlineQuery(query.id, [
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
      ], { cache_time: 0 });
    }
    return;
  }

  // ── Oddiy xabar ─────────────────────────────────────────────────────────────
  const msg = update.message;
  if (!msg) return;

  const chatId = msg.chat.id;

  // /start
  if (msg.text && msg.text.startsWith('/start')) {
    const ism    = msg.from.first_name || 'Foydalanuvchi';
    const userId = msg.from.id;
    await bot.sendMessage(
      chatId,
      `👋 Salom, <b>${ism}</b>!\n\n` +
      `🆔 <b>Sizning ID'ingiz:</b> <code>${userId}</code>\n\n` +
      `📌 Biror xabarni <b>forward</b> qiling — men uning ID'ini aniqlayman!`,
      { parse_mode: 'HTML' }
    );
    await asosiyMenyu(chatId);
    return;
  }

  // /id
  if (msg.text && msg.text.startsWith('/id')) {
    const userId   = msg.from.id;
    const userName = msg.from.username ? `@${msg.from.username}` : 'Yo\'q';
    await bot.sendMessage(
      chatId,
      `🆔 <b>Sizning ma'lumotlaringiz:</b>\n\n` +
      `◆ User ID: <code>${userId}</code>\n` +
      `◆ Chat ID: <code>${chatId}</code>\n` +
      `◆ Username: ${userName}`,
      { parse_mode: 'HTML' }
    );
    return;
  }

  // /help
  if (msg.text && msg.text.startsWith('/help')) {
    await bot.sendMessage(
      chatId,
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
    );
    return;
  }

  // Boshqa buyruqlarni o'tkazib yuboring
  if (msg.text && msg.text.startsWith('/')) return;

  // ── Forward xabarlar ────────────────────────────────────────────────────────
  if (msg.forward_origin) {
    const origin = msg.forward_origin;

    if (origin.type === 'user') {
      const user     = origin.sender_user;
      const id       = user.id;
      const ism      = user.first_name || 'Noma\'lum';
      const username = user.username ? `@${user.username}` : 'Yo\'q';
      await bot.sendMessage(chatId,
        `✅ <b>👤 Forward: Foydalanuvchi</b>\n\n` +
        `◆ Ismi: <b>${ism}</b>\n` +
        `◆ Username: ${username}\n` +
        `◆ ID: <code>${id}</code>`,
        {
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: [
              [{ text: `📋 ID nusxalash: ${id}`, callback_data: `copy_${id}` }],
              [{ text: '🚀 ID ulashish', switch_inline_query: `Foydalanuvchi ID: ${id}` }]
            ]
          }
        }
      );
      return;
    }

    if (origin.type === 'hidden_user') {
      await bot.sendMessage(chatId,
        `⚠️ <b>Forward: Foydalanuvchi</b>\n\n❌ ID'ni olib bo'lmadi!\n📌 Sabab: Foydalanuvchi forward'da o'z ismini yashirgan.`,
        { parse_mode: 'HTML' }
      );
      return;
    }

    if (origin.type === 'chat') {
      const chat  = origin.sender_chat;
      const id    = chat.id;
      const title = chat.title || 'Noma\'lum';
      const tur   = chat.type === 'channel' ? '📢 Kanal' : '👥 Guruh';
      await bot.sendMessage(chatId,
        `✅ <b>Forward: ${tur}</b>\n\n◆ Nomi: <b>${title}</b>\n◆ ID: <code>${id}</code>`,
        {
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: [
              [{ text: `📋 ID nusxalash: ${id}`, callback_data: `copy_${id}` }],
              [{ text: '🚀 ID ulashish', switch_inline_query: `${tur} ID: ${id}` }]
            ]
          }
        }
      );
      return;
    }

    if (origin.type === 'channel') {
      const chat  = origin.chat;
      const id    = chat.id;
      const title = chat.title || 'Noma\'lum';
      await bot.sendMessage(chatId,
        `✅ <b>Forward: 📢 Kanal</b>\n\n◆ Nomi: <b>${title}</b>\n◆ ID: <code>${id}</code>`,
        {
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: [
              [{ text: `📋 ID nusxalash: ${id}`, callback_data: `copy_${id}` }],
              [{ text: '🚀 ID ulashish', switch_inline_query: `Kanal ID: ${id}` }]
            ]
          }
        }
      );
      return;
    }

    await bot.sendMessage(chatId,
      `⚠️ <b>Forward:</b>\n\n❌ ID'ni olib bo'lmadi!\n📌 Sabab: Noma'lum forward turi.`,
      { parse_mode: 'HTML' }
    );
    return;
  }

  // Eski API: forward_from
  if (msg.forward_from) {
    const user     = msg.forward_from;
    const id       = user.id;
    const ism      = user.first_name || 'Noma\'lum';
    const username = user.username ? `@${user.username}` : 'Yo\'q';
    await bot.sendMessage(chatId,
      `✅ <b>👤 Forward: Foydalanuvchi</b>\n\n` +
      `◆ Ismi: <b>${ism}</b>\n◆ Username: ${username}\n◆ ID: <code>${id}</code>`,
      {
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [
            [{ text: `📋 ID nusxalash: ${id}`, callback_data: `copy_${id}` }],
            [{ text: '🚀 ID ulashish', switch_inline_query: `Foydalanuvchi ID: ${id}` }]
          ]
        }
      }
    );
    return;
  }

  if (msg.forward_from_chat) {
    const chat  = msg.forward_from_chat;
    const id    = chat.id;
    const title = chat.title || 'Noma\'lum';
    const tur   = chat.type === 'channel' ? '📢 Kanal' : '👥 Guruh';
    await bot.sendMessage(chatId,
      `✅ <b>Forward: ${tur}</b>\n\n◆ Nomi: <b>${title}</b>\n◆ ID: <code>${id}</code>`,
      {
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [
            [{ text: `📋 ID nusxalash: ${id}`, callback_data: `copy_${id}` }],
            [{ text: '🚀 ID ulashish', switch_inline_query: `${tur} ID: ${id}` }]
          ]
        }
      }
    );
    return;
  }

  if (msg.forward_sender_name) {
    await bot.sendMessage(chatId,
      `⚠️ <b>Forward: Foydalanuvchi</b>\n\n❌ ID'ni olib bo'lmadi!\n📌 Sabab: Foydalanuvchi forward'da o'z ismini yashirgan.`,
      { parse_mode: 'HTML' }
    );
    return;
  }

  // ── users_shared ────────────────────────────────────────────────────────────
  if (msg.users_shared) {
    const reqId = msg.users_shared.request_id;
    const users = msg.users_shared.users;
    if (!users || users.length === 0) {
      await bot.sendMessage(chatId, '⚠️ Foydalanuvchi ma\'lumoti topilmadi.');
      return;
    }
    let tur = 'user';
    if (reqId === 11) tur = 'premium';
    if (reqId === 12) tur = 'bot';
    for (const user of users) {
      await idNatijasi(chatId, tur, user.user_id);
    }
    return;
  }

  // ── chat_shared ─────────────────────────────────────────────────────────────
  if (msg.chat_shared) {
    const reqId  = msg.chat_shared.request_id;
    const sharedChatId = msg.chat_shared.chat_id;
    const turMap = { 20: 'group', 21: 'channel', 22: 'forum', 30: 'my_group', 31: 'my_channel', 32: 'my_forum' };
    await idNatijasi(chatId, turMap[reqId] || 'group', sharedChatId);
    return;
  }
}

// ─── Vercel Serverless Handler ─────────────────────────────────────────────────

module.exports = async (req, res) => {
  // Faqat POST so'rovlarini qabul qilish
  if (req.method !== 'POST') {
    return res.status(200).json({ ok: true, message: 'Bot ishlayapti! 🤖' });
  }

  try {
    await handleUpdate(req.body);
  } catch (err) {
    console.error('Update xatosi:', err.message);
    // Telegram'ga har doim 200 qaytarish (qayta urinishlarni oldini olish)
  }

  res.status(200).json({ ok: true });
};