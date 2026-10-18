'use strict';

/** Muhit o'zgaruvchilarini o'qish (qiymatlar hech qachon logga yozilmaydi). */
function env(name) {
  const v = process.env[name];
  return v && v.trim() ? v.trim() : undefined;
}

function list(name) {
  return (env(name) || '').split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
}

module.exports = { env, list };
