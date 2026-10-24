/**
 * PAROL SIYOSATI / ПОЛИТИКА ПАРОЛЯ — yagona manba.
 *
 * Bu fayl ikkala tomon uchun ishlatiladi:
 *   • brauzer:  import { analyzePassword } from './password.mjs'
 *   • server:   await import('../../public/js/password.mjs')  (src/lib/password.js)
 *
 * Qoidalar:
 *   1) kamida 12 ta belgi                     (минимум 12 символов)
 *   2) faqat sonlardan iborat bo'lmasligi     (не только цифры)
 *   3) kamida 3 ta KATTA harf bo'lishi        (минимум 3 заглавные буквы)
 *   4) tarkib: ~60–70% harf va belgilar, ~30–40% sonlar
 *      (состав: ~60–70% букв и символов, ~30–40% цифр)
 */

export const MIN_LENGTH = 12;
export const MIN_UPPER = 3;         // kamida 3 ta katta harf / минимум 3 заглавные буквы
export const DIGIT_MIN_TARGET = 0.30;   // ~30% sonlar / ~30% цифр
export const DIGIT_MAX_TARGET = 0.40;   // ~40% sonlar / ~40% цифр
export const OTHER_MIN_TARGET = 0.60;   // ~60% harf va belgilar / ~60% букв и символов
export const OTHER_MAX_TARGET = 0.70;   // ~70% harf va belgilar / ~70% букв и символов
export const DIGIT_TARGET = 0.35;   // o'rtacha ko'rsatkich
export const OTHER_TARGET = 0.65;   // o'rtacha ko'rsatkich
export const TOLERANCE = 1;         // ±1 belgi ruxsat / допуск ±1 символ

const RE_DIGIT = /\p{Nd}/u;
const RE_UPPER = /\p{Lu}/u;
const RE_LOWER = /\p{Ll}/u;
const RE_LETTER = /\p{L}/u;

/** Berilgan uzunlik uchun ruxsat etilgan sonlar soni (min, max). */
export function digitBounds(length) {
  const minTarget = length * DIGIT_MIN_TARGET;
  const maxTarget = length * DIGIT_MAX_TARGET;
  return {
    minDigits: Math.max(1, Math.ceil(minTarget) - TOLERANCE),
    maxDigits: Math.min(length - MIN_UPPER, Math.floor(maxTarget) + TOLERANCE),
  };
}

const pct = (n, total) => (total > 0 ? Math.round((n / total) * 100) : 0);

/**
 * Parolni tahlil qiladi: barcha qoidalar bo'yicha natija.
 * Natija: { ok, code, uz, ru, checks, ... }
 */
export function analyzePassword(password) {
  const value = String(password ?? '');
  const length = value.length;

  let digits = 0, upper = 0, lower = 0, letters = 0;
  for (const ch of value) {
    if (RE_DIGIT.test(ch)) { digits++; continue; }
    if (RE_LETTER.test(ch)) {
      letters++;
      if (RE_UPPER.test(ch)) upper++;
      else if (RE_LOWER.test(ch)) lower++;
    }
  }
  const others = length - digits;               // harf + belgilar
  const symbols = others - letters;             // faqat belgilar
  const { minDigits, maxDigits } = digitBounds(length);
  const minOthers = length - maxDigits;
  const maxOthers = length - minDigits;
  const digitPct = pct(digits, length);
  const otherPct = pct(others, length);

  const empty = length === 0;
  const onlyDigits = !empty && digits === length;
  const hasUpper = upper >= MIN_UPPER;          // kamida 3 ta katta harf shart
  const hasLower = lower > 0;                   // kichik harflar ham bo'lishi mumkin
  const compositionOk = empty
    || (digits >= minDigits && digits <= maxDigits);

  const checks = [
    {
      code: 'length',
      ok: empty ? null : length >= MIN_LENGTH,
      uz: `Kamida ${MIN_LENGTH} ta belgi (hozir ${length})`,
      ru: `Минимум ${MIN_LENGTH} символов (сейчас ${length})`,
    },
    {
      code: 'mixed',
      ok: empty ? null : !onlyDigits,
      uz: 'Faqat sonlardan iborat emas',
      ru: 'Не только цифры',
    },
    {
      code: 'upper',
      ok: empty ? null : hasUpper,
      uz: `Kamida ${MIN_UPPER} ta katta harf (A-Z) (hozir ${upper})`,
      ru: `Минимум ${MIN_UPPER} заглавных буквы (A-Z) (сейчас ${upper})`,
    },
    {
      code: 'composition',
      ok: empty ? null : compositionOk,
      uz: `60–70% harf va belgi / 30–40% son (hozir ${otherPct}% / ${digitPct}%)`,
      ru: `60–70% букв и символов / 30–40% цифр (сейчас ${otherPct}% / ${digitPct}%)`,
    },
  ];

  const res = {
    password: value, length, digits, letters, upper, lower, symbols, others,
    digitPct, otherPct, minDigits, maxDigits, minOthers, maxOthers,
    empty, onlyDigits, hasUpper, hasLower, compositionOk, checks,
    ok: false, code: 'PW_EMPTY', uz: '', ru: '',
  };

  if (empty) {
    res.uz = 'Parol kiritish shart';
    res.ru = 'Введите пароль';
    return res;
  }
  if (length < MIN_LENGTH) {
    res.code = 'PW_SHORT';
    res.uz = `Parol juda qisqa — kamida ${MIN_LENGTH} ta belgi kerak. Parolni uzunlashtiring.`;
    res.ru = `Пароль слишком короткий — минимум ${MIN_LENGTH} символов. Удлините пароль.`;
    return res;
  }
  if (onlyDigits) {
    res.code = 'PW_ONLY_DIGITS';
    res.uz = `Parol juda oson — faqat sonlardan iborat. Kamida ${MIN_UPPER} ta katta harf va boshqa harflar qo‘shing.`;
    res.ru = `Пароль слишком простой — только цифры. Добавьте минимум ${MIN_UPPER} заглавные буквы и другие символы.`;
    return res;
  }
  if (!hasUpper) {
    res.code = 'PW_UPPERCASE';
    res.uz = `Parolda kamida ${MIN_UPPER} ta katta harf (A-Z) bo‘lishi kerak (hozir ${upper} ta).`;
    res.ru = `В пароле должно быть минимум ${MIN_UPPER} заглавных буквы (A-Z) (сейчас ${upper}).`;
    return res;
  }
  if (!compositionOk) {
    res.code = 'PW_COMPOSITION';
    res.uz = `Parol tarkibi noto‘g‘ri: o‘rtacha 60–70% harf/belgi va 30–40% son bo‘lishi kerak `
      + `(hozir ${otherPct}% harf / ${digitPct}% son). `
      + `${length} belgi uchun ${minDigits}–${maxDigits} son va ${minOthers}–${maxOthers} harf/belgi kerak.`;
    res.ru = `Неверный состав пароля: нужно в среднем 60–70% букв/символов и 30–40% цифр `
      + `(сейчас ${otherPct}% букв / ${digitPct}% цифр). `
      + `Для ${length} символов нужно ${minDigits}–${maxDigits} цифр и ${minOthers}–${maxOthers} букв/символов.`;
    return res;
  }

  res.ok = true;
  res.code = 'PW_OK';
  res.uz = 'Parol qo‘yilishi mumkin';
  res.ru = 'Пароль можно установить';
  return res;
}

/** Qisqacha alias — server va brauzer bir xarakterda ishlatadi. */
export const validatePassword = analyzePassword;

/** Xabar matni (til bo'yicha). */
export function passwordMessage(result, lang = 'uz') {
  if (!result) return '';
  return lang === 'ru' ? result.ru : result.uz;
}
