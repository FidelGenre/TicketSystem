const { Client } = require('pg');
(async () => {
  const c = new Client({ host: 'localhost', port: 5432, user: 'postgres', password: '12345a', database: 'ticketsystemdb' });
  await c.connect();
  const r = await c.query(`
    SELECT column_name FROM information_schema.columns 
    WHERE table_name = 'tickets' ORDER BY ordinal_position
  `);
  console.log('Ticket columns:', r.rows.map(x => x.column_name));
  
  const r2 = await c.query(`
    SELECT column_name FROM information_schema.columns 
    WHERE table_name = 'social_match_preferences' ORDER BY ordinal_position
  `);
  console.log('SM Pref columns:', r2.rows.map(x => x.column_name));
  await c.end();
})();
