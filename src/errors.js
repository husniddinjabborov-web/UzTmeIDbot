'use strict';

/**
 * Barcha kutilgan xatolar shu sinf orqali ko'tariladi.
 * `message` — foydalanuvchiga ko'rsatiladi (maxfiy ma'lumotsiz).
 * `detail`  — faqat logga yoziladi.
 */
const MESSAGES = {
  INVALID_URL:        "Havola noto'g'ri yoki qo'llab-quvvatlanmaydigan formatda.",
  UNKNOWN_PLATFORM:   "Bu platforma tanilmadi. Qo'llab-quvvatlanadiganlar: /platforms",
  UNSUPPORTED_OBJECT: "Bu platformada bunday obyekt turi uchun ID aniqlay olmayman.",
  NOT_FOUND:          "Obyekt topilmadi. Username noto'g'ri, o'zgargan yoki obyekt o'chirilgan bo'lishi mumkin.",
  NO_TOKEN:           "Bu so'rov uchun platforma API kaliti kerak, lekin bot administratori uni sozlamagan.",
  FORBIDDEN:          "Platforma ruxsat bermadi (obyekt shaxsiy yoki API ruxsati yetarli emas).",
  PRIVATE:            "Bu shaxsiy obyekt, uning ID'sini ochiq API orqali olib bo'lmaydi.",
  RATE_LIMIT:         "Platforma so'rovlar limiti tugadi. Birozdan so'ng qayta urinib ko'ring.",
  NETWORK:            "Platforma bilan aloqa o'rnatilmadi (tarmoq xatosi yoki kutish vaqti tugadi).",
  UPSTREAM_DOWN:      "Platforma serveri hozir ishlamayapti.",
  ID_MISSING:         "Platforma javobida kerakli ID topilmadi.",
  BAD_RESPONSE:       "Platforma kutilmagan formatda javob qaytardi.",
  USER_RATE_LIMIT:    "Juda ko'p so'rov yubordingiz. Bir daqiqadan so'ng urinib ko'ring."
};

class IdFinderError extends Error {
  constructor(code, { message, detail, hint } = {}) {
    super(message || MESSAGES[code] || 'Noma\'lum xato');
    this.name = 'IdFinderError';
    this.code = code;
    this.detail = detail;   // ichki tafsilot — foydalanuvchiga ko'rsatilmaydi
    this.hint = hint;       // muqobil usul — foydalanuvchiga ko'rsatiladi
  }
}

module.exports = { IdFinderError, MESSAGES };
