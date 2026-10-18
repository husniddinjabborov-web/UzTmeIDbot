'use strict';

const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** Natijani Telegram (HTML) xabariga aylantiradi. Mavjud bo'lmagan maydonlar yashiriladi. */
function formatResult(r) {
  const lines = [];
  lines.push(`<b>Platforma:</b> ${esc(r.platform)}`);
  if (r.objectType) lines.push(`<b>Obyekt turi:</b> ${esc(r.objectType)}`);
  if (r.name) lines.push(`<b>Obyekt nomi:</b> ${esc(r.name)}`);
  if (r.owner) lines.push(`<b>Username yoki egasi:</b> ${esc(r.owner)}`);
  const [first, ...rest] = r.ids;
  lines.push(`<b>ID turi:</b> ${esc(first.type)}`);
  lines.push(`<b>ID qiymati:</b> <code>${esc(first.value)}</code>`);
  if (rest.length) {
    lines.push('', '<b>Qo\'shimcha identifikatorlar:</b>');
    for (const i of rest) lines.push(`• ${esc(i.type)}: <code>${esc(i.value)}</code>`);
  }
  lines.push('');
  lines.push(`<b>Ma'lumot manbasi:</b> ${esc(r.source)}`);
  lines.push(`<b>Holat:</b> ${r.status === 'ok' ? 'muvaffaqiyatli' : 'qisman (to\'liq tasdiqlanmagan)'}`);
  for (const n of r.notes || []) lines.push('', `ℹ️ <i>${esc(n)}</i>`);
  return lines.join('\n');
}

/** Mashina o'qiydigan JSON ko'rinishi. */
function toJson(r) {
  const obj = {
    platform: r.platform, object_type: r.objectType, name: r.name, owner: r.owner,
    ids: Object.fromEntries(r.ids.map(i => [i.type, i.value])),
    source: r.source, status: r.status, url: r.url, notes: r.notes && r.notes.length ? r.notes : undefined
  };
  return JSON.stringify(obj, (k, v) => (v === undefined ? undefined : v), 2);
}

/** Tugmalar: bir bosishda nusxalash (copy_text), ulashish va obyektni ochish. */
function keyboard(r) {
  const first = r.ids[0];
  const rows = [];
  if (first.value.length <= 256) rows.push([{ text: `📋 Nusxalash: ${first.value.length > 28 ? first.value.slice(0, 25) + '…' : first.value}`, copy_text: { text: first.value } }]);
  const share = `${r.platform} ${first.type}: ${first.value}`;
  const row2 = [{ text: '🚀 Ulashish', switch_inline_query: share.slice(0, 200) }];
  if (r.url && /^https:\/\//.test(r.url)) row2.push({ text: '🔗 Ochish', url: r.url });
  rows.push(row2);
  return { inline_keyboard: rows };
}

function formatError(err) {
  const lines = [`❌ <b>${err.platform ? esc(err.platform) + ': ' : ''}ID aniqlanmadi</b>`, '', esc(err.message)];
  if (err.hint) lines.push('', `💡 ${esc(err.hint)}`);
  return lines.join('\n');
}

module.exports = { formatResult, toJson, keyboard, formatError, esc };
