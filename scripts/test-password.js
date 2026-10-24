'use strict';
/**
 * Parol siyosati testlari / Тесты политики пароля
 *
 *   node scripts/test-password.js
 *
 * Tekshiriladi:
 *   • public/js/password.mjs  — siyosatning yagona manbai
 *   • src/lib/password.js     — serverda qo'llanilishi (400 xatosi)
 */
const path = require('node:path');

const POLICY_URL = new URL('../public/js/password.mjs', `file://${__filename}`).href;

let fail = 0;
const ok = (cond, msg) => {
  if (cond) { console.log('  OK   ' + msg); return true; }
  fail++;
  console.error('  FAIL ' + msg);
  return false;
};

(async () => {
  const { analyzePassword } = await import(POLICY_URL);
  const { assertPassword } = require(path.join(__dirname, '..', 'src', 'lib', 'password.js'));

  console.log('\n== Siyosat qoidalari ==');

  const cases = [
    ['', 'PW_EMPTY', 'bo‘sh parol'],
    ['admin', 'PW_SHORT', 'juda qisqa parol (5 belgi)'],
    ['1234567890', 'PW_SHORT', '10 belgili parol'],
    ['123456789012', 'PW_ONLY_DIGITS', 'faqat sonlardan iborat'],
    ['abcdefgh1234', 'PW_UPPERCASE', 'katta harfsiz'],
    ['Abcdefgh1234', 'PW_UPPERCASE', 'faqat 1 ta katta harf'],
    ['ABcdefgh1234', 'PW_UPPERCASE', 'faqat 2 ta katta harf'],
    ['ABCdefgh1234', 'PW_OK', '3 ta katta harf + 5 kichik harf + 4 son (12 belgi: 67% harf, 33% son)'],
    ['ABCDefgh1234', 'PW_OK', '4 ta katta harf + 4 kichik harf + 4 son (12 belgi: 67% harf, 33% son)'],
    ['ABCdefgh12345', 'PW_OK', '8 harf + 5 son (13 belgi: ~62% harf, ~38% son)'],
    ['ABCDEFGHI123', 'PW_OK', '9 harf + 3 son (12 belgi: 75% harf, 25% son - oraliqda)'],
    ['12345678ABCD', 'PW_COMPOSITION', '8 son + 4 harf (sonlar ko‘p, 67% son)'],
    ['ABCDEFGHIJKL', 'PW_COMPOSITION', 'faqat harflar (sonlar yo‘q)'],
    ['ABCdef1234567', 'PW_COMPOSITION', '6 harf + 7 son (13 belgida sonlar ko‘p: 54% son)'],
  ];

  for (const [pw, code, note] of cases) {
    const r = analyzePassword(pw);
    ok(r.code === code,
      `"${pw}" (${pw.length} belgi) → ${code} (${note})` + (r.code === code ? '' : ` / oldi: ${r.code}`));
  }

  console.log('\n== Boshqa til va matn ==');
  const r = analyzePassword('ABCdefgh1234');
  ok(r.ok === true, 'mashhur parol qabul qilinadi');
  ok(typeof r.uz === 'string' && r.uz.length > 10, 'o‘zbekcha xabar bor');
  ok(typeof r.ru === 'string' && r.ru.length > 10, 'ruscha xabar bor');
  ok(r.digits === 4 && r.others === 8, 'barcha belgilar hisoblandi (4 son, 8 harf)');
  ok(r.minDigits === 3 && r.maxDigits === 5, '12 belgi uchun ruxsat: 3–5 son');

  console.log('\n== Server tomoni (400 xatosi) ==');
  let code = null;
  try { await assertPassword('123456789012'); } catch (e) { code = e.code; }
  ok(code === 'PW_ONLY_DIGITS', 'server "faqat sonlar" uchun 400 qaytaradi');

  code = null;
  try { await assertPassword('short'); } catch (e) { code = e.code; }
  ok(code === 'PW_SHORT', 'server qisqa parol uchun 400 qaytaradi');

  code = null;
  try { await assertPassword('abcdefgh1234'); } catch (e) { code = e.code; }
  ok(code === 'PW_UPPERCASE', 'server katta harfsiz parol uchun 400 qaytaradi');

  code = null;
  try { await assertPassword('ABcdefgh1234'); } catch (e) { code = e.code; }
  ok(code === 'PW_UPPERCASE', 'server 2 ta katta harfli parol uchun 400 qaytaradi');

  let thrown = null;
  try { await assertPassword('ABCdefgh1234'); } catch (e) { thrown = e; }
  ok(thrown === null, 'server to‘g‘ri parolni qabul qiladi');

  console.log(fail ? `\n${fail} ta xato\n` : '\nParol siyosati to‘g‘ri\n');
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
