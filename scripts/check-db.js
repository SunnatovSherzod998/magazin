'use strict';
const d = require('../src/db');

(async () => {
  await d.init();

  if (d.driver() === 'postgres') {
    const tables = await d.all(
      "SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name"
    );
    console.log('Jadvalar:', tables.map((r) => r.table_name).join(', '));
  } else {
    const tables = await d.all("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name");
    console.log('Jadvalar:', tables.map((r) => r.name).join(', '));
  }

  const wh = await d.get('SELECT COUNT(*) c FROM catalog_warehouses');
  console.log('Omborlar:', wh?.c);

  const us = await d.get('SELECT COUNT(*) c FROM users');
  console.log('Foydalanuvchilar:', us?.c);

  console.log('OK');
  d.close();
})().catch((e) => {
  console.error('DB check xato:', e.message);
  process.exit(1);
});
