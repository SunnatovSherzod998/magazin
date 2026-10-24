const fs = require('fs');
let code = fs.readFileSync('src/db/index.js', 'utf8');

// 1. env loader
const target1 = "const { hashPassword } = require('../lib/crypto');";
const repl1 = `const { hashPassword } = require('../lib/crypto');

// .env va .env.local fayllaridan muhit parametrlarini avtomatik yuklash
for (const envFile of ['.env', '.env.local']) {
  const envPath = path.join(__dirname, '..', '..', envFile);
  if (fs.existsSync(envPath)) {
    try {
      const content = fs.readFileSync(envPath, 'utf8');
      for (const line of content.split(/\\r?\\n/)) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const eq = trimmed.indexOf('=');
        if (eq > 0) {
          const key = trimmed.slice(0, eq).trim();
          let val = trimmed.slice(eq + 1).trim();
          if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
            val = val.slice(1, -1);
          }
          if (!process.env[key]) process.env[key] = val;
        }
      }
    } catch { /* skip */ }
  }
}`;
code = code.replace(target1, repl1);

// 2. fix d.all in migrateColumns
code = code.replace(
  'WHERE table_name = ? AND column_name = ?`, table, column);',
  'WHERE table_name = ? AND column_name = ?`, [table, column]);'
);

// 3. defensive p in d.all and d.run
code = code.replace(
  'all: async (sql, p) => {',
  'all: async (sql, p = []) => {\n        const params = Array.isArray(p) ? p : [p];'
);
code = code.replace(
  'if (count !== p.length) throw new Error(`SQL parametr soni mos emas (${count} vs ${p.length}): ${sql.slice(0, 80)}`);\n        const r = await pool.query(q, p);',
  'if (count !== params.length) throw new Error(`SQL parametr soni mos emas (${count} vs ${params.length}): ${sql.slice(0, 80)}`);\n        const r = await pool.query(q, params);'
);

code = code.replace(
  'run: async (sql, p) => {',
  'run: async (sql, p = []) => {\n        const params = Array.isArray(p) ? p : [p];'
);
code = code.replace(
  'if (conv.count !== p.length) {\n          throw new Error(`SQL parametr soni mos emas (${conv.count} vs ${p.length}): ${sql.slice(0, 90)}`);\n        }\n        const r = await pool.query(conv.sql, p);',
  'if (conv.count !== params.length) {\n          throw new Error(`SQL parametr soni mos emas (${conv.count} vs ${params.length}): ${sql.slice(0, 90)}`);\n        }\n        const r = await pool.query(conv.sql, params);'
);

fs.writeFileSync('src/db/index.js', code, 'utf8');
console.log('src/db/index.js successfully patched');
