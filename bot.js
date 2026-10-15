require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');

const TOKEN = process.env.BOT_TOKEN;

if (!TOKEN) {
  console.error('❌ BOT_TOKEN topilmadi! .env faylini tekshiring.');
  process.exit(1);
}

const bot = new TelegramBot(TOKEN, { polling: true });

// ─── Majburiy obuna kanali ─────────────────────────────────────────────────────

const KANAL_ID       = -1002323019888;
const KANAL_USERNAME = '@Jabborovman';
const KANAL_URL      = 'https://t.me/Jabborovman'
/**
 * Foydalanuvchi kanalga obuna bo'lganini tekshiradi.
 * true  → obuna bo'lgan
 * false → obuna bo'lmagan
 */
async function obunaTekshir(userId) {
  try {
    const member = await bot.getChatMember(KANAL_ID, userId);
    return ['member', 'administrator', 'creator'].includes(member.status);
  } catch {
    return false;
  }
}

/**
 * Obuna bo'lmagan foydalanuvchiga xabar yuboradi.
 */
async function obunaXabari(chatId) {
  await bot.sendMessage(
    chatId,
    `🔒 <b>Botdan foydalanish uchun kanalga obuna bo'ling!</b>\n\n` +
    `📢 Kanal: ${KANAL_URL}\n\n` +
    `Obuna bo'lgandan so'ng ✅ <b>Tekshirish</b> tugmasini bosing.`,
    {
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: [
          [{ text: '📢 Kanalga o\'tish', url: KANAL_URL }],
          [{ text: '✅ Obunani tekshirish', callback_data: 'check_subscription' }]
        ]
      }
    }
  ).catch(err => console.error('Obuna xabari xatosi:', err.message));
}

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

// ─── URL orqali username/ID aniqlash ──────────────────────────────────────────

function urlDanUsernameAjrat(matn) {
  matn = matn.trim();

  const raqamliKanal = matn.match(/t\.me\/c\/(\d+)/i);
  if (raqamliKanal) {
    return { type: 'numeric_chat', value: '-100' + raqamliKanal[1] };
  }

  const inviteLink = matn.match(/t\.me\/\+([A-Za-z0-9_-]+)/i);
  if (inviteLink) {
    return { type: 'invite', value: inviteLink[1] };
  }

  const tMeUsername = matn.match(/(?:https?:\/\/)?t\.me\/([A-Za-z0-9_]{3,})/i);
  if (tMeUsername) {
    return { type: 'username', value: '@' + tMeUsername[1] };
  }

  const atUsername = matn.match(/^@([A-Za-z0-9_]{3,})$/);
  if (atUsername) {
    return { type: 'username', value: '@' + atUsername[1] };
  }

  const raqamliId = matn.match(/^-?\d{5,15}$/);
  if (raqamliId) {
    return { type: 'raw_id', value: raqamliId[0] };
  }

  return null;
}

async function urlOrqaliIdAniqlash(chatId, matn) {
  const natija = urlDanUsernameAjrat(matn);

  if (!natija) return false;

  if (natija.type === 'invite') {
    await bot.sendMessage(chatId,
      `⚠️ <b>Taklif havolasi aniqlandi</b>\n\n` +
      `❌ Taklif (invite) havolalaridan ID olib bo'lmaydi!\n\n` +
      `📌 <b>Sabab:</b> Bu xususiy (private) guruh/kanal havolasi bo'lib, Telegram API orqali ID'ni aniqlash imkoni yo'q.\n\n` +
      `💡 <b>Yechim:</b> Guruh/kanalga kiring va botni u yerga qo'shing, keyin /id buyrug'ini yuboring.`,
      { parse_mode: 'HTML' }
    );
    return true;
  }

  if (natija.type === 'numeric_chat') {
    const id = natija.value;
    await bot.sendMessage(chatId,
      `✅ <b>URL orqali aniqlandi</b>\n\n` +
      `◆ Tur: 📢 Kanal / Guruh\n` +
      `◆ ID: <code>${id}</code>\n\n` +
      `⚠️ Bu ID faqat URL'dan olingan. To'liq ma'lumot uchun botni kanalga qo'shing.`,
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
    return true;
  }

  if (natija.type === 'raw_id') {
    const id = natija.value;

    // Avval botga tanish bo'lsa — haqiqiy ismini olishga harakat qilamiz
    let korinishMatni = id;   // topilmasa, ID'ning o'zi ko'rinadi
    let uname = null;
    let chatType = null;

    try {
      const chat = await bot.getChat(id);
      chatType   = chat.type;
      uname      = chat.username ? `@${chat.username}` : null;
      const ism  = chat.first_name || chat.title || null;
      const familya = chat.last_name ? ` ${chat.last_name}` : '';
      if (ism) korinishMatni = `${ism}${familya}`;
    } catch {
      // Bot bu ID'ni bilmaydi — muammo emas, ID'ning o'zini eslatma matni sifatida ishlatamiz
    }

    try {
      await bot.sendMessage(chatId, korinishMatni, {
        entities: [
          {
            type:   'text_mention',
            offset: 0,
            length: korinishMatni.length,
            user:   { id: Number(id), is_bot: false, first_name: korinishMatni }
          }
        ],
        reply_markup: {
          inline_keyboard: [
            [{ text: '👤 Profilni ochish', url: `tg://user?id=${id}` }],
            [{ text: `📋 ID nusxalash: ${id}`, callback_data: `copy_${id}` }]
          ]
        }
      });

      if (!chatType) {
        await bot.sendMessage(chatId,
          `ℹ️ <i>Eslatma yaratildi, lekin bot bu ID'ni oldin ko'rmagani uchun ismini bilmaydi — shu sabab ID'ning o'zi ko'rsatildi. ` +
          `Ismini o'zgartirish uchun: </i><code>/mention ${id} Ism Familiya</code>`,
          { parse_mode: 'HTML' }
        );
      } else if (chatType !== 'private') {
        await bot.sendMessage(chatId,
          `⚠️ <i>Diqqat: bu ID foydalanuvchi emas, ${chatType === 'channel' ? 'kanal' : 'guruh/chat'} ID'siga o'xshaydi. ` +
          `text_mention faqat shaxsiy foydalanuvchilar uchun ishlaydi, shuning uchun havola ishlamasligi mumkin.</i>`,
          { parse_mode: 'HTML' }
        );
      }
    } catch (err) {
      await bot.sendMessage(chatId,
        `❌ <b>Eslatma yaratib bo'lmadi</b>\n\nID: <code>${id}</code>\n📌 Sabab: ${err.message}`,
        { parse_mode: 'HTML' }
      ).catch(e => console.error('raw_id mention xatosi:', e.message));
    }

    return true;
  }

  const username = natija.value;
  const yuklanmoqda = await bot.sendMessage(chatId,
    `🔄 <b>${username}</b> ma'lumotlari yuklanmoqda...`,
    { parse_mode: 'HTML' }
  );

  try {
    const chat  = await bot.getChat(username);
    const id    = chat.id;
    const title = chat.title || chat.first_name || chat.username || 'Noma\'lum';
    const uname = chat.username ? `@${chat.username}` : 'Yo\'q';

    let turNomi   = '❓ Noma\'lum';
    let qoshimcha = '';

    if (chat.type === 'private') {
      turNomi = chat.is_bot ? '🤖 Bot' : '👤 Foydalanuvchi';
      const familya = chat.last_name ? ` ${chat.last_name}` : '';
      qoshimcha =
        `◆ Ismi: <b>${title}${familya}</b>\n` +
        `◆ Username: ${uname}\n`;
    } else if (chat.type === 'channel') {
      turNomi   = '📢 Kanal';
      qoshimcha = `◆ Nomi: <b>${title}</b>\n◆ Username: ${uname}\n`;
      if (chat.member_count) {
        qoshimcha += `◆ A'zolar: <b>${chat.member_count.toLocaleString()}</b>\n`;
      }
    } else if (chat.type === 'supergroup') {
      turNomi   = chat.is_forum ? '💬 Forum' : '👥 Supergroup';
      qoshimcha = `◆ Nomi: <b>${title}</b>\n◆ Username: ${uname}\n`;
      if (chat.member_count) {
        qoshimcha += `◆ A'zolar: <b>${chat.member_count.toLocaleString()}</b>\n`;
      }
    } else if (chat.type === 'group') {
      turNomi   = '👥 Guruh';
      qoshimcha = `◆ Nomi: <b>${title}</b>\n`;
    }

    await bot.deleteMessage(chatId, yuklanmoqda.message_id).catch(() => {});

    await bot.sendMessage(chatId,
      `✅ <b>URL / Username orqali aniqlandi</b>\n\n` +
      `◆ Tur: ${turNomi}\n` +
      `${qoshimcha}` +
      `◆ ID: <code>${id}</code>`,
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
  } catch (err) {
    await bot.deleteMessage(chatId, yuklanmoqda.message_id).catch(() => {});

    await bot.sendMessage(chatId,
      `❌ <b>Xatolik yuz berdi</b>\n\n` +
      `Username: <code>${username}</code>\n\n` +
      `📌 <b>Sabab:</b> ${
        err.message.includes('chat not found')
          ? 'Bu foydalanuvchi, kanal yoki guruh topilmadi. Username noto\'g\'ri yoki akkaunt mavjud emas.'
          : err.message.includes('PEER_ID_INVALID')
          ? 'Noto\'g\'ri ID. Bot bu chatga kirish imkoniga ega emas.'
          : `API xatosi: ${err.message}`
      }`,
      { parse_mode: 'HTML' }
    ).catch(e => console.error('Xato xabari yuborishda muammo:', e.message));
  }

  return true;
}

// ─── text_mention orqali ID asosida eslatma yaratish ──────────────────────────

async function eslatmaYarat(chatId, buyruqMatni) {
  // Format: /mention <ID> <Ism (bir yoki bir necha so'z)>
  const qismlar = buyruqMatni.trim().split(/\s+/);
  const buyruq  = qismlar.shift(); // /mention

  const id  = qismlar.shift();
  const ism = qismlar.join(' ');

  if (!id || !/^\d{5,15}$/.test(id) || !ism) {
    await bot.sendMessage(chatId,
      `📌 <b>ID orqali eslatma yaratish</b>\n\n` +
      `Foydalanuvchi username'i bo'lmasa ham, uni ID orqali eslatib bo'ladi.\n\n` +
      `<b>Format:</b>\n<code>/mention 123456789 Ism Familiya</code>\n\n` +
      `⚠️ Ism — siz o'zingiz kiritasiz (bot buni bilmasligi mumkin, chunki bu shart emas).\n` +
      `✅ Bu usul ishlashi uchun bot o'sha foydalanuvchini oldin ko'rgan bo'lishi shart emas — ` +
      `faqat to'g'ri ID kifoya, chunki eslatmani Telegram serverlari o'zi hal qiladi.`,
      { parse_mode: 'HTML' }
    );
    return;
  }

  try {
    await bot.sendMessage(chatId, ism, {
      entities: [
        {
          type:   'text_mention',
          offset: 0,
          length: ism.length,
          user:   { id: Number(id), is_bot: false, first_name: ism }
        }
      ]
    });
  } catch (err) {
    await bot.sendMessage(chatId,
      `❌ <b>Eslatma yaratib bo'lmadi</b>\n\n📌 Sabab: ${err.message}`,
      { parse_mode: 'HTML' }
    ).catch(() => {});
  }
}



function asosiyMenyu(chatId) {
  bot.sendMessage(
    chatId,
    `🔍 <b>Quyidagi tugmalardan birini tanlang:</b>\n\n` +
    `👤 <b>Foydalanuvchi / Premium / Bot</b> — ID'sini aniqlash\n` +
    `👥 <b>Guruh / Kanal / Forum</b> — ID'sini aniqlash\n` +
    `🔗 <b>Havola / Username</b> — URL yoki @username yuboring\n` +
    `📨 <b>Forward</b> — Xabarni forward qiling`,
    {
      parse_mode: 'HTML',
      reply_markup: {
        keyboard: [
          [
            { text: '👤 Foydalanuvchi', request_user: { request_id: 10, user_is_bot: false, user_is_premium: false } },
            { text: '⭐ Premium',        request_user: { request_id: 11, user_is_bot: false, user_is_premium: true  } },
            { text: '🤖 Bot',            request_user: { request_id: 12, user_is_bot: true                          } }
          ],
          [
            { text: '👥 Guruh',   request_chat: { request_id: 20, chat_is_channel: false, chat_is_forum: false } },
            { text: '📢 Kanal',   request_chat: { request_id: 21, chat_is_channel: true                        } },
            { text: '💬 Forum',   request_chat: { request_id: 22, chat_is_channel: false, chat_is_forum: true  } }
          ],
          [
            { text: '👥 Mening guruhim',   request_chat: { request_id: 30, chat_is_channel: false, chat_is_forum: false, chat_is_created: true } },
            { text: '📢 Mening kanalim',   request_chat: { request_id: 31, chat_is_channel: true,                        chat_is_created: true } },
            { text: '💬 Mening forumim',   request_chat: { request_id: 32, chat_is_channel: false, chat_is_forum: true,  chat_is_created: true } }
          ],
          [
            { text: '🆔 Mening ID\'im' },
            { text: '📖 Yordam'         }
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
  bot.sendMessage(chatId,
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
  ).catch(err => console.error('Natija xatosi:', err.message));
}

// ─── /start ───────────────────────────────────────────────────────────────────

bot.onText(/\/start/, async (msg) => {
  const ism    = msg.from.first_name || 'Foydalanuvchi';
  const userId = msg.from.id;
  const chatId = msg.chat.id;

  // Obuna tekshiruvi
  const obunaBor = await obunaTekshir(userId);
  if (!obunaBor) {
    return obunaXabari(chatId);
  }

  bot.sendMessage(
    chatId,
    `👋 Salom, <b>${ism}</b>!\n\n` +
    `🆔 <b>Sizning ID'ingiz:</b> <code>${userId}</code>\n\n` +
    `📌 <b>Nima qila olaman?</b>\n` +
    `• Tugmalar orqali foydalanuvchi, bot, guruh, kanal ID'ini aniqlash\n` +
    `• <b>Forward</b> xabar yuborish orqali ID aniqlash\n` +
    `• <b>t.me/username</b> yoki <b>@username</b> yuboring — ID'ini topaman!\n\n` +
    `⬇️ Quyidagi menyudan foydalaning:`,
    { parse_mode: 'HTML' }
  ).then(() => asosiyMenyu(chatId))
   .catch(err => console.error('/start xatosi:', err.message));
});

// ─── /id ──────────────────────────────────────────────────────────────────────

bot.onText(/\/id/, async (msg) => {
  const userId   = msg.from.id;
  const chatId   = msg.chat.id;

  const obunaBor = await obunaTekshir(userId);
  if (!obunaBor) return obunaXabari(chatId);

  const userName = msg.from.username ? `@${msg.from.username}` : 'Yo\'q';
  const ism      = msg.from.first_name || 'Noma\'lum';
  const familya  = msg.from.last_name  ? ` ${msg.from.last_name}` : '';

  bot.sendMessage(
    chatId,
    `🆔 <b>Sizning ma'lumotlaringiz:</b>\n\n` +
    `◆ Ism: <b>${ism}${familya}</b>\n` +
    `◆ Username: ${userName}\n` +
    `◆ Foydalanuvchi ID: <code>${userId}</code>\n` +
    `◆ Chat ID: <code>${chatId}</code>`,
    {
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: [
          [{ text: `📋 ID nusxalash: ${userId}`, callback_data: `copy_${userId}` }],
          [{ text: '🚀 ID ulashish', switch_inline_query: `Foydalanuvchi ID: ${userId}` }]
        ]
      }
    }
  ).catch(err => console.error('/id xatosi:', err.message));
});

// ─── /mention — ID orqali text_mention yaratish ────────────────────────────────

bot.onText(/\/mention(.*)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const obunaBor = await obunaTekshir(msg.from.id);
  if (!obunaBor) return obunaXabari(chatId);

  await eslatmaYarat(chatId, '/mention' + match[1]);
});

// ─── /help ────────────────────────────────────────────────────────────────────

bot.onText(/\/help/, async (msg) => {
  const obunaBor = await obunaTekshir(msg.from.id);
  if (!obunaBor) return obunaXabari(msg.chat.id);

  bot.sendMessage(
    msg.chat.id,
    `📖 <b>Yordam — Buyruqlar ro'yxati:</b>\n\n` +
    `/start — Asosiy menyuni ochish\n` +
    `/id    — O'z ID'ingizni bilish\n` +
    `/mention <ID> <Ism> — ID orqali eslatma (text_mention) yaratish\n` +
    `/help  — Yordam\n\n` +
    `<b>📱 Tugmalar:</b>\n` +
    `👤 <b>Foydalanuvchi</b> — oddiy foydalanuvchi ID'si\n` +
    `⭐ <b>Premium</b>       — premium foydalanuvchi ID'si\n` +
    `🤖 <b>Bot</b>           — bot ID'si\n` +
    `👥 <b>Guruh</b>         — guruh ID'si\n` +
    `📢 <b>Kanal</b>         — kanal ID'si\n` +
    `💬 <b>Forum</b>         — forum ID'si\n` +
    `👥 <b>Mening guruhim</b>   — o'z guruhingiz ID'si\n` +
    `📢 <b>Mening kanalim</b>   — o'z kanalingiz ID'si\n` +
    `💬 <b>Mening forumim</b>   — o'z forumingiz ID'si\n\n` +
    `<b>🔗 URL / Username:</b>\n` +
    `Quyidagi formatlarni yuboring:\n` +
    `• <code>https://t.me/username</code>\n` +
    `• <code>https://t.me/c/1234567890</code> (kanal)\n` +
    `• <code>@username</code>\n\n` +
    `<b>📨 Forward:</b>\n` +
    `Istalgan xabarni forward qiling — ID'ini aniqlayman!`,
    { parse_mode: 'HTML' }
  ).catch(err => console.error('/help xatosi:', err.message));
});

// ─── Xabarlarni qabul qilish ──────────────────────────────────────────────────

bot.on('message', async (msg) => {
  if (msg.text && msg.text.startsWith('/')) return;

  const chatId = msg.chat.id;
  const userId = msg.from.id;

  // Obuna tekshiruvi — barcha xabarlar uchun
  const obunaBor = await obunaTekshir(userId);
  if (!obunaBor) return obunaXabari(chatId);

  // ── Menyu tugmalari ───────────────────────────────────────────────────────
  if (msg.text === '🆔 Mening ID\'im') {
    const userName = msg.from.username ? `@${msg.from.username}` : 'Yo\'q';
    const ism      = msg.from.first_name || 'Noma\'lum';
    const familya  = msg.from.last_name  ? ` ${msg.from.last_name}` : '';
    await bot.sendMessage(
      chatId,
      `🆔 <b>Sizning ma'lumotlaringiz:</b>\n\n` +
      `◆ Ism: <b>${ism}${familya}</b>\n` +
      `◆ Username: ${userName}\n` +
      `◆ Foydalanuvchi ID: <code>${userId}</code>\n` +
      `◆ Chat ID: <code>${chatId}</code>`,
      {
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [
            [{ text: `📋 ID nusxalash: ${userId}`, callback_data: `copy_${userId}` }],
            [{ text: '🚀 ID ulashish', switch_inline_query: `Foydalanuvchi ID: ${userId}` }]
          ]
        }
      }
    ).catch(err => console.error('Mening ID xatosi:', err.message));
    return;
  }

  if (msg.text === '📖 Yordam') {
    await bot.sendMessage(
      chatId,
      `📖 <b>Yordam — Buyruqlar ro'yxati:</b>\n\n` +
      `/start — Asosiy menyuni ochish\n` +
      `/id    — O'z ID'ingizni bilish\n` +
      `/help  — Yordam\n\n` +
      `<b>📱 Tugmalar:</b>\n` +
      `👤 <b>Foydalanuvchi</b> — oddiy foydalanuvchi ID'si\n` +
      `⭐ <b>Premium</b>       — premium foydalanuvchi ID'si\n` +
      `🤖 <b>Bot</b>           — bot ID'si\n` +
      `👥 <b>Guruh</b>         — guruh ID'si\n` +
      `📢 <b>Kanal</b>         — kanal ID'si\n` +
      `💬 <b>Forum</b>         — forum ID'si\n\n` +
      `<b>🔗 URL / Username:</b>\n` +
      `Quyidagi formatlarni yuboring:\n` +
      `• <code>https://t.me/username</code>\n` +
      `• <code>https://t.me/c/1234567890</code>\n` +
      `• <code>@username</code>\n\n` +
      `<b>📨 Forward:</b>\n` +
      `Istalgan xabarni forward qiling — ID'ini aniqlayman!`,
      { parse_mode: 'HTML' }
    ).catch(err => console.error('Yordam xatosi:', err.message));
    return;
  }

  // ── Forward xabarlar ──────────────────────────────────────────────────────
  if (msg.forward_origin) {
    const origin = msg.forward_origin;

    if (origin.type === 'user') {
      const user     = origin.sender_user;
      const id       = user.id;
      const ism      = user.first_name || 'Noma\'lum';
      const familya  = user.last_name ? ` ${user.last_name}` : '';
      const username = user.username ? `@${user.username}` : 'Yo\'q';
      return bot.sendMessage(chatId,
        `✅ <b>Forward: 👤 Foydalanuvchi</b>\n\n` +
        `◆ Ismi: <b>${ism}${familya}</b>\n` +
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
      ).catch(err => console.error('Forward user xatosi:', err.message));
    }

    if (origin.type === 'hidden_user') {
      return bot.sendMessage(chatId,
        `⚠️ <b>Forward: Foydalanuvchi</b>\n\n` +
        `❌ ID'ni olib bo'lmadi!\n\n` +
        `📌 <b>Sabab:</b> Foydalanuvchi "Telegram sozlamalari → Maxfiylik → Forwardlar" bo'limida o'z ismini yashirgan.\n\n` +
        `💡 <b>Yechim:</b> Foydalanuvchidan to'g'ridan-to'g'ri xabar yuboring va uni forward qiling.`,
        { parse_mode: 'HTML' }
      ).catch(err => console.error('Forward hidden_user xatosi:', err.message));
    }

    if (origin.type === 'chat') {
      const chat  = origin.sender_chat;
      const id    = chat.id;
      const title = chat.title || 'Noma\'lum';
      const tur   = chat.type === 'channel' ? '📢 Kanal' : '👥 Guruh';
      const uname = chat.username ? `\n◆ Username: @${chat.username}` : '';
      return bot.sendMessage(chatId,
        `✅ <b>Forward: ${tur}</b>\n\n◆ Nomi: <b>${title}</b>${uname}\n◆ ID: <code>${id}</code>`,
        {
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: [
              [{ text: `📋 ID nusxalash: ${id}`, callback_data: `copy_${id}` }],
              [{ text: '🚀 ID ulashish', switch_inline_query: `${tur} ID: ${id}` }]
            ]
          }
        }
      ).catch(err => console.error('Forward chat xatosi:', err.message));
    }

    if (origin.type === 'channel') {
      const chat  = origin.chat;
      const id    = chat.id;
      const title = chat.title || 'Noma\'lum';
      const uname = chat.username ? `\n◆ Username: @${chat.username}` : '';
      return bot.sendMessage(chatId,
        `✅ <b>Forward: 📢 Kanal</b>\n\n◆ Nomi: <b>${title}</b>${uname}\n◆ ID: <code>${id}</code>`,
        {
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: [
              [{ text: `📋 ID nusxalash: ${id}`, callback_data: `copy_${id}` }],
              [{ text: '🚀 ID ulashish', switch_inline_query: `Kanal ID: ${id}` }]
            ]
          }
        }
      ).catch(err => console.error('Forward channel xatosi:', err.message));
    }

    return bot.sendMessage(chatId,
      `⚠️ <b>Forward:</b>\n\n❌ ID'ni olib bo'lmadi!\n📌 Sabab: Noma'lum forward turi.`,
      { parse_mode: 'HTML' }
    ).catch(err => console.error('Forward noma\'lum xatosi:', err.message));
  }

  // ── Eski API: forward_from ─────────────────────────────────────────────────
  if (msg.forward_from) {
    const user     = msg.forward_from;
    const id       = user.id;
    const ism      = user.first_name || 'Noma\'lum';
    const familya  = user.last_name ? ` ${user.last_name}` : '';
    const username = user.username ? `@${user.username}` : 'Yo\'q';
    return bot.sendMessage(chatId,
      `✅ <b>Forward: 👤 Foydalanuvchi</b>\n\n` +
      `◆ Ismi: <b>${ism}${familya}</b>\n◆ Username: ${username}\n◆ ID: <code>${id}</code>`,
      {
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [
            [{ text: `📋 ID nusxalash: ${id}`, callback_data: `copy_${id}` }],
            [{ text: '🚀 ID ulashish', switch_inline_query: `Foydalanuvchi ID: ${id}` }]
          ]
        }
      }
    ).catch(err => console.error('forward_from xatosi:', err.message));
  }

  if (msg.forward_from_chat) {
    const chat  = msg.forward_from_chat;
    const id    = chat.id;
    const title = chat.title || 'Noma\'lum';
    const tur   = chat.type === 'channel' ? '📢 Kanal' : '👥 Guruh';
    const uname = chat.username ? `\n◆ Username: @${chat.username}` : '';
    return bot.sendMessage(chatId,
      `✅ <b>Forward: ${tur}</b>\n\n◆ Nomi: <b>${title}</b>${uname}\n◆ ID: <code>${id}</code>`,
      {
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [
            [{ text: `📋 ID nusxalash: ${id}`, callback_data: `copy_${id}` }],
            [{ text: '🚀 ID ulashish', switch_inline_query: `${tur} ID: ${id}` }]
          ]
        }
      }
    ).catch(err => console.error('forward_from_chat xatosi:', err.message));
  }

  if (msg.forward_sender_name) {
    return bot.sendMessage(chatId,
      `⚠️ <b>Forward: Foydalanuvchi</b>\n\n` +
      `❌ ID'ni olib bo'lmadi!\n\n` +
      `📌 <b>Sabab:</b> Foydalanuvchi "Telegram sozlamalari → Maxfiylik → Forwardlar" bo'limida o'z ismini yashirgan.`,
      { parse_mode: 'HTML' }
    ).catch(err => console.error('forward_sender_name xatosi:', err.message));
  }

  // ── Foydalanuvchi ulashildi ───────────────────────────────────────────────
  if (msg.users_shared) {
    const reqId = msg.users_shared.request_id;
    const users = msg.users_shared.users;

    if (!users || users.length === 0) {
      return bot.sendMessage(chatId, '⚠️ Foydalanuvchi ma\'lumoti topilmadi.')
        .catch(err => console.error('users_shared xatosi:', err.message));
    }

    let tur = 'user';
    if (reqId === 11) tur = 'premium';
    if (reqId === 12) tur = 'bot';

    for (const user of users) {
      idNatijasi(chatId, tur, user.user_id);
    }
    return;
  }

  // ── Chat ulashildi ────────────────────────────────────────────────────────
  if (msg.chat_shared) {
    const reqId        = msg.chat_shared.request_id;
    const sharedChatId = msg.chat_shared.chat_id;

    const turMap = {
      20: 'group',    21: 'channel',    22: 'forum',
      30: 'my_group', 31: 'my_channel', 32: 'my_forum',
    };

    idNatijasi(chatId, turMap[reqId] || 'group', sharedChatId);
    return;
  }

  // ── URL / @username ───────────────────────────────────────────────────────
  if (msg.text) {
    const urlBilan = await urlOrqaliIdAniqlash(chatId, msg.text);
    if (urlBilan) return;

    await bot.sendMessage(chatId,
      `❓ <b>Tushunmadim</b>\n\n` +
      `Quyidagi usullardan birini ishlating:\n\n` +
      `🔘 <b>Tugmalar</b> — pastdagi menyudan tanlang\n` +
      `📨 <b>Forward</b> — istalgan xabarni forward qiling\n` +
      `🔗 <b>URL / Username</b> — masalan:\n` +
      `   <code>https://t.me/durov</code>\n` +
      `   <code>@durov</code>\n\n` +
      `Yordam uchun 📖 <b>Yordam</b> tugmasini bosing.`,
      { parse_mode: 'HTML' }
    ).catch(err => console.error('Noma\'lum matn xatosi:', err.message));
  }
});

// ─── Callback — nusxalash + obuna tekshiruvi ──────────────────────────────────

bot.on('callback_query', async (query) => {
  const chatId = query.message.chat.id;
  const userId = query.from.id;

  // Obuna tekshiruvi callback
  if (query.data === 'check_subscription') {
    const obunaBor = await obunaTekshir(userId);
    if (obunaBor) {
      await bot.answerCallbackQuery(query.id, {
        text: '✅ Obuna tasdiqlandi! Botdan foydalanishingiz mumkin.',
        show_alert: true
      }).catch(() => {});

      // Obuna xabarini o'chir
      await bot.deleteMessage(chatId, query.message.message_id).catch(() => {});

      // /start ga o'xshash xush kelibsiz xabari
      const ism = query.from.first_name || 'Foydalanuvchi';
      const id  = query.from.id;
      await bot.sendMessage(chatId,
        `👋 Salom, <b>${ism}</b>!\n\n` +
        `🆔 <b>Sizning ID'ingiz:</b> <code>${id}</code>\n\n` +
        `⬇️ Quyidagi menyudan foydalaning:`,
        { parse_mode: 'HTML' }
      ).then(() => asosiyMenyu(chatId)).catch(() => {});
    } else {
      await bot.answerCallbackQuery(query.id, {
        text: `❌ Siz hali ${KANAL_USERNAME} kanaliga obuna bo'lmadingiz!`,
        show_alert: true
      }).catch(() => {});
    }
    return;
  }

  // ID nusxalash callback
  if (query.data.startsWith('copy_')) {
    const id = query.data.replace('copy_', '');
    bot.answerCallbackQuery(query.id, {
      text: `✅ ${id} — nusxalash uchun ID'ni bosing!`,
      show_alert: false
    }).catch(err => console.error('Callback xatosi:', err.message));
  }
});

// ─── Inline mode ──────────────────────────────────────────────────────────────

bot.on('inline_query', (query) => {
  const matn = query.query.trim();
  if (!matn) return;

  bot.answerInlineQuery(query.id, [
    {
      type:        'article',
      id:          '1',
      title:       `ID: ${matn}`,
      description: 'ID\'ni ulashish uchun bosing',
      input_message_content: {
        message_text: `🆔 ID: <code>${matn}</code>`,
        parse_mode:   'HTML'
      }
    }
  ], { cache_time: 0 })
    .catch(err => console.error('Inline xatosi:', err.message));
});

// ─── Xato ushlash ─────────────────────────────────────────────────────────────

bot.on('polling_error', (err) => {
  console.error('⚠️ Polling xatosi:', err.code, err.message);
});

process.on('unhandledRejection', (reason) => {
  console.error('❌ Kutilmagan xato:', reason);
});

process.on('SIGINT', () => {
  console.log('\n🛑 Bot to\'xtatildi.');
  bot.stopPolling();
  process.exit(0);
});

console.log('✅ Bot muvaffaqiyatli ishga tushdi! Polling rejimida...');