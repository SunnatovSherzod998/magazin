'use strict';
/**
 * Supabase PostgreSQL bazasiga migratsiya qilish va tayyorlash
 */
const fs = require('node:fs');
const path = require('node:path');

// 1. Muhit parametrlarini o'rnatish
const SUPABASE_URL = process.env.SUPABASE_DATABASE_URL
  || 'postgresql://postgres.dejbmguyftmqkjhprrid:COINAMI_009@aws-0-ap-northeast-2.pooler.supabase.com:5432/postgres';

process.env.SUPABASE_DATABASE_URL = SUPABASE_URL;

const db = require('../src/db');

(async () => {
  console.log('--- Supabase PostgreSQL ga ulanish va migratsiya ---');
  console.log('Driver:', db.driver());
  console.log('Remote:', db.isRemote());

  console.log('\n1. Jadvallarni yaratish (migrate)...');
  await db.init();
  console.log('✅ Migratsiya va seed muvaffaqiyatli bajarildi!');

  // Supabase dagi mavjud jadvallarni tekshirish
  const tables = await db.all(`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
    ORDER BY table_name
  `);
  console.log('\nSupabase dagi jadvallar soni:', tables.length);
  console.log(tables.map(t => '  • ' + t.table_name).join('\n'));

  // Foydalanuvchilarni tekshirish
  const users = await db.all('SELECT id, login, full_name, role, is_active FROM users');
  console.log('\nSupabase bazasidagi foydalanuvchilar:');
  console.table(users);

  // Omborlarni tekshirish
  const warehouses = await db.all('SELECT id, code, name_uz FROM catalog_warehouses');
  console.log('Supabase dagi omborlar:');
  console.table(warehouses);

  db.close();
  console.log('\nTayyor!');
  process.exit(0);
})().catch(err => {
  console.error('\nXATO:', err);
  process.exit(1);
});
