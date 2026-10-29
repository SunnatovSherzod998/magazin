const fs = require('node:fs');
const path = require('node:path');
const { Client } = require('pg');

// .env faylidan kalitni o'qish
function readEnv(key) {
  try {
    const envPath = path.join(__dirname, '..', '.env');
    const content = fs.readFileSync(envPath, 'utf8');
    for (const line of content.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eq = trimmed.indexOf('=');
      if (eq > 0) {
        const k = trimmed.slice(0, eq).trim();
        if (k === key) {
          let v = trimmed.slice(eq + 1).trim();
          if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
            v = v.slice(1, -1);
          }
          return v;
        }
      }
    }
  } catch { /* skip */ }
  return '';
}

// POSTGRES_URL / SUPABASE_DATABASE_URL dan parolni ajratish
function extractPassword(url) {
  const m = url.match(/:\/\/[^:]+:([^@]+)@/);
  return m ? m[1] : '';
}

const envUrl = readEnv('SUPABASE_DATABASE_URL') || readEnv('POSTGRES_URL') || '';
const PW = extractPassword(envUrl) || 'COINAMI_009';
const REF = 'dejbmguyftmqkjhprrid';

const REGIONS = [
  'us-east-1', 'us-east-2', 'us-west-1', 'us-west-2',
  'eu-central-1', 'eu-central-2', 'eu-west-1', 'eu-west-2', 'eu-west-3',
  'eu-north-1', 'ap-northeast-1', 'ap-northeast-2',
  'ap-southeast-1', 'ap-southeast-2', 'ap-south-1', 'sa-east-1',
  'ca-central-1',
];

// username variantlari
const USERS = ['postgres', `postgres.${REF}`];

const HOSTS = [];
for (const r of REGIONS) {
  HOSTS.push(`aws-0-${r}.pooler.supabase.com`);
  HOSTS.push(`aws-1-${r}.pooler.supabase.com`);
}
// .env da bo'lgan direct hostni ham qo'shamiz
HOSTS.push(`db.${REF}.supabase.co`);

async function tryOne(url) {
  const c = new Client({ connectionString: url, ssl: { rejectUnauthorized: false }, connectionTimeoutMillis: 8000 });
  try {
    await c.connect();
    const r = await c.query('SELECT current_database() AS db, current_user AS u, version() AS v');
    return { ok: true, url, info: r.rows[0] };
  } catch (e) {
    return { ok: false, code: e.code, msg: e.message };
  } finally { try { await c.end(); } catch { /* noop */ } }
}

(async () => {
  const urls = [];
  for (const u of USERS) for (const h of HOSTS) urls.push(`postgresql://${u}:${PW}@${h}:5432/postgres`);

  console.log(`Sinov: ${urls.length} ta variant...`);
  const results = await Promise.all(urls.map(tryOne));

  for (const r of results) {
    if (r.ok) {
      console.log('\n✅ ISHLADI:', r.url.replace(/:[^:@]+@/, ':***@'));
      console.log('   ', JSON.stringify(r.info));
      console.log('\n>>> URL:', r.url);
      return;
    }
  }
  const codes = {};
  for (const r of results) {
    const k = (r.msg || '').replace(/tenant\/user [\w.]+ not found/, 'TENANT/USERNAME not found').slice(0, 70);
    codes[k] = (codes[k] || 0) + 1;
  }
  console.log('\nXatolar:');
  for (const [k, v] of Object.entries(codes)) console.log(`  ${v}x  ${k}`);
  console.log('\n→ Supabase Dashboard dan Connection string (URI) kerak.');
})();
